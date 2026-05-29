import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { compress } from 'hono/compress';
import { bodyLimit } from 'hono/body-limit';
import { runMigrations, pingDb, closeDb } from './db.js';
import { ensureSeedUser } from './seed.js';
import { authRoute } from './routes/auth.js';
import { projectsRoute } from './routes/projects.js';
import { sharesRoute } from './routes/shares.js';
import { publicRoute } from './routes/public.js';
import { inboxRoute } from './routes/inbox.js';
import { notificationsRoute, digestRoute } from './routes/notifications.js';
import { presetsRoute } from './routes/presets.js';
import { templatesRoute } from './routes/templates.js';
import { firmenRoute } from './routes/firmen.js';
import { rateLimit } from './lib/ratelimit.js';
import { securityHeaders } from './lib/securityHeaders.js';
import { requestId } from './lib/requestId.js';
import { getVersion } from './lib/version.js';
import { isPreisanfrageEnabled, isPreisanfrageMock } from './lib/preisanfrage.js';

runMigrations();
await ensureSeedUser();

const app = new Hono();

// Order matters. Each middleware can short-circuit, so we apply them in
// the order:
//   1. requestId   — assign correlation id FIRST so logger + downstream see it
//   2. logger      — log the request with the id already on context
//   3. securityHeaders — set headers AFTER handler runs (sticks even on errors)
//   4. compress    — compress AFTER security headers so the headers go on the wire uncompressed
//   5. cors        — CORS preflight handling for browser clients
app.use('*', requestId());
app.use('*', logger());
app.use('*', securityHeaders());
app.use('*', compress());

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5174,http://localhost:4173')
  .split(',')
  .map((o) => o.trim());

app.use(
  '/api/panel/*',
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body-size caps. Owner endpoints (projects, profile) accept large LV JSON;
// public customer endpoints accept only short messages. The 5 MB DoS demonstrated
// during the audit (single approve payload landing in SQLite) is what these
// limits stop.
const PUBLIC_BODY_LIMIT = 32 * 1024; // 32 KB
const OWNER_BODY_LIMIT = 2 * 1024 * 1024; // 2 MB — leaves room for ~500-row LVs

const publicBodyLimit = bodyLimit({
  maxSize: PUBLIC_BODY_LIMIT,
  onError: (c) => c.json({ error: 'payload_too_large', maxBytes: PUBLIC_BODY_LIMIT }, 413),
});
const ownerBodyLimit = bodyLimit({
  maxSize: OWNER_BODY_LIMIT,
  onError: (c) => c.json({ error: 'payload_too_large', maxBytes: OWNER_BODY_LIMIT }, 413),
});

// Per-IP login rate limit. 10 failed/successful attempts per 15 min is generous
// for a single legitimate user but blocks credential-stuffing at scale.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'login',
  message: 'too_many_login_attempts',
});

/**
 * Deeper health probe — includes a SQLite SELECT 1 + reports the
 * preisanfrage integration mode. Returns 503 if the DB is unreachable so
 * orchestrators (Docker healthcheck, Traefik) can pull traffic.
 */
app.get('/api/panel/health', (c) => {
  const dbOk = pingDb();
  const preisanfrage = !isPreisanfrageEnabled()
    ? 'disabled'
    : isPreisanfrageMock()
      ? 'mock'
      : 'enabled';
  const body = {
    ok: dbOk,
    service: 'kalku-panel-api',
    ts: Date.now(),
    version: getVersion(),
    checks: {
      db: dbOk ? 'ok' : 'error',
      preisanfrage,
    },
  };
  return c.json(body, dbOk ? 200 : 503);
});

// Order matters: limiter + body cap must run before the route handler.
app.use('/api/panel/auth/login', loginLimiter);
app.use('/api/panel/auth/*', publicBodyLimit);
app.use('/api/panel/projects', ownerBodyLimit);
app.use('/api/panel/projects/*', ownerBodyLimit);
app.use('/api/panel/shares/*', publicBodyLimit);
app.use('/api/panel/share/*', publicBodyLimit);

app.route('/api/panel/auth', authRoute);
app.route('/api/panel/projects', projectsRoute);
app.route('/api/panel', sharesRoute);
app.route('/api/panel', publicRoute);
app.route('/api/panel', inboxRoute);
app.route('/api/panel', notificationsRoute);
app.route('/api/panel', digestRoute);
app.route('/api/panel', presetsRoute);
app.route('/api/panel', templatesRoute);
app.route('/api/panel', firmenRoute);

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

const port = Number(process.env.PORT || 3000);
console.log(`[kalku-panel-api] listening on :${port}`);
const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });

/**
 * Graceful shutdown — exported for tests + invoked on SIGTERM/SIGINT.
 *
 * Sequence:
 *   1. Stop accepting new TCP connections (server.close stops listen socket).
 *   2. Wait up to `drainMs` for in-flight handlers to settle. Node's
 *      `Server.close()` invokes its callback once all connections close.
 *   3. Close the SQLite handle so WAL flushes before exit.
 *
 * The promise resolves either when drain completes OR the timeout fires —
 * we never hang the process. Returns true if drain completed cleanly,
 * false if we hit the timeout (caller may log it).
 */
export async function gracefulShutdown(drainMs = 10_000): Promise<boolean> {
  const drained = await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), drainMs);
    try {
      server.close((err) => {
        clearTimeout(timer);
        finish(err == null);
      });
    } catch {
      clearTimeout(timer);
      finish(false);
    }
  });
  // Close the DB regardless of drain outcome — we're exiting either way.
  closeDb();
  return drained;
}

let shuttingDown = false;
async function handleSignal(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[kalku-panel-api] received ${signal}, draining…`);
  const ok = await gracefulShutdown(10_000);
  console.log(`[kalku-panel-api] shutdown ${ok ? 'clean' : 'timed-out'}`);
  process.exit(0);
}

process.on('SIGTERM', () => void handleSignal('SIGTERM'));
process.on('SIGINT', () => void handleSignal('SIGINT'));
