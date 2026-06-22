import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hash as argon2Hash } from '@node-rs/argon2';
// `@node-rs/argon2` exports `Algorithm` as a `const enum`, which TS rejects
// under `isolatedModules`. The numeric literal here equals `Algorithm.Argon2id`
// per the lib's public types (Argon2d=0, Argon2i=1, Argon2id=2).
const ARGON2_ID = 2 as const;
import { db } from '../db.js';
import { projects, shares, shareResponses, positionComments } from '../schema.js';
import { requireAuth, clientIp, type AuthVariables } from '../lib/middleware.js';
import { buildShareSnapshot, snapshotHash, diffSnapshots } from '../lib/snapshot.js';
import { recordAuditEvent } from '../lib/audit.js';

const createShareSchema = z.object({
  visiblePositionIds: z.array(z.string()).max(1000),
  parentShareId: z.string().max(64).optional(),
  settings: z.object({
    brandHeader: z.enum(['own', 'co-branded', 'minimal']).default('co-branded'),
    customerName: z.string().max(200).optional(),
    customerEmail: z.string().max(200).optional(),
    message: z.string().max(2000).optional(),
    allowApproval: z.boolean().default(true),
    allowChangeRequests: z.boolean().default(true),
    showTotals: z.boolean().default(true),
    showMwst: z.boolean().default(true),
    // Detail level: true (default) = full Langtext per position, false = short
    // version. Must be listed here or z.object() strips it from the stored JSON.
    showLongText: z.boolean().default(true),
    // Per-position Material/Gerät/Zeit split + VERKAUF composition in the summary.
    showCostBreakdown: z.boolean().default(true),
    // EINKAUF / Zuschlag / Überschuss + KPIs in the summary. Off = Kurzfassung.
    showCalculation: z.boolean().default(true),
    // Customer-view button to the „04_Angebote" folder + the frozen link it
    // opens. The URL is constrained to http(s) HERE so a javascript:/data: URL
    // can never be persisted and later rendered as a button href in the
    // customer view (the public route also re-checks before exposing it).
    showAngebote: z.boolean().optional(),
    // The share dialog ALWAYS sends this field, using '' when the project has
    // no „04_Angebote"-Ordner link. An empty string is not a valid URL, so a
    // bare `.url()` would 400 the entire share-creation request for every
    // project without a folder link. Coerce empty/whitespace → undefined
    // ("unset") FIRST, then validate any real value as an http(s) URL — so a
    // javascript:/data: URL still can never be persisted.
    angeboteFolderUrl: z
      .preprocess(
        (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
        z
          .string()
          .max(1000)
          .url()
          .refine((u) => /^https?:\/\//i.test(u), { message: 'must be http(s)' })
          .optional(),
      )
      .optional(),
    bindefristDays: z.number().int().min(1).max(365).optional(),
    /** PART J: optional gate password. Plaintext over TLS, server hashes
     *  with bcrypt cost 12. Never returned to the client.
     *  Range: 4..200 — keeps it usable as a one-time code, prevents
     *  pathologically long inputs that would hash slowly. */
    password: z.string().min(4).max(200).optional(),
    /** PART J: optional ISO 8601 expiry. After this point GET returns 410.
     *  Past dates are rejected (would create an immediately-dead link). */
    expiresAt: z.string().datetime().optional(),
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

    // Nachtrag chain: if a parent share is referenced, validate ownership and
    // assign the next nachtragNumber in the chain.
    let nachtragNumber = 0;
    let parentShareId: string | null = null;
    if (parsed.data.parentShareId) {
      const parent = await db.query.shares.findFirst({ where: eq(shares.id, parsed.data.parentShareId) });
      if (!parent) return c.json({ error: 'parent_not_found' }, 400);
      if (parent.projectId !== projectId) return c.json({ error: 'parent_wrong_project' }, 400);
      // Find the highest existing nachtragNumber for this parent chain.
      const siblings = await db
        .select({ n: shares.nachtragNumber })
        .from(shares)
        .where(eq(shares.parentShareId, parent.id));
      const maxN = siblings.reduce((m, s) => Math.max(m, s.n), 0);
      nachtragNumber = maxN + 1;
      parentShareId = parent.id;
    }

    const id = nanoid(16);
    const token = nanoid(32);
    const now = new Date();

    // PART J: hash the password (if provided) BEFORE building the share row.
    // Strip it from settings so it never persists in the JSON blob — only the
    // hash lives, and only in the dedicated column. Same treatment for
    // expiresAt (kept as a real column for query-friendly comparison).
    let passwordHash: string | null = null;
    let expiresAtDate: Date | null = null;
    const settingsToStore = { ...parsed.data.settings };
    if (settingsToStore.password) {
      // Round 6 PART Y: argon2id, OWASP-recommended baseline params
      // (memoryCost 19 MiB, timeCost 2, parallelism 1). Native deploy
      // dependency solved via `@node-rs/argon2` prebuilt binaries — no
      // node-gyp on the deploy host. Hash format includes the algorithm
      // tag ($argon2id$...) so the verify path can fall back to bcrypt
      // for shares created in Round 3 (transparent migration).
      passwordHash = await argon2Hash(settingsToStore.password, {
        algorithm: ARGON2_ID,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      delete settingsToStore.password;
    }
    if (settingsToStore.expiresAt) {
      const t = new Date(settingsToStore.expiresAt);
      // Reject a past/invalid expiry instead of silently storing null — otherwise
      // the customer would see an expiry date while the gate never fires (a
      // never-expiring link). The contract is "future only".
      if (!Number.isFinite(t.getTime()) || t.getTime() <= now.getTime()) {
        return c.json({ error: 'invalid_input', detail: 'expiresAt must be in the future' }, 400);
      }
      expiresAtDate = t;
      // Leave settings.expiresAt in the JSON for client display; the column
      // is the load-bearing copy.
    }

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
      settings: settingsToStore,
      snapshotData: snapshot,
      snapshotHash: hash,
      snapshotVersion: 1,
      parentShareId,
      nachtragNumber,
      passwordHash,
      expiresAt: expiresAtDate,
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
        parentShareId,
        nachtragNumber,
      },
    });

    return c.json({
      id,
      token,
      projectId,
      visiblePositionIds: parsed.data.visiblePositionIds,
      // SECURITY: return the SANITISED settings (plaintext password removed
      // by the same path that built `settingsToStore`), NOT `parsed.data.settings`
      // which still carries the plaintext from the request body. A plaintext
      // echo would land in HTTP / reverse-proxy access logs.
      // Caught by panel-api/test/round9-shares-public.test.ts (Round 9).
      settings: settingsToStore,
      snapshotHash: hash,
      snapshottedAt: snapshot.snapshottedAt,
      parentShareId,
      nachtragNumber,
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

  /** Feature #3 — arbitrary snapshot-vs-snapshot diff.
   *  Compares two shares' frozen snapshots so the owner can answer
   *  "what changed between version N1 and N2 of this Angebot?" in one
   *  view. Both shareIds must belong to the same project, and that
   *  project must be owned by the caller.
   *
   *  Query: ?from=<shareId>&to=<shareId>
   *  Response: { from: {...}, to: {...}, diff: SnapshotDiff } */
  .get('/projects/:id/snapshots/diff', requireAuth, async (c) => {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const fromId = c.req.query('from');
    const toId = c.req.query('to');
    if (!fromId || !toId) {
      return c.json({ error: 'missing_from_or_to' }, 400);
    }
    if (fromId === toId) {
      return c.json({ error: 'same_snapshot' }, 400);
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);

    const fromShare = await db.query.shares.findFirst({ where: eq(shares.id, fromId) });
    const toShare = await db.query.shares.findFirst({ where: eq(shares.id, toId) });
    if (!fromShare || !toShare) return c.json({ error: 'share_not_found' }, 404);
    // Both shares MUST belong to the project we just verified ownership of —
    // closes the cross-project IDOR vector.
    if (fromShare.projectId !== projectId || toShare.projectId !== projectId) {
      return c.json({ error: 'share_wrong_project' }, 400);
    }
    if (!fromShare.snapshotData || !toShare.snapshotData) {
      return c.json({ error: 'snapshot_missing' }, 409);
    }

    const diff = diffSnapshots(fromShare.snapshotData, toShare.snapshotData);
    return c.json({
      from: {
        id: fromShare.id,
        token: fromShare.token,
        snapshotVersion: fromShare.snapshotVersion,
        snapshotHash: fromShare.snapshotHash,
        snapshottedAt: fromShare.snapshotData.snapshottedAt,
        nachtragNumber: fromShare.nachtragNumber,
        createdAt: fromShare.createdAt,
      },
      to: {
        id: toShare.id,
        token: toShare.token,
        snapshotVersion: toShare.snapshotVersion,
        snapshotHash: toShare.snapshotHash,
        snapshottedAt: toShare.snapshotData.snapshottedAt,
        nachtragNumber: toShare.nachtragNumber,
        createdAt: toShare.createdAt,
      },
      diff,
    });
  })

  /** PART K: per-project comment list grouped by positionOz. Owner-auth
   *  required (the calculator views this on the INTERN side). Aggregates
   *  across ALL non-revoked shares of the project so a multi-share
   *  conversation surfaces in one place. */
  .get('/projects/:id/comments', requireAuth, async (c) => {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);

    // Find all share ids for this project (revoked or not — calculator
    // wants to see historical comments even after a link is revoked).
    const projShares = await db.select({ id: shares.id }).from(shares).where(eq(shares.projectId, projectId));
    if (projShares.length === 0) return c.json({ comments: [], grouped: {} });
    const ids = projShares.map((s) => s.id);
    const rows = await db
      .select()
      .from(positionComments)
      .where(inArray(positionComments.shareId, ids))
      .orderBy(desc(positionComments.createdAt));

    // Group by positionOz for INTERN-view consumption.
    const grouped: Record<string, typeof rows> = {};
    for (const r of rows) {
      (grouped[r.positionOz] ??= []).push(r);
    }
    return c.json({ comments: rows, grouped });
  })

  /** PART K: just the counts — used by the v2 INTERN row badges so the
   *  table can render N badges without pulling the full comment text. */
  .get('/projects/:id/comments/counts', requireAuth, async (c) => {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });
    if (!project) return c.json({ error: 'not_found' }, 404);

    const projShares = await db.select({ id: shares.id }).from(shares).where(eq(shares.projectId, projectId));
    if (projShares.length === 0) return c.json({ counts: {} });
    const ids = projShares.map((s) => s.id);
    const rows = await db
      .select({
        positionOz: positionComments.positionOz,
        n: sql<number>`count(*)`.as('n'),
        unresolved: sql<number>`sum(case when ${positionComments.resolvedAt} is null then 1 else 0 end)`.as('unresolved'),
      })
      .from(positionComments)
      .where(inArray(positionComments.shareId, ids))
      .groupBy(positionComments.positionOz);

    const counts: Record<string, { total: number; unresolved: number }> = {};
    for (const r of rows) {
      counts[r.positionOz] = { total: Number(r.n), unresolved: Number(r.unresolved) };
    }
    return c.json({ counts });
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
