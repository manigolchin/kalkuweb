import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, shareResponses, users } from '../schema.js';
import { clientIp } from '../lib/middleware.js';
import { buildLegacySnapshot, snapshotHash } from '../lib/snapshot.js';
import { recordAuditEvent } from '../lib/audit.js';

const approveSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().email().max(200).optional(),
  message: z.string().max(4000).optional(),
});

const changesSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().email().max(200).optional(),
  message: z.string().max(4000).optional(),
  changes: z
    .array(
      z.object({
        positionId: z.string().max(64),
        type: z.enum(['modify', 'remove', 'comment']),
        text: z.string().max(2000),
      }),
    )
    .min(1)
    .max(100),
});

export const publicRoute = new Hono()
  .get('/share/:token', async (c) => {
    const token = c.req.param('token');
    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);

    const project = await db.query.projects.findFirst({ where: eq(projects.id, share.projectId) });
    if (!project) return c.json({ error: 'not_found' }, 404);

    // Lazy snapshot for legacy share rows that predate the snapshot column.
    // New shares always have snapshotData populated at creation.
    let snapshot = share.snapshotData;
    if (!snapshot) {
      snapshot = buildLegacySnapshot(
        { data: project.data, versionNumber: project.versionNumber },
        share.visiblePositionIds,
      );
      const hash = snapshotHash(snapshot);
      await db
        .update(shares)
        .set({ snapshotData: snapshot, snapshotHash: hash })
        .where(eq(shares.id, share.id));
      share.snapshotHash = hash;
      console.warn(`[share] backfilled snapshot for legacy share ${share.id}`);
    }

    const owner = await db.query.users.findFirst({ where: eq(users.id, project.ownerId) });

    const isFirstView = !share.lastViewedAt;
    await db
      .update(shares)
      .set({
        viewCount: (share.viewCount || 0) + 1,
        lastViewedAt: new Date(),
      })
      .where(eq(shares.id, share.id));

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'link.viewed',
      actorKind: 'customer',
      actorRef: null,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        isFirstView,
        viewCount: (share.viewCount || 0) + 1,
      },
    });

    return c.json({
      shareId: share.id,
      token: share.token,
      settings: share.settings,
      snapshotHash: share.snapshotHash,
      snapshottedAt: snapshot.snapshottedAt,
      project: {
        ...snapshot.project,
        versionNumber: snapshot.projectVersionNumber,
      },
      owner: {
        name: owner?.name || '',
        companyName: owner?.companyName || '',
        companyLogoUrl: owner?.companyLogoUrl || '',
        companyPhone: owner?.companyPhone || '',
        // Public contact email — explicitly different from login email
        // (which stays private; see P0-2).
        contactEmail: owner?.companyContactEmail || '',
      },
      positions: snapshot.positions,
      createdAt: share.createdAt,
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
    const responseId = nanoid(16);
    await db.insert(shareResponses).values({
      id: responseId,
      shareId: share.id,
      responseType: 'approve',
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        message: parsed.data.message,
        signature: {
          name: parsed.data.customerName,
          timestamp: now.getTime(),
          ip: clientIp(c),
        },
        snapshotHash: share.snapshotHash || undefined,
      },
      respondedAt: now,
    });

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'response.submitted',
      actorKind: 'customer',
      actorRef: parsed.data.customerEmail || parsed.data.customerName,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        responseId,
        responseType: 'approve',
        snapshotHash: share.snapshotHash,
        customerName: parsed.data.customerName,
      },
    });

    return c.json({ ok: true, respondedAt: now, snapshotHash: share.snapshotHash });
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
    const responseId = nanoid(16);
    await db.insert(shareResponses).values({
      id: responseId,
      shareId: share.id,
      responseType: 'changes',
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        message: parsed.data.message,
        changes: parsed.data.changes,
        snapshotHash: share.snapshotHash || undefined,
      },
      respondedAt: now,
    });

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'response.submitted',
      actorKind: 'customer',
      actorRef: parsed.data.customerEmail || parsed.data.customerName,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        responseId,
        responseType: 'changes',
        changesCount: parsed.data.changes.length,
        snapshotHash: share.snapshotHash,
        customerName: parsed.data.customerName,
      },
    });

    return c.json({ ok: true, respondedAt: now, snapshotHash: share.snapshotHash });
  });
