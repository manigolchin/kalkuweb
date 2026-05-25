/**
 * Round 12 Feature 2 — inline plausibility chips on PositionTableV2 rows.
 *
 * Two rules:
 *   - RULE A "Preis fehlt" (red chip):
 *       materialCost === 0 && nuCost === 0 && timeMinutes === 0
 *   - RULE B "Ungewöhnlich" (amber chip):
 *       row EP deviates >40% from median of compare-set
 *       (shared ≥2 shortText tokens AND same unit, ≥3 other rows)
 *
 * Both chips render in INTERN view only (sentinel-leak guard).
 */

import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import { DEFAULT_CALC_PARAMS } from '../calc';
import type { Position, ProjectData } from '../types';

function mkRow(over: Partial<Position> & { id: string }): Position {
  return {
    id: over.id,
    oz: over.oz ?? `01.${over.id}`,
    shortText: over.shortText ?? '',
    longText: '',
    hinweisText: '',
    quantity: over.quantity ?? 1,
    unit: over.unit ?? 'St',
    materialCost: over.materialCost ?? 0,
    timeMinutes: over.timeMinutes ?? 0,
    nuCost: over.nuCost ?? 0,
    isHeader: over.isHeader ?? false,
    sortOrder: over.sortOrder ?? 1,
    sectionPath: '01',
    epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
    visibleToCustomer: over.visibleToCustomer ?? true,
    positionType: over.positionType ?? 'standard',
  };
}

function makeProject(positions: Position[]): ProjectData {
  return {
    name: 'plaus-fixture', client: '', service: '', tenderNumber: '',
    deadline: '', bidder: '', calcParams: DEFAULT_CALC_PARAMS, positions,
  };
}

function renderIntern(positions: Position[]) {
  const fx = makeProject(positions);
  return {
    ...render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    ),
    fx,
  };
}

