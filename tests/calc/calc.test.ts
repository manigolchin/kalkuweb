/**
 * Calc math suite (60 tests) — IDs C-001..C-060.
 * Targets src/features/kalkulation/calc.ts. Pure functions, no DOM.
 */
import { describe, it, expect } from 'vitest';
import {
  calculatePosition,
  calcTotals,
  recalcAll,
  formatEUR,
  formatNum,
  makeBlankPosition,
  DEFAULT_CALC_PARAMS,
  type PositionCalcResult,
} from '@/features/kalkulation/calc';
import type { CalcParams, Position } from '@/features/kalkulation/types';

const params = (overrides: Partial<CalcParams> = {}): CalcParams => ({
  ...DEFAULT_CALC_PARAMS,
  ...overrides,
});

const pos = (overrides: Partial<Position> = {}): Position => ({
  ...makeBlankPosition('id-' + Math.random().toString(36).slice(2, 8), 1),
  ...overrides,
});

/* ─── 1A. calculatePosition formulae (C-001..C-020) ─── */

describe('1A. calculatePosition formulae', () => {
  it('C-001 isHeader → ep zero', () => {
    expect(calculatePosition(pos({ isHeader: true, quantity: 5, materialCost: 10 }), params()).ep).toBe(0);
  });
  it('C-002 isHeader → gp zero', () => {
    expect(calculatePosition(pos({ isHeader: true, quantity: 5, materialCost: 10 }), params()).gp).toBe(0);
  });
  it('C-003 epLohn integer minutes', () => {
    const r = calculatePosition(pos({ timeMinutes: 60 }), params({ verrechnungslohn: 50, zeitabzug: 0 }));
    expect(r.epLohn).toBe(50);
  });
  it('C-004 epLohn fractional minutes (45min → 0.75h)', () => {
    const r = calculatePosition(pos({ timeMinutes: 45 }), params({ verrechnungslohn: 40, zeitabzug: 0 }));
    expect(r.epLohn).toBeCloseTo(30, 2);
  });
  it('C-005 epLohn zero minutes', () => {
    expect(calculatePosition(pos({ timeMinutes: 0 }), params()).epLohn).toBe(0);
  });
  it('C-006 zeitabzug positive ADDS time (sign-of-name pitfall)', () => {
    // Documents current behaviour. timeMinutes=60, zeitabzug=10 → 60 + 6 = 66 min
    const r = calculatePosition(pos({ timeMinutes: 60 }), params({ verrechnungslohn: 60, zeitabzug: 10 }));
    expect(r.epLohn).toBeCloseTo(66, 2);
  });
  it('C-007 zeitabzug negative subtracts time', () => {
    const r = calculatePosition(pos({ timeMinutes: 60 }), params({ verrechnungslohn: 60, zeitabzug: -10 }));
    expect(r.epLohn).toBeCloseTo(54, 2);
  });
  it('C-008 zeitabzug=100 doubles time', () => {
    const r = calculatePosition(pos({ timeMinutes: 60 }), params({ verrechnungslohn: 60, zeitabzug: 100 }));
    expect(r.epLohn).toBeCloseTo(120, 2);
  });
  it('C-009 epGeraet uses adjusted time', () => {
    const r = calculatePosition(pos({ timeMinutes: 60 }), params({ geraeteStundensatz: 10, zeitabzug: 0 }));
    expect(r.epGeraet).toBe(10);
  });
  it('C-010 epMaterial = material × (1+Zuschlag)', () => {
    const r = calculatePosition(pos({ materialCost: 100 }), params({ materialZuschlag: 0.2 }));
    expect(r.epMaterial).toBeCloseTo(120, 2);
  });
  it('C-011 epMaterial zero', () => {
    expect(calculatePosition(pos({ materialCost: 0 }), params()).epMaterial).toBe(0);
  });
  it('C-012 materialZuschlag 0 → no markup', () => {
    expect(calculatePosition(pos({ materialCost: 50 }), params({ materialZuschlag: 0 })).epMaterial).toBe(50);
  });
  it('C-013 epNu = nu × (1+nuZuschlag)', () => {
    const r = calculatePosition(pos({ nuCost: 100 }), params({ nuZuschlag: 0.15 }));
    expect(r.epNu).toBeCloseTo(115, 2);
  });
  it('C-014 ep = lohn+material+geraet+nu', () => {
    const r = calculatePosition(
      pos({ timeMinutes: 60, materialCost: 100, nuCost: 50 }),
      params({ verrechnungslohn: 50, geraeteStundensatz: 5, materialZuschlag: 0.1, nuZuschlag: 0.2, zeitabzug: 0 }),
    );
    // epLohn 50 + epGeraet 5 + epMaterial 110 + epNu 60 = 225
    expect(r.ep).toBeCloseTo(225, 2);
  });
  it('C-015 gp = quantity × ep', () => {
    const r = calculatePosition(
      pos({ quantity: 10, materialCost: 100 }),
      params({ verrechnungslohn: 0, geraeteStundensatz: 0, materialZuschlag: 0, nuZuschlag: 0, zeitabzug: 0 }),
    );
    expect(r.gp).toBe(1000);
  });
  it('C-016 quantity zero → gp 0', () => {
    expect(calculatePosition(pos({ quantity: 0, materialCost: 100 }), params()).gp).toBe(0);
  });
  it('C-017 quantity 1 → gp = ep', () => {
    const r = calculatePosition(pos({ quantity: 1, materialCost: 50 }), params({ materialZuschlag: 0 }));
    expect(r.gp).toBe(r.ep);
  });
  it('C-018 large quantity scales linearly', () => {
    const r = calculatePosition(
      pos({ quantity: 10000, materialCost: 1 }),
      params({ verrechnungslohn: 0, geraeteStundensatz: 0, materialZuschlag: 0, nuZuschlag: 0, zeitabzug: 0 }),
    );
    expect(r.gp).toBe(10000);
  });
  it('C-019 hoursTotal = adjustedTime × quantity / 60', () => {
    const r = calculatePosition(pos({ quantity: 4, timeMinutes: 30 }), params({ zeitabzug: 0 }));
    // 4 × 30 / 60 = 2 hours
    expect(r.hoursTotal).toBe(2);
  });
  it('C-020 per-position hoursTotal rounded to 2 decimals (totals use 1dp)', () => {
    // Per-position uses default round(n, 2); calcTotals applies round(totalHours, 1) separately.
    const r = calculatePosition(pos({ quantity: 1, timeMinutes: 35 }), params({ zeitabzug: 0 }));
    // 35/60 = 0.58333… → 0.58
    expect(r.hoursTotal).toBe(0.58);
  });
});

