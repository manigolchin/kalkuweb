/**
 * Round 11 — local Firma + local Ausschreibung CRUD tests.
 *
 * Strategy mirrors round9-misc-routes.test.ts: shared SQLite DB via DB_PATH
 * set before any import, fresh user(s) per test via nanoid, owner endpoints
 * exercised through a real signed JWT cookie. Preisanfrage mock enabled via
 * PREISANFRAGE_MOCK=fixture so GET /firmen returns the fixture rows + the
 * user's local rows merged together.
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// MUST happen before any import that resolves db.js / preisanfrage.js.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-r11-local-'));
process.env.DB_PATH = join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'r11-local-' + Math.random().toString(36).slice(2);
process.env.PREISANFRAGE_MOCK = 'fixture';

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { firmenRoute } = await import('../src/routes/firmen.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');

const app = new Hono();
app.route('/api', firmenRoute);

async function ownerCookie(userId: string, email: string): Promise<string> {
  const token = await signToken({ sub: userId, email });
  return `${COOKIE_NAME}=${token}`;
}

async function seedUser(): Promise<{ id: string; email: string; cookie: string }> {
  const id = nanoid(16);
  const email = `${id}@test.local`;
  const now = new Date();
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash: 'unused',
    name: 'T',
    companyName: 'TestCo',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  return { id, email, cookie: await ownerCookie(id, email) };
}

async function cleanupAll(): Promise<void> {
  await db.delete(schema.localAuschreibungen);
  await db.delete(schema.localFirmen);
  await db.delete(schema.firmaCalcDefaults);
  await db.delete(schema.users);
}

before(() => {
  runMigrations();
});

beforeEach(async () => {
  await cleanupAll();
});

/* ─── Schema sanity ───────────────────────────────────────────────── */

describe('Round 11 — schema migrations', () => {
  test('local_firmen + local_auschreibungen tables exist after migration', async () => {
    runMigrations(); // idempotent
    const Database = (await import('better-sqlite3')).default;
    const sqlite = new Database(process.env.DB_PATH!);
    const fCols = sqlite.prepare("PRAGMA table_info(local_firmen)").all() as Array<{ name: string }>;
    const fNames = fCols.map((c) => c.name);
    for (const req of ['id', 'owner_id', 'display_name', 'trade_type', 'notes', 'archived_at', 'created_at', 'updated_at']) {
      assert.ok(fNames.includes(req), `local_firmen.${req} missing`);
    }
    const aCols = sqlite.prepare("PRAGMA table_info(local_auschreibungen)").all() as Array<{ name: string }>;
    const aNames = aCols.map((c) => c.name);
    for (const req of ['id', 'owner_id', 'firma_kind', 'firma_id', 'name', 'project_number', 'auftraggeber_name', 'anschrift_plz_ort', 'submission_date', 'submission_time', 'status', 'notes', 'archived_at', 'created_at', 'updated_at']) {
      assert.ok(aNames.includes(req), `local_auschreibungen.${req} missing`);
    }
    sqlite.close();
  });

  test('migration is idempotent — running twice does not throw', async () => {
    runMigrations();
    runMigrations();
    runMigrations();
    // Pass if no throw.
  });

  test('local_auschreibungen.status CHECK constraint rejects invalid values', async () => {
    runMigrations();
    const Database = (await import('better-sqlite3')).default;
    const sqlite = new Database(process.env.DB_PATH!);
    const now = Date.now();
    // Insert a user first (FK) — but we can use the same DB so create a tmp user.
    const uid = nanoid(16);
    sqlite.prepare(
      `INSERT INTO users (id, email, password_hash, name, company_name, must_change_password, created_at, updated_at)
       VALUES (?, ?, '', '', '', 0, ?, ?)`,
    ).run(uid, `tmp-${uid}@x.local`, now, now);
    assert.throws(
      () => sqlite.prepare(
        `INSERT INTO local_auschreibungen
         (id, owner_id, firma_kind, firma_id, name, status, created_at, updated_at)
         VALUES (?, ?, 'local', 'somefirma', 'name', 'INVALID_STATUS', ?, ?)`,
      ).run(nanoid(16), uid, now, now),
      /CHECK/i,
    );
    sqlite.close();
  });
});

/* ─── POST /firmen ────────────────────────────────────────────────── */

