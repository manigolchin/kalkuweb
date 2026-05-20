import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, shareResponses } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

const createShareSchema = z.object({
  visiblePositionIds: z.array(z.string()),
  settings: z.object({
    brandHeader: z.enum(['own', 'co-branded', 'minimal']).default('co-branded'),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    message: z.string().optional(),
    allowApproval: z.boolean().default(true),
    allowChangeRequests: z.boolean().default(true),
    showTotals: z.boolean().default(true),
    showMwst: z.boolean().default(true),
  }),
});

export const sharesRoute = new Hono<{ Variables: AuthVariables }>()
  .post('/projects/:id/shares', requireAuth, async (c) => {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => null);
    const parsed = createShareSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);

    const id = nanoid(16);
    const token = nanoid(32);
    const now = new Date();
    await db.insert(shares).values({
      id,
      projectId,
      token,
      visiblePositionIds: parsed.data.visiblePositionIds,
      settings: parsed.data.settings,
      createdAt: now,
      viewCount: 0,
    });
    return c.json({
      id,
      token,
      projectId,
      visiblePositionIds: parsed.data.visiblePositionIds,
      settings: parsed.data.settings,
      createdAt: now,
      revokedAt: null,
      lastViewedAt: null,
      viewCount: 0,
    });
  })

  .get('/projects/:id/shares', requireAuth, async (c) => {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);
    const rows = await db
      .select()
      .from(shares)
      .where(eq(shares.projectId, projectId))
      .orderBy(desc(shares.createdAt));
    return c.json({ shares: rows });
  })

  .delete('/shares/:shareId', requireAuth, async (c) => {
    const shareId = c.req.param('shareId');
    const userId = c.get('userId');
    const share = await db.query.shares.findFirst({ where: eq(shares.id, shareId) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, share.projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);
    await db
      .update(shares)
      .set({ revokedAt: new Date() })
      .where(eq(shares.id, shareId));
    return c.json({ ok: true });
  })

  .get('/shares/:shareId/responses', requireAuth, async (c) => {
    const shareId = c.req.param('shareId');
    const userId = c.get('userId');
    const share = await db.query.shares.findFirst({ where: eq(shares.id, shareId) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, share.projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);
    const rows = await db
      .select()
      .from(shareResponses)
      .where(eq(shareResponses.shareId, shareId))
      .orderBy(desc(shareResponses.respondedAt));
    return c.json({ responses: rows });
  });
