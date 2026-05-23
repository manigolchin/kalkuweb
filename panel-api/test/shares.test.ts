// S-021..S-030 — share creation, listing, revocation, re-snapshot.
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
  setupTestDb('shares');
  const { runMigrations } = await import('../src/db.js');
  runMigrations();
  app = await buildApp();
});

after(() => {
  teardownTestDb();
});

const defaultSettings = {
  brandHeader: 'co-branded',
  allowApproval: true,
  allowChangeRequests: true,
  showTotals: true,
  showMwst: true,
};

async function createProjectWithPositions(ownerId: string, positionCount = 3) {
  return createProject(ownerId, { positions: makePositions(positionCount) });
}

test('S-021 — create share, token is ~32 chars urlsafe alphanumeric', async () => {
  const u = await createUserAndLogin(app, { email: 's021@test.local' });
  const project = await createProjectWithPositions(u.id, 2);
  const res = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: u.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token.length >= 16, `token length: ${body.token.length}`);
  // nanoid uses URL-safe charset: A-Z a-z 0-9 _ -
  assert.match(body.token, /^[A-Za-z0-9_-]+$/);
});

test('S-022 — create share populates snapshotData implicitly (snapshotHash returned)', async () => {
  const u = await createUserAndLogin(app, { email: 's022@test.local' });
  const project = await createProjectWithPositions(u.id, 2);
  const res = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: u.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const body = await res.json();
  assert.ok(body.snapshotHash, 'snapshotHash must be returned');
  // Confirm snapshotData is in DB
  const { db } = await import('../src/db.js');
  const { shares } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.shares.findFirst({ where: eq(shares.id, body.id) });
  assert.ok(row!.snapshotData, 'snapshotData column must be populated');
  assert.equal(row!.snapshotData!.positions.length, 1);
});

test('S-023 — snapshotHash present and is 64 hex chars (SHA-256)', async () => {
  const u = await createUserAndLogin(app, { email: 's023@test.local' });
  const project = await createProjectWithPositions(u.id, 1);
  const res = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: u.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const body = await res.json();
  assert.match(body.snapshotHash, /^[a-f0-9]{64}$/);
});

test('S-024 — visiblePositionIds filter is enforced (snapshot positions ⊆ visible)', async () => {
  const u = await createUserAndLogin(app, { email: 's024@test.local' });
  const project = await createProjectWithPositions(u.id, 5);
  const res = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: u.cookie,
    body: { visiblePositionIds: ['p1', 'p3'], settings: defaultSettings },
  });
  const body = await res.json();
  const { db } = await import('../src/db.js');
  const { shares } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.shares.findFirst({ where: eq(shares.id, body.id) });
  const ids = row!.snapshotData!.positions.map((p) => p.id).sort();
  assert.deepEqual(ids, ['p1', 'p3']);
});

