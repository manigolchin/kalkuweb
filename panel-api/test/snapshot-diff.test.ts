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
  tagesstunden: 8, personaleinsatz: 3, mwst: 0.19,
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
});
