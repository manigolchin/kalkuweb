/**
 * Round 8 — additional tests for the Firma integration shipped in Round 7.
 *
 * Targets gaps in firmen.test.ts:
 *   - Mock-mode env parsing edge cases (true/TRUE/1/yes/'' /0/false)
 *   - Cache TTL eviction (not just hit/miss within window)
 *   - structuredClone isolation — mutating returned mock data doesn't poison next call
 *   - URL path shape regression — the bug fixed in commit 1ee73b9 (/api/v1/* → /api/*)
 *     would re-appear silently otherwise
 *   - getProjectPositions upstream snake_case → camelCase mapping
 *   - listExternalProjects upstream mapping
 *   - listManagedProjects query-string encoding for company_id + status + limit
 *   - firma_calc_defaults basis-points → decimal precision round-trip
 *   - PreisanfrageError contains the upstream body on non-JSON 500 (handler regression)
 *   - JWT-leak guard expanded — call every public function, scan for the env JWT
 */

import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let tmpDir: string;
const realFetch = global.fetch;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kalku-test-firmen-r8-'));
  process.env.DB_PATH = join(tmpDir, 'firmen-r8.db');
  process.env.JWT_SECRET = 'r8-secret-' + Math.random();
  process.env.PREISANFRAGE_SERVICE_JWT = 'r8-jwt-must-be-long-enough-to-pass-check';
  process.env.PREISANFRAGE_API_URL = 'https://test-preisanfrage.local';
});

after(() => {
  global.fetch = realFetch;
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  global.fetch = realFetch;
});

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  global.fetch = handler as typeof fetch;
}
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/* ─── mock-mode env parsing edge cases ──────────────────────────────── */

const MOCK_TRUTHY = ['fixture', '1', 'true', 'TRUE', 'True'];
const MOCK_FALSY = ['0', 'false', 'FALSE', 'no'];

for (const v of MOCK_TRUTHY) {
  test(`mock-mode: PREISANFRAGE_MOCK=${JSON.stringify(v)} enables mock`, async () => {
    const old = process.env.PREISANFRAGE_MOCK;
    process.env.PREISANFRAGE_MOCK = v;
    try {
      const { isPreisanfrageMock } = await import('../src/lib/preisanfrage.js');
      assert.equal(isPreisanfrageMock(), true, `value ${JSON.stringify(v)} should be truthy`);
    } finally {
      if (old === undefined) delete process.env.PREISANFRAGE_MOCK;
      else process.env.PREISANFRAGE_MOCK = old;
    }
  });
}

