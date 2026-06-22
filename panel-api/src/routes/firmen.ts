/**
 * Firmen API — owner endpoints for the Firma-Liste + Firma-Detail panel
 * pages. Wraps preisanfrage's data (source of truth for Firma master +
 * Ausschreibungen) + panel-api's own firma_calc_defaults table.
 *
 * Auth: requires the calculator's panel cookie. The service-account JWT
 * used to call preisanfrage is server-side only, never returned.
 *
 * See:
 *   - lib/preisanfrage.ts (the upstream client)
 *   - schema.ts firmaCalcDefaults (the per-Firma defaults table)
 *   - docs/v2_redesign/multi_company_integration_architecture.md
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { firmaCalcDefaults, localFirmen, localAuschreibungen } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import {
  getFirmaOverview,
  getProjectPositions,
  listManagedProjects,
  listExternalProjects,
  isPreisanfrageEnabled,
  isPreisanfrageMock,
  PreisanfrageError,
} from '../lib/preisanfrage.js';
import { KT01_FIRMEN, KT01_SNAPSHOT_AT } from '../data/kt01-firmen.js';

/** The four Firma sources. 'local' rows live in panel-api only; 'managed' +
 *  'external' come live from preisanfrage; 'directory' rows come from the baked
 *  KT01 snapshot (data/kt01-firmen.ts) and are read-only — they guarantee the
 *  full company list shows even when the live preisanfrage token isn't set.
 *  The composite (kind, id) is the only safe way to address a Firma — the same
 *  numeric id can repeat across managed/external, and directory ids are slugs. */
const FIRMA_KIND = z.enum(['managed', 'external', 'local', 'directory']);
/** Just the two preisanfrage-sourced kinds — used by the legacy
 *  defaults/positions routes that don't know about local firms. */
const PREISANFRAGE_FIRMA_KIND = z.enum(['managed', 'external']);

const AUSCHREIBUNG_STATUS = z.enum(['offen', 'in_arbeit', 'abgegeben', 'gewonnen', 'verloren']);

/** YYYY-MM-DD (ISO date). Validated as text so the UI gets a clear error
 *  instead of silently dropping the value at JSON serialization time. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** HH:MM 24h. */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const createLocalFirmaSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  tradeType: z.string().trim().max(64).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const updateLocalFirmaSchema = createLocalFirmaSchema.partial();

const createLocalAuschreibungSchema = z.object({
  name: z.string().trim().min(1).max(255),
  projectNumber: z.string().trim().max(64).optional().nullable(),
  auftraggeberName: z.string().trim().max(255).optional().nullable(),
  anschriftPlzOrt: z.string().trim().max(255).optional().nullable(),
  submissionDate: z.string().regex(DATE_RE, 'submissionDate must be YYYY-MM-DD').optional().nullable(),
  submissionTime: z.string().regex(TIME_RE, 'submissionTime must be HH:MM').optional().nullable(),
  status: AUSCHREIBUNG_STATUS.optional(),
  notes: z.string().max(5000).optional().nullable(),
});

const updateLocalAuschreibungSchema = createLocalAuschreibungSchema.partial();

/** Serialize a local firma row for the wire. Cents/bp don't apply here —
 *  it's pure text/timestamps. */
