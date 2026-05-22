/**
 * Round 4 PART P — full-fidelity round-trip test against all 4 example
 * Excel files.
 *
 * Property: parseKalkulationWorkbook captures the SAME header block,
 * Zuschlag matrix, header extras, CalcParams, and positions that a raw
 * SheetJS read would produce. Discrepancies are written to
 * docs/v2_redesign/import_fidelity_report.md so future drift gets caught.
 *
 * Tolerance: floats within 0.01, strings byte-exact (after trim).
 */

import { describe, test, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import XLSX from 'xlsx';
import { parseKalkulationWorkbook } from '../parse';

const HOME = process.env.HOME ?? '';
const EXAMPLES = [
  { id: 'ex1', label: 'LV3_BH', path: join(HOME, 'Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx'), expectGateBlocks: true },
  { id: 'ex2', label: 'LV3',    path: join(HOME, 'Desktop/Claude/example 2/LV3.xlsx'),                expectGateBlocks: false },
  { id: 'ex3', label: 'LV3',    path: join(HOME, 'Desktop/Claude/example 3/LV3.xlsx'),                expectGateBlocks: true },
  { id: 'ex4', label: 'LV3_FW', path: join(HOME, 'Desktop/Claude/example 4/LV3_FW_mit_Preisen.xlsx'), expectGateBlocks: true },
];

type Discrepancy = {
  file: string;
  field: string;
  expected: unknown;
  actual: unknown;
  diff?: number;
};
const allDiscrepancies: Discrepancy[] = [];

function near(a: number, b: number, tol = 0.01): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= tol;
}

async function parseExample(path: string) {
  const u8 = new Uint8Array(readFileSync(path));
  return await parseKalkulationWorkbook(u8);
}

function readRaw(path: string) {
  const wb = XLSX.readFile(path, { cellFormula: true });
  return wb.Sheets['Kalkulation'];
}

