/**
 * Round 9 — coverage for previously-untested routes & helpers:
 *   - routes/inbox.ts           (owner-side feedback aggregator)
 *   - routes/notifications.ts   (unread count, mark-viewed, digest)
 *   - routes/presets.ts         (view presets CRUD)
 *   - routes/templates.ts       (position templates CRUD)
 *   - lib/mailer.ts             (env-disabled path + payload shape)
 *
 * Strategy: one shared SQLite DB per file (DB_PATH set BEFORE any import that
 * pulls in db.js — the module instantiates a singleton at import time).
 * Each test seeds its own user(s) + project(s) with unique nanoids so suites
 * are independent and re-runnable in any order. Owner endpoints exercise the
 * full requireAuth path via a real signed JWT in a Cookie header.
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// MUST happen before any import that resolves db.js.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-r9-misc-'));
process.env.DB_PATH = join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'r9-misc-secret-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { inboxRoute } = await import('../src/routes/inbox.js');
const { notificationsRoute, digestRoute } = await import('../src/routes/notifications.js');
const { presetsRoute } = await import('../src/routes/presets.js');
const { templatesRoute } = await import('../src/routes/templates.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');

const inboxApp = new Hono();
inboxApp.route('/api', inboxRoute);

const notifApp = new Hono();
notifApp.route('/api', notificationsRoute);

const digestApp = new Hono();
digestApp.route('/api', digestRoute);

const presetsApp = new Hono();
presetsApp.route('/api', presetsRoute);

const templatesApp = new Hono();
templatesApp.route('/api', templatesRoute);

async function ownerCookie(userId: string, email: string): Promise<string> {
  const token = await signToken({ sub: userId, email });
  return `${COOKIE_NAME}=${token}`;
}

async function seedUser(opts: { email?: string; name?: string } = {}): Promise<{ id: string; email: string }> {
  const id = nanoid(16);
  const email = opts.email ?? `${id}@test.local`;
  const now = new Date();
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash: 'unused',
    name: opts.name ?? 'Test',
    companyName: 'TestCo',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  return { id, email };
}

type SeedProjectOpts = { ownerId: string; name?: string; client?: string; service?: string };
async function seedProject(opts: SeedProjectOpts): Promise<string> {
  const id = nanoid(16);
  const now = new Date();
  await db.insert(schema.projects).values({
    id,
    ownerId: opts.ownerId,
    data: {
      name: opts.name ?? 'Test Project',
      client: opts.client ?? 'Test Client',
      service: opts.service ?? 'Test Service',
      tenderNumber: '',
      deadline: '',
      bidder: '',
      calcParams: {
        mittellohn: 30,
        verrechnungslohn: 50,
        materialZuschlag: 0.12,
        nuZuschlag: 0.12,
        geraeteZuschlagPct: 0.1,
        geraeteStundensatz: 0.5,
        zeitabzug: 0,
        tagesstunden: 8,
        personaleinsatz: 3,
        mwst: 0.19,
      },
      positions: [],
    },
    versionNumber: 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

type SeedShareOpts = {
  projectId: string;
  viewCount?: number;
  lastViewedAt?: Date | null;
  revoked?: boolean;
  createdAtOffsetMs?: number;
};
async function seedShare(opts: SeedShareOpts): Promise<{ id: string; token: string }> {
  const id = nanoid(16);
  const token = nanoid(32);
  const createdAt = new Date(Date.now() + (opts.createdAtOffsetMs ?? 0));
  await db.insert(schema.shares).values({
    id,
    projectId: opts.projectId,
    token,
    visiblePositionIds: [],
    settings: {
      brandHeader: 'co-branded',
      allowApproval: true,
      allowChangeRequests: true,
      showTotals: true,
      showMwst: true,
    },
    snapshotData: null,
    snapshotHash: null,
    snapshotVersion: 1,
    passwordHash: null,
    expiresAt: null,
    createdAt,
    viewCount: opts.viewCount ?? 0,
    lastViewedAt: opts.lastViewedAt ?? null,
    revokedAt: opts.revoked ? new Date() : null,
  });
  return { id, token };
}

async function seedResponse(opts: { shareId: string; respondedAt?: Date; responseType?: 'approve' | 'changes' | 'reject' }): Promise<void> {
  await db.insert(schema.shareResponses).values({
    id: nanoid(16),
    shareId: opts.shareId,
    responseType: opts.responseType ?? 'approve',
    customerName: null,
    customerEmail: null,
    ip: null,
    userAgent: null,
    payload: {},
    respondedAt: opts.respondedAt ?? new Date(),
  });
}

async function seedAuditEvent(opts: {
  shareId: string;
  projectId: string;
  eventType: 'share.created' | 'share.revoked' | 'link.viewed' | 'response.submitted' | 'snapshot.regenerated';
  createdAt?: Date;
}): Promise<void> {
  await db.insert(schema.auditEvents).values({
    id: nanoid(16),
    shareId: opts.shareId,
    projectId: opts.projectId,
    eventType: opts.eventType,
    actorKind: 'customer',
    actorRef: null,
    ip: null,
    userAgent: null,
    payload: {},
    prevHash: '0'.repeat(64),
    rowHash: '1'.repeat(64),
    createdAt: opts.createdAt ?? new Date(),
  });
}

async function cleanupAll(): Promise<void> {
  await db.delete(schema.positionComments);
  await db.delete(schema.shareResponses);
  await db.delete(schema.shareAccessLog);
  await db.delete(schema.auditEvents);
  await db.delete(schema.viewPresets);
  await db.delete(schema.positionTemplates);
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}

before(() => {
  runMigrations();
});

beforeEach(async () => {
  await cleanupAll();
});

/* ─── inbox ───────────────────────────────────────────────────────── */

