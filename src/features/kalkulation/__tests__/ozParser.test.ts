/**
 * Vitest port of ozParser.test.mjs. Assertions identical — we just import
 * via the TS path resolver and use vitest's describe/test/expect.
 */

import { describe, test, expect } from 'vitest';
import {
  ozSegments,
  ozKey,
  ozLevel,
  classifyRow,
  isErrorCell,
} from '../ozParser.mjs';

describe('ozParser — whitespace tolerance', () => {
  test('all real-file whitespace variants resolve to the same key 1.4.1.1', () => {
    const variants = [
      ' 1. 4. 1.  .   1',
      ' 1.4.1.1',
      '1.4.1.1',
      ' 1. 4. 1.   .  1',
    ];
    for (const v of variants) {
      expect(ozKey(v), `variant ${JSON.stringify(v)}`).toBe('1.4.1.1');
    }
  });

  test('flat numbering (example 2): "Pos. 1" → ["Pos","1"], key "Pos.1"', () => {
    expect(ozSegments('Pos. 1')).toEqual(['Pos', '1']);
    expect(ozKey('Pos. 1')).toBe('Pos.1');
  });

  test('number-only (example 3): " .  .  10" → ["10"], level 1', () => {
    expect(ozSegments(' .  .  10')).toEqual(['10']);
    expect(ozLevel(' .  .  10')).toBe(1);
  });

  test('empty / buffer rows resolve to level 0', () => {
    expect(ozLevel('')).toBe(0);
    expect(ozLevel(null)).toBe(0);
    expect(ozLevel(undefined)).toBe(0);
    expect(ozLevel('   ')).toBe(0);
  });

  test('group headers: " 1. 4" stays as 2 segments', () => {
    expect(ozSegments(' 1. 4')).toEqual(['1', '4']);
    expect(ozLevel(' 1. 4')).toBe(2);
  });
});

describe('classifyRow — column-C overload', () => {
  test('level-2 group row: C carries the subtotal, D/E/F empty → "group"', () => {
    expect(classifyRow({
      oz: ' 1. 4',
      B: 'KG 440 Starkstromanlagen',
      C: 718276.67,
      D: null, E: null, F: null,
    })).toBe('group');
  });

  test('level-4 position row: full A-F filled → "position"', () => {
    expect(classifyRow({
      oz: ' 1. 4. 1.  .   1',
      B: 'Überwachungszentrale Einzelbatterieleuchten',
      C: 1,
      D: 'St',
      E: 1666.83,
      F: 1666.83,
    })).toBe('position');
  });

  test('level-3 sub-group: " 1. 4. 1" with all C/D/E empty → "group"', () => {
    expect(classifyRow({
      oz: ' 1. 4. 1',
      B: 'KG 442 Sicherheitsbeleuchtung',
      C: null, D: null, E: null, F: null,
    })).toBe('group');
  });

  test('buffer row: empty OZ with description-only → "buffer"', () => {
    expect(classifyRow({
      oz: '',
      B: 'Sicherheitsbeleuchtung',
    })).toBe('buffer');
  });
});

describe('isErrorCell — formula-error detection', () => {
  test('Excel error cells (t==="e") are detected', () => {
    expect(isErrorCell({ t: 'e', v: '#VALUE!' })).toBe(true);
    expect(isErrorCell({ t: 'e', v: '#REF!' })).toBe(true);
    expect(isErrorCell({ t: 'e', v: 15, f: 'schlitz+Q2*querschnitt' })).toBe(true);
  });

  test('string-literal error values are detected (defensive)', () => {
    expect(isErrorCell({ t: 's', v: '#VALUE!' })).toBe(true);
    expect(isErrorCell({ t: 's', v: '#REF!' })).toBe(true);
    expect(isErrorCell({ t: 's', v: '#DIV/0!' })).toBe(true);
    expect(isErrorCell({ t: 's', v: '#N/A' })).toBe(true);
    expect(isErrorCell({ t: 's', v: '#NAME?' })).toBe(true);
  });

  test('clean numeric / string / null cells are NOT errors', () => {
    expect(isErrorCell({ t: 'n', v: 123.45 })).toBe(false);
    expect(isErrorCell({ t: 's', v: 'Bezeichnung' })).toBe(false);
    expect(isErrorCell({ t: 's', v: '' })).toBe(false);
    expect(isErrorCell(null)).toBe(false);
    expect(isErrorCell(undefined)).toBe(false);
  });
});