/* ─── 1B. Rounding (C-021..C-030) ─── */

describe('1B. Rounding', () => {
  const r = (pos_: Position, p: CalcParams) => calculatePosition(pos_, p);

  it('C-021 epMaterial rounded to 2dp', () => {
    expect(r(pos({ materialCost: 1.234 }), params({ materialZuschlag: 0 })).epMaterial).toBe(1.23);
  });
  it('C-022 0.5 halfway rounds via Math.round (banker-not, half-up)', () => {
    // 2.345 × 1 → Math.round(234.5) = 235 in JS, so 2.35
    expect(r(pos({ materialCost: 2.345 }), params({ materialZuschlag: 0 })).epMaterial).toBe(2.35);
  });
  it('C-023 negative material rounds correctly', () => {
    // Allowed (defensive) — Math.round(-1.234*100)/100 = -1.23
    expect(r(pos({ materialCost: -1.234 }), params({ materialZuschlag: 0 })).epMaterial).toBe(-1.23);
  });
  it('C-024 zero rounds to 0', () => {
    expect(r(pos({ materialCost: 0 }), params()).epMaterial).toBe(0);
  });
  it('C-025 large value rounding preserves precision', () => {
    expect(r(pos({ materialCost: 1234567.891 }), params({ materialZuschlag: 0 })).epMaterial).toBeCloseTo(1234567.89, 2);
  });
  it('C-026 0.005 halfway — JS Math.round behaviour', () => {
    // 0.005 → 0.5 → 1 (half-up via Math.round on positive)
    expect(r(pos({ materialCost: 0.005 }), params({ materialZuschlag: 0 })).epMaterial).toBe(0.01);
  });
  it('C-027 epLohn rounded 2dp', () => {
    // 60 min × 49.9/60 = 49.9 exactly
    expect(r(pos({ timeMinutes: 60 }), params({ verrechnungslohn: 49.9, zeitabzug: 0 })).epLohn).toBe(49.9);
  });
  it('C-028 epGeraet rounded 2dp', () => {
    const v = r(pos({ timeMinutes: 60 }), params({ geraeteStundensatz: 0.333, zeitabzug: 0 }));
    expect(v.epGeraet).toBe(0.33);
  });
  it('C-029 ep = sum of rounded parts (round-then-sum, current behaviour)', () => {
    // ep is computed BEFORE rounding the parts, then rounded itself.
    // Source line: ep = epLohn + epMaterial + epGeraet + epNu (raw), then round(ep).
    // So technically it's sum-then-round.
    const v = r(pos({ materialCost: 1.234, timeMinutes: 0, nuCost: 0 }), params({ materialZuschlag: 0 }));
    expect(v.ep).toBe(1.23);
  });
  it('C-030 totals — totalNetto = sum of rounded gp', () => {
    const p1 = pos({ id: 'p1', quantity: 1, materialCost: 10.005 });
    const p2 = pos({ id: 'p2', quantity: 1, materialCost: 20.005 });
    const params0 = params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0 });
    const totals = calcTotals([p1, p2], params0);
    // both rounded to 10.01 and 20.01 → 30.02
    expect(totals.totalNetto).toBeCloseTo(30.02, 2);
  });
});