function renderKunden(positions: Position[]) {
  const fx = makeProject(positions);
  return {
    ...render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="kunden"
        projectMeta={{
          name: fx.name, client: '', service: '', tenderNumber: '',
          deadline: '', bidder: '',
        }}
      />,
    ),
    fx,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// RULE A — Preis fehlt
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 plausibility — RULE A (EP fehlt)', () => {
  test('row with materialCost=0, nuCost=0, timeMinutes=0 gets the red chip', () => {
    const { container } = renderIntern([
      mkRow({ id: 'empty', shortText: 'Leuchte A', unit: 'St' }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-empty"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-missing-empty"]')!.textContent).toContain('EP fehlt');
  });

  test('row with materialCost > 0 does NOT get the chip', () => {
    const { container } = renderIntern([
      mkRow({ id: 'has-mat', materialCost: 50, shortText: 'Leuchte', unit: 'St' }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-has-mat"]')).toBeNull();
  });

  test('row with timeMinutes > 0 does NOT get the chip (even if material+nu are 0)', () => {
    const { container } = renderIntern([
      mkRow({ id: 'has-time', timeMinutes: 30, shortText: 'Inbetrieb', unit: 'h' }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-has-time"]')).toBeNull();
  });

  test('header row never gets the chip even when all costs are 0', () => {
    const { container } = renderIntern([
      mkRow({ id: 'h1', shortText: 'KG 440', isHeader: true }),
      mkRow({ id: 'r1', materialCost: 50, shortText: 'Leuchte', unit: 'St' }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-h1"]')).toBeNull();
  });

  test('chip is NOT rendered in KUNDEN view (sentinel-leak guard)', () => {
    const { container } = renderKunden([
      mkRow({ id: 'empty', shortText: 'Leuchte A', unit: 'St', visibleToCustomer: true }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-empty"]')).toBeNull();
    // Defensive: the "EP fehlt" label itself must not appear anywhere
    expect(container.textContent).not.toContain('EP fehlt');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// RULE B — Outlier vs median of comparison set
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 plausibility — RULE B (Ungewöhnlich)', () => {
  // 4 comparable rows + 1 outlier. Shared tokens: "leuchte", "led"; same unit "St".
  // Compare rows have materialCost = 100 → EP after materialZuschlag 0.12 ≈ 112.
  // Outlier row with materialCost = 200 → EP ≈ 224, a +100% deviation (>40%).
  function comparableFixture(outlierOverride: Partial<Position>): Position[] {
    return [
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 102 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C', unit: 'St', materialCost: 98 }),
      mkRow({ id: 'd', shortText: 'Leuchte LED D', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte LED X', unit: 'St', materialCost: 100, ...outlierOverride }),
    ];
  }

  test('row with EP > +40% above median gets the amber chip', () => {
    const { container } = renderIntern(comparableFixture({ materialCost: 250 })); // +150%
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).not.toBeNull();
  });

  test('row with EP < -40% below median gets the amber chip', () => {
    const { container } = renderIntern(comparableFixture({ materialCost: 30 }));  // -70%
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).not.toBeNull();
  });

  test('row within 40% of median does NOT get the chip', () => {
    const { container } = renderIntern(comparableFixture({ materialCost: 110 })); // +10%
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).toBeNull();
  });

  test('chip tooltip contains median, actual, and deviation%', () => {
    const { container } = renderIntern(comparableFixture({ materialCost: 250 }));
    const chip = container.querySelector('[data-testid="v2-chip-outlier-outlier"]') as HTMLElement;
    const title = chip.getAttribute('title') ?? '';
    expect(title).toContain('Median');
    expect(title).toContain('Abweichung');
    expect(title).toContain('%');
    expect(title).toContain('€');
  });

  test('RULE B is skipped when comparison set has < 3 rows', () => {
    // Only 2 comparable rows + 1 outlier → comparison set for outlier is 2 → skip
    const positions: Position[] = [
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte LED X', unit: 'St', materialCost: 999 }),
    ];
    const { container } = renderIntern(positions);
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).toBeNull();
  });

  test('comparison requires ≥2 shared tokens AND same unit — fails on 1-token overlap', () => {
    // The outlier row shares only "leuchte" (1 token) with the others — compare-set is empty → no chip
    const positions: Position[] = [
      mkRow({ id: 'a', shortText: 'Leuchte LED A IP44', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B IP44', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C IP44', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte', unit: 'St', materialCost: 999 }),
    ];
    const { container } = renderIntern(positions);
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).toBeNull();
  });

  test('comparison requires same unit — m² and Stck rows do not cross-pollinate', () => {
    // 3 m² rows ~100 €, 1 m² rows is the outlier; 1 Stck row at 999 must NOT be compared
    const positions: Position[] = [
      mkRow({ id: 'q1', shortText: 'Putz gewöhnlich gut', unit: 'm²', materialCost: 100 }),
      mkRow({ id: 'q2', shortText: 'Putz gewöhnlich gut', unit: 'm²', materialCost: 100 }),
      mkRow({ id: 'q3', shortText: 'Putz gewöhnlich gut', unit: 'm²', materialCost: 100 }),
      mkRow({ id: 's1', shortText: 'Putz gewöhnlich gut', unit: 'Stck', materialCost: 999 }),
    ];
    const { container } = renderIntern(positions);
    // s1's comparison set is empty (no other Stck row matches) → no chip
    expect(container.querySelector('[data-testid="v2-chip-outlier-s1"]')).toBeNull();
    // q1/q2/q3 share tokens + unit, but the outlier (s1) is excluded → no Stck pollution
    // None of the q-rows are themselves outliers (they're 100 vs median 100)
    expect(container.querySelector('[data-testid="v2-chip-outlier-q1"]')).toBeNull();
  });

  test('RULE B chip is NOT rendered in KUNDEN view', () => {
    const { container } = renderKunden(comparableFixture({ materialCost: 250 }));
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).toBeNull();
    expect(container.textContent).not.toContain('Ungewöhnlich');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Both rules together
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 plausibility — interaction of rules', () => {
  test('RULE A wins when both could fire — missing-price suppresses outlier', () => {
    // Row has all zeros (Rule A) AND a comparison set exists.
    const positions: Position[] = [
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'd', shortText: 'Leuchte LED D', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'empty', shortText: 'Leuchte LED X', unit: 'St' /* all costs 0 */ }),
    ];
    const { container } = renderIntern(positions);
    // Missing-price chip appears
    expect(container.querySelector('[data-testid="v2-chip-missing-empty"]')).not.toBeNull();
    // Outlier chip does NOT (Rule A short-circuits Rule B)
    expect(container.querySelector('[data-testid="v2-chip-outlier-empty"]')).toBeNull();
  });

  test('Sentinel guard: neither chip rule emits any chip element into KUNDEN DOM', () => {
    const positions: Position[] = [
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'd', shortText: 'Leuchte LED D', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte LED X', unit: 'St', materialCost: 999 }),
      mkRow({ id: 'empty', shortText: 'Leuchte LED Y', unit: 'St' }),
    ];
    const { container } = renderKunden(positions);
    // No chip data-testids anywhere
    expect(container.querySelectorAll('[data-testid^="v2-chip-missing-"]').length).toBe(0);
    expect(container.querySelectorAll('[data-testid^="v2-chip-outlier-"]').length).toBe(0);
    // No literal chip labels
    expect(container.textContent).not.toContain('EP fehlt');
    expect(container.textContent).not.toContain('Ungewöhnlich');
  });

  test('Memoization smoke — render with same positions twice produces identical chip DOM', () => {
    // We can't measure useMemo cache hits directly via DOM, but we can assert
    // that re-rendering with the SAME positions array yields the same chip
    // structure (no churn, no flicker). The plausibility memo is keyed on
    // (positions, params); if those refs change, the memo invalidates. We
    // re-render with the same arrays and compare chip data-testids.
    const positions: Position[] = [
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'd', shortText: 'Leuchte LED D', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte LED X', unit: 'St', materialCost: 999 }),
    ];
    const fx = makeProject(positions);
    const { container, rerender } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    const chipsBefore = Array.from(container.querySelectorAll('[data-testid^="v2-chip-"]'))
      .map((el) => el.getAttribute('data-testid'))
      .sort();
    rerender(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    const chipsAfter = Array.from(container.querySelectorAll('[data-testid^="v2-chip-"]'))
      .map((el) => el.getAttribute('data-testid'))
      .sort();
    expect(chipsAfter).toEqual(chipsBefore);
  });

  test('Edit on unrelated row does not change chip set when EPs stay outside the comparison group', () => {
    // Add an unrelated row (different tokens + unit). It does not enter any
    // comparison set, so the outlier chip on the existing data should remain.
    const positions: Position[] = [
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'd', shortText: 'Leuchte LED D', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte LED X', unit: 'St', materialCost: 999 }),
    ];
    const fx = makeProject(positions);
    const { container, rerender } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    // Sanity: outlier chip present
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).not.toBeNull();
    // Add a completely unrelated row (kabel m, different unit + tokens)
    const next = [
      ...positions,
      mkRow({ id: 'unrelated', shortText: 'Kabel NYM 5x6 25m', unit: 'm', materialCost: 5 }),
    ];
    rerender(
      <PositionTableV2
        positions={next}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    // Outlier chip is still there; the unrelated row does NOT acquire any chip
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-outlier-unrelated"]')).toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-missing-unrelated"]')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Boundary cases
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 plausibility — boundary cases', () => {
  test('Empty project (no positions) renders without errors and zero chips', () => {
    const { container } = renderIntern([]);
    expect(container.querySelectorAll('[data-testid^="v2-chip-"]').length).toBe(0);
  });

  test('All-zero project produces a chip on every non-header row', () => {
    const positions: Position[] = [
      mkRow({ id: 'r1', shortText: 'A', unit: 'St' }),
      mkRow({ id: 'r2', shortText: 'B', unit: 'St' }),
      mkRow({ id: 'r3', shortText: 'C', unit: 'St' }),
    ];
    const { container } = renderIntern(positions);
    expect(container.querySelector('[data-testid="v2-chip-missing-r1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-missing-r2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-missing-r3"]')).not.toBeNull();
  });
});
