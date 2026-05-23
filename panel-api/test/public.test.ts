// S-031..S-045 — public /share/:token customer surface.
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
  setupTestDb('public');
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

/** Create owner + project + share; return share row + token + owner cookie. */
async function setupShare(opts?: {
  positionCount?: number;
  visibleIds?: string[];
  settings?: Partial<typeof defaultSettings>;
  ownerEmail?: string;
  companyContactEmail?: string;
}) {
  const owner = await createUserAndLogin(app, { email: opts?.ownerEmail });
  // Patch company contact email if requested
  if (opts?.companyContactEmail) {
    const { db } = await import('../src/db.js');
    const { users } = await import('../src/schema.js');
    const { eq } = await import('drizzle-orm');
    await db.update(users).set({ companyContactEmail: opts.companyContactEmail }).where(eq(users.id, owner.id));
  }
  const project = await createProject(owner.id, { positions: makePositions(opts?.positionCount ?? 3) });
  const visibleIds = opts?.visibleIds ?? ['p1'];
  const settings = { ...defaultSettings, ...(opts?.settings || {}) };
  const r = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: owner.cookie,
    body: { visiblePositionIds: visibleIds, settings },
  });
  const share = await r.json();
  return { owner, project, share, token: share.token };
}

test('S-031 — GET /share/:token → CustomerViewPayload with positions + project + owner', async () => {
  const s = await setupShare({ positionCount: 2, visibleIds: ['p1', 'p2'] });
  const res = await app.request(`/api/panel/share/${s.token}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.project);
  assert.ok(body.owner);
  assert.equal(body.positions.length, 2);
  assert.equal(body.token, s.token);
});

test('S-032 — unknown token → 404 (no info-leak on token-not-found)', async () => {
  const res = await app.request('/api/panel/share/no-such-token-xxx');
  assert.equal(res.status, 404);
});

test('S-033 — revoked token → 410 gone', async () => {
  const s = await setupShare();
  const del = await jsonReq(app, 'DELETE', `/api/panel/shares/${s.share.id}`, { cookie: s.owner.cookie });
  assert.equal(del.status, 200);
  const res = await app.request(`/api/panel/share/${s.token}`);
  assert.equal(res.status, 410);
});

test('S-034 — response uses snapshot, not live project (owner edits do NOT leak)', async () => {
  const s = await setupShare({ positionCount: 1, visibleIds: ['p1'] });
  // First view (snapshot was taken at share creation time with the seeded materialCost*1.12)
  const before = await (await app.request(`/api/panel/share/${s.token}`)).json();
  const beforeEp = before.positions[0].ep;

  // Owner aggressively edits the project — should NOT change what the customer sees.
  await jsonReq(app, 'PUT', `/api/panel/projects/${s.project.id}`, {
    cookie: s.owner.cookie,
    body: {
      data: {
        name: 'mutated',
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: '',
        calcParams: s.project.data.calcParams,
        positions: makePositions(1, () => ({ materialCost: 999999 })),
      },
    },
  });

  const after = await (await app.request(`/api/panel/share/${s.token}`)).json();
  assert.equal(after.positions[0].ep, beforeEp, 'snapshot must freeze the ep at share-creation time');
});

test('S-035 — hidden positions NEVER appear in /share response', async () => {
  const s = await setupShare({ positionCount: 5, visibleIds: ['p1', 'p3'] });
  const body = await (await app.request(`/api/panel/share/${s.token}`)).json();
  const ids = body.positions.map((p: any) => p.id).sort();
  assert.deepEqual(ids, ['p1', 'p3']);
  // No trace of the hidden ones anywhere in the payload string
  const text = JSON.stringify(body);
  assert.ok(!text.includes('"p2"'));
  assert.ok(!text.includes('"p4"'));
  assert.ok(!text.includes('"p5"'));
});

test('S-036 — owner LOGIN email is NOT exposed; companyContactEmail is what surfaces', async () => {
  const s = await setupShare({
    ownerEmail: 'owner-login-s036@test.local',
    companyContactEmail: 'kontakt@firma.example',
  });
  const body = await (await app.request(`/api/panel/share/${s.token}`)).json();
  assert.equal(body.owner.contactEmail, 'kontakt@firma.example');
  const text = JSON.stringify(body);
  assert.ok(
    !text.includes('owner-login-s036@test.local'),
    `login email must NOT appear in customer payload, found in: ${text}`,
  );
});

test('S-037 — first view records isFirstView=true in audit log', async () => {
  const s = await setupShare();
  await app.request(`/api/panel/share/${s.token}`);
  const { db } = await import('../src/db.js');
  const { auditEvents } = await import('../src/schema.js');
  const { eq, and } = await import('drizzle-orm');
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.shareId, s.share.id), eq(auditEvents.eventType, 'link.viewed')));
  assert.ok(rows.length >= 1);
  assert.equal((rows[0].payload as any).isFirstView, true);
});

test('S-038 — viewCount increments on each GET', async () => {
  const s = await setupShare();
  await app.request(`/api/panel/share/${s.token}`);
  await app.request(`/api/panel/share/${s.token}`);
  await app.request(`/api/panel/share/${s.token}`);
  const { db } = await import('../src/db.js');
  const { shares } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.shares.findFirst({ where: eq(shares.id, s.share.id) });
  assert.equal(row!.viewCount, 3);
});

test('S-039 — lastViewedAt is updated to recent timestamp after view', async () => {
  const s = await setupShare();
  const t0 = Date.now();
  await app.request(`/api/panel/share/${s.token}`);
  const { db } = await import('../src/db.js');
  const { shares } = await import('../src/schema.js');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.shares.findFirst({ where: eq(shares.id, s.share.id) });
  assert.ok(row!.lastViewedAt);
  const dt = row!.lastViewedAt!.getTime();
  assert.ok(dt >= t0 - 5_000 && dt <= Date.now() + 5_000, `lastViewedAt out of range: ${dt}`);
});

test('S-040 — internal cost breakdown (materialCost/timeMinutes/nuCost) NEVER in payload', async () => {
  const s = await setupShare({ positionCount: 1, visibleIds: ['p1'] });
  const body = await (await app.request(`/api/panel/share/${s.token}`)).json();
  const p = body.positions[0];
  assert.equal(p.materialCost, undefined);
  assert.equal(p.timeMinutes, undefined);
  assert.equal(p.nuCost, undefined);
  assert.equal(p.epLohn, undefined);
  assert.equal(p.epMaterial, undefined);
  assert.equal(p.epGeraet, undefined);
  assert.equal(p.epNu, undefined);
});

test('S-041 — hinweisText / internalNote NEVER in payload', async () => {
  // Seed a project with hinweisText + internalNote populated.
  const owner = await createUserAndLogin(app, { email: 's041@test.local' });
  const positions = [
    {
      ...makePositions(1)[0],
      id: 'p1',
      hinweisText: 'INTERNAL HINWEIS XYZ',
      internalNote: 'SECRET NOTE ABC',
    },
  ];
  const project = await createProject(owner.id, { positions });
  const r = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: owner.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings },
  });
  const share = await r.json();
  const body = await (await app.request(`/api/panel/share/${share.token}`)).json();
  const text = JSON.stringify(body);
  assert.ok(!text.includes('INTERNAL HINWEIS XYZ'), 'hinweisText leaked');
  assert.ok(!text.includes('SECRET NOTE ABC'), 'internalNote leaked');
});

test('S-042 — PDF download is token-gated (200 + application/pdf for valid token)', async () => {
  const s = await setupShare();
  const res = await app.request(`/api/panel/share/${s.token}/pdf`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
});

test('S-043 — PDF download on revoked share → 410', async () => {
  const s = await setupShare();
  await jsonReq(app, 'DELETE', `/api/panel/shares/${s.share.id}`, { cookie: s.owner.cookie });
  const res = await app.request(`/api/panel/share/${s.token}/pdf`);
  assert.equal(res.status, 410);
});

test('S-044 — Nachtrag share surfaces parent metadata (createdAt + netto/brutto)', async () => {
  const owner = await createUserAndLogin(app, { email: 's044@test.local' });
  const project = await createProject(owner.id, { positions: makePositions(2) });
  // Parent share
  const r1 = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: owner.cookie,
    body: { visiblePositionIds: ['p1', 'p2'], settings: defaultSettings },
  });
  const parent = await r1.json();
  // Nachtrag chained off it
  const r2 = await jsonReq(app, 'POST', `/api/panel/projects/${project.id}/shares`, {
    cookie: owner.cookie,
    body: { visiblePositionIds: ['p1'], settings: defaultSettings, parentShareId: parent.id },
  });
  const nachtrag = await r2.json();
  assert.equal(nachtrag.nachtragNumber, 1);
  const body = await (await app.request(`/api/panel/share/${nachtrag.token}`)).json();
  assert.equal(body.nachtragNumber, 1);
  assert.ok(body.parent, 'parent metadata must be present');
  assert.ok(typeof body.parent.netto === 'number');
  assert.ok(typeof body.parent.brutto === 'number');
});

test('S-045 — non-Nachtrag share has parent=null', async () => {
  const s = await setupShare();
  const body = await (await app.request(`/api/panel/share/${s.token}`)).json();
  assert.equal(body.nachtragNumber, 0);
  assert.equal(body.parent, null);
});
