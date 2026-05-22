/**
 * Round 10 — best-practice hardening: security headers, request-id correlation,
 * compression, deeper health endpoint, graceful shutdown.
 *
 * Most tests build a small local Hono app that wires the same middleware
 * + handlers as index.ts, mirroring the per-file isolated-DB pattern used
 * by round9-* tests. The graceful-shutdown tests import index.ts directly
 * (after a careful env setup so the real serve() listens on an ephemeral
 * port + the DB is a fresh tmp file).
 *
 * Test runner: node:test (tsx --test).
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// MUST set env BEFORE the first db.js / index.ts import.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-r10-'));
process.env.DB_PATH = join(tmpDir, 'round10.db');
process.env.JWT_SECRET = 'r10-secret-' + Math.random().toString(36).slice(2);
// Pin to ephemeral port. @hono/node-server uses 0 → OS picks a free port.
process.env.PORT = '0';
// Keep mock mode tests deterministic — clear inherited values.
delete process.env.PREISANFRAGE_MOCK;
delete process.env.PREISANFRAGE_SERVICE_JWT;
delete process.env.NODE_ENV;

const { runMigrations, pingDb } = await import('../src/db.js');
const { securityHeaders } = await import('../src/lib/securityHeaders.js');
const { requestId } = await import('../src/lib/requestId.js');
const { compress } = await import('hono/compress');
const { getVersion } = await import('../src/lib/version.js');

before(() => {
  runMigrations();
});

/* ─── helpers ──────────────────────────────────────────────────────── */

/**
 * Builds a fresh Hono app with the SAME middleware wiring as index.ts +
 * the health handler. Each test gets its own app instance so settings
 * (e.g. NODE_ENV-flip for HSTS) don't leak between tests.
 */
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', requestId());
  app.use('*', securityHeaders());
  app.use('*', compress());
  // Mirror of the production health handler — kept in sync with index.ts.
  app.get('/api/panel/health', async (c) => {
    const { pingDb } = await import('../src/db.js');
    const { isPreisanfrageEnabled, isPreisanfrageMock } = await import('../src/lib/preisanfrage.js');
    const dbOk = pingDb();
    const preisanfrage = !isPreisanfrageEnabled()
      ? 'disabled'
      : isPreisanfrageMock()
        ? 'mock'
        : 'enabled';
    return c.json(
      {
        ok: dbOk,
        service: 'kalku-panel-api',
        ts: Date.now(),
        version: getVersion(),
        checks: { db: dbOk ? 'ok' : 'error', preisanfrage },
      },
      dbOk ? 200 : 503,
    );
  });
  return app;
}

/* ════════════════════════════════════════════════════════════════════
 * 1. Security headers
 * ════════════════════════════════════════════════════════════════════ */

