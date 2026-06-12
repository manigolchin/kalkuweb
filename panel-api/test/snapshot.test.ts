import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recomputePositions,
  buildShareSnapshot,
  snapshotHash,
  diffSnapshots,
  computeShareSummary,
} from '../src/lib/snapshot.js';
import type { CalcParams, Position, ShareSnapshot } from '../src/schema.js';

const DEFAULT_PARAMS: CalcParams = {
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
  zielAufschlag: 0,
};

function pos(
  overrides: Partial<Position> & Pick<Position, 'id'> & { quantity?: number; materialCost?: number; timeMinutes?: number; nuCost?: number },
): Position {
  return {
    id: overrides.id,
    oz: '',
    shortText: '',
    longText: '',
    hinweisText: '',
    quantity: 0,
    unit: 'Stk',
    materialCost: 0,
    timeMinutes: 0,
    nuCost: 0,
    isHeader: false,
    sortOrder: 0,
    sectionPath: '',
    epLohn: 0,
    epMaterial: 0,
    epGeraet: 0,
    epNu: 0,
    ep: 0,
    gp: 0,
    visibleToCustomer: true,
    ...overrides,
  };
}

test('recomputePositions — Fliesen 50 m² × material 125 → ep 140, gp 7000', () => {
  // Catches the prior agent's "8.963,08 €" arithmetic claim — real brutto is 8.330 €.
  const [p] = recomputePositions(
    [pos({ id: 'p1', oz: '01', quantity: 50, materialCost: 125, unit: 'm²' })],
    DEFAULT_PARAMS,
  );
  assert.equal(p.epMaterial, 140);
  assert.equal(p.ep, 140);
  assert.equal(p.gp, 7000);
  // Brutto sanity:
  const brutto = p.gp * (1 + DEFAULT_PARAMS.mwst);
  assert.equal(Math.round(brutto * 100) / 100, 8330);
});

test('recomputePositions — Sanitärmontage with time 480 min', () => {
  const [p] = recomputePositions(
    [pos({ id: 'p2', oz: '01.02', quantity: 1, materialCost: 800, timeMinutes: 480, unit: 'psch' })],
    DEFAULT_PARAMS,
  );
  // adjustedTime = 480 (zeitabzug=0)
  // epLohn = 480/60 * 49.9 = 8 * 49.9 = 399.20
  // epMaterial = 800 * 1.12 = 896.00
  // epGeraet = 480/60 * 0.5 = 4.00
  // ep = 1299.20, gp = 1299.20
  assert.equal(p.epLohn, 399.2);
  assert.equal(p.epMaterial, 896);
  assert.equal(p.epGeraet, 4);
  assert.equal(p.ep, 1299.2);
  assert.equal(p.gp, 1299.2);
});

test('recomputePositions — header rows zero out derived values', () => {
  const [p] = recomputePositions(
    [pos({ id: 'h1', isHeader: true, shortText: 'Bad EG', materialCost: 999, quantity: 999 })],
    DEFAULT_PARAMS,
  );
  assert.equal(p.ep, 0);
  assert.equal(p.gp, 0);
  // Header keeps non-derived fields
  assert.equal(p.shortText, 'Bad EG');
  assert.equal(p.isHeader, true);
});

test('recomputePositions — zero quantity yields zero gp but valid ep', () => {
  const [p] = recomputePositions(
    [pos({ id: 'z', quantity: 0, materialCost: 100 })],
    DEFAULT_PARAMS,
  );
  assert.equal(p.gp, 0);
  assert.equal(p.epMaterial, 112);
});

test('recomputePositions — negative quantity (credit line) propagates sign', () => {
  const [p] = recomputePositions(
    [pos({ id: 'cred', quantity: -5, materialCost: 100 })],
    DEFAULT_PARAMS,
  );
  assert.equal(p.epMaterial, 112);
  assert.equal(p.gp, -560);
});

