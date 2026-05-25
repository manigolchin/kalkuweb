/**
 * Round 12 Feature 1 — bulk edit + multi-select on PositionTableV2.
 *
 * Covers:
 *   - Checkbox column exists in INTERN, NOT in KUNDEN
 *   - Header rows have no checkbox
 *   - Single-row toggle, select-all, range-select via shift+click
 *   - Esc clears selection
 *   - View toggle KUNDEN clears selection + hides bar
 *   - Bulk ±% Material / Min / NU — ONE onChange call, not N
 *   - Bulk markAs() sets positionType for all selected
 *   - Bulk delete (with confirm) removes selected rows
 *   - Cancel clears selection
 *   - Sentinel leak guard: bulk bar never leaks internal data into DOM
 */

import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, act } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import { calculatePosition, DEFAULT_CALC_PARAMS } from '../calc';
import type { Position, ProjectData } from '../types';

/** A tight fixture: 1 header row + 4 standard rows. Easy to reason about. */
function makeFixture(): ProjectData {
  const positions: Position[] = [
    {
      id: 'h1', oz: '01', shortText: 'KG 440 Starkstromanlagen', longText: '',
      hinweisText: '', quantity: 0, unit: '', materialCost: 0, timeMinutes: 0, nuCost: 0,
      isHeader: true, sortOrder: 1, sectionPath: '01', epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0,
      ep: 0, gp: 0, visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r1', oz: '01.001', shortText: 'Leuchte A', longText: '', hinweisText: '',
      quantity: 10, unit: 'St', materialCost: 100, timeMinutes: 30, nuCost: 0,
      isHeader: false, sortOrder: 2, sectionPath: '01', epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0,
      ep: 0, gp: 0, visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r2', oz: '01.002', shortText: 'Leuchte B', longText: '', hinweisText: '',
      quantity: 5, unit: 'St', materialCost: 200, timeMinutes: 60, nuCost: 50,
      isHeader: false, sortOrder: 3, sectionPath: '01', epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0,
      ep: 0, gp: 0, visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r3', oz: '01.003', shortText: 'Leuchte C', longText: '', hinweisText: '',
      quantity: 3, unit: 'St', materialCost: 300, timeMinutes: 90, nuCost: 100,
      isHeader: false, sortOrder: 4, sectionPath: '01', epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0,
      ep: 0, gp: 0, visibleToCustomer: true, positionType: 'standard',
    },
    {
      id: 'r4', oz: '01.004', shortText: 'Leuchte D', longText: '', hinweisText: '',
      quantity: 2, unit: 'St', materialCost: 400, timeMinutes: 120, nuCost: 0,
      isHeader: false, sortOrder: 5, sectionPath: '01', epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0,
      ep: 0, gp: 0, visibleToCustomer: true, positionType: 'standard',
    },
  ];
  return {
    name: 'Test BV', client: 'AG', service: '', tenderNumber: '', deadline: '',
    bidder: 'KALKU', calcParams: DEFAULT_CALC_PARAMS, positions,
  };
}

function renderIntern(onChange = () => {}) {
  const fx = makeFixture();
  const utils = render(
    <PositionTableV2
      positions={fx.positions}
      params={fx.calcParams}
      onChange={onChange}
      view="intern"
    />,
  );
  return { ...utils, fx };
}

