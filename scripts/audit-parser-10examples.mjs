// Round 5 PART R: audit the Kalkulation parser against all 10 example LV files.
//
// Reads each .xlsx, runs ground-truth SheetJS probes for the canonical anchors,
// classifies positions, counts groups, detects formula errors, and dumps a JSON
// report at /tmp/kalku-parse/audit-10.json so PART R's markdown can consume it.
//
// Does NOT mutate anything in the repo. Read-only. Usable standalone:
//   node scripts/audit-parser-10examples.mjs

import XLSX from 'xlsx';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const HOME = process.env.HOME ?? '';

const EXAMPLES = [
  { id: 'ex1',  folder: 'example 1',  base: 'Desktop/Claude',  xlsx: 'LV3_BH_mit_Preisen.xlsx',  pdf: '67,90_zschlg_23_prznt.pdf' },
  { id: 'ex2',  folder: 'example 2',  base: 'Desktop/Claude',  xlsx: 'LV3.xlsx',                 pdf: '64,90_moderates_Arbeitstempo.pdf' },
  { id: 'ex3',  folder: 'example 3',  base: 'Desktop/Claude',  xlsx: 'LV3.xlsx',                 pdf: '64,90_zschlg_20_prznt.pdf' },
  { id: 'ex4',  folder: 'example 4',  base: 'Desktop/Claude',  xlsx: 'LV3_FW_mit_Preisen.xlsx', pdf: '67,90_zschlg_23_prznt.pdf' },
  { id: 'ex5',  folder: 'example 5',  base: 'Desktop/claude1', xlsx: 'LV3_.xlsx',                pdf: '64,90_zschlg_20_prznt.pdf' },
  { id: 'ex6',  folder: 'example 6',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx',                 pdf: '64,90_zschlg_20_prznt.pdf' },
  { id: 'ex7',  folder: 'example 7',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx',                 pdf: '34,90_moderates_Arbeitstempo.pdf' },
  { id: 'ex8',  folder: 'example 8',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx',                 pdf: '49,90_zschlg_12_prznt.pdf' },
  { id: 'ex9',  folder: 'example 9',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx',                 pdf: '64,90_zschlg_20_prznt.pdf' },
  { id: 'ex10', folder: 'example 10', base: 'Desktop/claude1', xlsx: 'LV3.xlsx',                 pdf: '64,90_zschlg_50_prznt.pdf' },
];

const ERROR_TYPES = new Set(['#VALUE!', '#REF!', '#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!']);

function isErrorCell(cell) {
  if (!cell) return false;
  if (cell.t === 'e') return true;
  if (typeof cell.v === 'string' && ERROR_TYPES.has(cell.v)) return true;
  return false;
}

function readString(ws, col, row) {
  const v = ws[col + row]?.v;
  if (v == null) return '';
  return String(v).trim();
}

function readNumber(ws, col, row) {
  const v = ws[col + row]?.v;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

function normalizeLabel(s) {
  return String(s).replace(/[\s:]+/g, '').toLowerCase();
}

function ozSegments(raw) {
  if (raw == null) return [];
  const s = String(raw).trim();
  if (!s) return [];
  return s.split('.').map((seg) => seg.trim()).filter((seg) => seg.length > 0);
}

function ozLevel(raw) { return ozSegments(raw).length; }

function classifyRow(row) {
  const lvl = ozLevel(row.oz);
  const hasUnit = row.D != null && String(row.D).trim().length > 0;
  const hasEP = typeof row.E === 'number' && Number.isFinite(row.E);
  const hasMenge = typeof row.C === 'number' && Number.isFinite(row.C);
  const hasDescription = row.B != null && String(row.B).trim().length > 0;
  if (lvl === 0) return 'buffer';
  if (hasUnit && hasEP) return 'position';
  if (hasMenge && !hasUnit && !hasEP) return 'group';
  if (!hasUnit && !hasEP) return 'group';
  return 'position';
}

const HEADER_ANCHORS = [
  { row: 2, col: 'A', label: 'AG:' },
  { row: 4, col: 'A', label: 'Leistung:' },
  { row: 6, col: 'A', label: 'BV:' },
  { row: 8, col: 'A', label: 'Bieter:' },
  { row: 8, col: 'C', label: 'Netto Angebotssumme' },
  { row: 9, col: 'C', label: 'MwSt.:' },
  { row: 10, col: 'C', label: 'Brutto Angebotssumme' },
];

const ROW13_EXPECTED = {
  A: 'Pos.', B: 'Bezeichnung', C: 'Menge',
  E: 'EP', F: 'GP',
  I: 'EP', J: 'Min/Einheit',
  K: 'Lstg./Std.', L: 'Lstg./Std.',
  M: 'EP',
};

function auditFile(ex) {
  const path = join(HOME, ex.base, ex.folder, ex.xlsx);
  if (!existsSync(path)) {
    return { ...ex, found: false, error: `file missing: ${path}` };
  }
  const wb = XLSX.readFile(path, { cellFormula: true, cellNF: true, cellStyles: false });
  const sheetNames = wb.SheetNames;
  const targetSheet = sheetNames.find((n) => n === 'Kalkulation') ?? sheetNames[0];
  const ws = wb.Sheets[targetSheet];
  const ref = ws['!ref'] ?? 'A1:A1';
  const range = XLSX.utils.decode_range(ref);

  // Header anchor verification
  const missingAnchors = [];
  for (const a of HEADER_ANCHORS) {
    const v = ws[a.col + a.row]?.v;
    if (typeof v !== 'string' || normalizeLabel(v) !== normalizeLabel(a.label)) {
      missingAnchors.push({ ...a, actual: v ?? null });
    }
  }

  // Row 13 verification
  const row13Mismatches = [];
  for (const [col, expected] of Object.entries(ROW13_EXPECTED)) {
    const v = ws[col + 13]?.v;
    if (typeof v !== 'string' || !normalizeLabel(v).startsWith(normalizeLabel(expected))) {
      row13Mismatches.push({ col, expected, actual: v ?? null });
    }
  }

  // Meta
  const meta = {
    client: readString(ws, 'B', 2),
    service: readString(ws, 'B', 4),
    bv: readString(ws, 'B', 6),
    bidder: readString(ws, 'B', 8),
    nettoFromFile: readNumber(ws, 'F', 8),
    bruttoFromFile: readNumber(ws, 'F', 10),
  };

  // Zuschlag matrix
  const zsch = {
    stoffe: readNumber(ws, 'K', 4),
    nu: readNumber(ws, 'K', 5),
    geraete: readNumber(ws, 'K', 6),
    lohn: readNumber(ws, 'K', 7),
  };

  // Stundensatz / Mittellohn
  const mittellohn = readNumber(ws, 'K', 2);
  const stundensatz = readNumber(ws, 'M', 2);

  // Hotspot formula errors
  const hotspots = ['U2','U3','U4','U12'];
  const hotspotErrors = hotspots.map((h) => ({
    ref: h,
    isError: isErrorCell(ws[h]),
    value: ws[h]?.v ?? null,
    formula: ws[h]?.f ?? null,
  }));
  const hasHotspotErrors = hotspotErrors.some((h) => h.isError);

  // Position scan + group count
  let posCount = 0;
  let groupCount = 0;
  let bufferCount = 0;
  let maxLevel = 0;
  const sampleByLevel = {};
  const allFormulaErrors = [];
  const customerZone = ['A','B','C','D','E','F','G'];
  const positionRowsSample = [];

  for (let r = 14; r <= range.e.r + 1; r++) {
    // Scan all customer-zone cells for errors
    for (const c of customerZone) {
      const cell = ws[c + r];
      if (isErrorCell(cell)) {
        allFormulaErrors.push({
          ref: c + r,
          value: String(cell.v),
          formula: cell.f ?? null,
          customerZone: true,
        });
      }
    }
    const cells = {
      oz: ws['A' + r]?.v ?? '',
      A: ws['A' + r]?.v ?? null,
      B: ws['B' + r]?.v ?? null,
      C: ws['C' + r]?.v ?? null,
      D: ws['D' + r]?.v ?? null,
      E: ws['E' + r]?.v ?? null,
      F: ws['F' + r]?.v ?? null,
    };
    const isEntirelyEmpty = Object.values(cells).every((v) => v === null || v === '' || v === undefined);
    if (isEntirelyEmpty) continue;
    const kind = classifyRow(cells);
    if (kind === 'group') groupCount++;
    else if (kind === 'buffer') bufferCount++;
    else {
      posCount++;
      const lvl = ozLevel(cells.oz);
      if (lvl > maxLevel) maxLevel = lvl;
      if (!sampleByLevel[lvl] && positionRowsSample.length < 5) {
        sampleByLevel[lvl] = { row: r, oz: cells.oz, A: cells.A, B: cells.B, C: cells.C, D: cells.D, E: cells.E };
      }
      if (positionRowsSample.length < 5) positionRowsSample.push({ row: r, kind, oz: cells.oz, A: cells.A, B: cells.B });
    }
  }

  // Also scan internal-zone cells for formula errors (Faktoren-Lookup hotspots)
  for (let r = 1; r <= range.e.r + 1; r++) {
    // Just internal zone cols (N..AP) scan
    const startCol = XLSX.utils.decode_col('N');
    const endCol = Math.min(range.e.c, XLSX.utils.decode_col('AP'));
    for (let c = startCol; c <= endCol; c++) {
      const ref = XLSX.utils.encode_cell({ c, r: r - 1 });
      const cell = ws[ref];
      if (isErrorCell(cell)) {
        allFormulaErrors.push({
          ref,
          value: String(cell.v),
          formula: cell.f ?? null,
          customerZone: false,
        });
      }
    }
  }

  // Faktoren-Lookup grid scan (cols N-W rows 2-12) — count non-empty
  const factorCols = ['N','O','P','Q','R','S','T','U','V','W'];
  let faktorenNonEmpty = 0;
  for (let r = 2; r <= 12; r++) {
    for (const c of factorCols) {
      const cell = ws[c + r];
      if (cell && cell.v != null) faktorenNonEmpty++;
    }
  }

  return {
    ...ex,
    found: true,
    path,
    sheetNames,
    chosenSheet: targetSheet,
    sheetMatchesKalkulation: targetSheet === 'Kalkulation',
    range: ref,
    maxRow: range.e.r + 1,
    maxCol: range.e.c + 1,
    missingAnchors,
    row13Mismatches,
    meta,
    zuschlag: zsch,
    mittellohn,
    stundensatz,
    hotspotErrors,
    hasHotspotErrors,
    posCount,
    groupCount,
    bufferCount,
    maxLevel,
    sampleByLevel,
    positionRowsSample,
    allFormulaErrors: allFormulaErrors.slice(0, 50),
    allFormulaErrorsCount: allFormulaErrors.length,
    faktorenNonEmpty,
  };
}

const results = EXAMPLES.map(auditFile);

mkdirSync('/tmp/kalku-parse', { recursive: true });
writeFileSync('/tmp/kalku-parse/audit-10.json', JSON.stringify(results, null, 2));
console.log('Wrote /tmp/kalku-parse/audit-10.json');

// Short summary table to stdout
console.log('');
console.log('id    | sheet?              | rows | pos | grp | buf | hotErrs | allErrs | client');
console.log('------|---------------------|------|-----|-----|-----|---------|---------|---------------------');
for (const r of results) {
  if (!r.found) {
    console.log(`${r.id.padEnd(5)} | MISSING ${r.error}`);
    continue;
  }
  const sheet = r.chosenSheet.padEnd(18);
  const rows = String(r.maxRow).padStart(4);
  const pos = String(r.posCount).padStart(3);
  const grp = String(r.groupCount).padStart(3);
  const buf = String(r.bufferCount).padStart(3);
  const hotErrs = r.hasHotspotErrors ? 'YES' : 'no';
  const allErrs = String(r.allFormulaErrorsCount).padStart(3);
  console.log(`${r.id.padEnd(5)} | ${sheet} | ${rows} | ${pos} | ${grp} | ${buf} | ${hotErrs.padStart(7)} | ${allErrs.padStart(7)} | ${r.meta.client.slice(0, 30)}`);
}
