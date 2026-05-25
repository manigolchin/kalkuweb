/**
 * Delete-protection for GAEB / Excel / preisanfrage-seeded positions.
 *
 * Rule: rows where `importedFrom` is truthy are PART OF the AG-LV and
 * cannot be deleted from the table — neither via the single-row trash
 * icon nor via bulk-delete. Mixed bulk-delete only removes the manual
 * rows + surfaces a toast about how many GAEB rows were skipped.
 *
 * Backwards-compat: pre-existing positions without `importedFrom` keep
 * the original deletable behaviour.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PositionTableV2 from '../PositionTableV2';
import { DEFAULT_CALC_PARAMS } from '../calc';
import type { Position, ProjectData } from '../types';

// react-hot-toast needs window.matchMedia which happy-dom lacks; stub it
// the same way the Firmen/Firma frontend tests do.
const toastError = vi.fn();
const toastDefault = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: Object.assign(
    (msg: string) => toastDefault(msg),
    { error: (msg: string) => toastError(msg), success: vi.fn() },
  ),
  Toaster: () => null,
}));

// happy-dom doesn't ship window.confirm — auto-accept it so bulk-delete
// runs through to its post-confirm state.
beforeEach(() => {
  // Per-test confirm spy so we can assert the message text + control return.
  // Default: yes.
  (window as unknown as { confirm: () => boolean }).confirm = () => true;
  toastError.mockClear();
  toastDefault.mockClear();
});

function mkPos(over: Partial<Position> = {}): Position {
  return {
    id: 'p-' + Math.random().toString(36).slice(2),
    oz: '',
    shortText: '',
    longText: '',
    hinweisText: '',
    quantity: 1,
    unit: 'St',
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
    positionType: 'standard',
    ...over,
  };
}

function makeFixture(): ProjectData {
  // 1 header, 2 GAEB rows, 2 Excel rows, 1 preisanfrage row, 2 manual rows.
  return {
    name: 'Mixed-source LV',
    client: '',
    service: '',
    tenderNumber: '',
    deadline: '',
    bidder: '',
    calcParams: DEFAULT_CALC_PARAMS,
    positions: [
      mkPos({ id: 'h1', oz: '01', shortText: 'KG 200', isHeader: true, sortOrder: 1 }),
      mkPos({ id: 'g1', oz: '01.001', shortText: 'Bauschuttcontainer', sortOrder: 2, importedFrom: 'gaeb' }),
      mkPos({ id: 'g2', oz: '01.002', shortText: 'Strahlgutcontainer', sortOrder: 3, importedFrom: 'gaeb' }),
      mkPos({ id: 'x1', oz: '01.003', shortText: 'Notstromaggregat', sortOrder: 4, importedFrom: 'excel' }),
      mkPos({ id: 'x2', oz: '01.004', shortText: 'Sondermüll', sortOrder: 5, importedFrom: 'excel' }),
      mkPos({ id: 'pr1', oz: '01.005', shortText: 'Verkehrssicherung', sortOrder: 6, importedFrom: 'preisanfrage' }),
      mkPos({ id: 'm1', oz: '01.006', shortText: 'Eigene Position', sortOrder: 7 /* no importedFrom = manual */ }),
      mkPos({ id: 'm2', oz: '01.007', shortText: 'Noch eine eigene', sortOrder: 8 }),
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Row trash icon — locked vs unlocked
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 import-protection — trash icon visibility', () => {
  test('GAEB row renders a LOCK icon, NOT a trash button', () => {
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={vi.fn()} view="intern" />,
    );
    expect(container.querySelector('[data-testid="v2-trash-locked-g1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-trash-g1"]')).toBeNull();
  });

  test('Excel-imported row renders a LOCK icon, NOT a trash button', () => {
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={vi.fn()} view="intern" />,
    );
    expect(container.querySelector('[data-testid="v2-trash-locked-x1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-trash-x1"]')).toBeNull();
  });

  test('preisanfrage-seeded row renders a LOCK icon', () => {
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={vi.fn()} view="intern" />,
    );
    expect(container.querySelector('[data-testid="v2-trash-locked-pr1"]')).not.toBeNull();
  });

  test('Manually-added row (no importedFrom) renders the trash BUTTON normally', () => {
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={vi.fn()} view="intern" />,
    );
    expect(container.querySelector('[data-testid="v2-trash-m1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-trash-locked-m1"]')).toBeNull();
  });

  test('Lock tooltip names the source ("GAEB", "Excel", "preisanfrage")', () => {
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={vi.fn()} view="intern" />,
    );
    const gaebLock = container.querySelector('[data-testid="v2-trash-locked-g1"]')!;
    expect(gaebLock.getAttribute('title')).toMatch(/GAEB/);
    const excelLock = container.querySelector('[data-testid="v2-trash-locked-x1"]')!;
    expect(excelLock.getAttribute('title')).toMatch(/Excel/);
    const prLock = container.querySelector('[data-testid="v2-trash-locked-pr1"]')!;
    expect(prLock.getAttribute('title')).toMatch(/preisanfrage/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Manual single-row delete still works
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 import-protection — single-row delete', () => {
  test('Clicking trash on a MANUAL row removes it via onChange', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-trash-m1"]')!);
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0] as Position[];
    expect(next.find((p) => p.id === 'm1')).toBeUndefined();
    // The GAEB / Excel / preisanfrage rows survive
    expect(next.some((p) => p.id === 'g1')).toBe(true);
    expect(next.some((p) => p.id === 'x1')).toBe(true);
    expect(next.some((p) => p.id === 'pr1')).toBe(true);
  });

  test('Cannot fire trash on a GAEB row (no button to click — lock-icon is a span)', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={onChange} view="intern" />,
    );
    const lock = container.querySelector('[data-testid="v2-trash-locked-g1"]')! as HTMLElement;
    // It's a <span>, not a <button>. Click should be a no-op.
    expect(lock.tagName.toLowerCase()).toBe('span');
    fireEvent.click(lock);
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Bulk delete — protected rows are silently skipped
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 import-protection — bulk delete', () => {
  test('Bulk-delete with ONLY GAEB rows selected → shows error toast, removes nothing', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container, getByTestId } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-g1"]') as Element);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-g2"]') as Element);
    fireEvent.click(getByTestId('v2-bulk-delete'));
    expect(onChange).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledOnce();
    expect(toastError.mock.calls[0][0]).toMatch(/2 Positionen sind aus dem GAEB.*kann nicht gelöscht/i);
  });

  test('Bulk-delete with MIXED selection removes MANUAL rows only, surfaces skip-count toast', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container, getByTestId } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={onChange} view="intern" />,
    );
    // 2 GAEB + 1 Excel + 1 preisanfrage + 2 manual = 6 selected
    for (const id of ['g1', 'g2', 'x1', 'pr1', 'm1', 'm2']) {
      fireEvent.click(container.querySelector(`[data-testid="v2-select-row-${id}"]`) as Element);
    }
    fireEvent.click(getByTestId('v2-bulk-delete'));
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0] as Position[];
    // Both manual rows gone
    expect(next.some((p) => p.id === 'm1')).toBe(false);
    expect(next.some((p) => p.id === 'm2')).toBe(false);
    // ALL 4 protected rows survive
    for (const id of ['g1', 'g2', 'x1', 'pr1']) {
      expect(next.some((p) => p.id === id)).toBe(true);
    }
    // Toast announces how many were skipped
    expect(toastDefault).toHaveBeenCalledOnce();
    expect(toastDefault.mock.calls[0][0]).toMatch(/4 GAEB-Positionen übersprungen/i);
  });

  test('Bulk-delete with ONLY manual rows selected → no skip toast, no error toast', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    const { container, getByTestId } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-m1"]') as Element);
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-m2"]') as Element);
    fireEvent.click(getByTestId('v2-bulk-delete'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(toastError).not.toHaveBeenCalled();
    expect(toastDefault).not.toHaveBeenCalled();
  });

  test('Bulk-delete confirm CANCELLED → no row removed even if all are manual', () => {
    const onChange = vi.fn();
    const fx = makeFixture();
    (window as unknown as { confirm: () => boolean }).confirm = () => false;
    const { container, getByTestId } = render(
      <PositionTableV2 positions={fx.positions} params={fx.calcParams} onChange={onChange} view="intern" />,
    );
    fireEvent.click(container.querySelector('[data-testid="v2-select-row-m1"]') as Element);
    fireEvent.click(getByTestId('v2-bulk-delete'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Backwards-compat — rows without `importedFrom` behave as before
// ────────────────────────────────────────────────────────────────────────────

describe('PositionTableV2 import-protection — backwards compat', () => {
  test('Position created before this change (no importedFrom) is freely deletable', () => {
    const onChange = vi.fn();
    // Synthesise a position WITHOUT importedFrom — simulates pre-Round-13 row
    const legacyPos: Position = mkPos({ id: 'legacy', oz: '01.001', shortText: 'Legacy' });
    expect((legacyPos as { importedFrom?: string }).importedFrom).toBeUndefined();
    const { container } = render(
      <PositionTableV2
        positions={[legacyPos]}
        params={DEFAULT_CALC_PARAMS}
        onChange={onChange}
        view="intern"
      />,
    );
    // Trash button (not lock) renders
    expect(container.querySelector('[data-testid="v2-trash-legacy"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v2-trash-locked-legacy"]')).toBeNull();
    fireEvent.click(container.querySelector('[data-testid="v2-trash-legacy"]')!);
    expect(onChange).toHaveBeenCalledOnce();
    expect((onChange.mock.calls[0][0] as Position[]).length).toBe(0);
  });
});
