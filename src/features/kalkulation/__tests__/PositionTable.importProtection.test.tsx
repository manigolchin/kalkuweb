/**
 * Delete-protection for GAEB / Excel / preisanfrage-seeded positions —
 * V1 (classic) PositionTable.
 *
 * V1 is the DEFAULT table (kalku.tableVersion defaults to 'v1'), so the
 * protection added to PositionTableV2 was invisible to anyone who hadn't
 * opted into v2. This suite mirrors the V2 contract for the classic table:
 * rows where `importedFrom` is truthy render a disabled LOCK instead of a
 * trash button and cannot be deleted. Manual rows (no `importedFrom`)
 * stay freely deletable.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PositionTable from '../PositionTable';
import { DEFAULT_CALC_PARAMS } from '../calc';
import type { Position } from '../types';

// react-hot-toast needs window.matchMedia which happy-dom lacks; stub it
// the same way the V2 protection test does.
const toastError = vi.fn();
const toastDefault = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: Object.assign(
    (msg: string) => toastDefault(msg),
    { error: (msg: string) => toastError(msg), success: vi.fn() },
  ),
  Toaster: () => null,
}));

// V1 PositionTable loads templates on mount — stub the api so the fetch
// doesn't reject in happy-dom.
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      templates: {
        ...actual.api.templates,
        list: vi.fn().mockResolvedValue({ templates: [] }),
      },
    },
  };
});

beforeEach(() => {
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

function fixture(): Position[] {
  return [
    mkPos({ id: 'g1', oz: '01.001', shortText: 'Bauschuttcontainer', sortOrder: 1, importedFrom: 'gaeb' }),
    mkPos({ id: 'x1', oz: '01.002', shortText: 'Notstromaggregat', sortOrder: 2, importedFrom: 'excel' }),
    mkPos({ id: 'pr1', oz: '01.003', shortText: 'Verkehrssicherung', sortOrder: 3, importedFrom: 'preisanfrage' }),
    mkPos({ id: 'm1', oz: '01.004', shortText: 'Eigene Position', sortOrder: 4 /* manual */ }),
  ];
}

describe('PositionTable (V1) import-protection — trash icon visibility', () => {
  test('GAEB / Excel / preisanfrage rows render a LOCK, NOT a trash button', () => {
    const { container } = render(
      <PositionTable positions={fixture()} params={DEFAULT_CALC_PARAMS} onChange={vi.fn()} />,
    );
    for (const id of ['g1', 'x1', 'pr1']) {
      expect(container.querySelector(`[data-testid="v1-trash-locked-${id}"]`)).not.toBeNull();
      expect(container.querySelector(`[data-testid="v1-trash-${id}"]`)).toBeNull();
    }
  });

  test('Manual row (no importedFrom) renders the trash BUTTON normally', () => {
    const { container } = render(
      <PositionTable positions={fixture()} params={DEFAULT_CALC_PARAMS} onChange={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="v1-trash-m1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v1-trash-locked-m1"]')).toBeNull();
  });

  test('Lock tooltip names the source ("GAEB", "Excel", "preisanfrage")', () => {
    const { container } = render(
      <PositionTable positions={fixture()} params={DEFAULT_CALC_PARAMS} onChange={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="v1-trash-locked-g1"]')!.getAttribute('title')).toMatch(/GAEB/);
    expect(container.querySelector('[data-testid="v1-trash-locked-x1"]')!.getAttribute('title')).toMatch(/Excel/);
    expect(container.querySelector('[data-testid="v1-trash-locked-pr1"]')!.getAttribute('title')).toMatch(/preisanfrage/);
  });
});

describe('PositionTable (V1) import-protection — single-row delete', () => {
  test('Clicking trash on a MANUAL row removes it; imported rows survive', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PositionTable positions={fixture()} params={DEFAULT_CALC_PARAMS} onChange={onChange} />,
    );
    fireEvent.click(container.querySelector('[data-testid="v1-trash-m1"]')!);
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0] as Position[];
    expect(next.some((p) => p.id === 'm1')).toBe(false);
    for (const id of ['g1', 'x1', 'pr1']) {
      expect(next.some((p) => p.id === id)).toBe(true);
    }
  });

  test('Imported-row lock is a non-clickable <span> — clicking it is a no-op', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PositionTable positions={fixture()} params={DEFAULT_CALC_PARAMS} onChange={onChange} />,
    );
    const lock = container.querySelector('[data-testid="v1-trash-locked-g1"]')! as HTMLElement;
    expect(lock.tagName.toLowerCase()).toBe('span');
    fireEvent.click(lock);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('PositionTable (V1) import-protection — backwards compat', () => {
  test('Legacy row (no importedFrom) renders trash button and is deletable', () => {
    const onChange = vi.fn();
    const legacy = mkPos({ id: 'legacy', oz: '01.001', shortText: 'Legacy' });
    expect((legacy as { importedFrom?: string }).importedFrom).toBeUndefined();
    const { container } = render(
      <PositionTable positions={[legacy]} params={DEFAULT_CALC_PARAMS} onChange={onChange} />,
    );
    expect(container.querySelector('[data-testid="v1-trash-legacy"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="v1-trash-locked-legacy"]')).toBeNull();
    fireEvent.click(container.querySelector('[data-testid="v1-trash-legacy"]')!);
    expect(onChange).toHaveBeenCalledOnce();
    expect((onChange.mock.calls[0][0] as Position[]).length).toBe(0);
  });
});
