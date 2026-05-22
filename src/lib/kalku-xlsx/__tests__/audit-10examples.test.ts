/**
 * Round 5 PART R — audit driver. Walks all 10 example LV files through the
 * REAL parseKalkulationWorkbook() and dumps a JSON report to
 * /tmp/kalku-parse/parser-run-10.json. PART R's markdown report consumes
 * this JSON.
 *
 * NOT part of the regular CI gate — this lives in its own .test.ts so vitest
 * picks it up, but its assertions are intentionally loose: the goal is to
 * RUN the parser against all 10 files and observe variances, not to assert
 * canonical values. Hard assertions live in parse.test.ts.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseKalkulationWorkbook } from '../parse';

const HOME = process.env.HOME ?? '';
const EXAMPLES = [
  { id: 'ex1',  base: 'Desktop/Claude',  folder: 'example 1',  xlsx: 'LV3_BH_mit_Preisen.xlsx' },
  { id: 'ex2',  base: 'Desktop/Claude',  folder: 'example 2',  xlsx: 'LV3.xlsx' },
  { id: 'ex3',  base: 'Desktop/Claude',  folder: 'example 3',  xlsx: 'LV3.xlsx' },
  { id: 'ex4',  base: 'Desktop/Claude',  folder: 'example 4',  xlsx: 'LV3_FW_mit_Preisen.xlsx' },
  { id: 'ex5',  base: 'Desktop/claude1', folder: 'example 5',  xlsx: 'LV3_.xlsx' },
  { id: 'ex6',  base: 'Desktop/claude1', folder: 'example 6',  xlsx: 'LV3.xlsx' },
  { id: 'ex7',  base: 'Desktop/claude1', folder: 'example 7',  xlsx: 'LV3.xlsx' },
  { id: 'ex8',  base: 'Desktop/claude1', folder: 'example 8',  xlsx: 'LV3.xlsx' },
  { id: 'ex9',  base: 'Desktop/claude1', folder: 'example 9',  xlsx: 'LV3.xlsx' },
  { id: 'ex10', base: 'Desktop/claude1', folder: 'example 10', xlsx: 'LV3.xlsx' },
];

const results: Record<string, unknown>[] = [];

describe('PART R audit — run parser on all 10 examples', () => {
  for (const ex of EXAMPLES) {
    const path = join(HOME, ex.base, ex.folder, ex.xlsx);
    test(`${ex.id} (${ex.folder}/${ex.xlsx}) runs through parser without crash`, async () => {
      expect(existsSync(path)).toBe(true);
      const u8 = new Uint8Array(readFileSync(path));
      const result = await parseKalkulationWorkbook(u8);
      expect(result.project).not.toBeNull();
      expect(result.project!.positions.length).toBeGreaterThan(0);

      results.push({
        id: ex.id,
        path,
        ok: result.ok,
        positionsTotal: result.project!.positions.length,
        positionsNet: result.project!.positions.filter((p) => !p.isHeader).length,
        groups: result.project!.positions.filter((p) => p.isHeader && p.visibleToCustomer !== false).length,
        buffers: result.project!.positions.filter((p) => p.isHeader && p.visibleToCustomer === false).length,
        meta: result.meta,
        derivedCalcParams: result.derivedCalcParams,
        zuschlagMatrix: result.zuschlagMatrix,
        headerExtras: result.headerExtras,
        faktorenCount: result.faktoren.length,
        faktorenLookupRows: result.faktorenLookup.length,
        issuesBySeverity: {
          info: result.issues.filter((i) => i.severity === 'info').length,
          warning: result.issues.filter((i) => i.severity === 'warning').length,
          error: result.issues.filter((i) => i.severity === 'error').length,
        },
        firstErrors: result.issues.filter((i) => i.severity === 'error').slice(0, 8),
        firstWarnings: result.issues.filter((i) => i.severity === 'warning').slice(0, 4),
      });
    });
  }

  test('write audit JSON for PART R report', () => {
    mkdirSync('/tmp/kalku-parse', { recursive: true });
    writeFileSync('/tmp/kalku-parse/parser-run-10.json', JSON.stringify(results, null, 2));
    expect(results.length).toBe(EXAMPLES.length);
  });
});
