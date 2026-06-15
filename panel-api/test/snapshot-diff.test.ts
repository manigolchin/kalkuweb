/**
 * Tests for the Feature #3 snapshot-diff route:
 *   GET /projects/:id/snapshots/diff?from=<shareId>&to=<shareId>
 *
 * Mirrors the round9-shares-public DB-isolation pattern.
 */
import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// DB_PATH must be set before any import that touches db.js.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-diff-'));
process.env.DB_PATH = join(tmpDir, 'diff.db');
process.env.JWT_SECRET = 'diff-test-secret-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { sharesRoute } = await import('../src/routes/shares.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { buildShareSnapshot, snapshotHash } = await import('../src/lib/snapshot.js');
const { nanoid } = await import('nanoid');
const { eq } = await import('drizzle-orm');

import type { Position, CalcParams } from '../src/schema.js';

const app = new Hono();
app.route('/api', sharesRoute);

async function ownerCookie(userId: string, email: string): Promise<{ Cookie: string }> {
  const token = await signToken({ sub: userId, email });
  return { Cookie: `${COOKIE_NAME}=${token}` };
}

const PARAMS: CalcParams = {
  mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
  tagesstunden: 8, personaleinsatz: 3, mwst: 0.19, zielAufschlag: 0,
};

function pos(over: Partial<Position> & { id: string }): Position {
  return {
    id: over.id, oz: over.oz ?? '1.0', shortText: over.shortText ?? 'P',
    longText: '', hinweisText: '', quantity: over.quantity ?? 1,
    unit: over.unit ?? 'St', materialCost: over.materialCost ?? 100,
    timeMinutes: over.timeMinutes ?? 60, nuCost: over.nuCost ?? 0,
    isHeader: over.isHeader ?? false, sortOrder: over.sortOrder ?? 1, sectionPath: '',
    epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
    visibleToCustomer: true, positionType: 'standard',
  };
}

