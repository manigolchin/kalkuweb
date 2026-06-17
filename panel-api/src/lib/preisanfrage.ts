/**
 * Typed HTTP client for the sister system at https://preisanfrage.kalkus.de.
 *
 * Auth model (per user decision 2026-05-22): SERVICE-ACCOUNT JWT.
 * One identity, read-only scope on all firmas. Token is provisioned in
 * preisanfrage's admin UI and injected here as `PREISANFRAGE_SERVICE_JWT`
 * env var. NEVER hard-code, NEVER log the raw token.
 *
 * Data freshness model (per user decision): LIVE on every call.
 * No persistent cache here — short-TTL in-memory cache only, to absorb
 * the panel UI's per-page-load burst of N requests. SWR is the right
 * pattern but lives in the frontend (React Query), not here.
 *
 * Scope: this module is the ONLY place in panel-api that talks to
 * preisanfrage. All routes/UI go through here so swap-out (e.g. mock
 * for tests, or graceful-degrade if preisanfrage is down) is a 1-file
 * change.
 *
 * Architecture context: docs/v2_redesign/multi_company_integration_architecture.md
 */

import {
  getMockCompanies,
  getMockExternalProjects,
  getMockManagedProjects,
  getMockOverview,
  getMockProjectPositions,
  getMockProjectAngeboteUrl,
  getMockInbox,
  isMockMode,
} from './preisanfrage-fixture.js';

const DEFAULT_BASE_URL = 'https://preisanfrage.kalkus.de';
const CACHE_TTL_MS = 60_000; // 60 s — absorbs UI burst, doesn't mask 5-min n8n cadence.

export class PreisanfrageError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'PreisanfrageError';
    this.status = status;
    this.body = body;
  }
}

/** Subset of preisanfrage's `/api/companies` response. We deliberately
 *  don't pull SMTP/SharePoint config — that's preisanfrage's concern. */
export type PreisanfrageCompany = {
  id: number;
  name: string;
  /** galabau | elektro | tiefbau | leitungsbau | fenster | haustechnik | ... */
  tradeType: string;
};

/** Subset of `/api/admin/external-firmas/overview` — the BI view that
 *  unions managed + OneDrive-discovered firmas. This is what powers the
 *  Firmen-Liste in the panel (all 98 visible, per user decision). */
export type PreisanfrageFirmaRow = {
  kind: 'managed' | 'external';
  /** Managed: companies.id. External: external_companies.id. Not interchangeable
   *  — use `(kind, id)` as the composite key. */
  id: number;
  folderName: string | null;
  displayName: string;
  /** Only set for managed firms; null for external (not yet adopted). */
  tradeType: string | null;
  projectCount: number;
  wonCount: number;
  wonSumBrutto: number;
  lastSubmissionDate: string | null;
  adoptedCompanyId: number | null;
  adoptedAt: string | null;
  parsedCount: number | null;
};

export type PreisanfrageOverview = {
  rows: PreisanfrageFirmaRow[];
  managedCount: number;
  externalCount: number;
  totalProjects: number;
  lastScanAt: string | null;
};

/** Subset of `/api/projects` (the Ausschreibungen for a managed firma). */
export type PreisanfrageProject = {
  id: number;
  companyId: number;
  projectNumber: string;
  name: string | null;
  baumassnahme: string | null;
  auftraggeberName: string | null;
  auftraggeberPlzOrt: string | null;
  anschriftPlzOrt: string | null;
  submissionDate: string | null;
  submissionTime: string | null;
  status: string;
  totalPositions: number;
  /** Pointer to OneDrive — useful when the calculator wants to open the
   *  source folder directly. */
  oneDriveShareUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Subset of a position parsed by preisanfrage from the GAEB file. Used
 *  to seed a kalku-website calculation project so the calculator doesn't
 *  need to re-upload + re-parse the GAEB. Only the fields the kalku-website
 *  Position type needs — preisanfrage carries more (category, hersteller,
 *  needs_rfq, requires_trgs) which we ignore here. */
export type PreisanfragePosition = {
  /** OZ string as it appears in the GAEB (e.g. "01.01.004"). */
  oz: string;
  shortText: string;
  longText: string;
  quantity: number;
  unit: string;
  isHeader: boolean;
  /** Page in the original PDF — useful for the calculator to cross-check. */
  pageNumber?: number | null;
};

/** Subset of `/api/admin/external-firmas/{id}/projects` — projects for
 *  external (non-adopted) firmas, with submission-result enrichment. */
export type PreisanfrageExternalProject = {
  id: number;
  folderName: string;
  projectNumber: string | null;
  projectName: string | null;
  submissionDate: string | null;
  auftraggeberName: string | null;
  anschriftPlzOrt: string | null;
  teilnehmerCount: number | null;
  ourRank: number | null;
  winnerName: string | null;
  winnerNetto: number | null;
  winnerBrutto: number | null;
  ourNetto: number | null;
  ourBrutto: number | null;
  parsedAt: string | null;
};

type CacheEntry<T> = { value: T; ts: number };
const _cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string): T | null {
  const e = _cache.get(key) as CacheEntry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return e.value;
}
function cache<T>(key: string, value: T): T {
  _cache.set(key, { value, ts: Date.now() });
  return value;
}

