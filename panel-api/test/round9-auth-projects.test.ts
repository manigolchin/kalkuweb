/**
 * Round 9 — broad coverage tests for the auth + projects routes (and their
 * supporting lib modules) which previously had ZERO direct test coverage.
 *
 * Follows the same conventions as share-gate.test.ts / position-comments.test.ts:
 *   - ONE per-file SQLite DB at a temp path set BEFORE any module imports
 *   - Lazy import everything from panel-api after env vars are set
 *   - Each test creates unique users/projects via nanoid (no cross-test cleanup
 *     race), and a couple of tests that exercise singleton in-memory state
 *     (rate-limit buckets) use unique keyPrefix values to stay independent.
 *   - Auth flow tests generate a real JWT via signToken() and attach it as a
 *     Cookie header, exactly like the production browser path.
 */
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// Set env BEFORE any panel-api import — db.ts and auth.ts both read env at
// module load.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-r9-'));
process.env.DB_PATH = join(tmpDir, 'r9.db');
process.env.JWT_SECRET = 'r9-secret-' + Math.random().toString(36).slice(2);

// Lazy imports (top-level await is fine — this file is ESM via tsx).
const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const auth = await import('../src/lib/auth.js');
const middleware = await import('../src/lib/middleware.js');
const ratelimit = await import('../src/lib/ratelimit.js');
const { authRoute } = await import('../src/routes/auth.js');
const { projectsRoute } = await import('../src/routes/projects.js');
const { ssoRoute } = await import('../src/routes/sso.js');
const { bodyLimit } = await import('hono/body-limit');
const { nanoid } = await import('nanoid');
const { eq } = await import('drizzle-orm');

// Mount routes inside isolated Hono apps so we can use the same paths the
// production server uses. We mirror index.ts where it matters (login rate
// limit + owner body limit).
const authApp = new Hono();
authApp.use(
  '/auth/login',
  ratelimit.rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyPrefix: 'login-test', // distinct from prod prefix so we don't share buckets
    message: 'too_many_login_attempts',
  }),
);
authApp.route('/auth', authRoute);

const projectsApp = new Hono();
const OWNER_BODY_LIMIT = 2 * 1024 * 1024;
projectsApp.use(
  '/projects',
  bodyLimit({
    maxSize: OWNER_BODY_LIMIT,
    onError: (c) => c.json({ error: 'payload_too_large', maxBytes: OWNER_BODY_LIMIT }, 413),
  }),
);
projectsApp.use(
  '/projects/*',
  bodyLimit({
    maxSize: OWNER_BODY_LIMIT,
    onError: (c) => c.json({ error: 'payload_too_large', maxBytes: OWNER_BODY_LIMIT }, 413),
  }),
);
projectsApp.route('/projects', projectsRoute);

const ssoApp = new Hono();
ssoApp.route('/sso', ssoRoute);

before(() => {
  runMigrations();
});

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/** Insert a user row and return its id + email + plain password (for re-login). */
async function seedUser(opts: {
  password?: string;
  email?: string;
  mustChangePassword?: boolean;
  companyName?: string;
} = {}): Promise<{ id: string; email: string; password: string; passwordHash: string }> {
  const id = nanoid(16);
  const email = (opts.email ?? `${id}@test.local`).toLowerCase();
  const password = opts.password ?? 'TestPassword12345!';
  const passwordHash = await auth.hashPassword(password);
  const now = new Date();
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash,
    name: 'Test User',
    companyName: opts.companyName ?? '',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: opts.mustChangePassword ?? false,
    createdAt: now,
    updatedAt: now,
  });
  return { id, email, password, passwordHash };
}

async function makeAuthCookie(userId: string, email: string): Promise<string> {
  const token = await auth.signToken({ sub: userId, email });
  return `${auth.COOKIE_NAME}=${token}`;
}

function defaultProjectData(overrides: Partial<schema.ProjectData> = {}): schema.ProjectData {
  return {
    name: 'Test Project',
    client: 'Test Client',
    service: 'Test Service',
    tenderNumber: 'T-1',
    deadline: '2026-12-31',
    bidder: 'Bidder',
    calcParams: {
      mittellohn: 30,
      verrechnungslohn: 49.9,
      materialZuschlag: 0.12,
      nuZuschlag: 0.12,
      geraeteZuschlagPct: 0.1,
      geraeteStundensatz: 0.5,
      zeitabzug: 0,
      tagesstunden: 8,
      personaleinsatz: 3,
      mwst: 0.19,
    },
    positions: [],
    ...overrides,
  };
}

