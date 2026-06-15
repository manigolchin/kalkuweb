/**
 * Hardening regression suite — locks down four real bugs found in the
 * 2026-06-08 deep audit of the Kalkulation share surface:
 *
 *  FIX A (public.ts): when BOTH showCalculation=false AND showCostBreakdown=false,
 *        the per-cost-type VERKAUF split (summary.costTypes.*.vk) must NOT ship —
 *        no tier renders it, so it was a raw-JSON leak. It MUST still ship when
 *        showCalculation=true (Kalkulation table) or showCostBreakdown=true
 *        (composition bar) so we don't over-strip the legit display.
 *  FIX C (snapshot.ts): internal position types (wagnis/reserve/nu_marge/
 *        lohn_puffer) must NEVER reach the customer snapshot, even if their id
 *        is in visiblePositionIds.
 *  FIX B (public.ts): /approve, /changes, /pdf must reject EXPIRED shares (410),
 *        not just revoked ones.
 *  FIX D (shares.ts): creating a share with a past expiresAt → 400 (no silent
 *        never-expiring link).
 *
 * Harness mirrors round9-shares-public: one sqlite DB via DB_PATH set before
 * importing db.js; node:test runs each file in its own subprocess.
 */

import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-harden-'));
process.env.DB_PATH = join(tmpDir, 'harden.db');
process.env.JWT_SECRET = 'harden-test-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { publicRoute } = await import('../src/routes/public.js');
const { sharesRoute } = await import('../src/routes/shares.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { buildShareSnapshot, snapshotHash } = await import('../src/lib/snapshot.js');
const { nanoid } = await import('nanoid');
const { eq } = await import('drizzle-orm');

import type { Position, CalcParams, ShareSettings } from '../src/schema.js';

const publicApp = new Hono();
publicApp.route('/api', publicRoute);
const ownerApp = new Hono();
ownerApp.route('/api', sharesRoute);

async function ownerCookie(userId: string, email: string): Promise<{ Cookie: string }> {
  const token = await signToken({ sub: userId, email });
  return { Cookie: `${COOKIE_NAME}=${token}` };
}

const DEFAULT_PARAMS: CalcParams = {
  mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
  tagesstunden: 8, personaleinsatz: 3, mwst: 0.19, zielAufschlag: 0,
};

function fixturePos(overrides: Partial<Position> & { id: string }): Position {
  return {
    id: overrides.id, oz: '1.1', shortText: 'P', longText: '', hinweisText: '',
    quantity: 1, unit: 'St', materialCost: 100, timeMinutes: 60, nuCost: 0,
    isHeader: false, sortOrder: 1, sectionPath: '',
    epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
    visibleToCustomer: true,
    ...overrides,
  };
}

const BASE_SETTINGS = {
  brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
  showTotals: true, showMwst: true,
};

async function seedOwnerOnly(positions: Position[]): Promise<{ ownerId: string; projectId: string }> {
  const now = new Date();
  const ownerId = nanoid(16);
  const projectId = nanoid(16);
  await db.insert(schema.users).values({
    id: ownerId, email: `${ownerId}@test.local`, passwordHash: 'unused',
    name: 'Owner', companyName: 'TestCo', companyLogoUrl: '',
    companyPhone: '', companyContactEmail: 'contact@example.com',
    mustChangePassword: false, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.projects).values({
    id: projectId, ownerId,
    data: {
      name: 'P', client: 'C', service: 'S', tenderNumber: 'T',
      deadline: '2026-12-31', bidder: 'B', calcParams: DEFAULT_PARAMS, positions,
    },
    versionNumber: 1, createdAt: now, updatedAt: now,
  });
  return { ownerId, projectId };
}

/** Insert a share row directly (bypassing the create-route validation) so we
 *  can fabricate states the API would reject — e.g. an already-expired share. */
async function seedShareDirect(opts: {
  positions: Position[];
  visibleIds: string[];
  settings?: Partial<ShareSettings>;
  expiresAt?: Date | null;
}): Promise<{ token: string; shareId: string; projectId: string }> {
  const { ownerId, projectId } = await seedOwnerOnly(opts.positions);
  const shareId = nanoid(16);
  const token = nanoid(32);
  const now = new Date();
  const snap = buildShareSnapshot(
    { name: 'P', client: 'C', service: 'S', tenderNumber: 'T', deadline: '2026-12-31', calcParams: DEFAULT_PARAMS },
    opts.positions, opts.visibleIds, 1,
  );
  await db.insert(schema.shares).values({
    id: shareId, projectId, token,
    visiblePositionIds: opts.visibleIds,
    settings: { ...BASE_SETTINGS, ...opts.settings } as ShareSettings,
    snapshotData: snap, snapshotHash: snapshotHash(snap), snapshotVersion: 1,
    passwordHash: null, expiresAt: opts.expiresAt ?? null,
    createdAt: now, viewCount: 0,
  });
  return { token, shareId, projectId };
}

async function createShareViaApi(ownerId: string, projectId: string, settings: Record<string, unknown>, visibleIds: string[]) {
  return ownerApp.request(`/api/projects/${projectId}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
    body: JSON.stringify({ visiblePositionIds: visibleIds, settings: { ...BASE_SETTINGS, ...settings } }),
  });
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

/* ───────────────────────────────────────────────────────────────────────── */

describe('FIX A — summary.costTypes VERKAUF split gating', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('both showCalculation=false AND showCostBreakdown=false → costTypes.*.vk stripped to 0', async () => {
    const { ownerId, projectId } = await seedOwnerOnly([fixturePos({ id: 'p1', materialCost: 500 })]);
    const res = await createShareViaApi(ownerId, projectId, { showCalculation: false, showCostBreakdown: false }, ['p1']);
    assert.equal(res.status, 200);
    const { token } = await res.json() as { token: string };
    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { summary: { costTypes: Record<string, { vk: number }> } | null };
    assert.ok(body.summary, 'summary present (showTotals on)');
    assert.equal(body.summary!.costTypes.material.vk, 0, 'material VK composition must be stripped');
    assert.equal(body.summary!.costTypes.lohn.vk, 0);
    assert.equal(body.summary!.costTypes.geraete.vk, 0);
  });

  test('showCalculation=false but showCostBreakdown=true → vk KEPT (composition bar renders it)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly([fixturePos({ id: 'p1', materialCost: 500 })]);
    const res = await createShareViaApi(ownerId, projectId, { showCalculation: false, showCostBreakdown: true }, ['p1']);
    const { token } = await res.json() as { token: string };
    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { summary: { costTypes: Record<string, { vk: number; ek: number }> } };
    assert.ok(body.summary.costTypes.material.vk > 0, 'VK kept for the composition bar');
    assert.equal(body.summary.costTypes.material.ek, 0, 'but EINKAUF still redacted (showCalculation off)');
  });

  test('showCalculation=true + showCostBreakdown=false → vk KEPT (Kalkulation table renders it) — no over-strip', async () => {
    const { ownerId, projectId } = await seedOwnerOnly([fixturePos({ id: 'p1', materialCost: 500 })]);
    const res = await createShareViaApi(ownerId, projectId, { showCalculation: true, showCostBreakdown: false }, ['p1']);
    const { token } = await res.json() as { token: string };
    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { summary: { costTypes: Record<string, { vk: number }> } };
    assert.ok(body.summary.costTypes.material.vk > 0, 'VK kept — Kalkulation table shows per-type VERKAUF');
  });

  test('showTotals=false → no summary block at all', async () => {
    const { ownerId, projectId } = await seedOwnerOnly([fixturePos({ id: 'p1', materialCost: 500 })]);
    const res = await createShareViaApi(ownerId, projectId, { showTotals: false }, ['p1']);
    const { token } = await res.json() as { token: string };
    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { summary: unknown };
    assert.equal(body.summary, null);
  });
});

describe('FIX C — internal position types excluded from snapshot', () => {
  beforeEach(async () => { await cleanupAll(); });

  for (const internalType of ['wagnis', 'reserve', 'nu_marge', 'lohn_puffer'] as const) {
    test(`${internalType} position in visiblePositionIds is NEVER in the customer payload`, async () => {
      const positions = [
        fixturePos({ id: 'std', oz: '1.1', materialCost: 100 }),
        fixturePos({ id: 'intern', oz: '1.2', materialCost: 99999, positionType: internalType, visibleToCustomer: false }),
      ];
      const { ownerId, projectId } = await seedOwnerOnly(positions);
      // Force BOTH ids into the share — the snapshot must still drop the internal one.
      const res = await createShareViaApi(ownerId, projectId, {}, ['std', 'intern']);
      assert.equal(res.status, 200);
      const { token } = await res.json() as { token: string };
      const view = await publicApp.request(`/api/share/${token}`);
      const raw = await view.text();
      const body = JSON.parse(raw) as { positions: Array<{ id: string }> };
      assert.equal(body.positions.length, 1, 'only the standard position survives');
      assert.equal(body.positions[0].id, 'std');
      assert.ok(!body.positions.some((p) => p.id === 'intern'), `${internalType} must be excluded`);
      assert.ok(!raw.includes('99999'), `${internalType} GP value must not leak into the raw JSON`);
    });
  }

  test('positive control: standard visibleToCustomer position is included', async () => {
    const { ownerId, projectId } = await seedOwnerOnly([fixturePos({ id: 'std', materialCost: 100 })]);
    const res = await createShareViaApi(ownerId, projectId, {}, ['std']);
    const { token } = await res.json() as { token: string };
    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { positions: Array<{ id: string }> };
    assert.equal(body.positions.length, 1);
    assert.equal(body.positions[0].id, 'std');
  });
});

describe('FIX B — approve/changes/pdf reject expired shares', () => {
  beforeEach(async () => { await cleanupAll(); });

  const past = () => new Date(Date.now() - 60_000);

  test('POST /approve on an expired share → 410', async () => {
    const { token } = await seedShareDirect({ positions: [fixturePos({ id: 'p1' })], visibleIds: ['p1'], expiresAt: past() });
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Kunde' }),
    });
    assert.equal(res.status, 410);
    const body = await res.json() as { reason?: string };
    assert.equal(body.reason, 'expired');
  });

  test('POST /changes on an expired share → 410', async () => {
    const { token } = await seedShareDirect({ positions: [fixturePos({ id: 'p1' })], visibleIds: ['p1'], expiresAt: past() });
    const res = await publicApp.request(`/api/share/${token}/changes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'K', changes: [{ positionId: 'p1', type: 'modify', text: 't' }] }),
    });
    assert.equal(res.status, 410);
  });

  test('GET /pdf on an expired share → 410 (no PDF leaked)', async () => {
    const { token } = await seedShareDirect({ positions: [fixturePos({ id: 'p1' })], visibleIds: ['p1'], expiresAt: past() });
    const res = await publicApp.request(`/api/share/${token}/pdf`);
    assert.equal(res.status, 410);
  });

  test('positive control: /approve on a non-expired share → 200', async () => {
    const { token } = await seedShareDirect({ positions: [fixturePos({ id: 'p1' })], visibleIds: ['p1'], expiresAt: null });
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Kunde' }),
    });
    assert.equal(res.status, 200);
  });

  test('revoked still 410 (regression guard for approve)', async () => {
    const { token, shareId } = await seedShareDirect({ positions: [fixturePos({ id: 'p1' })], visibleIds: ['p1'] });
    await db.update(schema.shares).set({ revokedAt: new Date() }).where(eq(schema.shares.id, shareId));
    const res = await publicApp.request(`/api/share/${token}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'K' }),
    });
    assert.equal(res.status, 410);
  });
});

describe('FIX D — create share rejects a past expiresAt', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('past expiresAt → 400 (no silent never-expiring link)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly([fixturePos({ id: 'p1' })]);
    const res = await createShareViaApi(ownerId, projectId, { expiresAt: new Date(Date.now() - 60_000).toISOString() }, ['p1']);
    assert.equal(res.status, 400);
  });

  test('future expiresAt → 200 and the column is set', async () => {
    const { ownerId, projectId } = await seedOwnerOnly([fixturePos({ id: 'p1' })]);
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const res = await createShareViaApi(ownerId, projectId, { expiresAt: future.toISOString() }, ['p1']);
    assert.equal(res.status, 200);
    const { id } = await res.json() as { id: string };
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, id) });
    assert.ok(row!.expiresAt instanceof Date);
    assert.ok(Math.abs(row!.expiresAt!.getTime() - future.getTime()) < 1000);
  });
});
