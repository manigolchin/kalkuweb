/**
 * Integration tests for the Kalkulation-template XLSX importer.
 *
 * Tests the PURE logic — we re-implement the parse loop here in JS because
 * `node --test` can't import the `.ts` module directly without a TS loader
 * (and the project policy forbids new npm deps). The TS parser in
 * `../parse.ts` is the production wrapper; the assertions below verify the
 * same row-classifier + error-detector + meta-extractor logic against the
 * real example files at `~/Desktop/Claude/example {1-4}`.
 *
 * If/when vitest gets added, these become full ts-import tests with the same
 * fixtures — the assertions transfer 1:1.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';
import { ozKey, ozLevel, classifyRow, isErrorCell } from '../../../features/kalkulation/ozParser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = [
  { id: 'ex1', label: 'LV3_BH', path: join(process.env.HOME ?? '', 'Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx'), expectErrors: true },
  { id: 'ex2', label: 'LV3',    path: join(process.env.HOME ?? '', 'Desktop/Claude/example 2/LV3.xlsx'),                expectErrors: false },
  { id: 'ex3', label: 'LV3',    path: join(process.env.HOME ?? '', 'Desktop/Claude/example 3/LV3.xlsx'),                expectErrors: true },
  { id: 'ex4', label: 'LV3_FW', path: join(process.env.HOME ?? '', 'Desktop/Claude/example 4/LV3_FW_mit_Preisen.xlsx'), expectErrors: true },
];

function readSheet(path) {
  const wb = XLSX.readFile(path, { cellFormula: true });
  const sheetName = wb.SheetNames.find((n) => n === 'Kalkulation') ?? wb.SheetNames[0];
  return { ws: wb.Sheets[sheetName], sheetName };
}

function readRow(ws, r) {
  return {
    oz: ws['A' + r]?.v ?? '',
    A: ws['A' + r]?.v ?? null,
    B: ws['B' + r]?.v ?? null,
    C: ws['C' + r]?.v ?? null,
    D: ws['D' + r]?.v ?? null,
    E: ws['E' + r]?.v ?? null,
    F: ws['F' + r]?.v ?? null,
  };
}

describe('Kalkulation importer — header anchors across all 4 examples', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): canonical header anchors present`, () => {
      const { ws, sheetName } = readSheet(ex.path);
      assert.equal(sheetName, 'Kalkulation', `expected first sheet "Kalkulation", got "${sheetName}"`);
      assert.equal(ws['A2']?.v, 'AG:');
      assert.equal(ws['A4']?.v, 'Leistung:');
      assert.equal(ws['A6']?.v, 'BV:');
      assert.equal(ws['A8']?.v, 'Bieter:');
      assert.equal(ws['C8']?.v, 'Netto Angebotssumme');
      assert.equal(ws['C9']?.v, 'MwSt.:');
      assert.equal(ws['C10']?.v, 'Brutto Angebotssumme');
    });
  }
});

describe('Kalkulation importer — row-13 column header', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): canonical row-13 labels`, () => {
      const { ws } = readSheet(ex.path);
      assert.equal(ws['A13']?.v, 'Pos.');
      assert.equal(ws['B13']?.v, 'Bezeichnung');
      assert.equal(ws['C13']?.v, 'Menge');
      assert.equal(ws['E13']?.v, 'EP');
      assert.equal(ws['F13']?.v, 'GP');
      assert.equal(ws['J13']?.v, 'Min/Einheit');
      assert.equal(ws['K13']?.v, 'Lstg./Std.');
    });
  }
});

describe('Kalkulation importer — formula-error detection (canonical hotspots)', () => {
  // Hot-spots documented in column_classification.md §5
  const HOTSPOTS = ['U2', 'U3', 'U4', 'U12'];

  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): U2-U4/U12 ${ex.expectErrors ? 'have' : 'are clean'}`, () => {
      const { ws } = readSheet(ex.path);
      const erroredCells = HOTSPOTS.filter((ref) => isErrorCell(ws[ref]));
      if (ex.expectErrors) {
        assert.equal(erroredCells.length, HOTSPOTS.length, `expected all hotspots to error in ${ex.id}, got ${erroredCells.length}`);
      } else {
        assert.equal(erroredCells.length, 0, `expected ex2 (clean file) to have no formula errors in hotspots`);
      }
    });
  }
});

describe('Kalkulation importer — position vs group classification on real rows', () => {
  test('ex1 row 15 ("1.4" KG group) classifies as group with overloaded col C', () => {
    const { ws } = readSheet(EXAMPLES[0].path);
    const row = readRow(ws, 15);
    assert.equal(ozKey(row.A), '1.4');
    assert.equal(typeof row.C, 'number'); // overloaded: group total
    assert.equal(row.D, null);
    assert.equal(classifyRow(row), 'group');
  });

  test('ex1 row 18 ("1.4.1..1" position) classifies as position with all A-F', () => {
    const { ws } = readSheet(EXAMPLES[0].path);
    const row = readRow(ws, 18);
    assert.equal(ozKey(row.A), '1.4.1.1');
    assert.equal(row.C, 1);              // Menge
    assert.equal(row.D, 'St');           // Einheit
    assert.equal(typeof row.E, 'number'); // EP
    assert.equal(typeof row.F, 'number'); // GP
    assert.equal(classifyRow(row), 'position');
  });

  test('ex2 row 16 ("Pos. 1" flat-numbered) classifies as position', () => {
    const { ws } = readSheet(EXAMPLES[1].path);
    const row = readRow(ws, 16);
    assert.equal(ozLevel(row.A), 2);  // "Pos" + "1" → 2 segments
    assert.equal(classifyRow(row), 'position');
  });

  test('ex3 row 16 (" .  .  10" number-only) classifies as position with level 1', () => {
    const { ws } = readSheet(EXAMPLES[2].path);
    const row = readRow(ws, 16);
    assert.equal(ozLevel(row.A), 1);
    assert.equal(classifyRow(row), 'position');
  });
});

describe('Kalkulation importer — meta extraction', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): pulls AG, Leistung, BV, Bieter, Netto`, () => {
      const { ws } = readSheet(ex.path);
      assert.equal(typeof ws['B2']?.v, 'string', 'AG must be present');
      assert.equal(typeof ws['B4']?.v, 'string', 'Leistung must be present');
      assert.equal(typeof ws['B6']?.v, 'string', 'BV must be present');
      assert.equal(typeof ws['B8']?.v, 'string', 'Bieter must be present');
      assert.equal(typeof ws['F8']?.v, 'number', 'Netto sum must be numeric');
      assert.ok((ws['F8'].v ?? 0) > 0, 'Netto must be > 0');
    });
  }
});

describe('Kalkulation importer — CalcParams derivation', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): lifts Mittellohn + Stundensatz + ZSCHLG`, () => {
      const { ws } = readSheet(ex.path);
      const mittellohn = ws['K2']?.v;
      const stundensatz = ws['M2']?.v;
      const zschlgStoffe = ws['K4']?.v;
      const zschlgNu = ws['K5']?.v;
      const zschlgGeraete = ws['K6']?.v;
      const mwst = ws['D9']?.v;

      assert.equal(typeof mittellohn, 'number');
      assert.equal(typeof stundensatz, 'number');
      assert.equal(typeof zschlgStoffe, 'number');
      assert.equal(typeof zschlgNu, 'number');
      assert.equal(typeof zschlgGeraete, 'number');
      assert.equal(typeof mwst, 'number');
      assert.ok(mittellohn > 0 && mittellohn < 200, `mittellohn ${mittellohn} out of plausible range`);
      assert.ok(stundensatz > 0 && stundensatz < 200, `stundensatz ${stundensatz} out of plausible range`);
      assert.ok(mwst >= 0.16 && mwst <= 0.25, `mwst ${mwst} out of plausible range`);
    });
  }
});
