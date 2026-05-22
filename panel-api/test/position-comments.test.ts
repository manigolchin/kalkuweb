/**
 * PART K tests: per-position comment endpoints.
 *   POST /api/share/:token/comments  — customer-facing, gated by share password
 *   GET  /api/projects/:id/comments         — owner-auth (mocked here)
 *   GET  /api/projects/:id/comments/counts  — owner-auth (mocked here)
 *
 * Uses the same shared-DB pattern as share-gate.test.ts. Owner endpoints
 * are tested via direct route invocation (the requireAuth middleware reads
 * `userId` from the context — we set it via a wrapping handler).
 */

import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-pk-'));
process.env.DB_PATH = join(tmpDir, 'test.db');

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { publicRoute } = await import('../src/routes/public.js');
const { sharesRoute } = await import('../src/routes/shares.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');
const bcrypt = (await import('bcryptjs')).default;

const app = new Hono();
app.route('/api', publicRoute);

// Owner endpoints go through `requireAuth`, which reads a JWT from the
// kalku_session cookie. We generate a real JWT per-test and attach it as
// a Cookie header — exercises the actual auth path end-to-end.
const ownerApp = new Hono();
ownerApp.route('/api', sharesRoute);

async function ownerHeaders(userId: string, email: string): Promise<{ Cookie: string }> {
  const token = await signToken({ sub: userId, email });
  return { Cookie: `${COOKIE_NAME}=${token}` };
}

async function seedAll(opts: { password?: string } = {}): Promise<{
  token: string; shareId: string; projectId: string; ownerId: string;
}> {
  const now = new Date();
  const ownerId = nanoid(16);
  const projectId = nanoid(16);
  const shareId = nanoid(16);
  const token = nanoid(32);

  await db.insert(schema.users).values({
    id: ownerId, email: `${ownerId}@test.local`, passwordHash: 'unused',
    name: 'Owner', companyName: 'TestCo', companyLogoUrl: '',
    companyPhone: '', companyContactEmail: '',
    mustChangePassword: false, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.projects).values({
    id: projectId, ownerId,
    data: {
      name: 'P', client: 'C', service: 'S',
      tenderNumber: '', deadline: '', bidder: '',
      calcParams: {
        mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
        geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
        tagesstunden: 8, personaleinsatz: 3, mwst: 0.19,
      },
      positions: [
        {
          id: 'pos1', oz: '1.4.1.1', shortText: 'RZA01', longText: '', hinweisText: '',
          quantity: 4, unit: 'St', materialCost: 148, timeMinutes: 36, nuCost: 0,
          isHeader: false, sortOrder: 1, sectionPath: '',
          epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
          visibleToCustomer: true,
        },
      ],
    },
    versionNumber: 1, createdAt: now, updatedAt: now,
  });
  const passwordHash = opts.password ? await bcrypt.hash(opts.password, 8) : null;
  await db.insert(schema.shares).values({
    id: shareId, projectId, token,
    visiblePositionIds: ['pos1'],
    settings: {
      brandHeader: 'co-branded' as const,
      allowApproval: true, allowChangeRequests: true,
      showTotals: true, showMwst: true,
    },
    snapshotData: {
      snapshottedAt: now.toISOString(),
      projectVersionNumber: 1,
      project: { name: 'P', client: 'C', service: 'S', tenderNumber: '', deadline: '', mwst: 0.19 },
      positions: [
        { id: 'pos1', oz: '1.4.1.1', shortText: 'RZA01', longText: '',
          quantity: 4, unit: 'St', isHeader: false, sortOrder: 1, ep: 200, gp: 800 },
      ],
    },
    snapshotHash: 'h0', snapshotVersion: 1, passwordHash,
    expiresAt: null, createdAt: now, viewCount: 0,
  });
  return { token, shareId, projectId, ownerId };
}

before(() => { runMigrations(); });

async function cleanupAll(): Promise<void> {
  await db.delete(schema.shareAccessLog);
  await db.delete(schema.positionComments);
  await db.delete(schema.shareResponses);
  await db.delete(schema.auditEvents);
  await db.delete(schema.viewPresets);
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}

describe('PART K — POST /share/:token/comments', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('happy path: unprotected share, valid body → 200 + persisted', async () => {
    const { token, projectId, ownerId } = await seedAll();
    const res = await app.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionOz: '1.4.1.1',
        intent: 'change_menge',
        text: '6 Stück bitte',
        authorName: 'Kunde Schmidt',
        authorEmail: 'k@example.de',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { ok: boolean; id: string; positionOz: string };
    assert.equal(body.ok, true);
    assert.equal(body.positionOz, '1.4.1.1');

    // verify persisted via the owner-side counts endpoint
    const counts = await ownerApp.request(`/api/projects/${projectId}/comments/counts`, {
      headers: await ownerHeaders(ownerId, 'owner@test.local'),
    });
    assert.equal(counts.status, 200);
    const cBody = await counts.json() as { counts: Record<string, { total: number }> };
    assert.equal(cBody.counts['1.4.1.1']?.total, 1);
  });

  test('rejects positionOz not in the share snapshot → 400', async () => {
    const { token } = await seedAll();
    const res = await app.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionOz: '9.9.9', // not in the share
        intent: 'other',
        text: 'should be rejected',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error: string };
    assert.equal(body.error, 'oz_not_in_share');
  });

  test('rejects invalid intent enum → 400', async () => {
    const { token } = await seedAll();
    const res = await app.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionOz: '1.4.1.1',
        intent: 'shenanigans',
        text: 'invalid intent',
      }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects empty text → 400', async () => {
    const { token } = await seedAll();
    const res = await app.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionOz: '1.4.1.1',
        intent: 'other',
        text: '   ',
      }),
    });
    assert.equal(res.status, 400);
  });

  test('password-protected share: POST without header → 401', async () => {
    const { token } = await seedAll({ password: 'sekret' });
    const res = await app.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionOz: '1.4.1.1', intent: 'other', text: 'hi' }),
    });
    assert.equal(res.status, 401);
  });

  test('password-protected share: POST WITH correct header → 200', async () => {
    const { token } = await seedAll({ password: 'sekret' });
    const res = await app.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Share-Password': 'sekret' },
      body: JSON.stringify({ positionOz: '1.4.1.1', intent: 'other', text: 'hi' }),
    });
    assert.equal(res.status, 200);
  });
});

