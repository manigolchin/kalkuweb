import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, type ProjectData } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

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

const projectDataSchema: z.ZodType<ProjectData> = z.object({
  name: z.string(),
  client: z.string(),
  clientEmail: z.string().optional(),
  clientAddress: z.string().optional(),
  service: z.string(),
  tenderNumber: z.string(),
  deadline: z.string(),
  bidder: z.string(),
  calcParams: z.object({
    mittellohn: z.number(),
    verrechnungslohn: z.number(),
    materialZuschlag: z.number(),
    nuZuschlag: z.number(),
    geraeteZuschlagPct: z.number(),
    geraeteStundensatz: z.number(),
    zeitabzug: z.number(),
    tagesstunden: z.number(),
    personaleinsatz: z.number(),
    mwst: z.number(),
  }),
  positions: z.array(z.any()),
  notes: z.string().optional(),
}) as z.ZodType<ProjectData>;

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
      })),
    });
  })

  .put('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => null);
    const parsed = projectDataSchema.safeParse(body?.data ?? body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.ownerId, userId)),
    });
    if (!existing) return c.json({ error: 'not_found' }, 404);

    const bumpVersion = body?.bumpVersion === true;
    await db
      .update(projects)
      .set({
        data: parsed.data,
        versionNumber: bumpVersion ? existing.versionNumber + 1 : existing.versionNumber,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    const updated = await db.query.projects.findFirst({ where: eq(projects.id, id) });
    return c.json({
      id: updated!.id,
      data: updated!.data,
      versionNumber: updated!.versionNumber,
      updatedAt: updated!.updatedAt,
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
