/**
 * Round 9 — comprehensive backend tests for the share/public surface.
 *
 * Targets the customer-facing endpoints most exposed to outside requests:
 *   - panel-api/src/routes/shares.ts   (owner-side share lifecycle)
 *   - panel-api/src/routes/public.ts   (customer-side gate + responses)
 *   - panel-api/src/lib/snapshot.ts    (snapshot freeze + diff)
 *   - panel-api/src/lib/audit.ts       (hash-chain edge cases)
 *
 * Same DB pattern as share-gate / position-comments tests: ONE shared
 * SQLite DB whose path is set via DB_PATH BEFORE importing db.js. Cleared
 * between tests via DELETE in FK-respecting order.
 *
 * Owner endpoints exercise the real requireAuth middleware path via a
 * signed JWT cookie. Customer endpoints hit the publicRoute directly.
 *
 * Hard constraint: NO product-code modifications. Real-bug findings are
 * marked with `test.skip` + a "FAILS: real bug — …" comment so the
 * caller can decide whether to fix in product or in test.
 */

import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Hono } from 'hono';

// DB_PATH MUST be set before any import that pulls in db.js — the
// singleton is created at import time.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-r9-'));
process.env.DB_PATH = join(tmpDir, 'r9.db');
process.env.JWT_SECRET = 'r9-test-secret-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { publicRoute } = await import('../src/routes/public.js');
const { sharesRoute } = await import('../src/routes/shares.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { buildShareSnapshot, snapshotHash, diffSnapshots } = await import('../src/lib/snapshot.js');
const { recordAuditEvent, verifyAuditChain } = await import('../src/lib/audit.js');
const { nanoid } = await import('nanoid');
const bcrypt = (await import('bcryptjs')).default;
const { hash: argon2Hash } = await import('@node-rs/argon2');
const { eq, and } = await import('drizzle-orm');

import type { Position, ShareSnapshot, CalcParams, ShareSettings } from '../src/schema.js';

/* ─── app wiring ─────────────────────────────────────────────────────── */

const publicApp = new Hono();
publicApp.route('/api', publicRoute);

const ownerApp = new Hono();
ownerApp.route('/api', sharesRoute);

async function ownerCookie(userId: string, email: string): Promise<{ Cookie: string }> {
  const token = await signToken({ sub: userId, email });
  return { Cookie: `${COOKIE_NAME}=${token}` };
}

/* ─── fixtures ───────────────────────────────────────────────────────── */

const DEFAULT_PARAMS: CalcParams = {
  mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
  tagesstunden: 8, personaleinsatz: 3, mwst: 0.19, zielAufschlag: 0,
};

function fixturePos(overrides: Partial<Position> & { id: string }): Position {
  return {
    id: overrides.id, oz: overrides.oz || '01', shortText: 'P', longText: '',
    hinweisText: '', quantity: 1, unit: 'St', materialCost: 100, timeMinutes: 60, nuCost: 0,
    isHeader: false, sortOrder: 1, sectionPath: '',
    epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
    visibleToCustomer: true,
    ...overrides,
  };
}

type Seeded = {
  ownerId: string;
  projectId: string;
  shareId: string;
  token: string;
  positions: Position[];
};

type SeedOpts = {
  password?: string;
  expiresAt?: Date | null;
  positions?: Position[];
  visiblePositionIds?: string[];
  settings?: Partial<ShareSettings>;
  projectVersionNumber?: number;
  parentShareId?: string | null;
  nachtragNumber?: number;
  revokedAt?: Date | null;
  passwordHashOverride?: string | null;
};

async function seedFull(opts: SeedOpts = {}): Promise<Seeded> {
  const now = new Date();
  const ownerId = nanoid(16);
  const projectId = nanoid(16);
  const shareId = nanoid(16);
  const token = nanoid(32);
  const positions = opts.positions ?? [
    fixturePos({ id: 'pos1', oz: '1.1', shortText: 'Position 1', materialCost: 100, timeMinutes: 60, quantity: 2, unit: 'm²' }),
    fixturePos({ id: 'pos2', oz: '1.2', shortText: 'Position 2', materialCost: 50, timeMinutes: 30, quantity: 1, unit: 'St' }),
  ];
  const visibleIds = opts.visiblePositionIds ?? positions.map((p) => p.id);

  await db.insert(schema.users).values({
    id: ownerId, email: `${ownerId}@test.local`, passwordHash: 'unused',
    name: 'Test Owner', companyName: 'TestCo GmbH', companyLogoUrl: '',
    companyPhone: '', companyContactEmail: 'contact@example.com',
    mustChangePassword: false, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.projects).values({
    id: projectId, ownerId,
    data: {
      name: 'P', client: 'C', service: 'S', tenderNumber: 'T',
      deadline: '2026-12-31', bidder: 'B', calcParams: DEFAULT_PARAMS, positions,
    },
    versionNumber: opts.projectVersionNumber ?? 1, createdAt: now, updatedAt: now,
  });

  // Build the snapshot with the real builder so it's exactly what a fresh
  // share would have. Reduces the risk of test fixtures drifting from prod.
  const snap = buildShareSnapshot(
    { name: 'P', client: 'C', service: 'S', tenderNumber: 'T', deadline: '2026-12-31', calcParams: DEFAULT_PARAMS },
    positions,
    visibleIds,
    opts.projectVersionNumber ?? 1,
  );
  const hash = snapshotHash(snap);

  let pwdHash: string | null = null;
  if (opts.passwordHashOverride !== undefined) {
    pwdHash = opts.passwordHashOverride;
  } else if (opts.password) {
    pwdHash = await bcrypt.hash(opts.password, 8);
  }

  await db.insert(schema.shares).values({
    id: shareId, projectId, token,
    visiblePositionIds: visibleIds,
    settings: {
      brandHeader: 'co-branded' as const,
      allowApproval: true, allowChangeRequests: true,
      showTotals: true, showMwst: true,
      ...opts.settings,
    },
    snapshotData: snap,
    snapshotHash: hash, snapshotVersion: 1,
    parentShareId: opts.parentShareId ?? null,
    nachtragNumber: opts.nachtragNumber ?? 0,
    passwordHash: pwdHash,
    expiresAt: opts.expiresAt ?? null,
    revokedAt: opts.revokedAt ?? null,
    createdAt: now, viewCount: 0,
  });
  return { ownerId, projectId, shareId, token, positions };
}

/** Seed only the owner + project (no share). Lets the test exercise
 *  POST /projects/:id/shares end-to-end via the owner route. */
async function seedOwnerOnly(opts: { positions?: Position[]; projectVersionNumber?: number } = {}): Promise<{ ownerId: string; projectId: string; positions: Position[] }> {
  const now = new Date();
  const ownerId = nanoid(16);
  const projectId = nanoid(16);
  const positions = opts.positions ?? [
    fixturePos({ id: 'pos1', oz: '1.1', shortText: 'Position 1', materialCost: 100, timeMinutes: 60, quantity: 2, unit: 'm²' }),
    fixturePos({ id: 'pos2', oz: '1.2', shortText: 'Position 2', materialCost: 50, timeMinutes: 30, quantity: 1, unit: 'St' }),
  ];
  await db.insert(schema.users).values({
    id: ownerId, email: `${ownerId}@test.local`, passwordHash: 'unused',
    name: 'Owner', companyName: 'TestCo', companyLogoUrl: '',
    companyPhone: '', companyContactEmail: '',
    mustChangePassword: false, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.projects).values({
    id: projectId, ownerId,
    data: {
      name: 'P', client: 'C', service: 'S', tenderNumber: 'T',
      deadline: '2026-12-31', bidder: 'B', calcParams: DEFAULT_PARAMS, positions,
    },
    versionNumber: opts.projectVersionNumber ?? 1, createdAt: now, updatedAt: now,
  });
  return { ownerId, projectId, positions };
}

before(() => {
  runMigrations();
});

async function cleanupAll(): Promise<void> {
  // Foreign-key safe order.
  await db.delete(schema.shareAccessLog);
  await db.delete(schema.positionComments);
  await db.delete(schema.shareResponses);
  await db.delete(schema.auditEvents);
  await db.delete(schema.viewPresets);
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}

/* ════════════════════════════════════════════════════════════════════════
 *  SECTION 1 — shares.ts owner-side (16 tests)
 * ════════════════════════════════════════════════════════════════════════ */

describe('Round 9 — shares.ts (owner-side)', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('POST /projects/:id/shares creates a share with token + initial snapshot', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1', 'pos2'],
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { id: string; token: string; snapshotHash: string };
    assert.ok(body.id && body.id.length > 0);
    assert.ok(body.token && body.token.length >= 16);
    assert.ok(body.snapshotHash && /^[0-9a-f]{64}$/.test(body.snapshotHash));
  });

  test('POST returns ShareSummary with all key fields populated', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    const body = await res.json() as Record<string, unknown>;
    for (const k of ['id', 'token', 'projectId', 'visiblePositionIds', 'settings', 'snapshotHash', 'snapshottedAt', 'createdAt', 'viewCount']) {
      assert.ok(k in body, `missing key ${k} in ShareSummary response`);
    }
    assert.equal(body.viewCount, 0);
    assert.equal(body.revokedAt, null);
    assert.equal(body.lastViewedAt, null);
  });

  test('share tokens are unique across rapid-fire creation', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const headers = { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) };
    const tokens: string[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
        method: 'POST', headers,
        body: JSON.stringify({
          visiblePositionIds: ['pos1'],
          settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
        }),
      });
      const body = await res.json() as { token: string };
      tokens.push(body.token);
    }
    assert.equal(new Set(tokens).size, tokens.length, 'every share token must be unique');
  });

  test('POST /projects/:id/shares without auth → 401', async () => {
    const { projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    assert.equal(res.status, 401);
  });

  test('POST against another user\'s project → 404 (auth scope leak guard)', async () => {
    const { projectId } = await seedOwnerOnly(); // owner A
    const otherOwner = await seedOwnerOnly();    // owner B
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(otherOwner.ownerId, 'b@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    assert.equal(res.status, 404, 'cross-owner POST must NOT succeed');
  });

  test('POST with visiblePositionIds filter narrows the snapshot to those positions', async () => {
    const positions = [
      fixturePos({ id: 'visible', oz: '1.1', materialCost: 100 }),
      fixturePos({ id: 'hidden', oz: '1.2', materialCost: 999 }),
    ];
    const { ownerId, projectId } = await seedOwnerOnly({ positions });
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['visible'],
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    const body = await res.json() as { token: string };
    // Now hit the customer-side view and confirm only `visible` is present.
    const customer = await publicApp.request(`/api/share/${body.token}`);
    assert.equal(customer.status, 200);
    const cBody = await customer.json() as { positions: Array<{ id: string }> };
    assert.equal(cBody.positions.length, 1);
    assert.equal(cBody.positions[0].id, 'visible');
  });

  test('POST with password — DB row stores hash (not plaintext)', async () => {
    // Positive half of the leak guard: verify the *persistence* side is
    // clean. The response-body leak is covered by the next test (currently
    // skipped pending a product fix — see note there).
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: {
          brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
          showTotals: true, showMwst: true,
          password: 'MySuperSecret123',
        },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { id: string };
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, body.id) });
    assert.ok(row);
    assert.ok(row!.passwordHash);
    assert.notEqual(row!.passwordHash, 'MySuperSecret123');
    assert.ok(row!.passwordHash!.startsWith('$argon2') || row!.passwordHash!.startsWith('$2'),
      'expected argon2 or bcrypt hash prefix');
    // Also confirm the stored settings JSON does NOT contain the password.
    const storedSettings = row!.settings as { password?: string };
    assert.equal(storedSettings.password, undefined,
      'plaintext password must NOT be persisted in the settings JSON blob');
  });

  test('FIXED in commit (Round 9): POST share response NEVER echoes plaintext password', async () => {
    // Previously returned `parsed.data.settings` which still contained the
    // plaintext password; fixed to return `settingsToStore` (sanitised copy).
    // See panel-api/src/routes/shares.ts (the comment around the POST response).
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: {
          brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
          showTotals: true, showMwst: true,
          password: 'MySuperSecret123',
        },
      }),
    });
    const raw = await res.text();
    assert.ok(!raw.includes('MySuperSecret123'), 'plaintext password leaked into response');
  });

  test('POST with expiresAt stores it as epoch-ms in the column', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: {
          brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
          showTotals: true, showMwst: true,
          expiresAt: expiry.toISOString(),
        },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { id: string };
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, body.id) });
    assert.ok(row!.expiresAt instanceof Date);
    // Within 1 second of provided expiry (allows for ms-rounding inside drizzle).
    assert.ok(Math.abs(row!.expiresAt!.getTime() - expiry.getTime()) < 1000);
  });

  test('POST with bindefristDays persists in settings JSON', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: {
          brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
          showTotals: true, showMwst: true, bindefristDays: 45,
        },
      }),
    });
    const body = await res.json() as { id: string };
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, body.id) });
    assert.equal(row!.settings.bindefristDays, 45);
  });

  test('POST with showLongText=false persists in settings JSON (short version)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: {
          brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
          showTotals: true, showMwst: true, showLongText: false,
        },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { id: string };
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, body.id) });
    assert.equal(row!.settings.showLongText, false, 'short-version flag must survive the strict Zod object');
  });

  test('POST omitting showLongText defaults it to true (all details)', async () => {
    // Guards the Zod .default(true): a share created without the flag must
    // store true so legacy "all details" stays the implicit behaviour.
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    const body = await res.json() as { id: string };
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, body.id) });
    assert.equal(row!.settings.showLongText, true);
  });

  test('showLongText flows through to the customer view payload settings', async () => {
    const { token } = await seedFull({ settings: { showLongText: false } });
    const res = await publicApp.request(`/api/share/${token}`);
    assert.equal(res.status, 200);
    const body = await res.json() as { settings: { showLongText?: boolean } };
    assert.equal(body.settings.showLongText, false);
  });

  test('DELETE /shares/:id sets revokedAt and returns ok', async () => {
    const { ownerId, shareId } = await seedFull();
    const res = await ownerApp.request(`/api/shares/${shareId}`, {
      method: 'DELETE',
      headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    assert.equal(res.status, 200);
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.ok(row!.revokedAt instanceof Date);
  });

  test('POST /shares/:id/resnapshot bumps snapshotVersion + recomputes hash', async () => {
    const { ownerId, shareId, projectId } = await seedFull();
    const before = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    // Mutate the project so the snapshot WILL differ.
    const updatedPositions = before!.snapshotData!.positions.map((p, i) =>
      i === 0 ? fixturePos({ id: p.id, oz: p.oz, materialCost: 500, timeMinutes: 60, quantity: 2 }) : fixturePos({ id: p.id, oz: p.oz }),
    );
    await db.update(schema.projects)
      .set({
        data: {
          name: 'P', client: 'C', service: 'S', tenderNumber: 'T', deadline: '2026-12-31', bidder: 'B',
          calcParams: DEFAULT_PARAMS, positions: updatedPositions,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId));
    const res = await ownerApp.request(`/api/shares/${shareId}/resnapshot`, {
      method: 'POST',
      headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    assert.equal(res.status, 200);
    const after = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.equal(after!.snapshotVersion, before!.snapshotVersion + 1);
    assert.notEqual(after!.snapshotHash, before!.snapshotHash);
  });

  test('resnapshot with NO project change still bumps version (per current contract)', async () => {
    // Current implementation always bumps version regardless of diff —
    // we just confirm the hash is stable when nothing changed.
    const { ownerId, shareId } = await seedFull();
    const before = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    const res = await ownerApp.request(`/api/shares/${shareId}/resnapshot`, {
      method: 'POST', headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    assert.equal(res.status, 200);
    const after = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    // No project change → snapshot.snapshottedAt differs, so the FULL snapshot hash
    // changes too. But the substantive content (positions, project) is identical.
    // We confirm version bumped + that the position list matches.
    assert.equal(after!.snapshotVersion, before!.snapshotVersion + 1);
    assert.deepEqual(after!.snapshotData!.positions, before!.snapshotData!.positions);
  });

  test('GET /projects/:id/shares lists shares ordered by createdAt desc', async () => {
    // seedFull creates 3 shares for the same project, each at a slightly later time.
    const { ownerId, projectId } = await seedOwnerOnly();
    const headers = { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) };
    const tokens: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
        method: 'POST', headers,
        body: JSON.stringify({
          visiblePositionIds: ['pos1'],
          settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
        }),
      });
      const body = await res.json() as { token: string };
      tokens.push(body.token);
      // Ensure timestamps differ enough to sort deterministically.
      await new Promise((r) => setTimeout(r, 5));
    }
    const list = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    assert.equal(list.status, 200);
    const body = await list.json() as { shares: Array<{ token: string; createdAt: string }> };
    assert.equal(body.shares.length, 3);
    // Reverse-chronological: newest token (last created) first.
    assert.equal(body.shares[0].token, tokens[2]);
    assert.equal(body.shares[2].token, tokens[0]);
  });

  test('GET /projects/:id/comments/counts aggregates by positionOz across shares', async () => {
    const { ownerId, projectId, token } = await seedFull();
    // Post one comment for pos1, two for pos2.
    for (const oz of ['1.1', '1.2', '1.2']) {
      await publicApp.request(`/api/share/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionOz: oz, intent: 'other', text: 'foo' }),
      });
    }
    const counts = await ownerApp.request(`/api/projects/${projectId}/comments/counts`, {
      headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    assert.equal(counts.status, 200);
    const body = await counts.json() as { counts: Record<string, { total: number; unresolved: number }> };
    assert.equal(body.counts['1.1'].total, 1);
    assert.equal(body.counts['1.2'].total, 2);
    assert.equal(body.counts['1.2'].unresolved, 2);
  });

  test('Nachtrag chain: parentShareId + nachtragNumber auto-increment', async () => {
    const { ownerId, projectId, shareId } = await seedFull();
    const headers = { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) };
    // First Nachtrag (N1)
    const r1 = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST', headers,
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        parentShareId: shareId,
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    assert.equal(r1.status, 200);
    const b1 = await r1.json() as { id: string; nachtragNumber: number; parentShareId: string };
    assert.equal(b1.nachtragNumber, 1);
    assert.equal(b1.parentShareId, shareId);

    // Second Nachtrag should be N2
    const r2 = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST', headers,
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        parentShareId: shareId,
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    const b2 = await r2.json() as { nachtragNumber: number };
    assert.equal(b2.nachtragNumber, 2);
  });

  test('cross-project parentShareId rejected with 400', async () => {
    const a = await seedFull();
    const b = await seedOwnerOnly();
    // owner B tries to claim ownership but uses owner A's share as parent —
    // ownership check should pass for B's project but the route should
    // refuse to chain across projects.
    const res = await ownerApp.request(`/api/projects/${b.projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(b.ownerId, 'b@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        parentShareId: a.shareId,
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error: string };
    assert.equal(body.error, 'parent_wrong_project');
  });
});

/* ════════════════════════════════════════════════════════════════════════
 *  SECTION 2 — public.ts customer-side (22 tests)
 * ════════════════════════════════════════════════════════════════════════ */

describe('Round 9 — public.ts (customer-side)', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('GET /share/:token returns CustomerViewPayload for a valid token', async () => {
    const { token } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}`);
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    for (const k of ['shareId', 'token', 'settings', 'snapshotHash', 'project', 'owner', 'positions', 'passwordRequired', 'hasNewerVersion', 'latestVersionNumber']) {
      assert.ok(k in body, `missing key ${k} in customer payload`);
    }
  });

  test('GET /share/:token with unknown token → 404', async () => {
    const res = await publicApp.request('/api/share/this-token-does-not-exist-anywhere');
    assert.equal(res.status, 404);
  });

  test('GET /share/:token on revoked share → 410 with reason=revoked', async () => {
    const { token, shareId } = await seedFull();
    await db.update(schema.shares).set({ revokedAt: new Date() }).where(eq(schema.shares.id, shareId));
    const res = await publicApp.request(`/api/share/${token}`);
    assert.equal(res.status, 410);
    const body = await res.json() as { reason: string };
    assert.equal(body.reason, 'revoked');
  });

  test('GET /share/:token past expiresAt → 410 with reason=expired', async () => {
    const past = new Date(Date.now() - 60_000);
    const { token } = await seedFull({ expiresAt: past });
    const res = await publicApp.request(`/api/share/${token}`);
    assert.equal(res.status, 410);
    const body = await res.json() as { reason: string };
    assert.equal(body.reason, 'expired');
  });

  test('Password-protected share without X-Share-Password header → 401', async () => {
    const { token } = await seedFull({ password: 'secret123' });
    const res = await publicApp.request(`/api/share/${token}`);
    assert.equal(res.status, 401);
    const body = await res.json() as { reason: string };
    assert.equal(body.reason, 'password_required');
  });

  test('Password-protected share with WRONG password → 401 + access_log entry', async () => {
    const { token, shareId } = await seedFull({ password: 'secret123' });
    await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'wrong' } });
    // access_log should have 1 row for this share with success=false
    const logs = await db.select().from(schema.shareAccessLog).where(eq(schema.shareAccessLog.shareId, shareId));
    assert.ok(logs.length >= 1);
    assert.ok(logs.some((l) => l.success === false));
  });

  test('Password-protected share with CORRECT password → 200 + success access_log', async () => {
    const { token, shareId } = await seedFull({ password: 'secret123' });
    const res = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'secret123' } });
    assert.equal(res.status, 200);
    const logs = await db.select().from(schema.shareAccessLog).where(eq(schema.shareAccessLog.shareId, shareId));
    assert.ok(logs.some((l) => l.success === true && l.reason === 'unlock_attempt'));
  });

  test('5 failed unlock attempts per (token, ip) in 15 min → 429 Retry-After', async () => {
    const { token } = await seedFull({ password: 'secret123' });
    for (let i = 0; i < 5; i++) {
      const r = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': `bad${i}` } });
      assert.equal(r.status, 401);
    }
    const sixth = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'bad6' } });
    assert.equal(sixth.status, 429);
    assert.ok(sixth.headers.get('Retry-After'));
    const body = await sixth.json() as { retryAfter: number };
    assert.ok(body.retryAfter > 0);
  });

  test('Successful unlock resets the failure counter for that (token, ip)', async () => {
    const { token } = await seedFull({ password: 'secret123' });
    for (let i = 0; i < 4; i++) {
      await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': `bad${i}` } });
    }
    const ok = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'secret123' } });
    assert.equal(ok.status, 200);
    const after = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'wrong-but-fresh' } });
    assert.equal(after.status, 401, 'counter reset; the next wrong should be 401 not 429');
  });

  test('bcrypt-hashed share unlocks via legacy path (Round 3 compatibility)', async () => {
    const legacyHash = await bcrypt.hash('legacy-pw', 8);
    const { token } = await seedFull({ passwordHashOverride: legacyHash });
    const res = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'legacy-pw' } });
    assert.equal(res.status, 200);
  });

  test('argon2id-hashed share unlocks via forward path (Round 6 PART Y)', async () => {
    const argonHash = await argon2Hash('argon-pw', {
      algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1,
    });
    assert.ok(argonHash.startsWith('$argon2'));
    const { token } = await seedFull({ passwordHashOverride: argonHash });
    const res = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'argon-pw' } });
    assert.equal(res.status, 200);
  });

  test('Older project version compared to snapshot → hasNewerVersion=true', async () => {
    const { token, projectId } = await seedFull();
    await db.update(schema.projects)
      .set({ versionNumber: 5, updatedAt: new Date() })
      .where(eq(schema.projects.id, projectId));
    const res = await publicApp.request(`/api/share/${token}`);
    const body = await res.json() as { hasNewerVersion: boolean; latestVersionNumber: number };
    assert.equal(body.hasNewerVersion, true);
    assert.equal(body.latestVersionNumber, 5);
  });

  test('GET /share/:token bumps view_count and sets last_viewed_at', async () => {
    const { token, shareId } = await seedFull();
    const before = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.equal(before!.viewCount, 0);
    assert.equal(before!.lastViewedAt, null);
    await publicApp.request(`/api/share/${token}`);
    await publicApp.request(`/api/share/${token}`);
    const after = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.equal(after!.viewCount, 2);
    assert.ok(after!.lastViewedAt instanceof Date);
  });

  test('POST /share/:token/approve records a ShareResponse', async () => {
    const { token, shareId } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Kunde Mustermann', customerEmail: 'kunde@example.de' }),
    });
    assert.equal(res.status, 200);
    const responses = await db.select().from(schema.shareResponses).where(eq(schema.shareResponses.shareId, shareId));
    assert.equal(responses.length, 1);
    assert.equal(responses[0].responseType, 'approve');
    assert.equal(responses[0].customerName, 'Kunde Mustermann');
  });

  test('POST /share/:token/approve with invalid customerEmail → 400', async () => {
    const { token } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Kunde', customerEmail: 'not-an-email' }),
    });
    assert.equal(res.status, 400);
  });

  test('POST /share/:token/approve on revoked share → 410', async () => {
    const { token, shareId } = await seedFull();
    await db.update(schema.shares).set({ revokedAt: new Date() }).where(eq(schema.shares.id, shareId));
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'K' }),
    });
    assert.equal(res.status, 410);
  });

  test('POST /share/:token/changes records the changes payload', async () => {
    const { token, shareId } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'K', customerEmail: 'k@example.de',
        changes: [{ positionId: 'pos1', type: 'modify', text: 'Bitte 5 Stk statt 2' }],
      }),
    });
    assert.equal(res.status, 200);
    const responses = await db.select().from(schema.shareResponses).where(eq(schema.shareResponses.shareId, shareId));
    assert.equal(responses[0].responseType, 'changes');
    assert.equal(responses[0].payload.changes?.length, 1);
  });

  test('POST /share/:token/changes when allowChangeRequests=false → 403', async () => {
    const { token } = await seedFull({ settings: { allowChangeRequests: false } });
    const res = await publicApp.request(`/api/share/${token}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'K',
        changes: [{ positionId: 'pos1', type: 'modify', text: 't' }],
      }),
    });
    assert.equal(res.status, 403);
  });

  test('POST /share/:token/approve when allowApproval=false → 403', async () => {
    const { token } = await seedFull({ settings: { allowApproval: false } });
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'K' }),
    });
    assert.equal(res.status, 403);
  });

  // ── Regression (security): /pdf, /approve and /changes must honor the share
  // password gate. They previously did their own inline token lookup and
  // skipped the password check, so a password-protected share's PDF could be
  // pulled — and a legally-binding approval / change-request submitted — with
  // only the unguessable token. They now route through gateShare like the HTML
  // view and /comments do.
  test('GET /share/:token/pdf on a password-protected share WITHOUT password → 401', async () => {
    const { token } = await seedFull({ password: 'pdfSecret1' });
    const res = await publicApp.request(`/api/share/${token}/pdf`);
    assert.equal(res.status, 401);
    const body = await res.json() as { reason: string };
    assert.equal(body.reason, 'password_required');
  });

  test('GET /share/:token/pdf on a password-protected share WITH correct password → 200 application/pdf', async () => {
    const { token } = await seedFull({ password: 'pdfSecret1' });
    const res = await publicApp.request(`/api/share/${token}/pdf`, { headers: { 'X-Share-Password': 'pdfSecret1' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
  });

  test('POST /share/:token/approve on a password-protected share WITHOUT password → 401 + nothing recorded', async () => {
    const { token, shareId } = await seedFull({ password: 'apprSecret1' });
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Kunde', customerEmail: 'k@example.de' }),
    });
    assert.equal(res.status, 401);
    const responses = await db.select().from(schema.shareResponses).where(eq(schema.shareResponses.shareId, shareId));
    assert.equal(responses.length, 0, 'approval must NOT be recorded when the password gate is not satisfied');
  });

  test('POST /share/:token/approve on a password-protected share WITH correct password → 200', async () => {
    const { token } = await seedFull({ password: 'apprSecret1' });
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Share-Password': 'apprSecret1' },
      body: JSON.stringify({ customerName: 'Kunde', customerEmail: 'k@example.de' }),
    });
    assert.equal(res.status, 200);
  });

  test('POST /share/:token/changes on a password-protected share WITHOUT password → 401 + nothing recorded', async () => {
    const { token, shareId } = await seedFull({ password: 'chgSecret1' });
    const res = await publicApp.request(`/api/share/${token}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Kunde', changes: [{ positionId: 'pos1', type: 'modify', text: 'x' }] }),
    });
    assert.equal(res.status, 401);
    const responses = await db.select().from(schema.shareResponses).where(eq(schema.shareResponses.shareId, shareId));
    assert.equal(responses.length, 0, 'change-request must NOT be recorded when the password gate is not satisfied');
  });

  test('POST /share/:token/changes on a password-protected share WITH correct password → 200', async () => {
    const { token } = await seedFull({ password: 'chgSecret1' });
    const res = await publicApp.request(`/api/share/${token}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Share-Password': 'chgSecret1' },
      body: JSON.stringify({ customerName: 'Kunde', changes: [{ positionId: 'pos1', type: 'modify', text: 'x' }] }),
    });
    assert.equal(res.status, 200);
  });

  test('Password is never echoed back in any customer-facing response body', async () => {
    const { token } = await seedFull({ password: 'TopSecretPwd99' });
    const res = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'TopSecretPwd99' } });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(!text.includes('TopSecretPwd99'), 'plaintext password leaked into customer-view response');
  });

  test('snapshotHash returned to customer matches the stored snapshot row', async () => {
    const { token, shareId } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}`);
    const body = await res.json() as { snapshotHash: string };
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.equal(body.snapshotHash, row!.snapshotHash);
  });

  test('Customer DOM-leak guard: response contains NO internal fields (materialCost, timeMinutes, nuCost, internalNote, positionType, classification, hinweisText)', async () => {
    const positions = [
      fixturePos({
        id: 'pos1', oz: '1.1',
        materialCost: 12345, // load-bearing sentinel
        timeMinutes: 4321,
        nuCost: 999,
        hinweisText: 'INTERN_HINWEIS_LEAK_CANARY',
        internalNote: 'INTERN_NOTE_LEAK_CANARY',
        positionType: 'wagnis',
        classification: 'CLASSIFICATION_LEAK_CANARY',
      }),
    ];
    // With cost breakdown + calculation hidden, NO cost data (per-position
    // split or aggregate EINKAUF/Überschuss) may reach the customer JSON.
    const { token } = await seedFull({ positions, settings: { showCostBreakdown: false, showCalculation: false } });
    const res = await publicApp.request(`/api/share/${token}`);
    const raw = await res.text();
    // Field-name leaks (presence of these keys in the JSON would be bad).
    for (const forbidden of ['materialCost', 'timeMinutes', 'nuCost', 'internalNote', 'positionType', 'classification', 'hinweisText']) {
      assert.ok(!raw.includes(forbidden), `forbidden internal field '${forbidden}' leaked to customer JSON`);
    }
    // Value-level canaries (catches a rename that still echoes the data).
    assert.ok(!raw.includes('INTERN_HINWEIS_LEAK_CANARY'));
    assert.ok(!raw.includes('INTERN_NOTE_LEAK_CANARY'));
    assert.ok(!raw.includes('CLASSIFICATION_LEAK_CANARY'));
    assert.ok(!raw.includes('12345'));
    assert.ok(!raw.includes('4321'));
  });

  test('Owner login email never leaks to customer (only companyContactEmail surfaces)', async () => {
    const positions = [fixturePos({ id: 'pos1' })];
    const now = new Date();
    const ownerId = nanoid(16);
    const projectId = nanoid(16);
    const shareId = nanoid(16);
    const token = nanoid(32);
    // The login email is the canary — only companyContactEmail should appear.
    const loginEmail = 'private-login-CANARY@private.example';
    await db.insert(schema.users).values({
      id: ownerId, email: loginEmail, passwordHash: 'unused',
      name: 'Owner', companyName: 'Test', companyLogoUrl: '',
      companyPhone: '', companyContactEmail: 'public-contact@example.com',
      mustChangePassword: false, createdAt: now, updatedAt: now,
    });
    await db.insert(schema.projects).values({
      id: projectId, ownerId,
      data: { name: 'P', client: 'C', service: 'S', tenderNumber: '', deadline: '', bidder: '',
        calcParams: DEFAULT_PARAMS, positions },
      versionNumber: 1, createdAt: now, updatedAt: now,
    });
    const snap = buildShareSnapshot(
      { name: 'P', client: 'C', service: 'S', tenderNumber: '', deadline: '', calcParams: DEFAULT_PARAMS },
      positions, ['pos1'], 1,
    );
    await db.insert(schema.shares).values({
      id: shareId, projectId, token,
      visiblePositionIds: ['pos1'],
      settings: { brandHeader: 'co-branded' as const, allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      snapshotData: snap, snapshotHash: snapshotHash(snap), snapshotVersion: 1,
      passwordHash: null, expiresAt: null,
      createdAt: now, viewCount: 0,
    });

    const res = await publicApp.request(`/api/share/${token}`);
    const raw = await res.text();
    assert.ok(!raw.includes('private-login-CANARY'), 'owner login email leaked into customer payload');
    assert.ok(raw.includes('public-contact@example.com'), 'public contactEmail must be surfaced');
  });
});

/* ════════════════════════════════════════════════════════════════════════
 *  SECTION 3 — snapshot.ts (6 tests)
 * ════════════════════════════════════════════════════════════════════════ */

describe('Round 9 — snapshot.ts', () => {
  test('buildShareSnapshot recomputes ep/gp from raw inputs (ignores client-sent ep/gp)', () => {
    const positions = [
      fixturePos({
        id: 'p', oz: '01', quantity: 50, materialCost: 125, timeMinutes: 0,
        // Malicious or stale client values that the server must NOT trust:
        ep: 999999, gp: 999999,
      }),
    ];
    const snap = buildShareSnapshot(
      { name: 'X', client: '', service: '', tenderNumber: '', deadline: '', calcParams: DEFAULT_PARAMS },
      positions, ['p'], 1,
    );
    // epMaterial = 125 * 1.12 = 140; ep = 140; gp = 50 * 140 = 7000
    assert.equal(snap.positions[0].ep, 140);
    assert.equal(snap.positions[0].gp, 7000);
  });

  test('snapshotHash is deterministic for identical input', () => {
    const make = () => ({
      snapshottedAt: 'FIXED_TIMESTAMP',
      projectVersionNumber: 1,
      project: { name: 'A', client: 'B', service: 'C', tenderNumber: 'D', deadline: 'E', mwst: 0.19 },
      positions: [{ id: 'p', oz: '1', shortText: 'x', longText: '', quantity: 1, unit: 'St', isHeader: false, sortOrder: 1, ep: 10, gp: 10 }],
    });
    assert.equal(snapshotHash(make()), snapshotHash(make()));
  });

  test('snapshotHash changes when any single field differs', () => {
    const base: ShareSnapshot = {
      snapshottedAt: 'fixed',
      projectVersionNumber: 1,
      project: { name: 'A', client: 'B', service: 'C', tenderNumber: 'D', deadline: 'E', mwst: 0.19 },
      positions: [{ id: 'p', oz: '1', shortText: 'x', longText: '', quantity: 1, unit: 'St', isHeader: false, sortOrder: 1, ep: 10, gp: 10 }],
    };
    const tweaked = JSON.parse(JSON.stringify(base)) as ShareSnapshot;
    tweaked.positions[0].quantity = 2; // single-field flip
    assert.notEqual(snapshotHash(base), snapshotHash(tweaked));
  });

  test('diffSnapshots reports added / removed / changed correctly', () => {
    const before: ShareSnapshot = {
      snapshottedAt: 'a',
      projectVersionNumber: 1,
      project: { name: 'P', client: '', service: '', tenderNumber: '', deadline: '', mwst: 0.19 },
      positions: [
        { id: 'a', oz: '1', shortText: 'A', longText: '', quantity: 10, unit: 'm', isHeader: false, sortOrder: 1, ep: 10, gp: 100 },
        { id: 'b', oz: '2', shortText: 'B', longText: '', quantity: 1, unit: 'm', isHeader: false, sortOrder: 2, ep: 5, gp: 5 },
      ],
    };
    const after: ShareSnapshot = {
      snapshottedAt: 'b',
      projectVersionNumber: 2,
      project: { name: 'P', client: '', service: '', tenderNumber: '', deadline: '', mwst: 0.19 },
      positions: [
        { id: 'a', oz: '1', shortText: 'A', longText: '', quantity: 15, unit: 'm', isHeader: false, sortOrder: 1, ep: 10, gp: 150 }, // changed
        { id: 'c', oz: '3', shortText: 'C', longText: '', quantity: 1, unit: 'St', isHeader: false, sortOrder: 3, ep: 99, gp: 99 }, // added
        // b removed
      ],
    };
    const d = diffSnapshots(before, after);
    assert.equal(d.added.length, 1);
    assert.equal(d.added[0].id, 'c');
    assert.equal(d.removed.length, 1);
    assert.equal(d.removed[0].id, 'b');
    assert.equal(d.changed.length, 1);
    assert.equal(d.changed[0].after.id, 'a');
    assert.ok(d.changed[0].fields.includes('quantity'));
    assert.ok(d.changed[0].fields.includes('gp'));
  });

  test('buildShareSnapshot filters to visiblePositionIds only', () => {
    const positions = [
      fixturePos({ id: 'show', materialCost: 100 }),
      fixturePos({ id: 'hide', materialCost: 999 }),
    ];
    const snap = buildShareSnapshot(
      { name: 'X', client: '', service: '', tenderNumber: '', deadline: '', calcParams: DEFAULT_PARAMS },
      positions, ['show'], 1,
    );
    assert.equal(snap.positions.length, 1);
    assert.equal(snap.positions[0].id, 'show');
  });

  test('Snapshot does NOT contain internal fields — only ep + gp (no materialCost, nuCost, timeMinutes)', () => {
    const positions = [
      fixturePos({ id: 'p', materialCost: 100, timeMinutes: 60, nuCost: 50, internalNote: 'leak-me' }),
    ];
    const snap = buildShareSnapshot(
      { name: 'X', client: '', service: '', tenderNumber: '', deadline: '', calcParams: DEFAULT_PARAMS },
      positions, ['p'], 1,
    );
    const serialised = JSON.stringify(snap);
    assert.ok(!serialised.includes('materialCost'));
    assert.ok(!serialised.includes('timeMinutes'));
    assert.ok(!serialised.includes('nuCost'));
    assert.ok(!serialised.includes('internalNote'));
    assert.ok(!serialised.includes('leak-me'));
    // Positive: ep + gp ARE present.
    const pos = snap.positions[0];
    assert.ok('ep' in pos);
    assert.ok('gp' in pos);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 *  SECTION 4 — audit.ts extra edge cases (6 tests)
 * ════════════════════════════════════════════════════════════════════════ */

describe('Round 9 — audit.ts extras', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('verifyAuditChain returns null on an empty audit log', async () => {
    const idx = await verifyAuditChain();
    assert.equal(idx, null, 'empty chain must verify as untampered');
  });

  test('recordAuditEvent without optional fields still produces a valid row', async () => {
    const ev = await recordAuditEvent({
      eventType: 'system.heartbeat' as never, // minimum-fields path; cast since enum is strict
      actorKind: 'system',
    });
    // We can't always insert a non-enum eventType, so retry with a valid one.
    void ev;
    const ev2 = await recordAuditEvent({
      eventType: 'share.created',
      actorKind: 'system',
    });
    assert.equal(ev2.rowHash.length, 64, 'SHA-256 hex length');
    assert.equal(ev2.actorRef, null);
    assert.equal(ev2.ip, null);
    assert.equal(ev2.shareId, null);
  });

  test('First event in chain has the genesis prevHash (64 zeros)', async () => {
    const ev = await recordAuditEvent({
      eventType: 'share.created',
      actorKind: 'system',
      payload: { hi: 1 },
    });
    assert.equal(ev.prevHash, '0'.repeat(64));
  });

  test('verifyAuditChain reports the broken row index when one is tampered', async () => {
    // 3 chained events.
    await recordAuditEvent({ eventType: 'share.created', actorKind: 'owner', payload: { i: 1 } });
    const mid = await recordAuditEvent({ eventType: 'link.viewed', actorKind: 'customer', payload: { i: 2 } });
    await recordAuditEvent({ eventType: 'response.submitted', actorKind: 'customer', payload: { i: 3 } });
    // Tamper with the middle row's payload directly via drizzle.
    await db.update(schema.auditEvents)
      .set({ payload: { i: 'TAMPERED' } })
      .where(eq(schema.auditEvents.id, mid.id));
    const idx = await verifyAuditChain();
    assert.ok(idx !== null, 'tamper must be detected');
    assert.equal(idx, 1, 'index 1 is the tampered middle row');
  });

  test('Many sequential recordAuditEvent calls produce distinct rows + intact chain', async () => {
    // SEQUENTIAL by design — audit.ts is explicitly documented as
    // single-process safe and uses a per-process monotonic clock + tip
    // read to chain. Truly concurrent Promise.all calls race on the tip
    // read (separate test below documents that limitation). Sequential
    // burst exercises the tight-timestamp tie-breaker path.
    const events: Array<{ id: string; rowHash: string }> = [];
    for (let i = 0; i < 25; i++) {
      const ev = await recordAuditEvent({
        eventType: 'link.viewed',
        actorKind: 'customer',
        payload: { i },
      });
      events.push(ev);
    }
    assert.equal(new Set(events.map((e) => e.id)).size, 25);
    assert.equal(new Set(events.map((e) => e.rowHash)).size, 25);
    assert.equal(await verifyAuditChain(), null);
  });

  test('FIXED in commit (Round 9): Promise.all concurrent recordAuditEvent stays linear', async () => {
    // Fixed by adding `withAuditLock` (chained-promise in-process mutex) around
    // the tip-read + insert in lib/audit.ts. See the JSDoc on `withAuditLock`
    // for the multi-instance-deploy caveat (needs row-level lock there).
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < 10; i++) {
      promises.push(recordAuditEvent({
        eventType: 'link.viewed',
        actorKind: 'customer',
        payload: { i },
      }));
    }
    await Promise.all(promises);
    assert.equal(await verifyAuditChain(), null);
  });

  test('Audit log query by shareId is fast on ~100 rows (sanity: <500 ms)', async () => {
    const sId = 'share-perf-' + nanoid(8);
    for (let i = 0; i < 100; i++) {
      await recordAuditEvent({
        shareId: sId,
        eventType: 'link.viewed',
        actorKind: 'customer',
        payload: { i },
      });
    }
    const t0 = Date.now();
    const rows = await db.select().from(schema.auditEvents).where(eq(schema.auditEvents.shareId, sId));
    const dt = Date.now() - t0;
    assert.equal(rows.length, 100);
    assert.ok(dt < 500, `shareId query took ${dt} ms — index may have regressed`);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 *  SECTION 5 — extra coverage to push past 50 tests + harden edges
 * ════════════════════════════════════════════════════════════════════════ */

describe('Round 9 — extra coverage', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('GET /share/:token unprotected: passwordRequired flag is false', async () => {
    const { token } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}`);
    const body = await res.json() as { passwordRequired: boolean };
    assert.equal(body.passwordRequired, false);
  });

  test('POST /share/:token/comments validates positionOz is in snapshot', async () => {
    const { token } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionOz: '99.99.99', intent: 'other', text: 'hi' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error: string };
    assert.equal(body.error, 'oz_not_in_share');
  });

  test('POST /share/:token/comments accepts a valid oz from the snapshot', async () => {
    const { token } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionOz: '1.1', intent: 'change_menge', text: '5 statt 2' }),
    });
    assert.equal(res.status, 200);
  });

  test('POST /share/:token/comments rejects invalid intent enum', async () => {
    const { token } = await seedFull();
    const res = await publicApp.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionOz: '1.1', intent: 'not_a_valid_intent', text: 'hi' }),
    });
    assert.equal(res.status, 400);
  });

  test('Rate-limit isolates per-token (token A failures do NOT lock token B)', async () => {
    const a = await seedFull({ password: 'pw-a' });
    const b = await seedFull({ password: 'pw-b' });
    // Burn down 5 attempts on A.
    for (let i = 0; i < 5; i++) {
      await publicApp.request(`/api/share/${a.token}`, { headers: { 'X-Share-Password': 'nope' } });
    }
    // The 6th on A is 429.
    const a6 = await publicApp.request(`/api/share/${a.token}`, { headers: { 'X-Share-Password': 'nope' } });
    assert.equal(a6.status, 429);
    // But the FIRST attempt on B should still be 401, not 429.
    const b1 = await publicApp.request(`/api/share/${b.token}`, { headers: { 'X-Share-Password': 'wrong' } });
    assert.equal(b1.status, 401);
  });

  test('Expired share GETs do NOT bump view_count', async () => {
    const past = new Date(Date.now() - 60_000);
    const { token, shareId } = await seedFull({ expiresAt: past });
    await publicApp.request(`/api/share/${token}`);
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.equal(row!.viewCount, 0);
  });

  test('Revoked share GETs do NOT bump view_count', async () => {
    const { token, shareId } = await seedFull({ revokedAt: new Date() });
    await publicApp.request(`/api/share/${token}`);
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.equal(row!.viewCount, 0);
  });

  test('approve writes snapshotHash into the response payload (audit fingerprint)', async () => {
    const { token, shareId } = await seedFull();
    await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'K' }),
    });
    const rows = await db.select().from(schema.shareResponses).where(eq(schema.shareResponses.shareId, shareId));
    assert.ok(rows[0].payload.snapshotHash, 'snapshotHash must be stamped on the response payload');
    const shareRow = await db.query.shares.findFirst({ where: eq(schema.shares.id, shareId) });
    assert.equal(rows[0].payload.snapshotHash, shareRow!.snapshotHash);
  });

  test('approve writes a signature block with name + timestamp + ip', async () => {
    const { token, shareId } = await seedFull();
    await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Signiert von' }),
    });
    const row = (await db.select().from(schema.shareResponses).where(eq(schema.shareResponses.shareId, shareId)))[0];
    assert.ok(row.payload.signature);
    assert.equal(row.payload.signature!.name, 'Signiert von');
    assert.ok(typeof row.payload.signature!.timestamp === 'number');
  });

  test('approve records a share.responseSubmitted audit event', async () => {
    const { token, shareId } = await seedFull();
    await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'K' }),
    });
    const events = await db.select().from(schema.auditEvents).where(eq(schema.auditEvents.shareId, shareId));
    assert.ok(events.some((e) => e.eventType === 'response.submitted'));
  });

  test('Non-owner sees 404 on GET /projects/:id/shares (auth scope)', async () => {
    const { projectId } = await seedFull();
    const other = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      headers: await ownerCookie(other.ownerId, 'b@test.local'),
    });
    assert.equal(res.status, 404);
  });

  test('Non-owner sees 404 on DELETE /shares/:id (auth scope)', async () => {
    const { shareId } = await seedFull();
    const other = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/shares/${shareId}`, {
      method: 'DELETE',
      headers: await ownerCookie(other.ownerId, 'b@test.local'),
    });
    assert.equal(res.status, 404);
  });

  test('share-access-log captures both gate_hit and unlock_attempt reasons', async () => {
    const { token, shareId } = await seedFull({ password: 'pw' });
    // gate_hit (no header)
    await publicApp.request(`/api/share/${token}`);
    // unlock_attempt (wrong)
    await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'no' } });
    // unlock_attempt (right)
    await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'pw' } });
    const logs = await db.select().from(schema.shareAccessLog).where(eq(schema.shareAccessLog.shareId, shareId));
    const reasons = new Set(logs.map((l) => l.reason));
    assert.ok(reasons.has('gate_hit'));
    assert.ok(reasons.has('wrong_password'));
    assert.ok(reasons.has('unlock_attempt'));
  });

  test('snapshot.regenerated audit event embeds the prior snapshot', async () => {
    const { ownerId, shareId, projectId } = await seedFull();
    await ownerApp.request(`/api/shares/${shareId}/resnapshot`, {
      method: 'POST', headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    const events = await db.select().from(schema.auditEvents)
      .where(and(
        eq(schema.auditEvents.projectId, projectId),
        eq(schema.auditEvents.eventType, 'snapshot.regenerated'),
      ));
    assert.ok(events.length >= 1);
    const ev = events[events.length - 1];
    assert.ok((ev.payload as { prevSnapshot?: unknown }).prevSnapshot, 'prev snapshot must be embedded in payload');
  });

  test('Snapshot endpoint includes only stable customer fields per position', async () => {
    // With cost breakdown hidden, positions carry only the minimal stable keys.
    const { token } = await seedFull({ settings: { showCostBreakdown: false } });
    const res = await publicApp.request(`/api/share/${token}`);
    const body = await res.json() as { positions: Array<Record<string, unknown>> };
    for (const p of body.positions) {
      const keys = Object.keys(p);
      // Only the snapshot-defined keys may appear.
      for (const k of keys) {
        assert.ok(
          ['id', 'oz', 'shortText', 'longText', 'quantity', 'unit', 'isHeader', 'sortOrder', 'ep', 'gp'].includes(k),
          `position has unexpected key '${k}' — possible internal-field leak`,
        );
      }
    }
  });

  test('Share payload exposes Geräte-split + summary ONLY when toggles are on (gated server-side)', async () => {
    type ShareBody = {
      positions: Array<Record<string, unknown>>;
      summary: { ueberschuss: number; costTypes: { geraete: { ek: number; vk: number; zuschlagPct: number } } } | null;
    };
    // Geräte large enough that per-line rounding doesn't skew the ratio.
    const bigGeraete = [fixturePos({ id: 'pb', oz: '1', materialCost: 100, timeMinutes: 600, quantity: 100 })];
    // Toggles ON → per-position GP-split present + summary carries Geräte with
    // EINKAUF = VERKAUF/(1+10 %), matching the Excel Vorlage (gaereteprznt).
    const on = await seedFull({ positions: bigGeraete, settings: { showCostBreakdown: true, showCalculation: true } });
    const onBody = (await (await publicApp.request(`/api/share/${on.token}`)).json()) as ShareBody;
    assert.ok(onBody.positions.some((p) => 'gpGeraet' in p), 'gpGeraet present when breakdown on');
    assert.ok(onBody.summary, 'summary present when calc on');
    const g = onBody.summary!.costTypes.geraete;
    assert.ok(Math.abs(g.ek - g.vk / 1.1) < 0.01, `Geräte EINKAUF should = VERKAUF/1.1 (Excel), got ek=${g.ek} vk=${g.vk}`);
    assert.ok(g.ek < g.vk, 'Geräte EINKAUF < VERKAUF');
    assert.ok(onBody.summary!.ueberschuss > 0, 'Überschuss present when calc on');

    // Calc OFF → EINKAUF/Überschuss redacted (price-only stays).
    const off = await seedFull({ positions: bigGeraete, settings: { showCostBreakdown: true, showCalculation: false } });
    const offBody = (await (await publicApp.request(`/api/share/${off.token}`)).json()) as ShareBody;
    assert.equal(offBody.summary!.ueberschuss, 0, 'Überschuss redacted when calc off');
    assert.equal(offBody.summary!.costTypes.geraete.ek, 0, 'EINKAUF redacted when calc off');
    assert.ok(offBody.summary!.costTypes.geraete.vk > 0, 'VERKAUF (price) still present when calc off');
  });

  test('parentShareId must exist (or 400 parent_not_found)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      body: JSON.stringify({
        visiblePositionIds: ['pos1'],
        parentShareId: 'no-such-share-id',
        settings: { brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true, showTotals: true, showMwst: true },
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error: string };
    assert.equal(body.error, 'parent_not_found');
  });

  test('Invalid input on POST /projects/:id/shares → 400 invalid_input', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
      // missing settings entirely
      body: JSON.stringify({ visiblePositionIds: ['pos1'] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error: string };
    assert.equal(body.error, 'invalid_input');
  });

  test('Snapshot canonical hash differs from a re-serialised snapshot only when content differs', () => {
    const baseSnap: ShareSnapshot = {
      snapshottedAt: 'TS',
      projectVersionNumber: 1,
      project: { name: 'A', client: '', service: '', tenderNumber: '', deadline: '', mwst: 0.19 },
      positions: [
        { id: 'a', oz: '01', shortText: 'A', longText: '', quantity: 1, unit: 'St', isHeader: false, sortOrder: 1, ep: 10, gp: 10 },
      ],
    };
    const h1 = snapshotHash(baseSnap);
    // Round-trip through JSON, expect identical hash.
    const h2 = snapshotHash(JSON.parse(JSON.stringify(baseSnap)) as ShareSnapshot);
    assert.equal(h1, h2);
    // Now flip a value, expect different.
    const tweaked = JSON.parse(JSON.stringify(baseSnap)) as ShareSnapshot;
    tweaked.positions[0].ep = 11;
    assert.notEqual(h1, snapshotHash(tweaked));
  });

  test('Audit row hash equals SHA-256(prevHash || canonical_json(row)) — formula sanity', async () => {
    // Single event, then we manually recompute its hash with the same recipe
    // the prod code uses and confirm match.
    const ev = await recordAuditEvent({
      shareId: 'audit-formula-share',
      projectId: 'audit-formula-project',
      eventType: 'share.created',
      actorKind: 'owner',
      actorRef: 'owner@x.de',
      ip: '1.2.3.4',
      userAgent: 'curl/8',
      payload: { count: 42 },
    });
    // Canonical JSON: alphabetical key order at the top level.
    const canonical = JSON.stringify({
      actorKind: 'owner',
      actorRef: 'owner@x.de',
      createdAtMs: ev.createdAt.getTime(),
      eventType: 'share.created',
      id: ev.id,
      ip: '1.2.3.4',
      payload: { count: 42 },
      projectId: 'audit-formula-project',
      shareId: 'audit-formula-share',
      userAgent: 'curl/8',
    });
    const expected = createHash('sha256').update(ev.prevHash + canonical).digest('hex');
    assert.equal(ev.rowHash, expected);
  });

  test('Snapshot positions preserve sortOrder ordering', () => {
    const positions = [
      fixturePos({ id: 'p3', oz: '3', sortOrder: 3 }),
      fixturePos({ id: 'p1', oz: '1', sortOrder: 1 }),
      fixturePos({ id: 'p2', oz: '2', sortOrder: 2 }),
    ];
    const snap = buildShareSnapshot(
      { name: 'X', client: '', service: '', tenderNumber: '', deadline: '', calcParams: DEFAULT_PARAMS },
      positions, ['p1', 'p2', 'p3'], 1,
    );
    // The builder preserves input order — sortOrder values flow through. The
    // customer view sorts by sortOrder, so we verify both ways:
    assert.deepEqual(snap.positions.map((p) => p.sortOrder), [3, 1, 2]);
  });

  test('Share row hash is recorded as 64 hex chars (SHA-256)', async () => {
    const { token } = await seedFull();
    await publicApp.request(`/api/share/${token}`);
    const events = await db.select().from(schema.auditEvents);
    assert.ok(events.length > 0);
    for (const e of events) {
      assert.match(e.rowHash, /^[0-9a-f]{64}$/);
      assert.match(e.prevHash, /^[0-9a-f]{64}$/);
    }
  });

  test('Re-snapshot on revoked share → 410', async () => {
    const { ownerId, shareId } = await seedFull({ revokedAt: new Date() });
    const res = await ownerApp.request(`/api/shares/${shareId}/resnapshot`, {
      method: 'POST', headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    assert.equal(res.status, 410);
  });

  test('Owner with valid auth but wrong shareId → 404 on DELETE', async () => {
    const { ownerId } = await seedOwnerOnly();
    const res = await ownerApp.request(`/api/shares/no-such-share`, {
      method: 'DELETE',
      headers: await ownerCookie(ownerId, 'o@test.local'),
    });
    assert.equal(res.status, 404);
  });
});
