/**
 * Tests for the OLDER Position-Vorlagen CRUD endpoints:
 *   GET    /templates
 *   POST   /templates
 *   POST   /templates/:id/use
 *   DELETE /templates/:id
 *
 * The PATCH endpoint is covered by templates-patch.test.ts. This file
 * mirrors the same DB-isolation pattern (DB_PATH set before any
 * db-touching import).
 *
 * IDOR-tight: every endpoint asserts a different user cannot
 * see/use/delete another user's template.
 */
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-tplcrud-'));
process.env.DB_PATH = join(tmpDir, 'tplcrud.db');
process.env.JWT_SECRET = 'tplcrud-test-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { templatesRoute } = await import('../src/routes/templates.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');
const { eq } = await import('drizzle-orm');

const app = new Hono();
app.route('/api', templatesRoute);

async function ownerCookie(userId: string, email: string): Promise<{ Cookie: string }> {
  const token = await signToken({ sub: userId, email });
  return { Cookie: `${COOKIE_NAME}=${token}` };
}

async function makeUser(): Promise<string> {
  const id = nanoid(16);
  const now = new Date();
  await db.insert(schema.users).values({
    id,
    email: `tpl-${id}@example.com`,
    passwordHash: 'unused',
    name: 'Tester',
    companyName: '',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function makeTemplate(
  userId: string,
  over: Partial<typeof schema.positionTemplates.$inferInsert> = {},
): Promise<string> {
  const id = nanoid(16);
  await db.insert(schema.positionTemplates).values({
    id,
    userId,
    oz: over.oz ?? '1.10',
    shortText: over.shortText ?? 'Bodenaushub',
    longText: over.longText ?? '',
    unit: over.unit ?? 'm³',
    defaultMaterialCost: over.defaultMaterialCost ?? 1250, // 12.50 €
    defaultTimeMinutes: over.defaultTimeMinutes ?? 30,
    defaultNuCost: over.defaultNuCost ?? 0,
    useCount: over.useCount ?? 0,
    lastUsedAt: over.lastUsedAt ?? null,
    createdAt: over.createdAt ?? new Date(),
  });
  return id;
}

before(async () => {
  await runMigrations();
});

beforeEach(async () => {
  // Truncate the only two tables this suite touches.
  await db.delete(schema.positionTemplates);
  await db.delete(schema.users);
});

/* ─── GET /templates ─────────────────────────────────────────────────── */

describe('GET /templates', () => {
  test('fresh user → empty list', async () => {
    const userId = await makeUser();
    const headers = await ownerCookie(userId, 'fresh@example.com');
    const res = await app.request('/api/templates', { headers });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { templates: unknown[] };
    assert.deepEqual(body.templates, []);
  });

  test('returns only the calling user’s templates (IDOR-tight)', async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    const t1 = await makeTemplate(u1, { shortText: 'mine' });
    await makeTemplate(u2, { shortText: 'not yours' });

    const headers = await ownerCookie(u1, 'one@example.com');
    const res = await app.request('/api/templates', { headers });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { templates: Array<{ id: string; shortText: string }> };
    assert.equal(body.templates.length, 1);
    assert.equal(body.templates[0].id, t1);
    assert.equal(body.templates[0].shortText, 'mine');
  });

  test('sorted by useCount desc, then lastUsedAt desc', async () => {
    const userId = await makeUser();
    const headers = await ownerCookie(userId, 'sort@example.com');

    // Three templates, varying useCount and lastUsedAt.
    const newer = new Date('2026-05-20T12:00:00Z');
    const older = new Date('2026-05-10T12:00:00Z');
    const a = await makeTemplate(userId, { shortText: 'A — count=1', useCount: 1, lastUsedAt: older });
    const b = await makeTemplate(userId, { shortText: 'B — count=5', useCount: 5, lastUsedAt: older });
    const c = await makeTemplate(userId, { shortText: 'C — count=5 newer', useCount: 5, lastUsedAt: newer });

    const res = await app.request('/api/templates', { headers });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { templates: Array<{ id: string }> };
    assert.equal(body.templates.length, 3);
    // C and B both have count=5; C has newer lastUsedAt → C first.
    assert.equal(body.templates[0].id, c);
    assert.equal(body.templates[1].id, b);
    assert.equal(body.templates[2].id, a);
  });

  test('serializes cents as euros (12.50, not 1250)', async () => {
    const userId = await makeUser();
    await makeTemplate(userId, { defaultMaterialCost: 1250, defaultNuCost: 999 });
    const headers = await ownerCookie(userId, 'ser@example.com');
    const res = await app.request('/api/templates', { headers });
    const body = (await res.json()) as {
      templates: Array<{ defaultMaterialCost: number; defaultNuCost: number }>;
    };
    assert.equal(body.templates.length, 1);
    assert.equal(body.templates[0].defaultMaterialCost, 12.5);
    assert.equal(body.templates[0].defaultNuCost, 9.99);
  });

  test('unauthenticated → 401', async () => {
    const res = await app.request('/api/templates');
    assert.equal(res.status, 401);
  });
});

/* ─── POST /templates ────────────────────────────────────────────────── */

describe('POST /templates', () => {
  test('creates with all fields → returns serialized row', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c1@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        oz: '2.5',
        shortText: 'Estrich verlegen',
        longText: 'Zementestrich, 5cm',
        unit: 'm²',
        defaultMaterialCost: 18.75,
        defaultTimeMinutes: 12,
        defaultNuCost: 4.25,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      id: string;
      oz: string;
      shortText: string;
      longText: string;
      unit: string;
      defaultMaterialCost: number;
      defaultTimeMinutes: number;
      defaultNuCost: number;
      useCount: number;
    };
    assert.ok(body.id);
    assert.equal(body.oz, '2.5');
    assert.equal(body.shortText, 'Estrich verlegen');
    assert.equal(body.longText, 'Zementestrich, 5cm');
    assert.equal(body.unit, 'm²');
    assert.equal(body.defaultMaterialCost, 18.75);
    assert.equal(body.defaultTimeMinutes, 12);
    assert.equal(body.defaultNuCost, 4.25);
    assert.equal(body.useCount, 0);
  });

  test('creates with only shortText → sensible defaults', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c2@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: 'Minimal' }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      shortText: string;
      oz: string;
      longText: string;
      unit: string;
      defaultMaterialCost: number;
      defaultTimeMinutes: number;
      defaultNuCost: number;
      useCount: number;
    };
    assert.equal(body.shortText, 'Minimal');
    assert.equal(body.oz, '');
    assert.equal(body.longText, '');
    assert.equal(body.unit, '');
    assert.equal(body.defaultMaterialCost, 0);
    assert.equal(body.defaultTimeMinutes, 0);
    assert.equal(body.defaultNuCost, 0);
    assert.equal(body.useCount, 0);
  });

  test('empty shortText → 400', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c3@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: '' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'invalid_input');
  });

  test('whitespace-only shortText → 400 (trim then min(1))', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c4@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: '   \t  ' }),
    });
    assert.equal(res.status, 400);
  });

  test('shortText > 2000 chars → 400', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c5@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: 'x'.repeat(2001) }),
    });
    assert.equal(res.status, 400);
  });

  test('longText > 20000 chars → 400', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c6@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: 'ok', longText: 'y'.repeat(20001) }),
    });
    assert.equal(res.status, 400);
  });

  test('defaultMaterialCost > 1e8 → 400', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c7@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: 'ok', defaultMaterialCost: 1e8 + 1 }),
    });
    assert.equal(res.status, 400);
  });

  test('defaultMaterialCost < -1e8 → 400', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c8@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: 'ok', defaultMaterialCost: -1e8 - 1 }),
    });
    assert.equal(res.status, 400);
  });

  test('defaultMaterialCost stored as cents (DB integer == value*100)', async () => {
    const userId = await makeUser();
    const headers = { ...(await ownerCookie(userId, 'c9@example.com')), 'content-type': 'application/json' };
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortText: 'rounding', defaultMaterialCost: 7.42, defaultNuCost: 3.18 }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { id: string };
    const row = await db.query.positionTemplates.findFirst({
      where: eq(schema.positionTemplates.id, body.id),
    });
    assert.ok(row);
    // Stored as integer cents — not floats.
    assert.equal(row!.defaultMaterialCost, 742);
    assert.equal(row!.defaultNuCost, 318);
  });

  test('unauthenticated POST → 401', async () => {
    const res = await app.request('/api/templates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shortText: 'ok' }),
    });
    assert.equal(res.status, 401);
  });
});