test('buildShareSnapshot filters to visiblePositionIds only', () => {
  const positions = [
    pos({ id: 'visible', quantity: 1, materialCost: 100 }),
    pos({ id: 'hidden', quantity: 999, materialCost: 999 }),
  ];
  const snap = buildShareSnapshot(
    {
      name: 'Test',
      client: '',
      service: '',
      tenderNumber: '',
      deadline: '',
      calcParams: DEFAULT_PARAMS,
    },
    positions,
    ['visible'],
    1,
  );
  assert.equal(snap.positions.length, 1);
  assert.equal(snap.positions[0].id, 'visible');
});

test('buildShareSnapshot recomputes ep/gp from the inputs (not from client-sent values)', () => {
  const positions = [
    pos({
      id: 'p',
      quantity: 50,
      materialCost: 125,
      // Buggy/malicious client tries to pin these wrong values:
      ep: 99999,
      gp: 99999,
    }),
  ];
  const snap = buildShareSnapshot(
    {
      name: 'X',
      client: '',
      service: '',
      tenderNumber: '',
      deadline: '',
      calcParams: DEFAULT_PARAMS,
    },
    positions,
    ['p'],
    1,
  );
  assert.equal(snap.positions[0].ep, 140); // server-recomputed
  assert.equal(snap.positions[0].gp, 7000);
});

test('snapshotHash is deterministic for identical input', () => {
  const mk = () =>
    buildShareSnapshot(
      {
        name: 'X',
        client: 'Y',
        service: '',
        tenderNumber: '',
        deadline: '',
        calcParams: DEFAULT_PARAMS,
      },
      [pos({ id: 'p', quantity: 1, materialCost: 100 })],
      ['p'],
      1,
    );
  const a = mk();
  const b = mk();
  // Snapshots differ by snapshottedAt (Date.now); strip and compare hash of the
  // logically-stable parts. Use the same hash function on a normalized object.
  const norm = (s: ShareSnapshot) => ({ ...s, snapshottedAt: 'X' });
  assert.equal(snapshotHash(norm(a)), snapshotHash(norm(b)));
});

test('snapshotHash changes when any field differs', () => {
  const base = buildShareSnapshot(
    {
      name: 'X',
      client: 'Y',
      service: '',
      tenderNumber: '',
      deadline: '',
      calcParams: DEFAULT_PARAMS,
    },
    [pos({ id: 'p', quantity: 1, materialCost: 100 })],
    ['p'],
    1,
  );
  const mutated = JSON.parse(JSON.stringify(base)) as ShareSnapshot;
  mutated.positions[0].gp += 0.01;
  assert.notEqual(snapshotHash(base), snapshotHash(mutated));
});

test('diffSnapshots — added/removed/changed detection', () => {
  const before: ShareSnapshot = {
    snapshottedAt: '2026-01-01T00:00:00.000Z',
    projectVersionNumber: 1,
    project: { name: 'P', client: '', service: '', tenderNumber: '', deadline: '', mwst: 0.19 },
    positions: [
      { id: 'a', oz: '01', shortText: 'A', longText: '', quantity: 10, unit: 'm', isHeader: false, sortOrder: 1, ep: 10, gp: 100 },
      { id: 'b', oz: '02', shortText: 'B', longText: '', quantity: 5, unit: 'm', isHeader: false, sortOrder: 2, ep: 20, gp: 100 },
    ],
  };
  const after: ShareSnapshot = {
    snapshottedAt: '2026-01-02T00:00:00.000Z',
    projectVersionNumber: 2,
    project: { name: 'P', client: '', service: '', tenderNumber: '', deadline: '', mwst: 0.19 },
    positions: [
      { id: 'a', oz: '01', shortText: 'A', longText: '', quantity: 12, unit: 'm', isHeader: false, sortOrder: 1, ep: 10, gp: 120 }, // qty + gp changed
      { id: 'c', oz: '03', shortText: 'C', longText: '', quantity: 1, unit: 'Stk', isHeader: false, sortOrder: 3, ep: 50, gp: 50 }, // new
      // b removed
    ],
  };
  const d = diffSnapshots(before, after);
  assert.equal(d.added.length, 1);
  assert.equal(d.added[0].id, 'c');
  assert.equal(d.removed.length, 1);
  assert.equal(d.removed[0].id, 'b');
  assert.equal(d.changed.length, 1);
  assert.equal(d.changed[0].after.id, 'a');
  assert.deepEqual(d.changed[0].fields.sort(), ['gp', 'quantity']);
  assert.equal(d.oldTotalNetto, 200); // 100 + 100
  assert.equal(d.newTotalNetto, 170); // 120 + 50
  assert.equal(d.delta, -30);
});

