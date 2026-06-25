/**
 * Live-Zusammenarbeit — NETWORK-level integration tests.
 *
 * The sibling collab.test.ts drives the Hono app in-process (`app.request`),
 * which is fast but cannot prove the parts that only exist on a real socket:
 *   - the SSE live-sync stream actually FLUSHES events over TCP (the
 *     `compress()` exclusion for `/events` in index.ts is what makes this work —
 *     compression buffers the stream and would silently break real-time push),
 *   - a coworker's save reaches another open editor over the wire sub-second,
 *   - the full 409 → mergeProjectData → retry round-trip preserves BOTH editors'
 *     work end-to-end through the real HTTP layer.
 *
 * So this file boots the server with @hono/node-server on an ephemeral port and
 * talks to it with real fetch + a real SSE reader — the same shapes the browser
 * uses. Same per-file temp-DB / lazy-import conventions as collab.test.ts.
 */
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-collab-net-'));
process.env.DB_PATH = join(tmpDir, 'collab-net.db');
process.env.JWT_SECRET = 'collab-net-secret-' + Math.random().toString(36).slice(2);
// Short SSE keepalive so the server-side stream loop notices a client disconnect
// and ends within ~250ms — otherwise the prod-default 25s ping timer would pin
// this process alive long after the assertions finish. (Prod default unchanged.)
process.env.SSE_KEEPALIVE_MS = '250';

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const auth = await import('../src/lib/auth.js');
const collab = await import('../src/lib/collab.js');
const { projectsRoute } = await import('../src/routes/projects.js');
const { nanoid } = await import('nanoid');
// The REAL production 3-way merge the browser runs on a 409 — we exercise it,
// not a re-implementation, so the test fails if the merge ever regresses.
const { mergeProjectData } = await import('../../src/features/kalkulation/mergeProject.js');

// Mirror index.ts exactly: compress everything EXCEPT the SSE stream.
const app = new Hono();
const compressMw = compress();
app.use('*', (c, next) => (c.req.path.endsWith('/events') ? next() : compressMw(c, next)));
app.route('/projects', projectsRoute);

let server: Server;
let BASE = '';
const openAborts = new Set<AbortController>();

before(async () => {
  runMigrations();
  server = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }) as unknown as Server;
  await new Promise((r) => setTimeout(r, 100));
  const addr = server.address() as { port: number };
  BASE = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  // Abort any still-open SSE readers and shut the listener + sockets. With the
  // short keepalive above, the server-side stream loops end on their own, so the
  // process exits naturally (no process.exit, no truncated test reporting).
  for (const c of openAborts) c.abort();
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    server.close(() => finish());
    (server as Server & { closeAllConnections?: () => void }).closeAllConnections?.();
    setTimeout(finish, 1000).unref();
  });
});

beforeEach(() => {
  collab._resetPresence();
});

// ── helpers ──────────────────────────────────────────────────────────────────
async function seedUser(name: string) {
  const id = nanoid(16);
  const email = `${id}@test.local`.toLowerCase();
  const now = new Date();
  await db.insert(schema.users).values({
    id, email, name, role: 'user', isActive: true,
    passwordHash: await auth.hashPassword('TestPassword12345!'),
    companyName: '', companyLogoUrl: '', companyPhone: '', companyContactEmail: '',
    mustChangePassword: false, createdAt: now, updatedAt: now,
  });
  const cookie = `${auth.COOKIE_NAME}=${await auth.signToken({ sub: id, email })}`;
  return { id, email, cookie, name };
}

function projectData(positions: unknown[] = []): schema.ProjectData {
  return {
    name: 'Shared Calc', client: 'Kunde', service: 'Service', tenderNumber: 'T-1',
    deadline: '2026-12-31', bidder: 'Bieter',
    calcParams: {
      mittellohn: 30, verrechnungslohn: 49.9, materialZuschlag: 0.12, nuZuschlag: 0.12,
      geraeteZuschlagPct: 0.1, geraeteStundensatz: 0.5, zeitabzug: 0, tagesstunden: 8,
      personaleinsatz: 3, mwst: 0.19,
    },
    positions,
  } as unknown as schema.ProjectData;
}