describe('PART K — GET /projects/:id/comments(+counts)', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('aggregates comments across multiple submissions for same OZ', async () => {
    const { token, projectId, ownerId } = await seedAll();
    for (const text of ['eins', 'zwei', 'drei']) {
      await app.request(`/api/share/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionOz: '1.4.1.1', intent: 'other', text }),
      });
    }
    const headers = await ownerHeaders(ownerId, 'owner@test.local');
    const list = await ownerApp.request(`/api/projects/${projectId}/comments`, { headers });
    assert.equal(list.status, 200);
    const listBody = await list.json() as { comments: unknown[]; grouped: Record<string, unknown[]> };
    assert.equal(listBody.comments.length, 3);
    assert.equal(listBody.grouped['1.4.1.1'].length, 3);

    const counts = await ownerApp.request(`/api/projects/${projectId}/comments/counts`, { headers });
    const countsBody = await counts.json() as { counts: Record<string, { total: number; unresolved: number }> };
    assert.equal(countsBody.counts['1.4.1.1'].total, 3);
    assert.equal(countsBody.counts['1.4.1.1'].unresolved, 3);
  });

  test('returns empty counts when project has no comments', async () => {
    const { projectId, ownerId } = await seedAll();
    const counts = await ownerApp.request(`/api/projects/${projectId}/comments/counts`, {
      headers: await ownerHeaders(ownerId, 'owner@test.local'),
    });
    assert.equal(counts.status, 200);
    const body = await counts.json() as { counts: Record<string, unknown> };
    assert.deepEqual(body.counts, {});
  });

  /**
   * Round 6 PART Z leak guard: the counts endpoint must NEVER carry
   * comment author email / text / authorName / message into its response.
   * Even though the endpoint is owner-auth (so a KUNDEN-side request can
   * never reach it), the frontend INTERN view passes its result through
   * the same React tree as the KUNDEN preview — a regression that exposed
   * author email here would land in the DOM the customer can inspect.
   */
  test('counts endpoint response carries NO author fields (leak guard)', async () => {
    const { token, projectId, ownerId } = await seedAll();
    // Post a comment with an author email + a distinctive body.
    await app.request(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionOz: '1.4.1.1',
        intent: 'other',
        text: '__LEAK_GUARD_CANARY_TEXT__',
        authorName: '__LEAK_GUARD_AUTHOR__',
        authorEmail: 'leak-guard@example.com',
      }),
    });
    const counts = await ownerApp.request(`/api/projects/${projectId}/comments/counts`, {
      headers: await ownerHeaders(ownerId, 'owner@test.local'),
    });
    assert.equal(counts.status, 200);
    const raw = await counts.text();
    assert.ok(!raw.includes('__LEAK_GUARD_CANARY_TEXT__'), 'comment text leaked into counts response');
    assert.ok(!raw.includes('__LEAK_GUARD_AUTHOR__'), 'authorName leaked into counts response');
    assert.ok(!raw.includes('leak-guard@example.com'), 'authorEmail leaked into counts response');
    // Positive check: the endpoint DOES still surface the count.
    const body = JSON.parse(raw) as { counts: Record<string, { total: number }> };
    assert.equal(body.counts['1.4.1.1'].total, 1);
  });
});