async function seedProject(ownerId: string, dataOverrides: Partial<schema.ProjectData> = {}): Promise<string> {
  const id = nanoid(16);
  const now = new Date();
  await db.insert(schema.projects).values({
    id,
    ownerId,
    data: defaultProjectData(dataOverrides),
    versionNumber: 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// ──────────────────────────────────────────────────────────────────────
// lib/auth.ts
// ──────────────────────────────────────────────────────────────────────

describe('lib/auth — password hashing + JWT', () => {
  test('hashPassword + verifyPassword: round-trip succeeds for correct password', async () => {
    const hash = await auth.hashPassword('correct-horse-battery-staple');
    assert.notEqual(hash, 'correct-horse-battery-staple', 'hash must not be plain');
    assert.ok(hash.startsWith('$2'), 'bcrypt hash prefix');
    const ok = await auth.verifyPassword('correct-horse-battery-staple', hash);
    assert.equal(ok, true);
  });

  test('verifyPassword: returns false on wrong password', async () => {
    const hash = await auth.hashPassword('right-password');
    const ok = await auth.verifyPassword('wrong-password', hash);
    assert.equal(ok, false);
  });

  test('signToken + verifyToken: produces JWT verifiable by verifyToken', async () => {
    const t = await auth.signToken({ sub: 'user-123', email: 'a@b.c' });
    assert.equal(typeof t, 'string');
    assert.equal(t.split('.').length, 3, 'JWT should have 3 segments');
    const payload = await auth.verifyToken(t);
    assert.ok(payload);
    assert.equal(payload!.sub, 'user-123');
    assert.equal(payload!.email, 'a@b.c');
  });

  test('verifyToken: returns null on tampered token', async () => {
    const t = await auth.signToken({ sub: 'sub', email: 'x@y.z' });
    // Flip a char in the signature (last segment) — invalidates HS256.
    const segments = t.split('.');
    segments[2] = segments[2].slice(0, -2) + (segments[2].slice(-2) === 'AA' ? 'BB' : 'AA');
    const tampered = segments.join('.');
    const payload = await auth.verifyToken(tampered);
    assert.equal(payload, null);
  });

  test('verifyToken: returns null on garbage string', async () => {
    assert.equal(await auth.verifyToken('not.a.jwt'), null);
    assert.equal(await auth.verifyToken(''), null);
    assert.equal(await auth.verifyToken('eyJhbGciOiJIUzI1NiJ9.gibberish.xxx'), null);
  });

  test('verifyToken: returns null when payload is missing sub/email', async () => {
    // Use jose directly to forge a token signed with our secret but missing required fields.
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const t = await new SignJWT({ foo: 'bar' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);
    assert.equal(await auth.verifyToken(t), null);
  });

  test('COOKIE_NAME + COOKIE_MAX_AGE_DAYS are stable exports', () => {
    assert.equal(auth.COOKIE_NAME, 'kalku_session');
    assert.equal(auth.COOKIE_MAX_AGE_DAYS, 30);
    assert.equal(typeof auth.COOKIE_MAX_AGE_DAYS, 'number');
  });

  test('signToken: encodes sub + email + exp in payload', async () => {
    const t = await auth.signToken({ sub: 'sub-z', email: 'z@z.z' });
    const [, payloadB64] = t.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    assert.equal(payload.sub, 'sub-z');
    assert.equal(payload.email, 'z@z.z');
    assert.equal(typeof payload.exp, 'number');
    assert.equal(typeof payload.iat, 'number');
    // 30-day expiry, allow ±60s slop.
    const expected = payload.iat + auth.COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    assert.ok(Math.abs(payload.exp - expected) < 60);
  });

  test('hashPassword: parallel calls produce distinct hashes for same input (salt)', async () => {
    const [h1, h2, h3] = await Promise.all([
      auth.hashPassword('same-input'),
      auth.hashPassword('same-input'),
      auth.hashPassword('same-input'),
    ]);
    assert.notEqual(h1, h2);
    assert.notEqual(h2, h3);
    assert.notEqual(h1, h3);
    // Each must still verify.
    assert.equal(await auth.verifyPassword('same-input', h1), true);
    assert.equal(await auth.verifyPassword('same-input', h2), true);
    assert.equal(await auth.verifyPassword('same-input', h3), true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// lib/middleware.ts
// ──────────────────────────────────────────────────────────────────────

describe('lib/middleware — requireAuth + clientIp + clientFingerprint', () => {
  test('requireAuth: 401 when no cookie present', async () => {
    const app = new Hono();
    app.get('/x', middleware.requireAuth, (c) => c.json({ ok: true }));
    const r = await app.request('/x');
    assert.equal(r.status, 401);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'unauthorized');
  });

  test('requireAuth: 401 with malformed cookie', async () => {
    const app = new Hono();
    app.get('/x', middleware.requireAuth, (c) => c.json({ ok: true }));
    const r = await app.request('/x', {
      headers: { Cookie: `${auth.COOKIE_NAME}=this-is-not-a-jwt` },
    });
    assert.equal(r.status, 401);
  });

  test('requireAuth: 401 when user no longer exists in DB', async () => {
    const app = new Hono();
    app.get('/x', middleware.requireAuth, (c) => c.json({ ok: true }));
    // Sign a token for a user id that's never been inserted.
    const cookie = await makeAuthCookie('does-not-exist-' + nanoid(8), 'ghost@nope.local');
    const r = await app.request('/x', { headers: { Cookie: cookie } });
    assert.equal(r.status, 401);
  });

  test('requireAuth: sets c.userId + c.userEmail on success', async () => {
    const u = await seedUser();
    const app = new Hono<{ Variables: middleware.AuthVariables }>();
    app.get('/x', middleware.requireAuth, (c) =>
      c.json({ uid: c.get('userId'), uemail: c.get('userEmail') }),
    );
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await app.request('/x', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    const body = await r.json() as { uid: string; uemail: string };
    assert.equal(body.uid, u.id);
    assert.equal(body.uemail, u.email);
  });

  test('clientIp: prefers first IP from x-forwarded-for', async () => {
    const app = new Hono();
    app.get('/ip', (c) => c.json({ ip: middleware.clientIp(c) }));
    const r = await app.request('/ip', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
    });
    const body = await r.json() as { ip: string };
    assert.equal(body.ip, '1.2.3.4');
  });

  test('clientIp: falls back to x-real-ip when xff absent', async () => {
    const app = new Hono();
    app.get('/ip', (c) => c.json({ ip: middleware.clientIp(c) }));
    const r = await app.request('/ip', {
      headers: { 'x-real-ip': '203.0.113.55' },
    });
    const body = await r.json() as { ip: string };
    assert.equal(body.ip, '203.0.113.55');
  });

  test("clientIp: returns 'unknown' when neither header present", async () => {
    const app = new Hono();
    app.get('/ip', (c) => c.json({ ip: middleware.clientIp(c) }));
    const r = await app.request('/ip');
    const body = await r.json() as { ip: string };
    assert.equal(body.ip, 'unknown');
  });

  test('clientFingerprint: returns 16-char hex string', async () => {
    const app = new Hono();
    app.get('/fp', (c) => c.json({ fp: middleware.clientFingerprint(c) }));
    const r = await app.request('/fp', {
      headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'de-DE', 'accept': '*/*' },
    });
    const body = await r.json() as { fp: string };
    assert.equal(body.fp.length, 16);
    assert.match(body.fp, /^[0-9a-f]{16}$/);
  });

  test('clientFingerprint: identical headers → identical fingerprint', async () => {
    const app = new Hono();
    app.get('/fp', (c) => c.json({ fp: middleware.clientFingerprint(c) }));
    const headers = { 'user-agent': 'UA-X', 'accept-language': 'de', 'accept': 'text/html' };
    const r1 = await app.request('/fp', { headers });
    const r2 = await app.request('/fp', { headers });
    const b1 = await r1.json() as { fp: string };
    const b2 = await r2.json() as { fp: string };
    assert.equal(b1.fp, b2.fp);
  });

  test('clientFingerprint: differing UA → differing fingerprint', async () => {
    const app = new Hono();
    app.get('/fp', (c) => c.json({ fp: middleware.clientFingerprint(c) }));
    const r1 = await app.request('/fp', { headers: { 'user-agent': 'UA-A' } });
    const r2 = await app.request('/fp', { headers: { 'user-agent': 'UA-B' } });
    const b1 = await r1.json() as { fp: string };
    const b2 = await r2.json() as { fp: string };
    assert.notEqual(b1.fp, b2.fp);
  });
});

// ──────────────────────────────────────────────────────────────────────
// lib/ratelimit.ts
// ──────────────────────────────────────────────────────────────────────

describe('lib/ratelimit — rateLimit middleware', () => {
  test('within window: N=3 allowed, 4th blocked with 429', async () => {
    const app = new Hono();
    const prefix = 'rl-basic-' + nanoid(6);
    app.use(
      '/r',
      ratelimit.rateLimit({ windowMs: 60_000, max: 3, keyPrefix: prefix }),
    );
    app.get('/r', (c) => c.json({ ok: true }));
    for (let i = 0; i < 3; i++) {
      const r = await app.request('/r', { headers: { 'x-real-ip': '7.7.7.7' } });
      assert.equal(r.status, 200, `request ${i + 1} should be allowed`);
    }
    const fourth = await app.request('/r', { headers: { 'x-real-ip': '7.7.7.7' } });
    assert.equal(fourth.status, 429);
    assert.ok(fourth.headers.get('Retry-After'));
    const body = await fourth.json() as { error: string; retryAfter: number };
    assert.equal(body.error, 'rate_limited');
    assert.ok(body.retryAfter > 0);
  });

  test('window reset: after windowMs counter resets', async () => {
    const app = new Hono();
    const prefix = 'rl-reset-' + nanoid(6);
    // Tiny 1ms window so we can deterministically wait it out.
    app.use(
      '/r',
      ratelimit.rateLimit({ windowMs: 1, max: 1, keyPrefix: prefix }),
    );
    app.get('/r', (c) => c.json({ ok: true }));
    const r1 = await app.request('/r', { headers: { 'x-real-ip': '8.8.8.8' } });
    assert.equal(r1.status, 200);
    // Wait long enough for the bucket to expire.
    await new Promise((res) => setTimeout(res, 20));
    const r2 = await app.request('/r', { headers: { 'x-real-ip': '8.8.8.8' } });
    assert.equal(r2.status, 200, 'after window, should be allowed again');
  });

  test('different keyPrefix → separate counters', async () => {
    const app = new Hono();
    const pa = 'rl-pfx-a-' + nanoid(6);
    const pb = 'rl-pfx-b-' + nanoid(6);
    app.use('/a', ratelimit.rateLimit({ windowMs: 60_000, max: 1, keyPrefix: pa }));
    app.use('/b', ratelimit.rateLimit({ windowMs: 60_000, max: 1, keyPrefix: pb }));
    app.get('/a', (c) => c.json({ ok: true }));
    app.get('/b', (c) => c.json({ ok: true }));
    const headers = { 'x-real-ip': '9.9.9.9' };
    assert.equal((await app.request('/a', { headers })).status, 200);
    assert.equal((await app.request('/b', { headers })).status, 200);
    assert.equal((await app.request('/a', { headers })).status, 429);
    assert.equal((await app.request('/b', { headers })).status, 429);
  });

  test('different IPs → separate counters', async () => {
    const app = new Hono();
    const prefix = 'rl-ips-' + nanoid(6);
    app.use('/r', ratelimit.rateLimit({ windowMs: 60_000, max: 1, keyPrefix: prefix }));
    app.get('/r', (c) => c.json({ ok: true }));
    assert.equal((await app.request('/r', { headers: { 'x-real-ip': '1.1.1.1' } })).status, 200);
    assert.equal((await app.request('/r', { headers: { 'x-real-ip': '2.2.2.2' } })).status, 200);
    assert.equal((await app.request('/r', { headers: { 'x-real-ip': '1.1.1.1' } })).status, 429);
    assert.equal((await app.request('/r', { headers: { 'x-real-ip': '2.2.2.2' } })).status, 429);
  });
});

// ──────────────────────────────────────────────────────────────────────
// routes/auth.ts
// ──────────────────────────────────────────────────────────────────────

describe('routes/auth — POST /login', () => {
  test('valid credentials: sets cookie + returns user', async () => {
    const u = await seedUser({ password: 'CorrectHorseBattery!' });
    const r = await authApp.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '4.4.0.1' },
      body: JSON.stringify({ email: u.email, password: 'CorrectHorseBattery!' }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { user: { id: string; email: string } };
    assert.equal(body.user.id, u.id);
    assert.equal(body.user.email, u.email);
    const setCookie = r.headers.get('set-cookie');
    assert.ok(setCookie?.includes(auth.COOKIE_NAME + '='), 'session cookie should be set');
    assert.ok(setCookie?.toLowerCase().includes('httponly'), 'cookie should be httpOnly');
  });

  test('wrong password: 401 invalid_credentials', async () => {
    const u = await seedUser({ password: 'right-pw-12345' });
    const r = await authApp.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '4.4.0.2' },
      body: JSON.stringify({ email: u.email, password: 'wrong-pw' }),
    });
    assert.equal(r.status, 401);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'invalid_credentials');
  });

  test('non-existent email: 401 invalid_credentials', async () => {
    const r = await authApp.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '4.4.0.3' },
      body: JSON.stringify({ email: 'nobody-' + nanoid(8) + '@nope.local', password: 'whatever' }),
    });
    assert.equal(r.status, 401);
  });

  test('malformed body (missing password): 400 invalid_input', async () => {
    const r = await authApp.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '4.4.0.4' },
      body: JSON.stringify({ email: 'foo@bar.com' }),
    });
    assert.equal(r.status, 400);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'invalid_input');
  });

  test('malformed body (not-an-email): 400 invalid_input', async () => {
    const r = await authApp.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '4.4.0.5' },
      body: JSON.stringify({ email: 'not-an-email', password: 'x' }),
    });
    assert.equal(r.status, 400);
  });

  test('rate-limited after 10 attempts per IP per 15 min', async () => {
    // We use the authApp wired with keyPrefix 'login-test' (unique to this test
    // file), so the counter for this IP is fresh. 11th attempt → 429.
    const ip = '4.4.0.66'; // unique IP just for this test
    // Make 10 attempts that should each NOT 429 (they may 400/401, that's fine
    // — the limiter counts requests, not failures).
    for (let i = 0; i < 10; i++) {
      const r = await authApp.request('/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-real-ip': ip },
        body: JSON.stringify({ email: 'whoever@nope.local', password: 'x' }),
      });
      assert.notEqual(r.status, 429, `attempt ${i + 1} should not be rate-limited yet`);
    }
    const eleventh = await authApp.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': ip },
      body: JSON.stringify({ email: 'whoever@nope.local', password: 'x' }),
    });
    assert.equal(eleventh.status, 429);
  });
});

