import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, projectCollaborators, shares, users, type ProjectData } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import { recomputePositions } from '../lib/snapshot.js';
import { evaluateAufmass } from '../lib/aufmass.js';
import { getProjectPositions, isPreisanfrageEnabled } from '../lib/preisanfrage.js';
import {
  resolveProjectAccess,
  heartbeat,
  leave,
  listAllPeers,
  subscribe,
  unsubscribe,
  publish,
} from '../lib/collab.js';

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

// Clamp upstream/customer-sourced position TEXT to the positionSchema caps so a
// verbose GAEB Langtext or long hierarchical OZ from the preisanfrage
// "Kalkulation starten" seed is TRUNCATED rather than hard-rejected on create
// (which would dead-end the whole seed with no way to even open the project).
// Numbers/structure stay strictly validated by the schema afterwards.
function clampPositionStrings(p: unknown): unknown {
  if (!p || typeof p !== 'object') return p;
  const o = p as Record<string, unknown>;
  const clamp = (v: unknown, n: number) =>
    typeof v === 'string' && v.length > n ? v.slice(0, n) : v;
  return {
    ...o,
    oz: clamp(o.oz, 64),
    shortText: clamp(o.shortText, 2000),
    longText: clamp(o.longText, 20000),
    hinweisText: clamp(o.hinweisText, 2000),
    unit: clamp(o.unit, 32),
    sectionPath: clamp(o.sectionPath, 256),
    internalNote: clamp(o.internalNote, 4000),
  };
}

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
  // Per-position GP override (col F) — pinned GESAMTPREIS when the component
  // rebuild deviates a lot from the Vorlage's authoritative GP.
  gpOverride: fnum().optional(),
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
    const owned = await db
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

    // Live-Zusammenarbeit: also surface calculations a coworker shared with me,
    // so they show up in my list and I can open + edit them. Joined on the
    // collaborator grants for this user.
    const shared = await db
      .select({
        id: projects.id,
        data: projects.data,
        versionNumber: projects.versionNumber,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projectCollaborators)
      .innerJoin(projects, eq(projects.id, projectCollaborators.projectId))
      .where(eq(projectCollaborators.userId, userId))
      .orderBy(desc(projects.updatedAt));

    const toSummary = (r: (typeof owned)[number], role: 'owner' | 'collaborator') => ({
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
      role,
    });

    const all = [
      ...owned.map((r) => toSummary(r, 'owner')),
      ...shared.map((r) => toSummary(r, 'collaborator')),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return c.json({ projects: all });
  })

  .post('/', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const id = nanoid(16);
    const now = new Date();
    // Merge defaults FIRST (create may send a minimal/empty body), THEN validate
    // + sanitize through the SAME schema as PUT. Previously create did zero
    // validation, so a buggy or upstream "Kalkulation starten" client could
    // persist NaN/Infinity quantities and oversized text that later froze into
    // the legally-binding customer snapshot — exactly what the hardened PUT path
    // is designed to reject. (Audit P1.)
    const merged = {
      name: body.name || 'Neues Projekt',
      client: body.client || '',
      service: body.service || '',
      tenderNumber: body.tenderNumber || '',
      deadline: body.deadline || '',
      bidder: body.bidder || '',
      calcParams: { ...DEFAULT_CALC_PARAMS, ...(body.calcParams || {}) },
      positions: (Array.isArray(body.positions) ? body.positions : []).map(clampPositionStrings),
      notes: body.notes,
      angeboteFolderUrl: body.angeboteFolderUrl,
      sourceRef: body.sourceRef,
    };
    const parsed = projectDataSchema.safeParse(merged);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    // Server is the source of truth for derived EP/GP and for the default-deny
    // on internal position types — recompute on create just like PUT does.
    const recomputedPositions = recomputePositions(
      parsed.data.positions,
      parsed.data.calcParams,
    ).map((p) => ({
      ...p,
      visibleToCustomer: INTERNAL_POSITION_TYPES.has(
        (p.positionType ?? 'standard') as typeof POSITION_TYPES[number],
      )
        ? false
        : p.visibleToCustomer,
    }));
    const data: ProjectData = { ...parsed.data, positions: recomputedPositions };
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
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const row = await db.query.projects.findFirst({ where: eq(projects.id, id) });
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
      // Live-Zusammenarbeit: tells the client whether this viewer is the owner
      // (may delete / manage collaborators) or a granted collaborator.
      role: access.isOwner ? ('owner' as const) : ('collaborator' as const),
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

    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const row = await db.query.projects.findFirst({ where: eq(projects.id, id) });
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

    // Live-Zusammenarbeit: owner OR a granted collaborator may save. Access is
    // checked first so a non-collaborator gets the same 404 as before.
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, id),
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
    const nextVersion = bumpVersion ? existing.versionNumber + 1 : existing.versionNumber;
    // Force the new updatedAt to be STRICTLY greater than the one we read, so a
    // second writer in the same millisecond can't have its WHERE
    // updatedAt = existing.updatedAt still match after we commit (which would
    // re-open the lost-update window the atomic guard below closes).
    const nowDate = new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1));
    // Make the optimistic check atomic with the write: fold the "row hasn't
    // changed since we read it" guard INTO the UPDATE's WHERE. The expectedTs
    // check above is the fast path; this closes the race where a concurrent
    // save lands between our read of `existing` and this write — two tabs both
    // passing the read-time check would otherwise both write and one edit would
    // be silently lost under a "saved" toast. (Audit P0.)
    const useOptimistic = typeof parsed.data.expectedUpdatedAt === 'number';
    // Access already verified above, so the WHERE no longer pins ownerId — a
    // granted collaborator writes the same row. The optimistic guard keeps the
    // lost-update race closed.
    const whereClause = useOptimistic
      ? and(eq(projects.id, id), eq(projects.updatedAt, existing.updatedAt))
      : eq(projects.id, id);
    const written = await db
      .update(projects)
      .set({ data: dataToStore, versionNumber: nextVersion, updatedAt: nowDate })
      .where(whereClause)
      .returning({ id: projects.id });

    if (written.length === 0) {
      // Lost the optimistic race (updatedAt moved after our read). Report the
      // conflict instead of silently dropping the edit; the client shows the
      // merge/reload banner.
      const current = await db.query.projects.findFirst({
        where: eq(projects.id, id),
      });
      if (!current) return c.json({ error: 'not_found' }, 404);
      return c.json(
        {
          error: 'version_conflict',
          currentUpdatedAt: current.updatedAt.getTime(),
          currentVersionNumber: current.versionNumber,
        },
        409,
      );
    }

    // Live push: tell every open editor of this project to pull the new version
    // now, so changes land in well under a second instead of on the next poll.
    publish(id, {
      type: 'project-updated',
      updatedAt: nowDate.getTime(),
      versionNumber: nextVersion,
    });

    return c.json({
      id: existing.id,
      data: dataToStore,
      versionNumber: nextVersion,
      updatedAt: nowDate,
    });
  })

  // SSE live-sync stream — an open editor subscribes here and receives a push
  // whenever the project is saved or the presence set changes. Kept-alive with
  // periodic pings; the client also keeps a slow poll as a fallback if the
  // stream drops. X-Accel-Buffering disables nginx proxy buffering so events
  // flush immediately.
  .get('/:id/events', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    c.header('Cache-Control', 'no-cache, no-transform');
    c.header('X-Accel-Buffering', 'no');
    return streamSSE(c, async (stream) => {
      const subId = nanoid(10);
      subscribe(id, {
        id: subId,
        userId,
        send: (data) => {
          stream.writeSSE({ data }).catch(() => {});
        },
      });
      // On disconnect: drop the subscriber AND the presence entry, then tell the
      // others so the bar clears instantly instead of waiting out the TTL.
      stream.onAbort(() => {
        unsubscribe(id, subId);
        leave(id, userId);
        publish(id, { type: 'presence', peers: listAllPeers(id) });
      });
      await stream.writeSSE({ event: 'hello', data: JSON.stringify({ ok: true }) });
      while (!stream.aborted) {
        await stream.sleep(25_000);
        if (stream.aborted) break;
        await stream.writeSSE({ event: 'ping', data: '1' }).catch(() => {});
      }
    });
  })

  // ── Live-Zusammenarbeit ──────────────────────────────────────────────────
  // Cheap change-poll: the open editor calls this every few seconds to learn if
  // a coworker saved (without re-downloading the whole LV each time). When
  // updatedAt advances past what the tab last saw, it pulls the full project.
  .get('/:id/head', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const row = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      columns: { updatedAt: true, versionNumber: true },
    });
    if (!row) return c.json({ error: 'not_found' }, 404);
    return c.json({ updatedAt: row.updatedAt.getTime(), versionNumber: row.versionNumber });
  })

  // Presence heartbeat — register that this user is viewing the project and get
  // back the other live peers. In-memory + TTL'd (see lib/collab.ts).
  .post('/:id/presence', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const body = await c.req.json().catch(() => ({}));
    const editing = (body as { editing?: unknown })?.editing === true;
    const me = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true },
    });
    const peers = heartbeat(id, { userId, name: me?.name || 'Unbekannt' }, editing);
    // Push the updated roster to the other open editors so joins + editing dots
    // appear live (each filters itself out client-side).
    publish(id, { type: 'presence', peers: listAllPeers(id) });
    return c.json({ peers });
  })

  // Explicit leave — fired on tab close / navigate away so the bar clears
  // immediately instead of waiting for the heartbeat to time out.
  .post('/:id/presence/leave', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    leave(id, userId);
    publish(id, { type: 'presence', peers: listAllPeers(id) });
    return c.json({ ok: true });
  })

  // List the people who can edit this project: the owner plus every granted
  // collaborator. Any viewer with access can read it (so the bar shows names).
  .get('/:id/collaborators', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const owner = await db.query.users.findFirst({
      where: eq(users.id, access.ownerId),
      columns: { id: true, name: true, email: true },
    });
    const collabRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        addedAt: projectCollaborators.createdAt,
      })
      .from(projectCollaborators)
      .innerJoin(users, eq(users.id, projectCollaborators.userId))
      .where(eq(projectCollaborators.projectId, id))
      .orderBy(desc(projectCollaborators.createdAt));
    return c.json({
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
      collaborators: collabRows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        addedAt: r.addedAt.getTime(),
      })),
      // Only the owner (or an admin) may add/remove collaborators.
      canManage: access.isOwner || c.get('userRole') === 'admin',
    });
  })

  // Directory of panel users this project can still be shared WITH — active
  // accounts minus the owner and anyone already added. Powers the "add member"
  // picker so the owner chooses from a list instead of typing emails. Limited to
  // someone who can manage (owner/admin) — a plain collaborator never sees the
  // full user directory.
  .get('/:id/assignable-users', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const canManage = access.isOwner || c.get('userRole') === 'admin';
    if (!canManage) return c.json({ error: 'forbidden' }, 403);
    const existing = await db
      .select({ userId: projectCollaborators.userId })
      .from(projectCollaborators)
      .where(eq(projectCollaborators.projectId, id));
    const taken = new Set<string>([access.ownerId, ...existing.map((r) => r.userId)]);
    const all = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.name);
    return c.json({ users: all.filter((u) => !taken.has(u.id)) });
  })

  // Grant edit access to another panel user (by id or email). Owner/admin only.
  .post('/:id/collaborators', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const access = await resolveProjectAccess(id, userId);
    const isAdmin = c.get('userRole') === 'admin';
    // Match the uniform 404 the rest of the file returns for non-existent OR
    // inaccessible projects, so a plain user can't probe which ids exist. Admins
    // legitimately manage projects they aren't a member of, so they're exempt.
    if (!access || (!access.canAccess && !isAdmin)) return c.json({ error: 'not_found' }, 404);
    const canManage = access.isOwner || isAdmin;
    if (!canManage) return c.json({ error: 'forbidden' }, 403);
    const body = await c.req.json().catch(() => null);
    const parsed = z
      .object({ userId: z.string().min(1).optional(), email: z.string().email().optional() })
      .safeParse(body);
    if (!parsed.success || (!parsed.data.userId && !parsed.data.email)) {
      return c.json({ error: 'invalid_input' }, 400);
    }
    const target = parsed.data.userId
      ? await db.query.users.findFirst({ where: eq(users.id, parsed.data.userId) })
      : await db.query.users.findFirst({ where: eq(users.email, parsed.data.email!.toLowerCase()) });
    if (!target) return c.json({ error: 'user_not_found' }, 404);
    if (!target.isActive) return c.json({ error: 'user_inactive' }, 400);
    if (target.id === access.ownerId) return c.json({ error: 'already_owner' }, 400);
    // Idempotent — re-inviting an existing collaborator is a no-op (UNIQUE).
    const existingGrant = await db.query.projectCollaborators.findFirst({
      where: and(
        eq(projectCollaborators.projectId, id),
        eq(projectCollaborators.userId, target.id),
      ),
    });
    if (!existingGrant) {
      await db.insert(projectCollaborators).values({
        id: nanoid(16),
        projectId: id,
        userId: target.id,
        addedBy: userId,
        createdAt: new Date(),
      });
    }
    return c.json({
      ok: true,
      collaborator: { id: target.id, name: target.name, email: target.email },
    });
  })

  // Revoke access. Owner/admin can remove anyone; a collaborator can remove
  // themselves ("Projekt verlassen").
  .delete('/:id/collaborators/:collabUserId', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const collabUserId = c.req.param('collabUserId');
    const access = await resolveProjectAccess(id, userId);
    if (!access || !access.canAccess) return c.json({ error: 'not_found' }, 404);
    const canManage = access.isOwner || c.get('userRole') === 'admin';
    if (!canManage && collabUserId !== userId) {
      return c.json({ error: 'forbidden' }, 403);
    }
    await db
      .delete(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, id),
          eq(projectCollaborators.userId, collabUserId),
        ),
      );
    leave(id, collabUserId);
    return c.json({ ok: true });
  })

  .delete('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    // Deleting a shared calc stays OWNER-ONLY — a collaborator can leave it but
    // cannot delete it out from under everyone else.
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.ownerId, userId)),
    });
    if (!existing) return c.json({ error: 'not_found' }, 404);
    await db.delete(projects).where(eq(projects.id, id));
    return c.json({ ok: true });
  });
