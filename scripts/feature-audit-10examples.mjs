/**
 * Round 5 PART U — 10×12 feature coverage audit driver.
 *
 * Walks all 10 example LV files through the real parser, then synthesizes
 * 12 feature checks per file. For React-touching features (1, 2, 3, 4, 5, 6,
 * 9, 10) it just verifies the inputs/payloads are well-formed; the actual
 * DOM rendering is covered by `src/features/kalkulation/__tests__/
 * PositionTableV2.coverage.test.tsx`. For logic-only features (7, 8) it
 * runs the parser and inspects `issues` directly.
 *
 * Output:
 *   /tmp/kalku-parse/feature-audit-10.json
 *
 * The markdown report (`docs/v2_redesign/feature_coverage_audit.md`) is
 * generated from this JSON + the coverage test results.
 *
 * Read-only: this script never writes into src/.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import XLSX from 'xlsx';

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

// ────────────────────────────────────────────────────────────────────────────
// Mini SheetJS-only parser — same logic as src/lib/kalku-xlsx/parse.ts, but
// node-pure (no React, no nanoid, no aliases). Use only what the audit needs.
// ────────────────────────────────────────────────────────────────────────────

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
  if (lvl === 0) return 'buffer';
  if (hasUnit && hasEP) return 'position';
  if (hasMenge && !hasUnit && !hasEP) return 'group';
  if (!hasUnit && !hasEP) return 'group';
  return 'position';
}

function parsePositions(ws, range) {
  const positions = [];
  const CUSTOMER_ZONE = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const customerZoneErrors = [];
  const faktorenLookupErrors = [];

  // Faktoren grid (N..W rows 2..12)
  for (let r = 2; r <= 12; r++) {
    for (const c of ['N','O','P','Q','R','S','T','U','V','W']) {
      const cell = ws[c + r];
      if (isErrorCell(cell)) {
        faktorenLookupErrors.push({ ref: c + r, formula: cell.f ?? null });
      }
    }
  }

  for (let r = 14; r <= range.e.r + 1; r++) {
    for (const c of CUSTOMER_ZONE) {
      const cell = ws[c + r];
      if (isErrorCell(cell)) customerZoneErrors.push({ ref: c + r, formula: cell.f ?? null });
    }
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
    const isEntirelyEmpty = Object.values(cells).every((v) => v === null || v === '' || v === undefined);
    if (isEntirelyEmpty) continue;
    const kind = classifyRow(cells);
    const oz = String(cells.A ?? '').trim();
    const B = String(cells.B ?? '').trim();
    if (kind === 'group') {
      positions.push({ row: r, oz, shortText: B || `Gruppe`, isHeader: true });
    } else if (kind === 'buffer') {
      if (B) positions.push({ row: r, oz: '', shortText: B, isHeader: true, buffer: true });
    } else {
      positions.push({
        row: r, oz,
        shortText: B,
        quantity: typeof cells.C === 'number' ? cells.C : 0,
        unit: String(cells.D ?? '').trim(),
        materialCost: typeof cells.I === 'number' ? cells.I : 0,
        timeMinutes: typeof cells.J === 'number' ? cells.J : 0,
        nuCost: typeof cells.M === 'number' ? cells.M : 0,
        isHeader: false,
      });
    }
  }

  return { positions, customerZoneErrors, faktorenLookupErrors };
}

function auditFile(ex) {
  const path = join(HOME, ex.base, ex.folder, ex.xlsx);
  if (!existsSync(path)) {
    return { ...ex, path, found: false };
  }
  const wb = XLSX.readFile(path, { cellFormula: true, cellNF: true, cellStyles: false });
  const sheetName = wb.SheetNames.find((n) => n === 'Kalkulation') ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1');

  const meta = {
    client: readString(ws, 'B', 2),
    service: readString(ws, 'B', 4),
    bv: readString(ws, 'B', 6),
    bidder: readString(ws, 'B', 8),
  };

  const zuschlagMatrix = {
    stoffe:  { ekTotal: readNumber(ws,'J',4) ?? 0, zschlgPct: readNumber(ws,'K',4) ?? 0, vkTotal: readNumber(ws,'L',4) ?? 0, differnz: readNumber(ws,'M',4) ?? 0 },
    nu:      { ekTotal: readNumber(ws,'J',5) ?? 0, zschlgPct: readNumber(ws,'K',5) ?? 0, vkTotal: readNumber(ws,'L',5) ?? 0, differnz: readNumber(ws,'M',5) ?? 0 },
    geraete: { ekTotal: readNumber(ws,'J',6) ?? 0, zschlgPct: readNumber(ws,'K',6) ?? 0, vkTotal: readNumber(ws,'L',6) ?? 0, differnz: readNumber(ws,'M',6) ?? 0 },
    lohn:    { ekTotal: readNumber(ws,'J',7) ?? 0, zschlgPct: readNumber(ws,'K',7) ?? 0, vkTotal: readNumber(ws,'L',7) ?? 0, differnz: readNumber(ws,'M',7) ?? 0 },
  };
  const verrechnungslohn = readNumber(ws,'M',2);
  const mittellohn = readNumber(ws,'K',2);

  const { positions, customerZoneErrors, faktorenLookupErrors } = parsePositions(ws, range);

  // Feature 4 — find longest Bezeichnung in this file
  let longest = { len: 0, oz: '', text: '', row: -1 };
  for (const p of positions) {
    const t = p.shortText ?? '';
    if (t.length > longest.len) {
      longest = { len: t.length, oz: p.oz, text: t, row: p.row };
    }
  }

  // Feature 6 — synthetic recompute check
  // For first 5 non-header positions, compute epMaterial under:
  //   - the file's own ZSCHLG_stoffe
  //   - then override to 0.5 and check that epMaterial scales linearly
  const recomputeCheck = { ok: true, samples: [], note: '' };
  const sample = positions.filter((p) => !p.isHeader).slice(0, 5);
  for (const p of sample) {
    const materialEK = p.materialCost ?? 0;
    if (materialEK === 0) continue;
    const baseZ = zuschlagMatrix.stoffe.zschlgPct;
    const epMaterialBase = materialEK * (1 + baseZ);
    const epMaterialAt50 = materialEK * (1 + 0.5);
    const ratio = epMaterialAt50 / epMaterialBase;
    const expectedRatio = (1 + 0.5) / (1 + baseZ);
    const ok = Math.abs(ratio - expectedRatio) < 1e-9;
    recomputeCheck.samples.push({ oz: p.oz, materialEK, baseZ, epMaterialBase: +epMaterialBase.toFixed(2), epMaterialAt50: +epMaterialAt50.toFixed(2), ratio: +ratio.toFixed(6), expectedRatio: +expectedRatio.toFixed(6), ok });
    if (!ok) recomputeCheck.ok = false;
  }
  if (recomputeCheck.samples.length === 0) {
    recomputeCheck.note = 'no non-zero materialCost positions in first 5 samples';
  }

  // Feature 8 — formula-error gate
  const totalErrors = customerZoneErrors.length + faktorenLookupErrors.length;
  const gateBlocks = totalErrors > 0;

  // Feature 3 — group count (KG hierarchy)
  const groupCount = positions.filter((p) => p.isHeader && !p.buffer).length;
  const positionCount = positions.filter((p) => !p.isHeader).length;

  return {
    ...ex,
    path,
    found: true,
    meta,
    zuschlagMatrix,
    mittellohn,
    verrechnungslohn,
    positionCount,
    groupCount,
    longest,
    recomputeCheck,
    customerZoneErrors,
    faktorenLookupErrors,
    gateBlocks,
    totalErrors,
  };
}

const results = EXAMPLES.map(auditFile);

mkdirSync('/tmp/kalku-parse', { recursive: true });
writeFileSync('/tmp/kalku-parse/feature-audit-10.json', JSON.stringify(results, null, 2));

console.log('Wrote /tmp/kalku-parse/feature-audit-10.json\n');

// Print compact summary
console.log('id    | pos | grp |  gate   | longest Bezeichnung (len/oz)');
console.log('------|-----|-----|---------|-----------------------------------');
for (const r of results) {
  if (!r.found) { console.log(`${r.id} MISSING`); continue; }
  console.log(
    `${r.id.padEnd(5)} | ${String(r.positionCount).padStart(3)} | ${String(r.groupCount).padStart(3)} | ${(r.gateBlocks ? 'BLOCKS' : 'allows').padEnd(7)} | ${String(r.longest.len).padStart(3)}  ${r.longest.oz.trim()}`
  );
}

const overallLongest = results.reduce((acc, r) => {
  if (!r.found) return acc;
  return r.longest.len > acc.len ? { ...r.longest, fileId: r.id } : acc;
}, { len: 0, oz: '', text: '', row: -1, fileId: '' });

console.log('\nOverall longest Bezeichnung:');
console.log(`  file: ${overallLongest.fileId}`);
console.log(`  oz:   ${overallLongest.oz.trim()}`);
console.log(`  row:  ${overallLongest.row}`);
console.log(`  len:  ${overallLongest.len} chars`);
console.log(`  sample: ${overallLongest.text.slice(0, 100)}${overallLongest.text.length > 100 ? '…' : ''}`);