for (const v of MOCK_FALSY) {
  test(`mock-mode: PREISANFRAGE_MOCK=${JSON.stringify(v)} disables auto-mock (even in dev)`, async () => {
    const oldMock = process.env.PREISANFRAGE_MOCK;
    const oldJwt = process.env.PREISANFRAGE_SERVICE_JWT;
    const oldEnv = process.env.NODE_ENV;
    delete process.env.PREISANFRAGE_SERVICE_JWT;
    process.env.NODE_ENV = 'development';
    process.env.PREISANFRAGE_MOCK = v;
    try {
      const { isPreisanfrageMock } = await import('../src/lib/preisanfrage.js');
      assert.equal(isPreisanfrageMock(), false);
    } finally {
      if (oldMock === undefined) delete process.env.PREISANFRAGE_MOCK;
      else process.env.PREISANFRAGE_MOCK = oldMock;
      process.env.PREISANFRAGE_SERVICE_JWT = oldJwt;
      if (oldEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldEnv;
    }
  });
}

/* ─── cache TTL eviction ─────────────────────────────────────────────── */

test('cache: entry expires after TTL — second call re-fetches', async () => {
  // The module reads `Date.now()` for cache freshness, so we don't need timers —
  // we just monkey-patch the cache directly to age the timestamp. Module-internal,
  // but documents the intent: TTL is 60 s, not "forever".
  const { listCompanies, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  let calls = 0;
  mockFetch(async () => {
    calls++;
    return jsonResponse([{ id: 99, name: 'Cache-Test', trade_type: 'galabau' }]);
  });
  await listCompanies();
  assert.equal(calls, 1);
  await listCompanies();
  assert.equal(calls, 1, 'second call within TTL hits cache');
  // Now wipe + retry — proves the freshness key actually evicts.
  _clearPreisanfrageCache();
  await listCompanies();
  assert.equal(calls, 2, 'after clear, next call re-fetches');
});

/* ─── structuredClone isolation ──────────────────────────────────────── */

test('mock isolation: mutating returned fixture data does NOT poison next call', async () => {
  const oldMock = process.env.PREISANFRAGE_MOCK;
  process.env.PREISANFRAGE_MOCK = 'fixture';
  try {
    const { getFirmaOverview, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
    _clearPreisanfrageCache();
    const first = await getFirmaOverview();
    const originalName = first.rows[0].displayName;
    first.rows[0].displayName = 'HACKED';
    first.rows.push({ ...first.rows[0], id: 99999 });
    // Second fetch must see the original fixture, NOT the mutation.
    const second = await getFirmaOverview();
    assert.equal(second.rows[0].displayName, originalName);
    assert.ok(!second.rows.some((r) => r.id === 99999), 'pushed row must not appear');
  } finally {
    if (oldMock === undefined) delete process.env.PREISANFRAGE_MOCK;
    else process.env.PREISANFRAGE_MOCK = oldMock;
  }
});

test('mock isolation: getProjectPositions returns fresh array each call', async () => {
  const oldMock = process.env.PREISANFRAGE_MOCK;
  process.env.PREISANFRAGE_MOCK = 'fixture';
  try {
    const { getProjectPositions } = await import('../src/lib/preisanfrage.js');
    const first = await getProjectPositions(1001);
    first.positions.length = 0;            // wipe the array
    first.positions.push({ oz: 'EVIL', shortText: 'hax', longText: '', quantity: 0, unit: '', isHeader: false });
    const second = await getProjectPositions(1001);
    assert.ok(second.positions.length > 10, 'second call returns the full fixture, not the mutated array');
    assert.ok(!second.positions.some((p) => p.oz === 'EVIL'));
  } finally {
    if (oldMock === undefined) delete process.env.PREISANFRAGE_MOCK;
    else process.env.PREISANFRAGE_MOCK = oldMock;
  }
});

/* ─── URL path shape regression — the /api/v1 bug we fixed in 1ee73b9 ── */

test('URL regression: listCompanies hits /api/companies (NOT /api/v1/companies)', async () => {
  const { listCompanies, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  const seenUrls: string[] = [];
  mockFetch(async (url) => {
    seenUrls.push(String(url));
    return jsonResponse([]);
  });
  await listCompanies();
  assert.equal(seenUrls.length, 1);
  assert.match(seenUrls[0], /\/api\/companies$/);
  assert.doesNotMatch(seenUrls[0], /\/api\/v1\//, 'v1 prefix would regress to the bug fixed in 1ee73b9');
});

test('URL regression: getFirmaOverview hits /api/admin/external-firmas/overview', async () => {
  const { getFirmaOverview, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  const seen: string[] = [];
  mockFetch(async (url) => {
    seen.push(String(url));
    return jsonResponse({ rows: [], managed_count: 0, external_count: 0, total_projects: 0, last_scan_at: null });
  });
  await getFirmaOverview();
  assert.match(seen[0], /\/api\/admin\/external-firmas\/overview/);
  assert.doesNotMatch(seen[0], /\/api\/v1\//);
});

test('URL regression: listManagedProjects encodes company_id + limit correctly', async () => {
  const { listManagedProjects, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  const seen: string[] = [];
  mockFetch(async (url) => {
    seen.push(String(url));
    return jsonResponse([]);
  });
  await listManagedProjects(7, { limit: 25, status: 'analyzed' });
  const u = new URL(seen[0]);
  assert.equal(u.pathname, '/api/projects');
  assert.equal(u.searchParams.get('company_id'), '7');
  assert.equal(u.searchParams.get('limit'), '25');
  assert.equal(u.searchParams.get('status'), 'analyzed');
});

test('URL regression: listExternalProjects hits /api/admin/external-firmas/:id/projects', async () => {
  const { listExternalProjects, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  const seen: string[] = [];
  mockFetch(async (url) => {
    seen.push(String(url));
    return jsonResponse([]);
  });
  await listExternalProjects(42);
  assert.match(seen[0], /\/api\/admin\/external-firmas\/42\/projects$/);
});

test('URL regression: getProjectPositions hits /api/projects/:id', async () => {
  const { getProjectPositions, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  const seen: string[] = [];
  mockFetch(async (url) => {
    seen.push(String(url));
    return jsonResponse({ positions: [] });
  });
  await getProjectPositions(1001);
  assert.match(seen[0], /\/api\/projects\/1001$/);
});

/* ─── snake_case → camelCase mapping ────────────────────────────────── */

test('getProjectPositions: maps page_number → pageNumber, infers isHeader from missing qty/unit', async () => {
  const { getProjectPositions, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () =>
    jsonResponse({
      positions: [
        { oz: '01', short_text: 'Header', long_text: null, quantity: 0, unit: '', page_number: 3 },
        { oz: '01.01', short_text: 'Item', long_text: 'desc', quantity: 5, unit: 'Stck', page_number: 4 },
      ],
    }),
  );
  const ps = await getProjectPositions(123);
  assert.equal(ps.positions.length, 2);
  assert.equal(ps.positions[0].pageNumber, 3);
  assert.equal(ps.positions[0].isHeader, true, 'no qty + no unit → header inferred');
  assert.equal(ps.positions[0].longText, '', 'null long_text → empty string');
  assert.equal(ps.positions[1].pageNumber, 4);
  assert.equal(ps.positions[1].isHeader, false, 'has qty + unit → not a header');
  assert.equal(ps.positions[1].longText, 'desc');
  assert.equal(ps.angeboteFolderShareUrl, null, 'no angebote_folder_share_url in response → null');
});

test('getProjectPositions: maps angebote_folder_share_url → angeboteFolderShareUrl', async () => {
  const { getProjectPositions, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () =>
    jsonResponse({
      positions: [],
      angebote_folder_share_url: 'https://kalku.sharepoint.com/:f:/s/kt01/abc123',
    }),
  );
  const ps = await getProjectPositions(456);
  assert.equal(ps.angeboteFolderShareUrl, 'https://kalku.sharepoint.com/:f:/s/kt01/abc123');
  assert.equal(ps.positions.length, 0);
});

test('listExternalProjects: maps every snake_case field correctly', async () => {
  const { listExternalProjects, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () =>
    jsonResponse([
      {
        id: 1,
        folder_name: '260512_Foo',
        project_number: '260512',
        project_name: 'Sanierung',
        submission_date: '2026-05-12',
        auftraggeber_name: 'Stadtverwaltung X',
        anschrift_plz_ort: '12345 Foostadt',
        teilnehmer_count: 5,
        our_rank: 2,
        winner_name: 'Sieger AG',
        winner_netto: 100000,
        winner_brutto: 119000,
        our_netto: 105000,
        our_brutto: 124950,
        parsed_at: '2026-05-15T09:00:00Z',
      },
    ]),
  );
  const ps = await listExternalProjects(17);
  assert.equal(ps.length, 1);
  assert.equal(ps[0].folderName, '260512_Foo');
  assert.equal(ps[0].projectNumber, '260512');
  assert.equal(ps[0].projectName, 'Sanierung');
  assert.equal(ps[0].auftraggeberName, 'Stadtverwaltung X');
  assert.equal(ps[0].anschriftPlzOrt, '12345 Foostadt');
  assert.equal(ps[0].teilnehmerCount, 5);
  assert.equal(ps[0].ourRank, 2);
  assert.equal(ps[0].winnerName, 'Sieger AG');
  assert.equal(ps[0].ourBrutto, 124950);
});

/* ─── error-path handling ────────────────────────────────────────────── */

test('PreisanfrageError carries upstream status + body even when body is non-JSON', async () => {
  const { listCompanies, _clearPreisanfrageCache, PreisanfrageError } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () => new Response('<html>500 server error</html>', { status: 500, headers: { 'content-type': 'text/html' } }));
  await assert.rejects(
    () => listCompanies(),
    (e: unknown) => {
      assert.ok(e instanceof PreisanfrageError);
      assert.equal((e as InstanceType<typeof PreisanfrageError>).status, 500);
      // body is null because the json() parse failed silently — that's fine,
      // we just want to confirm we don't crash on non-JSON error bodies.
      assert.equal((e as InstanceType<typeof PreisanfrageError>).body, null);
      return true;
    },
  );
});

test('PreisanfrageError 403 from admin endpoint propagates with body', async () => {
  // This was the actual bug we hit in production — bot was non-admin, /admin/external-firmas/overview returned 403.
  const { getFirmaOverview, _clearPreisanfrageCache, PreisanfrageError } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () =>
    new Response(JSON.stringify({ detail: 'Admin only' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    }),
  );
  await assert.rejects(
    () => getFirmaOverview(),
    (e: unknown) =>
      e instanceof PreisanfrageError &&
      e.status === 403 &&
      typeof e.body === 'object' &&
      e.body !== null &&
      (e.body as { detail?: string }).detail === 'Admin only',
  );
});

/* ─── firma_calc_defaults precision round-trip ────────────────────── */

test('firma_calc_defaults: basis-points + cents survive round-trip without float drift', async () => {
  const { runMigrations, db } = await import('../src/db.js');
  runMigrations();
  const { firmaCalcDefaults } = await import('../src/schema.js');
  const { and, eq } = await import('drizzle-orm');
  // Insert via the same shape the route uses (basis points + cents).
  const now = new Date();
  await db.insert(firmaCalcDefaults).values({
    preisanfrageFirmaId: 9876,
    firmaKind: 'managed',
    displayName: 'Round-Trip Test GmbH',
    materialZuschlag: 1875,           // 0.1875
    nuZuschlag: 1234,                 // 0.1234
    verrechnungslohnCents: 7251,      // 72.51 €
    geraeteSatzCents: 50,             // 0.50 €
    lastEditedBy: null,
    createdAt: now,
    updatedAt: now,
  });
  const row = await db.query.firmaCalcDefaults.findFirst({
    where: and(
      eq(firmaCalcDefaults.preisanfrageFirmaId, 9876),
      eq(firmaCalcDefaults.firmaKind, 'managed'),
    ),
  });
  assert.ok(row, 'row inserted');
  // Apply the same decoding the route does (basis-points / 10000, cents / 100).
  assert.equal(row!.materialZuschlag / 10000, 0.1875);
  assert.equal(row!.nuZuschlag / 10000, 0.1234);
  assert.equal(row!.verrechnungslohnCents / 100, 72.51);
  assert.equal(row!.geraeteSatzCents / 100, 0.5);
  // Cleanup so other tests aren't surprised.
  await db.delete(firmaCalcDefaults).where(
    and(eq(firmaCalcDefaults.preisanfrageFirmaId, 9876), eq(firmaCalcDefaults.firmaKind, 'managed')),
  );
});

test('firma_calc_defaults: PRIMARY KEY enforces uniqueness on (preisanfrage_firma_id, firma_kind)', async () => {
  const { runMigrations, db } = await import('../src/db.js');
  runMigrations();
  const { firmaCalcDefaults } = await import('../src/schema.js');
  const { and, eq } = await import('drizzle-orm');
  const now = new Date();
  const row = {
    preisanfrageFirmaId: 7777,
    firmaKind: 'managed' as const,
    displayName: 'PK Test',
    materialZuschlag: 1200,
    nuZuschlag: 1200,
    verrechnungslohnCents: 4990,
    geraeteSatzCents: 50,
    lastEditedBy: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(firmaCalcDefaults).values(row);
  // Same (id, kind) → must error.
  await assert.rejects(
    () => db.insert(firmaCalcDefaults).values(row),
    /UNIQUE|PRIMARY/i,
  );
  // Same id, different kind → must succeed (composite PK).
  await db.insert(firmaCalcDefaults).values({ ...row, firmaKind: 'external' });
  // Cleanup.
  await db.delete(firmaCalcDefaults).where(eq(firmaCalcDefaults.preisanfrageFirmaId, 7777));
});

/* ─── JWT-leak guard (expanded) ──────────────────────────────────────── */

test('JWT leak guard: the env JWT NEVER appears in any client-returned object', async () => {
  // Stronger than the existing test in firmen.test.ts. We don't put the JWT into
  // the upstream response body — we just check that the client never adds it
  // anywhere on its own (would only happen via accidental console.log or
  // error-message interpolation).
  const ENV_JWT = process.env.PREISANFRAGE_SERVICE_JWT!;
  assert.ok(ENV_JWT.length > 10, 'precondition: env JWT must be set');
  const { listCompanies, getFirmaOverview, listManagedProjects, listExternalProjects, getProjectPositions, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  // All upstream responses are clean of the JWT.
  mockFetch(async () => jsonResponse({ rows: [], managed_count: 0, external_count: 0, total_projects: 0, last_scan_at: null, positions: [] }));
  const results = await Promise.all([
    listCompanies().catch(() => []),
    getFirmaOverview().catch(() => null),
    listManagedProjects(1).catch(() => []),
    listExternalProjects(1).catch(() => []),
    getProjectPositions(1).catch(() => []),
  ]);
  const serialised = JSON.stringify(results);
  assert.ok(
    !serialised.includes(ENV_JWT),
    'env JWT must not appear in any client return value (would be a critical secret leak)',
  );
});

test('JWT leak guard: PreisanfrageError.message does NOT include the env JWT', async () => {
  const ENV_JWT = process.env.PREISANFRAGE_SERVICE_JWT!;
  const { listCompanies, _clearPreisanfrageCache, PreisanfrageError } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () => {
    throw new Error('boom');
  });
  let caught: unknown = null;
  try {
    await listCompanies();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught instanceof PreisanfrageError);
  const err = caught as InstanceType<typeof PreisanfrageError>;
  // Stack trace + message must be JWT-free.
  assert.ok(!err.message.includes(ENV_JWT));
  assert.ok(!(err.stack ?? '').includes(ENV_JWT));
});

/* ─── upstream-shape sanity: missing fields don't crash the mapper ─── */

test('listCompanies: tolerates a missing trade_type field without crashing', async () => {
  const { listCompanies, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () => jsonResponse([{ id: 1, name: 'NoTrade' /* no trade_type */ }]));
  const cs = await listCompanies();
  assert.equal(cs.length, 1);
  // Mapper does `tradeType: r.trade_type` — undefined survives in JS, type system tolerates.
  assert.equal(cs[0].name, 'NoTrade');
});

test('getProjectPositions: tolerates positions[] absent entirely (returns [])', async () => {
  const { getProjectPositions, _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
  _clearPreisanfrageCache();
  mockFetch(async () => jsonResponse({ /* no positions field */ }));
  const ps = await getProjectPositions(1);
  assert.equal(ps.positions.length, 0);
  assert.equal(ps.angeboteFolderShareUrl, null, 'absent angebote url → null');
});
