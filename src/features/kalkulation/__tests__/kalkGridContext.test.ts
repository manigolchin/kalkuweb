/**
 * Pure unit tests for the KalkGrid coordinate/navigation/point-mode helpers.
 * No React/DOM — exercises the tricky neighbour + smart-`+` logic directly.
 */

import { describe, test, expect } from 'vitest';
import {
  MAIN_COLS,
  F_COLS,
  fullCols,
  nextCoord,
  tabCoord,
  tokenForCol,
  shouldPrependPlus,
  coordKey,
  sameCoord,
  isFCol,
  type RowDescriptor,
} from '../kalkGridContext';

const ROWS_CLOSED: RowDescriptor[] = [
  { rowId: 'a', hasPreCalc: false },
  { rowId: 'b', hasPreCalc: false },
  { rowId: 'c', hasPreCalc: false },
];

const ROWS_MIXED: RowDescriptor[] = [
  { rowId: 'a', hasPreCalc: true },
  { rowId: 'b', hasPreCalc: false },
  { rowId: 'c', hasPreCalc: true },
];

describe('fullCols', () => {
  test('closed strip → 6 main cols only', () => {
    expect(fullCols({ rowId: 'x', hasPreCalc: false })).toEqual([...MAIN_COLS]);
    expect(fullCols({ rowId: 'x', hasPreCalc: false })).toHaveLength(6);
  });
  test('open strip → 6 main + 7 F cols', () => {
    const cols = fullCols({ rowId: 'x', hasPreCalc: true });
    expect(cols).toHaveLength(13);
    expect(cols).toEqual([...MAIN_COLS, ...F_COLS]);
  });
});

describe('coordKey / sameCoord / isFCol', () => {
  test('coordKey is stable + unique per coord', () => {
    expect(coordKey({ rowId: 'r1', col: 'material' })).toBe('r1::material');
    expect(coordKey({ rowId: 'r1', col: 'F3' })).toBe('r1::F3');
  });
  test('sameCoord', () => {
    expect(sameCoord({ rowId: 'a', col: 'F1' }, { rowId: 'a', col: 'F1' })).toBe(true);
    expect(sameCoord({ rowId: 'a', col: 'F1' }, { rowId: 'a', col: 'F2' })).toBe(false);
    expect(sameCoord(null, { rowId: 'a', col: 'F1' })).toBe(false);
  });
  test('isFCol', () => {
    expect(isFCol('F1')).toBe(true);
    expect(isFCol('F7')).toBe(true);
    expect(isFCol('material')).toBe(false);
  });
});

describe('nextCoord — horizontal', () => {
  test('right moves within the row', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'a', col: 'material' }, 'right')).toEqual({
      rowId: 'a',
      col: 'time',
    });
  });
  test('left moves within the row', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'a', col: 'time' }, 'left')).toEqual({
      rowId: 'a',
      col: 'material',
    });
  });
  test('left clamps at the first column (no row wrap)', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'a', col: 'material' }, 'left')).toBeNull();
  });
  test('right clamps at the last column (no row wrap)', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'a', col: 'epLohn' }, 'right')).toBeNull();
  });
  test('right enters the F-strip when open', () => {
    expect(nextCoord(ROWS_MIXED, { rowId: 'a', col: 'epLohn' }, 'right')).toEqual({
      rowId: 'a',
      col: 'F1',
    });
  });
});

describe('nextCoord — vertical', () => {
  test('down → same main column in the next row', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'a', col: 'nu' }, 'down')).toEqual({
      rowId: 'b',
      col: 'nu',
    });
  });
  test('up → same main column in the previous row', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'b', col: 'nu' }, 'up')).toEqual({
      rowId: 'a',
      col: 'nu',
    });
  });
  test('up clamps at the top row', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'a', col: 'material' }, 'up')).toBeNull();
  });
  test('down clamps at the bottom row', () => {
    expect(nextCoord(ROWS_CLOSED, { rowId: 'c', col: 'material' }, 'down')).toBeNull();
  });
  test('down from an F-col clamps when the next row strip is closed', () => {
    // row a (open) F2 → row b (closed) has no F2 → clamp
    expect(nextCoord(ROWS_MIXED, { rowId: 'a', col: 'F2' }, 'down')).toBeNull();
  });
  test('F-col vertical nav works when both rows have the strip open', () => {
    const rows: RowDescriptor[] = [
      { rowId: 'a', hasPreCalc: true },
      { rowId: 'b', hasPreCalc: true },
    ];
    expect(nextCoord(rows, { rowId: 'a', col: 'F4' }, 'down')).toEqual({ rowId: 'b', col: 'F4' });
  });
});

describe('tabCoord', () => {
  test('tab wraps to the first column of the next row', () => {
    expect(tabCoord(ROWS_CLOSED, { rowId: 'a', col: 'epLohn' }, false)).toEqual({
      rowId: 'b',
      col: 'material',
    });
  });
  test('shift+tab wraps to the last column of the previous row', () => {
    expect(tabCoord(ROWS_CLOSED, { rowId: 'b', col: 'material' }, true)).toEqual({
      rowId: 'a',
      col: 'epLohn',
    });
  });
  test('tab clamps at the very last cell of the grid', () => {
    expect(tabCoord(ROWS_CLOSED, { rowId: 'c', col: 'epLohn' }, false)).toBeNull();
  });
  test('shift+tab clamps at the very first cell of the grid', () => {
    expect(tabCoord(ROWS_CLOSED, { rowId: 'a', col: 'material' }, true)).toBeNull();
  });
  test('tab wraps onto an open F-strip row landing on its first col', () => {
    // last col of row b (closed) is epLohn; tab → row c (open) first col = material
    expect(tabCoord(ROWS_MIXED, { rowId: 'b', col: 'epLohn' }, false)).toEqual({
      rowId: 'c',
      col: 'material',
    });
  });
});

describe('tokenForCol', () => {
  test('F-columns map to their token', () => {
    expect(tokenForCol('F1')).toBe('F1');
    expect(tokenForCol('F7')).toBe('F7');
  });
  test('main cost columns are not referenceable', () => {
    for (const c of MAIN_COLS) expect(tokenForCol(c)).toBeNull();
  });
});

describe('shouldPrependPlus', () => {
  test('empty / whitespace → no plus', () => {
    expect(shouldPrependPlus('')).toBe(false);
    expect(shouldPrependPlus('   ')).toBe(false);
  });
  test('after an operand (number / reference / paren) → plus', () => {
    expect(shouldPrependPlus('F1')).toBe(true);
    expect(shouldPrependPlus('50')).toBe(true);
    expect(shouldPrependPlus('Q')).toBe(true);
    expect(shouldPrependPlus('schlitz')).toBe(true);
    expect(shouldPrependPlus(')')).toBe(true);
    expect(shouldPrependPlus('F1 ')).toBe(true); // trailing space trimmed
  });
  test('after an operator / open-paren → no plus', () => {
    expect(shouldPrependPlus('F1+')).toBe(false);
    expect(shouldPrependPlus('F1 * ')).toBe(false);
    expect(shouldPrependPlus('(')).toBe(false);
    expect(shouldPrependPlus('2 - ')).toBe(false);
  });
});
