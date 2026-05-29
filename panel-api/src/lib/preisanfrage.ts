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
  getMockSubmissionsergebnis,
  getMockSubmissionskarte,
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

/** One Los (lot) inside a multi-Los tender. Empty `lots[]` on a bidder
 *  means a single-Los tender — read the bidder's own sums instead. */
export type PreisanfrageSubmissionLot = {
  name: string;
  nettoSum: number | null;
  bruttoSum: number | null;
};

/** One bidder row from the Submissionsergebnis (bid-opening protocol).
 *  Ranked ascending by price; `isOwnBid` marks the managed firma's own
 *  bid, `isWinner` the awarded bid. */
export type PreisanfrageSubmissionBidder = {
  rank: number;
  bidderName: string;
  /** Legacy brutto-preferred primary sum. Prefer netto/brutto when present. */
  totalSum: number | null;
  nettoSum: number | null;
  bruttoSum: number | null;
  lots: PreisanfrageSubmissionLot[];
  isOwnBid: boolean;
  isWinner: boolean;
};

/** Subset of `/api/submissionsergebnis/{project_id}` — the parsed bid-opening
 *  result for ONE managed-firma project. `bidders` is empty until the PDF
 *  has been parsed upstream (the panel renders a "noch nicht eingelesen"
 *  state in that case). */
export type PreisanfrageSubmissionsergebnis = {
  projectId: number;
  parsedAt: string | null;
  teilnehmerCount: number;
  ourRank: number | null;
  winnerName: string | null;
  winnerSum: number | null;
  winnerNettoSum: number | null;
  winnerBruttoSum: number | null;
  parseConfidence: number | null;
  bidders: PreisanfrageSubmissionBidder[];
  /** Which calc variant we submitted (e.g. "günstigste"), when known —
   *  manual override wins over the auto-detected label. */
  submittedVariantLabel: string | null;
};

/** One Baustelle pin on the Submissionskarte (geo-map of tenders). */
export type PreisanfrageSubmissionskartePin = {
  projectId: number;
  projectNumber: string;
  projectName: string;
  submissionDate: string | null;
  latitude: number;
  longitude: number;
  anschriftPlzOrt: string | null;
  /** Leading category / trade label — used as the map layer key. */
  gewerk: string | null;
  teilnehmerCount: number | null;
  ourRank: number | null;
  winnerName: string | null;
  winnerSum: number | null;
  winnerNettoSum: number | null;
  winnerBruttoSum: number | null;
  ourSum: number | null;
  ourNettoSum: number | null;
  ourBruttoSum: number | null;
  /** Derived bucket: niedrig | mittel | hoch (our bid vs. winner). */
  preislage: string | null;
  /** nicht_geparst | verloren | offen | zuschlag | absage | kein_vergabeordner | unbekannt */
  vergabeStatus: string | null;
  pdfAvailable: boolean;
  /** Set on the combined (cross-company) map so the popup can name the firma. */
  companyId: number | null;
  companyName: string | null;
  tradeType: string | null;
};