/* ─── POST /templates/:id/use ────────────────────────────────────────── */

describe('POST /templates/:id/use', () => {
  test('increments useCount by 1 and sets lastUsedAt to a recent timestamp', async () => {
    const userId = await makeUser();
    const tid = await makeTemplate(userId, { useCount: 0, lastUsedAt: null });
    const headers = await ownerCookie(userId, 'u1@example.com');

    const tStart = Date.now();
    const res = await app.request(`/api/templates/${tid}/use`, { method: 'POST', headers });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean };
    assert.equal(body.ok, true);

    // Verify via the list endpoint (single-source-of-truth read path).
    const listRes = await app.request('/api/templates', { headers });
    const list = (await listRes.json()) as { templates: Array<{ id: string; useCount: number; lastUsedAt: number | null }> };
    const row = list.templates.find((t) => t.id === tid)!;
    assert.equal(row.useCount, 1);
    assert.ok(row.lastUsedAt !== null, 'lastUsedAt should be set');
    // lastUsedAt is a unix-ms timestamp (serialized straight from DB).
    const lastUsedMs = typeof row.lastUsedAt === 'number' ? row.lastUsedAt : Date.parse(String(row.lastUsedAt));
    assert.ok(lastUsedMs >= tStart - 1000, `lastUsedAt ${lastUsedMs} should be >= ${tStart - 1000}`);
    assert.ok(lastUsedMs <= Date.now() + 1000, 'lastUsedAt should not be in the far future');
  });

  test('multiple use calls increment monotonically (3 calls → useCount=3)', async () => {
    const userId = await makeUser();
    const tid = await makeTemplate(userId, { useCount: 0 });
    const headers = await ownerCookie(userId, 'u2@example.com');

    for (let i = 0; i < 3; i++) {
      const res = await app.request(`/api/templates/${tid}/use`, { method: 'POST', headers });
      assert.equal(res.status, 200);
    }
    const listRes = await app.request('/api/templates', { headers });
    const list = (await listRes.json()) as { templates: Array<{ id: string; useCount: number }> };
    const row = list.templates.find((t) => t.id === tid)!;
    assert.equal(row.useCount, 3);
  });

  test('404 on unknown id', async () => {
    const userId = await makeUser();
    const headers = await ownerCookie(userId, 'u3@example.com');
    const res = await app.request('/api/templates/does-not-exist/use', { method: 'POST', headers });
    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'not_found');
  });

  test('IDOR — another user’s template id → 404 (not 200)', async () => {
    const owner = await makeUser();
    const tid = await makeTemplate(owner);
    const other = await makeUser();
    const headers = await ownerCookie(other, 'u4@example.com');
    const res = await app.request(`/api/templates/${tid}/use`, { method: 'POST', headers });
    assert.equal(res.status, 404);
    // And the owner's useCount must NOT have moved.
    const row = await db.query.positionTemplates.findFirst({
      where: eq(schema.positionTemplates.id, tid),
    });
    assert.equal(row!.useCount, 0);
  });

  test('unauthenticated → 401', async () => {
    const owner = await makeUser();
    const tid = await makeTemplate(owner);
    const res = await app.request(`/api/templates/${tid}/use`, { method: 'POST' });
    assert.equal(res.status, 401);
  });
});

