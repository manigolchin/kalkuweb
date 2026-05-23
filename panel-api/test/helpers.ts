/**
 * Shared test helpers for panel-api security/integration tests.
 *
 * Pattern: each test file imports this BEFORE any src/* module. setupTestDb()
 * configures process.env.DB_PATH (per-suite tmp file), JWT_SECRET, NODE_ENV.
 * Then `buildApp()` constructs a Hono instance with the same routes as
 * src/index.ts but WITHOUT calling serve() — drive it with `app.request()`
 * (the Web fetch interface).
 *
 * Cookie handling: createUser() returns a Cookie header string ready to
 * forward on subsequent requests. We parse `set-cookie` from the login
 * response and re-emit it as `cookie: kalku_session=...`.
 */
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nanoid } from 'nanoid';

let tmpDir: string | null = null;

/** Call this in a `before(...)` block BEFORE importing any src/* module. */
export function setupTestDb(suiteName: string): { tmpDir: string; dbFile: string } {
  tmpDir = mkdtempSync(join(tmpdir(), `kalku-test-${suiteName}-`));
  const dbFile = join(tmpDir, `${suiteName}.db`);
  process.env.DB_PATH = dbFile;
  // Stable JWT secret so tokens minted in one test verify in the next.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-' + nanoid(16);
  process.env.NODE_ENV = 'test';
  // Don't run mailer for real
  delete process.env.SMTP_HOST;
  return { tmpDir, dbFile };
}

export function teardownTestDb(): void {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
}

/**
 * Build a Hono app mirroring src/index.ts route mounts and middleware,
 * but WITHOUT the serve() call. Must be called AFTER setupTestDb() AND
 * after runMigrations() has been awaited.
 */
export async function buildApp() {
  const { Hono } = await import('hono');
  const { bodyLimit } = await import('hono/body-limit');
  const { authRoute } = await import('../src/routes/auth.js');
  const { projectsRoute } = await import('../src/routes/projects.js');
  const { sharesRoute } = await import('../src/routes/shares.js');
  const { publicRoute } = await import('../src/routes/public.js');
  const { inboxRoute } = await import('../src/routes/inbox.js');
  const { presetsRoute } = await import('../src/routes/presets.js');
  const { templatesRoute } = await import('../src/routes/templates.js');
  const { rateLimit } = await import('../src/lib/ratelimit.js');

  const PUBLIC_BODY_LIMIT = 32 * 1024;
  const OWNER_BODY_LIMIT = 2 * 1024 * 1024;

  const publicBodyLimit = bodyLimit({
    maxSize: PUBLIC_BODY_LIMIT,
    onError: (c) => c.json({ error: 'payload_too_large', maxBytes: PUBLIC_BODY_LIMIT }, 413),
  });
  const ownerBodyLimit = bodyLimit({
    maxSize: OWNER_BODY_LIMIT,
    onError: (c) => c.json({ error: 'payload_too_large', maxBytes: OWNER_BODY_LIMIT }, 413),
  });

  // High max so tests can rapid-fire logins without tripping the limiter.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10_000,
    keyPrefix: 'login-test',
    message: 'too_many_login_attempts',
  });

  const app = new Hono();
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
  app.route('/api/panel', presetsRoute);
  app.route('/api/panel', templatesRoute);
  app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));
  return app;
}

/**
 * Insert a user directly via the DB layer (bypass /login) and return the
 * id + a login Cookie header to forward.
 */
export async function createUser(opts?: { email?: string; password?: string; name?: string }) {
  const { db } = await import('../src/db.js');
  const { users } = await import('../src/schema.js');
  const { hashPassword } = await import('../src/lib/auth.js');
  const email = (opts?.email || `u-${nanoid(8)}@test.local`).toLowerCase();
  const password = opts?.password || 'test-password-' + nanoid(8);
  const name = opts?.name || 'Test User';
  const id = nanoid(16);
  const now = new Date();
  await db.insert(users).values({
    id,
    email,
    passwordHash: await hashPassword(password),
    name,
    companyName: 'Test GmbH',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  return { id, email, password, name };
}

/** Log in via the API and return the session Cookie header string. */
export async function loginAndGetCookie(app: any, email: string, password: string): Promise<string> {
  const res = await app.request('/api/panel/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) {
    const body = await res.text();
    throw new Error(`login failed status=${res.status} body=${body}`);
  }
  const setCookie = res.headers.get('set-cookie') || '';
  // Extract "kalku_session=...." up to the first ";"
  const m = setCookie.match(/kalku_session=([^;]+)/);
  if (!m) throw new Error(`no session cookie in: ${setCookie}`);
  return `kalku_session=${m[1]}`;
}

/** Convenience: create user + login + return both. */
export async function createUserAndLogin(app: any, opts?: { email?: string }) {
  const u = await createUser(opts);
  const cookie = await loginAndGetCookie(app, u.email, u.password);
  return { ...u, cookie };
}

/** Insert a project directly via the DB and return its id. */
export async function createProject(ownerId: string, dataOverride?: Record<string, any>) {
  const { db } = await import('../src/db.js');
  const { projects } = await import('../src/schema.js');
  const id = nanoid(16);
  const now = new Date();
  const data = {
    name: 'Test Project',
    client: 'Test Client',
    service: 'Test Service',
    tenderNumber: '',
    deadline: '',
    bidder: '',
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
    ...dataOverride,
  };
  await db.insert(projects).values({
    id,
    ownerId,
    data: data as any,
    versionNumber: 1,
    createdAt: now,
    updatedAt: now,
  });
  return { id, data, updatedAt: now };
}

/** Build N positions with predictable ids p1..pN. */
export function makePositions(n: number, overrides?: (i: number) => Record<string, any>): any[] {
  const out: any[] = [];
  for (let i = 1; i <= n; i++) {
    out.push({
      id: `p${i}`,
      oz: String(i).padStart(2, '0'),
      shortText: `Position ${i}`,
      longText: '',
      hinweisText: '',
      quantity: 1,
      unit: 'Stk',
      materialCost: 100 * i,
      timeMinutes: 60,
      nuCost: 0,
      isHeader: false,
      sortOrder: i,
      sectionPath: '',
      epLohn: 0,
      epMaterial: 0,
      epGeraet: 0,
      epNu: 0,
      ep: 0,
      gp: 0,
      visibleToCustomer: true,
      positionType: 'standard',
      ...(overrides ? overrides(i) : {}),
    });
  }
  return out;
}

/** JSON request helper. */
export async function jsonReq(
  app: any,
  method: string,
  url: string,
  opts?: { cookie?: string; body?: unknown; headers?: Record<string, string> },
) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(opts?.headers || {}),
  };
  if (opts?.cookie) headers['cookie'] = opts.cookie;
  const init: RequestInit = {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };
  return app.request(url, init);
}
