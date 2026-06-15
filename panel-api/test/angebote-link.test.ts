/**
 * Auto-find of the „04_Angebote" folder link at share time.
 *
 * Covers GET /api/panel/projects/:id/angebote-link, which lets the share
 * dialog resolve a calc's Ausschreibung Angebote-folder link from preisanfrage
 * without the calculator pasting it. Two resolution inputs:
 *   - structured `data.sourceRef` (set at „Kalkulation starten")
 *   - the `Ref: <kind>:<id>` provenance tag in `data.notes` (fallback for
 *     projects created before sourceRef existed)
 *
 * Runs in mock mode (no PREISANFRAGE_SERVICE_JWT), where getProjectPositions
 * derives a deterministic Angebote URL from the mock project's OneDrive base —
 * so the happy path is exercisable here. Same single-DB pattern as the sibling
 * route tests: DB_PATH is set before the db.js import.
 */

import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-angebote-link-'));
process.env.DB_PATH = join(tmpDir, 'angebote-link.db');
process.env.JWT_SECRET = 'angebote-link-test-' + Math.random().toString(36).slice(2);
// Be explicit: this suite asserts the mock-derived Angebote URL.
process.env.PREISANFRAGE_MOCK = '1';

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { projectsRoute, parsePreisanfrageRef } = await import('../src/routes/projects.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');

import type { CalcParams, ProjectData, Position } from '../src/schema.js';

const app = new Hono();
app.route('/api/panel/projects', projectsRoute);

async function ownerCookie(userId: string, email: string): Promise<{ Cookie: string }> {
  const token = await signToken({ sub: userId, email });
  return { Cookie: `${COOKIE_NAME}=${token}` };
}

const DEFAULT_PARAMS: CalcParams = {
  mittellohn: 30, verrechnungslohn: 50, materialZuschlag: 0.12, nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0,
  tagesstunden: 8, personaleinsatz: 3, mwst: 0.19, zielAufschlag: 0,
};

function pos(id: string): Position {
  return {
    id, oz: '1.1', shortText: 'P', longText: '', hinweisText: '',
    quantity: 1, unit: 'St', materialCost: 100, timeMinutes: 60, nuCost: 0,
    isHeader: false, sortOrder: 1, sectionPath: '',
    epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
    visibleToCustomer: true,
  };
}

// Mock managed project 1001 (Gesellchen) carries this OneDrive base; the route
// derives `<base>/04_Angebote` from it in mock mode.
const MOCK_1001_BASE =
  'https://kalku.sharepoint.com/sites/kt01/Dokumente/1695_Gesellchen_GmbH/260512_Ludwigschule_St_Ingbert';

async function seedProject(data: Partial<ProjectData>): Promise<{ ownerId: string; projectId: string }> {
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
      deadline: '2026-12-31', bidder: 'B', calcParams: DEFAULT_PARAMS, positions: [pos('p1')],
      ...data,
    },
    versionNumber: 1, createdAt: now, updatedAt: now,
  });
  return { ownerId, projectId };
}

function getLink(ownerId: string, projectId: string, query = '') {
  return ownerCookie(ownerId, 'o@test.local').then((h) =>
    app.request(`/api/panel/projects/${projectId}/angebote-link${query}`, { headers: h }),
  );
}

before(() => { runMigrations(); });

async function cleanupAll(): Promise<void> {
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}

describe('parsePreisanfrageRef', () => {
  test('extracts kind + id from the startKalkulation notes tag', () => {
    const notes = 'Aus preisanfrage importiert — Firma: Gesellchen GmbH (managed), Ref: managed:1001';
    assert.deepEqual(parsePreisanfrageRef(notes), { kind: 'managed', projectId: 1001 });
  });
  test('handles external / local kinds', () => {
    assert.deepEqual(parsePreisanfrageRef('… Ref: external:42'), { kind: 'external', projectId: 42 });
    assert.deepEqual(parsePreisanfrageRef('… Ref: local:7'), { kind: 'local', projectId: 7 });
  });
  test('returns null for empty / missing / malformed tags', () => {
    assert.equal(parsePreisanfrageRef(undefined), null);
    assert.equal(parsePreisanfrageRef(''), null);
    assert.equal(parsePreisanfrageRef('no ref here'), null);
    assert.equal(parsePreisanfrageRef('Ref: managed:0'), null);
    assert.equal(parsePreisanfrageRef('Ref: bogus:5'), null);
  });
});

