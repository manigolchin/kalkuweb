/**
 * „04_Angebote"-Freigabe — owner toggle + server-side URL gate.
 *
 * Covers the feature behind the customer-share Angebote button:
 *   - POST /projects/:id/shares accepts showAngebote + angeboteFolderUrl
 *   - the URL is constrained to http(s) at create time (javascript:/ftp: → 400)
 *   - GET /share/:token only ships angeboteFolderUrl when showAngebote is on
 *     AND the value is an http(s) URL; otherwise it is stripped entirely so the
 *     firm's internal SharePoint path never reaches a customer who shouldn't
 *     see it.
 *
 * Same single-DB pattern as round9-shares-public: DB_PATH is set before the
 * db.js import; node:test runs each file in its own subprocess so the path is
 * honored.
 */

import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-angebote-'));
process.env.DB_PATH = join(tmpDir, 'angebote.db');
process.env.JWT_SECRET = 'angebote-test-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { publicRoute } = await import('../src/routes/public.js');
const { sharesRoute } = await import('../src/routes/shares.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');
const { eq } = await import('drizzle-orm');

import type { Position, CalcParams } from '../src/schema.js';

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

function fixturePos(id: string): Position {
  return {
    id, oz: '1.1', shortText: 'P', longText: '', hinweisText: '',
    quantity: 1, unit: 'St', materialCost: 100, timeMinutes: 60, nuCost: 0,
    isHeader: false, sortOrder: 1, sectionPath: '',
    epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
    visibleToCustomer: true,
  };
}

async function seedOwnerOnly(): Promise<{ ownerId: string; projectId: string }> {
  const now = new Date();
  const ownerId = nanoid(16);
  const projectId = nanoid(16);
  await db.insert(schema.users).values({
    id: ownerId, email: `${ownerId}@test.local`, passwordHash: 'unused',
    name: 'Owner', companyName: 'TestCo', companyLogoUrl: '',
    companyPhone: '', companyContactEmail: '',
    mustChangePassword: false, createdAt: now, updatedAt: now,
  });
  await db.insert(schema.projects).values({
    id: projectId, ownerId,
    data: {
      name: 'P', client: 'C', service: 'S', tenderNumber: 'T',
      deadline: '2026-12-31', bidder: 'B', calcParams: DEFAULT_PARAMS, positions: [fixturePos('pos1')],
    },
    versionNumber: 1, createdAt: now, updatedAt: now,
  });
  return { ownerId, projectId };
}

const BASE_SETTINGS = {
  brandHeader: 'co-branded', allowApproval: true, allowChangeRequests: true,
  showTotals: true, showMwst: true,
};

async function createShare(ownerId: string, projectId: string, extraSettings: Record<string, unknown>) {
  return ownerApp.request(`/api/projects/${projectId}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await ownerCookie(ownerId, 'o@test.local')) },
    body: JSON.stringify({ visiblePositionIds: ['pos1'], settings: { ...BASE_SETTINGS, ...extraSettings } }),
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

const SP_URL =
  'https://kalku.sharepoint.com/sites/kt01/Dokumente/1695_Gesellchen/260512_Ludwigschule/04_Angebote';

describe('04_Angebote share gate', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('showAngebote on + https URL → customer payload carries the link', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, { showAngebote: true, angeboteFolderUrl: SP_URL });
    assert.equal(res.status, 200);
    const { token } = await res.json() as { token: string };

    const view = await publicApp.request(`/api/share/${token}`);
    assert.equal(view.status, 200);
    const body = await view.json() as { settings: { showAngebote?: boolean; angeboteFolderUrl?: string } };
    assert.equal(body.settings.showAngebote, true);
    assert.equal(body.settings.angeboteFolderUrl, SP_URL);
  });

  test('showAngebote off → URL stored on the row but NEVER shipped to the customer', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, { showAngebote: false, angeboteFolderUrl: SP_URL });
    assert.equal(res.status, 200);
    const { id, token } = await res.json() as { id: string; token: string };

    // Stored on the row (the owner's own data) ...
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, id) });
    assert.equal((row!.settings as { angeboteFolderUrl?: string }).angeboteFolderUrl, SP_URL);

    // ... but the customer view must contain no trace of it.
    const view = await publicApp.request(`/api/share/${token}`);
    const raw = await view.text();
    assert.ok(!raw.includes('04_Angebote'), 'internal folder URL leaked to customer when toggle is off');
    const body = JSON.parse(raw) as { settings: { showAngebote?: boolean; angeboteFolderUrl?: string } };
    assert.equal(body.settings.showAngebote, false);
    assert.equal(body.settings.angeboteFolderUrl, undefined);
  });

  test('showAngebote on but URL missing → normalised to off, no link', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, { showAngebote: true });
    assert.equal(res.status, 200);
    const { token } = await res.json() as { token: string };

    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { settings: { showAngebote?: boolean; angeboteFolderUrl?: string } };
    assert.equal(body.settings.showAngebote, false);
    assert.equal(body.settings.angeboteFolderUrl, undefined);
  });

  // Regression: the share dialog ALWAYS sends angeboteFolderUrl, using '' when
  // the project has no „04_Angebote" link. An empty string must be treated as
  // "unset" — NOT rejected by .url() — otherwise share creation 400s for every
  // project without a folder link ("Link konnte nicht erstellt werden").
  test('empty-string angeboteFolderUrl is treated as unset (200, no link)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, {
      showAngebote: false, angeboteFolderUrl: '',
    });
    assert.equal(res.status, 200);
    const { id, token } = await res.json() as { id: string; token: string };

    // Empty string must NOT persist on the row ...
    const row = await db.query.shares.findFirst({ where: eq(schema.shares.id, id) });
    assert.equal((row!.settings as { angeboteFolderUrl?: string }).angeboteFolderUrl, undefined);

    // ... and the customer view carries no link.
    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { settings: { angeboteFolderUrl?: string } };
    assert.equal(body.settings.angeboteFolderUrl, undefined);
  });

  test('whitespace-only angeboteFolderUrl is treated as unset (200)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, { angeboteFolderUrl: '   ' });
    assert.equal(res.status, 200);
  });

  test('javascript: URL rejected at create (400)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, {
      showAngebote: true, angeboteFolderUrl: 'javascript:alert(1)',
    });
    assert.equal(res.status, 400);
  });

  test('non-http(s) (ftp) URL rejected at create (400)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, {
      showAngebote: true, angeboteFolderUrl: 'ftp://host/share',
    });
    assert.equal(res.status, 400);
  });

  test('omitting showAngebote leaves it off (back-compat default)', async () => {
    const { ownerId, projectId } = await seedOwnerOnly();
    const res = await createShare(ownerId, projectId, {});
    assert.equal(res.status, 200);
    const { token } = await res.json() as { token: string };

    const view = await publicApp.request(`/api/share/${token}`);
    const body = await view.json() as { settings: { showAngebote?: boolean; angeboteFolderUrl?: string } };
    assert.equal(body.settings.showAngebote, false);
    assert.equal(body.settings.angeboteFolderUrl, undefined);
  });
});
