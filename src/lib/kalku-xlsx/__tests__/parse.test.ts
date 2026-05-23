/**
 * Vitest port of parse.test.mjs — same assertions, runs against the same
 * 4 real example files at ~/Desktop/Claude/example {1-4}. Now imports the
 * actual TS parser too, so the full pipeline (XLSX → ParseResult) is
 * tested end-to-end against real data.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import XLSX from 'xlsx';
import { ozKey, ozLevel, classifyRow, isErrorCell } from '@/features/kalkulation/ozParser.mjs';
import { parseKalkulationWorkbook } from '../parse';

const HOME = process.env.HOME ?? '';
const EXAMPLES = [
  { id: 'ex1', label: 'LV3_BH', path: join(HOME, 'Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx'), expectErrors: true },
  { id: 'ex2', label: 'LV3',    path: join(HOME, 'Desktop/Claude/example 2/LV3.xlsx'),                expectErrors: false },
  { id: 'ex3', label: 'LV3',    path: join(HOME, 'Desktop/Claude/example 3/LV3.xlsx'),                expectErrors: true },
  { id: 'ex4', label: 'LV3_FW', path: join(HOME, 'Desktop/Claude/example 4/LV3_FW_mit_Preisen.xlsx'), expectErrors: true },
];

function readSheet(path: string) {
  const wb = XLSX.readFile(path, { cellFormula: true });
  const sheetName = wb.SheetNames.find((n) => n === 'Kalkulation') ?? wb.SheetNames[0];
  return { ws: wb.Sheets[sheetName], sheetName };
}

function readRow(ws: Record<string, { v?: unknown }>, r: number) {
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

// Skip cleanly if fixtures are not on this machine (CI, fresh checkout, etc.)
// Throw was forcing 0 tests to run for everyone except the developer who has
// the local Desktop tree. The intent — verify against real customer XLSXes —
// is preserved when the fixtures are present.
const FIXTURES_AVAILABLE = EXAMPLES.every((ex) => existsSync(ex.path));
if (!FIXTURES_AVAILABLE) {
  // eslint-disable-next-line no-console
  console.warn(
    '[parse.test.ts] Fixture files not found at ~/Desktop/Claude/example {1-4}/. ' +
      'Skipping fixture-dependent tests.',
  );
}

(FIXTURES_AVAILABLE ? describe : describe.skip)('Kalkulation importer — header anchors across all 4 examples', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): canonical header anchors present`, () => {
      const { ws, sheetName } = readSheet(ex.path);
      expect(sheetName).toBe('Kalkulation');
      expect(ws['A2']?.v).toBe('AG:');
      expect(ws['A4']?.v).toBe('Leistung:');
      expect(ws['A6']?.v).toBe('BV:');
      expect(ws['A8']?.v).toBe('Bieter:');
      expect(ws['C8']?.v).toBe('Netto Angebotssumme');
      expect(ws['C9']?.v).toBe('MwSt.:');
      expect(ws['C10']?.v).toBe('Brutto Angebotssumme');
    });
  }
});

(FIXTURES_AVAILABLE ? describe : describe.skip)('Kalkulation importer — row-13 column header', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): canonical row-13 labels`, () => {
      const { ws } = readSheet(ex.path);
      expect(ws['A13']?.v).toBe('Pos.');
      expect(ws['B13']?.v).toBe('Bezeichnung');
      expect(ws['C13']?.v).toBe('Menge');
      expect(ws['E13']?.v).toBe('EP');
      expect(ws['F13']?.v).toBe('GP');
      expect(ws['J13']?.v).toBe('Min/Einheit');
      expect(ws['K13']?.v).toBe('Lstg./Std.');
    });
  }
});

(FIXTURES_AVAILABLE ? describe : describe.skip)('Kalkulation importer — formula-error detection (canonical hotspots)', () => {
  const HOTSPOTS = ['U2', 'U3', 'U4', 'U12'];
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): U2-U4/U12 ${ex.expectErrors ? 'have' : 'are clean'}`, () => {
      const { ws } = readSheet(ex.path);
      const erroredCells = HOTSPOTS.filter((ref) => isErrorCell(ws[ref]));
      if (ex.expectErrors) {
        expect(erroredCells.length).toBe(HOTSPOTS.length);
      } else {
        expect(erroredCells.length).toBe(0);
      }
    });
  }
});

(FIXTURES_AVAILABLE ? describe : describe.skip)('Kalkulation importer — position vs group classification on real rows', () => {
  test('ex1 row 15 ("1.4" KG group) classifies as group with overloaded col C', () => {
    const { ws } = readSheet(EXAMPLES[0].path);
    const row = readRow(ws, 15);
    expect(ozKey(row.A)).toBe('1.4');
    expect(typeof row.C).toBe('number');
    expect(row.D).toBeNull();
    expect(classifyRow(row)).toBe('group');
  });

  test('ex1 row 18 ("1.4.1..1" position) classifies as position with all A-F', () => {
    const { ws } = readSheet(EXAMPLES[0].path);
    const row = readRow(ws, 18);
    expect(ozKey(row.A)).toBe('1.4.1.1');
    expect(row.C).toBe(1);
    expect(row.D).toBe('St');
    expect(typeof row.E).toBe('number');
    expect(typeof row.F).toBe('number');
    expect(classifyRow(row)).toBe('position');
  });

  test('ex2 row 16 ("Pos. 1" flat-numbered) classifies as position', () => {
    const { ws } = readSheet(EXAMPLES[1].path);
    const row = readRow(ws, 16);
    expect(ozLevel(row.A)).toBe(2);
    expect(classifyRow(row)).toBe('position');
  });

  test('ex3 row 16 (" .  .  10" number-only) classifies as position with level 1', () => {
    const { ws } = readSheet(EXAMPLES[2].path);
    const row = readRow(ws, 16);
    expect(ozLevel(row.A)).toBe(1);
    expect(classifyRow(row)).toBe('position');
  });
});

(FIXTURES_AVAILABLE ? describe : describe.skip)('Kalkulation importer — full ParseResult against real files (PART F)', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): parseKalkulationWorkbook returns project + meta + CalcParams`, async () => {
      // Pass Uint8Array directly — that's what readFileSync returns under
      // the hood and exactly what the parser is meant to accept.
      const u8 = new Uint8Array(readFileSync(ex.path));
      const result = await parseKalkulationWorkbook(u8);

      expect(result.project).not.toBeNull();
      expect(result.project!.positions.length).toBeGreaterThan(0);
      expect(result.meta.client.length).toBeGreaterThan(0);
      expect(result.meta.service.length).toBeGreaterThan(0);
      expect(result.meta.bidder.length).toBeGreaterThan(0);
      expect(result.derivedCalcParams.mittellohn).toBeGreaterThan(0);
      expect(result.derivedCalcParams.verrechnungslohn).toBeGreaterThan(0);
      expect(result.derivedCalcParams.mwst).toBeGreaterThanOrEqual(0.16);
      expect(result.derivedCalcParams.mwst).toBeLessThanOrEqual(0.25);
    });

    test(`${ex.id} (${ex.label}): ${ex.expectErrors ? 'BLOCKS import' : 'ALLOWS import'} per the formula-error gate`, async () => {
      const u8 = new Uint8Array(readFileSync(ex.path));
      const result = await parseKalkulationWorkbook(u8);
      const hasBlocker = result.issues.some((i) => i.severity === 'error');
      // ex2 is the only clean file → import allowed (ok=true, no error-severity).
      // ex1/3/4 have U2-U4/U12 errors → blocked.
      expect(hasBlocker).toBe(ex.expectErrors);
      expect(result.ok).toBe(!ex.expectErrors);
    });
  }
});
