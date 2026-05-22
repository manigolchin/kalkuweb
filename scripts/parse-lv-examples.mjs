// Parse all 4 example Excel files. Output:
//   - per-file column classification + position list + error report
//   - one combined JSON we'll feed to the fixture builder for PART A
//   - one markdown summary for PART B

import XLSX from 'xlsx';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FILES = [
  { id: 'ex1', label: 'Example 1 — LV3_BH', path: '/Users/admin/Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx' },
  { id: 'ex2', label: 'Example 2 — LV3',     path: '/Users/admin/Desktop/Claude/example 2/LV3.xlsx' },
  { id: 'ex3', label: 'Example 3 — LV3',     path: '/Users/admin/Desktop/Claude/example 3/LV3.xlsx' },
  { id: 'ex4', label: 'Example 4 — LV3_FW',  path: '/Users/admin/Desktop/Claude/example 4/LV3_FW_mit_Preisen.xlsx' },
];

const ERROR_TYPES = new Set(['#VALUE!', '#REF!', '#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!']);

function colLetter(idx) {
  // 0-indexed → A, B, ..., Z, AA, AB...
  let s = '';
  let n = idx;
  while (true) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

function readRow(ws, rowNum, maxCol) {
  // 1-indexed row. Returns array of {col, ref, value, formula, isError, type}
  const out = [];
  for (let c = 0; c < maxCol; c++) {
    const ref = XLSX.utils.encode_cell({ c, r: rowNum - 1 });
    const cell = ws[ref];
    if (cell === undefined) { out.push({ col: colLetter(c), ref, value: null, type: 'empty' }); continue; }
    const isError = cell.t === 'e' || (typeof cell.v === 'string' && ERROR_TYPES.has(cell.v));
    out.push({
      col: colLetter(c),
      ref,
      value: cell.v ?? null,
      formula: cell.f ?? null,
      isError,
      type: cell.t,
    });
  }
  return out;
}

function detectPositionLevel(ozRaw) {
  // OZ patterns observed:
  //   " 1. 4"             → level-1 group (KG)
  //   " 1. 4. 1"          → level-2 sub-group (KG-sub)
  //   " 1. 4. 1.  .   1"  → position (3rd dot is empty, then number)
  //   " 1.4.1.1"          → same as above, no spaces
  if (typeof ozRaw !== 'string') return { level: null, normalized: null, parts: [] };
  const s = ozRaw.trim();
  if (!s) return { level: null, normalized: null, parts: [] };
  // Split on dots, collapse internal whitespace
  const parts = s.split('.').map((p) => p.trim()).filter(Boolean);
  // Normalize for display & key
  const normalized = parts.join('.');
  const level = parts.length;
  return { level, normalized, parts };
}

function parseFile(file) {
  const wb = XLSX.readFile(file.path, { cellFormula: true, cellNF: true, cellStyles: false });
  const sheetName = wb.SheetNames[0]; // first sheet is the LV
  const ws = wb.Sheets[sheetName];
  const ref = ws['!ref'] ?? 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  const maxCol = range.e.c + 1;
  const maxRow = range.e.r + 1;

  // 1) Header block — read rows 1..12
  const headerRows = [];
  for (let r = 1; r <= Math.min(12, maxRow); r++) {
    headerRows.push({ row: r, cells: readRow(ws, r, Math.min(maxCol, 16)) });
  }

  // 2) Column-header row (expected at row 13)
  const colHeaderRow = readRow(ws, 13, maxCol);
  const colHeaders = colHeaderRow.map((c) => ({
    col: c.col,
    label: typeof c.value === 'string' ? c.value.trim() : c.value ?? null,
  }));

  // 3) Position rows (14 onward) — first 80 + last 5 + any error rows
  const positions = [];
  const errorCells = [];
  for (let r = 14; r <= maxRow; r++) {
    const row = readRow(ws, r, maxCol);
    const ozCell = row[0];
    const ozRaw = typeof ozCell.value === 'string' ? ozCell.value : (ozCell.value != null ? String(ozCell.value) : '');
    const hier = detectPositionLevel(ozRaw);

    // collect any error cells in this row
    for (const c of row) {
      if (c.isError) {
        errorCells.push({
          sheet: sheetName,
          ref: c.ref,
          value: String(c.value),
          formula: c.formula ?? null,
          rowNumber: r,
          colLetter: c.col,
        });
      }
    }

    // For brevity: collect first 30, last 10, and skip middle
    if (positions.length < 30 || r > maxRow - 10) {
      positions.push({
        rowNumber: r,
        ozRaw,
        oz: hier.normalized,
        level: hier.level,
        parts: hier.parts,
        // Pick out the canonical column-letters we expect:
        A: row[0]?.value ?? null,
        B: row[1]?.value ?? null,
        C: row[2]?.value ?? null,
        D: row[3]?.value ?? null,
        E: row[4]?.value ?? null,
        F: row[5]?.value ?? null,
        G: row[6]?.value ?? null,
        I: row[8]?.value ?? null,
        J: row[9]?.value ?? null,
        K: row[10]?.value ?? null,
        L: row[11]?.value ?? null,
        M: row[12]?.value ?? null,
        formulas: row.slice(0, 16).filter((c) => c.formula).map((c) => ({ col: c.col, formula: c.formula })),
      });
    }
  }

  // 4) Error cells in entire file (also scan U2-U4, U12 specifically — known hot-spots)
  const knownHotspots = ['U2','U3','U4','U12'];
  const hotspotReport = knownHotspots.map((ref) => {
    const cell = ws[ref];
    if (!cell) return { ref, present: false };
    return {
      ref,
      present: true,
      value: cell.v ?? null,
      formula: cell.f ?? null,
      isError: cell.t === 'e' || (typeof cell.v === 'string' && ERROR_TYPES.has(cell.v)),
      type: cell.t,
    };
  });

  return {
    file: file.id,
    label: file.label,
    sheetName,
    maxCol,
    maxRow,
    headerRows,
    colHeaders,
    positionsSample: positions,
    totalDataRows: maxRow - 13,
    errorCells,
    hotspotReport,
  };
}

const results = FILES.map((f) => {
  try {
    return parseFile(f);
  } catch (err) {
    return { file: f.id, label: f.label, error: String(err) };
  }
});

mkdirSync('/tmp/kalku-parse/out', { recursive: true });
writeFileSync('/tmp/kalku-parse/out/all.json', JSON.stringify(results, null, 2));
console.log('Wrote /tmp/kalku-parse/out/all.json');
console.log('Files:', results.map((r) => `${r.file}: rows=${r.maxRow} cols=${r.maxCol} errors=${r.errorCells?.length ?? '?'}`).join('\n  '));