/** Reset the in-process cache. Tests call this between cases to avoid
 *  cross-test interference; not exposed via HTTP. */
export function _clearPreisanfrageCache() {
  _cache.clear();
}

function baseUrl() {
  return process.env.PREISANFRAGE_API_URL || DEFAULT_BASE_URL;
}

function serviceToken(): string | null {
  const t = process.env.PREISANFRAGE_SERVICE_JWT;
  if (!t || t.trim().length < 10) return null;
  return t;
}

/** Returns false when the integration is intentionally disabled (no token
 *  configured AND mock mode is off). Use this in routes to short-circuit
 *  with a clear message instead of a 500. */
export function isPreisanfrageEnabled(): boolean {
  return isMockMode() || serviceToken() !== null;
}

/** Exposed so the panel UI can render a "Demo data" chip when running
 *  against the fixture. */
export function isPreisanfrageMock(): boolean {
  return isMockMode();
}

/** Bound every upstream call so a slow/stalled preisanfrage can't hang a panel
 *  request indefinitely — without a timeout, a preisanfrage outage becomes a
 *  panel outage. 8 s is generous for the BI aggregation endpoints. */
const UPSTREAM_TIMEOUT_MS = 8000;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = serviceToken();
  if (!token) {
    throw new PreisanfrageError(503, { error: 'integration_disabled' }, 'PREISANFRAGE_SERVICE_JWT not configured');
  }
  const url = new URL(path, baseUrl()).toString();
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    // Network error OR our own timeout — preisanfrage unreachable / too slow.
    // Map both to 502 so handleUpstreamError degrades to 503 + the offline KT01
    // fixture, instead of hanging the request or surfacing a raw 500.
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new PreisanfrageError(
      502,
      { error: timedOut ? 'upstream_timeout' : 'upstream_unreachable' },
      timedOut
        ? `preisanfrage timed out after ${UPSTREAM_TIMEOUT_MS}ms on ${path}`
        : `preisanfrage unreachable: ${String(e)}`,
    );
  }
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new PreisanfrageError(res.status, body, `preisanfrage ${res.status} on ${path}`);
  }
  try {
    return (await res.json()) as T;
  } catch (e) {
    // 200 OK but a non-JSON body (proxy/CDN interstitial, truncated stream).
    // Don't let the SyntaxError bubble up as a raw 500 — degrade like an
    // unreachable upstream so the UI shows the offline state.
    throw new PreisanfrageError(502, { error: 'upstream_bad_body' }, `preisanfrage 200 with non-JSON body on ${path}: ${String(e)}`);
  }
}

/* ─── Public client API (the ONLY exports route code should use) ─── */

export async function listCompanies(): Promise<PreisanfrageCompany[]> {
  if (isMockMode()) return getMockCompanies();
  const key = 'companies';
  const hit = cached<PreisanfrageCompany[]>(key);
  if (hit) return hit;
  type Row = { id: number; name: string; trade_type: string };
  const rows = await call<Row[]>('/api/companies');
  return cache(key, rows.map((r) => ({ id: r.id, name: r.name, tradeType: r.trade_type })));
}

/** The big one — unified BI view of all 98 firmas (managed + external).
 *  This is the data behind the panel's `/firmen` page. */