test('S-025 — parentShareId on another project rejected with 400 parent_wrong_project', async () => {
  const u1 = await createUserAndLogin(app, { email: 's025-a@test.local' });
  const u2 = await createUserAndLogin(app, { email: 's025-b@test.local' });
  const p1 = await createProjectWithPositions(u1.id, 1);
  const p2 = await createProjectWithPositions(u2.id, 1);
  // Create a parent share on u2's project
  const r1 = await jsonReq(app, 'POST', `/api/panel/projects/${p2.id}/shares`, {
    cookie: u2.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const parent = await r1.json();
  // Now u1 tries to chain a Nachtrag to u2's share on their own project — should fail
  const r2 = await jsonReq(app, 'POST', `/api/panel/projects/${p1.id}/shares`, {
    cookie: u1.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings, parentShareId: parent.id },
  });
  // Server rejects with 400 parent_wrong_project. (Note: also blocks the cross-owner attack
  // because u1 can't reference a parent share on a project they don't own AND that
  // belongs to the SAME project.)
  assert.equal(r2.status, 400);
  const body = await r2.json();
  assert.equal(body.error, 'parent_wrong_project');
});

test('S-026 — listing shares for foreign project → 404', async () => {
  const alice = await createUserAndLogin(app, { email: 's026-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's026-bob@test.local' });
  const bobProject = await createProjectWithPositions(bob.id, 1);
  await jsonReq(app, 'POST', `/api/panel/projects/${bobProject.id}/shares`, {
    cookie: bob.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const res = await jsonReq(app, 'GET', `/api/panel/projects/${bobProject.id}/shares`, {
    cookie: alice.cookie,
  });
  assert.equal(res.status, 404);
});

test('S-027 — revoke own share → 200, revokedAt set', async () => {
  const u = await createUserAndLogin(app, { email: 's027@test.local' });
  const project = await createProjectWithPositions(u.id, 1);
  const createRes = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: u.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const share = await createRes.json();
  const delRes = await jsonReq(app, 'DELETE', `/api/panel/shares/${share.id}`, { cookie: u.cookie });
  assert.equal(delRes.status, 200);
  const { db } = await import('../src/db.js');
  const { shares } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.shares.findFirst({ where: eq(shares.id, share.id) });
  assert.ok(row!.revokedAt, 'revokedAt must be set');
});

test('S-028 — revoke foreign share → 404', async () => {
  const alice = await createUserAndLogin(app, { email: 's028-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's028-bob@test.local' });
  const bobProject = await createProjectWithPositions(bob.id, 1);
  const r = await jsonReq(app, 'POST', `/api/panel/projects/${bobProject.id}/shares`, {
    cookie: bob.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const share = await r.json();
  const delRes = await jsonReq(app, 'DELETE', `/api/panel/shares/${share.id}`, { cookie: alice.cookie });
  assert.equal(delRes.status, 404);
  // Confirm still active
  const { db } = await import('../src/db.js');
  const { shares } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.shares.findFirst({ where: eq(shares.id, share.id) });
  assert.equal(row!.revokedAt, null);
});

test('S-029 — resnapshot-preview returns a diff against current project state', async () => {
  const u = await createUserAndLogin(app, { email: 's029@test.local' });
  const project = await createProjectWithPositions(u.id, 2);
  const createRes = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: u.cookie,
    body: { visiblePositionIds: ['p1', 'p2'], settings: defaultSettings },
  });
  const share = await createRes.json();

  // Modify the project: bump materialCost on p1
  const newPositions = makePositions(2, (i) => (i === 1 ? { materialCost: 999 } : {}));
  await jsonReq(app, 'PUT', `/api/panel/projects/${project.id}`, {
    cookie: u.cookie,
    body: {
      data: {
        name: project.data.name,
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: project.data.calcParams,
        positions: newPositions,
      },
    },
  });

  const prevRes = await jsonReq(app, 'GET', `/api/panel/shares/${share.id}/resnapshot-preview`, {
    cookie: u.cookie,
  });
  assert.equal(prevRes.status, 200);
  const body = await prevRes.json();
  assert.equal(body.currentVersion, 1);
  assert.equal(body.proposedVersion, 2);
  assert.ok(body.diff);
  assert.ok(
    body.diff.changed.length >= 1,
    'p1 materialCost change should produce a diff entry',
  );
});

test('S-030 — resnapshot bumps snapshotVersion and updates snapshotHash', async () => {
  const u = await createUserAndLogin(app, { email: 's030@test.local' });
  const project = await createProjectWithPositions(u.id, 2);
  const createRes = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: u.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const share = await createRes.json();
  const beforeHash = share.snapshotHash;

  // Mutate project so snapshot really changes
  const newPositions = makePositions(2, (i) => (i === 1 ? { materialCost: 12345 } : {}));
  await jsonReq(app, 'PUT', `/api/panel/projects/${project.id}`, {
    cookie: u.cookie,
    body: {
      data: {
        name: project.data.name,
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: project.data.calcParams,
        positions: newPositions,
      },
    },
  });

  const resnap = await jsonReq(app, 'POST', `/api/panel/shares/${share.id}/resnapshot`, {
    cookie: u.cookie,
    body: {},
  });
  assert.equal(resnap.status, 200);
  const body = await resnap.json();
  assert.equal(body.snapshotVersion, 2);
  assert.notEqual(body.snapshotHash, beforeHash);
});