describe('GET /projects/:id/angebote-link', () => {
  beforeEach(async () => { await cleanupAll(); });

  test('resolves via notes Ref: managed:1001 → mock-derived 04_Angebote URL', async () => {
    const { ownerId, projectId } = await seedProject({
      notes: 'Aus preisanfrage importiert — Firma: Gesellchen (managed), Ref: managed:1001',
    });
    const res = await getLink(ownerId, projectId);
    assert.equal(res.status, 200);
    const body = await res.json() as { angeboteFolderUrl: string | null; source?: string };
    assert.equal(body.source, 'preisanfrage');
    assert.equal(body.angeboteFolderUrl, `${MOCK_1001_BASE}/04_Angebote`);
  });

  test('resolves via structured sourceRef', async () => {
    const { ownerId, projectId } = await seedProject({
      sourceRef: { system: 'preisanfrage', kind: 'managed', firmaId: 5, projectId: 1001 },
    });
    const res = await getLink(ownerId, projectId);
    const body = await res.json() as { angeboteFolderUrl: string | null; source?: string };
    assert.equal(body.source, 'preisanfrage');
    assert.ok(body.angeboteFolderUrl?.endsWith('/04_Angebote'));
  });

  test('returns an already-stored link as-is (source: project)', async () => {
    const stored = 'https://kalku.sharepoint.com/:f:/s/KT01/already-minted';
    const { ownerId, projectId } = await seedProject({
      angeboteFolderUrl: stored,
      sourceRef: { system: 'preisanfrage', kind: 'managed', firmaId: 5, projectId: 1001 },
    });
    const res = await getLink(ownerId, projectId);
    const body = await res.json() as { angeboteFolderUrl: string | null; source?: string };
    assert.equal(body.source, 'project');
    assert.equal(body.angeboteFolderUrl, stored);
  });

  test('?refresh=1 bypasses the stored link and re-resolves upstream', async () => {
    const { ownerId, projectId } = await seedProject({
      angeboteFolderUrl: 'https://example.com/stale',
      sourceRef: { system: 'preisanfrage', kind: 'managed', firmaId: 5, projectId: 1001 },
    });
    const res = await getLink(ownerId, projectId, '?refresh=1');
    const body = await res.json() as { angeboteFolderUrl: string | null; source?: string };
    assert.equal(body.source, 'preisanfrage');
    assert.equal(body.angeboteFolderUrl, `${MOCK_1001_BASE}/04_Angebote`);
  });

  test('no source ref + no stored link → null with reason', async () => {
    const { ownerId, projectId } = await seedProject({ notes: 'hand-built project, no ref' });
    const res = await getLink(ownerId, projectId);
    const body = await res.json() as { angeboteFolderUrl: string | null; reason?: string };
    assert.equal(body.angeboteFolderUrl, null);
    assert.equal(body.reason, 'no_source_ref');
  });

  test('external source → not managed, no link', async () => {
    const { ownerId, projectId } = await seedProject({ notes: 'Ref: external:42' });
    const res = await getLink(ownerId, projectId);
    const body = await res.json() as { angeboteFolderUrl: string | null; reason?: string };
    assert.equal(body.angeboteFolderUrl, null);
    assert.equal(body.reason, 'source_not_managed');
  });

  test('managed ref but no folder upstream → null (upstream_no_link)', async () => {
    // Mock project 1002 has oneDriveShareUrl: null → no derivable folder.
    const { ownerId, projectId } = await seedProject({ notes: 'Ref: managed:1002' });
    const res = await getLink(ownerId, projectId);
    const body = await res.json() as { angeboteFolderUrl: string | null; reason?: string };
    assert.equal(body.angeboteFolderUrl, null);
    assert.equal(body.reason, 'upstream_no_link');
  });

  test('unknown project id → 404', async () => {
    const { ownerId } = await seedProject({});
    const res = await getLink(ownerId, 'does-not-exist');
    assert.equal(res.status, 404);
  });

  test('another user cannot resolve someone else\'s project (404)', async () => {
    const { projectId } = await seedProject({ notes: 'Ref: managed:1001' });
    const { ownerId: otherId } = await seedProject({});
    const res = await getLink(otherId, projectId);
    assert.equal(res.status, 404);
  });
});