export async function getFirmaOverview(opts?: {
  period?: 'month' | 'quarter' | 'year' | 'last_12m' | 'all';
}): Promise<PreisanfrageOverview> {
  if (isMockMode()) return getMockOverview();
  const period = opts?.period ?? 'all';
  const key = `overview:${period}`;
  const hit = cached<PreisanfrageOverview>(key);
  if (hit) return hit;
  type RawRow = {
    kind: 'managed' | 'external';
    id: number;
    folder_name: string | null;
    display_name: string;
    trade_type: string | null;
    project_count: number;
    won_count: number;
    won_sum_brutto: number;
    last_submission_date: string | null;
    adopted_company_id: number | null;
    adopted_at: string | null;
    parsed_count: number | null;
  };
  type RawResp = {
    rows: RawRow[];
    managed_count: number;
    external_count: number;
    total_projects: number;
    last_scan_at: string | null;
  };
  const raw = await call<RawResp>(`/api/admin/external-firmas/overview?period=${period}`);
  return cache(key, {
    rows: raw.rows.map((r) => ({
      kind: r.kind,
      id: r.id,
      folderName: r.folder_name,
      displayName: r.display_name,
      tradeType: r.trade_type,
      projectCount: r.project_count,
      wonCount: r.won_count,
      wonSumBrutto: r.won_sum_brutto,
      lastSubmissionDate: r.last_submission_date,
      adoptedCompanyId: r.adopted_company_id,
      adoptedAt: r.adopted_at,
      parsedCount: r.parsed_count,
    })),
    managedCount: raw.managed_count,
    externalCount: raw.external_count,
    totalProjects: raw.total_projects,
    lastScanAt: raw.last_scan_at,
  });
}

export async function listManagedProjects(companyId: number, opts?: {
  status?: string;
  limit?: number;
}): Promise<PreisanfrageProject[]> {
  if (isMockMode()) return getMockManagedProjects(companyId);
  const limit = opts?.limit ?? 50;
  const status = opts?.status ?? '';
  const key = `projects:${companyId}:${status}:${limit}`;
  const hit = cached<PreisanfrageProject[]>(key);
  if (hit) return hit;
  const qs = new URLSearchParams({ company_id: String(companyId), limit: String(limit) });
  if (status) qs.set('status', status);
  type Raw = {
    id: number;
    company_id: number;
    project_number: string;
    name: string | null;
    baumassnahme: string | null;
    auftraggeber_name: string | null;
    auftraggeber_plz_ort: string | null;
    anschrift_plz_ort: string | null;
    submission_date: string | null;
    submission_time: string | null;
    status: string;
    total_positions: number;
    onedrive_share_url: string | null;
    created_at: string;
    updated_at: string;
  };
  const rows = await call<Raw[]>(`/api/projects?${qs.toString()}`);
  return cache(
    key,
    rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      projectNumber: r.project_number,
      name: r.name,
      baumassnahme: r.baumassnahme,
      auftraggeberName: r.auftraggeber_name,
      auftraggeberPlzOrt: r.auftraggeber_plz_ort,
      anschriftPlzOrt: r.anschrift_plz_ort,
      submissionDate: r.submission_date,
      submissionTime: r.submission_time,
      status: r.status,
      totalPositions: r.total_positions,
      oneDriveShareUrl: r.onedrive_share_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  );
}

/** Fetch the GAEB-parsed positions for a managed-firma project. Returns
 *  what we need to seed a kalku-website Position[] — calls upstream
 *  `GET /api/projects/{id}` (which includes positions[]) and projects
 *  the shape down to the kalku-website Position fields. */
