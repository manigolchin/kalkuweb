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
  baseNetto,
  solveZielAufschlag,
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

describe('calc.ts — zielAufschlag (Endbetrag-Zielpreis)', () => {
  test('zielAufschlag=0 is a no-op (identical to omitting it)', () => {
    const p = pos({ materialCost: 12, timeMinutes: 30, nuCost: 5, quantity: 7 });
    const withZero = calculatePosition(p, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0 });
    // The default already carries zielAufschlag: 0, so this is the baseline.
    const baseline = calculatePosition(p, DEFAULT_CALC_PARAMS);
    expect(withZero).toEqual(baseline);
  });

  test('missing zielAufschlag (legacy params) is treated as 0', () => {
    const p = pos({ materialCost: 12, timeMinutes: 30, nuCost: 5, quantity: 7 });
    // Strip the field to simulate a pre-feature project loaded without it.
    const legacy = { ...DEFAULT_CALC_PARAMS } as Partial<typeof DEFAULT_CALC_PARAMS>;
    delete legacy.zielAufschlag;
    const r = calculatePosition(p, legacy as typeof DEFAULT_CALC_PARAMS);
    const baseline = calculatePosition(p, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0 });
    expect(r).toEqual(baseline);
  });

  test('ep and gp scale ~linearly by (1 + zielAufschlag)', () => {
    const p = pos({ materialCost: 100, timeMinutes: 45, nuCost: 20, quantity: 4 });
    const base = calculatePosition(p, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0 });
    const up = calculatePosition(p, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0.2 });
    // Each cost component (Geräte/Lohn/Material/NU) is rounded to the cent
    // INDEPENDENTLY so an imported position matches the Excel Vorlage exactly
    // ("Präzision wie angezeigt"). That makes the markup only APPROXIMATELY
    // linear — up to ~½ cent of rounding noise per component on ep, amplified
    // by quantity on gp. Both are well within a fraction of a cent per part.
    expect(Math.abs(up.ep - base.ep * 1.2)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(up.gp - base.gp * 1.2)).toBeLessThanOrEqual(0.2);
  });

  test('every cost component scales — breakdown stays consistent (gpLohn+… == gp)', () => {
    const p = pos({ materialCost: 100, timeMinutes: 45, nuCost: 20, quantity: 4 });
    const r = calculatePosition(p, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0.35 });
    const sum = r.gpLohn + r.gpMaterial + r.gpGeraet + r.gpNu;
    expect(Math.abs(r.gp - sum)).toBeLessThanOrEqual(0.05);
  });

  test('negative zielAufschlag (Nachlass) reduces the price', () => {
    const p = pos({ materialCost: 100, quantity: 10 });
    const base = calculatePosition(p, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0 });
    const discounted = calculatePosition(p, { ...DEFAULT_CALC_PARAMS, zielAufschlag: -0.1 });
    expect(discounted.gp).toBeLessThan(base.gp);
    expect(Math.abs(discounted.gp - base.gp * 0.9)).toBeLessThanOrEqual(0.05);
  });

  test('calcTotals.totalNetto scales by (1 + zielAufschlag)', () => {
    const ps = [
      pos({ id: 'a', materialCost: 50, quantity: 3 }),
      pos({ id: 'b', materialCost: 0, timeMinutes: 90, quantity: 2 }),
      pos({ id: 'c', materialCost: 12, nuCost: 8, quantity: 5 }),
    ];
    const base = calcTotals(ps, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0 });
    const up = calcTotals(ps, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0.25 });
    expect(Math.abs(up.totalNetto - base.totalNetto * 1.25)).toBeLessThanOrEqual(0.1);
  });

  test('baseNetto ignores any existing zielAufschlag (always the raw basis)', () => {
    const ps = [pos({ id: 'a', materialCost: 50, quantity: 3 }), pos({ id: 'b', timeMinutes: 60, quantity: 2 })];
    const a = baseNetto(ps, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0 });
    const b = baseNetto(ps, { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0.5 });
    expect(a).toBe(b);
  });

  test('solveZielAufschlag: applying the solved value hits the target netto', () => {
    const ps = [
      pos({ id: 'a', materialCost: 50, quantity: 3 }),
      pos({ id: 'b', materialCost: 0, timeMinutes: 90, quantity: 2 }),
      pos({ id: 'c', materialCost: 12, nuCost: 8, quantity: 5 }),
    ];
    const target = 24000;
    const z = solveZielAufschlag(ps, DEFAULT_CALC_PARAMS, target);
    const realized = calcTotals(ps, { ...DEFAULT_CALC_PARAMS, zielAufschlag: z }).totalNetto;
    // Per-position rounding → a few cents of drift is expected and acceptable.
    expect(Math.abs(realized - target)).toBeLessThanOrEqual(0.01 * ps.length + 0.02);
  });

  test('solveZielAufschlag: re-targeting works even when a markup is already active', () => {
    const ps = [pos({ id: 'a', materialCost: 80, quantity: 10 }), pos({ id: 'b', timeMinutes: 120, quantity: 4 })];
    // Project already carries a +40% markup; user now wants exactly 30.000.
    const active = { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0.4 };
    const target = 30000;
    const z = solveZielAufschlag(ps, active, target);
    const realized = calcTotals(ps, { ...DEFAULT_CALC_PARAMS, zielAufschlag: z }).totalNetto;
    // Per-component cent-rounding (Excel parity) makes the closed-form solve land
    // within a few cents of the target — a hair more here because we re-solve over
    // an already-active markup, compounding the per-line rounding.
    expect(Math.abs(realized - target)).toBeLessThanOrEqual(0.05 * ps.length + 0.05);
  });

  test('solveZielAufschlag: a target below the basis yields a negative z (Nachlass)', () => {
    const ps = [pos({ id: 'a', materialCost: 100, quantity: 10 })];
    const base = baseNetto(ps, DEFAULT_CALC_PARAMS);
    const z = solveZielAufschlag(ps, DEFAULT_CALC_PARAMS, base * 0.8);
    expect(z).toBeLessThan(0);
    expect(z).toBeGreaterThanOrEqual(-1);
  });

  test('solveZielAufschlag: invalid target (≤0 / NaN) keeps the current zielAufschlag', () => {
    const ps = [pos({ id: 'a', materialCost: 100, quantity: 10 })];
    const params = { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0.15 };
    expect(solveZielAufschlag(ps, params, 0)).toBe(0.15);
    expect(solveZielAufschlag(ps, params, -500)).toBe(0.15);
    expect(solveZielAufschlag(ps, params, Number.NaN)).toBe(0.15);
  });

  test('solveZielAufschlag: empty / zero-basis project returns 0', () => {
    expect(solveZielAufschlag([], DEFAULT_CALC_PARAMS, 24000)).toBe(0);
    const headerOnly = [pos({ id: 'h', isHeader: true, materialCost: 9999, quantity: 9 })];
    expect(solveZielAufschlag(headerOnly, DEFAULT_CALC_PARAMS, 24000)).toBe(0);
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

describe('calc.ts — gpOverride (col F) pins the GESAMTPREIS', () => {
  test('GP = gpOverride; EP = GP/Menge; component rebuild bypassed', () => {
    const params = { ...DEFAULT_CALC_PARAMS, materialZuschlag: 0, zeitabzug: 0 };
    // components would give gp = 3×100 = 300; the pinned col-F GP (420) wins.
    const r = calculatePosition(pos({ materialCost: 100, quantity: 3, gpOverride: 420 }), params);
    expect(r.gp).toBe(420);
    expect(r.ep).toBe(140);
  });
});

describe('calc.ts — EP Stoffe/NU VK overrides (cols AJ/AK) win flat', () => {
  test('materialEp / nuEp override the Zuschlag model', () => {
    const params = { ...DEFAULT_CALC_PARAMS, materialZuschlag: 0.5, nuZuschlag: 0.5, verrechnungslohn: 0, geraeteStundensatz: 0, zeitabzug: 0 };
    // default would be 100×1.5=150 / 80×1.5=120; the hand-typed VK wins.
    const r = calculatePosition(pos({ materialCost: 100, nuCost: 80, quantity: 1, materialEp: 200, nuEp: 90 }), params);
    expect(r.epMaterial).toBe(200);
    expect(r.epNu).toBe(90);
  });
});

describe('calc.ts — Bedarfsposition excluded from the Angebotssumme', () => {
  const params = { ...DEFAULT_CALC_PARAMS, materialZuschlag: 0, nuZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, zeitabzug: 0, mwst: 0 };
  test('a bedarfsposition is priced but NOT summed into totalNetto (matches Excel)', () => {
    const normal = pos({ materialCost: 100, quantity: 1 });
    const bedarf = pos({ materialCost: 500, quantity: 1, bedarfsposition: true });
    expect(calcTotals([normal, bedarf], params).totalNetto).toBe(100);
    // …but it still computes a price so the table can show it + the user can fold it in.
    expect(calculatePosition(bedarf, params).gp).toBe(500);
  });
});

describe('calc.ts — Lohn-Faktor W re-prices with Verrechnungslohn', () => {
  // W (Vorlage col AB = Zeit/60 × Verrechnungslohn × W) keeps imported labor
  // LIVE: changing the global Verrechnungslohn re-prices it like Excel, instead
  // of freezing it to the imported amount.
  const base = { ...DEFAULT_CALC_PARAMS, verrechnungslohn: 50, materialZuschlag: 0, nuZuschlag: 0, geraeteStundensatz: 0, zeitabzug: 0, zielAufschlag: 0 };

  test('a row with lohnFaktor scales its Lohn when Verrechnungslohn changes', () => {
    const p = pos({ timeMinutes: 60, materialCost: 0, nuCost: 0, quantity: 1, lohnFaktor: 1.5 });
    expect(calculatePosition(p, base).epLohn).toBe(75);                       // 60/60 × 50 × 1.5
    expect(calculatePosition(p, { ...base, verrechnungslohn: 100 }).epLohn).toBe(150); // doubles, W kept
  });

  test('lohnFaktor defaults to 1 (plain Zeit × Verrechnungslohn)', () => {
    expect(calculatePosition(pos({ timeMinutes: 60 }), base).epLohn).toBe(50);
  });

  test('a flat lohnEp override stays fixed when Verrechnungslohn changes', () => {
    const p = pos({ timeMinutes: 60, lohnEp: 84.5 });
    expect(calculatePosition(p, base).epLohn).toBe(84.5);
    expect(calculatePosition(p, { ...base, verrechnungslohn: 100 }).epLohn).toBe(84.5);
  });
});

describe('calc.ts — rounding stays exact at large magnitudes (regression)', () => {
  // The cent-rounding nudge must be a FIXED epsilon, not magnitude-relative.
  // The previous `x · 1e-9` reached half a cent once x = n·100 ≥ 5e8, so it
  // silently inflated every value ≥ 5,000,000 € by a cent or more
  // (49.999.999,99 € → 50.000.000,04 €). These pin the contract.
  const onlyMaterial = {
    ...DEFAULT_CALC_PARAMS,
    materialZuschlag: 0, nuZuschlag: 0, verrechnungslohn: 0,
    geraeteStundensatz: 0, zeitabzug: 0, zielAufschlag: 0, mwst: 0,
  };

  for (const v of [5_000_000.0, 8_234_567.89, 49_999_999.99, 100_000_000.01, 1_234_567.89]) {
    test(`a ${v} € line totals to exactly ${v} (no cent inflation)`, () => {
      const totals = calcTotals([pos({ materialCost: v, quantity: 1 })], onlyMaterial);
      expect(totals.totalNetto).toBe(v);
      expect(totals.totalBrutto).toBe(v); // mwst = 0
    });
  }

  test('50 large lines sum without per-line cent drift', () => {
    const lines = Array.from({ length: 50 }, () => pos({ materialCost: 999_999.99, quantity: 1 }));
    expect(calcTotals(lines, onlyMaterial).totalNetto).toBe(49_999_999.5);
  });

  test('half-cent boundary STILL rounds away from zero (nudge not lost)', () => {
    const base = { ...DEFAULT_CALC_PARAMS, nuZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, zielAufschlag: 0 };
    // 1 × (1 + 0.275) = 1.275 → 1.28 (binary FP undershoots to 1.27499…)
    expect(calculatePosition(pos({ materialCost: 1, quantity: 1 }), { ...base, materialZuschlag: 0.275 }).epMaterial).toBe(1.28);
    // 1 × (1 + 1.675) = 2.675 → 2.68
    expect(calculatePosition(pos({ materialCost: 1, quantity: 1 }), { ...base, materialZuschlag: 1.675 }).epMaterial).toBe(2.68);
  });
});