function renderKunden() {
  const fx = makeFixture();
  return {
    ...render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="kunden"
        projectMeta={{
          name: fx.name, client: fx.client, service: '', tenderNumber: '',
          deadline: '', bidder: fx.bidder,
        }}
      />,
    ),
    fx,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Visibility of the selection UI
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit — checkbox column visibility', () => {
  test('renders a checkbox for every non-header row in INTERN', () => {
    const { container } = renderIntern();
    const checkboxes = container.querySelectorAll('[data-testid^="v2-select-row-"]');
    expect(checkboxes.length).toBe(4); // 4 non-header rows in the fixture
  });

  test('header rows have no checkbox', () => {
    const { container } = renderIntern();
    // h1 is the header; would be `v2-select-row-h1` — but headers don't render PositionRow
    expect(container.querySelector('[data-testid="v2-select-row-h1"]')).toBeNull();
  });

  test('renders "select all" checkbox in the table header', () => {
    const { container } = renderIntern();
    expect(container.querySelector('[data-testid="v2-select-all"]')).not.toBeNull();
  });

  test('does NOT render the checkbox column in KUNDEN view', () => {
    const { container } = renderKunden();
    expect(container.querySelectorAll('[data-testid^="v2-select-row-"]').length).toBe(0);
    expect(container.querySelector('[data-testid="v2-select-all"]')).toBeNull();
  });

  test('bulk action bar is hidden when 0 rows selected', () => {
    const { container } = renderIntern();
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Selection mechanics
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit — selection mechanics', () => {
  test('clicking a row checkbox toggles selection on then off', () => {
    const { container } = renderIntern();
    const cb = container.querySelector('[data-testid="v2-select-row-r1"]') as HTMLInputElement;
    expect(cb.checked).toBe(false);
    fireEvent.click(cb);
    expect((container.querySelector('[data-testid="v2-select-row-r1"]') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    expect((container.querySelector('[data-testid="v2-select-row-r1"]') as HTMLInputElement).checked).toBe(false);
  });

  test('selecting a row shows the bulk bar with the correct count', () => {
    const { container } = renderIntern();
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    const bar = container.querySelector('[data-testid="v2-bulk-bar"]');
    expect(bar).not.toBeNull();
    expect(bar!.textContent).toContain('1');
    expect(bar!.textContent).toContain('Position markiert');
    // Add a second selection → bar shows "2 Positionen markiert"
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')!.textContent).toContain('2');
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')!.textContent).toContain('Positionen markiert');
  });

  test('"select all" checkbox selects every non-header row', () => {
    const { container } = renderIntern();
    const selectAll = container.querySelector('[data-testid="v2-select-all"]') as HTMLInputElement;
    fireEvent.click(selectAll);
    for (const id of ['r1', 'r2', 'r3', 'r4']) {
      const cb = container.querySelector(`[data-testid="v2-select-row-${id}"]`) as HTMLInputElement;
      expect(cb.checked, `row ${id} should be selected`).toBe(true);
    }
    // Header has no checkbox so no expectation on h1.
  });

  test('"select all" header checkbox shows indeterminate state for partial selection', () => {
    const { container } = renderIntern();
    // Select 2 of 4 → header checkbox should be indeterminate
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    const selectAll = container.querySelector('[data-testid="v2-select-all"]') as HTMLInputElement;
    expect(selectAll.indeterminate).toBe(true);
    expect(selectAll.checked).toBe(false);
    // Select all → indeterminate clears + checked=true
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r4"]')!);
    expect((container.querySelector('[data-testid="v2-select-all"]') as HTMLInputElement).indeterminate).toBe(false);
    expect((container.querySelector('[data-testid="v2-select-all"]') as HTMLInputElement).checked).toBe(true);
  });

  test('shift+click selects RANGE from last-clicked', () => {
    const { container } = renderIntern();
    // Click r1 → anchor at r1
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    // Shift+click r3 → range r1..r3 selected
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]')!, { shiftKey: true });
    for (const id of ['r1', 'r2', 'r3']) {
      const cb = container.querySelector(`[data-testid="v2-select-row-${id}"]`) as HTMLInputElement;
      expect(cb.checked, `row ${id} should be in range`).toBe(true);
    }
    expect((container.querySelector('[data-testid="v2-select-row-r4"]') as HTMLInputElement).checked).toBe(false);
  });

  test('Esc clears selection + hides the bulk bar', () => {
    const { container } = renderIntern();
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    expect((container.querySelector('[data-testid="v2-select-row-r1"]') as HTMLInputElement).checked).toBe(false);
  });

  test('switching to KUNDEN view clears selection + hides the bar', () => {
    // Use the uncontrolled view path with a manual toggle via the role=tab buttons.
    const fx = makeFixture();
    const { container, rerender } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).not.toBeNull();
    // Re-render with controlled view='kunden'
    rerender(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="kunden"
        projectMeta={{
          name: fx.name, client: fx.client, service: '', tenderNumber: '',
          deadline: '', bidder: fx.bidder,
        }}
      />,
    );
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    // And switching back to INTERN — selection is gone
    rerender(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    expect((container.querySelector('[data-testid="v2-select-row-r1"]') as HTMLInputElement).checked).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Bulk operations
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit — % operations apply correctly', () => {
  test('Bulk +5% Material applies to all selected in ONE onChange call', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    // Select r1 + r2 (2 rows)
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    // Open Material +% → enter 5 → commit
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-material-plus"]')!);
    const input = container.querySelector('[data-testid="v2-bulk-pct-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-pct-commit"]')!);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Position[];
    // r1 original Material = 100 → +5% = 105; r2 200 → 210; r3/r4 untouched
    expect(next.find((p) => p.id === 'r1')!.materialCost).toBe(105);
    expect(next.find((p) => p.id === 'r2')!.materialCost).toBe(210);
    expect(next.find((p) => p.id === 'r3')!.materialCost).toBe(300);
    expect(next.find((p) => p.id === 'r4')!.materialCost).toBe(400);
    // Header untouched
    expect(next.find((p) => p.id === 'h1')!.materialCost).toBe(0);
  });

  test('Bulk -10% Material applies correctly', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-material-minus"]')!);
    const input = container.querySelector('[data-testid="v2-bulk-pct-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Position[];
    // r3 original 300 → -10% = 270
    expect(next.find((p) => p.id === 'r3')!.materialCost).toBe(270);
  });

  test('Bulk +20% Min/Einheit applies', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-time-plus"]')!);
    const input = container.querySelector('[data-testid="v2-bulk-pct-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-pct-commit"]')!);
    const next = onChange.mock.calls[0][0] as Position[];
    expect(next.find((p) => p.id === 'r1')!.timeMinutes).toBe(36);  // 30 * 1.2
    expect(next.find((p) => p.id === 'r2')!.timeMinutes).toBe(72);  // 60 * 1.2
  });

  test('Bulk +15% NU-EK applies', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r3"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-nu-plus"]')!);
    const input = container.querySelector('[data-testid="v2-bulk-pct-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-pct-commit"]')!);
    const next = onChange.mock.calls[0][0] as Position[];
    expect(next.find((p) => p.id === 'r2')!.nuCost).toBe(57.5); // 50 * 1.15
    expect(next.find((p) => p.id === 'r3')!.nuCost).toBe(115);  // 100 * 1.15
    // r1 had nuCost=0 → 0 * 1.15 = 0 stays 0 (and wasn't selected, so untouched)
    expect(next.find((p) => p.id === 'r1')!.nuCost).toBe(0);
  });

  test('Bulk %-input with non-numeric value cancels gracefully', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-material-plus"]')!);
    const input = container.querySelector('[data-testid="v2-bulk-pct-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-pct-commit"]')!);
    // No onChange — invalid input is dropped
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Bulk markAs + delete
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit — markAs + delete', () => {
  test('Bulk markAs(wagnis) sets positionType for all selected', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r4"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-mark-toggle"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-mark-wagnis"]')!);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Position[];
    expect(next.find((p) => p.id === 'r1')!.positionType).toBe('wagnis');
    expect(next.find((p) => p.id === 'r4')!.positionType).toBe('wagnis');
    // Internal types must force-hide from customer view
    expect(next.find((p) => p.id === 'r1')!.visibleToCustomer).toBe(false);
    expect(next.find((p) => p.id === 'r4')!.visibleToCustomer).toBe(false);
    // r2/r3 untouched
    expect(next.find((p) => p.id === 'r2')!.positionType).toBe('standard');
    expect(next.find((p) => p.id === 'r3')!.positionType).toBe('standard');
  });

  test('Bulk delete with confirm removes selected rows', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r4"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-delete"]')!);
    expect(confirmSpy).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Position[];
    const remainingIds = next.map((p) => p.id);
    expect(remainingIds).toEqual(['h1', 'r1', 'r3']);  // r2, r4 deleted, header kept
    confirmSpy.mockRestore();
  });

  test('Bulk delete aborted when confirm returns false', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-delete"]')!);
    expect(onChange).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('Cancel button clears selection + hides bulk bar', () => {
    const { container } = renderIntern();
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).not.toBeNull();
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-cancel"]')!);
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    expect((container.querySelector('[data-testid="v2-select-row-r1"]') as HTMLInputElement).checked).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Leak guard — bulk bar never surfaces internal data in KUNDEN
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 bulk-edit — leak guard', () => {
  test('Bulk bar is NEVER present in KUNDEN render even if positions are loaded', () => {
    const { container } = renderKunden();
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
  });

  test('Selecting then switching to KUNDEN drops all bulk-bar DOM', () => {
    const fx = makeFixture();
    const { container, rerender } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r2"]')!);
    // Sanity: bar mounted with the count
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')!.textContent).toContain('2');
    rerender(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={() => {}}
        view="kunden"
        projectMeta={{
          name: fx.name, client: fx.client, service: '', tenderNumber: '',
          deadline: '', bidder: fx.bidder,
        }}
      />,
    );
    // No bar, no checkbox, no per-row selection state visible to the DOM
    expect(container.querySelector('[data-testid="v2-bulk-bar"]')).toBeNull();
    expect(container.querySelectorAll('[data-testid^="v2-select-row-"]').length).toBe(0);
  });

  test('Bulk-bar DOM does not leak internal sentinel material/time/nu values', () => {
    // Smoke check: even with the bar mounted, the only thing it shows is the
    // count + button labels. Underlying internal values stay in their cells.
    const sentinelFx: ProjectData = {
      ...makeFixture(),
      positions: [
        ...makeFixture().positions,
        {
          id: 'sentinel', oz: '02.001', shortText: 'sentinel row', longText: '',
          hinweisText: '', quantity: 1, unit: 'St', materialCost: 99999.99, timeMinutes: 88888, nuCost: 77777,
          isHeader: false, sortOrder: 6, sectionPath: '02', epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0,
          ep: 0, gp: 0, visibleToCustomer: true, positionType: 'standard',
        },
      ],
    };
    const { container } = render(
      <PositionTableV2
        positions={sentinelFx.positions}
        params={sentinelFx.calcParams}
        onChange={() => {}}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-sentinel"]')!);
    const bar = container.querySelector('[data-testid="v2-bulk-bar"]')!;
    // Bar text should NOT echo back the sentinel internal values
    expect(bar.textContent).not.toContain('99999');
    expect(bar.textContent).not.toContain('88888');
    expect(bar.textContent).not.toContain('77777');
    // It only shows the count (2) + labels
    expect(bar.textContent).toContain('2');
  });
});

// Smoke: this isn't a strict guarantee but documents the EP=Σ contract is
// preserved on bulk +%-edits.
describe('PositionTableV2 bulk-edit — recalc smoke', () => {
  test('After bulk Material +%, EP recomputes consistent with calculatePosition', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2
        positions={fx.positions}
        params={fx.calcParams}
        onChange={onChange}
        view="intern"
      />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-r1"]')!);
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-material-plus"]')!);
    fireEvent.change(container.querySelector('[data-testid="v2-bulk-pct-input"]')!, { target: { value: '5' } });
    fireEvent.click(container.querySelector('[data-testid="v2-bulk-pct-commit"]')!);
    const next = onChange.mock.calls[0][0] as Position[];
    const r1Next = next.find((p) => p.id === 'r1')!;
    const calc = calculatePosition(r1Next, fx.calcParams);
    // EP = epLohn + epMaterial + epGeraet + epNu — calc must include the bumped material
    expect(calc.epMaterial).toBeGreaterThan(100); // because 100 * (1+materialZuschlag) < 105 * (1+materialZuschlag)
  });
});
