/**
 * Vitest port of parse.test.mjs — same assertions, runs against the same
 * 4 real example files at ~/Desktop/Claude/example {1-4}. Now imports the
 * actual TS parser too, so the full pipeline (XLSX → ParseResult) is
 * tested end-to-end against real data.
 */

import { describe, test, expect } from 'vitest';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import XLSX from 'xlsx';
import { ozKey, ozLevel, classifyRow, isErrorCell } from '@/features/kalkulation/ozParser.mjs';
import { parseKalkulationWorkbook, echteZeitToRawMinutes } from '../parse';

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

    test(`${ex.id} (${ex.label}): imports OK — Faktoren-sidebar formula errors are non-blocking warnings`, async () => {
      const u8 = new Uint8Array(readFileSync(ex.path));
      const result = await parseKalkulationWorkbook(u8);
      const hasBlocker = result.issues.some((i) => i.severity === 'error');
      // The U2-U4/U12 formula errors in ex1/3/4 live in the Faktoren-Lookup
      // sidebar (cols N-W, rows 2-12) — stale #REF! to deleted helper cells,
      // common in real Elektro/Fernwärme Vorlagen. They are inventoried as
      // WARNINGS, not blockers: the LV positions (cols A-G) carry cached
      // EP/GP/Material/Min values and parse fine. Only a customer-zone (A-G)
      // formula error blocks. None of the 4 real fixtures has one, so every
      // file imports OK. (Pre-fix this gate refused 3 of 4 real customer files.)
      expect(hasBlocker).toBe(false);
      expect(result.ok).toBe(true);
      // The sidebar errors must STILL be surfaced as warnings — silently
      // swallowing them would hide a genuinely broken Faktoren-Bibliothek.
      if (ex.expectErrors) {
        const faktorenWarnings = result.issues.filter(
          (i) => i.severity === 'warning' && i.code === 'formula_error',
        );
        expect(faktorenWarnings.length).toBeGreaterThan(0);
      }
    });

    /**
     * Delete-protection regression — every Position produced by the Kalkulations-
     * Vorlage parser MUST carry `importedFrom: 'excel'` so PositionTableV2 renders
     * the lock icon instead of a trash button. Without this tag, the calculator
     * could silently delete rows that are part of the AG-LV.
     *
     * Caught by the Round-13 debug pass: ProjectDetail's onImportKalku handler
     * did NOT add the tag itself, and the parser also didn't, so all template-
     * imported rows were deletable. Fix lives in parse.ts (the `base` spread).
     */
    test(`${ex.id} (${ex.label}): every parsed position has importedFrom='excel' (delete-protection)`, async () => {
      const u8 = new Uint8Array(readFileSync(ex.path));
      const result = await parseKalkulationWorkbook(u8);
      if (!result.project) return; // Should never happen for the example files
      const positions = result.project.positions;
      expect(positions.length).toBeGreaterThan(0);
      for (const p of positions) {
        expect(p.importedFrom).toBe('excel');
      }
    });
  }
});

describe('echteZeitToRawMinutes — target-price-mode time recovery', () => {
  // Regression for the Gesellchen "Besucherplattform" LV: the Vorlage was filled
  // in target-price mode, so col AC (Echte Zeit) was back-solved and diverged
  // from col Y. Pricing off Y imported Geräte −42 %, Lohn +6 %, Stunden 218 vs
  // 520 — Netto 136.346,45 € instead of 139.968,05 €.

  test('normal mode (AC = Y·(1+Zeitwert)) → returns the raw Y unchanged', () => {
    // Y=1800, Zeitwert=10% → AC=1980. No-op so normal files import identically.
    expect(echteZeitToRawMinutes(1980, 1800, 10)).toBe(1800);
    expect(echteZeitToRawMinutes(7.7, 7, 10)).toBe(7);
  });

  test('target mode (AC back-solved, diverges) → recovers AC/(1+Zeitwert)', () => {
    // r16: Y=1800, AC=2008.20, Zeitwert=10% → raw·1.1 must re-derive AC exactly.
    const raw = echteZeitToRawMinutes(2008.2, 1800, 10);
    expect(raw).not.toBe(1800);
    expect(raw * 1.1).toBeCloseTo(2008.2, 6);
  });

  test('Zeitwert 0 → divergent AC is used directly', () => {
    expect(echteZeitToRawMinutes(88.53, 30, 0)).toBe(88.53);
  });

  test('negative Echte Zeit (Nachlass row) → recovers the negative time', () => {
    // Y blank/0 on a discount row; AC is the real (negative) echte Zeit.
    const raw = echteZeitToRawMinutes(-18204, 0, 10);
    expect(raw).toBeCloseTo(-18204 / 1.1, 6);
  });

  test('no AC present → falls back to the Y-derived time', () => {
    expect(echteZeitToRawMinutes(undefined, 30, 10)).toBe(30);
    expect(echteZeitToRawMinutes(null, 42, 0)).toBe(42);
  });

  test('AC within FP noise of Y-derived time → keeps Y (does not flip to AC)', () => {
    // 7·1.1 = 7.700000001 vs AC 7.7 — below the 0.01 gate, so Y is kept.
    expect(echteZeitToRawMinutes(7.700000001, 7, 10)).toBe(7);
  });
});
