#!/usr/bin/env node
/**
 * Inspect the raw Excel formulas in the user's actual LV3.xlsx to verify
 * whether our EP = EK × (1 + zuschlag) matches what their template does.
 *
 * Run from project root:
 *   node scripts/inspect-lv3-formulas.mjs
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';

const PATH =
  '/Users/admin/Library/CloudStorage/OneDrive-FreigegebeneBibliotheken–kalku/KT01 - Documents/1695_Gesellchen_GmbH/260512_Ludwigschule_St_Ingbert/LV3.xlsx';

const buf = readFileSync(PATH);
const wb = XLSX.read(buf, { cellFormula: true, cellStyles: false, cellNF: true });

console.log('Sheets:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  if (!ws['!ref']) continue;

  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName}  range=${ws['!ref']}`);
  console.log(`========================================`);

  const range = XLSX.utils.decode_range(ws['!ref']);
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const extraCols = ['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM'];

  // 1. Dump header rows 1..14
  console.log('\n--- Header rows 1..14 ---');
  for (let r = 1; r <= 14; r++) {
    for (const c of cols) {
      const addr = `${c}${r}`;
      const cell = ws[addr];
      if (!cell) continue;
      const f = cell.f ? `  ←f= ${cell.f}` : '';
      const v = cell.v !== undefined ? cell.v : '';
      console.log(`  ${addr} [${cell.t}]  v=${JSON.stringify(v)}${f}`);
    }
  }

  // 2. Dump position rows 15..50 (broad slice — first 35 position rows)
  console.log('\n--- Position rows 15..50 (ALL columns A..AM) ---');
  for (let r = 15; r <= Math.min(50, range.e.r + 1); r++) {
    let rowHasContent = false;
    const allCols = [...cols, ...extraCols];
    for (const c of allCols) {
      const cell = ws[`${c}${r}`];
      if (!cell) continue;
      if (!rowHasContent) {
        console.log(`\n  ROW ${r}:`);
        rowHasContent = true;
      }
      const f = cell.f ? `  ←f= ${cell.f}` : '';
      const v = cell.v !== undefined ? cell.v : '';
      console.log(`    ${c}${r} [${cell.t}]  v=${JSON.stringify(v)}${f}`);
    }
  }

  // 3. Named ranges / defined names
  if (wb.Workbook && wb.Workbook.Names) {
    console.log('\n--- Defined names (used in formulas like "stoffkosten", "verrechnungslohn", "arbeitsstunden") ---');
    for (const name of wb.Workbook.Names) {
      console.log(`  ${name.Name} = ${name.Ref}`);
    }
  }
}
