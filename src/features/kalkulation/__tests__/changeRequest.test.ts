import { describe, test, expect } from 'vitest';
import { formatEUR } from '../calc';
import {
  parseDeNumber,
  formatChangeValue,
  unitFor,
  globalCurrentValue,
  positionCurrentValue,
  availableFields,
  assembleChangeRequests,
  rollupChangeRequests,
  formatSignedEUR,
  draftsToBasketItems,
  basketItemToInput,
} from '../changeRequest';
import type { ShareCalcSummary, CustomerViewPayload, InboxChangeRequest } from '../types';

function cr(over: Partial<InboxChangeRequest>): InboxChangeRequest {
  return {
    id: 'x', scope: 'position', positionOz: '1.1', shortText: 'X', field: 'gesamtpreis',
    unit: 'eur', currentValue: null, requestedValue: null, direction: 'unspecified',
    note: '', authorName: null, createdAt: '2026-05-20T00:00:00Z', resolvedAt: null, ...over,
  };
}

const summary: ShareCalcSummary = {
  netto: 800, mwst: 152, brutto: 952, totalHours: 2.4, ekTotal: 600, ueberschuss: 200,
  costTypes: {
    lohn: { ek: 150, vk: 200, zuschlagPct: 0.33, differnz: 50 },
    material: { ek: 446, vk: 500, zuschlagPct: 0.12, differnz: 54 },
    geraete: { ek: 90, vk: 100, zuschlagPct: 0.11, differnz: 10 },
    nu: { ek: 0, vk: 0, zuschlagPct: 0, differnz: 0 },
  },
  mitarbeiter: 3, arbeitstage: 0.1, monate: 0,
};

const pos = {
  id: 'p1', oz: '1.1', shortText: 'X', longText: '', quantity: 4, unit: 'St',
  isHeader: false, sortOrder: 1, ep: 200, gp: 800,
  gpLohn: 200, gpMaterial: 500, gpGeraet: 100, gpNu: 0,
} as CustomerViewPayload['positions'][number];

describe('changeRequest — number parse/format', () => {
  test('parseDeNumber handles German formatting', () => {
    expect(parseDeNumber('1.234,56')).toBeCloseTo(1234.56);
    expect(parseDeNumber('950')).toBe(950);
    expect(parseDeNumber('')).toBeNull();
    expect(parseDeNumber('  ')).toBeNull();
    expect(parseDeNumber('abc')).toBeNull();
  });

  test('formatChangeValue per unit', () => {
    expect(formatChangeValue(1071.54, 'eur')).toBe(formatEUR(1071.54));
    expect(formatChangeValue(60, 'min')).toBe('60 min');
    expect(formatChangeValue(2.4, 'std')).toBe('2,4 Std.');
    expect(formatChangeValue(4, 'qty')).toBe('4,00');
    expect(formatChangeValue(null, 'eur')).toBe('—');
    expect(formatChangeValue(undefined, 'min')).toBe('—');
  });

  test('unitFor mirrors the server', () => {
    expect(unitFor('global', 'zeit')).toBe('std');
    expect(unitFor('position', 'zeit')).toBe('min');
    expect(unitFor('position', 'menge')).toBe('qty');
    expect(unitFor('global', 'endbetrag')).toBe('eur');
    expect(unitFor('position', 'material')).toBe('eur');
  });
});

describe('changeRequest — current value lifting', () => {
  test('globalCurrentValue reads the summary', () => {
    expect(globalCurrentValue('endbetrag', summary)).toBe(800);
    expect(globalCurrentValue('lohn', summary)).toBe(200);
    expect(globalCurrentValue('material', summary)).toBe(500);
    expect(globalCurrentValue('geraete', summary)).toBe(100);
    expect(globalCurrentValue('zeit', summary)).toBe(2.4);
    expect(globalCurrentValue('sonstiges', summary)).toBeNull();
    expect(globalCurrentValue('endbetrag', null)).toBeNull();
  });

  test('positionCurrentValue reads the position', () => {
    expect(positionCurrentValue('menge', pos)).toBe(4);
    expect(positionCurrentValue('gesamtpreis', pos)).toBe(800);
    expect(positionCurrentValue('material', pos)).toBe(500);
    expect(positionCurrentValue('geraete', pos)).toBe(100);
    expect(positionCurrentValue('lohn', pos)).toBe(200);
    expect(positionCurrentValue('zeit', pos)).toBeNull(); // minutes not shown
    expect(positionCurrentValue('sonstiges', pos)).toBeNull();
  });
});

describe('changeRequest — availableFields respects visibility', () => {
  test('global with full visibility', () => {
    const f = availableFields('global', { showTotals: true, showCostBreakdown: true, showCalculation: true });
    expect(f).toEqual(['endbetrag', 'lohn', 'material', 'geraete', 'zeit', 'sonstiges']);
  });
  test('global hides cost types when breakdown is off', () => {
    const f = availableFields('global', { showTotals: true, showCostBreakdown: false, showCalculation: false });
    expect(f).toEqual(['endbetrag', 'sonstiges']);
  });
  test('position always offers Menge + Gesamtpreis; cost types gated by breakdown', () => {
    expect(availableFields('position', { showCostBreakdown: true, showCalculation: true, showTotals: true }))
      .toEqual(['menge', 'gesamtpreis', 'lohn', 'material', 'geraete', 'sonstiges']);
    expect(availableFields('position', { showCostBreakdown: false, showCalculation: true, showTotals: true }))
      .toEqual(['menge', 'gesamtpreis', 'sonstiges']);
  });
});

