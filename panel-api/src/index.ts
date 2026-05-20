import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { runMigrations } from './db.js';
import { ensureSeedUser } from './seed.js';
import { authRoute } from './routes/auth.js';
import { projectsRoute } from './routes/projects.js';
import { sharesRoute } from './routes/shares.js';
import { publicRoute } from './routes/public.js';

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

app.get('/api/panel/health', (c) =>
  c.json({ ok: true, service: 'kalku-panel-api', ts: Date.now() }),
);

app.route('/api/panel/auth', authRoute);
app.route('/api/panel/projects', projectsRoute);
app.route('/api/panel', sharesRoute);
app.route('/api/panel', publicRoute);

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

const port = Number(process.env.PORT || 3000);
console.log(`[kalku-panel-api] listening on :${port}`);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
