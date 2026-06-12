/**
 * SSO handoff route tests — GET /api/panel/sso/preisanfrage.
 *
 * Verifies: a logged-in user gets a 302 to preisanfrage's /sso with a valid,
 * short-lived, audience/issuer-bound ticket in the fragment; unauthenticated
 * callers get 401; and the `next` param can't be turned into an open-redirect.
 *
 * Same harness as the other panel-api tests: env set BEFORE imports (db.js +
 * lib/auth.js read it at import time), then hit the Hono app via app.request.
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-sso-'));
process.env.DB_PATH = join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef0123456789abcdef';
process.env.SSO_HANDOFF_SECRET = 'test-sso-secret-0123456789abcdef0123456789abcdef';

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { ssoRoute } = await import('../src/routes/sso.js');
const { signToken } = await import('../src/lib/auth.js');
const { jwtVerify } = await import('jose');

const app = new Hono();
app.route('/api/panel/sso', ssoRoute);

const USER_ID = 'u-sso-1';
const USER_EMAIL = 'mani_golchin@kalku.de';

before(() => {
  runMigrations();
});

beforeEach(async () => {
  await db.delete(schema.users);
  const now = new Date();
  await db.insert(schema.users).values({
    id: USER_ID,
    email: USER_EMAIL,
    passwordHash: 'x',
    name: 'Mani Golchin',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  });
});

async function sessionCookie(): Promise<string> {
  const token = await signToken({ sub: USER_ID, email: USER_EMAIL });
  return `kalku_session=${token}`;
}

describe('panel SSO handoff → preisanfrage', () => {
  test('authenticated → 302 to preisanfrage/sso with a valid ticket', async () => {
    const res = await app.request('/api/panel/sso/preisanfrage?next=/statistik', {
      headers: { Cookie: await sessionCookie() },
    });
    assert.equal(res.status, 302);
    const loc = res.headers.get('location') ?? '';
    assert.ok(loc.startsWith('https://preisanfrage.kalkus.de/sso#'), `loc=${loc}`);
    assert.match(loc, /next=%2Fstatistik/);

    const frag = loc.split('#')[1] ?? '';
    const ticket = new URLSearchParams(frag).get('t');
    assert.ok(ticket, 'ticket present in fragment');

    const secret = new TextEncoder().encode(process.env.SSO_HANDOFF_SECRET);
    const { payload } = await jwtVerify(ticket!, secret, {
      audience: 'preisanfrage',
      issuer: 'kalku-panel',
    });
    assert.equal(payload.email, USER_EMAIL);
    assert.ok(payload.jti, 'ticket carries a jti (single-use)');
    assert.equal(typeof payload.exp, 'number');
    const ttl = (payload.exp as number) - Math.floor(Date.now() / 1000);
    assert.ok(ttl > 0 && ttl <= 65, `ttl out of range: ${ttl}`);
  });

  test('unauthenticated → 401 (no session cookie)', async () => {
    const res = await app.request('/api/panel/sso/preisanfrage?next=/statistik');
    assert.equal(res.status, 401);
  });

  test('open-redirect guard: protocol-relative next collapses to /', async () => {
    const res = await app.request('/api/panel/sso/preisanfrage?next=//evil.com/x', {
      headers: { Cookie: await sessionCookie() },
    });
    assert.equal(res.status, 302);
    const loc = res.headers.get('location') ?? '';
    assert.ok(!loc.includes('evil.com'), `leaked host: ${loc}`);
    assert.match(loc, /next=%2F(?:&|$)/);
  });

  test('open-redirect guard: scheme-bearing next collapses to /', async () => {
    const res = await app.request(
      '/api/panel/sso/preisanfrage?next=' + encodeURIComponent('https://evil.com'),
      { headers: { Cookie: await sessionCookie() } },
    );
    const loc = res.headers.get('location') ?? '';
    assert.ok(!loc.includes('evil.com'), `leaked host: ${loc}`);
  });
});