describe('POST /firmen (createLocalFirma)', () => {
  test('401 without auth', async () => {
    const res = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Test' }),
    });
    assert.equal(res.status, 401);
  });

  test('creates a local Firma with all fields + returns serialized row', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({
        displayName: 'Lokale Firma X',
        tradeType: 'galabau',
        notes: 'Privatkunde Müller, Berlin',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as {
      kind: string; id: string; displayName: string; tradeType: string | null;
      notes: string | null; createdAt: number; updatedAt: number; archivedAt: number | null;
    };
    assert.equal(body.kind, 'local');
    assert.equal(typeof body.id, 'string');
    assert.equal(body.id.length, 16);
    assert.equal(body.displayName, 'Lokale Firma X');
    assert.equal(body.tradeType, 'galabau');
    assert.equal(body.notes, 'Privatkunde Müller, Berlin');
    assert.equal(body.archivedAt, null);
    assert.equal(typeof body.createdAt, 'number');
    assert.equal(typeof body.updatedAt, 'number');
  });

  test('creates with only displayName — tradeType + notes default null', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Minimal' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { tradeType: string | null; notes: string | null };
    assert.equal(body.tradeType, null);
    assert.equal(body.notes, null);
  });

  test('rejects empty displayName → 400', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: '   ' }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects displayName >200 chars → 400', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'x'.repeat(201) }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects unparseable body → 400', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: 'not-json',
    });
    assert.equal(res.status, 400);
  });
});

/* ─── PUT /firmen/local/:id ───────────────────────────────────────── */

describe('PUT /firmen/local/:id (updateLocalFirma)', () => {
  test('patches displayName + notes', async () => {
    const u = await seedUser();
    const create = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Original' }),
    });
    const { id } = await create.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Renamed', notes: 'Updated notes' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { displayName: string; notes: string | null };
    assert.equal(body.displayName, 'Renamed');
    assert.equal(body.notes, 'Updated notes');
  });

  test('404 when updating another user\'s firma', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const create = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ displayName: 'A only' }),
    });
    const { id } = await create.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
      body: JSON.stringify({ displayName: 'hacked' }),
    });
    assert.equal(res.status, 404);
  });

  test('404 on unknown id', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen/local/does-not-exist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'X' }),
    });
    assert.equal(res.status, 404);
  });
});

/* ─── DELETE /firmen/local/:id ────────────────────────────────────── */

describe('DELETE /firmen/local/:id (archiveLocalFirma)', () => {
  test('soft-deletes the firma + cascades to its local Ausschreibungen', async () => {
    const u = await seedUser();
    // Create firma
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Doomed' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    // Create two child Ausschreibungen
    const ca = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Aus 1' }),
    });
    const { id: ausId1 } = await ca.json() as { id: string };
    await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Aus 2' }),
    });

    // Sanity: parent visible in list
    const listBefore = await app.request('/api/firmen', { headers: { Cookie: u.cookie } });
    const lbBody = await listBefore.json() as { rows: Array<{ kind: string; id: string }> };
    assert.ok(lbBody.rows.some((r) => r.kind === 'local' && r.id === firmaId), 'pre-delete: visible');

    // Delete
    const del = await app.request(`/api/firmen/local/${firmaId}`, {
      method: 'DELETE', headers: { Cookie: u.cookie },
    });
    assert.equal(del.status, 200);
    assert.deepEqual(await del.json(), { ok: true });

    // Parent gone from list
    const listAfter = await app.request('/api/firmen', { headers: { Cookie: u.cookie } });
    const laBody = await listAfter.json() as { rows: Array<{ kind: string; id: string }> };
    assert.ok(!laBody.rows.some((r) => r.kind === 'local' && r.id === firmaId), 'post-delete: archived');

    // Children archived too — fetch by id should be 404.
    const ausGet = await app.request(`/api/firmen/local-auschreibung/${ausId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'try-edit' }),
    });
    assert.equal(ausGet.status, 404, 'child Ausschreibung must be archived too');

    // Confirm raw DB rows are archived (not deleted).
    const { localFirmen, localAuschreibungen } = schema;
    const { eq } = await import('drizzle-orm');
    const fRow = await db.query.localFirmen.findFirst({ where: eq(localFirmen.id, firmaId) });
    assert.ok(fRow, 'firma row still exists (soft delete)');
    assert.ok(fRow!.archivedAt, 'archivedAt set');
    const aRow = await db.query.localAuschreibungen.findFirst({ where: eq(localAuschreibungen.id, ausId1) });
    assert.ok(aRow!.archivedAt, 'child archivedAt set');
  });

  test('404 on unknown id', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen/local/nope', {
      method: 'DELETE', headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 404);
  });

  test('404 cross-user', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ displayName: 'A only' }),
    });
    const { id } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${id}`, {
      method: 'DELETE', headers: { Cookie: b.cookie },
    });
    assert.equal(res.status, 404);
  });
});

