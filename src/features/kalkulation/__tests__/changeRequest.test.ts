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
} from '../changeRequest';
import type { ShareCalcSummary, CustomerViewPayload } from '../types';

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
