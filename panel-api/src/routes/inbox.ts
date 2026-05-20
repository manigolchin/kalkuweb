import { Hono } from 'hono';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { projects, shares, shareResponses } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

/**
 * Aggregate inbox endpoint. Replaces the FeedbackInbox N+1 (1 list + N project
 * fetches + ΣM response fetches). Single SQL roundtrip per table.
 */
export const inboxRoute = new Hono<{ Variables: AuthVariables }>().get(
  '/inbox',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');

    const ownerProjects = await db
      .select({
        id: projects.id,
        data: projects.data,
        versionNumber: projects.versionNumber,
        updatedAt: projects.updatedAt,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.updatedAt));

    if (ownerProjects.length === 0) {
      return c.json({ entries: [], generatedAt: new Date().toISOString() });
    }

    const projectIds = ownerProjects.map((p) => p.id);

    const allShares = await db
      .select()
      .from(shares)
      .where(inArray(shares.projectId, projectIds))
      .orderBy(desc(shares.createdAt));

    const shareIds = allShares.map((s) => s.id);
    const allResponses =
      shareIds.length > 0
        ? await db
            .select({
              id: shareResponses.id,
              shareId: shareResponses.shareId,
              responseType: shareResponses.responseType,
              customerName: shareResponses.customerName,
              customerEmail: shareResponses.customerEmail,
              ip: shareResponses.ip,
              payload: shareResponses.payload,
              respondedAt: shareResponses.respondedAt,
            })
            .from(shareResponses)
            .where(inArray(shareResponses.shareId, shareIds))
            .orderBy(desc(shareResponses.respondedAt))
        : [];

    const responsesByShare = new Map<string, typeof allResponses>();
    for (const r of allResponses) {
      const arr = responsesByShare.get(r.shareId) || [];
      arr.push(r);
      responsesByShare.set(r.shareId, arr);
    }

    const projectById = new Map(ownerProjects.map((p) => [p.id, p]));

    const entries = allShares
      .filter((s) => !s.revokedAt) // active only
      .map((s) => {
        const proj = projectById.get(s.projectId);
        const responses = responsesByShare.get(s.id) || [];
        return {
          project: proj
            ? {
                id: proj.id,
                name: proj.data?.name || '',
                client: proj.data?.client || '',
                service: proj.data?.service || '',
                versionNumber: proj.versionNumber,
                updatedAt: proj.updatedAt,
              }
            : null,
          share: {
            id: s.id,
            token: s.token,
            visiblePositionIds: s.visiblePositionIds,
            settings: s.settings,
            createdAt: s.createdAt,
            lastViewedAt: s.lastViewedAt,
            viewCount: s.viewCount,
            snapshotHash: s.snapshotHash,
          },
          responses,
        };
      })
      // Sort: most-recent activity first, then never-responded with views, then nothing
      .sort((a, b) => {
        const aT = a.responses[0]?.respondedAt?.getTime() ?? a.share.lastViewedAt?.getTime() ?? a.share.createdAt.getTime();
        const bT = b.responses[0]?.respondedAt?.getTime() ?? b.share.lastViewedAt?.getTime() ?? b.share.createdAt.getTime();
        return bT - aT;
      })
      .filter((e) => e.responses.length > 0 || e.share.viewCount > 0);

    return c.json({ entries, generatedAt: new Date().toISOString() });
  },
);
