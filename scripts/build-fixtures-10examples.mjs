// Round 5 PART T — generate per-example vitest fixtures with sentinel rows.
//
// Reads each of the 10 real LV xlsx files, extracts the first ~12 positions
// from the Kalkulation sheet (header + group + leaf positions), appends 3
// canonical SENTINEL rows (hidden-standard, wagnis-internal, visible-with-
// sentinel-internals), and writes a TypeScript fixture file per example:
//
//   src/features/kalkulation/__fixtures__/lv_ex{N}.ts   (N = 2..10)
//
// Each fixture exports `LV_EX{N}_FIXTURE: ProjectData` and re-exports the
// shared `SENTINELS` constant from `lv3_bh.ts`. The leak tests in
// `PositionTableV2.leak.test.tsx` and `PositionCommentPanel.leak.test.tsx`
// loop over all 10 fixtures and assert that NO sentinel value ever appears
// in the rendered KUNDEN-view HTML — even after a live ZSCHLG % edit.
//
// Important: we DON'T depend on the production parser (parse.ts) for
// fixture construction — we extract raw cells via SheetJS directly. This
// keeps the leak-detection harness independent of PART R's parser fixes.
// If the parser later changes shape, the leak tests still run.
//
// Usage:
//   node scripts/build-fixtures-10examples.mjs
//
// Idempotent — re-running overwrites the generated .ts files.

import XLSX from 'xlsx';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HOME = process.env.HOME ?? '';