/* ─── GET /firmen ─────────────────────────────────────────────────── */

describe('GET /firmen — merging local rows', () => {
  test('returns local rows after preisanfrage rows', async () => {
    const u = await seedUser();
    await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'My Local Firma', tradeType: 'elektro' }),
    });
    const res = await app.request('/api/firmen', { headers: { Cookie: u.cookie } });
    assert.equal(res.status, 200);
    const body = await res.json() as {
      rows: Array<{ kind: string; id: string | number; displayName: string }>;
      managedCount: number;
      externalCount: number;
      localCount: number;
    };
    assert.ok(body.localCount >= 1);
    const local = body.rows.find((r) => r.kind === 'local');
    assert.ok(local, 'local row appears');
    assert.equal(local!.displayName, 'My Local Firma');
    // Last row should be local (after preisanfrage rows)
    const lastLocal = body.rows.filter((r) => r.kind === 'local');
    assert.ok(lastLocal.length >= 1);
  });

  test('archived local firms do NOT appear in GET /firmen', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Soon archived' }),
    });
    const { id } = await cf.json() as { id: string };
    await app.request(`/api/firmen/local/${id}`, {
      method: 'DELETE', headers: { Cookie: u.cookie },
    });
    const res = await app.request('/api/firmen', { headers: { Cookie: u.cookie } });
    const body = await res.json() as { rows: Array<{ id: string | number }> };
    assert.ok(!body.rows.some((r) => r.id === id));
  });

  test('multi-tenant: user A\'s locals invisible to user B', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ displayName: 'A-only Firma' }),
    });
    const resB = await app.request('/api/firmen', { headers: { Cookie: b.cookie } });
    const bodyB = await resB.json() as { rows: Array<{ kind: string; displayName: string }> };
    assert.ok(!bodyB.rows.some((r) => r.kind === 'local' && r.displayName === 'A-only Firma'));
  });

  test('local-row wonCount + projectCount aggregate child Ausschreibungen correctly', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Counted' }),
    });
    const { id } = await cf.json() as { id: string };
    // 3 Aus: 1 gewonnen, 1 offen, 1 verloren
    for (const status of ['gewonnen', 'offen', 'verloren']) {
      await app.request(`/api/firmen/local/${id}/auschreibungen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
        body: JSON.stringify({ name: `Aus ${status}`, status }),
      });
    }
    const res = await app.request('/api/firmen', { headers: { Cookie: u.cookie } });
    const body = await res.json() as { rows: Array<{ kind: string; id: string | number; projectCount: number; wonCount: number }> };
    const row = body.rows.find((r) => r.kind === 'local' && r.id === id);
    assert.ok(row);
    assert.equal(row!.projectCount, 3);
    assert.equal(row!.wonCount, 1);
  });
});

/* ─── GET /firmen/local/:id ───────────────────────────────────────── */

describe('GET /firmen/local/:id', () => {
  test('returns full local Firma detail', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Detail Test', tradeType: 'putz', notes: 'hi' }),
    });
    const { id } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${id}`, { headers: { Cookie: u.cookie } });
    assert.equal(res.status, 200);
    const body = await res.json() as {
      firma: { kind: string; id: string; displayName: string; tradeType: string | null; notes: string | null };
      defaults: { isCustom: boolean };
      projects: Array<unknown>;
    };
    assert.equal(body.firma.kind, 'local');
    assert.equal(body.firma.id, id);
    assert.equal(body.firma.displayName, 'Detail Test');
    assert.equal(body.firma.tradeType, 'putz');
    assert.equal(body.firma.notes, 'hi');
    assert.equal(body.defaults.isCustom, false, 'local firms have no custom defaults');
    assert.deepEqual(body.projects, []);
  });

  test('404 unknown id', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen/local/nonexistent-id-xx', {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 404);
  });

  test('404 cross-user', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ displayName: 'A only' }),
    });
    const { id } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${id}`, { headers: { Cookie: b.cookie } });
    assert.equal(res.status, 404);
  });
});

/* ─── POST /firmen/:kind/:firmaId/auschreibungen ──────────────────── */

describe('POST /firmen/:kind/:firmaId/auschreibungen', () => {
  test('creates a local Ausschreibung on a local Firma — default status offen', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'Parent' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Sanierung Marktstr.', projectNumber: 'P-001' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as {
      source: string; id: string; firmaKind: string; firmaId: string;
      name: string; projectNumber: string | null; status: string;
    };
    assert.equal(body.source, 'local');
    assert.equal(body.firmaKind, 'local');
    assert.equal(body.firmaId, firmaId);
    assert.equal(body.name, 'Sanierung Marktstr.');
    assert.equal(body.projectNumber, 'P-001');
    assert.equal(body.status, 'offen');
  });

  test('creates a local Ausschreibung on a MANAGED Firma (cross-source attach)', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen/managed/5/auschreibungen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Privat-Sanierung für Gesellchen' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { firmaKind: string; firmaId: string };
    assert.equal(body.firmaKind, 'managed');
    assert.equal(body.firmaId, '5');
    // Detail of the managed firma now includes the local Aus.
    const det = await app.request('/api/firmen/managed/5', { headers: { Cookie: u.cookie } });
    const detBody = await det.json() as { projects: Array<{ source: string; name: string }> };
    assert.ok(detBody.projects.some((p) => p.source === 'local' && p.name === 'Privat-Sanierung für Gesellchen'));
  });

  test('rejects invalid status enum → 400', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'X' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Test', status: 'totally_invalid' }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects bad submissionDate format → 400', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'X' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Test', submissionDate: '22.05.2026' }), // German format → reject
    });
    assert.equal(res.status, 400);
  });

  test('rejects bad submissionTime format → 400', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'X' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Test', submissionTime: '2:5 pm' }), // bad → reject
    });
    assert.equal(res.status, 400);
  });

  test('rejects empty name → 400', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'X' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: '   ' }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects creating on another user\'s local Firma → 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ displayName: 'A only' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const res = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
      body: JSON.stringify({ name: 'hax' }),
    });
    assert.equal(res.status, 404);
  });
});

/* ─── PUT /firmen/local-auschreibung/:id ───────────────────────────── */

describe('PUT /firmen/local-auschreibung/:id', () => {
  test('updates status from offen to gewonnen', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'P' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const ca = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Aus' }),
    });
    const { id: ausId, status: initialStatus } = await ca.json() as { id: string; status: string };
    assert.equal(initialStatus, 'offen');

    const res = await app.request(`/api/firmen/local-auschreibung/${ausId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ status: 'gewonnen' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'gewonnen');
  });

  test('404 cross-user', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ displayName: 'A' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const ca = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ name: 'A-aus' }),
    });
    const { id: ausId } = await ca.json() as { id: string };
    const res = await app.request(`/api/firmen/local-auschreibung/${ausId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
      body: JSON.stringify({ status: 'gewonnen' }),
    });
    assert.equal(res.status, 404);
  });
});

/* ─── DELETE /firmen/local-auschreibung/:id ────────────────────────── */

describe('DELETE /firmen/local-auschreibung/:id', () => {
  test('soft-deletes the Ausschreibung — disappears from detail projects[]', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'P' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const ca = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Killme' }),
    });
    const { id: ausId } = await ca.json() as { id: string };
    // Pre-check: shows in detail.
    const pre = await app.request(`/api/firmen/local/${firmaId}`, { headers: { Cookie: u.cookie } });
    const preBody = await pre.json() as { projects: Array<{ id: string }> };
    assert.equal(preBody.projects.length, 1);

    const del = await app.request(`/api/firmen/local-auschreibung/${ausId}`, {
      method: 'DELETE', headers: { Cookie: u.cookie },
    });
    assert.equal(del.status, 200);
    assert.deepEqual(await del.json(), { ok: true });

    const post = await app.request(`/api/firmen/local/${firmaId}`, { headers: { Cookie: u.cookie } });
    const postBody = await post.json() as { projects: Array<{ id: string }> };
    assert.equal(postBody.projects.length, 0);
  });

  test('404 cross-user', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ displayName: 'A' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const ca = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ name: 'A-only' }),
    });
    const { id: ausId } = await ca.json() as { id: string };
    const res = await app.request(`/api/firmen/local-auschreibung/${ausId}`, {
      method: 'DELETE', headers: { Cookie: b.cookie },
    });
    assert.equal(res.status, 404);
  });

  test('404 unknown id', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen/local-auschreibung/unknown', {
      method: 'DELETE', headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 404);
  });
});

/* ─── GET /firmen/managed/:id (preisanfrage merge) ──────────────────── */

describe('GET /firmen/:kind/:id merges local Aus into preisanfrage projects[]', () => {
  test('managed firma includes BOTH upstream + local Aus, source-tagged', async () => {
    const u = await seedUser();
    // Add a local Aus to managed firma 5 (Gesellchen in fixture).
    await app.request('/api/firmen/managed/5/auschreibungen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Local Private Tender' }),
    });
    const res = await app.request('/api/firmen/managed/5', { headers: { Cookie: u.cookie } });
    assert.equal(res.status, 200);
    const body = await res.json() as {
      projects: Array<{ source: string; name: string | null }>;
    };
    const sources = new Set(body.projects.map((p) => p.source));
    assert.ok(sources.has('managed'), 'preisanfrage-sourced projects present');
    assert.ok(sources.has('local'), 'local-sourced projects present');
    const localOne = body.projects.find((p) => p.source === 'local');
    assert.ok(localOne);
    assert.equal(localOne!.name, 'Local Private Tender');
  });

  test('user B does NOT see user A\'s local Aus on the same managed firma', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await app.request('/api/firmen/managed/5/auschreibungen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
      body: JSON.stringify({ name: 'A-private' }),
    });
    const res = await app.request('/api/firmen/managed/5', { headers: { Cookie: b.cookie } });
    const body = await res.json() as { projects: Array<{ source: string; name: string | null }> };
    assert.ok(!body.projects.some((p) => p.source === 'local' && p.name === 'A-private'));
  });
});

/* ─── GET .../projects/:projectId/positions for local Aus ─────────── */

describe('GET /firmen/:kind/:firmaId/projects/:projectId/positions — local Aus', () => {
  test('returns empty positions for a local Ausschreibung id (no GAEB)', async () => {
    const u = await seedUser();
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'P' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const ca = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'No-LV' }),
    });
    const { id: ausId } = await ca.json() as { id: string };

    const res = await app.request(`/api/firmen/local/${firmaId}/projects/${ausId}/positions`, {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { count: number; positions: unknown[] };
    assert.equal(body.count, 0);
    assert.deepEqual(body.positions, []);
  });

  test('returns empty positions when projectId is a local Aus attached to a managed firma', async () => {
    const u = await seedUser();
    const ca = await app.request('/api/firmen/managed/5/auschreibungen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'Local on Managed' }),
    });
    const { id: ausId } = await ca.json() as { id: string };
    const res = await app.request(`/api/firmen/managed/5/projects/${ausId}/positions`, {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { count: number };
    assert.equal(body.count, 0);
  });
});

/* ─── Cross-archive isolation ───────────────────────────────────────── */

describe('Composite-kind isolation', () => {
  test('archiving a managed-kind Aus does NOT touch a local-kind Aus with the same id-collision pattern', async () => {
    const u = await seedUser();
    // Make a local Firma + a local Aus on managed/5 + a local Aus on the local firma.
    const cf = await app.request('/api/firmen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ displayName: 'P' }),
    });
    const { id: firmaId } = await cf.json() as { id: string };
    const ca1 = await app.request(`/api/firmen/managed/5/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'on-managed' }),
    });
    const ca2 = await app.request(`/api/firmen/local/${firmaId}/auschreibungen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
      body: JSON.stringify({ name: 'on-local' }),
    });
    const { id: managedAusId } = await ca1.json() as { id: string };
    const { id: localAusId } = await ca2.json() as { id: string };
    // Delete one — other survives.
    await app.request(`/api/firmen/local-auschreibung/${managedAusId}`, {
      method: 'DELETE', headers: { Cookie: u.cookie },
    });
    // Local one still visible
    const det = await app.request(`/api/firmen/local/${firmaId}`, { headers: { Cookie: u.cookie } });
    const body = await det.json() as { projects: Array<{ id: string }> };
    assert.ok(body.projects.some((p) => p.id === localAusId), 'sibling on local firma untouched');
  });
});
