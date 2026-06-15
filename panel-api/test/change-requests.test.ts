/**
 * Round 12 tests — structured customer change requests ("Änderungswünsche").
 *   POST /api/share/:token/change-requests          — customer-facing
 *   GET  /api/inbox                                  — owner-auth (aggregation)
 *   POST /api/inbox/change-requests/:id/resolve      — owner-auth (resolve)
 *
 * Shared-DB pattern from position-comments.test.ts. The "Ist" value of every
 * wish is lifted SERVER-SIDE from the frozen snapshot — these tests pin that
 * (a client-sent currentValue is never trusted).
 */
import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-cr-'));
process.env.DB_PATH = join(tmpDir, 'test.db');

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { publicRoute } = await import('../src/routes/public.js');
const { inboxRoute } = await import('../src/routes/inbox.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');

const app = new Hono();
app.route('/api', publicRoute);
const ownerApp = new Hono();
ownerApp.route('/api', inboxRoute);

async function ownerHeaders(userId: string, email: string): Promise<{ Cookie: string }> {
  const token = await signToken({ sub: userId, email });
  return { Cookie: `${COOKIE_NAME}=${token}` };
}

type Seed = { token: string; shareId: string; projectId: string; ownerId: string };

async function seed(
  opts: { allowChangeRequests?: boolean; showCostBreakdown?: boolean; showTotals?: boolean } = {},
): Promise<Seed> {
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
      name: 'P', client: 'C', service: 'S', tenderNumber: '', deadline: '', bidder: 'Bau GmbH',
      calcParams: {
        mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
        geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
        tagesstunden: 8, personaleinsatz: 3, mwst: 0.19, zielAufschlag: 0,
      },
      positions: [],
    },
    versionNumber: 1, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.shares).values({
    id: shareId, projectId, token,
    visiblePositionIds: ['pos1'],
    settings: {
      brandHeader: 'co-branded' as const,
      allowApproval: true,
      allowChangeRequests: opts.allowChangeRequests ?? true,
      showTotals: opts.showTotals ?? true,
      showMwst: true,
      showCostBreakdown: opts.showCostBreakdown ?? true,
      showCalculation: true,
    },
    snapshotData: {
      snapshottedAt: now.toISOString(),
      projectVersionNumber: 1,
      project: { name: 'P', client: 'C', service: 'S', tenderNumber: '', deadline: '', mwst: 0.19 },
      positions: [
        {
          id: 'pos1', oz: '1.4.1.1', shortText: 'RZA01 Rettungszeichenleuchte', longText: '',
          quantity: 4, unit: 'St', isHeader: false, sortOrder: 1,
          ep: 200, gp: 800, gpLohn: 200, gpMaterial: 500, gpGeraet: 100, gpNu: 0,
        },
      ],
      summary: {
        netto: 800, mwst: 152, brutto: 952, totalHours: 2.4, ekTotal: 600, ueberschuss: 200,
        costTypes: {
          lohn: { ek: 150, vk: 200, zuschlagPct: 0.33, differnz: 50 },
          material: { ek: 446, vk: 500, zuschlagPct: 0.12, differnz: 54 },
          geraete: { ek: 90, vk: 100, zuschlagPct: 0.11, differnz: 10 },
          nu: { ek: 0, vk: 0, zuschlagPct: 0, differnz: 0 },
        },
        mitarbeiter: 3, arbeitstage: 0.1, monate: 0,
      },
    },
    snapshotHash: 'h0', snapshotVersion: 1, passwordHash: null,
    expiresAt: null, createdAt: now, viewCount: 1,
  });
  return { token, shareId, projectId, ownerId };
}

before(() => { runMigrations(); });

async function cleanup(): Promise<void> {
  await db.delete(schema.changeRequests);
  await db.delete(schema.shareAccessLog);
  await db.delete(schema.positionComments);
  await db.delete(schema.shareResponses);
  await db.delete(schema.auditEvents);
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}