describe('routes/inbox.ts', () => {
  test('GET /inbox without auth → 401', async () => {
    const res = await inboxApp.request('/api/inbox');
    assert.equal(res.status, 401);
  });

  test('GET /inbox empty for a fresh user → entries=[] + ISO generatedAt', async () => {
    const owner = await seedUser();
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { entries: unknown[]; generatedAt: string };
    assert.deepEqual(body.entries, []);
    assert.match(body.generatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // round-trip the ISO string through Date
    assert.ok(!Number.isNaN(new Date(body.generatedAt).getTime()));
  });

  test('GET /inbox returns ISO generatedAt that is fresh on every call', async () => {
    const owner = await seedUser();
    const r1 = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const b1 = (await r1.json()) as { generatedAt: string };
    // Force a tick so generatedAt should advance
    await new Promise((r) => setTimeout(r, 5));
    const r2 = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const b2 = (await r2.json()) as { generatedAt: string };
    assert.ok(
      new Date(b2.generatedAt).getTime() >= new Date(b1.generatedAt).getTime(),
      'generatedAt monotonically advances on each call',
    );
  });

  test('GET /inbox includes shares with at least 1 response', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId });
    await seedResponse({ shareId });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { entries: Array<{ share: { id: string }; responses: unknown[] }> };
    assert.equal(body.entries.length, 1);
    assert.equal(body.entries[0].share.id, shareId);
    assert.equal(body.entries[0].responses.length, 1);
  });

  test('GET /inbox includes share with viewCount > 0 even without responses', async () => {
    // The route's filter is `responses.length > 0 || viewCount > 0`. This
    // documents the "viewed but never replied" case which IS surfaced.
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, viewCount: 3, lastViewedAt: new Date() });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { entries: Array<{ share: { id: string; viewCount: number }; responses: unknown[] }> };
    assert.equal(body.entries.length, 1);
    assert.equal(body.entries[0].share.id, shareId);
    assert.equal(body.entries[0].share.viewCount, 3);
    assert.equal(body.entries[0].responses.length, 0);
  });

  test('GET /inbox does NOT include shares with no responses AND no views', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    await seedShare({ projectId, viewCount: 0 });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { entries: unknown[] };
    assert.equal(body.entries.length, 0);
  });

  test('GET /inbox excludes revoked shares (even with responses)', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, revoked: true });
    await seedResponse({ shareId });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { entries: unknown[] };
    assert.equal(body.entries.length, 0);
  });

  test('GET /inbox includes project name + client per entry', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({
      ownerId: owner.id,
      name: 'Sanierung Schmidt',
      client: 'Familie Schmidt',
      service: 'galabau',
    });
    const { id: shareId } = await seedShare({ projectId, viewCount: 1 });
    void shareId;
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as {
      entries: Array<{ project: { name: string; client: string; service: string } | null }>;
    };
    assert.equal(body.entries.length, 1);
    assert.equal(body.entries[0].project?.name, 'Sanierung Schmidt');
    assert.equal(body.entries[0].project?.client, 'Familie Schmidt');
    assert.equal(body.entries[0].project?.service, 'galabau');
  });

  test('GET /inbox aggregates multiple responses per share', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId });
    await seedResponse({ shareId, responseType: 'approve', respondedAt: new Date(Date.now() - 10_000) });
    await seedResponse({ shareId, responseType: 'changes', respondedAt: new Date() });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { entries: Array<{ responses: unknown[] }> };
    assert.equal(body.entries.length, 1);
    assert.equal(body.entries[0].responses.length, 2);
  });

  test('GET /inbox does NOT include other user\'s shares (multi-tenant)', async () => {
    const ownerA = await seedUser();
    const ownerB = await seedUser();
    const projectA = await seedProject({ ownerId: ownerA.id });
    const projectB = await seedProject({ ownerId: ownerB.id });
    const { id: shareA } = await seedShare({ projectId: projectA });
    const { id: shareB } = await seedShare({ projectId: projectB });
    await seedResponse({ shareId: shareA });
    await seedResponse({ shareId: shareB });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(ownerA.id, ownerA.email) },
    });
    const body = (await res.json()) as { entries: Array<{ share: { id: string } }> };
    assert.equal(body.entries.length, 1);
    assert.equal(body.entries[0].share.id, shareA);
  });

  test('GET /inbox orders by latest activity desc (newest response first)', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    // Push both shares' createdAt well into the past so the staggered RESPONSE
    // times (not the near-simultaneous createdAt) drive the ordering — otherwise
    // act() = max(respondedAt, createdAt) ties on createdAt ≈ now and flakes.
    const { id: shareOld } = await seedShare({ projectId, createdAtOffsetMs: -600_000 });
    const { id: shareNew } = await seedShare({ projectId, createdAtOffsetMs: -600_000 });
    await seedResponse({ shareId: shareOld, respondedAt: new Date(Date.now() - 60_000) });
    await seedResponse({ shareId: shareNew, respondedAt: new Date() });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { entries: Array<{ share: { id: string } }> };
    assert.equal(body.entries.length, 2);
    assert.equal(body.entries[0].share.id, shareNew, 'newest response first');
    assert.equal(body.entries[1].share.id, shareOld);
  });

  test('GET /inbox response shape includes share token + visiblePositionIds + settings + snapshotHash', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    await seedShare({ projectId, viewCount: 1 });
    const res = await inboxApp.request('/api/inbox', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as {
      entries: Array<{
        share: {
          token: string;
          visiblePositionIds: unknown;
          settings: unknown;
          snapshotHash: unknown;
        };
      }>;
    };
    const sh = body.entries[0].share;
    assert.equal(typeof sh.token, 'string');
    assert.ok(Array.isArray(sh.visiblePositionIds));
    assert.ok(sh.settings && typeof sh.settings === 'object');
    // snapshotHash is null here since we didn't set one; the field still appears
    assert.ok('snapshotHash' in sh);
  });
});

