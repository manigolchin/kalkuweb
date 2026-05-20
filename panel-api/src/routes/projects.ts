import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, type ProjectData } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import { recomputePositions } from '../lib/snapshot.js';

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
};

const MAX_POSITIONS = 5000;

// Finite number — rejects NaN/Infinity that bleeds through from buggy clients
// and silently corrupts totals (the audit found ep=NaN was acceptable to the
// previous schema's z.array(z.any())).
const fnum = (max = 1e12) => z.number().finite().min(-max).max(max);

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
});

const projectDataSchema = z.object({
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
}) as unknown as z.ZodType<ProjectData>;

const putBodySchema = z.object({
  data: projectDataSchema as unknown as z.ZodType<ProjectData>,
  bumpVersion: z.boolean().optional(),
  expectedUpdatedAt: z.number().int().nonnegative().optional(),
});

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
      })),
    });
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

    // Server is the source of truth for derived EP/GP values. Recompute from
    // cost inputs before persisting so a buggy or malicious client can't pin
    // wrong totals into the DB.
    const recomputedPositions = recomputePositions(
      parsed.data.data.positions,
      parsed.data.data.calcParams,
    );
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
