import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, type ProjectData } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import { recomputePositions } from '../lib/snapshot.js';
import { evaluateAufmass } from '../lib/aufmass.js';
import { getProjectPositions, isPreisanfrageEnabled } from '../lib/preisanfrage.js';

const DEFAULT_CALC_PARAMS = {
  mittellohn: 30.0,
  verrechnungslohn: 49.9,
  materialZuschlag: 0.12,
  nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1,
  geraeteStundensatz: 0.5,
  zeitabzug: 0.0,
  tagesstunden: 8.0,
  personaleinsatz: 3,
  mwst: 0.19,
  zielAufschlag: 0,
};

const MAX_POSITIONS = 5000;

// Finite number — rejects NaN/Infinity that bleeds through from buggy clients
// and silently corrupts totals (the audit found ep=NaN was acceptable to the
// previous schema's z.array(z.any())).
const fnum = (max = 1e12) => z.number().finite().min(-max).max(max);

/**
 * Position type taxonomy. The four "internal" values are forced to
 * `visibleToCustomer: false` by the server below — a Wagnis line in a
 * customer-shared LV is the kind of mistake that destroys trust, so we
 * make it impossible to misshare by accident.
 */
const POSITION_TYPES = ['standard', 'wagnis', 'reserve', 'nu_marge', 'lohn_puffer'] as const;
export const INTERNAL_POSITION_TYPES = new Set<typeof POSITION_TYPES[number]>([
  'wagnis',
  'reserve',
  'nu_marge',
  'lohn_puffer',
]);

const positionSchema = z.object({
  id: z.string().min(1).max(64),
  oz: z.string().max(64).default(''),
  shortText: z.string().max(2000).default(''),
  longText: z.string().max(20000).default(''),
  hinweisText: z.string().max(2000).default(''),
  quantity: fnum(),
  unit: z.string().max(32).default(''),
  materialCost: fnum(),
  timeMinutes: fnum(1e8),
  nuCost: fnum(),
  // Per-position Geräte-Satz override ("Zulage Geräte"). Optional — must be
  // listed here or zod strips it on save (positions are re-validated on PUT).
  geraeteSatz: fnum().optional(),
  // Per-position Geräte lump sum ("EP Geräte", col AA). Optional — same reason.
  geraeteEp: fnum().optional(),
  geraeteEpFormula: z.string().max(2000).optional(),
  // Per-position EP Löhne override ("EP Löhne", col AB) + its formula.
  lohnEp: fnum().optional(),
  lohnEpFormula: z.string().max(2000).optional(),
  // Per-position Lohn-Faktor "W" — labor multiplier on the Verrechnungslohn so
  // the row re-prices when VL changes (col AB = Zeit/60 × Verrechnungslohn × W).
  lohnFaktor: fnum().optional(),
  // Per-position EP Stoffe VK / EP Nachu. overrides (cols AJ/AK) — flat VERKAUF
  // when hand-typed values replace the Material/NU × (1+Zuschlag) default.
  materialEp: fnum().optional(),
  nuEp: fnum().optional(),
  // Bedarfs-/Eventualposition — priced but excluded from the Angebotssumme.
  bedarfsposition: z.boolean().optional(),
  isHeader: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().max(1e8).default(0),
  sectionPath: z.string().max(256).default(''),
  // Derived fields — accepted on input for backwards compat but the server
  // always recomputes them from the cost inputs before persisting. The
  // customer view reads from a snapshot built at share time anyway, so
  // these values only matter for the owner's own table totals.
  epLohn: fnum().default(0),
  epMaterial: fnum().default(0),
  epGeraet: fnum().default(0),
  epNu: fnum().default(0),
  ep: fnum().default(0),
  gp: fnum().default(0),
  classification: z.string().max(64).nullable().optional(),
  visibleToCustomer: z.boolean().default(true),
  internalNote: z.string().max(4000).optional(),
  positionType: z.enum(POSITION_TYPES).default('standard'),
  aufmassFormula: z.string().max(20000).optional(),
  // Provenance — set ONCE at the import path (GAEB upload, Kalkulations-
  // Vorlage Excel parse, preisanfrage "Kalkulation starten" seed). The
  // frontend's PositionTableV2 protects rows with a truthy value from
  // deletion (lock icon + bulk-delete skip). Round trip MUST preserve
  // the tag — without it on this schema, zod silently strips it and
  // every reloaded position becomes deletable again.
  importedFrom: z.enum(['gaeb', 'excel', 'preisanfrage']).optional(),
});