describe('routes/auth — POST /logout', () => {
  test('clears cookie + returns ok', async () => {
    const r = await authApp.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `${auth.COOKIE_NAME}=anything` },
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { ok: boolean };
    assert.equal(body.ok, true);
    const setCookie = r.headers.get('set-cookie') || '';
    // deleteCookie sets the cookie to empty with Max-Age=0 (or past expiry).
    assert.ok(
      setCookie.includes(auth.COOKIE_NAME + '=') &&
        (setCookie.includes('Max-Age=0') || setCookie.toLowerCase().includes('expires=')),
      'logout should clear cookie via Set-Cookie',
    );
  });
});

describe('routes/auth — GET /me', () => {
  test('valid cookie: returns user object', async () => {
    const u = await seedUser({ companyName: 'Acme GmbH' });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/me', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    const body = await r.json() as {
      user: { id: string; email: string; companyName: string; mustChangePassword: boolean };
    };
    assert.equal(body.user.id, u.id);
    assert.equal(body.user.email, u.email);
    assert.equal(body.user.companyName, 'Acme GmbH');
    assert.equal(typeof body.user.mustChangePassword, 'boolean');
  });

  test('no cookie: 401', async () => {
    const r = await authApp.request('/auth/me');
    assert.equal(r.status, 401);
  });
});

