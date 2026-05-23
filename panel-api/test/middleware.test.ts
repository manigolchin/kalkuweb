// S-066..S-070 — requireAuth, body-size cap, clientIp.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestDb,
  teardownTestDb,
  buildApp,
  createUserAndLogin,
  createProject,
  jsonReq,
} from './helpers.js';

let app: any;

before(async () => {
  setupTestDb('middleware');
  const { runMigrations } = await import('../src/db.js');
  runMigrations();
  app = await buildApp();
});

after(() => {
  teardownTestDb();
});

test('S-066 — requireAuth returns 401 when no cookie at all', async () => {
  const res = await app.request('/api/panel/auth/me');
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, 'unauthorized');
});

test('S-067 — requireAuth returns 401 with invalid/garbage JWT cookie', async () => {
  const res = await app.request('/api/panel/auth/me', {
    headers: { cookie: 'kalku_session=this-is-not-a-valid-jwt-at-all.xxx.yyy' },
  });
  assert.equal(res.status, 401);
});

test('S-068 — body-size cap rejects oversized public request → 413', async () => {
  // /api/panel/share/* is wired with the 32KB public limit. Send 100KB of text
  // to the changes endpoint. Token doesn't need to be valid — body-size
  // middleware runs BEFORE the route handler.
  const fat = 'x'.repeat(100 * 1024);
  const res = await app.request('/api/panel/share/anything/changes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': String(fat.length) },
    body: JSON.stringify({ customerName: 'X', changes: [{ positionId: 'p1', type: 'comment', text: fat }] }),
  });
  assert.equal(res.status, 413, `expected 413 payload_too_large, got ${res.status}`);
  const body = await res.json();
  assert.equal(body.error, 'payload_too_large');
});

test('S-069 — body-size cap rejects oversized OWNER request → 413', async () => {
  // /api/panel/projects/* is wired with the 2MB owner limit. Send 3MB.
  const u = await createUserAndLogin(app, { email: 's069@test.local' });
  const project = await createProject(u.id);
  const fat = 'x'.repeat(3 * 1024 * 1024);
  const payload = JSON.stringify({
    data: {
      name: fat.slice(0, 400), // name field is 500 max
      client: '',
      service: '',
      tenderNumber: '',
      deadline: '',
      bidder: '',
      calcParams: project.data.calcParams,
      positions: [],
      notes: fat, // 3 MB notes — pushes over the 2 MB cap
    },
  });
  const res = await app.request(`/api/panel/projects/${project.id}`, {
    method: 'PUT',
    headers: { cookie: u.cookie, 'content-type': 'application/json', 'content-length': String(payload.length) },
    body: payload,
  });
  assert.equal(res.status, 413, `expected 413, got ${res.status}`);
});

test('S-070 — clientIp returns first comma-separated XFF token', async () => {
  // Drive an audit-event-emitting endpoint with a multi-hop XFF header, then
  // read the audit_events.ip column to confirm only the first token landed.
  const u = await createUserAndLogin(app, { email: 's070@test.local' });
  const project = await createProject(u.id);
  // Create a share — this writes a share.created audit row using clientIp(c)
  const createSettings = {
    brandHeader: 'co-branded' as const,
    allowApproval: true,
    allowChangeRequests: true,
    showTotals: true,
    showMwst: true,
  };
  const res = await app.request(`/api/panel/projects/${project.id}/shares`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: u.cookie,
      'x-forwarded-for': '203.0.113.42, 198.51.100.7, 10.0.0.1',
    },
    body: JSON.stringify({ visiblePositionIds: [], settings: createSettings }),
  });
  assert.equal(res.status, 200);
  const share = await res.json();
  const { db } = await import('../src/db.js');
  const { auditEvents } = await import('../src/schema.js');
  const { eq, and } = await import('drizzle-orm');
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.shareId, share.id), eq(auditEvents.eventType, 'share.created')));
  assert.ok(rows.length >= 1);
  assert.equal(rows[0].ip, '203.0.113.42', 'clientIp should pick the first XFF token (no whitespace)');
});
