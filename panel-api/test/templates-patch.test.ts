/**
 * Tests for PATCH /templates/:id — partial update of saved position templates.
 *
 * Drives the Vorlagen-Bibliothek edit-in-place flow. Mirrors the
 * round9-shares-public DB-isolation pattern (DB_PATH set before any
 * db-touching import).
 */
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-tplpatch-'));
process.env.DB_PATH = join(tmpDir, 'tplpatch.db');
process.env.JWT_SECRET = 'tplpatch-test-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { templatesRoute } = await import('../src/routes/templates.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');

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

async function makeTemplate(userId: string, over: Partial<typeof schema.positionTemplates.$inferInsert> = {}) {
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
    createdAt: new Date(),
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

describe('PATCH /templates/:id', () => {
  test('owner can update default prices — returns updated row', async () => {
    const ownerId = await makeUser();
    const tid = await makeTemplate(ownerId);
    const headers = { ...(await ownerCookie(ownerId, 'tpl@example.com')), 'content-type': 'application/json' };

    const res = await app.request(`/api/templates/${tid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ defaultMaterialCost: 14.5, defaultNuCost: 2.25 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, tid);
    assert.equal(body.defaultMaterialCost, 14.5);
    assert.equal(body.defaultNuCost, 2.25);
    // Unchanged fields preserved.
    assert.equal(body.shortText, 'Bodenaushub');
    assert.equal(body.unit, 'm³');
  });

  test('partial update of shortText only — prices preserved', async () => {
    const ownerId = await makeUser();
    const tid = await makeTemplate(ownerId, { defaultMaterialCost: 3499 });
    const headers = { ...(await ownerCookie(ownerId, 'tpl@example.com')), 'content-type': 'application/json' };

    const res = await app.request(`/api/templates/${tid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ shortText: 'Schwerer Bodenaushub Klasse 5' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.shortText, 'Schwerer Bodenaushub Klasse 5');
    assert.equal(body.defaultMaterialCost, 34.99); // unchanged
  });

  test('empty body → 400 invalid_input (refine triggers)', async () => {
    const ownerId = await makeUser();
    const tid = await makeTemplate(ownerId);
    const headers = { ...(await ownerCookie(ownerId, 'tpl@example.com')), 'content-type': 'application/json' };

    const res = await app.request(`/api/templates/${tid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'invalid_input');
  });

  test('shortText too short → 400', async () => {
    const ownerId = await makeUser();
    const tid = await makeTemplate(ownerId);
    const headers = { ...(await ownerCookie(ownerId, 'tpl@example.com')), 'content-type': 'application/json' };

    const res = await app.request(`/api/templates/${tid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ shortText: '   ' }),
    });
    assert.equal(res.status, 400);
  });

  test('IDOR — non-owner gets 404, not 200', async () => {
    const ownerId = await makeUser();
    const tid = await makeTemplate(ownerId);
    const otherId = await makeUser();
    const headers = { ...(await ownerCookie(otherId, 'other@example.com')), 'content-type': 'application/json' };

    const res = await app.request(`/api/templates/${tid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ defaultMaterialCost: 999 }),
    });
    assert.equal(res.status, 404);
  });

  test('unauthenticated → 401 (not 200, not crash)', async () => {
    const ownerId = await makeUser();
    const tid = await makeTemplate(ownerId);

    const res = await app.request(`/api/templates/${tid}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ defaultMaterialCost: 999 }),
    });
    assert.equal(res.status, 401);
  });

  test('cents rounding holds — half-cent rounds up (JS float behavior)', async () => {
    const ownerId = await makeUser();
    const tid = await makeTemplate(ownerId);
    const headers = { ...(await ownerCookie(ownerId, 'tpl@example.com')), 'content-type': 'application/json' };

    const res = await app.request(`/api/templates/${tid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ defaultMaterialCost: 12.345 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    // 12.345 * 100 = 1234.5000…2 → Math.round → 1235 → /100 → 12.35.
    // Locks in the existing toCents/fromCents behavior so future refactors
    // can't silently switch to bankers-rounding or BigDecimal mid-roll.
    assert.equal(body.defaultMaterialCost, 12.35);
  });

  test('nonexistent id → 404', async () => {
    const ownerId = await makeUser();
    const headers = { ...(await ownerCookie(ownerId, 'tpl@example.com')), 'content-type': 'application/json' };

    const res = await app.request(`/api/templates/does-not-exist`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ defaultMaterialCost: 1 }),
    });
    assert.equal(res.status, 404);
  });
});