describe('changeRequest — assembleChangeRequests', () => {
  test('builds wire items + drops empty drafts', () => {
    const items = assembleChangeRequests('position', '1.1', {
      material: { requestedValue: '400', note: 'zu teuer' },
      menge: { requestedValue: '', note: '' }, // empty → dropped
      lohn: { requestedValue: '', direction: 'lower', note: '' },
    });
    expect(items).toHaveLength(2);
    const mat = items.find((i) => i.field === 'material')!;
    expect(mat).toMatchObject({ scope: 'position', positionOz: '1.1', field: 'material', requestedValue: 400, note: 'zu teuer' });
    const lohn = items.find((i) => i.field === 'lohn')!;
    expect(lohn).toMatchObject({ field: 'lohn', requestedValue: null, direction: 'lower' });
  });

  test('global items carry no positionOz', () => {
    const items = assembleChangeRequests('global', undefined, {
      endbetrag: { requestedValue: '750', note: '' },
    });
    expect(items).toEqual([
      { scope: 'global', positionOz: undefined, field: 'endbetrag', requestedValue: 750, direction: undefined, note: undefined },
    ]);
  });
});

describe('changeRequest — rollupChangeRequests (negotiation summary)', () => {
  test('global Endbetrag delta', () => {
    const r = rollupChangeRequests([
      cr({ scope: 'global', positionOz: null, field: 'endbetrag', currentValue: 800, requestedValue: 750 }),
    ]);
    expect(r.endbetragRequested).toBe(750);
    expect(r.endbetragDelta).toBe(-50);
    expect(r.positionsDelta).toBeNull();
    expect(r.count).toBe(1);
    expect(r.open).toBe(1);
  });

  test('positions delta sums distinct positions', () => {
    const r = rollupChangeRequests([
      cr({ id: 'a', positionOz: '1.1', field: 'gesamtpreis', currentValue: 800, requestedValue: 700 }),
      cr({ id: 'b', positionOz: '1.2', field: 'material', currentValue: 500, requestedValue: 400 }),
    ]);
    expect(r.positionsDelta).toBe(-200);
  });

  test('gesamtpreis overrides cost-type of the same position (no double count)', () => {
    const r = rollupChangeRequests([
      cr({ id: 'a', positionOz: '1.1', field: 'gesamtpreis', currentValue: 800, requestedValue: 700 }),
      cr({ id: 'b', positionOz: '1.1', field: 'material', currentValue: 500, requestedValue: 400 }),
    ]);
    expect(r.positionsDelta).toBe(-100); // only the gesamtpreis line delta
  });

  test('direction-only wishes carry no € but still count', () => {
    const r = rollupChangeRequests([
      cr({ id: 'a', positionOz: '1.1', field: 'lohn', currentValue: null, requestedValue: null, direction: 'lower' }),
    ]);
    expect(r.positionsDelta).toBeNull();
    expect(r.endbetragDelta).toBeNull();
    expect(r.count).toBe(1);
  });

  test('open excludes resolved', () => {
    const r = rollupChangeRequests([
      cr({ id: 'a', resolvedAt: '2026-05-21T00:00:00Z' }),
      cr({ id: 'b' }),
    ]);
    expect(r.count).toBe(2);
    expect(r.open).toBe(1);
  });

  test('formatSignedEUR shows the sign', () => {
    expect(formatSignedEUR(-50)).toContain('−');
    expect(formatSignedEUR(-50)).toContain('50,00');
    expect(formatSignedEUR(120)).toContain('+');
  });
});

describe('changeRequest — Wunsch-Korb helpers', () => {
  test('draftsToBasketItems builds rich items + basketItemToInput round-trips', () => {
    const items = draftsToBasketItems(
      'position',
      { material: { requestedValue: '400', note: 'zu teuer' } },
      { positionOz: '1.1', where: '1.1 · Y', currentValueFor: () => 500 },
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      scope: 'position', positionOz: '1.1', where: '1.1 · Y', field: 'material',
      unit: 'eur', currentValue: 500, requestedValue: 400, note: 'zu teuer',
    });
    expect(items[0].key).toBeTruthy();
    expect(basketItemToInput(items[0])).toEqual({
      scope: 'position', positionOz: '1.1', field: 'material', requestedValue: 400, direction: undefined, note: 'zu teuer',
    });
  });

  test('global basket items drop the positionOz on conversion', () => {
    const items = draftsToBasketItems(
      'global',
      { endbetrag: { requestedValue: '', direction: 'lower', note: '' } },
      { where: 'Gesamtangebot', currentValueFor: () => 800 },
    );
    expect(items[0]).toMatchObject({ scope: 'global', field: 'endbetrag', unit: 'eur', currentValue: 800, direction: 'lower' });
    expect(basketItemToInput(items[0]).positionOz).toBeUndefined();
  });
});