describe('lib/securityHeaders.ts', () => {
  test('/api/panel/health response has X-Content-Type-Options=nosniff', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  test('/api/panel/health response has X-Frame-Options=DENY', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  });

  test('/api/panel/health response has Referrer-Policy=strict-origin-when-cross-origin', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  test('/api/panel/health response has Permissions-Policy with empty camera/microphone/geolocation', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    const pp = res.headers.get('permissions-policy');
    assert.ok(pp, 'Permissions-Policy must be set');
    assert.match(pp!, /camera=\(\)/);
    assert.match(pp!, /microphone=\(\)/);
    assert.match(pp!, /geolocation=\(\)/);
  });

  test('HSTS is NOT set in dev mode (no NODE_ENV=production, no x-forwarded-proto=https)', async () => {
    const oldEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      const app = buildApp();
      const res = await app.request('/api/panel/health');
      assert.equal(res.headers.get('strict-transport-security'), null,
        'HSTS must NOT pin localhost in dev');
    } finally {
      if (oldEnv !== undefined) process.env.NODE_ENV = oldEnv;
    }
  });

  test('HSTS IS set when x-forwarded-proto=https header is present', async () => {
    const oldEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      const app = buildApp();
      const res = await app.request('/api/panel/health', {
        headers: { 'x-forwarded-proto': 'https' },
      });
      const hsts = res.headers.get('strict-transport-security');
      assert.ok(hsts, 'HSTS must be set when x-forwarded-proto=https');
      assert.match(hsts!, /max-age=31536000/);
      assert.match(hsts!, /includeSubDomains/);
      assert.match(hsts!, /preload/);
    } finally {
      if (oldEnv !== undefined) process.env.NODE_ENV = oldEnv;
    }
  });

  test('HSTS IS set when NODE_ENV=production (even without x-forwarded-proto)', async () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const app = buildApp();
      const res = await app.request('/api/panel/health');
      assert.ok(res.headers.get('strict-transport-security'),
        'HSTS must be set in production');
    } finally {
      if (oldEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldEnv;
    }
  });

  test('security headers also appear on error responses (404)', async () => {
    const app = buildApp();
    app.notFound((c) => c.json({ error: 'nope' }, 404));
    const res = await app.request('/api/panel/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  });
});

/* ════════════════════════════════════════════════════════════════════
 * 2. Request ID
 * ════════════════════════════════════════════════════════════════════ */

describe('lib/requestId.ts', () => {
  test('without incoming x-request-id, response has a generated x-request-id (≥16 chars)', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    const id = res.headers.get('x-request-id');
    assert.ok(id, 'x-request-id must be set');
    assert.ok(id!.length >= 16, `generated id should be ≥16 chars, got ${id!.length}`);
  });

  test('with incoming x-request-id, response echoes the same id', async () => {
    const app = buildApp();
    const incoming = 'client-supplied-req-id-abc123';
    const res = await app.request('/api/panel/health', {
      headers: { 'x-request-id': incoming },
    });
    assert.equal(res.headers.get('x-request-id'), incoming);
  });

  test('each request gets a UNIQUE id (10 requests → 10 distinct ids)', async () => {
    const app = buildApp();
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/panel/health');
      const id = res.headers.get('x-request-id');
      assert.ok(id);
      ids.add(id!);
    }
    assert.equal(ids.size, 10, 'each request should get a unique id');
  });

  test('overly long incoming x-request-id is rejected; a fresh id is generated', async () => {
    const app = buildApp();
    const tooLong = 'x'.repeat(200);
    const res = await app.request('/api/panel/health', {
      headers: { 'x-request-id': tooLong },
    });
    const echoed = res.headers.get('x-request-id');
    assert.ok(echoed);
    assert.notEqual(echoed, tooLong, 'oversize id must NOT be echoed');
    assert.ok(echoed!.length < 64, `replacement id should be < 64 chars, got ${echoed!.length}`);
  });

  test('c.get("requestId") is set during handler execution', async () => {
    const app = new Hono<{ Variables: { requestId: string } }>();
    app.use('*', requestId());
    app.get('/probe', (c) => c.json({ id: c.get('requestId') }));
    const res = await app.request('/probe', {
      headers: { 'x-request-id': 'probe-id-12345' },
    });
    const body = (await res.json()) as { id: string };
    assert.equal(body.id, 'probe-id-12345');
  });

  test('incoming x-request-id with disallowed characters is replaced (sanitization)', async () => {
    // The middleware accepts only [A-Za-z0-9._-]. Anything else gets a fresh id,
    // protecting downstream log lines from injection-style values. Fetch itself
    // rejects control chars in headers, so we use brackets + special chars that
    // pass the wire-level check but should still be replaced by our middleware.
    const app = buildApp();
    const suspicious = '[evil${cmd}!@#]';
    const res = await app.request('/api/panel/health', {
      headers: { 'x-request-id': suspicious },
    });
    const echoed = res.headers.get('x-request-id');
    assert.ok(echoed);
    assert.ok(!echoed!.includes('['), 'must not echo bracket');
    assert.ok(!echoed!.includes('$'), 'must not echo dollar');
    assert.ok(!echoed!.includes('!'), 'must not echo bang');
    assert.notEqual(echoed, suspicious);
    // The replacement is a fresh nanoid in the standard alphabet.
    assert.ok(/^[A-Za-z0-9_-]+$/.test(echoed!));
  });
});

/* ════════════════════════════════════════════════════════════════════
 * 3. Compression
 * ════════════════════════════════════════════════════════════════════ */