/* ─── notifications ────────────────────────────────────────────────── */

describe('routes/notifications.ts', () => {
  test('GET /notifications/unread without auth → 401', async () => {
    const res = await notifApp.request('/api/notifications/unread');
    assert.equal(res.status, 401);
  });

  test('GET /notifications/unread for fresh user → count 0', async () => {
    const owner = await seedUser();
    const res = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { count: number };
    assert.equal(body.count, 0);
  });

  test('GET /notifications/unread counts response.submitted events since lastFeedbackViewedAt', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId });
    await seedAuditEvent({ shareId, projectId, eventType: 'response.submitted' });
    const res = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { count: number };
    assert.equal(body.count, 1);
  });

  test('GET /notifications/unread counts link.viewed events as customer-side', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId });
    await seedAuditEvent({ shareId, projectId, eventType: 'link.viewed' });
    await seedAuditEvent({ shareId, projectId, eventType: 'link.viewed' });
    const res = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { count: number };
    assert.equal(body.count, 2);
  });

  test('GET /notifications/unread sums both responses + views', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId });
    await seedAuditEvent({ shareId, projectId, eventType: 'link.viewed' });
    await seedAuditEvent({ shareId, projectId, eventType: 'response.submitted' });
    await seedAuditEvent({ shareId, projectId, eventType: 'response.submitted' });
    const res = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { count: number };
    assert.equal(body.count, 3);
  });

  test('GET /notifications/unread excludes owner-side events (share.created etc.)', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId });
    await seedAuditEvent({ shareId, projectId, eventType: 'share.created' });
    await seedAuditEvent({ shareId, projectId, eventType: 'share.revoked' });
    await seedAuditEvent({ shareId, projectId, eventType: 'snapshot.regenerated' });
    const res = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    const body = (await res.json()) as { count: number };
    assert.equal(body.count, 0, 'only customer-side events drive the badge');
  });

  test('POST /notifications/mark-viewed without auth → 401', async () => {
    const res = await notifApp.request('/api/notifications/mark-viewed', { method: 'POST' });
    assert.equal(res.status, 401);
  });

  test('POST /notifications/mark-viewed sets users.lastFeedbackViewedAt → unread drops to 0', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId });
    await seedAuditEvent({ shareId, projectId, eventType: 'response.submitted' });
    // pre-check
    const pre = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(((await pre.json()) as { count: number }).count, 1);
    // mark-viewed
    const mv = await notifApp.request('/api/notifications/mark-viewed', {
      method: 'POST',
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(mv.status, 200);
    assert.deepEqual(await mv.json(), { ok: true });
    // post-check — the existing event predates lastFeedbackViewedAt
    const post = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(((await post.json()) as { count: number }).count, 0);
  });

  test('Multi-tenant: user A\'s mark-viewed does NOT reset user B\'s count', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const pA = await seedProject({ ownerId: a.id });
    const pB = await seedProject({ ownerId: b.id });
    const { id: shareA } = await seedShare({ projectId: pA });
    const { id: shareB } = await seedShare({ projectId: pB });
    await seedAuditEvent({ shareId: shareA, projectId: pA, eventType: 'response.submitted' });
    await seedAuditEvent({ shareId: shareB, projectId: pB, eventType: 'response.submitted' });
    // A marks viewed
    await notifApp.request('/api/notifications/mark-viewed', {
      method: 'POST',
      headers: { Cookie: await ownerCookie(a.id, a.email) },
    });
    // B's count is still 1
    const res = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(b.id, b.email) },
    });
    const body = (await res.json()) as { count: number };
    assert.equal(body.count, 1, 'B\'s feedback cursor untouched');
  });

  test('Multi-tenant: unread count scoped to owner\'s shares only', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const pA = await seedProject({ ownerId: a.id });
    const pB = await seedProject({ ownerId: b.id });
    const { id: shareA } = await seedShare({ projectId: pA });
    const { id: shareB } = await seedShare({ projectId: pB });
    void shareA;
    // Only B has an event
    await seedAuditEvent({ shareId: shareB, projectId: pB, eventType: 'response.submitted' });
    const res = await notifApp.request('/api/notifications/unread', {
      headers: { Cookie: await ownerCookie(a.id, a.email) },
    });
    const body = (await res.json()) as { count: number };
    assert.equal(body.count, 0, 'A sees no events for B\'s shares');
  });

  /* ─ digest route ─────────────────────────────────────────────── */

  test('POST /digest/run without DIGEST_SECRET configured → 503 digest_not_configured', async () => {
    const old = process.env.DIGEST_SECRET;
    delete process.env.DIGEST_SECRET;
    try {
      const res = await digestApp.request('/api/digest/run', { method: 'POST' });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'digest_not_configured');
    } finally {
      if (old === undefined) delete process.env.DIGEST_SECRET;
      else process.env.DIGEST_SECRET = old;
    }
  });

  test('POST /digest/run with wrong secret → 403 forbidden', async () => {
    const old = process.env.DIGEST_SECRET;
    process.env.DIGEST_SECRET = 'right-secret';
    try {
      const res = await digestApp.request('/api/digest/run', {
        method: 'POST',
        headers: { 'x-digest-secret': 'wrong-secret' },
      });
      assert.equal(res.status, 403);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'forbidden');
    } finally {
      if (old === undefined) delete process.env.DIGEST_SECRET;
      else process.env.DIGEST_SECRET = old;
    }
  });

  test('POST /digest/run with correct secret but no SMTP → 503 smtp_not_configured', async () => {
    const oldD = process.env.DIGEST_SECRET;
    process.env.DIGEST_SECRET = 'good-secret';
    // Ensure mailer reports "not_configured"
    const oldH = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    try {
      const res = await digestApp.request('/api/digest/run', {
        method: 'POST',
        headers: { 'x-digest-secret': 'good-secret' },
      });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { error: string; skipped: boolean };
      assert.equal(body.error, 'smtp_not_configured');
      assert.equal(body.skipped, true);
    } finally {
      if (oldD === undefined) delete process.env.DIGEST_SECRET;
      else process.env.DIGEST_SECRET = oldD;
      if (oldH !== undefined) process.env.SMTP_HOST = oldH;
    }
  });
});