test('diffSnapshots — identical inputs report no changes', () => {
  const snap: ShareSnapshot = {
    snapshottedAt: '2026-01-01T00:00:00.000Z',
    projectVersionNumber: 1,
    project: { name: 'P', client: '', service: '', tenderNumber: '', deadline: '', mwst: 0.19 },
    positions: [
      { id: 'a', oz: '01', shortText: 'A', longText: '', quantity: 10, unit: 'm', isHeader: false, sortOrder: 1, ep: 10, gp: 100 },
    ],
  };
  const d = diffSnapshots(snap, snap);
  assert.equal(d.added.length, 0);
  assert.equal(d.removed.length, 0);
  assert.equal(d.changed.length, 0);
  assert.equal(d.unchanged.length, 1);
  assert.equal(d.delta, 0);
});

// ── Regression: computeShareSummary must never emit a non-finite number ──
// A malformed import can set geraeteZuschlagPct to -100 % (or worse), making the
// Geräte EINKAUF divisor (1 + gPct) ≤ 0. That divided by zero → Infinity → the
// customer share's Überschuss serialised to null (Infinity is invalid JSON).
test('computeShareSummary: geraeteZuschlagPct = -1 (-100%) stays finite (no /0 Infinity)', () => {
  const positions: Position[] = [pos({ id: 'g1', quantity: 2, geraeteEp: 50, gp: 100 })];
  const summary = computeShareSummary(positions, { ...DEFAULT_PARAMS, geraeteZuschlagPct: -1 });
  const bad: string[] = [];
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) bad.push(`${path}=${v}`);
    } else if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) walk(val, path ? `${path}.${k}` : k);
    }
  };
  walk(summary, '');
  assert.deepEqual(bad, [], `non-finite summary fields: ${bad.join(', ')}`);
  // Degraded contract: invalid divisor → Geräte EINKAUF falls back to VERKAUF (no margin).
  assert.ok(Number.isFinite(summary.ueberschuss));
  assert.ok(Number.isFinite(summary.costTypes.geraete.ek));
});

test('computeShareSummary: lohnFaktor W scales VERKAUF and EINKAUF Lohn together', () => {
  // 60 min × lohnFaktor 2: VK = 60/60 × VL(50) × 2 = 100; EK = 60/60 × ML(30) × 2 = 60.
  // gp must equal the VK so the netto-reconciliation is a no-op.
  const positions: Position[] = [pos({ id: 'l1', quantity: 1, timeMinutes: 60, lohnFaktor: 2, gp: 100 })];
  const summary = computeShareSummary(positions, {
    ...DEFAULT_PARAMS, verrechnungslohn: 50, mittellohn: 30,
    materialZuschlag: 0, nuZuschlag: 0, geraeteStundensatz: 0, zeitabzug: 0,
  });
  assert.equal(summary.costTypes.lohn.vk, 100);
  assert.equal(summary.costTypes.lohn.ek, 60);
});

test('computeShareSummary: normal geraeteZuschlagPct splits Geräte EINKAUF below VERKAUF', () => {
  const positions: Position[] = [pos({ id: 'g1', quantity: 1, geraeteEp: 110, gp: 110 })];
  const summary = computeShareSummary(positions, {
    ...DEFAULT_PARAMS, geraeteZuschlagPct: 0.1, materialZuschlag: 0, nuZuschlag: 0,
  });
  // EINKAUF Geräte = VERKAUF / 1.1 → 110 / 1.1 = 100.
  assert.ok(summary.costTypes.geraete.ek < summary.costTypes.geraete.vk);
  assert.ok(Math.abs(summary.costTypes.geraete.ek - 100) < 0.01);
});
