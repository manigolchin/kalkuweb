/**
 * AD-HOC AUDIT (not a CI gate): per-position money fidelity.
 *
 * For each of the 10 canonical LV3-Vorlage example files, this:
 *   1. imports via the REAL parseKalkulationWorkbook()
 *   2. recomputes each position's EP/GP via the REAL calc.calculatePosition()
 *      using the lifted derivedCalcParams
 *   3. compares those against the Excel's OWN cached values:
 *        col E = EP   (=AA+AB+AJ+AK)   col F = GP (=Menge×EP)
 *      plus per-component diagnostics:
 *        AA=Geräte EP  AB=Löhne EP  AJ=Stoffe VK  AK=Nachu VK
 *
 * "Same money for each position" == round(calc,2) equals round(excel,2) to
 * the cent. Mismatches are dumped with their cost breakdown so we can see
 * WHICH component (Geräte/Lohn/Material/NU) drifted.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import XLSX from 'xlsx';
import { parseKalkulationWorkbook } from '../parse';
import { calculatePosition } from '@/features/kalkulation/calc';
import { classifyRow } from '@/features/kalkulation/ozParser.mjs';
import type { Position } from '@/features/kalkulation/types';

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

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Replicate parseKalkulationWorkbook's emission walk to recover, in lockstep,
 *  the source Excel row each emitted Position came from. */
function sourceRows(ws: Record<string, { v?: unknown }>): number[] {
  const ref = (ws['!ref'] as unknown as string) ?? 'A1';
  const range = XLSX.utils.decode_range(ref);
  const out: number[] = [];
  for (let r = 14; r <= range.e.r + 1; r++) {
    const cells = {
      oz: ws['A' + r]?.v ?? '',
      A: ws['A' + r]?.v ?? null,
      B: ws['B' + r]?.v ?? null,
      C: ws['C' + r]?.v ?? null,
      D: ws['D' + r]?.v ?? null,
      E: ws['E' + r]?.v ?? null,
      F: ws['F' + r]?.v ?? null,
      I: ws['I' + r]?.v ?? null,
      J: ws['J' + r]?.v ?? null,
      M: ws['M' + r]?.v ?? null,
    };
    const empty = Object.values(cells).every((v) => v === null || v === '' || v === undefined);
    if (empty) continue;
    const kind = classifyRow(cells);
    if (kind === 'group') out.push(r);
    else if (kind === 'buffer') {
      if (cells.B != null && String(cells.B).trim()) out.push(r);
    } else out.push(r);
  }
  return out;
}

type Mismatch = {
  row: number; oz: string; short: string;
  field: 'EP' | 'GP';
  excel: number; calc: number; diff: number;
  comp: string;
};

const report: string[] = [];
const grand = { files: 0, positions: 0, epExact: 0, epOff: 0, gpExact: 0, gpOff: 0 };

const hasAny = EXAMPLES.some((ex) => existsSync(join(HOME, ex.base, ex.folder, ex.xlsx)));
const dd = hasAny ? describe : describe.skip;