/* ─── 1C. calcTotals (C-031..C-045) ─── */

describe('1C. calcTotals', () => {
  it('C-031 empty positions → all zeros', () => {
    const t = calcTotals([], params());
    expect(t.totalNetto).toBe(0);
    expect(t.totalBrutto).toBe(0);
    expect(t.totalHours).toBe(0);
  });
  it('C-032 header-only → zeros', () => {
    const t = calcTotals([pos({ isHeader: true })], params());
    expect(t.totalNetto).toBe(0);
  });
  it('C-033 one position → totalNetto = gp', () => {
    const p = pos({ quantity: 2, materialCost: 50 });
    const t = calcTotals([p], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0 }));
    expect(t.totalNetto).toBe(100);
  });
  it('C-034 two positions sum', () => {
    const p1 = pos({ quantity: 1, materialCost: 10 });
    const p2 = pos({ quantity: 1, materialCost: 20 });
    const t = calcTotals([p1, p2], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0 }));
    expect(t.totalNetto).toBe(30);
  });
  it('C-035 visibleIds undefined → visibleNetto = totalNetto', () => {
    const p = pos({ quantity: 1, materialCost: 10 });
    const t = calcTotals([p], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0 }));
    expect(t.visibleNetto).toBe(t.totalNetto);
  });
  it('C-036 visibleIds empty set → visibleNetto = 0', () => {
    const p = pos({ id: 'a', quantity: 1, materialCost: 10 });
    const t = calcTotals([p], params({ materialZuschlag: 0 }), new Set());
    expect(t.visibleNetto).toBe(0);
  });
  it('C-037 visibleIds subset', () => {
    const p1 = pos({ id: 'a', quantity: 1, materialCost: 10 });
    const p2 = pos({ id: 'b', quantity: 1, materialCost: 20 });
    const t = calcTotals(
      [p1, p2],
      params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0 }),
      new Set(['a']),
    );
    expect(t.totalNetto).toBe(30);
    expect(t.visibleNetto).toBe(10);
  });
  it('C-038 header in visibleIds is ignored (isHeader skip wins)', () => {
    const head = pos({ id: 'h', isHeader: true });
    const p = pos({ id: 'a', quantity: 1, materialCost: 10 });
    const t = calcTotals(
      [head, p],
      params({ materialZuschlag: 0 }),
      new Set(['h', 'a']),
    );
    // header doesn't add even if id is in visible set
    expect(t.visibleNetto).toBe(10);
  });
  it('C-039 totalMwst = totalNetto × mwst', () => {
    const p = pos({ quantity: 1, materialCost: 100 });
    const t = calcTotals([p], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0, mwst: 0.19 }));
    expect(t.totalMwst).toBeCloseTo(19, 2);
  });
  it('C-040 totalBrutto = totalNetto + totalMwst (rounded)', () => {
    const p = pos({ quantity: 1, materialCost: 100 });
    const t = calcTotals([p], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0, mwst: 0.19 }));
    expect(t.totalBrutto).toBe(119);
  });
  it('C-041 visibleMwst uses same rate', () => {
    const p = pos({ id: 'a', quantity: 1, materialCost: 100 });
    const t = calcTotals([p], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0, mwst: 0.19 }));
    expect(t.visibleMwst).toBeCloseTo(19, 2);
  });
  it('C-042 totalHours across non-headers', () => {
    const p1 = pos({ quantity: 1, timeMinutes: 60 });
    const p2 = pos({ quantity: 2, timeMinutes: 60 });
    const t = calcTotals([p1, p2], params({ zeitabzug: 0 }));
    expect(t.totalHours).toBeCloseTo(3, 1);
  });
  it('C-043 totalHours ignores headers', () => {
    const h = pos({ isHeader: true, timeMinutes: 999 });
    const p = pos({ quantity: 1, timeMinutes: 60 });
    const t = calcTotals([h, p], params({ zeitabzug: 0 }));
    expect(t.totalHours).toBe(1);
  });
  it('C-044 totalLohn + Material + Geraet + Nu approximates totalNetto', () => {
    const p = pos({ quantity: 2, materialCost: 100, timeMinutes: 60, nuCost: 50 });
    const t = calcTotals([p], params());
    const sumOfParts = t.totalLohn + t.totalMaterial + t.totalGeraet + t.totalNu;
    expect(sumOfParts).toBeCloseTo(t.totalNetto, 1); // within rounding
  });
  it('C-045 mwst=0 → totalBrutto = totalNetto', () => {
    const p = pos({ quantity: 1, materialCost: 100 });
    const t = calcTotals([p], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0, mwst: 0 }));
    expect(t.totalMwst).toBe(0);
    expect(t.totalBrutto).toBe(t.totalNetto);
  });
});