function post(token: string, body: unknown) {
  return app.request(`/api/share/${token}/change-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Round 12 — POST /share/:token/change-requests', () => {
  beforeEach(async () => { await cleanup(); });

  test('position scope: lifts currentValue from snapshot + infers direction', async () => {
    const { token } = await seed();
    const res = await post(token, {
      customerName: 'Kunde Schmidt',
      items: [{ scope: 'position', positionOz: '1.4.1.1', field: 'material', requestedValue: 400 }],
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { ok: boolean; count: number };
    assert.equal(body.ok, true);
    assert.equal(body.count, 1);

    const rows = await db.select().from(schema.changeRequests);
    assert.equal(rows.length, 1);
    const r = rows[0];
    assert.equal(r.field, 'material');
    assert.equal(r.scope, 'position');
    assert.equal(r.positionOz, '1.4.1.1');
    assert.equal(r.currentValue, 500); // gpMaterial from snapshot, NOT client-sent
    assert.equal(r.requestedValue, 400);
    assert.equal(r.direction, 'lower'); // inferred 400 < 500
    assert.equal(r.unit, 'eur');
  });

  test('global Endbetrag: currentValue = summary.netto', async () => {
    const { token } = await seed();
    const res = await post(token, {
      items: [{ scope: 'global', field: 'endbetrag', requestedValue: 750 }],
    });
    assert.equal(res.status, 200);
    const rows = await db.select().from(schema.changeRequests);
    assert.equal(rows[0].currentValue, 800);
    assert.equal(rows[0].requestedValue, 750);
    assert.equal(rows[0].direction, 'lower');
    assert.equal(rows[0].positionOz, null);
  });

  test('global Arbeitszeit uses hours (std) from totalHours', async () => {
    const { token } = await seed();
    await post(token, { items: [{ scope: 'global', field: 'zeit', direction: 'lower', note: 'schneller bitte' }] });
    const rows = await db.select().from(schema.changeRequests);
    assert.equal(rows[0].unit, 'std');
    assert.equal(rows[0].currentValue, 2.4);
    assert.equal(rows[0].requestedValue, null);
    assert.equal(rows[0].direction, 'lower');
  });

  test('client-sent currentValue is ignored (anti-spoof)', async () => {
    const { token } = await seed();
    await post(token, {
      items: [{ scope: 'position', positionOz: '1.4.1.1', field: 'gesamtpreis', requestedValue: 700, currentValue: 999999 }],
    });
    const rows = await db.select().from(schema.changeRequests);
    assert.equal(rows[0].currentValue, 800); // pos.gp, not the spoofed 999999
  });

  test('rejects position OZ not in snapshot → 400', async () => {
    const { token } = await seed();
    const res = await post(token, { items: [{ scope: 'position', positionOz: '9.9.9', field: 'material', requestedValue: 1 }] });
    assert.equal(res.status, 400);
    assert.equal((await res.json() as { error: string }).error, 'invalid_change_request');
  });

  test('rejects invalid scope/field combo (global + menge) → 400', async () => {
    const { token } = await seed();
    const res = await post(token, { items: [{ scope: 'global', field: 'menge', requestedValue: 5 }] });
    assert.equal(res.status, 400);
  });

  test('allowChangeRequests=false → 403', async () => {
    const { token } = await seed({ allowChangeRequests: false });
    const res = await post(token, { items: [{ scope: 'global', field: 'endbetrag', requestedValue: 1 }] });
    assert.equal(res.status, 403);
  });

  test('all-empty items → 400 (nothing actionable)', async () => {
    const { token } = await seed();
    const res = await post(token, { items: [{ scope: 'global', field: 'endbetrag' }] });
    assert.equal(res.status, 400);
  });

  test('rejects a cost-type wish when the share hides the breakdown → 400', async () => {
    const { token } = await seed({ showCostBreakdown: false });
    const res = await post(token, {
      items: [{ scope: 'position', positionOz: '1.4.1.1', field: 'material', requestedValue: 400 }],
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json() as { error: string }).error, 'invalid_change_request');
    // Menge stays allowed (always shown).
    const ok = await post(token, {
      items: [{ scope: 'position', positionOz: '1.4.1.1', field: 'menge', requestedValue: 3 }],
    });
    assert.equal(ok.status, 200);
  });

  test('rejects an Endbetrag wish when totals are hidden → 400', async () => {
    const { token } = await seed({ showTotals: false });
    const res = await post(token, { items: [{ scope: 'global', field: 'endbetrag', requestedValue: 1 }] });
    assert.equal(res.status, 400);
  });

  test('revoked share → 410', async () => {
    const { token, shareId } = await seed();
    await db.update(schema.shares).set({ revokedAt: new Date() }).where(
      (await import('drizzle-orm')).eq(schema.shares.id, shareId),
    );
    const res = await post(token, { items: [{ scope: 'global', field: 'endbetrag', requestedValue: 1 }] });
    assert.equal(res.status, 410);
  });
});

describe('Round 12 — inbox aggregation + resolve', () => {
  beforeEach(async () => { await cleanup(); });

  test('inbox returns change requests with resolved shortText', async () => {
    const { token, ownerId } = await seed();
    await post(token, {
      customerName: 'Schmidt',
      items: [
        { scope: 'position', positionOz: '1.4.1.1', field: 'material', requestedValue: 400 },
        { scope: 'global', field: 'endbetrag', requestedValue: 750 },
      ],
    });
    const res = await ownerApp.request('/api/inbox', { headers: await ownerHeaders(ownerId, 'o@test.local') });
    assert.equal(res.status, 200);
    const body = await res.json() as { entries: Array<{ changeRequests: Array<{ field: string; scope: string; shortText: string | null; currentValue: number | null }> }> };
    const crs = body.entries[0].changeRequests;
    assert.equal(crs.length, 2);
    const positionCr = crs.find((c) => c.scope === 'position')!;
    assert.equal(positionCr.shortText, 'RZA01 Rettungszeichenleuchte');
    assert.equal(positionCr.currentValue, 500);
    const globalCr = crs.find((c) => c.scope === 'global')!;
    assert.equal(globalCr.shortText, null);
  });

  test('resolve marks resolvedAt; re-open clears it', async () => {
    const { token, ownerId } = await seed();
    await post(token, { items: [{ scope: 'global', field: 'endbetrag', requestedValue: 750 }] });
    const [row] = await db.select().from(schema.changeRequests);
    const h = await ownerHeaders(ownerId, 'o@test.local');

    const r1 = await ownerApp.request(`/api/inbox/change-requests/${row.id}/resolve`, {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: true }),
    });
    assert.equal(r1.status, 200);
    let [after] = await db.select().from(schema.changeRequests);
    assert.ok(after.resolvedAt != null);

    const r2 = await ownerApp.request(`/api/inbox/change-requests/${row.id}/resolve`, {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: false }),
    });
    assert.equal(r2.status, 200);
    [after] = await db.select().from(schema.changeRequests);
    assert.equal(after.resolvedAt, null);
  });

  test('resolve by a different (real) user → 403', async () => {
    const { token } = await seed();
    await post(token, { items: [{ scope: 'global', field: 'endbetrag', requestedValue: 750 }] });
    const [row] = await db.select().from(schema.changeRequests);
    // A real, active user who simply doesn't own the project.
    const now = new Date();
    const strangerId = nanoid(16);
    await db.insert(schema.users).values({
      id: strangerId, email: `${strangerId}@test.local`, passwordHash: 'unused',
      name: 'Stranger', companyName: '', companyLogoUrl: '', companyPhone: '', companyContactEmail: '',
      mustChangePassword: false, createdAt: now, updatedAt: now,
    });
    const stranger = await ownerHeaders(strangerId, `${strangerId}@test.local`);
    const res = await ownerApp.request(`/api/inbox/change-requests/${row.id}/resolve`, {
      method: 'POST', headers: { ...stranger, 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: true }),
    });
    assert.equal(res.status, 403);
  });
});