describe('routes/auth — PUT /profile', () => {
  test('updates allowed fields (name, companyName, phone, contactEmail)', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'New Name',
        companyName: 'New Co',
        companyPhone: '+49 0681 123',
        companyContactEmail: 'new@contact.de',
      }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { user: { name: string; companyName: string; companyPhone: string; companyContactEmail: string } };
    assert.equal(body.user.name, 'New Name');
    assert.equal(body.user.companyName, 'New Co');
    assert.equal(body.user.companyPhone, '+49 0681 123');
    assert.equal(body.user.companyContactEmail, 'new@contact.de');
  });

  test('email is NOT in the update schema: silently ignored, original email kept', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ email: 'hijacked@evil.com', name: 'KeepName' }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { user: { email: string } };
    assert.equal(body.user.email, u.email, 'email must remain unchanged');
    // Confirm DB really wasn't updated.
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, u.id) });
    assert.equal(row?.email, u.email);
  });

  test('invalid payload (name too long): 400 invalid_input', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'x'.repeat(500) }), // max 200
    });
    assert.equal(r.status, 400);
  });

  test('no cookie: 401', async () => {
    const r = await authApp.request('/auth/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    assert.equal(r.status, 401);
  });
});

describe('routes/auth — POST /change-password', () => {
  test('correct current: new hash persisted, mustChangePassword flipped to false', async () => {
    const u = await seedUser({ password: 'old-password-1234', mustChangePassword: true });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ current: 'old-password-1234', next: 'new-password-67890ABCD' }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { ok: boolean };
    assert.equal(body.ok, true);
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, u.id) });
    assert.ok(row);
    assert.equal(row!.mustChangePassword, false);
    assert.equal(await auth.verifyPassword('new-password-67890ABCD', row!.passwordHash), true);
    assert.equal(await auth.verifyPassword('old-password-1234', row!.passwordHash), false);
  });

  test('wrong current: 400 invalid_current_password', async () => {
    const u = await seedUser({ password: 'right-old-1234' });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ current: 'WRONG-old-1234', next: 'new-password-67890ABC' }),
    });
    assert.equal(r.status, 400);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'invalid_current_password');
  });

  test('new password too short (<12 chars): 400 invalid_input', async () => {
    const u = await seedUser({ password: 'old-password-1234' });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ current: 'old-password-1234', next: 'short' }),
    });
    assert.equal(r.status, 400);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'invalid_input');
  });

  test('no cookie: 401', async () => {
    const r = await authApp.request('/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ current: 'a', next: 'b'.repeat(13) }),
    });
    assert.equal(r.status, 401);
  });
});