describe('hono/compress wiring', () => {
  test('response > 1 KB with Accept-Encoding: gzip returns Content-Encoding: gzip', async () => {
    const app = buildApp();
    // Add a route that returns ~2 KB of JSON
    app.get('/big', (c) => {
      const arr: string[] = [];
      for (let i = 0; i < 100; i++) arr.push(`line-${i}-${'x'.repeat(20)}`);
      return c.json({ items: arr });
    });
    const res = await app.request('/big', { headers: { 'accept-encoding': 'gzip' } });
    assert.equal(res.headers.get('content-encoding'), 'gzip', 'large response should be gzipped');
  });

  test('small response (< 1 KB) with explicit Content-Length is NOT compressed', async () => {
    // Hono's compress() only honours the 1024-byte threshold when the
    // response has a Content-Length header. Streaming JSON without a length
    // is always considered "may be large" and gets compressed. We document
    // the contract that matters for proxies / known-size bodies.
    const app = buildApp();
    app.get('/tiny', (c) => {
      const body = JSON.stringify({ ok: true });
      return c.body(body, 200, {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body)),
      });
    });
    const res = await app.request('/tiny', { headers: { 'accept-encoding': 'gzip' } });
    assert.notEqual(res.headers.get('content-encoding'), 'gzip',
      'tiny response with explicit Content-Length stays uncompressed');
  });

  test('compression respects Accept-Encoding header (no header → no compression)', async () => {
    const app = buildApp();
    app.get('/big2', (c) => {
      const arr: string[] = [];
      for (let i = 0; i < 100; i++) arr.push(`line-${i}-${'y'.repeat(20)}`);
      return c.json({ items: arr });
    });
    // Some Fetch implementations auto-inject Accept-Encoding. To prove the
    // middleware honors the header, we send an EXPLICIT identity request.
    const res = await app.request('/big2', { headers: { 'accept-encoding': 'identity' } });
    assert.notEqual(res.headers.get('content-encoding'), 'gzip',
      'identity-only client must NOT receive gzip');
  });
});

/* ════════════════════════════════════════════════════════════════════
 * 4. Health endpoint
 * ════════════════════════════════════════════════════════════════════ */

describe('/api/panel/health (deep)', () => {
  test('returns ok:true with a healthy DB', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    const body = (await res.json()) as { ok: boolean };
    assert.equal(body.ok, true);
  });

  test('returns 200 status (NOT 503) when healthy', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    assert.equal(res.status, 200);
  });

  test('returns version field from package.json (non-empty string)', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    const body = (await res.json()) as { version: string };
    assert.equal(typeof body.version, 'string');
    assert.ok(body.version.length > 0);
    // Must NOT be the empty fallback when run from the real repo.
    assert.notEqual(body.version, '');
  });

  test('returns checks.db = "ok" on a healthy DB', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    const body = (await res.json()) as { checks: { db: string } };
    assert.equal(body.checks.db, 'ok');
  });

  test('returns checks.preisanfrage = "mock" when PREISANFRAGE_MOCK is on', async () => {
    const oldMock = process.env.PREISANFRAGE_MOCK;
    process.env.PREISANFRAGE_MOCK = 'fixture';
    try {
      const app = buildApp();
      const res = await app.request('/api/panel/health');
      const body = (await res.json()) as { checks: { preisanfrage: string } };
      assert.equal(body.checks.preisanfrage, 'mock');
    } finally {
      if (oldMock === undefined) delete process.env.PREISANFRAGE_MOCK;
      else process.env.PREISANFRAGE_MOCK = oldMock;
    }
  });

  test('returns checks.preisanfrage = "disabled" when no JWT + mock off', async () => {
    const oldMock = process.env.PREISANFRAGE_MOCK;
    const oldJwt = process.env.PREISANFRAGE_SERVICE_JWT;
    const oldEnv = process.env.NODE_ENV;
    // Force explicit-off + production so the fixture's auto-mock path is also bypassed.
    process.env.PREISANFRAGE_MOCK = '0';
    delete process.env.PREISANFRAGE_SERVICE_JWT;
    process.env.NODE_ENV = 'production';
    try {
      const app = buildApp();
      const res = await app.request('/api/panel/health');
      const body = (await res.json()) as { checks: { preisanfrage: string } };
      assert.equal(body.checks.preisanfrage, 'disabled');
    } finally {
      if (oldMock === undefined) delete process.env.PREISANFRAGE_MOCK;
      else process.env.PREISANFRAGE_MOCK = oldMock;
      if (oldJwt === undefined) delete process.env.PREISANFRAGE_SERVICE_JWT;
      else process.env.PREISANFRAGE_SERVICE_JWT = oldJwt;
      if (oldEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldEnv;
    }
  });

  test('returns checks.preisanfrage = "enabled" when JWT is configured + mock off', async () => {
    const oldMock = process.env.PREISANFRAGE_MOCK;
    const oldJwt = process.env.PREISANFRAGE_SERVICE_JWT;
    process.env.PREISANFRAGE_MOCK = '0';
    process.env.PREISANFRAGE_SERVICE_JWT = 'real-token-12345678901234567890';
    try {
      const app = buildApp();
      const res = await app.request('/api/panel/health');
      const body = (await res.json()) as { checks: { preisanfrage: string } };
      assert.equal(body.checks.preisanfrage, 'enabled');
    } finally {
      if (oldMock === undefined) delete process.env.PREISANFRAGE_MOCK;
      else process.env.PREISANFRAGE_MOCK = oldMock;
      if (oldJwt === undefined) delete process.env.PREISANFRAGE_SERVICE_JWT;
      else process.env.PREISANFRAGE_SERVICE_JWT = oldJwt;
    }
  });

  test('response has the canonical service + ts fields (back-compat)', async () => {
    const app = buildApp();
    const res = await app.request('/api/panel/health');
    const body = (await res.json()) as { service: string; ts: number };
    assert.equal(body.service, 'kalku-panel-api');
    assert.equal(typeof body.ts, 'number');
    assert.ok(body.ts > 1_700_000_000_000, 'ts is a recent epoch ms');
  });
});

