import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, shareResponses, users, type Position } from '../schema.js';
import { clientIp } from '../lib/middleware.js';

const approveSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  message: z.string().optional(),
});

const changesSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  message: z.string().optional(),
  changes: z.array(
    z.object({
      positionId: z.string(),
      type: z.enum(['modify', 'remove', 'comment']),
      text: z.string(),
    }),
  ).min(1),
});

export const publicRoute = new Hono()
  .get('/share/:token', async (c) => {
    const token = c.req.param('token');
    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);

    const project = await db.query.projects.findFirst({ where: eq(projects.id, share.projectId) });
    if (!project) return c.json({ error: 'not_found' }, 404);

    const owner = await db.query.users.findFirst({ where: eq(users.id, project.ownerId) });

    await db
      .update(shares)
      .set({
        viewCount: (share.viewCount || 0) + 1,
        lastViewedAt: new Date(),
      })
      .where(eq(shares.id, share.id));

    const visibleIds = new Set(share.visiblePositionIds);
    const allPositions = (project.data.positions || []) as Position[];
    const filteredPositions = allPositions
      .filter((p) => visibleIds.has(p.id))
      .map((p) => ({
        id: p.id,
        oz: p.oz,
        shortText: p.shortText,
        longText: p.longText,
        quantity: p.quantity,
        unit: p.unit,
        isHeader: p.isHeader,
        sortOrder: p.sortOrder,
        ep: p.ep,
        gp: p.gp,
      }));

    return c.json({
      shareId: share.id,
      token: share.token,
      settings: share.settings,
      project: {
        name: project.data.name,
        client: project.data.client,
        service: project.data.service,
        tenderNumber: project.data.tenderNumber,
        deadline: project.data.deadline,
        versionNumber: project.versionNumber,
        notes: project.data.notes,
        mwst: project.data.calcParams.mwst,
      },
      owner: {
        name: owner?.name || '',
        companyName: owner?.companyName || '',
        companyLogoUrl: owner?.companyLogoUrl || '',
        email: owner?.email || '',
      },
      positions: filteredPositions,
    });
  })

  .post('/share/:token/approve', async (c) => {
    const token = c.req.param('token');
    const body = await c.req.json().catch(() => null);
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);

    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);
    if (!share.settings.allowApproval) return c.json({ error: 'not_allowed' }, 403);

    const now = new Date();
    await db.insert(shareResponses).values({
      id: nanoid(16),
      shareId: share.id,
      responseType: 'approve',
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      ip: clientIp(c),
      userAgent: c.req.header('user-agent') || null,
      payload: {
        message: parsed.data.message,
        signature: {
          name: parsed.data.customerName,
          timestamp: now.getTime(),
          ip: clientIp(c),
        },
      },
      respondedAt: now,
    });
    return c.json({ ok: true, respondedAt: now });
  })

  .post('/share/:token/changes', async (c) => {
    const token = c.req.param('token');
    const body = await c.req.json().catch(() => null);
    const parsed = changesSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);

    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);
    if (!share.settings.allowChangeRequests) return c.json({ error: 'not_allowed' }, 403);

    const now = new Date();
    await db.insert(shareResponses).values({
      id: nanoid(16),
      shareId: share.id,
      responseType: 'changes',
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      ip: clientIp(c),
      userAgent: c.req.header('user-agent') || null,
      payload: {
        message: parsed.data.message,
        changes: parsed.data.changes,
      },
      respondedAt: now,
    });
    return c.json({ ok: true, respondedAt: now });
  });