dd('per-position money fidelity: import+calc == Excel E/F', () => {
  for (const ex of EXAMPLES) {
    const path = join(HOME, ex.base, ex.folder, ex.xlsx);
    const tt = existsSync(path) ? test : test.skip;
    tt(`${ex.id}: every position EP & GP matches the Excel to the cent`, async () => {
      const u8 = new Uint8Array(readFileSync(path));
      const result = await parseKalkulationWorkbook(u8);
      const wb = XLSX.read(new Uint8Array(readFileSync(path)), { cellFormula: true });
      const ws = wb.Sheets['Kalkulation'] ?? wb.Sheets[wb.SheetNames[0]];

      const positions: Position[] = result.project!.positions;
      const rows = sourceRows(ws as Record<string, { v?: unknown }>);

      // Alignment sanity — must be lockstep or the comparison is meaningless.
      expect(rows.length, `${ex.id} emission alignment`).toBe(positions.length);

      const params = result.derivedCalcParams;
      const mismatches: Mismatch[] = [];
      let compared = 0;
      let epExact = 0, gpExact = 0;

      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        if (p.isHeader) continue;
        const r = rows[i];
        const excelEP = num((ws['E' + r] as { v?: unknown })?.v);
        const excelGP = num((ws['F' + r] as { v?: unknown })?.v);
        if (excelEP == null && excelGP == null) continue; // nothing to compare

        const c = calculatePosition(p, params);
        compared++;

        // Component-level Excel values for diagnostics.
        const aa = num((ws['AA' + r] as { v?: unknown })?.v) ?? 0; // Geräte
        const ab = num((ws['AB' + r] as { v?: unknown })?.v) ?? 0; // Löhne
        const aj = num((ws['AJ' + r] as { v?: unknown })?.v) ?? 0; // Stoffe VK
        const ak = num((ws['AK' + r] as { v?: unknown })?.v) ?? 0; // Nachu VK

        if (excelEP != null) {
          const d = Math.abs(round2(c.ep) - round2(excelEP));
          if (d < 0.005) epExact++;
          else {
            const comp =
              `G ${round2(c.epGeraet)}/${round2(aa)} · ` +
              `L ${round2(c.epLohn)}/${round2(ab)} · ` +
              `M ${round2(c.epMaterial)}/${round2(aj)} · ` +
              `NU ${round2(c.epNu)}/${round2(ak)}`;
            mismatches.push({ row: r, oz: p.oz, short: p.shortText.slice(0, 40), field: 'EP', excel: round2(excelEP), calc: round2(c.ep), diff: round2(round2(c.ep) - round2(excelEP)), comp });
          }
        }
        if (excelGP != null) {
          const d = Math.abs(round2(c.gp) - round2(excelGP));
          if (d < 0.005) gpExact++;
          else mismatches.push({ row: r, oz: p.oz, short: p.shortText.slice(0, 40), field: 'GP', excel: round2(excelGP), calc: round2(c.gp), diff: round2(round2(c.gp) - round2(excelGP)), comp: `menge ${p.quantity}` });
        }
      }

      grand.files++;
      grand.positions += compared;
      grand.epExact += epExact;
      grand.epOff += compared - epExact;
      grand.gpExact += gpExact;
      grand.gpOff += compared - gpExact;

      report.push(`## ${ex.id} (${ex.folder}/${ex.xlsx})`);
      report.push(`- positions compared: **${compared}**`);
      report.push(`- EP cent-exact: **${epExact}/${compared}**, GP cent-exact: **${gpExact}/${compared}**`);
      report.push(`- VL=${params.verrechnungslohn} matZ=${params.materialZuschlag} nuZ=${params.nuZuschlag} gSatz=${params.geraeteStundensatz} zeitabzug=${params.zeitabzug}`);
      const epMiss = mismatches.filter((m) => m.field === 'EP');
      const gpMiss = mismatches.filter((m) => m.field === 'GP');
      if (epMiss.length) {
        report.push(`- ⚠️ ${epMiss.length} EP mismatch (worst 12, comp = calc/excel per G·L·M·NU):`);
        for (const m of epMiss.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 12)) {
          report.push(`  - r${m.row} OZ ${m.oz || '—'} "${m.short}" · excel ${m.excel} vs calc ${m.calc} (Δ${m.diff}) · ${m.comp}`);
        }
      }
      if (gpMiss.length) {
        report.push(`- ⚠️ ${gpMiss.length} GP mismatch (worst 8):`);
        for (const m of gpMiss.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 8)) {
          report.push(`  - r${m.row} OZ ${m.oz || '—'} "${m.short}" · excel ${m.excel} vs calc ${m.calc} (Δ${m.diff}) · ${m.comp}`);
        }
      }
      if (!epMiss.length && !gpMiss.length) report.push(`- ✅ all ${compared} positions match to the cent`);
      report.push('');

      // Console summary for immediate feedback.
      console.log(`[${ex.id}] compared=${compared} EPexact=${epExact} GPexact=${gpExact} EPmiss=${epMiss.length} GPmiss=${gpMiss.length}`);
    });
  }

  (hasAny ? test : test.skip)('write money-fidelity report', () => {
    mkdirSync('/tmp/kalku-parse', { recursive: true });
    const head = [
      '# Per-position money fidelity — import+calc vs Excel E/F',
      '',
      `Generated ${new Date().toISOString()}`,
      '',
      `**TOTAL**: ${grand.files} files · ${grand.positions} positions · ` +
        `EP cent-exact ${grand.epExact}/${grand.positions} · GP cent-exact ${grand.gpExact}/${grand.positions}`,
      '',
    ];
    writeFileSync('/tmp/kalku-parse/per-position-money.md', head.concat(report).join('\n') + '\n');
    console.log(`\n=== TOTAL: ${grand.epExact}/${grand.positions} EP cent-exact, ${grand.gpExact}/${grand.positions} GP cent-exact ===`);
  });
});
