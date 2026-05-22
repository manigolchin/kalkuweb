/**
 * Round 8 — property-based-style tests for calc.ts.
 *
 * Targets invariants the canonical formula MUST hold, no matter what
 * the inputs are. Pairs with the formula audit in
 * docs/v2_redesign/formula_audit_vs_real_excel.md.
 *
 * If any of these breaks the change is almost certainly wrong.
 */

import { describe, test, expect } from 'vitest';
import {
  DEFAULT_CALC_PARAMS,
  calculatePosition,
  calcTotals,
  recalcAll,
} from '../calc';
import type { CalcParams, Position } from '../types';

function pos(over: Partial<Position> = {}): Position {
  return {
    id: 'p-' + Math.random().toString(36).slice(2),
    oz: '01.01.001',
    shortText: 'Test',
    longText: '',
    hinweisText: '',
    quantity: 10,
    unit: 'm',
    materialCost: 0,
    timeMinutes: 0,
    nuCost: 0,
    isHeader: false,
    sortOrder: 0,
    sectionPath: '01.01',
    epLohn: 0,
    epMaterial: 0,
    epGeraet: 0,
    epNu: 0,
    ep: 0,
    gp: 0,
    visibleToCustomer: true,
    positionType: 'standard',
    ...over,
  };
}

const SAMPLES: Array<Partial<Position>> = [
  { materialCost: 0, timeMinutes: 0, nuCost: 0, quantity: 1 },
  { materialCost: 2, timeMinutes: 0, nuCost: 0, quantity: 100 },        // the Mobilbauzaun case
  { materialCost: 1.49, timeMinutes: 15, nuCost: 0.33, quantity: 12 },
  { materialCost: 99999.99, timeMinutes: 88888, nuCost: 77777, quantity: 5 }, // sentinel-sized
  { materialCost: 0.01, timeMinutes: 0.1, nuCost: 0.01, quantity: 0.5 }, // sub-unit values
  { materialCost: 12345.67, timeMinutes: 60, nuCost: 234.56, quantity: 1 },
];

const PARAM_SAMPLES: Array<Partial<CalcParams>> = [
  {},                                                                       // defaults
  { materialZuschlag: 0.18, nuZuschlag: 0.15, verrechnungslohn: 72.51 },    // Gesellchen overrides
  { materialZuschlag: 0, nuZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0 }, // zero everywhere
  { materialZuschlag: 0.5, nuZuschlag: 0.5, verrechnungslohn: 100, geraeteStundensatz: 5 }, // high
  { zeitabzug: 10 },                                                        // 10% zeitabzug
];

describe('calc.ts — invariants across many input combos', () => {
  for (const params of PARAM_SAMPLES) {
    for (const p of SAMPLES) {
      const desc = `params=${JSON.stringify(params)} pos=${JSON.stringify(p)}`;
      const fullParams = { ...DEFAULT_CALC_PARAMS, ...params };
      const position = pos(p);

      test(`GP equals quantity × EP (algebra, ≤ half-cent per unit drift) — ${desc}`, () => {
        const r = calculatePosition(position, fullParams);
        const expected = Math.round(position.quantity * r.ep * 100) / 100;
        // Two-step rounding: EP is rounded to 2 dp before being multiplied by
        // Menge, so the worst-case drift is half a cent of EP per unit of Q,
        // plus a final 0.005 € from the gp rounding. Documented bound.
        // Floor at 1 cent for sub-unit quantities (where EP rounding can wrap
        // a full cent). Plus tiny FP-error epsilon.
        const tol = Math.max(0.01, Math.abs(position.quantity) * 0.005 + 0.005) + 1e-6;
        expect(Math.abs(r.gp - expected)).toBeLessThanOrEqual(tol);
      });

      test(`EP is the sum of the four cost components (≤ 0.025 € drift) — ${desc}`, () => {
        const r = calculatePosition(position, fullParams);
        const sum = r.epLohn + r.epMaterial + r.epGeraet + r.epNu;
        // Each of the 4 components is independently rounded to 2 dp; worst-case
        // each is off by < 0.005, so the sum can drift up to 4 × 0.005 = 0.02
        // before re-rounding. 0.025 € is a defensible tolerance.
        expect(Math.abs(r.ep - Math.round(sum * 100) / 100)).toBeLessThanOrEqual(0.025);
      });

      test(`all values are finite numbers — ${desc}`, () => {
        const r = calculatePosition(position, fullParams);
        for (const v of [r.ep, r.gp, r.epLohn, r.epMaterial, r.epGeraet, r.epNu, r.hoursTotal]) {
          expect(Number.isFinite(v)).toBe(true);
        }
      });

      test(`re-running on the same inputs returns the same outputs (idempotent) — ${desc}`, () => {
        const r1 = calculatePosition(position, fullParams);
        const r2 = calculatePosition(position, fullParams);
        expect(r1).toEqual(r2);
      });
    }
  }
});

describe('calc.ts — isHeader rows', () => {
  test('isHeader returns all zeros regardless of inputs', () => {
    const r = calculatePosition(
      pos({ isHeader: true, materialCost: 99999, timeMinutes: 99999, nuCost: 99999, quantity: 99999 }),
      DEFAULT_CALC_PARAMS,
    );
    for (const v of [r.ep, r.gp, r.epLohn, r.epMaterial, r.epGeraet, r.epNu, r.hoursTotal]) {
      expect(v).toBe(0);
    }
  });
});