const calcParamsSchema = z.object({
  mittellohn: fnum(),
  verrechnungslohn: fnum(),
  materialZuschlag: fnum(),
  nuZuschlag: fnum(),
  geraeteZuschlagPct: fnum(),
  geraeteStundensatz: fnum(),
  zeitabzug: fnum(),
  tagesstunden: fnum(),
  personaleinsatz: z.number().int().min(0).max(1e4),
  mwst: fnum(),
  // Global Ziel-Aufschlag. Defaults to 0 so projects saved before this field
  // round-trip as a no-op. Bounded to the same envelope the client solver
  // clamps to ([-1, 100]) so a buggy client can't drive prices negative.
  zielAufschlag: z.number().finite().min(-1).max(100).default(0),
});

// Feature #5 — per-position actual values captured after Auftragsausführung.
// Lives inside ProjectData.actuals as a Record<positionId, PositionActual>.
const positionActualSchema = z.object({
  hours: fnum().optional(),
  materialCost: fnum().optional(),
  nuCost: fnum().optional(),
  note: z.string().max(4000).optional(),
  recordedAt: z.string().max(64).optional(),
});

// Feature #2 — Preisspiegel: one NU/Lieferant quote source and its per-
// position prices. Lives in ProjectData.nuQuotes[].
const nuQuoteSchema = z.object({
  materialCost: fnum().optional(),
  nuCost: fnum().optional(),
  note: z.string().max(4000).optional(),
});

const nuQuoteSourceSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(500),
  note: z.string().max(2000).optional(),
  receivedAt: z.string().max(64).optional(),
  quotes: z.record(z.string().max(64), nuQuoteSchema),
});

const projectDataSchema = z
  .object({
    name: z.string().max(500).default(''),
    client: z.string().max(500).default(''),
    clientEmail: z.string().max(500).optional(),
    clientAddress: z.string().max(2000).optional(),
    service: z.string().max(500).default(''),
    tenderNumber: z.string().max(200).default(''),
    deadline: z.string().max(64).default(''),
    bidder: z.string().max(500).default(''),
    calcParams: calcParamsSchema,
    positions: z.array(positionSchema).max(MAX_POSITIONS),
    notes: z.string().max(10000).optional(),
    /** Feature #5 — Nachkalkulation Lite. Bug 2026-05-23: previously not
     *  declared here, zod silently stripped on every save → total data loss
     *  on Nachkalk page. Now explicit + validated. */
    actuals: z.record(z.string().max(64), positionActualSchema).optional(),
    /** Feature #2 — Preisspiegel. Same regression class as `actuals`. */
    nuQuotes: z.array(nuQuoteSourceSchema).max(50).optional(),
  })
  // passthrough so future optional ProjectData fields (zuschlagOriginal,
  // headerExtras, faktoren etc.) round-trip even when we forget to declare
  // them. Same regression class as the `actuals`/`nuQuotes` bug — the schema
  // was stripping fields the frontend depends on. Belt-and-suspenders.
  .passthrough() as unknown as z.ZodType<ProjectData>;

const putBodySchema = z.object({
  data: projectDataSchema as unknown as z.ZodType<ProjectData>,
  bumpVersion: z.boolean().optional(),
  expectedUpdatedAt: z.number().int().nonnegative().optional(),
});

/**
 * Recover the upstream preisanfrage Ausschreibung a calc was started from by
 * parsing the provenance tag that `Firma.startKalkulation` writes into `notes`
 * (`… Ref: <kind>:<id>`). The structured `data.sourceRef` is preferred when
 * present; this is the fallback for projects created before that field existed.
 * Exported for direct unit testing.
 */
export function parsePreisanfrageRef(
  notes: string | null | undefined,
): { kind: string; projectId: number } | null {
  if (!notes) return null;
  const m = notes.match(/Ref:\s*(managed|external|local|directory):(\d+)/i);
  if (!m) return null;
  const projectId = Number(m[2]);
  if (!Number.isInteger(projectId) || projectId <= 0) return null;
  return { kind: m[1].toLowerCase(), projectId };
}