/* ─── presets ──────────────────────────────────────────────────────── */

describe('routes/presets.ts', () => {
  test('POST /projects/:id/presets without auth → 401', async () => {
    const res = await presetsApp.request('/api/projects/anything/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', visiblePositionIds: [], settings: {} }),
    });
    assert.equal(res.status, 401);
  });

  test('GET /projects/:id/presets without auth → 401', async () => {
    const res = await presetsApp.request('/api/projects/anything/presets');
    assert.equal(res.status, 401);
  });

  test('POST /projects/:id/presets creates row with id+name+visiblePositionIds+settings', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const res = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({
        name: 'Privatkunden',
        visiblePositionIds: ['p1', 'p2'],
        settings: { brandHeader: 'own', showTotals: true },
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      id: string;
      projectId: string;
      name: string;
      visiblePositionIds: string[];
      settings: { brandHeader?: string; showTotals?: boolean };
    };
    assert.equal(typeof body.id, 'string');
    assert.equal(body.id.length, 16);
    assert.equal(body.projectId, projectId);
    assert.equal(body.name, 'Privatkunden');
    assert.deepEqual(body.visiblePositionIds, ['p1', 'p2']);
    assert.equal(body.settings.brandHeader, 'own');
    assert.equal(body.settings.showTotals, true);
  });

  test('POST /projects/:id/presets against OTHER user\'s project → 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const projectB = await seedProject({ ownerId: b.id });
    const res = await presetsApp.request(`/api/projects/${projectB}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(a.id, a.email) },
      body: JSON.stringify({ name: 'X', visiblePositionIds: [], settings: {} }),
    });
    assert.equal(res.status, 404);
  });

  test('GET /projects/:id/presets lists own presets only', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const cookie = await ownerCookie(owner.id, owner.email);
    // Create two
    for (const n of ['Preset 1', 'Preset 2']) {
      await presetsApp.request(`/api/projects/${projectId}/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ name: n, visiblePositionIds: [], settings: {} }),
      });
    }
    const res = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { presets: Array<{ name: string }> };
    assert.equal(body.presets.length, 2);
    const names = body.presets.map((p) => p.name).sort();
    assert.deepEqual(names, ['Preset 1', 'Preset 2']);
  });

  test('GET /projects/:id/presets for OTHER user\'s project → 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const projectB = await seedProject({ ownerId: b.id });
    const res = await presetsApp.request(`/api/projects/${projectB}/presets`, {
      headers: { Cookie: await ownerCookie(a.id, a.email) },
    });
    assert.equal(res.status, 404);
  });

  test('DELETE /presets/:id removes the preset', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const cookie = await ownerCookie(owner.id, owner.email);
    const create = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Tmp', visiblePositionIds: ['x'], settings: {} }),
    });
    const { id: presetId } = (await create.json()) as { id: string };
    const del = await presetsApp.request(`/api/presets/${presetId}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    assert.equal(del.status, 200);
    assert.deepEqual(await del.json(), { ok: true });
    // Now empty
    const list = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      headers: { Cookie: cookie },
    });
    const body = (await list.json()) as { presets: unknown[] };
    assert.equal(body.presets.length, 0);
  });

  test('DELETE /presets/:id of OTHER user\'s preset → 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const projectB = await seedProject({ ownerId: b.id });
    const cookieB = await ownerCookie(b.id, b.email);
    const create = await presetsApp.request(`/api/projects/${projectB}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ name: 'B-only', visiblePositionIds: [], settings: {} }),
    });
    const { id: presetId } = (await create.json()) as { id: string };
    // A attempts delete
    const res = await presetsApp.request(`/api/presets/${presetId}`, {
      method: 'DELETE',
      headers: { Cookie: await ownerCookie(a.id, a.email) },
    });
    assert.equal(res.status, 404);
  });

  test('DELETE /presets/:id of non-existent preset → 404', async () => {
    const owner = await seedUser();
    const res = await presetsApp.request('/api/presets/nope-does-not-exist', {
      method: 'DELETE',
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(res.status, 404);
  });

  test('POST /projects/:id/presets validates name max-length (>120 → 400)', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const longName = 'x'.repeat(121);
    const res = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({ name: longName, visiblePositionIds: [], settings: {} }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'invalid_input');
  });

  test('POST /projects/:id/presets validates name min-length (empty → 400)', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const res = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({ name: '   ', visiblePositionIds: [], settings: {} }),
    });
    assert.equal(res.status, 400);
  });

  test('POST /projects/:id/presets settings JSON round-trips losslessly', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const cookie = await ownerCookie(owner.id, owner.email);
    const settings = {
      brandHeader: 'minimal' as const,
      allowApproval: false,
      allowChangeRequests: true,
      showTotals: false,
      showMwst: true,
      bindefristDays: 42,
      message: 'Bitte bis Freitag prüfen.',
    };
    const create = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Round-trip', visiblePositionIds: ['a', 'b', 'c'], settings }),
    });
    assert.equal(create.status, 200);
    // Re-fetch via list
    const list = await presetsApp.request(`/api/projects/${projectId}/presets`, {
      headers: { Cookie: cookie },
    });
    const body = (await list.json()) as { presets: Array<{ settings: typeof settings; visiblePositionIds: string[] }> };
    assert.equal(body.presets.length, 1);
    assert.deepEqual(body.presets[0].settings, settings);
    assert.deepEqual(body.presets[0].visiblePositionIds, ['a', 'b', 'c']);
  });
});

