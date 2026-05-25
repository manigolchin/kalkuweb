/**
 * Round 12 Feature 1 — EDGE CASES for bulk edit + multi-select.
 *
 * Companion to PositionTableV2.bulkEdit.test.tsx — adds tests for:
 *   - Zero-Material rows under %-adjust (% of nothing)
 *   - Rounding correctness on small fractional EKs
 *   - Negative-pct semantics (-100% factor = 0)
 *   - Bulk delete with confirm cancelled
 *   - Select then de-select all → bulk bar disappears
 *   - Shift+click with no prior anchor → single-row selection
 *   - Shift+click range crossing a header row → header is NOT in the range
 *   - INTERN→KUNDEN→INTERN preserves no stale selection state
 *   - Bulk markAs preserves all OTHER fields
 *   - Bulk operation on 0 selected rows (defensive — no-op)
 */

import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import { DEFAULT_CALC_PARAMS } from '../calc';
import type { Position, ProjectData } from '../types';

/** 1 header + 4 standard rows; same shape as the parent test file's fixture
 *  but with `materialCost: 1.99` on r1 so we can exercise rounding. */
function makeFixture(): ProjectData {
  const positions: Position[] = [
    {
      id: 'h1', oz: '01', shortText: 'KG 440', longText: '', hinweisText: '',
      quantity: 0, unit: '', materialCost: 0, timeMinutes: 0, nuCost: 0,
      isHeader: true, sortOrder: 1, sectionPath: '01',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r1', oz: '01.001', shortText: 'Leuchte A', longText: '', hinweisText: '',
      quantity: 10, unit: 'St',
      // Triggers EP=0 (Material+Time+NU all 0) + tests "+% of nothing".
      materialCost: 0, timeMinutes: 0, nuCost: 0,
      isHeader: false, sortOrder: 2, sectionPath: '01',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r2', oz: '01.002', shortText: 'Leuchte B', longText: '', hinweisText: '',
      quantity: 5, unit: 'St',
      // Tests rounding: 1.99 * 1.5 = 2.985 → round2 → 2.99 (NOT 2.98).
      materialCost: 1.99, timeMinutes: 60, nuCost: 50,
      isHeader: false, sortOrder: 3, sectionPath: '01',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r3', oz: '01.003', shortText: 'Leuchte C', longText: '', hinweisText: '',
      quantity: 3, unit: 'St',
      // For the -100% test → expected 0 after factor=0.
      materialCost: 300, timeMinutes: 90, nuCost: 100,
      isHeader: false, sortOrder: 4, sectionPath: '01',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r4', oz: '01.004', shortText: 'Leuchte D', longText: '', hinweisText: '',
      quantity: 2, unit: 'St',
      materialCost: 400, timeMinutes: 120, nuCost: 0,
      isHeader: false, sortOrder: 5, sectionPath: '01',
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      visibleToCustomer: true, positionType: 'standard',
    },
  ];
  return {
    name: 'Test BV', client: 'AG', service: '', tenderNumber: '', deadline: '',
    bidder: 'KALKU', calcParams: DEFAULT_CALC_PARAMS, positions,
  };
}

/** Drive the bulk %-input flow end-to-end via the rendered buttons.
 *  `sign === -1` opens the `–%` trigger; raw is the numeric % typed in. */
