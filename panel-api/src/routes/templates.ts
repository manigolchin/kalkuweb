import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { positionTemplates } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

const createSchema = z.object({
  oz: z.string().max(64).default(''),
  shortText: z.string().trim().min(1).max(2000),
  longText: z.string().max(20000).default(''),
  unit: z.string().max(32).default(''),
  defaultMaterialCost: z.number().finite().min(-1e8).max(1e8).default(0),
  defaultTimeMinutes: z.number().finite().min(-1e8).max(1e8).default(0),
  defaultNuCost: z.number().finite().min(-1e8).max(1e8).default(0),
});

// Cents-storage helpers (avoid float drift across the DB roundtrip).
const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

function serialize(t: typeof positionTemplates.$inferSelect) {
  return {
    id: t.id,
    oz: t.oz,
    shortText: t.shortText,
    longText: t.longText,
    unit: t.unit,
    defaultMaterialCost: fromCents(t.defaultMaterialCost),
    defaultTimeMinutes: t.defaultTimeMinutes,
    defaultNuCost: fromCents(t.defaultNuCost),
    useCount: t.useCount,
    lastUsedAt: t.lastUsedAt,
    createdAt: t.createdAt,
  };
}

export const templatesRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/templates', requireAuth, async (c) => {
    const userId = c.get('userId');
    const rows = await db
      .select()
      .from(positionTemplates)
      .where(eq(positionTemplates.userId, userId))
      .orderBy(desc(positionTemplates.useCount), desc(positionTemplates.lastUsedAt));
    return c.json({ templates: rows.map(serialize) });
  })

  .post('/templates', requireAuth, async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    const id = nanoid(16);
    const now = new Date();
    await db.insert(positionTemplates).values({
      id,
      userId,
      oz: parsed.data.oz,
      shortText: parsed.data.shortText,
      longText: parsed.data.longText,
      unit: parsed.data.unit,
      defaultMaterialCost: toCents(parsed.data.defaultMaterialCost),
      defaultTimeMinutes: Math.round(parsed.data.defaultTimeMinutes),
      defaultNuCost: toCents(parsed.data.defaultNuCost),
      useCount: 0,
      createdAt: now,
    });
    const inserted = await db.query.positionTemplates.findFirst({ where: eq(positionTemplates.id, id) });
    return c.json(serialize(inserted!));
  })

  /** Bump the use_count + last_used_at when the owner inserts this template
   *  into a project. Drives the picker's "most useful first" ordering. */
  .post('/templates/:id/use', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const t = await db.query.positionTemplates.findFirst({
      where: and(eq(positionTemplates.id, id), eq(positionTemplates.userId, userId)),
    });
    if (!t) return c.json({ error: 'not_found' }, 404);
    await db
      .update(positionTemplates)
      .set({ useCount: sql`use_count + 1`, lastUsedAt: new Date() })
      .where(eq(positionTemplates.id, id));
    return c.json({ ok: true });
  })

  .delete('/templates/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const t = await db.query.positionTemplates.findFirst({
      where: and(eq(positionTemplates.id, id), eq(positionTemplates.userId, userId)),
    });
    if (!t) return c.json({ error: 'not_found' }, 404);
    await db.delete(positionTemplates).where(eq(positionTemplates.id, id));
    return c.json({ ok: true });
  });
