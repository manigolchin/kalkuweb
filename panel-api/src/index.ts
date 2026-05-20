import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';
import { runMigrations } from './db.js';
import { ensureSeedUser } from './seed.js';
import { authRoute } from './routes/auth.js';
import { projectsRoute } from './routes/projects.js';
import { sharesRoute } from './routes/shares.js';
import { publicRoute } from './routes/public.js';
import { inboxRoute } from './routes/inbox.js';
import { notificationsRoute, digestRoute } from './routes/notifications.js';
import { presetsRoute } from './routes/presets.js';
import { rateLimit } from './lib/ratelimit.js';

runMigrations();
await ensureSeedUser();

const app = new Hono();

app.use('*', logger());

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

app.get('/api/panel/health', (c) =>
  c.json({ ok: true, service: 'kalku-panel-api', ts: Date.now() }),
);

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

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

const port = Number(process.env.PORT || 3000);
console.log(`[kalku-panel-api] listening on :${port}`);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