export const projectsRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const rows = await db
      .select({
        id: projects.id,
        data: projects.data,
        versionNumber: projects.versionNumber,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.updatedAt));

    return c.json({
      projects: rows.map((r) => ({
        id: r.id,
        name: r.data.name,
        client: r.data.client,
        // The Bauunternehmer the calc is for — lets the list group by Firma
        // the same way the Kunden-Feedback inbox does. Full `data` is already
        // loaded here, so this is free.
        bidder: r.data.bidder || '',
        service: r.data.service,
        positionCount: r.data.positions?.length || 0,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
        versionNumber: r.versionNumber,
      })),
    });
  })

  .post('/', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const id = nanoid(16);
    const now = new Date();
    const data: ProjectData = {
      name: body.name || 'Neues Projekt',
      client: body.client || '',
      service: body.service || '',
      tenderNumber: body.tenderNumber || '',
      deadline: body.deadline || '',
      bidder: body.bidder || '',
      calcParams: { ...DEFAULT_CALC_PARAMS, ...(body.calcParams || {}) },
      positions: body.positions || [],
      notes: body.notes,
      angeboteFolderUrl: body.angeboteFolderUrl,
      sourceRef: body.sourceRef,
    };
    await db.insert(projects).values({
      id,
      ownerId: c.get('userId'),
      data,
      versionNumber: 1,
      createdAt: now,
      updatedAt: now,
    });
    return c.json({ id, data, versionNumber: 1, createdAt: now, updatedAt: now });
  })

  .get('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.ownerId, userId)),
    });
    if (!row) return c.json({ error: 'not_found' }, 404);

    const projectShares = await db
      .select()
      .from(shares)
      .where(eq(shares.projectId, id))
      .orderBy(desc(shares.createdAt));

    return c.json({
      id: row.id,
      data: row.data,
      versionNumber: row.versionNumber,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      shares: projectShares.map((s) => ({
        id: s.id,
        token: s.token,
        visiblePositionIds: s.visiblePositionIds,
        settings: s.settings,
        createdAt: s.createdAt,
        revokedAt: s.revokedAt,
        lastViewedAt: s.lastViewedAt,
        viewCount: s.viewCount,
        snapshotHash: s.snapshotHash,
        // Bug 2026-05-23: SnapshotDiffDialog filters candidates on
        // snapshottedAt and falls through to createdAt for the label when
        // missing. Without this we always showed createdAt; now the user
        // sees the actual snapshot timestamp.
        snapshottedAt: s.snapshotData?.snapshottedAt ?? null,
        parentShareId: s.parentShareId,
        nachtragNumber: s.nachtragNumber,
      })),
    });
  })

  // Auto-find the „04_Angebote" folder share link for a calc's Ausschreibung.
  // Resolves the upstream preisanfrage project (structured sourceRef, else the
  // `Ref:` tag in notes) and asks preisanfrage for the link it mints lazily on
  // the detail fetch. Read-only: it never writes — the caller persists the URL
  // through the normal project-save path so optimistic-locking stays intact.
  // This is an OPTIONAL enrichment, so an unresolved/down upstream returns a
  // 200 with `angeboteFolderUrl: null` + a reason, never a 5xx that would break
  // the share dialog.
  .get('/:id/angebote-link', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const refresh = c.req.query('refresh') === '1';

    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.ownerId, userId)),
    });
    if (!row) return c.json({ error: 'not_found' }, 404);
    const data = row.data;

    // Already have a usable link on the project — return it as-is unless the
    // caller forces a re-fetch.
    const existing = typeof data.angeboteFolderUrl === 'string' ? data.angeboteFolderUrl.trim() : '';
    if (!refresh && /^https?:\/\//i.test(existing)) {
      return c.json({ angeboteFolderUrl: existing, source: 'project' as const });
    }

    const ref = data.sourceRef
      ? { kind: String(data.sourceRef.kind), projectId: Number(data.sourceRef.projectId) }
      : parsePreisanfrageRef(data.notes);
    if (!ref || !Number.isInteger(ref.projectId) || ref.projectId <= 0) {
      return c.json({ angeboteFolderUrl: null, reason: 'no_source_ref' as const });
    }
    // Only managed firmas carry an Ausschreibung folder in preisanfrage; external/
    // local/directory have no positions and no Angebote folder to mint.
    if (ref.kind !== 'managed') {
      return c.json({ angeboteFolderUrl: null, reason: 'source_not_managed' as const });
    }
    if (!isPreisanfrageEnabled()) {
      return c.json({ angeboteFolderUrl: null, reason: 'integration_disabled' as const });
    }
    try {
      const { angeboteFolderShareUrl } = await getProjectPositions(ref.projectId);
      if (angeboteFolderShareUrl && /^https?:\/\//i.test(angeboteFolderShareUrl)) {
        return c.json({ angeboteFolderUrl: angeboteFolderShareUrl, source: 'preisanfrage' as const });
      }
      return c.json({ angeboteFolderUrl: null, reason: 'upstream_no_link' as const });
    } catch {
      return c.json({ angeboteFolderUrl: null, reason: 'upstream_error' as const });
    }
  })

  .put('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => null);

    // Accept legacy shape (project data at the top level) and the canonical
    // shape (wrapped in { data, bumpVersion, expectedUpdatedAt }). Probe.
    const wrappedTry = putBodySchema.safeParse(body);
    const parsed = wrappedTry.success
      ? wrappedTry
      : projectDataSchema.safeParse(body).success
        ? { success: true as const, data: { data: projectDataSchema.parse(body) } as z.infer<typeof putBodySchema> }
        : wrappedTry;

    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }

    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.ownerId, userId)),
    });
    if (!existing) return c.json({ error: 'not_found' }, 404);

    // Optimistic locking: if the client sent the updatedAt it last saw, refuse
    // to overwrite a more-recent server version (concurrent tab edit).
    const expectedTs = parsed.data.expectedUpdatedAt;
    if (typeof expectedTs === 'number') {
      const currentTs = existing.updatedAt.getTime();
      if (expectedTs !== currentTs) {
        return c.json(
          {
            error: 'version_conflict',
            currentUpdatedAt: currentTs,
            currentVersionNumber: existing.versionNumber,
          },
          409,
        );
      }
    }

    // Aufmaß formula is authoritative when present: parse it and overwrite
    // quantity so the LV total and the customer view always agree with the
    // measurement audit trail.
    const positionsWithAufmass = parsed.data.data.positions.map((p) => {
      if (!p.aufmassFormula || p.aufmassFormula.trim() === '') return p;
      const r = evaluateAufmass(p.aufmassFormula);
      if (r.hasErrors || !Number.isFinite(r.total)) return p;
      return { ...p, quantity: r.total };
    });

    // Server is the source of truth for derived EP/GP values. Recompute from
    // cost inputs before persisting so a buggy or malicious client can't pin
    // wrong totals into the DB.
    const recomputedPositions = recomputePositions(
      positionsWithAufmass,
      parsed.data.data.calcParams,
    ).map((p) => ({
      // Default-deny: internal position-types are force-hidden from customer
      // share regardless of what the client sent. Owner can still manually
      // expose by setting positionType back to "standard".
      ...p,
      visibleToCustomer: INTERNAL_POSITION_TYPES.has(
        (p.positionType ?? 'standard') as typeof POSITION_TYPES[number],
      )
        ? false
        : p.visibleToCustomer,
    }));
    const dataToStore = { ...parsed.data.data, positions: recomputedPositions };

    const bumpVersion = parsed.data.bumpVersion === true;
    const nowDate = new Date();
    await db
      .update(projects)
      .set({
        data: dataToStore,
        versionNumber: bumpVersion ? existing.versionNumber + 1 : existing.versionNumber,
        updatedAt: nowDate,
      })
      .where(eq(projects.id, id));

    return c.json({
      id: existing.id,
      data: dataToStore,
      versionNumber: bumpVersion ? existing.versionNumber + 1 : existing.versionNumber,
      updatedAt: nowDate,
    });
  })

  .delete('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.ownerId, userId)),
    });
    if (!existing) return c.json({ error: 'not_found' }, 404);
    await db.delete(projects).where(eq(projects.id, id));
    return c.json({ ok: true });
  });
