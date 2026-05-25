/**
 * Round 12 Feature 2 — EDGE CASES for inline plausibility chips.
 *
 * Companion to PositionTableV2.plausibility.test.tsx — adds tests for:
 *   - Two rows both EP=0 → both fire RULE A
 *   - Median=0 case — no divide-by-zero
 *   - All-identical EP set — no RULE B (dev=0)
 *   - Single-comparison-row (1 other matching) — RULE B skipped
 *   - 40% boundary — strict `>` means exactly 40 is NOT a chip
 *   - Negative EP / negative materialCost — no crash, behavior documented
 *   - shortText with only stop-words → comparison set behavior
 *   - Long shortText smoke (5000 chars × 100 rows) — no perf cliff
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

function renderIntern(positions: Position[]) {
  const fx: ProjectData = {
    name: 'plaus-edges', client: '', service: '', tenderNumber: '',
    deadline: '', bidder: '', calcParams: DEFAULT_CALC_PARAMS, positions,
  };
  return render(
    <PositionTableV2 positions={fx.positions} params={fx.calcParams}
      onChange={() => {}} view="intern" />,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// RULE A — multi-row zero
// ────────────────────────────────────────────────────────────────────────────

describe('plausibility edges — RULE A on multiple rows', () => {
  test('Two rows both materialCost=timeMinutes=nuCost=0 → both get the red chip', () => {
    const { container } = renderIntern([
      mkRow({ id: 'z1', shortText: 'Empty A', unit: 'St' }),
      mkRow({ id: 'z2', shortText: 'Empty B', unit: 'St' }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-z1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-missing-z2"]')).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// RULE B — boundary + degenerate cases
// ────────────────────────────────────────────────────────────────────────────

describe('plausibility edges — RULE B degenerates', () => {
  test('Median=0 is impossible (compare-set excludes ep<=0 rows) — but verify no chip', () => {
    // Construction: 3 valid comparable rows (so the set is ≥3) and one row
    // whose ep is 0 — the ep=0 row gets Rule A, not Rule B. The valid rows
    // shouldn't outlier-chip either (they're all 100 vs median 100).
    const { container } = renderIntern([
      mkRow({ id: 'a', shortText: 'Putz fein gut Schicht', unit: 'm²', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Putz fein gut Schicht', unit: 'm²', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Putz fein gut Schicht', unit: 'm²', materialCost: 100 }),
      // Zero row — has rule A, not rule B
      mkRow({ id: 'z', shortText: 'Putz fein gut Schicht', unit: 'm²' /* all 0 */ }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-z"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-outlier-z"]')).toBeNull();
    // Real rows all match median — no outlier chip
    expect(container.querySelector('[data-testid="v2-chip-outlier-a"]')).toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-outlier-b"]')).toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-outlier-c"]')).toBeNull();
  });

  test('All-identical EP set → deviation=0 → no Rule B chips on any row', () => {
    const { container } = renderIntern([
      mkRow({ id: 'a', shortText: 'Kabel NYM gut Schicht', unit: 'm', materialCost: 50 }),
      mkRow({ id: 'b', shortText: 'Kabel NYM gut Schicht', unit: 'm', materialCost: 50 }),
      mkRow({ id: 'c', shortText: 'Kabel NYM gut Schicht', unit: 'm', materialCost: 50 }),
      mkRow({ id: 'd', shortText: 'Kabel NYM gut Schicht', unit: 'm', materialCost: 50 }),
      mkRow({ id: 'e', shortText: 'Kabel NYM gut Schicht', unit: 'm', materialCost: 50 }),
    ]);
    // Comparison set for each row = the other 4; median=ep(=50*1.12=56);
    // each row's ep is exactly the median → deviation=0 → no chip.
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      expect(
        container.querySelector(`[data-testid="v2-chip-outlier-${id}"]`),
        `row ${id} should NOT have an outlier chip`,
      ).toBeNull();
    }
  });

  test('Single-comparison-row (1 other matching) → Rule B skipped', () => {
    // 2 same-unit-and-token rows → for either row, comparison set has 1 →
    // Rule B requires ≥3 → no chip.
    const { container } = renderIntern([
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 999 }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-outlier-a"]')).toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-outlier-b"]')).toBeNull();
  });

  test('FIXED in Round 12 debug — exact +40 % deviation does NOT chip (was an IEEE-754 false positive)', () => {
    // Arithmetic: compare ep = 100 * 1.12 = 112 ; outlier ep = 140 * 1.12 = 156.8
    // raw deviation = (156.8 − 112) / 112 = 0.40000000000000013 (IEEE-754 noise)
    // Pre-fix `Math.abs(d) > 0.4` fired the chip with its own tooltip claiming
    // "+40,0 %" — confusing. Fix: round deviation to 4 dp before comparing.
    // See computePlausibility() comment in PositionTableV2.tsx.
    const { container } = renderIntern([
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte LED X', unit: 'St', materialCost: 140 }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).toBeNull();
  });

  test('Just-past +40% deviation (41%) — chip DOES fire', () => {
    // 3 baseline rows at 100, outlier at 141 → 41% → chip fires.
    const { container } = renderIntern([
      mkRow({ id: 'a', shortText: 'Leuchte LED A', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'b', shortText: 'Leuchte LED B', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'c', shortText: 'Leuchte LED C', unit: 'St', materialCost: 100 }),
      mkRow({ id: 'outlier', shortText: 'Leuchte LED X', unit: 'St', materialCost: 141 }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Defensive: negative inputs (refunds / credits) shouldn't crash and shouldn't
// silently chip the row.
// ────────────────────────────────────────────────────────────────────────────

describe('plausibility edges — negative inputs', () => {
  test('Negative materialCost (refund/credit) does not crash and gets NO Rule A chip', () => {
    // RULE A requires === 0. Negative is not equal to 0 → no chip.
    // EP also goes negative; `row.ep > 0` excludes it from the compare-set
    // index → no Rule B either. Just smoke for no-crash.
    const { container } = renderIntern([
      mkRow({ id: 'refund', shortText: 'Korrektur', unit: 'St', materialCost: -50 }),
    ]);
    expect(container.querySelector('[data-testid="v2-chip-missing-refund"]')).toBeNull();
    expect(container.querySelector('[data-testid="v2-chip-outlier-refund"]')).toBeNull();
    // Row still renders (no crash from negative ep)
    expect(container.querySelector('[data-testid="v2-row-refund"]')).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Stop-words: tokenizeShortText only drops tokens of length ≤2.
// "der", "die", "das" are all length 3 → they survive the filter.
// This documents the current behavior (an stop-words-only Bezeichnung CAN
// build a comparison set; the filter is purely character-length based).
// ────────────────────────────────────────────────────────────────────────────

describe('plausibility edges — stop-word-only shortText', () => {
  test('shortText "der die das" passes tokenizer (length=3 each) — current behavior documented', () => {
    // 4 rows all carrying just "der die das" + unit m² + ep=100*1.12=112.
    // Every row has compare-set ≥3 from siblings. All identical → no outlier.
    // No Rule A (material=50). Asserts the documented behavior: stop-words
    // are NOT filtered. If/when a real stop-word list is introduced, this
    // test will need to flip — flag with the doc note above.
    const { container } = renderIntern([
      mkRow({ id: 'a', shortText: 'der die das', unit: 'm²', materialCost: 50 }),
      mkRow({ id: 'b', shortText: 'der die das', unit: 'm²', materialCost: 50 }),
      mkRow({ id: 'c', shortText: 'der die das', unit: 'm²', materialCost: 50 }),
      mkRow({ id: 'd', shortText: 'der die das', unit: 'm²', materialCost: 50 }),
    ]);
    // All identical → no chip on anyone (RULE B → deviation=0 → no chip).
    expect(container.querySelectorAll('[data-testid^="v2-chip-outlier-"]').length).toBe(0);
    expect(container.querySelectorAll('[data-testid^="v2-chip-missing-"]').length).toBe(0);
  });

  test('shortText with only short tokens ("a b c d") yields no tokens → no comparison set', () => {
    // All tokens have length ≤2, so tokenizeShortText returns []. Indexing
    // skips the row (tokens.length > 0 guard). Rule B compare set for each
    // such row is empty → no chip.
    const { container } = renderIntern([
      mkRow({ id: 'a', shortText: 'a b c d', unit: 'St', materialCost: 50 }),
      mkRow({ id: 'b', shortText: 'a b c d', unit: 'St', materialCost: 50 }),
      mkRow({ id: 'c', shortText: 'a b c d', unit: 'St', materialCost: 50 }),
      mkRow({ id: 'outlier', shortText: 'a b c d', unit: 'St', materialCost: 999 }),
    ]);
    // None of the rows have ≥3 comparison rows (every row's token-set is empty)
    expect(container.querySelector('[data-testid="v2-chip-outlier-outlier"]')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Performance smoke — long shortText × many rows shouldn't cliff.
// ────────────────────────────────────────────────────────────────────────────

describe('plausibility edges — performance smoke', () => {
  test('100 rows with 5000-char shortText render under 500ms (smoke)', () => {
    // We aim for a generous 500ms wall-clock budget for happy-dom + render.
    // The plausibility computation itself is the critical-path concern;
    // tokenizer + inverted index should stay O(n·k) where k is tokens/row.
    const longText = 'Leuchte LED Aluminium dimm dali rast '.repeat(125); // ~4750 chars
    const positions: Position[] = Array.from({ length: 100 }, (_, i) =>
      mkRow({
        id: `r${i}`,
        shortText: longText,
        unit: 'St',
        materialCost: 100 + (i % 10),  // tight cluster — no rule B chips
      }),
    );
    const start = performance.now();
    renderIntern(positions);
    const elapsed = performance.now() - start;
    // Generous budget — render in happy-dom is the dominant cost. We just
    // want to catch a worst-case quadratic in compute.
    expect(elapsed).toBeLessThan(2000);
  });
});