/* ─── DELETE /templates/:id ──────────────────────────────────────────── */

describe('DELETE /templates/:id', () => {
  test('deletes the template (GET afterwards returns empty)', async () => {
    const userId = await makeUser();
    const tid = await makeTemplate(userId);
    const headers = await ownerCookie(userId, 'd1@example.com');

    const delRes = await app.request(`/api/templates/${tid}`, { method: 'DELETE', headers });
    assert.equal(delRes.status, 200);
    const delBody = (await delRes.json()) as { ok: boolean };
    assert.equal(delBody.ok, true);

    const listRes = await app.request('/api/templates', { headers });
    const list = (await listRes.json()) as { templates: unknown[] };
    assert.deepEqual(list.templates, []);

    // And it's actually gone from the DB.
    const row = await db.query.positionTemplates.findFirst({
      where: eq(schema.positionTemplates.id, tid),
    });
    assert.equal(row, undefined);
  });

  test('404 on unknown id', async () => {
    const userId = await makeUser();
    const headers = await ownerCookie(userId, 'd2@example.com');
    const res = await app.request('/api/templates/missing-id', { method: 'DELETE', headers });
    assert.equal(res.status, 404);
  });

  test('IDOR — another user’s template id → 404 and the row stays', async () => {
    const owner = await makeUser();
    const tid = await makeTemplate(owner);
    const other = await makeUser();
    const headers = await ownerCookie(other, 'd3@example.com');

    const res = await app.request(`/api/templates/${tid}`, { method: 'DELETE', headers });
    assert.equal(res.status, 404);

    // Row still there.
    const row = await db.query.positionTemplates.findFirst({
      where: eq(schema.positionTemplates.id, tid),
    });
    assert.ok(row, 'template should NOT have been deleted by a non-owner');
  });

  test('unauthenticated → 401', async () => {
    const owner = await makeUser();
    const tid = await makeTemplate(owner);
    const res = await app.request(`/api/templates/${tid}`, { method: 'DELETE' });
    assert.equal(res.status, 401);
  });

  test('deleting user A’s template does not touch user B’s templates', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const tA = await makeTemplate(a, { shortText: 'A-only' });
    const tB1 = await makeTemplate(b, { shortText: 'B-1' });
    const tB2 = await makeTemplate(b, { shortText: 'B-2' });

    const headersA = await ownerCookie(a, 'd4a@example.com');
    const res = await app.request(`/api/templates/${tA}`, { method: 'DELETE', headers: headersA });
    assert.equal(res.status, 200);

    const headersB = await ownerCookie(b, 'd4b@example.com');
    const listB = await app.request('/api/templates', { headers: headersB });
    const list = (await listB.json()) as { templates: Array<{ id: string }> };
    assert.equal(list.templates.length, 2);
    const ids = list.templates.map((t) => t.id).sort();
    assert.deepEqual(ids, [tB1, tB2].sort());
  });
});