describe('calc.ts — Mobilbauzaun canonical case (formula audit anchor)', () => {
  test('Material=2, Menge=100, defaults → EP=2.24, GP=224', () => {
    const r = calculatePosition(
      pos({ materialCost: 2, timeMinutes: 0, nuCost: 0, quantity: 100, unit: 'm' }),
      DEFAULT_CALC_PARAMS,
    );
    expect(r.ep).toBe(2.24);
    expect(r.gp).toBe(224);
  });

  test('Material=2, Menge=100, Gesellchen overrides (18%/72,51) → EP=2.36, GP=236', () => {
    const params: CalcParams = {
      ...DEFAULT_CALC_PARAMS,
      materialZuschlag: 0.18,
      nuZuschlag: 0.15,
      verrechnungslohn: 72.51,
    };
    const r = calculatePosition(
      pos({ materialCost: 2, timeMinutes: 0, nuCost: 0, quantity: 100, unit: 'm' }),
      params,
    );
    expect(r.epMaterial).toBe(2.36);
    expect(r.ep).toBe(2.36);
    expect(r.gp).toBe(236);
  });

  test('Bug magnitude: Material=2, Menge=100000 → GP=224000 (NOT a bug, the data was wrong)', () => {
    const r = calculatePosition(
      pos({ materialCost: 2, timeMinutes: 0, nuCost: 0, quantity: 100000 }),
      DEFAULT_CALC_PARAMS,
    );
    expect(r.gp).toBe(224000);
  });
});

describe('calc.ts — recalcAll + calcTotals', () => {
  test('recalcAll preserves all non-calculated fields and overwrites only ep/gp components', () => {
    const ps = [pos({ id: 'a', materialCost: 5, quantity: 2 }), pos({ id: 'b', materialCost: 10, quantity: 3 })];
    const out = recalcAll(ps, DEFAULT_CALC_PARAMS);
    expect(out.length).toBe(2);
    for (let i = 0; i < ps.length; i++) {
      expect(out[i].id).toBe(ps[i].id);
      expect(out[i].oz).toBe(ps[i].oz);
      expect(out[i].materialCost).toBe(ps[i].materialCost); // input untouched
      expect(out[i].ep).toBeGreaterThan(0);                  // calculated
      expect(out[i].gp).toBe(Math.round(ps[i].quantity * out[i].ep * 100) / 100);
    }
  });

  test('calcTotals: sum of position GPs equals totalNetto', () => {
    const ps = [
      pos({ id: 'a', materialCost: 5, quantity: 2 }),
      pos({ id: 'b', materialCost: 10, quantity: 3 }),
      pos({ id: 'c', materialCost: 0, timeMinutes: 30, quantity: 1 }),
    ];
    const recalc = recalcAll(ps, DEFAULT_CALC_PARAMS);
    const sumGp = Math.round(recalc.reduce((s, p) => s + p.gp, 0) * 100) / 100;
    const totals = calcTotals(ps, DEFAULT_CALC_PARAMS);
    // calcTotals re-runs calculatePosition internally so may differ slightly
    // from a sum-of-rounded-recalcAll values; check within rounding tolerance.
    expect(Math.abs(totals.totalNetto - sumGp)).toBeLessThanOrEqual(0.05);
  });

  test('calcTotals: totalMwst = totalNetto × params.mwst (exact within rounding)', () => {
    const ps = [pos({ materialCost: 100, quantity: 10 })];
    const totals = calcTotals(ps, DEFAULT_CALC_PARAMS);
    const expected = Math.round(totals.totalNetto * 0.19 * 100) / 100;
    expect(totals.totalMwst).toBe(expected);
    expect(totals.totalBrutto).toBe(Math.round((totals.totalNetto + expected) * 100) / 100);
  });

  test('calcTotals: header rows do NOT contribute to totals', () => {
    const ps = [
      pos({ id: 'h', isHeader: true, materialCost: 99999, quantity: 9999 }), // would add 99 M+ if counted
      pos({ id: 'a', materialCost: 100, quantity: 1 }),
    ];
    const totals = calcTotals(ps, DEFAULT_CALC_PARAMS);
    expect(totals.totalNetto).toBeLessThan(10_000);
  });

  test('calcTotals: visibleIds filter constrains visibleNetto', () => {
    const ps = [
      pos({ id: 'a', materialCost: 50, quantity: 1 }),  // ~ 56 €
      pos({ id: 'b', materialCost: 100, quantity: 2 }), // ~ 224 €
    ];
    const totals = calcTotals(ps, DEFAULT_CALC_PARAMS, new Set(['a']));
    expect(totals.visibleNetto).toBeLessThan(totals.totalNetto);
    expect(totals.totalNetto).toBeGreaterThan(0);
  });
});

describe('calc.ts — zeitabzug adjustment', () => {
  test('zeitabzug=10 makes adjusted minutes 110% of input minutes', () => {
    const baseParams = { ...DEFAULT_CALC_PARAMS, zeitabzug: 0 };
    const baseR = calculatePosition(pos({ timeMinutes: 60, materialCost: 0, nuCost: 0 }), baseParams);
    const adjParams = { ...DEFAULT_CALC_PARAMS, zeitabzug: 10 };
    const adjR = calculatePosition(pos({ timeMinutes: 60, materialCost: 0, nuCost: 0 }), adjParams);
    // 10% zeitabzug → adjusted minutes are 66 (10% higher).
    // EP_lohn scales linearly with adjusted minutes.
    expect(Math.abs(adjR.epLohn - baseR.epLohn * 1.1)).toBeLessThanOrEqual(0.05);
  });
});