// ──────────────────────────────────────────────────────────────────────
// routes/projects.ts
// ──────────────────────────────────────────────────────────────────────

describe('routes/projects — POST /projects (create)', () => {
  test('creates a project with defaults filled when body is empty', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { id: string; data: schema.ProjectData; versionNumber: number };
    assert.equal(body.versionNumber, 1);
    assert.equal(body.data.name, 'Neues Projekt');
    assert.equal(body.data.calcParams.mittellohn, 30);
    assert.equal(body.data.calcParams.verrechnungslohn, 49.9);
    assert.equal(body.data.positions.length, 0);
    // Confirm persisted.
    const row = await db.query.projects.findFirst({ where: eq(schema.projects.id, body.id) });
    assert.ok(row);
    assert.equal(row!.ownerId, u.id);
  });

  test('accepts full ProjectData body', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Project With Body',
        client: 'My Client',
        service: 'My Service',
        tenderNumber: 'TN-42',
        deadline: '2027-01-01',
        bidder: 'Bidder GmbH',
        calcParams: defaultProjectData().calcParams,
        positions: [],
      }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { data: schema.ProjectData };
    assert.equal(body.data.name, 'Project With Body');
    assert.equal(body.data.client, 'My Client');
    assert.equal(body.data.tenderNumber, 'TN-42');
  });

  test('no auth cookie: 401', async () => {
    const r = await projectsApp.request('/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(r.status, 401);
  });

  // Audit P1: create now validates through the same schema as PUT, so a buggy
  // client can't persist oversized/garbage data that later freezes into the
  // customer snapshot.
  test('rejects an oversized name (validation parity with PUT)', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'x'.repeat(600) }),
    });
    assert.equal(r.status, 400);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'invalid_input');
  });

  // Review fix: a verbose GAEB Langtext from the "Kalkulation starten" seed must
  // be TRUNCATED on create, not hard-rejected (which would dead-end the seed).
  test('clamps an over-cap position longText instead of 400ing the seed', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Seeded',
        positions: [{ id: 'p1', oz: '1.1', quantity: 1, materialCost: 0, timeMinutes: 0, nuCost: 0, longText: 'L'.repeat(25000) }],
      }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { data: schema.ProjectData };
    assert.equal(body.data.positions[0].longText.length, 20000);
  });
});

describe('routes/middleware — mustChangePassword gate (server-side)', () => {
  // Audit P1: the forced password change must be enforced on the server, not
  // just by the React modal. A holder of a temporary password must NOT be able
  // to drive mutations via the API until they change it.
  test('blocks a mutation with 403 password_change_required', async () => {
    const u = await seedUser({ mustChangePassword: true });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    });
    assert.equal(r.status, 403);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'password_change_required');
  });

  test('still allows reads (so the forced-change screen can load)', async () => {
    const u = await seedUser({ mustChangePassword: true });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects', {
      method: 'GET',
      headers: { Cookie: cookie },
    });
    assert.equal(r.status, 200);
  });

  test('still allows the change-password endpoint itself', async () => {
    const u = await seedUser({ password: 'temp-password-1234', mustChangePassword: true });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await authApp.request('/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ current: 'temp-password-1234', next: 'fresh-password-90123' }),
    });
    assert.equal(r.status, 200);
  });

  // The SSO handoff is a GET but mints a cross-app login ticket — a force-change
  // user must not be able to escalate into the linked app without changing pw.
  test('blocks the side-effecting SSO handoff (GET) with 403', async () => {
    const u = await seedUser({ mustChangePassword: true });
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await ssoApp.request('/sso/preisanfrage', {
      method: 'GET',
      headers: { Cookie: cookie },
    });
    assert.equal(r.status, 403);
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'password_change_required');
  });
});

