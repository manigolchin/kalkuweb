// S-046..S-055 — approve, changes, audit-trail for customer responses.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestDb,
  teardownTestDb,
  buildApp,
  createUserAndLogin,
  createProject,
  makePositions,
  jsonReq,
} from './helpers.js';

let app: any;

before(async () => {
  setupTestDb('responses');
  const { runMigrations } = await import('../src/db.js');
  runMigrations();
  app = await buildApp();
});

after(() => {
  teardownTestDb();
});

const baseSettings = {
  brandHeader: 'co-branded',
  allowApproval: true,
  allowChangeRequests: true,
  showTotals: true,
  showMwst: true,
};

async function makeShare(opts?: { settings?: Partial<typeof baseSettings> }) {
  const owner = await createUserAndLogin(app);
  const project = await createProject(owner.id, { positions: makePositions(2) });
  const r = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: owner.cookie,
    body: {
      visiblePositionIds: ['p1', 'p2'],
      settings: { ...baseSettings, ...(opts?.settings || {}) },
    },
  });
  const share = await r.json();
  return { owner, project, share };
}

test('S-046 — POST /share/:token/approve → 200 with respondedAt + snapshotHash', async () => {
  const s = await makeShare();
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/approve`, {
    body: { customerName: 'Frau Schmidt', customerEmail: 'schmidt@example.com', message: 'Passt!' },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.ok);
  assert.ok(body.respondedAt);
  assert.equal(body.snapshotHash, s.share.snapshotHash);
});

test('S-047 — approve on revoked share → 410', async () => {
  const s = await makeShare();
  await jsonReq(app, 'DELETE', `/api/panel/shares/${s.share.id}`, { cookie: s.owner.cookie });
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/approve`, {
    body: { customerName: 'X', customerEmail: 'x@example.com' },
  });
  assert.equal(res.status, 410);
});

test('S-048 — approve when allowApproval=false → 403 not_allowed', async () => {
  const s = await makeShare({ settings: { allowApproval: false } });
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/approve`, {
    body: { customerName: 'X', customerEmail: 'x@example.com' },
  });
  assert.equal(res.status, 403);
});

test('S-049 — approve missing customerName → 400 invalid_input', async () => {
  const s = await makeShare();
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/approve`, {
    body: { customerEmail: 'x@y.z' },
  });
  assert.equal(res.status, 400);
});

test('S-050 — approve with invalid email → 400 invalid_input', async () => {
  const s = await makeShare();
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/approve`, {
    body: { customerName: 'X', customerEmail: 'not-an-email' },
  });
  assert.equal(res.status, 400);
});

test('S-051 — POST /share/:token/changes → 200', async () => {
  const s = await makeShare();
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/changes`, {
    body: {
      customerName: 'Schmidt',
      customerEmail: 'schmidt@example.com',
      changes: [{ positionId: 'p1', type: 'modify', text: 'bitte günstiger' }],
    },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.ok);
});

test('S-052 — changes when allowChangeRequests=false → 403', async () => {
  const s = await makeShare({ settings: { allowChangeRequests: false } });
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/changes`, {
    body: {
      customerName: 'X',
      changes: [{ positionId: 'p1', type: 'comment', text: 'note' }],
    },
  });
  assert.equal(res.status, 403);
});

test('S-053 — changes with empty changes[] → 400', async () => {
  const s = await makeShare();
  const res = await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/changes`, {
    body: { customerName: 'X', changes: [] },
  });
  assert.equal(res.status, 400);
});

test('S-054 — approve writes an audit row of type response.submitted', async () => {
  const s = await makeShare();
  await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/approve`, {
    body: { customerName: 'AuditTester', customerEmail: 'audit@example.com' },
  });
  const { db } = await import('../src/db.js');
  const { auditEvents } = await import('../src/schema.js');
  const { eq, and } = await import('drizzle-orm');
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.shareId, s.share.id), eq(auditEvents.eventType, 'response.submitted')));
  assert.ok(rows.length >= 1);
  const ev = rows[0];
  assert.equal((ev.payload as any).responseType, 'approve');
  assert.equal((ev.payload as any).customerName, 'AuditTester');
});

test('S-055 — audit payload for response.submitted includes snapshotHash (proof of which version was approved)', async () => {
  const s = await makeShare();
  await jsonReq(app, 'POST', `/api/panel/share/${s.share.token}/approve`, {
    body: { customerName: 'X', customerEmail: 'x@example.com' },
  });
  const { db } = await import('../src/db.js');
  const { auditEvents } = await import('../src/schema.js');
  const { eq, and } = await import('drizzle-orm');
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.shareId, s.share.id), eq(auditEvents.eventType, 'response.submitted')));
  assert.equal((rows[0].payload as any).snapshotHash, s.share.snapshotHash);
});
