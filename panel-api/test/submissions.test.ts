/**
 * Tests for the Submissionsergebnis + Submissionskarte integration:
 *   - preisanfrage client methods getSubmissionsergebnis / getSubmissionskarte
 *     (snake_case → camelCase projection, query params, cache, error mapping)
 *   - mock fixtures (bidder rankings + geo pins)
 *   - panel routes: /firmen/:kind/:id/projects/:pid/submissionsergebnis
 *     and /submissionskarte (auth gate, managed-only rule, mock passthrough)
 *
 * Harness mirrors firmen.test.ts + round11-local-firma.test.ts: temp DB via
 * DB_PATH set before any import, a real service-JWT so the default path hits
 * (mocked) fetch, fixture-mode toggled per-test where the mock is exercised,
 * and a signed owner cookie for the authenticated route tests.
 */

import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// MUST be set before importing db.js / preisanfrage.js.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-submissions-'));
process.env.DB_PATH = join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'submissions-' + Math.random().toString(36).slice(2);
process.env.PREISANFRAGE_SERVICE_JWT = 'test-service-token-with-some-length';
process.env.PREISANFRAGE_API_URL = 'https://test-preisanfrage.local';
delete process.env.PREISANFRAGE_MOCK; // default state: token present → real (mocked-fetch) path.

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { firmenRoute } = await import('../src/routes/firmen.js');
const { submissionskarteRoute } = await import('../src/routes/submissionskarte.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { _clearPreisanfrageCache } = await import('../src/lib/preisanfrage.js');
const { nanoid } = await import('nanoid');

const app = new Hono();
app.route('/api', firmenRoute);
app.route('/api', submissionskarteRoute);

const realFetch = global.fetch;

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  global.fetch = handler as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function seedUser(): Promise<{ id: string; cookie: string }> {
  const id = nanoid(16);
  const email = `${id}@test.local`;
  const now = new Date();
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash: 'unused',
    name: 'T',
    companyName: 'TestCo',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  return { id, cookie: `${COOKIE_NAME}=${await signToken({ sub: id, email })}` };
}

/** A complete snake_case upstream Submissionsergebnis payload. */
function upstreamErgebnis() {
  return {
    project_id: 1001,
    parsed_at: '2026-05-12T16:10:00Z',
    teilnehmer_count: 3,
    our_rank: 2,
    winner_name: 'Bauunternehmen Klein GmbH',
    winner_sum: 217_056.0,
    winner_netto_sum: 182_400.0,
    winner_brutto_sum: 217_056.0,
    parse_confidence: 0.97,
    bidders: [
      { rank: 1, bidder_name: 'Bauunternehmen Klein GmbH', total_sum: 217_056.0, netto_sum: 182_400.0, brutto_sum: 217_056.0, lots: [], is_own_bid: false, is_winner: true },
      { rank: 2, bidder_name: 'Gesellchen GmbH', total_sum: 224_791.0, netto_sum: 188_900.0, brutto_sum: 224_791.0, lots: [{ name: 'Los 1', netto_sum: 100_000.0, brutto_sum: 119_000.0 }], is_own_bid: true, is_winner: false },
      { rank: 3, bidder_name: 'Naturstein Wagner GmbH', total_sum: 232_407.0, netto_sum: 195_300.0, brutto_sum: 232_407.0, lots: [], is_own_bid: false, is_winner: false },
    ],
    variant_analysis: { submitted_variant_label: 'günstigste', manual_variant_label: 'abgegeben (manuell)' },
  };
}

/** A complete snake_case upstream combined-Submissionskarte payload. */
function upstreamKarte() {
  return {
    pins: [
      {
        project_id: 1001, project_number: '260512', project_name: 'Sandsteinmauer',
        submission_date: '2026-05-12', latitude: 49.2769, longitude: 7.117, anschrift_plz_ort: '66386 Sankt Ingbert',
        gewerk: 'GaLaBau', teilnehmer_count: 5, our_rank: 2,
        winner_name: 'Klein', winner_sum: 217_056.0, winner_netto_sum: 182_400.0, winner_brutto_sum: 217_056.0,
        our_sum: 224_791.0, our_netto_sum: 188_900.0, our_brutto_sum: 224_791.0,
        preislage: 'mittel', vergabe_status: 'absage', pdf_available: true,
        company_id: 5, company_name: 'Gesellchen GmbH', trade_type: 'galabau',
      },
      {
        project_id: 2001, project_number: '260520', project_name: 'Leitungsverlegung',
        submission_date: '2026-05-20', latitude: 50.296, longitude: 7.505, anschrift_plz_ort: '56332 Dieblich',
        gewerk: 'Leitungsbau', teilnehmer_count: null, our_rank: null,
        winner_name: null, winner_sum: null, winner_netto_sum: null, winner_brutto_sum: null,
        our_sum: null, our_netto_sum: null, our_brutto_sum: null,
        preislage: null, vergabe_status: 'nicht_geparst', pdf_available: false,
        company_id: 6, company_name: 'MPB Bau', trade_type: 'leitungsbau',
      },
    ],
    gewerke: ['GaLaBau', 'Leitungsbau'],
    projects_without_location: 4,
    projects_without_parse: 1,
  };
}

before(() => {
  runMigrations();
});

beforeEach(async () => {
  global.fetch = realFetch;
  _clearPreisanfrageCache();
  await db.delete(schema.users);
});

after(() => {
  global.fetch = realFetch;
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
});

// ─── client: getSubmissionsergebnis ───────────────────────────────────

describe('preisanfrage client — getSubmissionsergebnis', () => {
  test('maps snake_case → camelCase, passes company_id, manual variant wins', async () => {
    const { getSubmissionsergebnis } = await import('../src/lib/preisanfrage.js');
    let seenUrl = '';
    mockFetch(async (url) => {
      seenUrl = String(url);
      return jsonResponse(upstreamErgebnis());
    });
    const r = await getSubmissionsergebnis(5, 1001);
    assert.match(seenUrl, /\/api\/submissionsergebnis\/1001\?company_id=5$/);
    assert.equal(r.projectId, 1001);
    assert.equal(r.teilnehmerCount, 3);
    assert.equal(r.ourRank, 2);
    assert.equal(r.winnerName, 'Bauunternehmen Klein GmbH');
    assert.equal(r.winnerNettoSum, 182_400.0);
    assert.equal(r.bidders.length, 3);
    // camelCase + own-bid flag
    const own = r.bidders.find((b) => b.isOwnBid);
    assert.ok(own, 'own bid present');
    assert.equal(own!.bidderName, 'Gesellchen GmbH');
    assert.equal(own!.rank, 2);
    // lots projected
    assert.equal(own!.lots.length, 1);
    assert.equal(own!.lots[0].name, 'Los 1');
    assert.equal(own!.lots[0].nettoSum, 100_000.0);
    // winner flag
    assert.ok(r.bidders.find((b) => b.isWinner && b.rank === 1));
    // manual override beats auto label
    assert.equal(r.submittedVariantLabel, 'abgegeben (manuell)');
  });

  test('falls back to auto submitted_variant_label when no manual override', async () => {
    const { getSubmissionsergebnis } = await import('../src/lib/preisanfrage.js');
    mockFetch(async () =>
      jsonResponse({ ...upstreamErgebnis(), variant_analysis: { submitted_variant_label: 'mittlere', manual_variant_label: null } }),
    );
    const r = await getSubmissionsergebnis(5, 1001);
    assert.equal(r.submittedVariantLabel, 'mittlere');
  });

  test('empty bidders (unparsed) passes through cleanly', async () => {
    const { getSubmissionsergebnis } = await import('../src/lib/preisanfrage.js');
    mockFetch(async () =>
      jsonResponse({
        project_id: 1003, parsed_at: null, teilnehmer_count: 0, our_rank: null,
        winner_name: null, winner_sum: null, winner_netto_sum: null, winner_brutto_sum: null,
        parse_confidence: null, bidders: [], variant_analysis: null,
      }),
    );
    const r = await getSubmissionsergebnis(5, 1003);
    assert.equal(r.teilnehmerCount, 0);
    assert.equal(r.bidders.length, 0);
    assert.equal(r.submittedVariantLabel, null);
  });

  test('result is cached within the TTL window', async () => {
    const { getSubmissionsergebnis } = await import('../src/lib/preisanfrage.js');
    let calls = 0;
    mockFetch(async () => {
      calls++;
      return jsonResponse(upstreamErgebnis());
    });
    await getSubmissionsergebnis(5, 1001);
    await getSubmissionsergebnis(5, 1001);
    assert.equal(calls, 1, 'second call served from cache');
    // Different (company,project) key → separate fetch.
    await getSubmissionsergebnis(6, 2001);
    assert.equal(calls, 2);
  });

  test('network error surfaces as PreisanfrageError 502', async () => {
    const { getSubmissionsergebnis, PreisanfrageError } = await import('../src/lib/preisanfrage.js');
    mockFetch(async () => {
      throw new Error('ECONNREFUSED');
    });
    await assert.rejects(
      () => getSubmissionsergebnis(5, 1001),
      (e: unknown) => e instanceof PreisanfrageError && e.status === 502,
    );
  });
});

// ─── client: getSubmissionskarte ──────────────────────────────────────

describe('preisanfrage client — getSubmissionskarte', () => {
  test('calls /combined and maps pins + gewerke + counts', async () => {
    const { getSubmissionskarte } = await import('../src/lib/preisanfrage.js');
    let seenUrl = '';
    mockFetch(async (url) => {
      seenUrl = String(url);
      return jsonResponse(upstreamKarte());
    });
    const r = await getSubmissionskarte();
    assert.match(seenUrl, /\/api\/submissionskarte\/combined$/);
    assert.equal(r.pins.length, 2);
    assert.deepEqual(r.gewerke, ['GaLaBau', 'Leitungsbau']);
    assert.equal(r.projectsWithoutLocation, 4);
    assert.equal(r.projectsWithoutParse, 1);
    const p0 = r.pins[0];
    assert.equal(p0.projectId, 1001);
    assert.equal(p0.anschriftPlzOrt, '66386 Sankt Ingbert');
    assert.equal(p0.winnerNettoSum, 182_400.0);
    assert.equal(p0.preislage, 'mittel');
    assert.equal(p0.companyName, 'Gesellchen GmbH');
    assert.equal(typeof p0.latitude, 'number');
    // unparsed pin keeps coords but null result fields
    const p1 = r.pins[1];
    assert.equal(p1.vergabeStatus, 'nicht_geparst');
    assert.equal(p1.ourRank, null);
    assert.equal(typeof p1.longitude, 'number');
  });

  test('is cached within the TTL window', async () => {
    const { getSubmissionskarte } = await import('../src/lib/preisanfrage.js');
    let calls = 0;
    mockFetch(async () => {
      calls++;
      return jsonResponse(upstreamKarte());
    });
    await getSubmissionskarte();
    await getSubmissionskarte();
    assert.equal(calls, 1);
  });
});

// ─── mock fixtures ────────────────────────────────────────────────────

describe('preisanfrage MOCK fixtures', () => {
  function withMock(fn: () => Promise<void>) {
    return async () => {
      process.env.PREISANFRAGE_MOCK = 'fixture';
      mockFetch(async () => {
        throw new Error('network must not be called in mock mode');
      });
      try {
        _clearPreisanfrageCache();
        await fn();
      } finally {
        delete process.env.PREISANFRAGE_MOCK;
      }
    };
  }

  test('getSubmissionsergebnis returns bidder ranking for project 1001', withMock(async () => {
    const { getSubmissionsergebnis } = await import('../src/lib/preisanfrage.js');
    const r = await getSubmissionsergebnis(5, 1001);
    assert.equal(r.ourRank, 2);
    assert.equal(r.teilnehmerCount, 5);
    assert.equal(r.bidders.length, 5);
    assert.ok(r.bidders.some((b) => b.isOwnBid && b.bidderName === 'Gesellchen GmbH'));
    assert.ok(r.bidders.some((b) => b.isWinner));
    assert.equal(r.submittedVariantLabel, 'günstigste');
  }));

  test('getSubmissionsergebnis returns empty "noch nicht eingelesen" shape for unparsed project', withMock(async () => {
    const { getSubmissionsergebnis } = await import('../src/lib/preisanfrage.js');
    const r = await getSubmissionsergebnis(5, 1003);
    assert.equal(r.teilnehmerCount, 0);
    assert.equal(r.bidders.length, 0);
    assert.equal(r.parsedAt, null);
  }));

  test('getSubmissionskarte returns geo pins spanning 3 Gewerke with finite coords', withMock(async () => {
    const { getSubmissionskarte } = await import('../src/lib/preisanfrage.js');
    const r = await getSubmissionskarte();
    assert.ok(r.pins.length >= 5, 'expect a populated map');
    assert.deepEqual(r.gewerke, ['Elektro', 'GaLaBau', 'Leitungsbau']);
    for (const p of r.pins) {
      assert.ok(Number.isFinite(p.latitude) && Number.isFinite(p.longitude), `pin ${p.projectId} has coords`);
    }
    // at least one not-yet-parsed pin so the UI exercises that state
    assert.ok(r.pins.some((p) => p.vergabeStatus === 'nicht_geparst' && p.ourRank === null));
    // at least one win (zuschlag) and one loss (verloren)
    assert.ok(r.pins.some((p) => p.vergabeStatus === 'zuschlag'));
    assert.ok(r.pins.some((p) => p.vergabeStatus === 'verloren'));
  }));
});

// ─── routes ───────────────────────────────────────────────────────────

describe('route — GET /firmen/:kind/:id/projects/:pid/submissionsergebnis', () => {
  test('401 without auth cookie', async () => {
    const res = await app.request('/api/firmen/managed/5/projects/1001/submissionsergebnis');
    assert.equal(res.status, 401);
  });

  test('managed firma → 200 with parsed bidder ranking', async () => {
    const u = await seedUser();
    mockFetch(async (url) => {
      assert.match(String(url), /\/api\/submissionsergebnis\/1001\?company_id=5$/);
      return jsonResponse(upstreamErgebnis());
    });
    const res = await app.request('/api/firmen/managed/5/projects/1001/submissionsergebnis', {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ourRank, 2);
    assert.equal(body.parsed, true);
    assert.equal(body.isMock, false);
    assert.equal(body.bidders.length, 3);
  });

  test('external firma → 404 submissionsergebnis_managed_only (no upstream call)', async () => {
    const u = await seedUser();
    mockFetch(async () => {
      throw new Error('upstream must not be called for external kind');
    });
    const res = await app.request('/api/firmen/external/101/projects/4001/submissionsergebnis', {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'submissionsergebnis_managed_only');
  });

  test('local firma → 404 submissionsergebnis_managed_only', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen/local/abc123/projects/xyz/submissionsergebnis', {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'submissionsergebnis_managed_only');
  });

  test('invalid numeric ids → 400', async () => {
    const u = await seedUser();
    const res = await app.request('/api/firmen/managed/0/projects/-1/submissionsergebnis', {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 400);
  });

  test('upstream 503 maps to 503 upstream_error', async () => {
    const u = await seedUser();
    mockFetch(async () => jsonResponse({ detail: 'down' }, 503));
    const res = await app.request('/api/firmen/managed/5/projects/1001/submissionsergebnis', {
      headers: { Cookie: u.cookie },
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error, 'upstream_error');
  });
});

describe('route — GET /submissionskarte', () => {
  test('401 without auth cookie', async () => {
    const res = await app.request('/api/submissionskarte');
    assert.equal(res.status, 401);
  });

  test('authed → 200 with pins + isMock flag', async () => {
    const u = await seedUser();
    mockFetch(async (url) => {
      assert.match(String(url), /\/api\/submissionskarte\/combined$/);
      return jsonResponse(upstreamKarte());
    });
    const res = await app.request('/api/submissionskarte', { headers: { Cookie: u.cookie } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.pins.length, 2);
    assert.equal(body.isMock, false);
    assert.ok(typeof body.generatedAt === 'string');
  });

  test('integration disabled (no token, mock off) → 503', async () => {
    const u = await seedUser();
    const oldJwt = process.env.PREISANFRAGE_SERVICE_JWT;
    delete process.env.PREISANFRAGE_SERVICE_JWT;
    process.env.PREISANFRAGE_MOCK = '0';
    try {
      const res = await app.request('/api/submissionskarte', { headers: { Cookie: u.cookie } });
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.error, 'integration_disabled');
    } finally {
      process.env.PREISANFRAGE_SERVICE_JWT = oldJwt;
      delete process.env.PREISANFRAGE_MOCK;
    }
  });
});