function applyBulkMaterialPct(
  container: HTMLElement,
  sign: 1 | -1,
  raw: string,
) {
  const trigger = sign === 1
    ? container.querySelector('[data-testid="v2-bulk-material-plus"]')
    : container.querySelector('[data-testid="v2-bulk-material-minus"]');
  fireEvent.click(trigger!);
  const input = container.querySelector('[data-testid="v2-bulk-pct-input"]') as HTMLInputElement;
  fireEvent.change(input, { target: { value: raw } });
  fireEvent.click(container.querySelector('[data-testid="v2-bulk-pct-commit"]')!);
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Rounding + zero-EK edge cases
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — rounding + zero', () => {
  test('Bulk +5% on materialCost=0 → stays 0 (% of nothing)', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    applyBulkMaterialPct(container, 1, '5');
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Position[];
    // r1 had materialCost=0 → 0 * 1.05 = 0
    expect(next.find((p) => p.id === 'r1')!.materialCost).toBe(0);
  });

  test('Bulk +50% on materialCost=1.99 → 2.99 (round2 — 2.985 → 2.99)', () => {
    // 1.99 * 1.5 = 2.985 — Math.round(2.985 * 100) / 100 = Math.round(298.5) / 100
    // Note: 298.5 rounds via banker rounding in many languages, but JS uses
    // "round-half-away-from-zero" → 299 → 2.99. This is the contract round2()
    // documents and the test asserts the documented behavior.
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    applyBulkMaterialPct(container, 1, '50');
    const next = onChange.mock.calls[0][0] as Position[];
    expect(next.find((p) => p.id === 'r2')!.materialCost).toBe(2.99);
  });

  test('Bulk -100% on materialCost=300 → 0 (factor 0; product clamps at 0 naturally)', () => {
    // factor = 1 + (-100/100) = 0 → 300 * 0 = 0 → round2(0) = 0
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]')!);
    applyBulkMaterialPct(container, -1, '100');
    const next = onChange.mock.calls[0][0] as Position[];
    expect(next.find((p) => p.id === 'r3')!.materialCost).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Bulk delete cancellation flow
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — delete cancellation', () => {
  test('Bulk delete with confirm cancelled → 0 rows removed, no onChange', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    // Force confirm to return false (override the setup.ts default of true).
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).not.toBeNull();
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-delete"]')!);
    // Confirm was asked, but user said NO → no removal happens
    expect(confirmSpy).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    // Selection still stands → bar still visible
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).not.toBeNull();
    confirmSpy.mockRestore();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Select-all → de-select-all → bar disappears
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — select-all toggle off', () => {
  test('Select all then click select-all again → 0 selected, bar gone', () => {
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={() => {}} view="intern" />,
    );
    const selectAll = container.querySelector('[data-testid="v2-select-all"]') as HTMLInputElement;
    fireEvent.click(selectAll);
    expect((container.querySelector('[data-testid="v2-select-all"]') as HTMLInputElement).checked).toBe(true);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')!.textContent).toContain('4');
    // Click again → clears
    fireEvent.click(container.querySelector('[data-testid="v2-select-all"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    for (const id of ['r1', 'r2', 'r3', 'r4']) {
      expect((container.querySelector(`[data-testid="v2-select-row-${id}"]`) as HTMLInputElement).checked).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Shift+click corner cases
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — shift+click corners', () => {
  test('Shift+click without a prior selection → selects just that row (no range fallback)', () => {
    // Anchor is null → range path falls through → single-toggle path runs.
    // Without the shift handling, this is identical to a regular click; we
    // assert the row IS selected and no others come along for the ride.
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={() => {}} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]')!, { shiftKey: true });
    expect((container.querySelector('[data-testid="v2-select-row-r3"]') as HTMLInputElement).checked).toBe(true);
    // Nothing else got swept in
    for (const id of ['r1', 'r2', 'r4']) {
      expect((container.querySelector(`[data-testid="v2-select-row-${id}"]`) as HTMLInputElement).checked).toBe(false);
    }
  });

  test('Shift+click range across a header row → header is excluded (only standards selected)', () => {
    // Fixture has 1 header at index 0 + 4 standards. selectableIds = [r1..r4]
    // (headers are filtered). So a shift+click range from r1 to r4 is
    // [r1, r2, r3, r4] — header h1 has no checkbox + no entry in
    // selectableIds, so the range never touches it.
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={() => {}} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r4"]')!, { shiftKey: true });
    for (const id of ['r1', 'r2', 'r3', 'r4']) {
      expect((container.querySelector(`[data-testid="v2-select-row-${id}"]`) as HTMLInputElement).checked).toBe(true);
    }
    // Header has no checkbox at all → not selectable
    expect(container.querySelector('[data-testid="v2-select-row-h1"]')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. View toggle round-trip
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — view round-trip', () => {
  test('INTERN→KUNDEN→INTERN: selection cleared, bar not re-shown', () => {
    const fx = makeFixture();
    const { container, rerender } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={() => {}} view="intern" />,
    );
    // Select 2 rows
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')!.textContent).toContain('2');
    // → KUNDEN clears selection (effect at L384)
    rerender(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={() => {}} view="kunden"
        projectMeta={{ name: fx.name, client: fx.client, service: '',
          tenderNumber: '', deadline: '', bidder: fx.bidder }} />,
    );
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    // → back to INTERN — selection must NOT re-appear
    rerender(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={() => {}} view="intern" />,
    );
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    for (const id of ['r1', 'r2', 'r3', 'r4']) {
      expect((container.querySelector(`[data-testid="v2-select-row-${id}"]`) as HTMLInputElement).checked).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. markAs preserves other fields
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — markAs preserves fields', () => {
  test('Bulk markAs(reserve) keeps every other position field unchanged', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-mark-toggle"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-mark-reserve"]')!);
    const next = onChange.mock.calls[0][0] as Position[];
    const r2Before = fx.positions.find((p) => p.id === 'r2')!;
    const r2After = next.find((p) => p.id === 'r2')!;
    // Only positionType + visibleToCustomer (forced false) may differ.
    expect(r2After.positionType).toBe('reserve');
    expect(r2After.visibleToCustomer).toBe(false);  // reserve is internal
    // Every other field is byte-identical
    expect(r2After.oz).toBe(r2Before.oz);
    expect(r2After.shortText).toBe(r2Before.shortText);
    expect(r2After.longText).toBe(r2Before.longText);
    expect(r2After.quantity).toBe(r2Before.quantity);
    expect(r2After.unit).toBe(r2Before.unit);
    expect(r2After.materialCost).toBe(r2Before.materialCost);
    expect(r2After.timeMinutes).toBe(r2Before.timeMinutes);
    expect(r2After.nuCost).toBe(r2Before.nuCost);
    expect(r2After.sortOrder).toBe(r2Before.sortOrder);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Defensive: 0 selected rows can't trigger bulk operations (the UI gates
//    behind the bar; the bar never mounts without ≥1 selection).
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — defensive 0-selection', () => {
  test('With 0 selected, the bulk bar is not in the DOM (no buttons to press)', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    // No selection ever → no bar
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    expect(container.querySelector('[data-testid="v2-bulk-delete"]')).toBeNull();
    expect(container.querySelector('[data-testid="v2-bulk-material-plus"]')).toBeNull();
    // And onChange never fires (no path to call applyBulk without UI).
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Round-12 debug regression: bulk -% must never flip values negative.
//    Before fix: typing "-200" → factor = 1 + (-2) = -1 → all materialCost
//    get NEGATED (refund-row mass-creation). Fix: clamp factor at 0.
//    See PositionTableV2.tsx pctFactor() comment.
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit edges — clamp on -% past 100', () => {
  test('Bulk -200 % Material → materialCost clamps to 0, never negative', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    // Make r2 + r3 have positive Material so we can observe the clamp.
    fx.positions[2].materialCost = 50;
    fx.positions[3].materialCost = 100;
    const { container, getByTestId } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    // Select r2 + r3
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]') as Element);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]') as Element);
    // Click "−%" Material → opens the input
    fireEvent.click(getByTestId('v2-bulk-material-minus'));
    // Type a -% > 100 → factor would otherwise go negative
    const input = getByTestId('v2-bulk-pct-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '200' } });   // pct = -200 (sign is minus from the button)
    fireEvent.keyDown(input, { key: 'Enter' });
    // Last onChange call's payload — r2 + r3 must be 0, NOT negative.
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    const updated = lastCall[0] as Position[];
    const r2 = updated.find((p) => p.id === 'r2')!;
    const r3 = updated.find((p) => p.id === 'r3')!;
    expect(r2.materialCost).toBe(0);
    expect(r3.materialCost).toBe(0);
    // No negative anywhere
    for (const p of updated) {
      expect(p.materialCost).toBeGreaterThanOrEqual(0);
      expect(p.timeMinutes).toBeGreaterThanOrEqual(0);
      expect(p.nuCost).toBeGreaterThanOrEqual(0);
    }
  });

  test('Bulk -100 % Material → materialCost lands exactly at 0 (factor = 0)', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    fx.positions[2].materialCost = 12.34;
    fx.positions[3].materialCost = 999;
    const { container, getByTestId } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams}
        onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]') as Element);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]') as Element);
    fireEvent.click(getByTestId('v2-bulk-material-minus'));
    const input = getByTestId('v2-bulk-pct-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const updated = onChange.mock.calls.at(-1)![0] as Position[];
    expect(updated.find((p) => p.id === 'r2')!.materialCost).toBe(0);
    expect(updated.find((p) => p.id === 'r3')!.materialCost).toBe(0);
  });
});