export async function getProjectPositions(projectId: number): Promise<{
  positions: PreisanfragePosition[];
  /** Real "anyone-with-link" share URL to the project's 04_Angebote folder,
   *  minted lazily by preisanfrage on this detail fetch. Null if unavailable. */
  angeboteFolderShareUrl: string | null;
}> {
  if (isMockMode()) {
    return {
      positions: getMockProjectPositions(projectId),
      angeboteFolderShareUrl: getMockProjectAngeboteUrl(projectId),
    };
  }
  const key = `positions:${projectId}`;
  const hit = cached<{ positions: PreisanfragePosition[]; angeboteFolderShareUrl: string | null }>(key);
  if (hit) return hit;
  type RawPos = {
    oz: string;
    short_text: string;
    long_text: string | null;
    quantity: number;
    unit: string;
    page_number?: number | null;
  };
  type RawProject = { positions: RawPos[]; angebote_folder_share_url?: string | null };
  const raw = await call<RawProject>(`/api/projects/${projectId}`);
  const rows = (raw.positions ?? []).map((p) => ({
    oz: p.oz ?? '',
    shortText: p.short_text ?? '',
    longText: p.long_text ?? '',
    quantity: typeof p.quantity === 'number' ? p.quantity : Number(p.quantity) || 0,
    unit: p.unit ?? '',
    // preisanfrage doesn't track "isHeader" explicitly; OZ structure tells us.
    // Header rows in GAEB-XML typically have no quantity/unit. The kalku-website
    // PositionTable handles isHeader by hiding price columns — same default ok.
    isHeader: !p.quantity || !p.unit,
    pageNumber: p.page_number ?? null,
  }));
  return cache(key, { positions: rows, angeboteFolderShareUrl: raw.angebote_folder_share_url ?? null });
}

export async function listExternalProjects(externalFirmaId: number): Promise<PreisanfrageExternalProject[]> {
  if (isMockMode()) return getMockExternalProjects(externalFirmaId);
  const key = `external-projects:${externalFirmaId}`;
  const hit = cached<PreisanfrageExternalProject[]>(key);
  if (hit) return hit;
  type Raw = {
    id: number;
    folder_name: string;
    project_number: string | null;
    project_name: string | null;
    submission_date: string | null;
    auftraggeber_name: string | null;
    anschrift_plz_ort: string | null;
    teilnehmer_count: number | null;
    our_rank: number | null;
    winner_name: string | null;
    winner_netto: number | null;
    winner_brutto: number | null;
    our_netto: number | null;
    our_brutto: number | null;
    parsed_at: string | null;
  };
  const rows = await call<Raw[]>(`/api/admin/external-firmas/${externalFirmaId}/projects`);
  return cache(
    key,
    rows.map((r) => ({
      id: r.id,
      folderName: r.folder_name,
      projectNumber: r.project_number,
      projectName: r.project_name,
      submissionDate: r.submission_date,
      auftraggeberName: r.auftraggeber_name,
      anschriftPlzOrt: r.anschrift_plz_ort,
      teilnehmerCount: r.teilnehmer_count,
      ourRank: r.our_rank,
      winnerName: r.winner_name,
      winnerNetto: r.winner_netto,
      winnerBrutto: r.winner_brutto,
      ourNetto: r.our_netto,
      ourBrutto: r.our_brutto,
      parsedAt: r.parsed_at,
    })),
  );
}

/* ─── Posteingang (incoming-email inbox) ──────────────────────────────────────
 * A READ-ONLY window onto preisanfrage's incoming-email system. preisanfrage
 * owns the IMAP polling, the Haiku classification and the SharePoint filing;
 * the panel only READS, through the same admin service token — which
 * `verify_company_access` lets see every company's inbox. Write-actions
 * (save-to-SharePoint, re-classify) are NOT mirrored here; the UI links out to
 * preisanfrage for those. The endpoint exposes only `body_text` (never the HTML
 * part), so the panel renders plain text and can't be XSS'd by a supplier. */

export type PreisanfrageInboxAttachment = {
  id: number;
  filename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  /** SharePoint web URL once the mail has been filed; null while still unsaved.
   *  We never serve raw bytes — the panel only ever links out to SharePoint. */
  sharepointUrl: string | null;
};

/** Haiku's labels: angebot | rueckfrage | absage | unklar (open string in case
 *  preisanfrage adds more later — the UI treats unknown values as 'unklar'). */
export type PreisanfrageInboxClassification = 'angebot' | 'rueckfrage' | 'absage' | 'unklar' | string;

export type PreisanfrageInboxEmail = {
  id: number;
  companyId: number;
  messageId: string | null;
  inReplyTo: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  receivedAt: string | null;
  /** Plain-text body only (preisanfrage's API never exposes the HTML part). */
  bodyText: string | null;
  classification: PreisanfrageInboxClassification | null;
  classificationConfidence: number | null;
  classificationReason: string | null;
  /** new | saved | ignored | error | classification_pending | duplicate */
  status: string;
  matchMethod: string | null;
  projectId: number | null;
  projectName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  sharepointSaved: boolean;
  sharepointFolder: string | null;
  hasAttachments: boolean;
  attachmentCount: number;
  attachments: PreisanfrageInboxAttachment[];
};