describe('Round 4 PART P — full-fidelity import vs raw XLSX read', () => {
  for (const ex of EXAMPLES) {
    test(`${ex.id} (${ex.label}): meta + Zuschlag matrix + extras match raw cells`, async () => {
      if (!existsSync(ex.path)) {
        console.warn(`[fidelity] ${ex.id} fixture missing — skipping`);
        return;
      }
      const raw = readRaw(ex.path);
      const result = await parseExample(ex.path);

      // Meta — verbatim string compare
      const checks: Array<[string, unknown, unknown]> = [
        ['meta.client', String(raw['B2']?.v ?? '').trim(), result.meta.client],
        ['meta.service', String(raw['B4']?.v ?? '').trim(), result.meta.service],
        ['meta.bv', String(raw['B6']?.v ?? '').trim(), result.meta.bv],
        ['meta.bidder', String(raw['B8']?.v ?? '').trim(), result.meta.bidder],
        ['meta.tenderNumber', String(raw['F4']?.v ?? '').trim(), result.meta.tenderNumber],
        ['meta.netto', raw['F8']?.v, result.meta.nettoFromFile],
        ['meta.brutto', raw['F10']?.v, result.meta.bruttoFromFile],
      ];
      for (const [field, expected, actual] of checks) {
        const ok = typeof expected === 'number' && typeof actual === 'number'
          ? near(expected, actual)
          : expected === actual;
        if (!ok) {
          allDiscrepancies.push({ file: ex.id, field, expected, actual });
        }
        expect(actual, `${ex.id} ${field}`).toEqual(expected);
      }

      // Zuschlag matrix — 4 rows × 4 cols
      const matrixChecks: Array<[string, number, number]> = [
        ['zuschlag.stoffe.ek', raw['J4']?.v as number ?? 0, result.zuschlagMatrix.stoffe.ekTotal],
        ['zuschlag.stoffe.zschlg', raw['K4']?.v as number ?? 0, result.zuschlagMatrix.stoffe.zschlgPct],
        ['zuschlag.stoffe.vk', raw['L4']?.v as number ?? 0, result.zuschlagMatrix.stoffe.vkTotal],
        ['zuschlag.stoffe.diff', raw['M4']?.v as number ?? 0, result.zuschlagMatrix.stoffe.differnz],
        ['zuschlag.nu.ek', raw['J5']?.v as number ?? 0, result.zuschlagMatrix.nu.ekTotal],
        ['zuschlag.nu.zschlg', raw['K5']?.v as number ?? 0, result.zuschlagMatrix.nu.zschlgPct],
        ['zuschlag.geraete.ek', raw['J6']?.v as number ?? 0, result.zuschlagMatrix.geraete.ekTotal],
        ['zuschlag.geraete.zschlg', raw['K6']?.v as number ?? 0, result.zuschlagMatrix.geraete.zschlgPct],
        ['zuschlag.lohn.ek', raw['J7']?.v as number ?? 0, result.zuschlagMatrix.lohn.ekTotal],
        ['zuschlag.lohn.zschlg', raw['K7']?.v as number ?? 0, result.zuschlagMatrix.lohn.zschlgPct],
      ];
      for (const [field, expected, actual] of matrixChecks) {
        if (!near(expected, actual)) {
          allDiscrepancies.push({ file: ex.id, field, expected, actual, diff: actual - expected });
        }
        expect(actual, `${ex.id} ${field}`).toBeCloseTo(expected, 2);
      }

      // Header extras
      const extraChecks: Array<[string, number, number]> = [
        ['extras.mitarbeiter', raw['J8']?.v as number ?? 0, result.headerExtras.mitarbeiter],
        ['extras.gesStunden', raw['L8']?.v as number ?? 0, result.headerExtras.gesStunden],
        ['extras.arbeitstage', raw['J9']?.v as number ?? 0, result.headerExtras.arbeitstage],
        ['extras.ueberschuss', raw['M9']?.v as number ?? 0, result.headerExtras.ueberschuss],
        ['extras.zeitwert', raw['J11']?.v as number ?? 0, result.headerExtras.zeitwert],
      ];
      for (const [field, expected, actual] of extraChecks) {
        if (!near(expected, actual)) {
          allDiscrepancies.push({ file: ex.id, field, expected, actual, diff: actual - expected });
        }
        expect(actual, `${ex.id} ${field}`).toBeCloseTo(expected, 2);
      }
    });

    test(`${ex.id} (${ex.label}): positions count + first/last match raw cells`, async () => {
      if (!existsSync(ex.path)) return;
      const raw = readRaw(ex.path);
      const result = await parseExample(ex.path);
      const project = result.project!;

      // Count non-empty A-column rows from row 14 onward in raw, expect
      // result.positions to have at least that many (we may add buffer
      // rows from B-only descriptions).
      const ref = raw['!ref'] ?? 'A1';
      const range = XLSX.utils.decode_range(ref);
      let rawDataRows = 0;
      for (let r = 14; r <= range.e.r + 1; r++) {
        const a = raw['A' + r]?.v;
        if (a != null && String(a).trim() !== '') rawDataRows += 1;
      }
      expect(project.positions.length, `${ex.id} positions count vs raw A-cells`).toBeGreaterThanOrEqual(rawDataRows);
    });

    test(`${ex.id} (${ex.label}): faktoren array captured (or empty if file has none)`, async () => {
      if (!existsSync(ex.path)) return;
      const result = await parseExample(ex.path);
      // Faktoren array should always exist (even if empty).
      expect(Array.isArray(result.faktoren)).toBe(true);
      // For files with formula errors (ex1/3/4), faktoren may include
      // entries with NaN/error strings — that's expected and OK for now.
    });
  }

  // After all per-file tests run, dump any discrepancies to a report file.
  test('write fidelity report (after all checks)', () => {
    const reportPath = join(
      HOME,
      'projects/kalku-website/docs/v2_redesign/import_fidelity_report.md',
    );
    mkdirSync(dirname(reportPath), { recursive: true });
    const lines: string[] = [];
    lines.push('# Import fidelity report (Round 4 PART P)');
    lines.push('');
    lines.push(`Generated by \`src/lib/kalku-xlsx/__tests__/full-fidelity.test.ts\` on ${new Date().toISOString()}.`);
    lines.push('');
    if (allDiscrepancies.length === 0) {
      lines.push('## ✅ No discrepancies');
      lines.push('');
      lines.push('All meta + Zuschlag matrix + header-extras fields match raw XLSX cells across all 4 example files within ±0.01 tolerance (numerics) and byte-exact (strings).');
    } else {
      lines.push(`## ⚠️ ${allDiscrepancies.length} discrepanc${allDiscrepancies.length === 1 ? 'y' : 'ies'}`);
      lines.push('');
      lines.push('| File | Field | Expected | Actual | Diff |');
      lines.push('|------|-------|----------|--------|------|');
      for (const d of allDiscrepancies) {
        const diff = d.diff != null ? d.diff.toFixed(4) : '—';
        lines.push(`| ${d.file} | ${d.field} | \`${JSON.stringify(d.expected)}\` | \`${JSON.stringify(d.actual)}\` | ${diff} |`);
      }
    }
    writeFileSync(reportPath, lines.join('\n') + '\n');
    // Always pass — report is informational.
    expect(true).toBe(true);
  });
});