async function seedProjectWithTwoSnapshots(opts: {
  ownerId?: string;
  positionsBefore: Position[];
  positionsAfter: Position[];
}): Promise<{ ownerId: string; projectId: string; fromShareId: string; toShareId: string }> {
  const now = new Date();
  const ownerId = opts.ownerId ?? nanoid(16);
  const projectId = nanoid(16);

  // owner row (skip if already exists for the "other owner" case)
  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, ownerId) });
  if (!existing) {
    await db.insert(schema.users).values({
      id: ownerId, email: `${ownerId}@test.local`, passwordHash: 'unused',
      name: 'O', companyName: '', companyLogoUrl: '',
      companyPhone: '', companyContactEmail: '',
      mustChangePassword: false, createdAt: now, updatedAt: now,
    });
  }

  await db.insert(schema.projects).values({
    id: projectId, ownerId,
    data: {
      name: 'P', client: 'C', service: 'S', tenderNumber: 'T',
      deadline: '2026-12-31', bidder: 'B', calcParams: PARAMS,
      positions: opts.positionsAfter,
    },
    versionNumber: 2, createdAt: now, updatedAt: now,
  });

  const ids = opts.positionsBefore.map((p) => p.id);
  const snapBefore = buildShareSnapshot(
    { name: 'P', client: 'C', service: 'S', tenderNumber: 'T', deadline: '2026-12-31', calcParams: PARAMS },
    opts.positionsBefore, ids, 1,
  );
  const idsAfter = opts.positionsAfter.map((p) => p.id);
  const snapAfter = buildShareSnapshot(
    { name: 'P', client: 'C', service: 'S', tenderNumber: 'T', deadline: '2026-12-31', calcParams: PARAMS },
    opts.positionsAfter, idsAfter, 2,
  );

  const fromShareId = nanoid(16);
  const toShareId = nanoid(16);
  await db.insert(schema.shares).values({
    id: fromShareId, projectId, token: nanoid(32),
    visiblePositionIds: ids, settings: { brandHeader: 'co-branded' as const, allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
    snapshotData: snapBefore, snapshotHash: snapshotHash(snapBefore), snapshotVersion: 1,
    parentShareId: null, nachtragNumber: 0, passwordHash: null,
    expiresAt: null, revokedAt: null, createdAt: now, viewCount: 0,
  });
  await db.insert(schema.shares).values({
    id: toShareId, projectId, token: nanoid(32),
    visiblePositionIds: idsAfter, settings: { brandHeader: 'co-branded' as const, allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
    snapshotData: snapAfter, snapshotHash: snapshotHash(snapAfter), snapshotVersion: 2,
    parentShareId: null, nachtragNumber: 0, passwordHash: null,
    expiresAt: null, revokedAt: null, createdAt: now, viewCount: 0,
  });
  return { ownerId, projectId, fromShareId, toShareId };
}

before(() => {
  runMigrations();
});

beforeEach(async () => {
  await db.delete(schema.shareAccessLog);
  await db.delete(schema.positionComments);
  await db.delete(schema.shareResponses);
  await db.delete(schema.auditEvents);
  await db.delete(schema.viewPresets);
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
});

describe('GET /projects/:id/snapshots/diff', () => {
  test('200 — diff between two same-project shares', async () => {
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [
        pos({ id: 'a', oz: '1.1', shortText: 'Old', quantity: 5, materialCost: 100 }),
        pos({ id: 'b', oz: '1.2', shortText: 'Removed in v2', quantity: 1 }),
      ],
      positionsAfter: [
        pos({ id: 'a', oz: '1.1', shortText: 'New', quantity: 10, materialCost: 100 }),
        pos({ id: 'c', oz: '1.3', shortText: 'Added in v2', quantity: 2 }),
      ],
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      from: { id: string };
      to: { id: string };
      diff: {
        added: { id: string }[];
        removed: { id: string }[];
        changed: { before: { id: string }; after: { id: string }; fields: string[] }[];
        unchanged: unknown[];
        oldTotalNetto: number;
        newTotalNetto: number;
        delta: number;
      };
    };
    assert.equal(body.from.id, fromShareId);
    assert.equal(body.to.id, toShareId);
    assert.equal(body.diff.added.length, 1);
    assert.equal(body.diff.added[0].id, 'c');
    assert.equal(body.diff.removed.length, 1);
    assert.equal(body.diff.removed[0].id, 'b');
    assert.equal(body.diff.changed.length, 1);
    assert.equal(body.diff.changed[0].before.id, 'a');
    assert.ok(body.diff.changed[0].fields.includes('shortText'));
    assert.ok(body.diff.changed[0].fields.includes('quantity'));
    // delta non-zero — quantities + composition changed
    assert.notEqual(body.diff.delta, 0);
  });

  test('400 — missing from or to', async () => {
    const { ownerId, projectId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a' })],
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(`/api/projects/${projectId}/snapshots/diff?from=x`, { headers });
    assert.equal(res.status, 400);
  });

  test('400 — same shareId for from and to', async () => {
    const { ownerId, projectId, fromShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a' })],
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${fromShareId}`,
      { headers },
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'same_snapshot');
  });

  test('404 — project not owned by caller (IDOR)', async () => {
    const { projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a', quantity: 2 })],
    });
    // Different owner trying to diff
    const otherOwnerId = nanoid(16);
    const now = new Date();
    await db.insert(schema.users).values({
      id: otherOwnerId, email: `${otherOwnerId}@test.local`, passwordHash: 'unused',
      name: 'X', companyName: '', companyLogoUrl: '',
      companyPhone: '', companyContactEmail: '',
      mustChangePassword: false, createdAt: now, updatedAt: now,
    });
    const headers = await ownerCookie(otherOwnerId, `${otherOwnerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 404);
  });

  test('400 — share from a different project', async () => {
    const owner1 = nanoid(16);
    const a = await seedProjectWithTwoSnapshots({
      ownerId: owner1,
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a', quantity: 2 })],
    });
    const b = await seedProjectWithTwoSnapshots({
      ownerId: owner1,
      positionsBefore: [pos({ id: 'z' })],
      positionsAfter: [pos({ id: 'z', quantity: 3 })],
    });
    const headers = await ownerCookie(owner1, `${owner1}@test.local`);
    // Try to diff project A but use a shareId from project B
    const res = await app.request(
      `/api/projects/${a.projectId}/snapshots/diff?from=${a.fromShareId}&to=${b.toShareId}`,
      { headers },
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'share_wrong_project');
  });

  test('401 — without auth cookie', async () => {
    const { projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a', quantity: 2 })],
    });
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
    );
    assert.equal(res.status, 401);
  });

  test('totals delta is signed', async () => {
    // Decrease quantity → delta should be negative.
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a', quantity: 10, materialCost: 100, timeMinutes: 0, nuCost: 0 })],
      positionsAfter: [pos({ id: 'a', quantity: 5, materialCost: 100, timeMinutes: 0, nuCost: 0 })],
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { diff: { delta: number; oldTotalNetto: number; newTotalNetto: number } };
    assert.ok(body.diff.delta < 0, `delta should be negative, got ${body.diff.delta}`);
    assert.equal(body.diff.delta, body.diff.newTotalNetto - body.diff.oldTotalNetto);
  });

  /* ─── Extended coverage ──────────────────────────────────────────── */

  test('400 — malformed share ids: empty string for from', async () => {
    const { ownerId, projectId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a', quantity: 2 })],
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=&to=${toShareId}`,
      { headers },
    );
    // Empty string is falsy → caught by the missing_from_or_to branch.
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'missing_from_or_to');
  });

  test('400 — malformed share ids: both empty strings', async () => {
    const { ownerId, projectId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a' })],
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=&to=`,
      { headers },
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'missing_from_or_to');
  });

  test('200 — revoked share as FROM is still diffable (route does NOT block revoked)', async () => {
    // Documents current behaviour: the diff route compares frozen snapshots
    // and does not check share.revokedAt — revocation only hides the public
    // link from customers; the owner can still inspect a revoked snapshot.
    // If product policy ever requires "no diffs on revoked", switch the
    // expectation to a 4xx error.
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a', quantity: 1 })],
      positionsAfter: [pos({ id: 'a', quantity: 5 })],
    });
    // Revoke the FROM share.
    await db
      .update(schema.shares)
      .set({ revokedAt: new Date() })
      .where(eq(schema.shares.id, fromShareId));

    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { diff: { changed: unknown[] } };
    assert.equal(body.diff.changed.length, 1);
  });

  test('200 — revoked share as TO is still diffable (same documented behaviour)', async () => {
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a', quantity: 1 })],
      positionsAfter: [pos({ id: 'a', quantity: 5 })],
    });
    await db
      .update(schema.shares)
      .set({ revokedAt: new Date() })
      .where(eq(schema.shares.id, toShareId));

    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
  });

  test('409 snapshot_missing — share has null snapshotData (legacy row)', async () => {
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a' })],
      positionsAfter: [pos({ id: 'a', quantity: 2 })],
    });
    // Simulate a legacy share row (pre-snapshot-column).
    await db
      .update(schema.shares)
      .set({ snapshotData: null })
      .where(eq(schema.shares.id, fromShareId));

    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 409);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'snapshot_missing');
  });

  test('all positions unchanged → added/removed/changed empty, unchanged populated', async () => {
    const same = [
      pos({ id: 'a', oz: '1.1', shortText: 'X', quantity: 3, materialCost: 50, timeMinutes: 30 }),
      pos({ id: 'b', oz: '1.2', shortText: 'Y', quantity: 2, materialCost: 10, timeMinutes: 5 }),
    ];
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: same,
      positionsAfter: same.map((p) => ({ ...p })), // structural copy
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      diff: { added: unknown[]; removed: unknown[]; changed: unknown[]; unchanged: unknown[]; delta: number };
    };
    assert.equal(body.diff.added.length, 0);
    assert.equal(body.diff.removed.length, 0);
    assert.equal(body.diff.changed.length, 0);
    assert.equal(body.diff.unchanged.length, 2);
    assert.equal(body.diff.delta, 0);
  });

  test('from has 0 positions, to has N → all N in added, 0 elsewhere', async () => {
    const after = [
      pos({ id: 'x1', oz: '1', shortText: 'one' }),
      pos({ id: 'x2', oz: '2', shortText: 'two' }),
      pos({ id: 'x3', oz: '3', shortText: 'three' }),
    ];
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [],
      positionsAfter: after,
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      diff: { added: { id: string }[]; removed: unknown[]; changed: unknown[]; unchanged: unknown[]; delta: number };
    };
    assert.equal(body.diff.added.length, 3);
    assert.equal(body.diff.removed.length, 0);
    assert.equal(body.diff.changed.length, 0);
    assert.equal(body.diff.unchanged.length, 0);
    const ids = body.diff.added.map((p) => p.id).sort();
    assert.deepEqual(ids, ['x1', 'x2', 'x3']);
    // Going from empty to populated → delta should be positive.
    assert.ok(body.diff.delta > 0, `delta should be positive, got ${body.diff.delta}`);
  });

  test('price-only change → changed.fields includes ep and gp (not quantity/unit)', async () => {
    // Only materialCost changes → EP and GP change, quantity and unit do not.
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: [pos({ id: 'a', quantity: 4, unit: 'm²', materialCost: 100, timeMinutes: 0, nuCost: 0 })],
      positionsAfter:  [pos({ id: 'a', quantity: 4, unit: 'm²', materialCost: 200, timeMinutes: 0, nuCost: 0 })],
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      diff: { changed: Array<{ fields: string[] }> };
    };
    assert.equal(body.diff.changed.length, 1);
    const fields = body.diff.changed[0].fields;
    assert.ok(fields.includes('ep'), `expected fields to include 'ep', got ${JSON.stringify(fields)}`);
    assert.ok(fields.includes('gp'), `expected fields to include 'gp', got ${JSON.stringify(fields)}`);
    assert.ok(!fields.includes('quantity'), `quantity should NOT be in fields, got ${JSON.stringify(fields)}`);
    assert.ok(!fields.includes('unit'), `unit should NOT be in fields, got ${JSON.stringify(fields)}`);
  });

  test('delta equals sum of (after.gp - before.gp) over all changed positions (within tolerance)', async () => {
    // Three changed positions, varied quantity bumps. Compute the expected
    // delta from the snapshot's frozen gp values and check it matches.
    const before = [
      pos({ id: 'p1', quantity: 2, materialCost: 100, timeMinutes: 0, nuCost: 0 }),
      pos({ id: 'p2', quantity: 5, materialCost: 50,  timeMinutes: 0, nuCost: 0 }),
      pos({ id: 'p3', quantity: 1, materialCost: 200, timeMinutes: 0, nuCost: 0 }),
    ];
    const after = [
      pos({ id: 'p1', quantity: 3, materialCost: 100, timeMinutes: 0, nuCost: 0 }),
      pos({ id: 'p2', quantity: 5, materialCost: 75,  timeMinutes: 0, nuCost: 0 }),
      pos({ id: 'p3', quantity: 4, materialCost: 200, timeMinutes: 0, nuCost: 0 }),
    ];
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: before,
      positionsAfter: after,
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      diff: {
        changed: Array<{ before: { gp: number }; after: { gp: number } }>;
        unchanged: Array<{ gp: number }>;
        delta: number;
        oldTotalNetto: number;
        newTotalNetto: number;
      };
    };
    // Sum of (after.gp - before.gp) across changed PLUS 0 for unchanged
    // should equal the total delta (within float tolerance).
    const sumChanged = body.diff.changed.reduce((s, c) => s + (c.after.gp - c.before.gp), 0);
    assert.ok(
      Math.abs(sumChanged - body.diff.delta) < 1e-6,
      `sum of changed gp deltas (${sumChanged}) should match diff.delta (${body.diff.delta})`,
    );
    // Sanity: delta == newTotal - oldTotal.
    assert.ok(Math.abs(body.diff.delta - (body.diff.newTotalNetto - body.diff.oldTotalNetto)) < 1e-6);
  });

  test('large snapshots — 60 positions on each side compute correctly', async () => {
    // 50 unchanged, 5 changed, 5 removed-from-before / 5 added-in-after.
    const before: ReturnType<typeof pos>[] = [];
    const after: ReturnType<typeof pos>[] = [];
    for (let i = 0; i < 50; i++) {
      const p = pos({ id: `u${i}`, oz: `${i}`, quantity: 1, materialCost: 10, timeMinutes: 0, nuCost: 0 });
      before.push(p);
      after.push({ ...p });
    }
    for (let i = 0; i < 5; i++) {
      before.push(pos({ id: `c${i}`, quantity: 1, materialCost: 100, timeMinutes: 0, nuCost: 0 }));
      after.push(pos({ id: `c${i}`, quantity: 2, materialCost: 100, timeMinutes: 0, nuCost: 0 }));
    }
    for (let i = 0; i < 5; i++) {
      before.push(pos({ id: `r${i}` }));
      after.push(pos({ id: `n${i}` }));
    }
    // before: 60 (50 unchanged + 5 changed + 5 removed)
    // after:  60 (50 unchanged + 5 changed + 5 added)
    const { ownerId, projectId, fromShareId, toShareId } = await seedProjectWithTwoSnapshots({
      positionsBefore: before,
      positionsAfter: after,
    });
    const headers = await ownerCookie(ownerId, `${ownerId}@test.local`);
    const res = await app.request(
      `/api/projects/${projectId}/snapshots/diff?from=${fromShareId}&to=${toShareId}`,
      { headers },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      diff: { added: unknown[]; removed: unknown[]; changed: unknown[]; unchanged: unknown[] };
    };
    assert.equal(body.diff.unchanged.length, 50);
    assert.equal(body.diff.changed.length, 5);
    assert.equal(body.diff.added.length, 5);
    assert.equal(body.diff.removed.length, 5);
  });
});