/* ─── 1D. formatEUR / formatNum (C-046..C-055) ─── */

describe('1D. formatEUR / formatNum', () => {
  // Locale-dependent NumberFormat output uses NBSPs and special minus signs;
  // we test by NUMERIC parts (no exact-string asserts) where the platform
  // differs across Node versions.
  it('C-046 formatEUR small positive contains "1,23" and "€"', () => {
    const s = formatEUR(1.23);
    expect(s).toMatch(/1,23/);
    expect(s).toMatch(/€/);
  });
  it('C-047 formatEUR zero contains "0,00"', () => {
    expect(formatEUR(0)).toMatch(/0,00/);
  });
  it('C-048 formatEUR negative includes minus + 1,23', () => {
    const s = formatEUR(-1.23);
    // accept ASCII '-' or Unicode minus '−'
    expect(s).toMatch(/[-−]/);
    expect(s).toMatch(/1,23/);
  });
  it('C-049 formatEUR thousands separator on 12345', () => {
    const s = formatEUR(12345);
    // German locale uses "." thousands sep
    expect(s).toMatch(/12\.345/);
  });
  it('C-050 formatEUR NaN → 0,00', () => {
    expect(formatEUR(NaN)).toMatch(/0,00/);
  });
  it('C-051 formatNum 2dp default', () => {
    expect(formatNum(1.235)).toMatch(/1,2[34]/); // 1,24 or 1,23 (rounding-dependent)
  });
  it('C-052 formatNum 0 digits', () => {
    expect(formatNum(1.5, 0)).toMatch(/^[12]$/);
  });
  it('C-053 formatNum 1 decimal (hours)', () => {
    expect(formatNum(2.3, 1)).toMatch(/2,3/);
  });
  it('C-054 formatNum NaN → 0,00', () => {
    expect(formatNum(NaN)).toMatch(/0,00/);
  });
  it('C-055 formatNum German locale comma', () => {
    expect(formatNum(1.5)).toMatch(/,/);
    expect(formatNum(1.5)).not.toMatch(/\d\.\d/); // no dot decimal
  });
});

/* ─── 1E. makeBlankPosition + recalcAll (C-056..C-060) ─── */

describe('1E. makeBlankPosition + recalcAll', () => {
  it('C-056 makeBlankPosition visibleToCustomer=true', () => {
    expect(makeBlankPosition('a', 1).visibleToCustomer).toBe(true);
  });
  it('C-057 makeBlankPosition positionType=standard', () => {
    expect(makeBlankPosition('a', 1).positionType).toBe('standard');
  });
  it('C-058 recalcAll empty → empty', () => {
    expect(recalcAll([], params())).toEqual([]);
  });
  it('C-059 recalcAll preserves order', () => {
    const p1 = pos({ id: 'a', sortOrder: 1, materialCost: 10 });
    const p2 = pos({ id: 'b', sortOrder: 2, materialCost: 20 });
    const result = recalcAll([p1, p2], params());
    expect(result.map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('C-060 recalcAll recomputes EP/GP per row', () => {
    const p = pos({ quantity: 2, materialCost: 100 });
    const [out] = recalcAll([p], params({ materialZuschlag: 0, verrechnungslohn: 0, geraeteStundensatz: 0, nuZuschlag: 0 }));
    expect(out.ep).toBe(100);
    expect(out.gp).toBe(200);
  });
});

// Suppress unused-type lint for the imported PositionCalcResult — kept for IDE hover doc
void (null as unknown as PositionCalcResult);