// Real Position schema fields (shortText is the editable description).
function pos(id: string, shortText: string) {
  return {
    id, oz: id, shortText, longText: '', hinweisText: '',
    quantity: 10, unit: 'm²', materialCost: 5, timeMinutes: 6, nuCost: 0,
    isHeader: false, sortOrder: 0, sectionPath: '',
    positionType: 'standard', visibleToCustomer: true, aufmassFormula: '',
  };
}

async function seedProject(ownerId: string, positions: unknown[]): Promise<string> {
  const id = nanoid(16);
  const now = new Date();
  await db.insert(schema.projects).values({
    id, ownerId, data: projectData(positions), versionNumber: 1, createdAt: now, updatedAt: now,
  });
  return id;
}

const req = (path: string, cookie: string, init: RequestInit = {}) =>
  fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', cookie, ...(init.headers || {}) },
  });

/** Open a live SSE stream and collect parsed `data:` payloads as they arrive. */
function openSse(path: string, cookie: string) {
  const events: { at: number; ev: Record<string, unknown> }[] = [];
  const controller = new AbortController();
  openAborts.add(controller);
  const ready = (async () => {
    const res = await fetch(BASE + path, { headers: { cookie }, signal: controller.signal });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    void (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf('\n\n')) !== -1) {
            const block = buf.slice(0, nl);
            buf = buf.slice(nl + 2);
            const line = block.split('\n').find((l) => l.startsWith('data:'));
            if (line) {
              try {
                events.push({ at: Date.now(), ev: JSON.parse(line.slice(5).trim()) });
              } catch {
                /* non-JSON keepalive frame */
              }
            }
          }
        }
      } catch {
        /* aborted on teardown */
      }
    })();
  })();
  return {
    events,
    ready,
    close: () => {
      controller.abort();
      openAborts.delete(controller);
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll the collected SSE events for the first one matching `type`, up to `ms`. */
async function waitForEvent(
  events: { ev: Record<string, unknown> }[],
  type: string,
  ms = 2000,
): Promise<Record<string, unknown> | undefined> {
  for (let waited = 0; waited < ms; waited += 50) {
    const hit = events.find((e) => e.ev.type === type);
    if (hit) return hit.ev;
    await sleep(50);
  }
  return undefined;
}

// ── tests ────────────────────────────────────────────────────────────────────
describe('Live-Zusammenarbeit — over a real socket', () => {
  test('a coworker save is pushed to an open editor over the SSE stream', async () => {
    const owner = await seedUser('Anna Owner');
    const coworker = await seedUser('Ben Kollege');
    const pid = await seedProject(owner.id, [pos('1', 'Bestand')]);
    await req(`/projects/${pid}/collaborators`, owner.cookie, {
      method: 'POST', body: JSON.stringify({ userId: coworker.id }),
    });

    // Coworker is watching the calc via the live stream.
    const sse = openSse(`/projects/${pid}/events`, coworker.cookie);
    await sse.ready;
    await sleep(150);

    // Owner saves a new position.
    const head = (await (await req(`/projects/${pid}/head`, owner.cookie)).json()) as {
      updatedAt: number;
    };
    const put = await req(`/projects/${pid}`, owner.cookie, {
      method: 'PUT',
      body: JSON.stringify({
        data: projectData([pos('1', 'Bestand'), pos('2', 'Neu')]),
        expectedUpdatedAt: head.updatedAt,
      }),
    });
    assert.equal(put.status, 200);

    const pushed = await waitForEvent(sse.events, 'project-updated');
    sse.close();
    assert.ok(pushed, 'coworker should receive a project-updated push over SSE');
    assert.equal(typeof pushed!.updatedAt, 'number');
    assert.ok(
      (pushed!.updatedAt as number) > head.updatedAt,
      'pushed updatedAt should be newer than the pre-save head',
    );
  });

  test('concurrent edits to different rows both survive (409 → real merge → retry)', async () => {
    const owner = await seedUser('Anna Owner');
    const coworker = await seedUser('Ben Kollege');
    const pid = await seedProject(owner.id, [pos('1', 'Bestand'), pos('2', 'Zweite')]);
    await req(`/projects/${pid}/collaborators`, owner.cookie, {
      method: 'POST', body: JSON.stringify({ userId: coworker.id }),
    });

    // Both read the same baseline.
    const detail = (await (await req(`/projects/${pid}`, owner.cookie)).json()) as {
      updatedAt: string;
      data: { positions: { id: string }[] };
    };
    const baseTs = new Date(detail.updatedAt).getTime();
    const basePositions = detail.data.positions;

    // Anna edits row 2; Ben (concurrently, same baseline) adds row 3.
    const annaEdit = basePositions.map((p) =>
      p.id === '2' ? { ...p, shortText: 'Anna-bearbeitet' } : p,
    );
    const benAdd = [...basePositions, pos('3', 'Ben-neu')];

    const [aRes, bRes] = await Promise.all([
      req(`/projects/${pid}`, owner.cookie, {
        method: 'PUT',
        body: JSON.stringify({ data: projectData(annaEdit), expectedUpdatedAt: baseTs }),
      }),
      req(`/projects/${pid}`, coworker.cookie, {
        method: 'PUT',
        body: JSON.stringify({ data: projectData(benAdd), expectedUpdatedAt: baseTs }),
      }),
    ]);

    // Exactly one wins; the other is told to merge.
    assert.deepEqual([aRes.status, bRes.status].sort(), [200, 409]);

    // The loser reconciles exactly like the client: 3-way merge of base + mine +
    // theirs, then retry against the now-current updatedAt.
    const loser = aRes.status === 409
      ? { who: owner, mine: annaEdit }
      : { who: coworker, mine: benAdd };
    const latest = (await (await req(`/projects/${pid}`, loser.who.cookie)).json()) as {
      updatedAt: string;
      data: schema.ProjectData;
    };
    const merged = mergeProjectData(
      projectData(basePositions),
      projectData(loser.mine),
      latest.data,
    );
    const retry = await req(`/projects/${pid}`, loser.who.cookie, {
      method: 'PUT',
      body: JSON.stringify({
        data: merged,
        expectedUpdatedAt: new Date(latest.updatedAt).getTime(),
      }),
    });
    assert.equal(retry.status, 200);

    // Both editors' intent must be in the final stored state.
    const final = (await (await req(`/projects/${pid}`, owner.cookie)).json()) as {
      data: { positions: { id: string; shortText: string }[] };
    };
    const byId = new Map(final.data.positions.map((p) => [p.id, p]));
    assert.equal(byId.get('2')?.shortText, 'Anna-bearbeitet', 'Anna’s row-2 edit survived');
    assert.ok(byId.has('3'), 'Ben’s new row 3 survived');
    assert.ok(byId.has('1') && byId.has('2') && byId.has('3'), 'no row was silently lost');
  });

  test('a presence change is pushed to an open editor over the SSE stream', async () => {
    const owner = await seedUser('Anna Owner');
    const coworker = await seedUser('Ben Kollege');
    const pid = await seedProject(owner.id, [pos('1', 'Bestand')]);
    await req(`/projects/${pid}/collaborators`, owner.cookie, {
      method: 'POST', body: JSON.stringify({ userId: coworker.id }),
    });

    const sse = openSse(`/projects/${pid}/events`, coworker.cookie);
    await sse.ready;
    await sleep(150);
    sse.events.length = 0; // ignore the hello frame

    // Owner heartbeats → server publishes a presence roster to the open stream.
    await req(`/projects/${pid}/presence`, owner.cookie, {
      method: 'POST', body: JSON.stringify({ editing: true }),
    });

    const presence = await waitForEvent(sse.events, 'presence');
    sse.close();
    assert.ok(presence, 'coworker should receive a presence push over SSE');
    const peers = presence!.peers as { userId: string; editing: boolean }[];
    assert.ok(
      peers.some((p) => p.userId === owner.id && p.editing === true),
      'the pushed roster includes the owner, flagged editing',
    );
  });
});
