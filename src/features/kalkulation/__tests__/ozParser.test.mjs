/**
 * Tests for ozParser.mjs — runnable with `npm run test` (Node ≥ 20 built-in
 * `node:test` runner, no install needed).
 *
 * Covers the position-number tolerance scenarios from the user's brief AND
 * the column-C overload classifier (group vs. position).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
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
      ' 1. 4. 1.  .   1',   // example 1 (4-level), real string with empty parent segment
      ' 1.4.1.1',           // no padding
      '1.4.1.1',            // no leading space
      ' 1. 4. 1.   .  1',   // irregular padding
    ];
    for (const v of variants) {
      assert.equal(ozKey(v), '1.4.1.1', `failed for variant ${JSON.stringify(v)}`);
    }
  });

  test('flat numbering (example 2): "Pos. 1" → ["Pos","1"], key "Pos.1"', () => {
    assert.deepEqual(ozSegments('Pos. 1'), ['Pos', '1']);
    assert.equal(ozKey('Pos. 1'), 'Pos.1');
  });

  test('number-only (example 3): " .  .  10" → ["10"], level 1', () => {
    assert.deepEqual(ozSegments(' .  .  10'), ['10']);
    assert.equal(ozLevel(' .  .  10'), 1);
  });

  test('empty / buffer rows resolve to level 0', () => {
    assert.equal(ozLevel(''), 0);
    assert.equal(ozLevel(null), 0);
    assert.equal(ozLevel(undefined), 0);
    assert.equal(ozLevel('   '), 0);
  });

  test('group headers: " 1. 4" stays as 2 segments', () => {
    assert.deepEqual(ozSegments(' 1. 4'), ['1', '4']);
    assert.equal(ozLevel(' 1. 4'), 2);
  });
});

describe('classifyRow — column-C overload', () => {
  test('level-2 group row: C carries the subtotal, D/E/F empty → "group"', () => {
    // From example 1, row 15: " 1. 4" | "KG 440 Starkstromanlagen" | 718276.67 | _ | _ | _
    const row = {
      oz: ' 1. 4',
      B: 'KG 440 Starkstromanlagen',
      C: 718276.67,  // overloaded — group total
      D: null,
      E: null,
      F: null,
    };
    assert.equal(classifyRow(row), 'group');
  });

  test('level-4 position row: full A-F filled → "position"', () => {
    // From example 1, row 18: " 1. 4. 1.  .   1" | "Überwachungs..." | 1 | "St" | 1666.83 | 1666.83
    const row = {
      oz: ' 1. 4. 1.  .   1',
      B: 'Überwachungszentrale Einzelbatterieleuchten',
      C: 1,           // Menge
      D: 'St',        // Einheit
      E: 1666.83,     // EP
      F: 1666.83,     // GP
    };
    assert.equal(classifyRow(row), 'position');
  });

  test('level-3 sub-group: " 1. 4. 1" with all C/D/E empty → "group"', () => {
    const row = {
      oz: ' 1. 4. 1',
      B: 'KG 442 Sicherheitsbeleuchtung',
      C: null, D: null, E: null, F: null,
    };
    assert.equal(classifyRow(row), 'group');
  });

  test('buffer row: empty OZ with description-only → "buffer"', () => {
    const row = {
      oz: '',
      B: 'Sicherheitsbeleuchtung',
      I: 0, J: '-', K: '-', L: '-',
    };
    assert.equal(classifyRow(row), 'buffer');
  });
});

describe('isErrorCell — formula-error detection', () => {
  test('Excel error cells (t==="e") are detected', () => {
    assert.equal(isErrorCell({ t: 'e', v: '#VALUE!' }), true);
    assert.equal(isErrorCell({ t: 'e', v: '#REF!' }), true);
    assert.equal(isErrorCell({ t: 'e', v: 15, f: 'schlitz+Q2*querschnitt' }), true);
  });

  test('string-literal error values are detected (defensive)', () => {
    assert.equal(isErrorCell({ t: 's', v: '#VALUE!' }), true);
    assert.equal(isErrorCell({ t: 's', v: '#REF!' }), true);
    assert.equal(isErrorCell({ t: 's', v: '#DIV/0!' }), true);
    assert.equal(isErrorCell({ t: 's', v: '#N/A' }), true);
    assert.equal(isErrorCell({ t: 's', v: '#NAME?' }), true);
  });

  test('clean numeric / string / null cells are NOT errors', () => {
    assert.equal(isErrorCell({ t: 'n', v: 123.45 }), false);
    assert.equal(isErrorCell({ t: 's', v: 'Bezeichnung' }), false);
    assert.equal(isErrorCell({ t: 's', v: '' }), false);
    assert.equal(isErrorCell(null), false);
    assert.equal(isErrorCell(undefined), false);
  });
});