describe('routes/projects — GET /projects (list, multi-tenant isolation)', () => {
  test('returns ONLY current user projects', async () => {
    const alice = await seedUser();
    const bob = await seedUser();
    const aliceProjects = [await seedProject(alice.id), await seedProject(alice.id)];
    const bobProject = await seedProject(bob.id);
    const cookie = await makeAuthCookie(alice.id, alice.email);
    const r = await projectsApp.request('/projects', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    const body = await r.json() as { projects: Array<{ id: string }> };
    const ids = new Set(body.projects.map((p) => p.id));
    for (const id of aliceProjects) assert.ok(ids.has(id), `alice should see ${id}`);
    assert.ok(!ids.has(bobProject), `alice must NOT see bob's project ${bobProject}`);
  });

  test('no auth cookie: 401', async () => {
    const r = await projectsApp.request('/projects');
    assert.equal(r.status, 401);
  });
});

describe('routes/projects — GET /projects/:id', () => {
  test('returns project + shares array (empty when no shares)', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id, { name: 'Detail Test' });
    const r = await projectsApp.request(`/projects/${pid}`, { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    const body = await r.json() as { id: string; data: schema.ProjectData; shares: unknown[] };
    assert.equal(body.id, pid);
    assert.equal(body.data.name, 'Detail Test');
    assert.ok(Array.isArray(body.shares));
    assert.equal(body.shares.length, 0);
  });

  test("OTHER user's project: returns 404 (NOT 403, to avoid id-enumeration)", async () => {
    const alice = await seedUser();
    const bob = await seedUser();
    const bobProject = await seedProject(bob.id);
    const cookie = await makeAuthCookie(alice.id, alice.email);
    const r = await projectsApp.request(`/projects/${bobProject}`, { headers: { Cookie: cookie } });
    assert.equal(r.status, 404, 'must be 404 — leaking 403 would confirm the id exists');
    const body = await r.json() as { error: string };
    assert.equal(body.error, 'not_found');
  });

  test('unknown id: 404 not_found', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects/does-not-exist', { headers: { Cookie: cookie } });
    assert.equal(r.status, 404);
  });
});