export type PreisanfrageSubmissionskarte = {
  pins: PreisanfrageSubmissionskartePin[];
  /** Distinct gewerke present, for the layer toggles. */
  gewerke: string[];
  projectsWithoutLocation: number;
  projectsWithoutParse: number;
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
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    // Network error — preisanfrage unreachable.
    throw new PreisanfrageError(502, { error: 'upstream_unreachable' }, `preisanfrage unreachable: ${String(e)}`);
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
  return (await res.json()) as T;
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
export async function getProjectPositions(projectId: number): Promise<PreisanfragePosition[]> {
  if (isMockMode()) return getMockProjectPositions(projectId);
  const key = `positions:${projectId}`;
  const hit = cached<PreisanfragePosition[]>(key);
  if (hit) return hit;
  type RawPos = {
    oz: string;
    short_text: string;
    long_text: string | null;
    quantity: number;
    unit: string;
    page_number?: number | null;
  };
  type RawProject = { positions: RawPos[] };
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
  return cache(key, rows);
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

/** Fetch the parsed Submissionsergebnis (bid-opening result) for ONE
 *  managed-firma project. `companyId` is the managed firma's preisanfrage
 *  companies.id (= the panel's `managed` firma id); `projectId` the project.
 *
 *  The upstream read is NOT feature-gated — it returns an empty `bidders`
 *  list (teilnehmerCount 0) when the protocol hasn't been parsed yet, so
 *  the caller distinguishes "kein Ergebnis" from "noch nicht eingelesen". */
export async function getSubmissionsergebnis(
  companyId: number,
  projectId: number,
): Promise<PreisanfrageSubmissionsergebnis> {
  if (isMockMode()) return getMockSubmissionsergebnis(companyId, projectId);
  const key = `submissionsergebnis:${companyId}:${projectId}`;
  const hit = cached<PreisanfrageSubmissionsergebnis>(key);
  if (hit) return hit;
  type RawLot = { name: string; netto_sum: number | null; brutto_sum: number | null };
  type RawBidder = {
    rank: number;
    bidder_name: string;
    total_sum: number | null;
    netto_sum: number | null;
    brutto_sum: number | null;
    lots?: RawLot[];
    is_own_bid: boolean;
    is_winner: boolean;
  };
  type Raw = {
    project_id: number;
    parsed_at: string | null;
    teilnehmer_count: number;
    our_rank: number | null;
    winner_name: string | null;
    winner_sum: number | null;
    winner_netto_sum: number | null;
    winner_brutto_sum: number | null;
    parse_confidence: number | null;
    bidders?: RawBidder[];
    variant_analysis?: {
      submitted_variant_label?: string | null;
      manual_variant_label?: string | null;
    } | null;
  };
  const qs = new URLSearchParams({ company_id: String(companyId) });
  const raw = await call<Raw>(`/api/submissionsergebnis/${projectId}?${qs.toString()}`);
  const va = raw.variant_analysis ?? null;
  return cache(key, {
    projectId: raw.project_id,
    parsedAt: raw.parsed_at,
    teilnehmerCount: raw.teilnehmer_count ?? 0,
    ourRank: raw.our_rank,
    winnerName: raw.winner_name,
    winnerSum: raw.winner_sum,
    winnerNettoSum: raw.winner_netto_sum,
    winnerBruttoSum: raw.winner_brutto_sum,
    parseConfidence: raw.parse_confidence,
    bidders: (raw.bidders ?? []).map((b) => ({
      rank: b.rank,
      bidderName: b.bidder_name,
      totalSum: b.total_sum,
      nettoSum: b.netto_sum,
      bruttoSum: b.brutto_sum,
      lots: (b.lots ?? []).map((l) => ({
        name: l.name,
        nettoSum: l.netto_sum,
        bruttoSum: l.brutto_sum,
      })),
      isOwnBid: b.is_own_bid,
      isWinner: b.is_winner,
    })),
    submittedVariantLabel:
      (va?.manual_variant_label?.trim() || va?.submitted_variant_label?.trim() || null) ?? null,
  });
}

/** Fetch the combined (cross-company) Submissionskarte — every project that
 *  has a geo-location, across all firmas the service account can see. We use
 *  `/combined` (not the per-company `/submissionskarte`) because it is NOT
 *  feature-gated and the panel's admin service account sees every company. */
export async function getSubmissionskarte(): Promise<PreisanfrageSubmissionskarte> {
  if (isMockMode()) return getMockSubmissionskarte();
  const key = 'submissionskarte:combined';
  const hit = cached<PreisanfrageSubmissionskarte>(key);
  if (hit) return hit;
  type RawPin = {
    project_id: number;
    project_number: string;
    project_name: string;
    submission_date: string | null;
    latitude: number;
    longitude: number;
    anschrift_plz_ort: string | null;
    gewerk: string | null;
    teilnehmer_count: number | null;
    our_rank: number | null;
    winner_name: string | null;
    winner_sum: number | null;
    winner_netto_sum: number | null;
    winner_brutto_sum: number | null;
    our_sum: number | null;
    our_netto_sum: number | null;
    our_brutto_sum: number | null;
    preislage: string | null;
    vergabe_status: string | null;
    pdf_available: boolean;
    company_id: number | null;
    company_name: string | null;
    trade_type: string | null;
  };
  type Raw = {
    pins: RawPin[];
    gewerke: string[];
    projects_without_location: number;
    projects_without_parse: number;
  };
  const raw = await call<Raw>('/api/submissionskarte/combined');
  return cache(key, {
    pins: (raw.pins ?? []).map((p) => ({
      projectId: p.project_id,
      projectNumber: p.project_number,
      projectName: p.project_name,
      submissionDate: p.submission_date,
      latitude: p.latitude,
      longitude: p.longitude,
      anschriftPlzOrt: p.anschrift_plz_ort,
      gewerk: p.gewerk,
      teilnehmerCount: p.teilnehmer_count,
      ourRank: p.our_rank,
      winnerName: p.winner_name,
      winnerSum: p.winner_sum,
      winnerNettoSum: p.winner_netto_sum,
      winnerBruttoSum: p.winner_brutto_sum,
      ourSum: p.our_sum,
      ourNettoSum: p.our_netto_sum,
      ourBruttoSum: p.our_brutto_sum,
      preislage: p.preislage,
      vergabeStatus: p.vergabe_status,
      pdfAvailable: p.pdf_available,
      companyId: p.company_id,
      companyName: p.company_name,
      tradeType: p.trade_type,
    })),
    gewerke: raw.gewerke ?? [],
    projectsWithoutLocation: raw.projects_without_location ?? 0,
    projectsWithoutParse: raw.projects_without_parse ?? 0,
  });
}
