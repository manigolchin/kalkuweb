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
import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { firmaCalcDefaults } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import {
  getFirmaOverview,
  listManagedProjects,
  listExternalProjects,
  isPreisanfrageEnabled,
  PreisanfrageError,
} from '../lib/preisanfrage.js';

const FIRMA_KIND = z.enum(['managed', 'external']);

const updateDefaultsSchema = z.object({
  /** Decimal in [0, 1]. e.g. 0.12 = 12 %. Stored as basis-points server-side. */
  materialZuschlag: z.number().finite().min(0).max(1),
  nuZuschlag: z.number().finite().min(0).max(1),
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

export const firmenRoute = new Hono<{ Variables: AuthVariables }>()
  /** Liveness probe — does the panel know how to talk to preisanfrage? */
  .get('/firmen/health', requireAuth, async (c) => {
    return c.json({
      enabled: isPreisanfrageEnabled(),
      hint: isPreisanfrageEnabled()
        ? 'preisanfrage service token is configured'
        : 'set PREISANFRAGE_SERVICE_JWT env var on the panel-api server',
    });
  })

  /** The big list — all 98 firmas. Merges preisanfrage's BI overview
   *  with each row's custom calc defaults (if any). Per-user decision
   *  2026-05-22: show ALL firmas, mark unadopted ones with a flag. */
  .get('/firmen', requireAuth, async (c) => {
    if (!isPreisanfrageEnabled()) {
      return c.json({ error: 'integration_disabled', detail: 'PREISANFRAGE_SERVICE_JWT not set on server' }, 503);
    }
    try {
      const overview = await getFirmaOverview();
      // Cheap join: load every defaults row + index by (id, kind). 98 firms is fine.
      const allDefaults = await db.select().from(firmaCalcDefaults);
      const defaultsByKey = new Map<string, typeof firmaCalcDefaults.$inferSelect>();
      for (const d of allDefaults) {
        defaultsByKey.set(`${d.firmaKind}:${d.preisanfrageFirmaId}`, d);
      }
      const rows = overview.rows.map((r) => ({
        kind: r.kind,
        id: r.id,
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
      return c.json({
        rows,
        managedCount: overview.managedCount,
        externalCount: overview.externalCount,
        totalProjects: overview.totalProjects,
        lastScanAt: overview.lastScanAt,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  })

  /** Per-Firma detail: master from preisanfrage + Ausschreibungen +
   *  cached calc defaults. The frontend Firma page renders from this. */
  .get('/firmen/:kind/:id', requireAuth, async (c) => {
    const kindRaw = c.req.param('kind');
    const idRaw = c.req.param('id');
    const kindParsed = FIRMA_KIND.safeParse(kindRaw);
    const id = Number(idRaw);
    if (!kindParsed.success || !Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_firma_ref' }, 400);
    }
    const kind = kindParsed.data;

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
      let projects: unknown[] = [];
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
        projects,
      });
    } catch (err) {
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  })

  /** Upsert per-Firma calc defaults. Stored as basis-points + cents
   *  for exact equality across JS float roundtrip. */
  .put('/firmen/:kind/:id/defaults', requireAuth, async (c) => {
    const kindParsed = FIRMA_KIND.safeParse(c.req.param('kind'));
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
    const kindParsed = FIRMA_KIND.safeParse(c.req.param('kind'));
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
  });
