import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, shareResponses } from '../schema.js';
import { requireAuth, clientIp, type AuthVariables } from '../lib/middleware.js';
import { buildShareSnapshot, snapshotHash, diffSnapshots } from '../lib/snapshot.js';
import { recordAuditEvent } from '../lib/audit.js';

const createShareSchema = z.object({
  visiblePositionIds: z.array(z.string()).max(1000),
  settings: z.object({
    brandHeader: z.enum(['own', 'co-branded', 'minimal']).default('co-branded'),
    customerName: z.string().max(200).optional(),
    customerEmail: z.string().max(200).optional(),
    message: z.string().max(2000).optional(),
    allowApproval: z.boolean().default(true),
    allowChangeRequests: z.boolean().default(true),
    showTotals: z.boolean().default(true),
    showMwst: z.boolean().default(true),
    bindefristDays: z.number().int().min(1).max(365).optional(),
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

    // Freeze the customer-visible content at share-creation time so the owner
    // editing the project later does NOT change what the customer sees or
    // approves. The snapshot is the legal source of truth for the share.
    const snapshot = buildShareSnapshot(
      {
        name: project.data.name,
        client: project.data.client,
        service: project.data.service,
        tenderNumber: project.data.tenderNumber,
        deadline: project.data.deadline,
        notes: project.data.notes,
        calcParams: project.data.calcParams,
      },
      project.data.positions || [],
      parsed.data.visiblePositionIds,
      project.versionNumber,
    );
    const hash = snapshotHash(snapshot);

    await db.insert(shares).values({
      id,
      projectId,
      token,
      visiblePositionIds: parsed.data.visiblePositionIds,
      settings: parsed.data.settings,
      snapshotData: snapshot,
      snapshotHash: hash,
      snapshotVersion: 1,
      createdAt: now,
      viewCount: 0,
    });

    await recordAuditEvent({
      shareId: id,
      projectId,
      eventType: 'share.created',
      actorKind: 'owner',
      actorRef: c.get('userEmail'),
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        positionCount: parsed.data.visiblePositionIds.length,
        snapshotHash: hash,
        projectVersionNumber: project.versionNumber,
      },
    });

    return c.json({
      id,
      token,
      projectId,
      visiblePositionIds: parsed.data.visiblePositionIds,
      settings: parsed.data.settings,
      snapshotHash: hash,
      snapshottedAt: snapshot.snapshottedAt,
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
    const revokedAt = new Date();
    await db
      .update(shares)
      .set({ revokedAt })
      .where(eq(shares.id, shareId));

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'share.revoked',
      actorKind: 'owner',
      actorRef: c.get('userEmail'),
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: { revokedAt: revokedAt.getTime() },
    });

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
  })

  /** Preview the diff that re-snapshotting would produce — no DB writes. */
  .get('/shares/:shareId/resnapshot-preview', requireAuth, async (c) => {
    const shareId = c.req.param('shareId');
    const userId = c.get('userId');
    const share = await db.query.shares.findFirst({ where: eq(shares.id, shareId) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, share.projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);
    if (!share.snapshotData) return c.json({ error: 'no_prior_snapshot' }, 409);

    const proposed = buildShareSnapshot(
      {
        name: project.data.name,
        client: project.data.client,
        service: project.data.service,
        tenderNumber: project.data.tenderNumber,
        deadline: project.data.deadline,
        notes: project.data.notes,
        calcParams: project.data.calcParams,
      },
      project.data.positions || [],
      share.visiblePositionIds,
      project.versionNumber,
    );
    const diff = diffSnapshots(share.snapshotData, proposed);
    return c.json({
      currentVersion: share.snapshotVersion,
      proposedVersion: share.snapshotVersion + 1,
      currentHash: share.snapshotHash,
      proposedHash: snapshotHash(proposed),
      diff,
    });
  })

  /** Replace the share's frozen snapshot with the current project state.
   *  Bumps snapshot_version and logs `snapshot.regenerated` with the previous
   *  snapshot embedded in the audit-event payload. */
  .post('/shares/:shareId/resnapshot', requireAuth, async (c) => {
    const shareId = c.req.param('shareId');
    const userId = c.get('userId');
    const share = await db.query.shares.findFirst({ where: eq(shares.id, shareId) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, share.projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);

    const newSnapshot = buildShareSnapshot(
      {
        name: project.data.name,
        client: project.data.client,
        service: project.data.service,
        tenderNumber: project.data.tenderNumber,
        deadline: project.data.deadline,
        notes: project.data.notes,
        calcParams: project.data.calcParams,
      },
      project.data.positions || [],
      share.visiblePositionIds,
      project.versionNumber,
    );
    const newHash = snapshotHash(newSnapshot);
    const prevHash = share.snapshotHash;
    const prevVersion = share.snapshotVersion;
    const prevSnapshot = share.snapshotData;
    const newVersion = prevVersion + 1;

    await db
      .update(shares)
      .set({
        snapshotData: newSnapshot,
        snapshotHash: newHash,
        snapshotVersion: newVersion,
      })
      .where(eq(shares.id, shareId));

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'snapshot.regenerated',
      actorKind: 'owner',
      actorRef: c.get('userEmail'),
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        prevSnapshotHash: prevHash,
        newSnapshotHash: newHash,
        prevVersion,
        newVersion,
        // Persist the OLD snapshot inside the audit chain so future disputes
        // can prove which version the customer saw before re-share.
        prevSnapshot,
      },
    });

    return c.json({
      ok: true,
      snapshotVersion: newVersion,
      snapshotHash: newHash,
    });
  });
