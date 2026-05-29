import { Hono } from 'hono';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, viewPresets } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

const createPresetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  visiblePositionIds: z.array(z.string().max(64)).max(1000),
  settings: z.object({
    brandHeader: z.enum(['own', 'co-branded', 'minimal']).optional(),
    allowApproval: z.boolean().optional(),
    allowChangeRequests: z.boolean().optional(),
    showTotals: z.boolean().optional(),
    showMwst: z.boolean().optional(),
    showLongText: z.boolean().optional(),
    bindefristDays: z.number().int().min(1).max(365).optional(),
    message: z.string().max(2000).optional(),
  }).default({}),
});

export const presetsRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/projects/:id/presets', requireAuth, async (c) => {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);
    const rows = await db
      .select()
      .from(viewPresets)
      .where(eq(viewPresets.projectId, projectId))
      .orderBy(asc(viewPresets.createdAt));
    return c.json({ presets: rows });
  })

  .post('/projects/:id/presets', requireAuth, async (c) => {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);

    const body = await c.req.json().catch(() => null);
    const parsed = createPresetSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const id = nanoid(16);
    const now = new Date();
    await db.insert(viewPresets).values({
      id,
      projectId,
      name: parsed.data.name,
      visiblePositionIds: parsed.data.visiblePositionIds,
      settings: parsed.data.settings,
      createdAt: now,
    });
    return c.json({
      id,
      projectId,
      name: parsed.data.name,
      visiblePositionIds: parsed.data.visiblePositionIds,
      settings: parsed.data.settings,
      createdAt: now,
    });
  })

  .delete('/presets/:presetId', requireAuth, async (c) => {
    const presetId = c.req.param('presetId');
    const userId = c.get('userId');
    const preset = await db.query.viewPresets.findFirst({ where: eq(viewPresets.id, presetId) });
    if (!preset) return c.json({ error: 'not_found' }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, preset.projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);
    await db.delete(viewPresets).where(eq(viewPresets.id, presetId));
    return c.json({ ok: true });
  });