function serializeLocalFirma(row: typeof localFirmen.$inferSelect) {
  return {
    kind: 'local' as const,
    id: row.id,
    displayName: row.displayName,
    tradeType: row.tradeType ?? null,
    notes: row.notes ?? null,
    archivedAt: row.archivedAt ? row.archivedAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function serializeLocalAuschreibung(row: typeof localAuschreibungen.$inferSelect) {
  return {
    source: 'local' as const,
    id: row.id,
    firmaKind: row.firmaKind,
    firmaId: row.firmaId,
    projectNumber: row.projectNumber,
    name: row.name,
    auftraggeberName: row.auftraggeberName,
    anschriftPlzOrt: row.anschriftPlzOrt,
    submissionDate: row.submissionDate,
    submissionTime: row.submissionTime,
    status: row.status,
    notes: row.notes,
    archivedAt: row.archivedAt ? row.archivedAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

const updateDefaultsSchema = z.object({
  /** Decimal markup, e.g. 0.12 = 12 %. Stored as basis-points server-side.
   *  Capped at 10 (= 1000 %): Kleinmaterial / Verbrauchsmaterial markups well
   *  above 100 % are routine in construction, so a 100 % ceiling (max 1) hard-
   *  rejected normal inputs with an opaque invalid_input. */
  materialZuschlag: z.number().finite().min(0).max(10),
  nuZuschlag: z.number().finite().min(0).max(10),
  /** €/h, e.g. 49.90. Stored as cents server-side. */
  verrechnungslohn: z.number().finite().min(0).max(10000),
  geraeteStundensatz: z.number().finite().min(0).max(10000),
  /** Echoed back so we can keep the cached display name in sync. */
  displayName: z.string().min(1).max(255),
});

const DEFAULTS = {
  materialZuschlag: 0.12,
  nuZuschlag: 0.12,
  verrechnungslohn: 49.9,
  geraeteStundensatz: 0.5,
};

function serializeDefaults(row: typeof firmaCalcDefaults.$inferSelect | null | undefined) {
  if (!row) {
    return {
      ...DEFAULTS,
      isCustom: false,
    };
  }
  return {
    materialZuschlag: row.materialZuschlag / 10000,
    nuZuschlag: row.nuZuschlag / 10000,
    verrechnungslohn: row.verrechnungslohnCents / 100,
    geraeteStundensatz: row.geraeteSatzCents / 100,
    isCustom: true,
    lastEditedBy: row.lastEditedBy,
    updatedAt: row.updatedAt,
  };
}

/** Wrapper that translates PreisanfrageError into a clean HTTP response so
 *  the panel UI gets a usable error chip instead of a 500. Status is a
 *  narrow union so Hono's `c.json(body, status)` overload accepts it. */
function handleUpstreamError(err: unknown): {
  status: 500 | 502 | 503;
  body: { error: string; upstreamStatus?: number; detail?: unknown };
} {
  if (err instanceof PreisanfrageError) {
    // Map upstream 502/503 to our own 503 so the UI shows
    // "preisanfrage unreachable" instead of bleeding internal status codes.
    const status: 502 | 503 = err.status === 502 || err.status === 503 ? 503 : 502;
    return { status, body: { error: 'upstream_error', upstreamStatus: err.status, detail: err.body } };
  }
  return { status: 500, body: { error: 'internal', detail: String(err) } };
}

/** Normalise a folder/display name for dedup comparisons. */
function normKey(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/** Build the KT01-directory rows for the /firmen list, deduped against the
 *  live preisanfrage rows. Live data always wins (it carries real project /
 *  won numbers); the directory is the offline floor so the full company list
 *  shows even when the preisanfrage token isn't configured. Dedup is by
 *  folderName, falling back to displayName for the few entries without a
 *  OneDrive folder. */
function buildDirectoryRows(
  liveRows: ReadonlyArray<{ folderName: string | null; displayName: string }>,
) {
  const liveFolders = new Set(
    liveRows.map((r) => normKey(r.folderName)).filter((s) => s.length > 0),
  );
  const liveNames = new Set(liveRows.map((r) => normKey(r.displayName)));
  return KT01_FIRMEN.filter((f) => {
    const folderKey = normKey(f.folderName);
    if (folderKey) return !liveFolders.has(folderKey);
    return !liveNames.has(normKey(f.displayName));
  }).map((f) => ({
    kind: 'directory' as const,
    id: f.slug,
    folderName: f.folderName,
    displayName: f.displayName,
    tradeType: f.tradeType,
    projectCount: f.projectCount ?? 0,
    wonCount: 0,
    wonSumBrutto: 0,
    lastSubmissionDate: null as string | null,
    adoptedCompanyId: null as number | null,
    hasCustomDefaults: false,
  }));
}

export const firmenRoute = new Hono<{ Variables: AuthVariables }>()
  /** Liveness probe — does the panel know how to talk to preisanfrage? */
  .get('/firmen/health', requireAuth, async (c) => {
    const enabled = isPreisanfrageEnabled();
    const mock = isPreisanfrageMock();
    return c.json({
      enabled,
      mock,
      hint: mock
        ? 'running in MOCK mode — using preisanfrage-fixture.ts'
        : enabled
          ? 'preisanfrage service token is configured'
          : 'set PREISANFRAGE_SERVICE_JWT (or PREISANFRAGE_MOCK=fixture for demo) on the panel-api server',
    });
  })

  /** The big list — all preisanfrage firmas + every local firma the
   *  current user owns. Preisanfrage rows come first (BI-aggregated),
   *  local rows are appended with the same shape so the panel UI can
   *  render them uniformly.
   *
   *  Per-user decision 2026-05-22: show ALL preisanfrage firmas, mark
   *  unadopted ones with a flag. Local firms are owner-scoped (never
   *  cross-tenant). Local rows count toward neither managedCount nor
   *  externalCount — they're a separate dimension. */
  .get('/firmen', requireAuth, async (c) => {
    const userId = c.get('userId');
    // Compute local-firma aggregates regardless of preisanfrage availability,
    // so adding/listing locals works even when the preisanfrage JWT isn't set.
    const localRows = await db
      .select()
      .from(localFirmen)
      .where(and(eq(localFirmen.ownerId, userId), isNull(localFirmen.archivedAt)));

    // Aggregate child Ausschreibungen per local firma (won + last submission).
    const localAusForUser = await db
      .select()
      .from(localAuschreibungen)
      .where(and(eq(localAuschreibungen.ownerId, userId), isNull(localAuschreibungen.archivedAt)));
    const localAusByFirma = new Map<string, typeof localAuschreibungen.$inferSelect[]>();
    for (const a of localAusForUser) {
      if (a.firmaKind !== 'local') continue;
      const arr = localAusByFirma.get(a.firmaId) ?? [];
      arr.push(a);
      localAusByFirma.set(a.firmaId, arr);
    }

    const localOut = localRows.map((r) => {
      const aus = localAusByFirma.get(r.id) ?? [];
      const wonCount = aus.filter((a) => a.status === 'gewonnen').length;
      const lastSubmissionDate =
        aus
          .map((a) => a.submissionDate)
          .filter((d): d is string => !!d)
          .sort()
          .reverse()[0] ?? null;
      return {
        kind: 'local' as const,
        id: r.id,
        folderName: null as string | null,
        displayName: r.displayName,
        tradeType: r.tradeType,
        projectCount: aus.length,
        wonCount,
        wonSumBrutto: 0,
        lastSubmissionDate,
        adoptedCompanyId: null as number | null,
        hasCustomDefaults: false,
      };
    });

    if (!isPreisanfrageEnabled()) {
      // No preisanfrage backend (e.g. production without the service token):
      // fall back to the baked KT01 directory + local rows so the Firmen-Liste
      // still shows every Bauunternehmer. This is the case that guarantees the
      // live site lists all companies even without the live integration.
      const directoryRows = buildDirectoryRows([]);
      return c.json({
        rows: [...directoryRows, ...localOut],
        managedCount: 0,
        externalCount: 0,
        localCount: localOut.length,
        directoryCount: directoryRows.length,
        totalProjects:
          localOut.reduce((s, r) => s + r.projectCount, 0) +
          directoryRows.reduce((s, r) => s + r.projectCount, 0),
        lastScanAt: KT01_SNAPSHOT_AT,
        generatedAt: new Date().toISOString(),
        isMock: isPreisanfrageMock(),
        preisanfrageDisabled: true,
      });
    }

    try {
      const overview = await getFirmaOverview();
      // Cheap join: load every defaults row + index by (id, kind). 98 firms is fine.
      const allDefaults = await db.select().from(firmaCalcDefaults);
      const defaultsByKey = new Map<string, typeof firmaCalcDefaults.$inferSelect>();
      for (const d of allDefaults) {
        defaultsByKey.set(`${d.firmaKind}:${d.preisanfrageFirmaId}`, d);
      }
      // Preisanfrage rows keep their original `id` shape (number); local rows
      // are nanoid strings. The combined `id` field type becomes `number|string`
      // — clients must read `kind` first to branch.
      const preisanfrageOut = overview.rows.map((r) => ({
        kind: r.kind,
        id: r.id as number | string,
        folderName: r.folderName,
        displayName: r.displayName,
        tradeType: r.tradeType,
        projectCount: r.projectCount,
        wonCount: r.wonCount,
        wonSumBrutto: r.wonSumBrutto,
        lastSubmissionDate: r.lastSubmissionDate,
        adoptedCompanyId: r.adoptedCompanyId,
        hasCustomDefaults: defaultsByKey.has(`${r.kind}:${r.id}`),
      }));
      // Append the baked KT01 directory, deduped against the live rows so
      // managed/external firms never double up. When the live scan is the full
      // set this adds nothing; it only fills gaps (e.g. a firm not yet scanned).
      const directoryRows = buildDirectoryRows(preisanfrageOut);
      return c.json({
        rows: [...preisanfrageOut, ...directoryRows, ...localOut],
        managedCount: overview.managedCount,
        externalCount: overview.externalCount,
        localCount: localOut.length,
        directoryCount: directoryRows.length,
        totalProjects:
          overview.totalProjects +
          localOut.reduce((s, r) => s + r.projectCount, 0) +
          directoryRows.reduce((s, r) => s + r.projectCount, 0),
        lastScanAt: overview.lastScanAt ?? KT01_SNAPSHOT_AT,
        generatedAt: new Date().toISOString(),
        isMock: isPreisanfrageMock(),
      });
    } catch (err) {
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  })

  /** Per-Firma detail: master from preisanfrage (or local DB) + Ausschreibungen
   *  + cached calc defaults. Local Ausschreibungen for this firma are ALWAYS
   *  merged into projects[] (tagged `source: 'local'`) so a managed/external
   *  firma can carry user-added tenders alongside the preisanfrage-discovered
   *  ones. The frontend Firma page renders from this. */
  .get('/firmen/:kind/:id', requireAuth, async (c) => {
    const kindRaw = c.req.param('kind');
    const idRaw = c.req.param('id');
    const kindParsed = FIRMA_KIND.safeParse(kindRaw);
    if (!kindParsed.success) {
      return c.json({ error: 'invalid_firma_ref' }, 400);
    }
    const kind = kindParsed.data;
    const userId = c.get('userId');

    // Local kind: read straight from the panel DB. Skip preisanfrage entirely.
    if (kind === 'local') {
      const row = await db.query.localFirmen.findFirst({
        where: and(eq(localFirmen.id, idRaw), eq(localFirmen.ownerId, userId)),
      });
      if (!row || row.archivedAt) {
        return c.json({ error: 'firma_not_found' }, 404);
      }
      // Local Ausschreibungen attached to this local firma.
      const aus = await db
        .select()
        .from(localAuschreibungen)
        .where(
          and(
            eq(localAuschreibungen.ownerId, userId),
            eq(localAuschreibungen.firmaKind, 'local'),
            eq(localAuschreibungen.firmaId, idRaw),
            isNull(localAuschreibungen.archivedAt),
          ),
        )
        .orderBy(desc(localAuschreibungen.createdAt));
      const projects = aus.map(serializeLocalAuschreibung);
      const wonCount = aus.filter((a) => a.status === 'gewonnen').length;
      const lastSubmissionDate =
        aus
          .map((a) => a.submissionDate)
          .filter((d): d is string => !!d)
          .sort()
          .reverse()[0] ?? null;
      return c.json({
        firma: {
          kind: 'local' as const,
          id: row.id,
          folderName: null,
          displayName: row.displayName,
          tradeType: row.tradeType,
          projectCount: aus.length,
          wonCount,
          wonSumBrutto: 0,
          lastSubmissionDate,
          adoptedCompanyId: null,
          notes: row.notes,
        },
        // Local firms don't get firma_calc_defaults rows (the table CHECK
        // only allows managed/external). Show the KALKU global defaults
        // so the panel UI doesn't crash on missing fields.
        defaults: serializeDefaults(null),
        projects,
      });
    }

    // directory: read straight from the baked KT01 snapshot. No preisanfrage,
    // no projects yet — the detail page offers "Kalkulation starten" to begin.
    if (kind === 'directory') {
      const entry = KT01_FIRMEN.find((f) => f.slug === idRaw);
      if (!entry) {
        return c.json({ error: 'firma_not_found' }, 404);
      }
      return c.json({
        firma: {
          kind: 'directory' as const,
          id: entry.slug,
          folderName: entry.folderName,
          displayName: entry.displayName,
          tradeType: entry.tradeType,
          projectCount: entry.projectCount ?? 0,
          wonCount: 0,
          wonSumBrutto: 0,
          lastSubmissionDate: null,
          adoptedCompanyId: null,
        },
        defaults: serializeDefaults(null),
        projects: [],
      });
    }

    // managed | external — original preisanfrage path.
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_firma_ref' }, 400);
    }

    if (!isPreisanfrageEnabled()) {
      return c.json({ error: 'integration_disabled' }, 503);
    }

    try {
      // Get the Firma row from the overview (cheap thanks to in-memory cache).
      const overview = await getFirmaOverview();
      const firma = overview.rows.find((r) => r.kind === kind && r.id === id);
      if (!firma) return c.json({ error: 'firma_not_found' }, 404);

      // Fetch projects from the appropriate endpoint.
      // Managed firms: full LV detail per project.
      // External firms: BI rows w/ submission results, no positions yet.
      type ProjectRow = Record<string, unknown> & { source: string };
      let projects: ProjectRow[] = [];
      if (kind === 'managed') {
        const raw = await listManagedProjects(id, { limit: 100 });
        projects = raw.map((p) => ({
          source: 'managed',
          id: p.id,
          projectNumber: p.projectNumber,
          name: p.name,
          baumassnahme: p.baumassnahme,
          auftraggeberName: p.auftraggeberName,
          anschriftPlzOrt: p.anschriftPlzOrt,
          submissionDate: p.submissionDate,
          submissionTime: p.submissionTime,
          status: p.status,
          totalPositions: p.totalPositions,
          oneDriveShareUrl: p.oneDriveShareUrl,
          updatedAt: p.updatedAt,
        }));
      } else {
        const raw = await listExternalProjects(id);
        projects = raw.map((p) => ({
          source: 'external',
          id: p.id,
          projectNumber: p.projectNumber,
          name: p.projectName,
          folderName: p.folderName,
          auftraggeberName: p.auftraggeberName,
          anschriftPlzOrt: p.anschriftPlzOrt,
          submissionDate: p.submissionDate,
          teilnehmerCount: p.teilnehmerCount,
          ourRank: p.ourRank,
          winnerName: p.winnerName,
          winnerNetto: p.winnerNetto,
          winnerBrutto: p.winnerBrutto,
          ourNetto: p.ourNetto,
          ourBrutto: p.ourBrutto,
          parsedAt: p.parsedAt,
        }));
      }

      // Merge in local Ausschreibungen targeting this preisanfrage firma.
      // Use String(id) for the comparison — local_auschreibungen.firma_id is
      // text (it holds both nanoids and numeric ids serialized as strings).
      const localAus = await db
        .select()
        .from(localAuschreibungen)
        .where(
          and(
            eq(localAuschreibungen.ownerId, userId),
            eq(localAuschreibungen.firmaKind, kind),
            eq(localAuschreibungen.firmaId, String(id)),
            isNull(localAuschreibungen.archivedAt),
          ),
        );
      const localProjects = localAus.map(serializeLocalAuschreibung);
      const mergedProjects = [...projects, ...localProjects];

      // Load custom defaults if any.
      const defaultsRow = await db.query.firmaCalcDefaults.findFirst({
        where: and(
          eq(firmaCalcDefaults.preisanfrageFirmaId, id),
          eq(firmaCalcDefaults.firmaKind, kind),
        ),
      });

      return c.json({
        firma: {
          kind: firma.kind,
          id: firma.id,
          folderName: firma.folderName,
          displayName: firma.displayName,
          tradeType: firma.tradeType,
          projectCount: firma.projectCount,
          wonCount: firma.wonCount,
          wonSumBrutto: firma.wonSumBrutto,
          lastSubmissionDate: firma.lastSubmissionDate,
          adoptedCompanyId: firma.adoptedCompanyId,
        },
        defaults: serializeDefaults(defaultsRow),
        projects: mergedProjects,
      });
    } catch (err) {
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  })

  /** Fetch the GAEB-parsed positions for one project.
   *  - Managed firma → upstream call to preisanfrage.
   *  - External firma → 404 (preisanfrage doesn't have positions for externals).
   *  - Local firma OR a project id that resolves to a local Ausschreibung
   *    → returns count=0 (local Ausschreibungen have no GAEB; the calculator
   *      uploads/types positions manually after Kalkulation starten). */
  .get('/firmen/:kind/:firmaId/projects/:projectId/positions', requireAuth, async (c) => {
    const kindParsed = FIRMA_KIND.safeParse(c.req.param('kind'));
    const firmaIdRaw = c.req.param('firmaId');
    const projectIdRaw = c.req.param('projectId');
    if (!kindParsed.success) {
      return c.json({ error: 'invalid_ref' }, 400);
    }
    const kind = kindParsed.data;
    const userId = c.get('userId');

    // First, peek the local table — if the projectId exists there as a local
    // Ausschreibung owned by this user, return empty positions immediately.
    // Covers both:
    //   - kind='local' (always local Ausschreibung)
    //   - kind='managed'/'external' but the user added a local Ausschreibung
    //     onto a preisanfrage firma and clicks Kalkulation starten on it.
    const localProj = await db.query.localAuschreibungen.findFirst({
      where: and(eq(localAuschreibungen.id, projectIdRaw), eq(localAuschreibungen.ownerId, userId)),
    });
    if (localProj) {
      return c.json({ projectId: projectIdRaw, count: 0, positions: [] });
    }

    // Local/directory kind with an unknown projectId — nothing to fetch
    // upstream (directory firms carry no preisanfrage positions).
    if (kind === 'local' || kind === 'directory') {
      return c.json({ projectId: projectIdRaw, count: 0, positions: [] });
    }

    const firmaId = Number(firmaIdRaw);
    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(firmaId) || firmaId <= 0 || !Number.isInteger(projectId) || projectId <= 0) {
      return c.json({ error: 'invalid_ref' }, 400);
    }
    if (kind === 'external') {
      return c.json({ error: 'external_firma_has_no_positions',
        hint: 'External firmas only carry submission results in preisanfrage. Import the GAEB manually.' }, 404);
    }
    if (!isPreisanfrageEnabled()) {
      return c.json({ error: 'integration_disabled' }, 503);
    }
    try {
      const result = await getProjectPositions(projectId);
      return c.json({
        projectId,
        count: result.positions.length,
        positions: result.positions,
        angeboteFolderShareUrl: result.angeboteFolderShareUrl,
      });
    } catch (err) {
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  })

  /** Upsert per-Firma calc defaults. Stored as basis-points + cents
   *  for exact equality across JS float roundtrip.
   *  NOTE: only managed/external supported here — the firma_calc_defaults
   *  table's CHECK constraint rejects 'local'. */
  .put('/firmen/:kind/:id/defaults', requireAuth, async (c) => {
    const kindParsed = PREISANFRAGE_FIRMA_KIND.safeParse(c.req.param('kind'));
    const id = Number(c.req.param('id'));
    if (!kindParsed.success || !Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_firma_ref' }, 400);
    }
    const kind = kindParsed.data;
    const body = await c.req.json().catch(() => null);
    const parsed = updateDefaultsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const now = new Date();
    const userId = c.get('userId');
    const existing = await db.query.firmaCalcDefaults.findFirst({
      where: and(
        eq(firmaCalcDefaults.preisanfrageFirmaId, id),
        eq(firmaCalcDefaults.firmaKind, kind),
      ),
    });
    const values = {
      preisanfrageFirmaId: id,
      firmaKind: kind,
      displayName: parsed.data.displayName,
      materialZuschlag: Math.round(parsed.data.materialZuschlag * 10000),
      nuZuschlag: Math.round(parsed.data.nuZuschlag * 10000),
      verrechnungslohnCents: Math.round(parsed.data.verrechnungslohn * 100),
      geraeteSatzCents: Math.round(parsed.data.geraeteStundensatz * 100),
      lastEditedBy: userId,
      updatedAt: now,
    };
    if (existing) {
      await db
        .update(firmaCalcDefaults)
        .set(values)
        .where(
          and(
            eq(firmaCalcDefaults.preisanfrageFirmaId, id),
            eq(firmaCalcDefaults.firmaKind, kind),
          ),
        );
    } else {
      await db.insert(firmaCalcDefaults).values({ ...values, createdAt: now });
    }
    return c.json({ ok: true, defaults: serializeDefaults({ ...values, createdAt: existing?.createdAt ?? now } as typeof firmaCalcDefaults.$inferSelect) });
  })

  /** Reset to global defaults — deletes the per-Firma row. */
  .delete('/firmen/:kind/:id/defaults', requireAuth, async (c) => {
    const kindParsed = PREISANFRAGE_FIRMA_KIND.safeParse(c.req.param('kind'));
    const id = Number(c.req.param('id'));
    if (!kindParsed.success || !Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_firma_ref' }, 400);
    }
    await db
      .delete(firmaCalcDefaults)
      .where(
        and(
          eq(firmaCalcDefaults.preisanfrageFirmaId, id),
          eq(firmaCalcDefaults.firmaKind, kindParsed.data),
        ),
      );
    return c.json({ ok: true });
  })

  /* ─── Round 11: local Firmen CRUD ─────────────────────────────────── */

  /** POST /firmen — create a new local Firma. */
  .post('/firmen', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createLocalFirmaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const userId = c.get('userId');
    const now = new Date();
    const id = nanoid(16);
    await db.insert(localFirmen).values({
      id,
      ownerId: userId,
      displayName: parsed.data.displayName,
      tradeType: parsed.data.tradeType ?? null,
      notes: parsed.data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
    const row = await db.query.localFirmen.findFirst({ where: eq(localFirmen.id, id) });
    return c.json(serializeLocalFirma(row!));
  })

  /** PUT /firmen/local/:id — patch a local Firma's fields. */
  .put('/firmen/local/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const parsed = updateLocalFirmaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const userId = c.get('userId');
    const existing = await db.query.localFirmen.findFirst({
      where: and(eq(localFirmen.id, id), eq(localFirmen.ownerId, userId)),
    });
    if (!existing || existing.archivedAt) {
      return c.json({ error: 'firma_not_found' }, 404);
    }
    const now = new Date();
    const patch: Partial<typeof localFirmen.$inferInsert> = { updatedAt: now };
    if (parsed.data.displayName !== undefined) patch.displayName = parsed.data.displayName;
    if (parsed.data.tradeType !== undefined) patch.tradeType = parsed.data.tradeType;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
    await db.update(localFirmen).set(patch).where(eq(localFirmen.id, id));
    const updated = await db.query.localFirmen.findFirst({ where: eq(localFirmen.id, id) });
    return c.json(serializeLocalFirma(updated!));
  })

  /** DELETE /firmen/local/:id — soft-delete the Firma and cascade-archive
   *  every child local_auschreibung. Also drops any orphaned firma_calc_defaults
   *  row keyed at the same (kind='local', id) — though such a row would only
   *  exist if a bug bypassed the table CHECK. We delete defensively. */
  .delete('/firmen/local/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const existing = await db.query.localFirmen.findFirst({
      where: and(eq(localFirmen.id, id), eq(localFirmen.ownerId, userId)),
    });
    if (!existing) {
      return c.json({ error: 'firma_not_found' }, 404);
    }
    const now = new Date();
    await db
      .update(localFirmen)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(localFirmen.id, id));
    // Cascade-archive children (local kind only — managed/external Aus on
    // this firma are impossible since firmaId is a nanoid, not a number).
    await db
      .update(localAuschreibungen)
      .set({ archivedAt: now, updatedAt: now })
      .where(
        and(
          eq(localAuschreibungen.ownerId, userId),
          eq(localAuschreibungen.firmaKind, 'local'),
          eq(localAuschreibungen.firmaId, id),
        ),
      );
    return c.json({ ok: true });
  })

  /* ─── Round 11: local Ausschreibungen CRUD ────────────────────────── */

  /** POST /firmen/:kind/:firmaId/auschreibungen — create a local Ausschreibung.
   *  Kind+firmaId determines which Firma this tender attaches to. Local
   *  Ausschreibungen on preisanfrage-tracked firmas are explicitly supported. */
  .post('/firmen/:kind/:firmaId/auschreibungen', requireAuth, async (c) => {
    const kindParsed = FIRMA_KIND.safeParse(c.req.param('kind'));
    const firmaIdRaw = c.req.param('firmaId');
    if (!kindParsed.success) {
      return c.json({ error: 'invalid_firma_ref' }, 400);
    }
    const kind = kindParsed.data;
    // Directory firms are read-only — they're a baked snapshot, not a writable
    // Firma. Adopt the firm in preisanfrage or create a local Firma instead.
    if (kind === 'directory') {
      return c.json(
        {
          error: 'directory_firma_readonly',
          hint: 'KT01-Verzeichnis-Firmen sind schreibgeschützt. Lege die Firma lokal an oder richte sie in preisanfrage ein.',
        },
        400,
      );
    }
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => null);
    const parsed = createLocalAuschreibungSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }

    // Validate that the parent Firma actually exists + this user owns it
    // (only checkable for local kind; preisanfrage firmas are accepted on
    // faith — they're not user-scoped). Prevents creating dangling local
    // Ausschreibungen pointing at another user's local Firma.
    if (kind === 'local') {
      const parent = await db.query.localFirmen.findFirst({
        where: and(eq(localFirmen.id, firmaIdRaw), eq(localFirmen.ownerId, userId)),
      });
      if (!parent || parent.archivedAt) {
        return c.json({ error: 'firma_not_found' }, 404);
      }
    } else {
      // For managed/external just sanity-check the id is numeric.
      const n = Number(firmaIdRaw);
      if (!Number.isInteger(n) || n <= 0) {
        return c.json({ error: 'invalid_firma_ref' }, 400);
      }
    }

    const now = new Date();
    const id = nanoid(16);
    await db.insert(localAuschreibungen).values({
      id,
      ownerId: userId,
      firmaKind: kind,
      firmaId: firmaIdRaw,
      projectNumber: parsed.data.projectNumber ?? null,
      name: parsed.data.name,
      auftraggeberName: parsed.data.auftraggeberName ?? null,
      anschriftPlzOrt: parsed.data.anschriftPlzOrt ?? null,
      submissionDate: parsed.data.submissionDate ?? null,
      submissionTime: parsed.data.submissionTime ?? null,
      status: parsed.data.status ?? 'offen',
      notes: parsed.data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
    const row = await db.query.localAuschreibungen.findFirst({
      where: eq(localAuschreibungen.id, id),
    });
    return c.json(serializeLocalAuschreibung(row!));
  })

  /** PUT /firmen/local-auschreibung/:id — patch any field, including status. */
  .put('/firmen/local-auschreibung/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const parsed = updateLocalAuschreibungSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const userId = c.get('userId');
    const existing = await db.query.localAuschreibungen.findFirst({
      where: and(eq(localAuschreibungen.id, id), eq(localAuschreibungen.ownerId, userId)),
    });
    if (!existing || existing.archivedAt) {
      return c.json({ error: 'auschreibung_not_found' }, 404);
    }
    const now = new Date();
    const patch: Partial<typeof localAuschreibungen.$inferInsert> = { updatedAt: now };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.projectNumber !== undefined) patch.projectNumber = parsed.data.projectNumber;
    if (parsed.data.auftraggeberName !== undefined) patch.auftraggeberName = parsed.data.auftraggeberName;
    if (parsed.data.anschriftPlzOrt !== undefined) patch.anschriftPlzOrt = parsed.data.anschriftPlzOrt;
    if (parsed.data.submissionDate !== undefined) patch.submissionDate = parsed.data.submissionDate;
    if (parsed.data.submissionTime !== undefined) patch.submissionTime = parsed.data.submissionTime;
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
    await db.update(localAuschreibungen).set(patch).where(eq(localAuschreibungen.id, id));
    const updated = await db.query.localAuschreibungen.findFirst({
      where: eq(localAuschreibungen.id, id),
    });
    return c.json(serializeLocalAuschreibung(updated!));
  })

  /** DELETE /firmen/local-auschreibung/:id — soft-delete. */
  .delete('/firmen/local-auschreibung/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const existing = await db.query.localAuschreibungen.findFirst({
      where: and(eq(localAuschreibungen.id, id), eq(localAuschreibungen.ownerId, userId)),
    });
    if (!existing) {
      return c.json({ error: 'auschreibung_not_found' }, 404);
    }
    const now = new Date();
    await db
      .update(localAuschreibungen)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(localAuschreibungen.id, id));
    return c.json({ ok: true });
  });
