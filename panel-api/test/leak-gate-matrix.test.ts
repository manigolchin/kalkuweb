/**
 * Customer-data-protection matrix — exhaustive coverage of what the public
 * share endpoint (GET /share/:token) does and does NOT ship to the customer,
 * across every display-toggle combination + the access gates.
 *
 * This is the safety net for the most sensitive surface: a future change that
 * accidentally leaks a company's internal cost data, owner login email, or an
 * internal position to the customer must turn a test red here.
 *
 * Assertions use raw `res.text()` substring checks on VALUE canaries (not just
 * key names) so a rename that still echoes the data is caught. All tests lock
 * in the CURRENT (correct, post-hardening) behavior — the suite stays green.
 *
 * Harness mirrors round9-shares-public / leak-gate-hardening.
 */

import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-matrix-'));
process.env.DB_PATH = join(tmpDir, 'matrix.db');
process.env.JWT_SECRET = 'matrix-test-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { publicRoute } = await import('../src/routes/public.js');
const { sharesRoute } = await import('../src/routes/shares.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { buildShareSnapshot, snapshotHash } = await import('../src/lib/snapshot.js');
const { nanoid } = await import('nanoid');
const { eq } = await import('drizzle-orm');
const bcrypt = (await import('bcryptjs')).default;

import type { Position, CalcParams, ShareSettings } from '../src/schema.js';

const publicApp = new Hono();
publicApp.route('/api', publicRoute);
const ownerApp = new Hono();
ownerApp.route('/api', sharesRoute);

async function ownerCookie(userId: string): Promise<{ Cookie: string }> {
  return { Cookie: `${COOKIE_NAME}=${await signToken({ sub: userId, email: 'o@test.local' })}` };
}

const DEFAULT_PARAMS: CalcParams = {
  mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
  tagesstunden: 8, personaleinsatz: 3, mwst: 0.19, zielAufschlag: 0,
};

// A position carrying internal canaries that must NEVER reach the customer,
// plus real cost inputs so the summary cost-types are non-zero.
function canaryPos(overrides: Partial<Position> = {}): Position {
  return {
    id: 'p1', oz: '1.1', shortText: 'Sichtbar', longText: 'Sichtbarer Langtext',
    hinweisText: 'HINT_CANARY_XYZ', quantity: 5, unit: 'm²',
    materialCost: 100, timeMinutes: 60, nuCost: 25,
    isHeader: false, sortOrder: 1, sectionPath: 'a/b/INTERNAL_PATH',
    epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
    visibleToCustomer: true,
    internalNote: 'NOTE_CANARY_XYZ',
    classification: 'CLASS_CANARY_XYZ',
    ...overrides,
  };
}

const BASE: Partial<ShareSettings> = {
  brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
  showTotals: true, showMwst: true,
};

async function seedOwner(opts: { positions: Position[]; loginEmail?: string; contactEmail?: string }) {
  const now = new Date();
  const ownerId = nanoid(16);
  const projectId = nanoid(16);
  await db.insert(schema.users).values({
    id: ownerId, email: opts.loginEmail ?? `${ownerId}@login.local`, passwordHash: 'unused',
    name: 'Owner', companyName: 'TestCo GmbH', companyLogoUrl: '',
    companyPhone: '', companyContactEmail: opts.contactEmail ?? 'public-contact@example.com',
    mustChangePassword: false, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.projects).values({
    id: projectId, ownerId,
    data: { name: 'P', client: 'C', service: 'S', tenderNumber: 'T', deadline: '2026-12-31', bidder: 'B', calcParams: DEFAULT_PARAMS, positions: opts.positions },
    versionNumber: 1, createdAt: now, updatedAt: now,
  });
  return { ownerId, projectId };
}

/** Create a share through the real owner route, then fetch the customer view.
 *  Returns the raw text + parsed body for canary + structural assertions. */
async function shareAndView(
  positions: Position[],
  settings: Partial<ShareSettings>,
  ownerInfo?: { loginEmail?: string; contactEmail?: string },
) {
  const { ownerId, projectId } = await seedOwner({ positions, ...ownerInfo });
  const visibleIds = positions.map((p) => p.id);
  const res = await ownerApp.request(`/api/projects/${projectId}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId)) },
    body: JSON.stringify({ visiblePositionIds: visibleIds, settings: { ...BASE, ...settings } }),
  });
  assert.equal(res.status, 200, 'share create should succeed');
  const { token } = await res.json() as { token: string };
  const view = await publicApp.request(`/api/share/${token}`);
  const raw = await view.text();
  return { status: view.status, raw, body: JSON.parse(raw) as Record<string, any>, token };
}

const INTERNAL_KEYS = [
  'materialCost', 'timeMinutes', 'nuCost', 'epLohn', 'epMaterial', 'epGeraet', 'epNu',
  'internalNote', 'positionType', 'classification', 'hinweisText', 'visibleToCustomer',
  'sectionPath', 'materialFormula', 'geraeteEp', 'lohnEp',
];
const INTERNAL_VALUE_CANARIES = ['HINT_CANARY_XYZ', 'NOTE_CANARY_XYZ', 'CLASS_CANARY_XYZ', 'INTERNAL_PATH'];

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

/* ═══ Group 1 — per-position cost split (showCostBreakdown) ═══ */
describe('matrix: per-position cost split', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('showCostBreakdown=true → gp* split keys present', async () => {
    const { raw, body } = await shareAndView([canaryPos()], { showCostBreakdown: true });
    assert.ok(raw.includes('"gpLohn"') && raw.includes('"gpMaterial"') && raw.includes('"gpGeraet"') && raw.includes('"gpNu"'));
    const pos = body.positions[0];
    assert.ok('gpMaterial' in pos);
  });

  test('showCostBreakdown=false → gp* split keys absent (but gp itself present)', async () => {
    const { raw, body } = await shareAndView([canaryPos()], { showCostBreakdown: false });
    assert.ok(!raw.includes('"gpLohn"'), 'gpLohn must not ship');
    assert.ok(!raw.includes('"gpMaterial"'));
    assert.ok(!raw.includes('"gpGeraet"'));
    assert.ok(!raw.includes('"gpNu"'));
    assert.ok('gp' in body.positions[0], 'the line total gp still ships');
  });
});

/* ═══ Group 2 — summary calculation redaction (showCalculation) ═══ */
describe('matrix: summary calculation redaction', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('showCalculation=true → EINKAUF + Überschuss + KPIs present', async () => {
    const { body } = await shareAndView([canaryPos()], { showCalculation: true });
    assert.ok(body.summary, 'summary present');
    assert.ok(body.summary.ekTotal > 0, 'EINKAUF total present');
    assert.ok(body.summary.costTypes.material.ek > 0, 'per-type EINKAUF present');
  });

  test('showCalculation=false → EINKAUF/Überschuss/KPIs zeroed', async () => {
    const { body } = await shareAndView([canaryPos()], { showCalculation: false });
    assert.equal(body.summary.ekTotal, 0);
    assert.equal(body.summary.ueberschuss, 0);
    assert.equal(body.summary.mitarbeiter, 0);
    assert.equal(body.summary.arbeitstage, 0);
    assert.equal(body.summary.monate, 0);
    assert.equal(body.summary.totalHours, 0);
    assert.equal(body.summary.costTypes.material.ek, 0);
    assert.equal(body.summary.costTypes.material.zuschlagPct, 0);
  });
});

/* ═══ Group 3 — VERKAUF composition gating (the combined fix) ═══ */
describe('matrix: costTypes VERKAUF (vk) gating', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('calc on + breakdown on → vk present', async () => {
    const { body } = await shareAndView([canaryPos()], { showCalculation: true, showCostBreakdown: true });
    assert.ok(body.summary.costTypes.material.vk > 0);
  });
  test('calc off + breakdown on → vk KEPT (composition bar)', async () => {
    const { body } = await shareAndView([canaryPos()], { showCalculation: false, showCostBreakdown: true });
    assert.ok(body.summary.costTypes.material.vk > 0);
  });
  test('calc on + breakdown off → vk KEPT (Kalkulation table)', async () => {
    const { body } = await shareAndView([canaryPos()], { showCalculation: true, showCostBreakdown: false });
    assert.ok(body.summary.costTypes.material.vk > 0);
  });
  test('calc off + breakdown off → vk STRIPPED (no tier renders it)', async () => {
    const { body } = await shareAndView([canaryPos()], { showCalculation: false, showCostBreakdown: false });
    assert.equal(body.summary.costTypes.material.vk, 0);
    assert.equal(body.summary.costTypes.lohn.vk, 0);
    assert.equal(body.summary.costTypes.nu.vk, 0);
  });
});

/* ═══ Group 4 — totals master switch ═══ */
describe('matrix: showTotals', () => {
  beforeEach(async () => { await cleanupAll(); });
  test('showTotals=false → no summary block at all', async () => {
    const { body } = await shareAndView([canaryPos()], { showTotals: false });
    assert.equal(body.summary, null);
  });
  test('showTotals=false overrides showCalculation=true (still no summary)', async () => {
    const { body } = await shareAndView([canaryPos()], { showTotals: false, showCalculation: true });
    assert.equal(body.summary, null);
  });
});

/* ═══ Group 5 — internal canaries NEVER leak (any toggle combo) ═══ */
describe('matrix: internal fields never leak', () => {
  beforeEach(async () => { await cleanupAll(); });

  for (const combo of [
    { showCostBreakdown: true, showCalculation: true, showTotals: true },
    { showCostBreakdown: false, showCalculation: false, showTotals: false },
    { showCostBreakdown: true, showCalculation: false, showTotals: true },
    { showCostBreakdown: false, showCalculation: true, showTotals: true },
  ]) {
    const label = `bd=${combo.showCostBreakdown} calc=${combo.showCalculation} tot=${combo.showTotals}`;
    test(`no internal VALUE canary leaks [${label}]`, async () => {
      const { raw } = await shareAndView([canaryPos()], combo);
      for (const canary of INTERNAL_VALUE_CANARIES) {
        assert.ok(!raw.includes(canary), `internal value '${canary}' leaked [${label}]`);
      }
    });
    test(`no internal cost-input KEY leaks [${label}]`, async () => {
      const { raw } = await shareAndView([canaryPos()], combo);
      for (const key of INTERNAL_KEYS) {
        assert.ok(!raw.includes(`"${key}"`), `internal key '${key}' leaked [${label}]`);
      }
    });
  }
});

/* ═══ Group 6 — owner login email never leaks ═══ */
describe('matrix: owner identity', () => {
  beforeEach(async () => { await cleanupAll(); });
  test('login email is never in the customer payload; companyContactEmail is', async () => {
    const { raw } = await shareAndView(
      [canaryPos()], { showCalculation: true, showCostBreakdown: true },
      { loginEmail: 'private-login-CANARY@secret.example', contactEmail: 'public-contact@example.com' },
    );
    assert.ok(!raw.includes('private-login-CANARY'), 'owner login email leaked');
    assert.ok(raw.includes('public-contact@example.com'), 'public contact email should surface');
  });
});

/* ═══ Group 7 — angebote folder URL gating ═══ */
describe('matrix: angebote folder URL', () => {
  beforeEach(async () => { await cleanupAll(); });
  const URL = 'https://kalkuteam.sharepoint.com/:f:/s/KT01/abcdef';

  test('showAngebote on + https → URL ships', async () => {
    const { body } = await shareAndView([canaryPos()], { showAngebote: true, angeboteFolderUrl: URL } as Partial<ShareSettings>);
    assert.equal(body.settings.angeboteFolderUrl, URL);
    assert.equal(body.settings.showAngebote, true);
  });
  test('showAngebote off + URL set → URL stripped from raw payload', async () => {
    const { raw, body } = await shareAndView([canaryPos()], { showAngebote: false, angeboteFolderUrl: URL } as Partial<ShareSettings>);
    assert.ok(!raw.includes('abcdef'), 'internal folder URL leaked while toggle off');
    assert.equal(body.settings.angeboteFolderUrl, undefined);
    assert.equal(body.settings.showAngebote, false);
  });
});

/* ═══ Group 8 — access gates ═══ */
describe('matrix: access gates', () => {
  beforeEach(async () => { await cleanupAll(); });

  async function seedDirect(extra: { revokedAt?: Date | null; expiresAt?: Date | null; passwordHash?: string | null }) {
    const positions = [canaryPos()];
    const { projectId } = await seedOwner({ positions });
    const id = nanoid(16); const token = nanoid(32); const now = new Date();
    const snap = buildShareSnapshot({ name: 'P', client: 'C', service: 'S', tenderNumber: 'T', deadline: '2026-12-31', calcParams: DEFAULT_PARAMS }, positions, ['p1'], 1);
    await db.insert(schema.shares).values({
      id, projectId, token, visiblePositionIds: ['p1'],
      settings: { ...BASE } as ShareSettings,
      snapshotData: snap, snapshotHash: snapshotHash(snap), snapshotVersion: 1,
      passwordHash: extra.passwordHash ?? null, expiresAt: extra.expiresAt ?? null,
      revokedAt: extra.revokedAt ?? null, createdAt: now, viewCount: 0,
    });
    return token;
  }

  test('unknown token → 404', async () => {
    const r = await publicApp.request('/api/share/does-not-exist-token');
    assert.equal(r.status, 404);
  });
  test('revoked → 410', async () => {
    const token = await seedDirect({ revokedAt: new Date() });
    assert.equal((await publicApp.request(`/api/share/${token}`)).status, 410);
  });
  test('expired → 410', async () => {
    const token = await seedDirect({ expiresAt: new Date(Date.now() - 60_000) });
    assert.equal((await publicApp.request(`/api/share/${token}`)).status, 410);
  });
  test('future expiry → 200', async () => {
    const token = await seedDirect({ expiresAt: new Date(Date.now() + 60_000) });
    assert.equal((await publicApp.request(`/api/share/${token}`)).status, 200);
  });
  test('password set, no header → 401', async () => {
    const token = await seedDirect({ passwordHash: await bcrypt.hash('secret', 8) });
    const r = await publicApp.request(`/api/share/${token}`);
    assert.equal(r.status, 401);
  });
  test('password set, wrong header → 401', async () => {
    const token = await seedDirect({ passwordHash: await bcrypt.hash('secret', 8) });
    const r = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 'nope' } });
    assert.equal(r.status, 401);
  });
  test('password set, correct header → 200 + no plaintext echo', async () => {
    const token = await seedDirect({ passwordHash: await bcrypt.hash('s3cret-CANARY', 8) });
    const r = await publicApp.request(`/api/share/${token}`, { headers: { 'X-Share-Password': 's3cret-CANARY' } });
    assert.equal(r.status, 200);
    assert.ok(!(await r.text()).includes('s3cret-CANARY'), 'password must never echo');
  });
});