const EXAMPLES = [
  // ex1 is hand-curated in lv3_bh.ts and re-exports SENTINELS — skipped here.
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

const OUT_DIR = join(
  process.cwd(),
  'src/features/kalkulation/__fixtures__',
);

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

function ozLevel(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const parts = s.split('.').map((p) => p.trim()).filter((p) => p.length > 0);
  return parts.length;
}

function classifyRow(row) {
  const lvl = ozLevel(row.A);
  const hasUnit = row.D != null && String(row.D).trim().length > 0;
  const hasEP = typeof row.E === 'number' && Number.isFinite(row.E);
  const hasMenge = typeof row.C === 'number' && Number.isFinite(row.C);
  const hasDescription = row.B != null && String(row.B).trim().length > 0;
  if (lvl === 0 && !hasDescription) return 'empty';
  if (lvl === 0) return 'buffer';
  if (hasUnit && hasEP) return 'position';
  if (hasMenge && !hasUnit && !hasEP) return 'group';
  if (!hasUnit && !hasEP) return 'group';
  return 'position';
}

function escapeStringLiteral(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
}

/**
 * Pull 12-20 representative rows from row 14 onward. The slice should
 * include at least one group header and several leaf positions so the leak
 * test exercises group + position rendering.
 */
function extractPositions(ws) {
  const ref = ws['!ref'] ?? 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  const maxRow = range.e.r + 1;
  const out = [];
  let captured = 0;
  let r = 14;
  while (r <= maxRow && captured < 14) {
    const row = {
      A: ws['A' + r]?.v ?? null,
      B: ws['B' + r]?.v ?? null,
      C: ws['C' + r]?.v ?? null,
      D: ws['D' + r]?.v ?? null,
      E: ws['E' + r]?.v ?? null,
      F: ws['F' + r]?.v ?? null,
      I: ws['I' + r]?.v ?? null, // EK (read-only display)
      J: ws['J' + r]?.v ?? null, // Min/Einheit (internal)
      K: ws['K' + r]?.v ?? null, // Lstg./Std. (internal)
      L: ws['L' + r]?.v ?? null,
      M: ws['M' + r]?.v ?? null,
    };
    const kind = classifyRow(row);
    if (kind === 'empty') { r++; continue; }
    if (kind === 'buffer') { r++; continue; }
    out.push({ row: r, kind, ...row });
    captured++;
    r++;
  }
  return out;
}

function makePosLines(rows, sortOffset) {
  const lines = [];
  let i = sortOffset;
  for (const r of rows) {
    i++;
    const ozRaw = r.A == null ? '' : String(r.A);
    const isHeader = r.kind === 'group';
    const shortText = r.B == null ? '' : String(r.B);
    const quantity = typeof r.C === 'number' && Number.isFinite(r.C) ? r.C : 0;
    const unit = r.D == null ? '' : String(r.D);
    const ep = typeof r.E === 'number' && Number.isFinite(r.E) ? r.E : 0;
    const ek = typeof r.I === 'number' && Number.isFinite(r.I) ? r.I : 0;
    const timeMinutes = typeof r.J === 'number' && Number.isFinite(r.J) ? r.J : 0;
    // sectionPath: use OZ trimmed of trailing leaf if it's a position
    const ozParts = ozRaw.split('.').map((p) => p.trim()).filter(Boolean);
    const sectionPath = isHeader ? ozParts.join('.') : ozParts.slice(0, -1).join('.');

    lines.push(
      `    pos({\n` +
      `      id: 'p${String(i).padStart(3, '0')}', sortOrder: ${i},\n` +
      `      oz: '${escapeStringLiteral(ozRaw)}',\n` +
      `      shortText: '${escapeStringLiteral(shortText.slice(0, 120))}',\n` +
      (quantity ? `      quantity: ${quantity}, ` : '') +
      (unit ? `unit: '${escapeStringLiteral(unit)}',\n` : (quantity ? '\n' : '')) +
      (ek ? `      materialCost: ${ek},\n` : '') +
      (timeMinutes ? `      timeMinutes: ${timeMinutes},\n` : '') +
      (isHeader ? `      isHeader: true,\n` : '') +
      `      sectionPath: '${escapeStringLiteral(sectionPath)}',\n` +
      `    }),`
    );
  }
  return lines.join('\n');
}

function buildFile(ex) {
  const path = join(HOME, ex.base, ex.folder, ex.xlsx);
  if (!existsSync(path)) throw new Error(`missing ${path}`);
  const wb = XLSX.readFile(path, { cellFormula: true });
  const sheetName = wb.SheetNames.find((n) => n === 'Kalkulation') ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const meta = {
    client: readString(ws, 'B', 2),
    service: readString(ws, 'B', 4),
    bv: readString(ws, 'B', 6),
    bidder: readString(ws, 'B', 8),
    tenderNumber: readString(ws, 'F', 4),
    deadline: readString(ws, 'F', 6),
    mittellohn: readNumber(ws, 'K', 2) ?? 30,
    stundensatz: readNumber(ws, 'M', 2) ?? 49.9,
    zschlgStoffe: readNumber(ws, 'K', 4) ?? 0.12,
  };

  const rows = extractPositions(ws);
  // Body
  const Nlit = ex.id.replace(/^ex/, '');
  const constName = `LV_${ex.id.toUpperCase()}_FIXTURE`;

  const posLines = makePosLines(rows, 0);
  const sentinelStart = rows.length + 100;

  const fixtureSrc = `/**
 * Round 5 PART T — auto-generated fixture for ${ex.id} (${ex.folder}/${ex.xlsx}).
 *
 * Source: \`~/${ex.base}/${ex.folder}/${ex.xlsx}\`, sheet \`${sheetName}\`.
 * Built by \`scripts/build-fixtures-10examples.mjs\` on import-time cells.
 *
 * Real positions extracted from rows 14+ (first ~${rows.length}).
 * THREE sentinel rows appended (hidden-standard / wagnis-internal /
 * visible-with-sentinel-internals) — the leak test asserts NONE of
 * SENTINELS' values appear in rendered KUNDEN-view HTML.
 *
 * DO NOT HAND-EDIT — regenerate with the script above.
 */

import type { Position, ProjectData } from '../types';
import { DEFAULT_CALC_PARAMS } from '../calc';
import { SENTINELS } from './lv3_bh';

export { SENTINELS };

function pos(overrides: Partial<Position>): Position {
  return {
    id: overrides.id ?? 'unset',
    oz: '',
    shortText: '',
    longText: '',
    hinweisText: '',
    quantity: 0,
    unit: '',
    materialCost: 0,
    timeMinutes: 0,
    nuCost: 0,
    isHeader: false,
    sortOrder: 0,
    sectionPath: '',
    epLohn: 0,
    epMaterial: 0,
    epGeraet: 0,
    epNu: 0,
    ep: 0,
    gp: 0,
    visibleToCustomer: true,
    positionType: 'standard',
    ...overrides,
  };
}

export const ${constName}: ProjectData = {
  name: '${escapeStringLiteral(meta.bv || meta.service || 'LV ' + ex.id)}',
  client: '${escapeStringLiteral(meta.client)}',
  clientEmail: '',
  clientAddress: '',
  service: '${escapeStringLiteral(meta.service)}',
  tenderNumber: '${escapeStringLiteral(meta.tenderNumber)}',
  deadline: '${escapeStringLiteral(meta.deadline)}',
  bidder: '${escapeStringLiteral(meta.bidder)}',
  calcParams: {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: ${meta.mittellohn},
    verrechnungslohn: ${meta.stundensatz},
    materialZuschlag: ${typeof meta.zschlgStoffe === 'number' ? meta.zschlgStoffe : 0.12},
  },
  positions: [
${posLines}

    // ---- LEAK-TEST SENTINELS ----
    // (a) hidden-standard — visibleToCustomer=false, sentinel internals
    pos({
      id: 'sentinel-${ex.id}-hidden', sortOrder: ${sentinelStart},
      oz: ' 9. 9. 9.  .   1',
      shortText: 'SENTINEL — hidden standard row',
      quantity: 1, unit: 'St',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      visibleToCustomer: false,
      sectionPath: '9.9.9',
    }),
    // (b) wagnis-internal — positionType filter must win regardless of vTC
    pos({
      id: 'sentinel-${ex.id}-wagnis', sortOrder: ${sentinelStart + 1},
      oz: ' 9. 9. 9.  .   2',
      shortText: 'SENTINEL — wagnis internal row',
      quantity: 1, unit: 'pschl.',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      positionType: 'wagnis',
      visibleToCustomer: true,
      sectionPath: '9.9.9',
    }),
    // (c) visible row with sentinel internals — derived EP/GP may render,
    //     but raw materialCost / timeMinutes / nuCost must NOT.
    pos({
      id: 'sentinel-${ex.id}-visible', sortOrder: ${sentinelStart + 2},
      oz: ' 9. 9. 9.  .   3',
      shortText: 'SENTINEL — visible row with sentinel internals',
      quantity: 1, unit: 'St',
      materialCost: SENTINELS.materialCost,
      timeMinutes: SENTINELS.timeMinutes,
      nuCost: SENTINELS.nuCost,
      visibleToCustomer: true,
      sectionPath: '9.9.9',
    }),
  ],
  notes: '',
};
`;

  const outPath = join(OUT_DIR, `lv_${ex.id}.ts`);
  writeFileSync(outPath, fixtureSrc);
  return { outPath, rowCount: rows.length };
}

mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
for (const ex of EXAMPLES) {
  try {
    const r = buildFile(ex);
    console.log(`  ${ex.id}: wrote ${r.outPath} (${r.rowCount} rows + 3 sentinels)`);
    total++;
  } catch (err) {
    console.error(`  ${ex.id}: FAILED — ${err.message}`);
  }
}
console.log(`Done — ${total}/${EXAMPLES.length} fixtures written to ${OUT_DIR}`);