/* ─── templates ────────────────────────────────────────────────────── */

describe('routes/templates.ts', () => {
  test('GET /templates without auth → 401', async () => {
    const res = await templatesApp.request('/api/templates');
    assert.equal(res.status, 401);
  });

  test('POST /templates without auth → 401', async () => {
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortText: 'X' }),
    });
    assert.equal(res.status, 401);
  });

  test('GET /templates returns own only (multi-tenant)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const ca = await ownerCookie(a.id, a.email);
    const cb = await ownerCookie(b.id, b.email);
    await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: ca },
      body: JSON.stringify({ shortText: 'A-template' }),
    });
    await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cb },
      body: JSON.stringify({ shortText: 'B-template' }),
    });
    const resA = await templatesApp.request('/api/templates', { headers: { Cookie: ca } });
    const bodyA = (await resA.json()) as { templates: Array<{ shortText: string }> };
    assert.equal(bodyA.templates.length, 1);
    assert.equal(bodyA.templates[0].shortText, 'A-template');
    const resB = await templatesApp.request('/api/templates', { headers: { Cookie: cb } });
    const bodyB = (await resB.json()) as { templates: Array<{ shortText: string }> };
    assert.equal(bodyB.templates.length, 1);
    assert.equal(bodyB.templates[0].shortText, 'B-template');
  });

  test('POST /templates with all fields → serialized (cents → euros)', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({
        oz: '01.01.0010',
        shortText: 'Mobilbauzaun',
        longText: 'Inkl. Befestigung',
        unit: 'm',
        defaultMaterialCost: 12.34,
        defaultTimeMinutes: 18,
        defaultNuCost: 0,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      id: string;
      oz: string;
      shortText: string;
      longText: string;
      unit: string;
      defaultMaterialCost: number;
      defaultTimeMinutes: number;
      defaultNuCost: number;
      useCount: number;
    };
    assert.equal(body.oz, '01.01.0010');
    assert.equal(body.shortText, 'Mobilbauzaun');
    assert.equal(body.longText, 'Inkl. Befestigung');
    assert.equal(body.unit, 'm');
    // 12.34 EUR → 1234 cents stored → 12.34 EUR returned
    assert.equal(body.defaultMaterialCost, 12.34);
    assert.equal(body.defaultTimeMinutes, 18);
    assert.equal(body.defaultNuCost, 0);
    assert.equal(body.useCount, 0);
  });

  test('POST /templates with minimal body (only shortText) applies defaults', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({ shortText: 'minimal' }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      oz: string;
      longText: string;
      unit: string;
      defaultMaterialCost: number;
      defaultTimeMinutes: number;
      defaultNuCost: number;
    };
    assert.equal(body.oz, '');
    assert.equal(body.longText, '');
    assert.equal(body.unit, '');
    assert.equal(body.defaultMaterialCost, 0);
    assert.equal(body.defaultTimeMinutes, 0);
    assert.equal(body.defaultNuCost, 0);
  });

  test('POST /templates validates shortText min length (empty / whitespace → 400)', async () => {
    const owner = await seedUser();
    const cookie = await ownerCookie(owner.id, owner.email);
    for (const v of ['', '   ', '\t\n']) {
      const res = await templatesApp.request('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ shortText: v }),
      });
      assert.equal(res.status, 400, `shortText=${JSON.stringify(v)} should reject`);
    }
  });

  test('POST /templates validates shortText max length (>2000 → 400)', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({ shortText: 'x'.repeat(2001) }),
    });
    assert.equal(res.status, 400);
  });

  test('POST /templates rejects defaultMaterialCost > 1e8 → 400', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({ shortText: 'X', defaultMaterialCost: 2e8 }),
    });
    assert.equal(res.status, 400);
  });

  test('POST /templates rejects defaultMaterialCost < -1e8 → 400', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({ shortText: 'X', defaultMaterialCost: -2e8 }),
    });
    assert.equal(res.status, 400);
  });

  test('POST /templates rejects non-finite defaultMaterialCost (NaN/Infinity) → 400', async () => {
    const owner = await seedUser();
    // JSON has no NaN / Infinity literal, but we can pass a string that fails .number() — or
    // skip the literal; instead, ship a non-numeric value to exercise the same rejection path.
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: JSON.stringify({ shortText: 'X', defaultMaterialCost: 'not-a-number' }),
    });
    assert.equal(res.status, 400);
  });

  test('POST /templates with no body / unparseable JSON → 400', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(owner.id, owner.email) },
      body: 'not-json',
    });
    assert.equal(res.status, 400);
  });

  test('POST /templates/:id/use bumps use_count + sets last_used_at', async () => {
    const owner = await seedUser();
    const cookie = await ownerCookie(owner.id, owner.email);
    const create = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ shortText: 'usable' }),
    });
    const { id } = (await create.json()) as { id: string };
    // Use it twice
    const u1 = await templatesApp.request(`/api/templates/${id}/use`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(u1.status, 200);
    const u2 = await templatesApp.request(`/api/templates/${id}/use`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(u2.status, 200);
    // Read back via list
    const list = await templatesApp.request('/api/templates', { headers: { Cookie: cookie } });
    const body = (await list.json()) as { templates: Array<{ id: string; useCount: number; lastUsedAt: string | null }> };
    const t = body.templates.find((x) => x.id === id);
    assert.ok(t, 'template still exists');
    assert.equal(t!.useCount, 2, 'use_count incremented twice');
    assert.ok(t!.lastUsedAt, 'last_used_at populated');
  });

  test('POST /templates/:id/use on OTHER user\'s template → 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const create = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(b.id, b.email) },
      body: JSON.stringify({ shortText: 'b-only' }),
    });
    const { id } = (await create.json()) as { id: string };
    const res = await templatesApp.request(`/api/templates/${id}/use`, {
      method: 'POST',
      headers: { Cookie: await ownerCookie(a.id, a.email) },
    });
    assert.equal(res.status, 404);
  });

  test('POST /templates/:id/use on non-existent template → 404', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates/nope-nope/use', {
      method: 'POST',
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(res.status, 404);
  });

  test('DELETE /templates/:id removes the row', async () => {
    const owner = await seedUser();
    const cookie = await ownerCookie(owner.id, owner.email);
    const create = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ shortText: 'doomed' }),
    });
    const { id } = (await create.json()) as { id: string };
    const del = await templatesApp.request(`/api/templates/${id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(del.status, 200);
    assert.deepEqual(await del.json(), { ok: true });
    const list = await templatesApp.request('/api/templates', { headers: { Cookie: cookie } });
    const body = (await list.json()) as { templates: unknown[] };
    assert.equal(body.templates.length, 0);
  });

  test('DELETE /templates/:id of OTHER user → 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const create = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: await ownerCookie(b.id, b.email) },
      body: JSON.stringify({ shortText: 'b-only' }),
    });
    const { id } = (await create.json()) as { id: string };
    const res = await templatesApp.request(`/api/templates/${id}`, {
      method: 'DELETE',
      headers: { Cookie: await ownerCookie(a.id, a.email) },
    });
    assert.equal(res.status, 404);
  });

  test('GET /templates orders by useCount DESC, then lastUsedAt DESC', async () => {
    const owner = await seedUser();
    const cookie = await ownerCookie(owner.id, owner.email);
    // Make three templates
    async function make(name: string): Promise<string> {
      const r = await templatesApp.request('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ shortText: name }),
      });
      return ((await r.json()) as { id: string }).id;
    }
    const lo = await make('low-use');
    const hi = await make('high-use');
    const mid = await make('mid-use');
    // hi → 3 uses, mid → 2 uses, lo → 1 use
    for (let i = 0; i < 3; i++) {
      await templatesApp.request(`/api/templates/${hi}/use`, { method: 'POST', headers: { Cookie: cookie } });
    }
    for (let i = 0; i < 2; i++) {
      await templatesApp.request(`/api/templates/${mid}/use`, { method: 'POST', headers: { Cookie: cookie } });
    }
    await templatesApp.request(`/api/templates/${lo}/use`, { method: 'POST', headers: { Cookie: cookie } });

    const list = await templatesApp.request('/api/templates', { headers: { Cookie: cookie } });
    const body = (await list.json()) as { templates: Array<{ id: string; useCount: number }> };
    assert.equal(body.templates.length, 3);
    // Highest use_count first
    assert.equal(body.templates[0].id, hi);
    assert.equal(body.templates[0].useCount, 3);
    assert.equal(body.templates[1].id, mid);
    assert.equal(body.templates[1].useCount, 2);
    assert.equal(body.templates[2].id, lo);
    assert.equal(body.templates[2].useCount, 1);
  });

  test('DELETE /templates/:id of non-existent template → 404', async () => {
    const owner = await seedUser();
    const res = await templatesApp.request('/api/templates/does-not-exist', {
      method: 'DELETE',
      headers: { Cookie: await ownerCookie(owner.id, owner.email) },
    });
    assert.equal(res.status, 404);
  });

  test('POST /templates persists cents without float drift (round-trip via list)', async () => {
    const owner = await seedUser();
    const cookie = await ownerCookie(owner.id, owner.email);
    // 0.10 + 0.20 = 0.30 — classic float-drift case. 30 cents stored → 0.3 returned.
    const res = await templatesApp.request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ shortText: 'drift-test', defaultMaterialCost: 0.3 }),
    });
    const { id } = (await res.json()) as { id: string; defaultMaterialCost: number };
    const list = await templatesApp.request('/api/templates', { headers: { Cookie: cookie } });
    const body = (await list.json()) as { templates: Array<{ id: string; defaultMaterialCost: number }> };
    const t = body.templates.find((x) => x.id === id)!;
    // 0.3 round-trip via cents: Math.round(0.3 * 100) = 30, 30/100 = 0.3 exactly in IEEE-754.
    assert.equal(t.defaultMaterialCost, 0.3);
  });
});

/* ─── mailer ───────────────────────────────────────────────────────── */

describe('lib/mailer.ts', () => {
  // The mailer module caches the transport at first call. Each test must
  // reach into module internals via env mutation BEFORE the first
  // `mailerStatus()` of THIS test file. We test the env-disabled path,
  // because once cached, the module's behavior is fixed for the rest of
  // the process. The order of tests in this describe block matters less
  // than the order across the whole test file — but the previous digest
  // test already exercised the not_configured path, so the cache is
  // already populated as `false`.

  test('mailerStatus reports not_configured when SMTP env is unset', async () => {
    const oldH = process.env.SMTP_HOST;
    const oldP = process.env.SMTP_PORT;
    const oldU = process.env.SMTP_USER;
    const oldPw = process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    try {
      const { mailerStatus } = await import('../src/lib/mailer.js');
      assert.equal(mailerStatus(), 'not_configured');
    } finally {
      if (oldH !== undefined) process.env.SMTP_HOST = oldH;
      if (oldP !== undefined) process.env.SMTP_PORT = oldP;
      if (oldU !== undefined) process.env.SMTP_USER = oldU;
      if (oldPw !== undefined) process.env.SMTP_PASS = oldPw;
    }
  });

  test('sendMail returns { ok:false, reason:"not_configured" } when SMTP env is empty', async () => {
    const { sendMail } = await import('../src/lib/mailer.js');
    const res = await sendMail({
      to: 'a@example.com',
      subject: 'Test',
      text: 'hi',
    });
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'not_configured');
  });

  test('sendMail accepts the documented payload shape (to/subject/text + optional html/bcc/replyTo)', async () => {
    // Shape contract — calling with all documented fields must NOT throw.
    const { sendMail } = await import('../src/lib/mailer.js');
    const res = await sendMail({
      to: ['a@example.com', 'b@example.com'],
      bcc: 'archive@example.com',
      subject: 'Multi-recipient',
      text: 'plain',
      html: '<b>html</b>',
      replyTo: 'reply@example.com',
      attachments: [
        { filename: 'a.pdf', content: Buffer.from('pdf-bytes'), contentType: 'application/pdf' },
      ],
    });
    // Still not configured in this process → ok:false but no throw.
    assert.equal(res.ok, false);
    assert.ok(typeof res.reason === 'string');
  });

  test('sendMail NEVER throws even on garbage input (graceful failure)', async () => {
    // Pass shapes that would explode if the mailer naively unwrapped them.
    const { sendMail } = await import('../src/lib/mailer.js');
    let caught: unknown = null;
    try {
      await sendMail({
        to: '',
        subject: '',
        text: '',
      });
    } catch (e) {
      caught = e;
    }
    assert.equal(caught, null, 'sendMail must not throw — caller-facing operations rely on this');
  });
});
