import { Hono } from 'hono';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { projects, shares, shareResponses, positionComments, changeRequests, users } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

/**
 * Aggregate inbox endpoint — the data behind the Kunden-Feedback tab.
 *
 * One SQL roundtrip per table (projects → shares → responses + comments +
 * change-requests), then assembled in memory. Each entry is one active share
 * with activity (a response, a per-position comment, a structured change
 * request, or at least one view).
 *
 * Enrichment for the feedback redesign:
 *  - project.bidder  → WHICH COMPANY (Firma) the offer belongs to.
 *  - changes[].oz / .shortText → WHICH PART a free-text change is about,
 *    resolved from the share's frozen snapshot.
 *  - comments[] → per-position free-text comments (positionComments table).
 *  - changeRequests[] → Round 12 STRUCTURED Änderungswünsche (current→requested
 *    value diffs), per-position OR global, resolved the same way.
 *  - viewerLastSeenAt → the owner's lastFeedbackViewedAt for the "neu" badge.
 */
export const inboxRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/inbox', requireAuth, async (c) => {
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

    const allChangeRequests =
      shareIds.length > 0
        ? await db
            .select()
            .from(changeRequests)
            .where(inArray(changeRequests.shareId, shareIds))
            .orderBy(desc(changeRequests.createdAt))
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
    const changeReqByShare = new Map<string, typeof allChangeRequests>();
    for (const cr of allChangeRequests) {
      const arr = changeReqByShare.get(cr.shareId) || [];
      arr.push(cr);
      changeReqByShare.set(cr.shareId, arr);
    }

    const projectById = new Map(ownerProjects.map((p) => [p.id, p]));

    const entries = allShares
      .filter((s) => !s.revokedAt) // active only
      .map((s) => {
        const proj = projectById.get(s.projectId);
        const responses = responsesByShare.get(s.id) || [];
        const rawComments = commentsByShare.get(s.id) || [];
        const rawChangeReqs = changeReqByShare.get(s.id) || [];

        // Resolve a position's id/oz to its OZ + short text via the frozen
        // share snapshot, so the tab shows WHICH PART the feedback is about.
        const snapPositions = s.snapshotData?.positions ?? [];
        const byId = new Map(snapPositions.map((p) => [p.id, p]));
        const byOz = new Map(snapPositions.map((p) => [p.oz, p]));

        // Enrich each free-text change request with the resolved oz + short text.
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

        // Round 12 — structured change requests, with the position's Kurztext
        // resolved (null for global-scope wishes).
        const changeRequestsOut = rawChangeReqs.map((cr) => {
          const pos = cr.positionOz ? byOz.get(cr.positionOz) : undefined;
          return {
            id: cr.id,
            scope: cr.scope,
            positionOz: cr.positionOz,
            shortText: pos?.shortText ?? null,
            field: cr.field,
            unit: cr.unit,
            currentValue: cr.currentValue,
            requestedValue: cr.requestedValue,
            direction: cr.direction,
            note: cr.note,
            authorName: cr.authorName,
            createdAt: cr.createdAt,
            resolvedAt: cr.resolvedAt,
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
          changeRequests: changeRequestsOut,
        };
      })
      // Sort by most-recent activity (response, comment, change request, view, or creation).
      .sort((a, b) => {
        const act = (e: typeof a) =>
          Math.max(
            e.responses[0]?.respondedAt?.getTime() ?? 0,
            e.comments[0]?.createdAt?.getTime() ?? 0,
            e.changeRequests[0]?.createdAt?.getTime() ?? 0,
            e.share.lastViewedAt?.getTime() ?? 0,
            e.share.createdAt.getTime(),
          );
        return act(b) - act(a);
      })
      .filter(
        (e) =>
          e.responses.length > 0 ||
          e.comments.length > 0 ||
          e.changeRequests.length > 0 ||
          e.share.viewCount > 0,
      );

    return c.json({ entries, generatedAt: new Date().toISOString(), viewerLastSeenAt });
  })

  /**
   * Round 12: mark a structured change request resolved / re-open it. Body
   * `{ resolved?: boolean }` (default true). Owner-only — verified by walking
   * change request → share → project.ownerId.
   */
  .post('/inbox/change-requests/:id/resolve', requireAuth, async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as { resolved?: boolean };
    const resolved = body?.resolved !== false; // default: mark resolved

    const cr = await db.query.changeRequests.findFirst({ where: eq(changeRequests.id, id) });
    if (!cr) return c.json({ error: 'not_found' }, 404);
    const share = await db.query.shares.findFirst({ where: eq(shares.id, cr.shareId) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    const project = await db.query.projects.findFirst({ where: eq(projects.id, share.projectId) });
    if (!project || project.ownerId !== userId) return c.json({ error: 'forbidden' }, 403);

    const now = new Date();
    await db
      .update(changeRequests)
      .set({ resolvedAt: resolved ? now : null })
      .where(eq(changeRequests.id, id));

    return c.json({ ok: true, id, resolvedAt: resolved ? now.toISOString() : null });
  });
