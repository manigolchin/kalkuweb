// S-011..S-020 — project ownership (IDOR) and update semantics.
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
  setupTestDb('projects');
  const { runMigrations } = await import('../src/db.js');
  runMigrations();
  app = await buildApp();
});

after(() => {
  teardownTestDb();
});

test('S-011 — GET /projects only returns own projects', async () => {
  const alice = await createUserAndLogin(app, { email: 's011-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's011-bob@test.local' });
  const aliceProject = await createProject(alice.id, { name: 'Alice Project' });
  await createProject(bob.id, { name: 'Bob Project' });
  const res = await jsonReq(app, 'GET', '/api/panel/projects', { cookie: alice.cookie });
  assert.equal(res.status, 200);
  const body = await res.json();
  const ids = body.projects.map((p: any) => p.id);
  assert.deepEqual(ids, [aliceProject.id], 'alice should only see her own project');
});

test("S-012 — GET /projects/:other → 404 (no other-user oracle)", async () => {
  const alice = await createUserAndLogin(app, { email: 's012-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's012-bob@test.local' });
  const bobProject = await createProject(bob.id);
  const res = await jsonReq(app, 'GET', `/api/panel/projects/${bobProject.id}`, { cookie: alice.cookie });
  assert.equal(res.status, 404);
});

test("S-013 — PUT /projects/:other → 404", async () => {
  const alice = await createUserAndLogin(app, { email: 's013-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's013-bob@test.local' });
  const bobProject = await createProject(bob.id);
  const res = await jsonReq(app, 'PUT', `/api/panel/projects/${bobProject.id}`, {
    cookie: alice.cookie,
    body: {
      data: {
        name: 'HACKED',
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: bobProject.data.calcParams,
        positions: [],
      },
    },
  });
  assert.equal(res.status, 404);
  // Confirm bob's data is untouched
  const { db } = await import('../src/db.js');
  const { projects } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const fresh = await db.query.projects.findFirst({ where: eq(projects.id, bobProject.id) });
  assert.equal(fresh!.data.name, 'Test Project');
});

test("S-014 — DELETE /projects/:other → 404", async () => {
  const alice = await createUserAndLogin(app, { email: 's014-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's014-bob@test.local' });
  const bobProject = await createProject(bob.id);
  const res = await jsonReq(app, 'DELETE', `/api/panel/projects/${bobProject.id}`, { cookie: alice.cookie });
  assert.equal(res.status, 404);
  // Project should still exist
  const { db } = await import('../src/db.js');
  const { projects } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const fresh = await db.query.projects.findFirst({ where: eq(projects.id, bobProject.id) });
  assert.ok(fresh, 'bob project must still exist');
});

test('S-015 — POST /projects sets ownerId to current user (not body-spoofable)', async () => {
  const alice = await createUserAndLogin(app, { email: 's015-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's015-bob@test.local' });
  const res = await jsonReq(app, 'POST', '/api/panel/projects', {
    cookie: alice.cookie,
    body: { name: 'Alice owns this', ownerId: bob.id }, // attempt to spoof
  });
  assert.equal(res.status, 200);
  const created = await res.json();
  const { db } = await import('../src/db.js');
  const { projects } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.projects.findFirst({ where: eq(projects.id, created.id) });
  assert.equal(row!.ownerId, alice.id, 'server must use the authenticated userId, ignoring body.ownerId');
});

test('S-016 — update without auth → 401', async () => {
  const alice = await createUserAndLogin(app, { email: 's016@test.local' });
  const project = await createProject(alice.id);
  const res = await jsonReq(app, 'PUT', `/api/panel/projects/${project.id}`, {
    body: {
      data: {
        name: 'no-auth',
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: project.data.calcParams,
        positions: [],
      },
    },
  });
  assert.equal(res.status, 401);
});

test('S-017 — update with stale expectedUpdatedAt → 409 version_conflict', async () => {
  const alice = await createUserAndLogin(app, { email: 's017@test.local' });
  const project = await createProject(alice.id);
  // Send a clearly stale timestamp.
  const res = await jsonReq(app, 'PUT', `/api/panel/projects/${project.id}`, {
    cookie: alice.cookie,
    body: {
      data: {
        name: 'concurrent-write',
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: project.data.calcParams,
        positions: [],
      },
      expectedUpdatedAt: 1, // ancient → conflict
    },
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, 'version_conflict');
  assert.ok(typeof body.currentUpdatedAt === 'number');
});

test('S-018 — update server recomputes ep/gp (client-pinned wrong values ignored)', async () => {
  const alice = await createUserAndLogin(app, { email: 's018@test.local' });
  const project = await createProject(alice.id);
  const positions = makePositions(1, () => ({
    quantity: 50,
    materialCost: 125,
    timeMinutes: 0,
    nuCost: 0,
    // Buggy/malicious client pins these — server must ignore.
    ep: 99999,
    gp: 99999,
  }));
  const res = await jsonReq(app, 'PUT', `/api/panel/projects/${project.id}`, {
    cookie: alice.cookie,
    body: {
      data: {
        name: project.data.name,
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: project.data.calcParams,
        positions,
      },
    },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const p = body.data.positions[0];
  assert.equal(p.epMaterial, 140); // 125 * 1.12
  assert.equal(p.ep, 140);
  assert.equal(p.gp, 7000);
});

test('S-019 — internal positionType forces visibleToCustomer=false on persist', async () => {
  const alice = await createUserAndLogin(app, { email: 's019@test.local' });
  const project = await createProject(alice.id);
  const positions = [
    {
      ...makePositions(1)[0],
      id: 'wagnis-pos',
      positionType: 'wagnis',
      visibleToCustomer: true, // client tries to ship it to customer
    },
  ];
  const res = await jsonReq(app, 'PUT', `/api/panel/projects/${project.id}`, {
    cookie: alice.cookie,
    body: {
      data: {
        name: project.data.name,
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: project.data.calcParams,
        positions,
      },
    },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.positions[0].positionType, 'wagnis');
  assert.equal(
    body.data.positions[0].visibleToCustomer,
    false,
    'internal position-types must be force-hidden from customer regardless of client-sent visibleToCustomer',
  );
});

test('S-020 — standard positionType preserves explicit visibleToCustomer=false', async () => {
  const alice = await createUserAndLogin(app, { email: 's020@test.local' });
  const project = await createProject(alice.id);
  const positions = [
    {
      ...makePositions(1)[0],
      id: 'hidden-standard',
      positionType: 'standard',
      visibleToCustomer: false,
    },
    {
      ...makePositions(1)[0],
      id: 'shown-standard',
      positionType: 'standard',
      visibleToCustomer: true,
    },
  ];
  const res = await jsonReq(app, 'PUT', `/api/panel/projects/${project.id}`, {
    cookie: alice.cookie,
    body: {
      data: {
        name: project.data.name,
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: project.data.calcParams,
        positions,
      },
    },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const map = new Map(body.data.positions.map((p: any) => [p.id, p]));
  assert.equal((map.get('hidden-standard') as any).visibleToCustomer, false);
  assert.equal((map.get('shown-standard') as any).visibleToCustomer, true);
});
