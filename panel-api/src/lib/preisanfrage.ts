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

/** Subset of preisanfrage's `/api/v1/companies` response. We deliberately
 *  don't pull SMTP/SharePoint config — that's preisanfrage's concern. */
export type PreisanfrageCompany = {
  id: number;
  name: string;
  /** galabau | elektro | tiefbau | leitungsbau | fenster | haustechnik | ... */
  tradeType: string;
};

/** Subset of `/api/v1/admin/external-firmas/overview` — the BI view that
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

/** Subset of `/api/v1/projects` (the Ausschreibungen for a managed firma). */
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

/** Subset of `/api/v1/admin/external-firmas/{id}/projects` — projects for
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
 *  configured). Use this in routes to short-circuit with a clear message
 *  instead of a 500. */
export function isPreisanfrageEnabled(): boolean {
  return serviceToken() !== null;
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
  const key = 'companies';
  const hit = cached<PreisanfrageCompany[]>(key);
  if (hit) return hit;
  type Row = { id: number; name: string; trade_type: string };
  const rows = await call<Row[]>('/api/v1/companies');
  return cache(key, rows.map((r) => ({ id: r.id, name: r.name, tradeType: r.trade_type })));
}

/** The big one — unified BI view of all 98 firmas (managed + external).
 *  This is the data behind the panel's `/firmen` page. */
export async function getFirmaOverview(opts?: {
  period?: 'month' | 'quarter' | 'year' | 'last_12m' | 'all';
}): Promise<PreisanfrageOverview> {
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
  const raw = await call<RawResp>(`/api/v1/admin/external-firmas/overview?period=${period}`);
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
  const rows = await call<Raw[]>(`/api/v1/projects?${qs.toString()}`);
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

export async function listExternalProjects(externalFirmaId: number): Promise<PreisanfrageExternalProject[]> {
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
  const rows = await call<Raw[]>(`/api/v1/admin/external-firmas/${externalFirmaId}/projects`);
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
