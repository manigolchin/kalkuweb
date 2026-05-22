/**
 * PART J integration tests: share password gate + expiry + revision tracking.
 *
 * Strategy: ONE shared SQLite DB per file (at a temp file path set before
 * importing the db module), data cleared between tests. Hits the Hono app
 * via `app.request(...)` — exercises the actual route handlers + SQL.
 *
 * (Earlier attempt: per-test cache-busted imports. Did not work because
 * deep `import '../db.js'` inside routes/public resolves to the cached
 * module instance, not the cache-busted one — so the test's db and the
 * route's db diverged. Single-DB-with-cleanup is the standard pattern
 * here.)
 */

import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// Set DB_PATH BEFORE any import that pulls in db.js (it instantiates a
// singleton at import time).
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-pj-'));
process.env.DB_PATH = join(tmpDir, 'test.db');

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { publicRoute } = await import('../src/routes/public.js');
const { nanoid } = await import('nanoid');
const bcrypt = (await import('bcryptjs')).default;
const { eq } = await import('drizzle-orm');

const app = new Hono();
app.route('/api', publicRoute);

type SeedOverrides = {
  password?: string;
  expiresAt?: Date | null;
  projectVersionNumber?: number;
};

async function seedShare(overrides: SeedOverrides = {}): Promise<{
  token: string;
  shareId: string;
  projectId: string;
}> {
  const now = new Date();
  const userId = nanoid(16);
  const projectId = nanoid(16);
  const shareId = nanoid(16);
  const token = nanoid(32);
  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.local`,
    passwordHash: 'unused',
    name: 'Test User',
    companyName: 'Test Co GmbH',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: 'test@example.com',
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.projects).values({
    id: projectId,
    ownerId: userId,
    data: {
      name: 'Test Project',
      client: 'Test Client',
      service: 'Test Service',
      tenderNumber: 'T-001',
      deadline: '2026-12-31',
      bidder: 'Bidder',
      calcParams: {
        mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
        geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
        tagesstunden: 8, personaleinsatz: 3, mwst: 0.19,
      },
      positions: [
        {
          id: 'pos1', oz: '1.1', shortText: 'Position 1', longText: '', hinweisText: '',
          quantity: 1, unit: 'St', materialCost: 100, timeMinutes: 60, nuCost: 0,
          isHeader: false, sortOrder: 1, sectionPath: '',
          epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
          visibleToCustomer: true,
        },
      ],
    },
    versionNumber: overrides.projectVersionNumber ?? 1,
    createdAt: now,
    updatedAt: now,
  });
  const passwordHash = overrides.password ? await bcrypt.hash(overrides.password, 8) : null;
  await db.insert(schema.shares).values({
    id: shareId,
    projectId,
    token,
    visiblePositionIds: ['pos1'],
    settings: {
      brandHeader: 'co-branded' as const,
      allowApproval: true,
      allowChangeRequests: true,
      showTotals: true,
      showMwst: true,
    },
    snapshotData: {
      snapshottedAt: now.toISOString(),
      projectVersionNumber: 1,
      project: {
        name: 'Test Project', client: 'Test Client', service: 'Test Service',
        tenderNumber: 'T-001', deadline: '2026-12-31', mwst: 0.19,
      },
      positions: [
        { id: 'pos1', oz: '1.1', shortText: 'Position 1', longText: '',
          quantity: 1, unit: 'St', isHeader: false, sortOrder: 1, ep: 100, gp: 100 },
      ],
    },
    snapshotHash: 'h0',
    snapshotVersion: 1,
    passwordHash,
    expiresAt: overrides.expiresAt ?? null,
    createdAt: now,
    viewCount: 0,
  });
  return { token, shareId, projectId };
}

before(() => {
  runMigrations();
});

async function cleanupAll(): Promise<void> {
  // DELETE in FK-respecting order. Tables that may not exist on a brand-new
  // DB (created in this very test run) silently no-op.
  await db.delete(schema.shareAccessLog);
  await db.delete(schema.positionComments);
  await db.delete(schema.shareResponses);
  await db.delete(schema.auditEvents);
  await db.delete(schema.viewPresets);
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}

describe('PART J — share password gate', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('share without password → 200 OK', async () => {
    const { token } = await seedShare();
    const res = await app.request(`/api/share/${token}`);
    assert.equal(res.status, 200);
    const body = await res.json() as { passwordRequired: boolean };
    assert.equal(body.passwordRequired, false);
  });

  test('share WITH password, no header → 401 password_required', async () => {
    const { token } = await seedShare({ password: 'sekret123' });
    const res = await app.request(`/api/share/${token}`);
    assert.equal(res.status, 401);
    const body = await res.json() as { reason: string };
    assert.equal(body.reason, 'password_required');
  });

  test('share WITH password, WRONG header → 401', async () => {
    const { token } = await seedShare({ password: 'sekret123' });
    const res = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'wrong-password' },
    });
    assert.equal(res.status, 401);
  });

  test('share WITH password, CORRECT header → 200 OK + revision flags', async () => {
    const { token } = await seedShare({ password: 'sekret123' });
    const res = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'sekret123' },
    });
    assert.equal(res.status, 200);
    const body = await res.json() as {
      passwordRequired: boolean;
      hasNewerVersion: boolean;
      latestVersionNumber: number;
    };
    assert.equal(body.passwordRequired, false);
    assert.equal(body.hasNewerVersion, false);
    assert.equal(body.latestVersionNumber, 1);
  });

  test('5 wrong attempts → 6th returns 429 with Retry-After', async () => {
    const { token } = await seedShare({ password: 'sekret123' });
    for (let i = 0; i < 5; i++) {
      const r = await app.request(`/api/share/${token}`, {
        headers: { 'X-Share-Password': 'nope' + i },
      });
      assert.equal(r.status, 401, `attempt ${i + 1} should be 401`);
    }
    const sixth = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'nope6' },
    });
    assert.equal(sixth.status, 429);
    assert.ok(sixth.headers.get('Retry-After'));
    const body = await sixth.json() as { reason: string; retryAfter: number };
    assert.equal(body.reason, 'rate_limited');
    assert.ok(body.retryAfter > 0);
  });

  test('successful unlock resets the failure counter', async () => {
    const { token } = await seedShare({ password: 'sekret123' });
    for (let i = 0; i < 4; i++) {
      await app.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'nope' + i } });
    }
    const right = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'sekret123' },
    });
    assert.equal(right.status, 200);
    const sixth = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'wrong-again' },
    });
    assert.equal(sixth.status, 401);
    assert.notEqual(sixth.status, 429);
  });
});

describe('Round 6 PART Y — argon2id forward path + bcrypt legacy fallback', () => {
  beforeEach(async () => { await cleanupAll(); });

  // Hashing via @node-rs/argon2 directly so we don't depend on the
  // create-share route (which is owner-auth gated). We just need to prove
  // that a share row with an argon2id-prefixed hash unlocks correctly.
  test('share seeded with argon2id hash unlocks with correct password', async () => {
    const { hash: argon2Hash } = await import('@node-rs/argon2');
    const argonHash = await argon2Hash('sekret-argon2', {
      algorithm: 2, // Algorithm.Argon2id (const enum → numeric literal)
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    assert.ok(argonHash.startsWith('$argon2'), 'expected $argon2 hash prefix');
    const { token } = await seedShare({ password: 'placeholder-ignored' });
    // Overwrite the bcrypt hash that seedShare wrote with our argon2 one.
    await db.update(schema.shares).set({ passwordHash: argonHash }).where(eq(schema.shares.token, token));

    const wrong = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'nope' },
    });
    assert.equal(wrong.status, 401);

    const right = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'sekret-argon2' },
    });
    assert.equal(right.status, 200);
  });

  test('legacy bcrypt-hashed share (from Round 3) still unlocks via fallback', async () => {
    // seedShare uses bcrypt by default — same path Round 3 took.
    const { token } = await seedShare({ password: 'legacy-pw' });
    const right = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'legacy-pw' },
    });
    assert.equal(right.status, 200);
  });

  test('malformed hash → 401 without throwing', async () => {
    const { token } = await seedShare({ password: 'placeholder-ignored' });
    await db.update(schema.shares).set({ passwordHash: 'not-a-valid-hash' }).where(eq(schema.shares.token, token));
    const res = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'anything' },
    });
    assert.equal(res.status, 401);
  });
});

describe('PART J — share expiry', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('expired share → 410 Gone with reason=expired (no password check)', async () => {
    const past = new Date(Date.now() - 60_000);
    const { token } = await seedShare({ password: 'sekret123', expiresAt: past });
    const res = await app.request(`/api/share/${token}`, {
      headers: { 'X-Share-Password': 'sekret123' },
    });
    assert.equal(res.status, 410);
    const body = await res.json() as { reason: string };
    assert.equal(body.reason, 'expired');
  });

  test('share with future expiresAt → 200 OK', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { token } = await seedShare({ expiresAt: future });
    const res = await app.request(`/api/share/${token}`);
    assert.equal(res.status, 200);
    const body = await res.json() as { expiresAt: string };
    assert.equal(body.expiresAt, future.toISOString());
  });
});

describe('PART J — revision tracking (hasNewerVersion)', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('share snapshot at v1, project at v1 → hasNewerVersion=false', async () => {
    const { token } = await seedShare();
    const res = await app.request(`/api/share/${token}`);
    const body = await res.json() as { hasNewerVersion: boolean; latestVersionNumber: number };
    assert.equal(body.hasNewerVersion, false);
    assert.equal(body.latestVersionNumber, 1);
  });

  test('project version bumped to v2 after share → hasNewerVersion=true', async () => {
    const { token, projectId } = await seedShare();
    await db.update(schema.projects)
      .set({ versionNumber: 2, updatedAt: new Date() })
      .where(eq(schema.projects.id, projectId));
    const res = await app.request(`/api/share/${token}`);
    const body = await res.json() as { hasNewerVersion: boolean; latestVersionNumber: number };
    assert.equal(body.hasNewerVersion, true);
    assert.equal(body.latestVersionNumber, 2);
  });
});
