// Round 5 PART V: cross-classify the Kalkulation template across all 10
// example LV files (the original 4 + the 6 new ones). Augments the existing
// `audit-parser-10examples.mjs` by capturing:
//   - header block (rows 1-13) every non-empty cell — for variance detection
//   - row-13 column labels across cols A..AP — for new-column detection
//   - N..AP column population sample (rows 13-30) — for "are columns used?"
//   - unique OZ patterns / depth distribution per file
//   - formula-error cell inventory across the whole sheet
//   - Zuschlag matrix + KG group counts
//
// READ-ONLY. Pure file reads — no risk of conflict with PART R/S/T/U.
//
// Output: /tmp/kalku-parse/classify-10.json (full data dump)
//         /tmp/kalku-parse/classify-10-summary.json (compact summary)
// Use:    node scripts/classify-10examples.mjs

import XLSX from 'xlsx';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HOME = process.env.HOME ?? '';

const EXAMPLES = [
  { id: 'ex1',  folder: 'example 1',  base: 'Desktop/Claude',  xlsx: 'LV3_BH_mit_Preisen.xlsx' },
  { id: 'ex2',  folder: 'example 2',  base: 'Desktop/Claude',  xlsx: 'LV3.xlsx' },
  { id: 'ex3',  folder: 'example 3',  base: 'Desktop/Claude',  xlsx: 'LV3.xlsx' },
  { id: 'ex4',  folder: 'example 4',  base: 'Desktop/Claude',  xlsx: 'LV3_FW_mit_Preisen.xlsx' },
  { id: 'ex5',  folder: 'example 5',  base: 'Desktop/claude1', xlsx: 'LV3_.xlsx' },
  { id: 'ex6',  folder: 'example 6',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx' },
  { id: 'ex7',  folder: 'example 7',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx' },
  { id: 'ex8',  folder: 'example 8',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx' },
  { id: 'ex9',  folder: 'example 9',  base: 'Desktop/claude1', xlsx: 'LV3.xlsx' },
  { id: 'ex10', folder: 'example 10', base: 'Desktop/claude1', xlsx: 'LV3.xlsx' },
];

const ERROR_TYPES = new Set(['#VALUE!', '#REF!', '#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!']);

// Canonical 4-file template — re-verified row-13 column labels
const ROW13_CANON = {
  A: 'Pos.',
  B: 'Bezeichnung',
  C: 'Menge',
  E: 'EP',
  F: 'GP',
  I: 'EP', // "EP | EK" Stoffe
  J: 'Min/Einheit',
  K: 'Lstg./Std.',
  L: 'Lstg./Std.',
  M: 'EP', // "EP | EK" NU
};

function isErrorCell(cell) {
  if (!cell) return false;
  if (cell.t === 'e') return true;
  if (typeof cell.v === 'string' && ERROR_TYPES.has(cell.v)) return true;
  return false;
}

function colLetter(idx) {
  let s = '';
  let n = idx;
  while (true) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

function colIdx(letter) {
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64);
  }
  return n - 1;
}

function readCell(ws, ref) {
  const cell = ws[ref];
  if (!cell) return { value: null, formula: null, type: null, isError: false };
  return {
    value: cell.v ?? null,
    formula: cell.f ?? null,
    type: cell.t ?? null,
    isError: isErrorCell(cell),
  };
}

function readRow(ws, row, fromCol, toCol) {
  const out = {};
  const a = colIdx(fromCol);
  const b = colIdx(toCol);
  for (let c = a; c <= b; c++) {
    const letter = colLetter(c);
    const cell = readCell(ws, letter + row);
    if (cell.value !== null || cell.formula !== null) {
      out[letter] = cell;
    }
  }
  return out;
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
function ozKey(raw) { return ozSegments(raw).join('.'); }

function classifyRow(cells) {
  const lvl = ozLevel(cells.A);
  const hasUnit = cells.D != null && String(cells.D).trim().length > 0;
  const hasEP = typeof cells.E === 'number' && Number.isFinite(cells.E);
  const hasMenge = typeof cells.C === 'number' && Number.isFinite(cells.C);
  const hasDescription = cells.B != null && String(cells.B).trim().length > 0;
  if (lvl === 0) {
    if (hasDescription) return 'buffer';
    return 'empty';
  }
  if (hasUnit && hasEP) return 'position';
  if (hasMenge && !hasUnit && !hasEP) return 'group';
  if (!hasUnit && !hasEP) return 'group';
  return 'position';
}

function classifyFile(ex) {
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
  const maxRow = range.e.r + 1;
  const maxCol = range.e.c + 1;
  const maxColLetter = colLetter(range.e.c);

  // 1) Header block (rows 1-12) — capture every non-empty cell across all cols
  const headerBlock = {};
  for (let r = 1; r <= Math.min(12, maxRow); r++) {
    headerBlock[r] = readRow(ws, r, 'A', maxColLetter);
  }

  // 2) Row-13 column header labels (cols A..AP)
  const row13 = {};
  for (let c = 0; c <= Math.min(range.e.c, colIdx('AP')); c++) {
    const letter = colLetter(c);
    const cell = readCell(ws, letter + 13);
    if (cell.value !== null) {
      row13[letter] = String(cell.value).trim();
    }
  }

  // 3) Row-13 mismatches vs canon
  const row13Mismatches = [];
  for (const [col, expected] of Object.entries(ROW13_CANON)) {
    const actual = row13[col] ?? null;
    if (!actual || !normalizeLabel(actual).startsWith(normalizeLabel(expected))) {
      row13Mismatches.push({ col, expected, actual });
    }
  }

  // 4) Sample N..AP column population for rows 13-30 (first 5 data rows)
  //    — captures whether those internal columns are actually used per file
  const internalPopulation = {};
  const internalCols = [];
  for (let c = colIdx('N'); c <= Math.min(range.e.c, colIdx('AP')); c++) {
    internalCols.push(colLetter(c));
  }
  for (const letter of internalCols) {
    const sample = [];
    let populated = 0;
    for (let r = 13; r <= Math.min(maxRow, 30); r++) {
      const cell = readCell(ws, letter + r);
      if (cell.value !== null) {
        populated++;
        if (sample.length < 5) {
          sample.push({
            row: r,
            value: typeof cell.value === 'number' ? cell.value : String(cell.value).slice(0, 40),
            formula: cell.formula ? cell.formula.slice(0, 40) : null,
            isError: cell.isError,
          });
        }
      }
    }
    internalPopulation[letter] = {
      header: row13[letter] ?? null,
      populatedRows: populated,
      totalSampledRows: Math.min(maxRow, 30) - 13 + 1,
      sample,
    };
  }

  // 5) OZ hierarchy distribution
  const ozPatterns = {};      // { key -> count } for unique normalized keys
  const ozRawSamples = [];    // first instance of each unique raw shape
  const seenRawShapes = new Set();
  const levelHistogram = {};  // { level -> count }
  const kinds = { position: 0, group: 0, buffer: 0, empty: 0 };
  let maxLevel = 0;

  for (let r = 14; r <= maxRow; r++) {
    const cells = {
      A: ws['A' + r]?.v ?? null,
      B: ws['B' + r]?.v ?? null,
      C: ws['C' + r]?.v ?? null,
      D: ws['D' + r]?.v ?? null,
      E: ws['E' + r]?.v ?? null,
      F: ws['F' + r]?.v ?? null,
    };
    const rawShape = typeof cells.A === 'string'
      ? cells.A.replace(/[0-9]/g, '#') // shape, not value (e.g. " #. #. #" for 4-level)
      : '';
    if (cells.A != null && !seenRawShapes.has(rawShape) && ozRawSamples.length < 12) {
      seenRawShapes.add(rawShape);
      ozRawSamples.push({ raw: cells.A, shape: rawShape, row: r });
    }
    const lvl = ozLevel(cells.A);
    levelHistogram[lvl] = (levelHistogram[lvl] || 0) + 1;
    if (lvl > maxLevel) maxLevel = lvl;
    const key = ozKey(cells.A);
    if (key) ozPatterns[key] = (ozPatterns[key] || 0) + 1;
    const kind = classifyRow(cells);
    kinds[kind] = (kinds[kind] || 0) + 1;
  }

  // 6) Formula-error inventory (whole sheet, all cells)
  const allErrors = [];
  for (let r = 1; r <= maxRow; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const letter = colLetter(c);
      const cell = ws[letter + r];
      if (isErrorCell(cell)) {
        allErrors.push({
          ref: letter + r,
          value: String(cell.v),
          formula: cell.f ?? null,
          row: r,
          col: letter,
          customerZone: ['A','B','C','D','E','F','G'].includes(letter),
        });
      }
    }
  }

  // 7) Header anchor verification
  const HEADER_ANCHORS = [
    { row: 2, col: 'A', label: 'AG:' },
    { row: 4, col: 'A', label: 'Leistung:' },
    { row: 6, col: 'A', label: 'BV:' },
    { row: 8, col: 'A', label: 'Bieter:' },
    { row: 8, col: 'C', label: 'Netto Angebotssumme' },
    { row: 9, col: 'C', label: 'MwSt.:' },
    { row: 10, col: 'C', label: 'Brutto Angebotssumme' },
  ];
  const missingAnchors = [];
  for (const a of HEADER_ANCHORS) {
    const v = ws[a.col + a.row]?.v;
    if (typeof v !== 'string' || normalizeLabel(v) !== normalizeLabel(a.label)) {
      missingAnchors.push({ ...a, actual: v ?? null });
    }
  }

  // 8) Zuschlag matrix (rows 4-7, cols I-M)
  const zuschlag = {
    stoffe: {
      ek: ws['J4']?.v ?? null,
      zschlg: ws['K4']?.v ?? null,
      vk: ws['L4']?.v ?? null,
      diff: ws['M4']?.v ?? null,
    },
    nu: {
      ek: ws['J5']?.v ?? null,
      zschlg: ws['K5']?.v ?? null,
      vk: ws['L5']?.v ?? null,
      diff: ws['M5']?.v ?? null,
    },
    geraete: {
      ek: ws['J6']?.v ?? null,
      zschlg: ws['K6']?.v ?? null,
      vk: ws['L6']?.v ?? null,
      diff: ws['M6']?.v ?? null,
    },
    lohn: {
      ek: ws['J7']?.v ?? null,
      zschlg: ws['K7']?.v ?? null,
      vk: ws['L7']?.v ?? null,
      diff: ws['M7']?.v ?? null,
    },
  };

  // 9) Stundensatz & Mittellohn & Zeitwert
  const stundensatz = ws['M2']?.v ?? null;
  const mittellohn = ws['K2']?.v ?? null;
  const zeitwert = ws['J11']?.v ?? null;

  // 10) Meta
  const meta = {
    client: typeof ws['B2']?.v === 'string' ? ws['B2'].v.trim() : (ws['B2']?.v ?? null),
    service: typeof ws['B4']?.v === 'string' ? ws['B4'].v.trim() : (ws['B4']?.v ?? null),
    bv: typeof ws['B6']?.v === 'string' ? ws['B6'].v.trim() : (ws['B6']?.v ?? null),
    bidder: typeof ws['B8']?.v === 'string' ? ws['B8'].v.trim() : (ws['B8']?.v ?? null),
    nettoFromFile: ws['F8']?.v ?? null,
    bruttoFromFile: ws['F10']?.v ?? null,
  };

  // 11) Hotspot formula-error check (U2/U3/U4/U12)
  const hotspots = ['U2','U3','U4','U12'];
  const hotspotErrors = hotspots.map((h) => ({
    ref: h,
    isError: isErrorCell(ws[h]),
    value: ws[h]?.v ?? null,
    formula: ws[h]?.f ?? null,
  }));
  const hasHotspotErrors = hotspotErrors.some((h) => h.isError);

  return {
    ...ex,
    found: true,
    path,
    sheetName: targetSheet,
    sheetNames,
    maxRow,
    maxCol,
    maxColLetter,
    range: ref,
    missingAnchors,
    row13,
    row13Mismatches,
    meta,
    zuschlag,
    stundensatz,
    mittellohn,
    zeitwert,
    internalPopulation,
    ozRawSamples,
    ozPatternsCount: Object.keys(ozPatterns).length,
    levelHistogram,
    kinds,
    maxLevel,
    allErrors,
    allErrorsCount: allErrors.length,
    customerZoneErrors: allErrors.filter((e) => e.customerZone),
    customerZoneErrorsCount: allErrors.filter((e) => e.customerZone).length,
    hotspotErrors,
    hasHotspotErrors,
    headerBlock,
  };
}

const results = EXAMPLES.map(classifyFile);

mkdirSync('/tmp/kalku-parse', { recursive: true });
writeFileSync('/tmp/kalku-parse/classify-10.json', JSON.stringify(results, null, 2));
console.log('Wrote /tmp/kalku-parse/classify-10.json');

// Compact summary
const summary = results.map((r) => {
  if (!r.found) return { id: r.id, found: false, error: r.error };
  return {
    id: r.id,
    file: `${r.folder}/${r.xlsx}`,
    sheetName: r.sheetName,
    maxRow: r.maxRow,
    maxCol: r.maxCol,
    maxColLetter: r.maxColLetter,
    posCount: r.kinds.position,
    groupCount: r.kinds.group,
    bufferCount: r.kinds.buffer,
    maxLevel: r.maxLevel,
    missingAnchorsCount: r.missingAnchors.length,
    row13MismatchesCount: r.row13Mismatches.length,
    row13Mismatches: r.row13Mismatches,
    hasHotspotErrors: r.hasHotspotErrors,
    allErrorsCount: r.allErrorsCount,
    customerZoneErrorsCount: r.customerZoneErrorsCount,
    zsch_stoffe: r.zuschlag.stoffe.zschlg,
    zsch_nu: r.zuschlag.nu.zschlg,
    zsch_geraete: r.zuschlag.geraete.zschlg,
    zsch_lohn: r.zuschlag.lohn.zschlg,
    stundensatz: r.stundensatz,
    mittellohn: r.mittellohn,
    zeitwert: r.zeitwert,
    client: r.meta.client,
  };
});
writeFileSync('/tmp/kalku-parse/classify-10-summary.json', JSON.stringify(summary, null, 2));
console.log('Wrote /tmp/kalku-parse/classify-10-summary.json');

// Stdout dashboard
console.log('');
console.log('id    | rows | cols | pos | grp | buf | lvl | r13mis | anchMis | hotE | allE | client');
console.log('------|------|------|-----|-----|-----|-----|--------|---------|------|------|-------');
for (const r of results) {
  if (!r.found) {
    console.log(`${r.id.padEnd(5)} | MISSING ${r.error}`);
    continue;
  }
  console.log(
    `${r.id.padEnd(5)} | ${String(r.maxRow).padStart(4)} | ${String(r.maxCol).padStart(4)} | ${String(r.kinds.position).padStart(3)} | ${String(r.kinds.group).padStart(3)} | ${String(r.kinds.buffer).padStart(3)} | ${String(r.maxLevel).padStart(3)} | ${String(r.row13Mismatches.length).padStart(6)} | ${String(r.missingAnchors.length).padStart(7)} | ${r.hasHotspotErrors ? 'YES' : ' no'} | ${String(r.allErrorsCount).padStart(4)} | ${String(r.meta.client).slice(0, 30)}`,
  );
}

// Row-13 mismatches per file
console.log('');
console.log('Row-13 mismatches per file:');
for (const r of results) {
  if (!r.found || r.row13Mismatches.length === 0) continue;
  console.log(`  ${r.id}:`);
  for (const m of r.row13Mismatches) {
    console.log(`    ${m.col}: expected "${m.expected}" got ${JSON.stringify(m.actual)}`);
  }
}

// Stundensatz / Zuschlag distribution
console.log('');
console.log('Zuschlag matrix per file (Stoffe/NU/Geräte/Lohn pct + Stundensatz):');
for (const r of results) {
  if (!r.found) continue;
  const z = r.zuschlag;
  console.log(`  ${r.id}: Stf=${z.stoffe.zschlg} NU=${z.nu.zschlg} Ger=${z.geraete.zschlg} Lhn=${z.lohn.zschlg} StdS=${r.stundensatz} MitL=${r.mittellohn} Zwt=${r.zeitwert}`);
}

// Internal columns that DIFFER from the canonical row-13 across files
const allColsSeen = new Set();
for (const r of results) {
  if (!r.found) continue;
  for (const c of Object.keys(r.row13)) allColsSeen.add(c);
}
const sortedCols = Array.from(allColsSeen).sort((a, b) => colIdx(a) - colIdx(b));
console.log('');
console.log('Row-13 labels — union across all 10 files:');
for (const c of sortedCols) {
  const labels = new Set();
  for (const r of results) {
    if (!r.found) continue;
    if (r.row13[c]) labels.add(r.row13[c]);
  }
  if (labels.size > 1) {
    console.log(`  ${c}: VARIES → ${Array.from(labels).map((l) => JSON.stringify(l)).join(' | ')}`);
  } else {
    console.log(`  ${c}: ${JSON.stringify(Array.from(labels)[0])}`);
  }
}

// Newly populated columns in ex5-10 that ex1-4 don't use
console.log('');
console.log('Internal-zone columns where the new examples (5-10) have data but the originals (1-4) do not, or vice versa:');
for (let c = colIdx('N'); c <= colIdx('AP'); c++) {
  const letter = colLetter(c);
  const oldPop = [];
  const newPop = [];
  for (const r of results) {
    if (!r.found) continue;
    const populated = r.internalPopulation[letter]?.populatedRows ?? 0;
    if (Number(r.id.replace(/[^0-9]/g, '')) <= 4) {
      if (populated > 0) oldPop.push(r.id);
    } else {
      if (populated > 0) newPop.push(r.id);
    }
  }
  if (oldPop.length === 0 && newPop.length > 0) {
    console.log(`  ${letter}: only in NEW → ${newPop.join(', ')}`);
  } else if (oldPop.length > 0 && newPop.length === 0) {
    console.log(`  ${letter}: only in OLD → ${oldPop.join(', ')}`);
  }
}

// OZ shape distribution
console.log('');
console.log('OZ raw shapes observed per file (first instance of each unique shape):');
for (const r of results) {
  if (!r.found) continue;
  console.log(`  ${r.id} (maxLvl=${r.maxLevel}, patterns=${r.ozPatternsCount}):`);
  for (const s of r.ozRawSamples.slice(0, 4)) {
    const safe = typeof s.raw === 'string' ? s.raw : String(s.raw);
    console.log(`    row ${s.row}: "${safe}" → shape "${s.shape}"`);
  }
}

// Customer-zone errors (these would block import)
console.log('');
console.log('Customer-zone (A:G) formula errors — these would block import:');
let anyCustomerErr = false;
for (const r of results) {
  if (!r.found) continue;
  if (r.customerZoneErrorsCount > 0) {
    anyCustomerErr = true;
    console.log(`  ${r.id}: ${r.customerZoneErrorsCount} errors`);
    for (const e of r.customerZoneErrors.slice(0, 5)) {
      console.log(`    ${e.ref}: ${e.value} ${e.formula ? `(${e.formula})` : ''}`);
    }
  }
}
if (!anyCustomerErr) console.log('  (none — customer zone is clean across all 10 files)');