/** Per-company tallies preisanfrage computes for the inbox. `angebot` is
 *  all-time (saved + new); the others count only unseen items;
 *  `nichtGespeichert` = new offers still awaiting a save (the actionable one). */
export type PreisanfrageInboxStats = {
  angebot: number;
  rueckfrage: number;
  absage: number;
  unklar: number;
  nichtGespeichert: number;
};

export type PreisanfrageInboxPage = {
  total: number;
  emails: PreisanfrageInboxEmail[];
  stats: PreisanfrageInboxStats;
};

function mapInboxStats(s: Record<string, unknown> | null | undefined): PreisanfrageInboxStats {
  const n = (k: string) => (typeof s?.[k] === 'number' ? (s[k] as number) : 0);
  return {
    angebot: n('angebot'),
    rueckfrage: n('rueckfrage'),
    absage: n('absage'),
    unklar: n('unklar'),
    nichtGespeichert: n('nicht_gespeichert'),
  };
}

type RawInboxAttachment = {
  id: number;
  filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  sharepoint_url: string | null;
};
type RawInboxEmail = {
  id: number;
  company_id: number;
  message_id: string | null;
  in_reply_to: string | null;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: string | null;
  body_text: string | null;
  classification: string | null;
  classification_confidence: number | null;
  classification_reason: string | null;
  status: string;
  match_method: string | null;
  project_id: number | null;
  project_name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  sharepoint_saved: boolean;
  sharepoint_folder: string | null;
  has_attachments: boolean;
  attachment_count: number;
  attachments: RawInboxAttachment[] | null;
};
type RawInboxResp = {
  total: number;
  emails: RawInboxEmail[];
  stats: Record<string, unknown>;
};

function mapInboxEmail(r: RawInboxEmail): PreisanfrageInboxEmail {
  return {
    id: r.id,
    companyId: r.company_id,
    messageId: r.message_id,
    inReplyTo: r.in_reply_to,
    fromEmail: r.from_email,
    fromName: r.from_name,
    subject: r.subject,
    receivedAt: r.received_at,
    bodyText: r.body_text,
    classification: r.classification,
    classificationConfidence: r.classification_confidence,
    classificationReason: r.classification_reason,
    status: r.status,
    matchMethod: r.match_method,
    projectId: r.project_id,
    projectName: r.project_name,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    sharepointSaved: r.sharepoint_saved,
    sharepointFolder: r.sharepoint_folder,
    hasAttachments: r.has_attachments,
    attachmentCount: r.attachment_count,
    attachments: (r.attachments ?? []).map((a) => ({
      id: a.id,
      filename: a.filename,
      contentType: a.content_type,
      sizeBytes: a.size_bytes,
      sharepointUrl: a.sharepoint_url,
    })),
  };
}

/** List a company's incoming emails (newest first), with optional filters.
 *  preisanfrage's list endpoint already includes `body_text` + attachments, so
 *  the panel reading-pane needs no second fetch. Throws PreisanfrageError(403)
 *  when posteingang is disabled for the company — callers that fan out across
 *  companies must catch + skip that (see the overview route). */
export async function listInboxEmails(
  companyId: number,
  opts?: { classification?: string; status?: string; projectId?: number; limit?: number },
): Promise<PreisanfrageInboxPage> {
  if (isMockMode()) return getMockInbox(companyId, opts);
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  const cls = opts?.classification ?? '';
  const st = opts?.status ?? '';
  const pid = opts?.projectId ?? 0;
  const key = `inbox:${companyId}:${cls}:${st}:${pid}:${limit}`;
  const hit = cached<PreisanfrageInboxPage>(key);
  if (hit) return hit;
  const qs = new URLSearchParams({ company_id: String(companyId), limit: String(limit) });
  if (cls) qs.set('classification', cls);
  if (st) qs.set('status', st);
  if (pid) qs.set('project_id', String(pid));
  const raw = await call<RawInboxResp>(`/api/inbox/emails?${qs.toString()}`);
  return cache(key, {
    total: raw.total,
    emails: (raw.emails ?? []).map(mapInboxEmail),
    stats: mapInboxStats(raw.stats),
  });
}