describe('routes/projects — PUT /projects/:id (updates + optimistic lock)', () => {
  test('updates data + bumps versionNumber when bumpVersion=true', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const newData = defaultProjectData({ name: 'Renamed', client: 'New Client' });
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: newData, bumpVersion: true }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { data: schema.ProjectData; versionNumber: number };
    assert.equal(body.data.name, 'Renamed');
    assert.equal(body.versionNumber, 2);
  });

  test('without bumpVersion: keeps versionNumber (stays at 1)', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: defaultProjectData({ name: 'Quick Edit' }) }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { versionNumber: number };
    assert.equal(body.versionNumber, 1);
  });

  test('expectedUpdatedAt MISMATCH: 409 version_conflict + currentUpdatedAt + currentVersionNumber', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const row = await db.query.projects.findFirst({ where: eq(schema.projects.id, pid) });
    const realTs = row!.updatedAt.getTime();
    const wrongTs = realTs - 99999;
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        data: defaultProjectData({ name: 'Concurrent Edit' }),
        expectedUpdatedAt: wrongTs,
      }),
    });
    assert.equal(r.status, 409);
    const body = await r.json() as { error: string; currentUpdatedAt: number; currentVersionNumber: number };
    assert.equal(body.error, 'version_conflict');
    assert.equal(body.currentUpdatedAt, realTs);
    assert.equal(body.currentVersionNumber, 1);
  });

  test('expectedUpdatedAt MATCH: write succeeds', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const row = await db.query.projects.findFirst({ where: eq(schema.projects.id, pid) });
    const realTs = row!.updatedAt.getTime();
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        data: defaultProjectData({ name: 'OK Edit' }),
        expectedUpdatedAt: realTs,
      }),
    });
    assert.equal(r.status, 200);
  });

  test('REGRESSION 2026-05-23: actuals + nuQuotes survive PUT round-trip (previously stripped → data loss)', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const dataWithFeatures = {
      ...defaultProjectData({ name: 'Nachkalk + Preisspiegel project' }),
      actuals: {
        'pos-1': { hours: 8.5, materialCost: 1240.5, nuCost: 0, recordedAt: '2026-05-23T10:00:00Z' },
        'pos-2': { note: 'Slow Lieferung — 3 Tage verspätet', recordedAt: '2026-05-23T10:30:00Z' },
      },
      nuQuotes: [
        {
          id: 'src-a',
          name: 'Müller Tiefbau GmbH',
          note: 'Saarbrücken',
          receivedAt: '2026-05-22',
          quotes: {
            'pos-1': { materialCost: 14.5, nuCost: 0 },
            'pos-2': { materialCost: 22.0, nuCost: 3.5, note: 'inkl. Anlieferung' },
          },
        },
      ],
    } as schema.ProjectData;
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: dataWithFeatures }),
    });
    assert.equal(r.status, 200);
    // Read back from DB to confirm persistence (not just response echo).
    const row = await db.query.projects.findFirst({ where: eq(schema.projects.id, pid) });
    assert.ok(row);
    const persisted = row!.data as typeof dataWithFeatures;
    assert.ok(persisted.actuals, 'actuals must survive PUT (regression: zod was stripping it)');
    assert.equal(persisted.actuals['pos-1'].hours, 8.5);
    assert.equal(persisted.actuals['pos-1'].materialCost, 1240.5);
    assert.equal(persisted.actuals['pos-2'].note, 'Slow Lieferung — 3 Tage verspätet');
    assert.ok(persisted.nuQuotes, 'nuQuotes must survive PUT');
    assert.equal(persisted.nuQuotes!.length, 1);
    assert.equal(persisted.nuQuotes![0].name, 'Müller Tiefbau GmbH');
    assert.equal(persisted.nuQuotes![0].quotes['pos-1'].materialCost, 14.5);
    assert.equal(persisted.nuQuotes![0].quotes['pos-2'].note, 'inkl. Anlieferung');
  });

  test('REGRESSION 2026-05-23: passthrough preserves unknown optional fields (zuschlagOriginal, headerExtras, faktoren)', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const dataWithLegacyFields = {
      ...defaultProjectData(),
      // These shapes are declared on the frontend ProjectData type but NOT in
      // projectDataSchema. Without .passthrough() they'd vanish on save.
      zuschlagAktuell: { stoffe: 0.15, nu: 0.18 },
      headerExtras: { someFutureField: 'data' },
      faktoren: [{ name: 'Aushub-Faktor', einheit: 'm³', sourceCol: 'N', sourceRow: 3, raw: {} }],
    } as schema.ProjectData;
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: dataWithLegacyFields }),
    });
    assert.equal(r.status, 200);
    const row = await db.query.projects.findFirst({ where: eq(schema.projects.id, pid) });
    const persisted = row!.data as typeof dataWithLegacyFields;
    assert.deepEqual(persisted.zuschlagAktuell, { stoffe: 0.15, nu: 0.18 });
    assert.deepEqual(persisted.headerExtras, { someFutureField: 'data' });
    assert.equal(persisted.faktoren!.length, 1);
    assert.equal(persisted.faktoren![0].name, 'Aushub-Faktor');
  });

  test('REGRESSION 2026-05-25: Position.importedFrom survives PUT round-trip (delete-protection persists)', async () => {
    // Without importedFrom in positionSchema, zod silently strips the field
    // and every reloaded GAEB position becomes deletable again — defeating
    // the whole Round-13 protection feature.
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const dataWithImportedRows = {
      ...defaultProjectData({ name: 'Imported LV' }),
      positions: [
        // One row of each provenance kind + one manual row
        {
          id: 'g1', oz: '01.001', shortText: 'GAEB row',
          longText: '', hinweisText: '', quantity: 1, unit: 'St',
          materialCost: 100, timeMinutes: 0, nuCost: 0, isHeader: false,
          sortOrder: 1, sectionPath: '01',
          epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
          visibleToCustomer: true, positionType: 'standard',
          importedFrom: 'gaeb',
        },
        {
          id: 'x1', oz: '01.002', shortText: 'Excel row',
          longText: '', hinweisText: '', quantity: 1, unit: 'St',
          materialCost: 200, timeMinutes: 0, nuCost: 0, isHeader: false,
          sortOrder: 2, sectionPath: '01',
          epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
          visibleToCustomer: true, positionType: 'standard',
          importedFrom: 'excel',
        },
        {
          id: 'pr1', oz: '01.003', shortText: 'preisanfrage row',
          longText: '', hinweisText: '', quantity: 1, unit: 'St',
          materialCost: 300, timeMinutes: 0, nuCost: 0, isHeader: false,
          sortOrder: 3, sectionPath: '01',
          epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
          visibleToCustomer: true, positionType: 'standard',
          importedFrom: 'preisanfrage',
        },
        {
          id: 'm1', oz: '01.004', shortText: 'Manual row',
          longText: '', hinweisText: '', quantity: 1, unit: 'St',
          materialCost: 400, timeMinutes: 0, nuCost: 0, isHeader: false,
          sortOrder: 4, sectionPath: '01',
          epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
          visibleToCustomer: true, positionType: 'standard',
          // no importedFrom
        },
      ],
    } as schema.ProjectData;
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: dataWithImportedRows }),
    });
    assert.equal(r.status, 200);
    const row = await db.query.projects.findFirst({ where: eq(schema.projects.id, pid) });
    const persisted = row!.data;
    const pos = persisted.positions as Array<{ id: string; importedFrom?: string }>;
    const g1 = pos.find((p) => p.id === 'g1')!;
    const x1 = pos.find((p) => p.id === 'x1')!;
    const pr1 = pos.find((p) => p.id === 'pr1')!;
    const m1 = pos.find((p) => p.id === 'm1')!;
    assert.equal(g1.importedFrom, 'gaeb', 'gaeb tag must survive PUT round-trip');
    assert.equal(x1.importedFrom, 'excel', 'excel tag must survive');
    assert.equal(pr1.importedFrom, 'preisanfrage', 'preisanfrage tag must survive');
    assert.equal(m1.importedFrom, undefined, 'manual row stays unmarked');
  });

  test('REGRESSION 2026-05-25: invalid importedFrom value is rejected by zod', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const dataWithBadTag = {
      ...defaultProjectData(),
      positions: [
        {
          id: 'bad1', oz: '01.001', shortText: 'Bad tag',
          longText: '', hinweisText: '', quantity: 1, unit: 'St',
          materialCost: 0, timeMinutes: 0, nuCost: 0, isHeader: false,
          sortOrder: 1, sectionPath: '01',
          epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
          visibleToCustomer: true, positionType: 'standard',
          importedFrom: 'made-up-source', // not in the enum
        },
      ],
    };
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: dataWithBadTag }),
    });
    assert.equal(r.status, 400);
  });

  test('empty positions[] is allowed (not an error)', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: defaultProjectData({ positions: [] }) }),
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { data: schema.ProjectData };
    assert.equal(body.data.positions.length, 0);
  });

  test('body > 2 MB: 413 payload_too_large', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    // Fabricate a > 2 MB payload by repeating a long string in `notes`.
    const huge = 'x'.repeat(2 * 1024 * 1024 + 1024);
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: defaultProjectData({ notes: huge }) }),
    });
    assert.equal(r.status, 413);
    const body = await r.json() as { error: string; maxBytes: number };
    assert.equal(body.error, 'payload_too_large');
    assert.equal(body.maxBytes, OWNER_BODY_LIMIT);
  });

  test('invalid data shape: 400 invalid_input', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: { calcParams: { foo: 1 } } }), // missing required calcParams keys
    });
    assert.equal(r.status, 400);
  });

  test("OTHER user's project: 404 not_found", async () => {
    const alice = await seedUser();
    const bob = await seedUser();
    const bobPid = await seedProject(bob.id);
    const cookie = await makeAuthCookie(alice.id, alice.email);
    const r = await projectsApp.request(`/projects/${bobPid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: defaultProjectData() }),
    });
    assert.equal(r.status, 404);
  });

  test('concurrent PUTs to same project: last writer wins on data, version bumps correctly', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    // Two simultaneous PUTs, both bumping the version.
    const [r1, r2] = await Promise.all([
      projectsApp.request(`/projects/${pid}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ data: defaultProjectData({ name: 'A' }), bumpVersion: true }),
      }),
      projectsApp.request(`/projects/${pid}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ data: defaultProjectData({ name: 'B' }), bumpVersion: true }),
      }),
    ]);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    // The DB row should reflect one of the two writes. Version is between 2 and 3
    // depending on whether the second write read the first's bumped row before
    // updating (with optimistic-lock OFF, last-writer-wins is acceptable).
    const row = await db.query.projects.findFirst({ where: eq(schema.projects.id, pid) });
    assert.ok(row);
    assert.ok(row!.versionNumber === 2 || row!.versionNumber === 3, 'version bumped at least once');
    assert.ok(row!.data.name === 'A' || row!.data.name === 'B');
  });
});

describe('routes/projects — DELETE /projects/:id (cascades)', () => {
  test('removes project AND cascades to shares + responses + comments', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const pid = await seedProject(u.id);
    // Seed a share + a response + a position-comment to confirm cascade.
    const sid = nanoid(16);
    const now = new Date();
    await db.insert(schema.shares).values({
      id: sid,
      projectId: pid,
      token: nanoid(24),
      visiblePositionIds: [],
      settings: {
        brandHeader: 'own',
        allowApproval: true,
        allowChangeRequests: true,
        showTotals: true,
        showMwst: true,
      },
      snapshotData: null,
      snapshotHash: 'h',
      snapshotVersion: 1,
      passwordHash: null,
      expiresAt: null,
      createdAt: now,
      viewCount: 0,
    });
    const rid = nanoid(16);
    await db.insert(schema.shareResponses).values({
      id: rid,
      shareId: sid,
      responseType: 'approve',
      customerName: 'X',
      customerEmail: 'x@x.x',
      ip: '1.2.3.4',
      userAgent: 'UA',
      payload: { message: 'ok' },
      respondedAt: now,
    });
    const cid = nanoid(16);
    await db.insert(schema.positionComments).values({
      id: cid,
      shareId: sid,
      positionOz: '1.1',
      intent: 'accept',
      text: 'looks good',
      authorName: 'X',
      authorEmail: 'x@x.x',
      ip: '1.2.3.4',
      userAgent: 'UA',
      createdAt: now,
      resolvedAt: null,
    });
    // Sanity: rows exist before delete.
    assert.ok(await db.query.shares.findFirst({ where: eq(schema.shares.id, sid) }));
    assert.ok(await db.query.shareResponses.findFirst({ where: eq(schema.shareResponses.id, rid) }));
    assert.ok(await db.query.positionComments.findFirst({ where: eq(schema.positionComments.id, cid) }));

    const r = await projectsApp.request(`/projects/${pid}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    assert.equal(r.status, 200);
    const body = await r.json() as { ok: boolean };
    assert.equal(body.ok, true);

    // Project gone.
    assert.equal(await db.query.projects.findFirst({ where: eq(schema.projects.id, pid) }), undefined);
    // Cascaded children gone.
    assert.equal(await db.query.shares.findFirst({ where: eq(schema.shares.id, sid) }), undefined);
    assert.equal(await db.query.shareResponses.findFirst({ where: eq(schema.shareResponses.id, rid) }), undefined);
    assert.equal(await db.query.positionComments.findFirst({ where: eq(schema.positionComments.id, cid) }), undefined);
  });

  test("OTHER user's project: 404 not_found", async () => {
    const alice = await seedUser();
    const bob = await seedUser();
    const bobPid = await seedProject(bob.id);
    const cookie = await makeAuthCookie(alice.id, alice.email);
    const r = await projectsApp.request(`/projects/${bobPid}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    assert.equal(r.status, 404);
    // Bob's project must still exist.
    assert.ok(await db.query.projects.findFirst({ where: eq(schema.projects.id, bobPid) }));
  });

  test('unknown id: 404 not_found', async () => {
    const u = await seedUser();
    const cookie = await makeAuthCookie(u.id, u.email);
    const r = await projectsApp.request('/projects/no-such-id', {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    assert.equal(r.status, 404);
  });
});
