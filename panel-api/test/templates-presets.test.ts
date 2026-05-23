// S-061..S-065 — templates + presets IDOR + use-count.
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
  setupTestDb('templates-presets');
  const { runMigrations } = await import('../src/db.js');
  runMigrations();
  app = await buildApp();
});

after(() => {
  teardownTestDb();
});

test('S-061 — templates.list returns only the calling user\'s templates', async () => {
  const alice = await createUserAndLogin(app, { email: 's061-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's061-bob@test.local' });
  await jsonReq(app, 'POST', '/api/panel/templates', {
    cookie: alice.cookie,
    body: { shortText: 'alice template', unit: 'Stk', defaultMaterialCost: 10 },
  });
  await jsonReq(app, 'POST', '/api/panel/templates', {
    cookie: bob.cookie,
    body: { shortText: 'bob template', unit: 'Stk', defaultMaterialCost: 20 },
  });
  const r = await jsonReq(app, 'GET', '/api/panel/templates', { cookie: alice.cookie });
  const body = await r.json();
  assert.equal(body.templates.length, 1);
  assert.equal(body.templates[0].shortText, 'alice template');
});

test("S-062 — templates.delete on another user's template → 404", async () => {
  const alice = await createUserAndLogin(app, { email: 's062-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's062-bob@test.local' });
  const cr = await jsonReq(app, 'POST', '/api/panel/templates', {
    cookie: bob.cookie,
    body: { shortText: 'bobs', unit: '', defaultMaterialCost: 0 },
  });
  const t = await cr.json();
  const res = await jsonReq(app, 'DELETE', `/api/panel/templates/${t.id}`, { cookie: alice.cookie });
  assert.equal(res.status, 404);
  // Still present
  const stillThere = await jsonReq(app, 'GET', '/api/panel/templates', { cookie: bob.cookie });
  const body = await stillThere.json();
  assert.equal(body.templates.length, 1);
});

test('S-063 — presets.list scoped to project (and project must be owned)', async () => {
  const alice = await createUserAndLogin(app, { email: 's063-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's063-bob@test.local' });
  const aliceProject = await createProject(alice.id);
  const bobProject = await createProject(bob.id);
  // Seed a preset on each
  await jsonReq(app, 'POST', `/api/panel/projects/${aliceProject.id}/presets`, {
    cookie: alice.cookie,
    body: { name: 'alice preset', visiblePositionIds: [], settings: {} },
  });
  await jsonReq(app, 'POST', `/api/panel/projects/${bobProject.id}/presets`, {
    cookie: bob.cookie,
    body: { name: 'bob preset', visiblePositionIds: [], settings: {} },
  });
  // Alice listing alice's project → 1 entry, named "alice preset"
  const r1 = await jsonReq(app, 'GET', `/api/panel/projects/${aliceProject.id}/presets`, { cookie: alice.cookie });
  const body1 = await r1.json();
  assert.equal(body1.presets.length, 1);
  assert.equal(body1.presets[0].name, 'alice preset');
  // Alice listing bob's project → 404
  const r2 = await jsonReq(app, 'GET', `/api/panel/projects/${bobProject.id}/presets`, { cookie: alice.cookie });
  assert.equal(r2.status, 404);
});

test('S-064 — presets.create on foreign project → 404', async () => {
  const alice = await createUserAndLogin(app, { email: 's064-alice@test.local' });
  const bob = await createUserAndLogin(app, { email: 's064-bob@test.local' });
  const bobProject = await createProject(bob.id);
  const res = await jsonReq(app, 'POST', `/api/panel/projects/${bobProject.id}/presets`, {
    cookie: alice.cookie,
    body: { name: 'IDOR attempt', visiblePositionIds: ['p1'], settings: {} },
  });
  assert.equal(res.status, 404);
  // Confirm no row landed in bob's project
  const { db } = await import('../src/db.js');
  const { viewPresets } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(viewPresets).where(eq(viewPresets.projectId, bobProject.id));
  assert.equal(rows.length, 0);
});

test('S-065 — POST /templates/:id/use increments use_count and sets last_used_at', async () => {
  const alice = await createUserAndLogin(app, { email: 's065@test.local' });
  const cr = await jsonReq(app, 'POST', '/api/panel/templates', {
    cookie: alice.cookie,
    body: { shortText: 'use-count', unit: 'Stk', defaultMaterialCost: 5 },
  });
  const t = await cr.json();
  await jsonReq(app, 'POST', `/api/panel/templates/${t.id}/use`, { cookie: alice.cookie, body: {} });
  await jsonReq(app, 'POST', `/api/panel/templates/${t.id}/use`, { cookie: alice.cookie, body: {} });
  await jsonReq(app, 'POST', `/api/panel/templates/${t.id}/use`, { cookie: alice.cookie, body: {} });
  const { db } = await import('../src/db.js');
  const { positionTemplates } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.positionTemplates.findFirst({ where: eq(positionTemplates.id, t.id) });
  assert.equal(row!.useCount, 3);
  assert.ok(row!.lastUsedAt, 'lastUsedAt must be populated');
});
