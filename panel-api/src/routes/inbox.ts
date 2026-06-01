import { Hono } from 'hono';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { projects, shares, shareResponses, positionComments, users } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

/**
 * Aggregate inbox endpoint — the data behind the Kunden-Feedback tab.
 *
 * One SQL roundtrip per table (projects → shares → responses + comments),
 * then assembled in memory. Each entry is one active share with activity
 * (a response, a per-position comment, or at least one view).
 *
 * Enrichment for the feedback redesign:
 *  - project.bidder  → WHICH COMPANY (Firma) the offer belongs to, shown
 *    prominently in the tab. (project.client stays = the Auftraggeber.)
 *  - changes[].oz / .shortText → WHICH PART the customer wants changed,
 *    resolved from the share's frozen snapshot so the tab shows the position
 *    OZ + short text instead of an opaque id.
 *  - comments[] → per-position comments (positionComments table), resolved
 *    the same way. Previously these never surfaced in the inbox at all.
 *  - viewerLastSeenAt → the owner's lastFeedbackViewedAt, so the UI can mark
 *    activity that arrived since the tab was last opened as "neu".
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

    const viewer = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const viewerLastSeenAt = viewer?.lastFeedbackViewedAt
      ? viewer.lastFeedbackViewedAt.toISOString()
      : null;

    if (ownerProjects.length === 0) {
      return c.json({ entries: [], generatedAt: new Date().toISOString(), viewerLastSeenAt });
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

    const allComments =
      shareIds.length > 0
        ? await db
            .select({
              id: positionComments.id,
              shareId: positionComments.shareId,
              positionOz: positionComments.positionOz,
              intent: positionComments.intent,
              text: positionComments.text,
              authorName: positionComments.authorName,
              createdAt: positionComments.createdAt,
              resolvedAt: positionComments.resolvedAt,
            })
            .from(positionComments)
            .where(inArray(positionComments.shareId, shareIds))
            .orderBy(desc(positionComments.createdAt))
        : [];

    const responsesByShare = new Map<string, typeof allResponses>();
    for (const r of allResponses) {
      const arr = responsesByShare.get(r.shareId) || [];
      arr.push(r);
      responsesByShare.set(r.shareId, arr);
    }
    const commentsByShare = new Map<string, typeof allComments>();
    for (const cm of allComments) {
      const arr = commentsByShare.get(cm.shareId) || [];
      arr.push(cm);
      commentsByShare.set(cm.shareId, arr);
    }

    const projectById = new Map(ownerProjects.map((p) => [p.id, p]));

    const entries = allShares
      .filter((s) => !s.revokedAt) // active only
      .map((s) => {
        const proj = projectById.get(s.projectId);
        const responses = responsesByShare.get(s.id) || [];
        const rawComments = commentsByShare.get(s.id) || [];

        // Resolve a position's id/oz to its OZ + short text via the frozen
        // share snapshot, so the tab shows WHICH PART the feedback is about.
        const snapPositions = s.snapshotData?.positions ?? [];
        const byId = new Map(snapPositions.map((p) => [p.id, p]));
        const byOz = new Map(snapPositions.map((p) => [p.oz, p]));

        // Enrich each change request with the resolved oz + short text.
        const enrichedResponses = responses.map((r) => {
          const changes = r.payload?.changes;
          if (!Array.isArray(changes) || changes.length === 0) return r;
          return {
            ...r,
            payload: {
              ...r.payload,
              changes: changes.map((ch) => {
                const pos = byId.get(ch.positionId);
                return pos ? { ...ch, oz: pos.oz, shortText: pos.shortText } : ch;
              }),
            },
          };
        });

        const comments = rawComments.map((cm) => {
          const pos = byOz.get(cm.positionOz);
          return {
            id: cm.id,
            positionOz: cm.positionOz,
            shortText: pos?.shortText ?? null,
            intent: cm.intent,
            text: cm.text,
            authorName: cm.authorName,
            createdAt: cm.createdAt,
            resolvedAt: cm.resolvedAt,
          };
        });

        return {
          project: proj
            ? {
                id: proj.id,
                name: proj.data?.name || '',
                client: proj.data?.client || '',
                bidder: proj.data?.bidder || '',
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
          responses: enrichedResponses,
          comments,
        };
      })
      // Sort by most-recent activity (response, comment, view, or creation).
      .sort((a, b) => {
        const act = (e: typeof a) =>
          Math.max(
            e.responses[0]?.respondedAt?.getTime() ?? 0,
            e.comments[0]?.createdAt?.getTime() ?? 0,
            e.share.lastViewedAt?.getTime() ?? 0,
            e.share.createdAt.getTime(),
          );
        return act(b) - act(a);
      })
      .filter((e) => e.responses.length > 0 || e.comments.length > 0 || e.share.viewCount > 0);

    return c.json({ entries, generatedAt: new Date().toISOString(), viewerLastSeenAt });
  },
);