/* ════════════════════════════════════════════════════════════════════
 * 5. lib/version
 * ════════════════════════════════════════════════════════════════════ */

describe('lib/version.ts', () => {
  test('getVersion() returns the package.json version (semver-like)', () => {
    const v = getVersion();
    assert.equal(typeof v, 'string');
    assert.ok(v.length > 0);
    // Either semver-like, or the explicit fallback.
    assert.ok(/^\d+\.\d+\.\d+/.test(v) || v === 'unknown',
      `version "${v}" should be semver-like or 'unknown'`);
  });

  test('getVersion() is stable across repeated calls (cached at boot)', () => {
    const a = getVersion();
    const b = getVersion();
    const c = getVersion();
    assert.equal(a, b);
    assert.equal(b, c);
  });
});

/* ════════════════════════════════════════════════════════════════════
 * 6. Graceful shutdown — runs LAST because it closes the shared DB.
 * ════════════════════════════════════════════════════════════════════ */

describe('graceful shutdown', () => {
  // The index module starts an HTTP server at top-level. PORT=0 was set
  // before any import above, so it'll listen on an ephemeral OS-picked
  // port. The signal handlers it registers call process.exit(0), so we
  // MUST NOT raise SIGTERM/SIGINT inside the test process — we call
  // gracefulShutdown() directly instead.

  test('gracefulShutdown is exported + callable from index.ts (smoke test)', async () => {
    const mod = await import('../src/index.js');
    assert.equal(typeof mod.gracefulShutdown, 'function');
  });

  test('calling shutdown with no active requests resolves quickly (<2s)', async () => {
    const mod = await import('../src/index.js');
    const start = Date.now();
    const ok = await mod.gracefulShutdown(2000);
    const elapsed = Date.now() - start;
    assert.equal(typeof ok, 'boolean');
    assert.ok(elapsed < 2000,
      `shutdown with no traffic should be fast, took ${elapsed}ms`);
  });

  test('DB is closed after shutdown (pingDb returns false)', async () => {
    // The previous test already ran shutdown; the DB handle is closed.
    // pingDb wraps in try/catch so it returns false rather than throwing.
    assert.equal(pingDb(), false, 'DB ping must return false after shutdown');
  });
});
