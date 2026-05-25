/**
 * Kalkulation-template XLSX importer.
 *
 * Distinct from the generic `excelImport.ts` (which is a wizard-driven
 * any-column-to-any-field mapper for arbitrary CSV/XLSX). This module knows
 * the SPECIFIC layout of our internal Kalkulation template (the one used in
 * `~/Desktop/Claude/example {1-4}`) and:
 *
 *   - detects the header block via stable anchors (`AG:`, `Leistung:`, `BV:`,
 *     `Bieter:`, `Netto Angebotssumme`)
 *   - anchors column positions via the row-13 header (`Pos.`, `Bezeichnung`,
 *     `Menge`, `EP`, `GP`, `EP | EK`, `Min/Einheit`, `Lstg./Std.`)
 *   - whitespace-tolerantly parses the 1- to 4-level OZ hierarchy
 *   - distinguishes group rows (col-C overload — group total) from positions
 *     (col D unit + col E EP + col F GP all present)
 *   - extracts the ZSCHLG matrix (rows 4–7 cols I–M) into CalcParams
 *   - extracts the Faktoren-Lookup grid (cols N–W rows 2–12, 10×11)
 *   - inventories formula-error cells WITHOUT failing the import — see
 *     `docs/v2_redesign/column_classification.md` §5 for the rationale
 *     (refusing the import would block 3 of 4 real files)
 *
 * Public API:
 *   parseKalkulationWorkbook(File | ArrayBuffer)
 *     → Promise<ParseResult>
 *
 * Tested via `src/lib/kalku-xlsx/__tests__/parse.test.mjs` against all 4
 * example files.
 */

import { ozKey, ozLevel, classifyRow, isErrorCell, ERROR_LITERALS } from '@/features/kalkulation/ozParser.mjs';
import { makeBlankPosition, DEFAULT_CALC_PARAMS } from '@/features/kalkulation/calc';
import type {
  CalcParams,
  FaktorEntry,
  HeaderExtras,
  Position,
  ProjectData,
  ZuschlagMatrix,
  ZuschlagRow,
} from '@/features/kalkulation/types';
import { nanoid } from 'nanoid';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type ImportSeverity = 'info' | 'warning' | 'error';

export type ImportIssue = {
  severity: ImportSeverity;
  /** Sheet + cell reference like "Kalkulation!U2" */
  location: string;
  code:
    | 'formula_error'
    | 'header_anchor_missing'
    | 'col13_label_mismatch'
    | 'unparseable_oz'
    | 'empty_sheet'
    | 'multiple_sheets'
    | 'duplicate_oz';
  message: string;
};

export type FaktorRow = {
  /** "F1".."F10" — the row label as it appears in row-13 (cols N..W). */
  factorName: string;
  /** Map cell-letter (N..W) → cell contents (numeric or text). */
  cells: Record<string, number | string | null>;
};

export type ParseResult = {
  /** Final ProjectData ready to upsert via the panel's update API. */
  project: ProjectData | null;
  /** Issues encountered. severity='warning' lets the import proceed; 'error' blocks. */
  issues: ImportIssue[];
  /** True when no error-severity issues. */
  ok: boolean;
  /** Faktoren-Lookup grid extracted from cols N..W rows 2..12. May be empty. */
  faktorenLookup: FaktorRow[];
  /** Round 4 PART P: structured Faktoren-Bibliothek (one entry per non-empty
   *  row of the N-W × 2-12 grid). The UI consumes this; faktorenLookup
   *  above stays as the raw form for audit/diagnostics. */
  faktoren: FaktorEntry[];
  /** Lifted CalcParams from the ZSCHLG matrix + Stundensatz + Mittellohn. */
  derivedCalcParams: CalcParams;
  /** Round 4 PART P: full Zuschlag matrix per cost type (rows 4-7). */
  zuschlagMatrix: ZuschlagMatrix;
  /** Round 4 PART P: header-block extras (rows 8-12, cols I-M). */
  headerExtras: HeaderExtras;
  /** Raw header-block values for confirmation UI. */
  meta: {
    client: string;
    service: string;
    bv: string;
    bidder: string;
    tenderNumber: string;
    deadline: string;
    nettoFromFile: number | null;
    bruttoFromFile: number | null;
    /** Round 5 PART S: MwSt-Betrag from F9 (derivable from netto × mwst,
     *  but captured verbatim for round-trip fidelity). */
    mwstBetragFromFile: number | null;
  };
};

// ────────────────────────────────────────────────────────────────────────────
// Constants — the canonical contract documented in column_classification.md
// ────────────────────────────────────────────────────────────────────────────

const HEADER_ANCHORS = [
  { row: 2, col: 'A', label: 'AG:' },
  { row: 4, col: 'A', label: 'Leistung:' },
  { row: 6, col: 'A', label: 'BV:' },
  { row: 8, col: 'A', label: 'Bieter:' },
  { row: 8, col: 'C', label: 'Netto Angebotssumme' },
  { row: 9, col: 'C', label: 'MwSt.:' },
  { row: 10, col: 'C', label: 'Brutto Angebotssumme' },
];

const ROW13_EXPECTED: Record<string, string> = {
  A: 'Pos.',
  B: 'Bezeichnung',
  C: 'Menge',
  E: 'EP',
  F: 'GP',
  I: 'EP', // header text is "EP | EK"
  J: 'Min/Einheit',
  K: 'Lstg./Std.',
  L: 'Lstg./Std.',
  M: 'EP',
};

// ────────────────────────────────────────────────────────────────────────────
// Parser
// ────────────────────────────────────────────────────────────────────────────

/**
 * Parse a Kalkulation-template .xlsx. Lazy-imports the SheetJS library so
 * the importer's own bundle doesn't carry the xlsx weight.
 *
 * Accepts a File (browser), an ArrayBuffer (browser/Node), or a Uint8Array
 * (which is what Node's `fs.readFileSync` returns and what tests use).
 */
export async function parseKalkulationWorkbook(
  input: File | ArrayBuffer | Uint8Array,
): Promise<ParseResult> {
  const XLSX = await import('xlsx');

  // Normalize to something xlsx.read() can ingest. SheetJS handles
  // Uint8Array and ArrayBuffer directly via the 'array'/'buffer' types,
  // and File via .arrayBuffer().
  let buf: ArrayBuffer | Uint8Array;
  if (input instanceof Uint8Array) {
    buf = input;
  } else if (input instanceof ArrayBuffer) {
    buf = input;
  } else if (typeof (input as Blob).arrayBuffer === 'function') {
    buf = await (input as Blob).arrayBuffer();
  } else {
    // Last-ditch — assume it's an array-like we can pass through.
    buf = input as unknown as Uint8Array;
  }
  const wb = XLSX.read(buf, { cellFormula: true, cellNF: true, cellStyles: false, type: 'array' });

  const issues: ImportIssue[] = [];

  // 1) Sheet selection — prefer "Kalkulation" if present, else first sheet
  const sheetName = wb.SheetNames.find((n) => n === 'Kalkulation') ?? wb.SheetNames[0];
  if (!sheetName) {
    return emptyResult([{
      severity: 'error',
      location: '(workbook)',
      code: 'empty_sheet',
      message: 'Die Datei enthält keine Arbeitsblätter.',
    }]);
  }
  if (wb.SheetNames.length > 1) {
    issues.push({
      severity: 'info',
      location: '(workbook)',
      code: 'multiple_sheets',
      message: `${wb.SheetNames.length} Blätter gefunden — Import nutzt "${sheetName}".`,
    });
  }
  const ws = wb.Sheets[sheetName];

  // 2) Header anchor verification — every anchor must be present (case- and
  //    whitespace-insensitive). Missing anchors degrade to warning, not error,
  //    so a customer who renames "AG:" to "Auftraggeber:" can still re-map.
  for (const a of HEADER_ANCHORS) {
    const cell = ws[a.col + a.row];
    const v = cell?.v;
    if (typeof v !== 'string' || normalizeLabel(v) !== normalizeLabel(a.label)) {
      issues.push({
        severity: 'warning',
        location: `${sheetName}!${a.col}${a.row}`,
        code: 'header_anchor_missing',
        message: `Header-Anker "${a.label}" nicht gefunden (gelesen: ${JSON.stringify(v)}).`,
      });
    }
  }

  // 3) Row-13 column header verification (same policy)
  for (const [col, expected] of Object.entries(ROW13_EXPECTED)) {
    const cell = ws[col + 13];
    const v = cell?.v;
    if (typeof v !== 'string' || !normalizeLabel(v).startsWith(normalizeLabel(expected))) {
      issues.push({
        severity: 'warning',
        location: `${sheetName}!${col}13`,
        code: 'col13_label_mismatch',
        message: `Spalten-Header in ${col}13 nicht "${expected}" (gelesen: ${JSON.stringify(v)}).`,
      });
    }
  }

  // 4) Meta extraction from header block
  const meta = {
    client: readString(ws, 'B', 2),
    service: readString(ws, 'B', 4),
    bv: readString(ws, 'B', 6),
    bidder: readString(ws, 'B', 8),
    tenderNumber: readString(ws, 'F', 4),
    deadline: readString(ws, 'F', 2),
    nettoFromFile: readNumber(ws, 'F', 8),
    bruttoFromFile: readNumber(ws, 'F', 10),
    // Round 5 PART S: MwSt-Betrag from F9. Verbatim capture for round-trip
    // fidelity; the value is derivable from netto × mwst-rate.
    mwstBetragFromFile: readNumber(ws, 'F', 9),
  };

  // Round 4 PART P: capture the full Zuschlag matrix (rows 4-7) per cost
  // type. Distinct from `derivedCalcParams` (which extracts JUST the %
  // values) — the matrix carries EK/VK/diff too, so PART O's live edit
  // has a full base to recompute from.
  const readMatrixRow = (r: number): ZuschlagRow => ({
    ekTotal: readNumber(ws, 'J', r) ?? 0,
    zschlgPct: readNumber(ws, 'K', r) ?? 0,
    vkTotal: readNumber(ws, 'L', r) ?? 0,
    differnz: readNumber(ws, 'M', r) ?? 0,
  });
  const zuschlagMatrix: ZuschlagMatrix = {
    stoffe: readMatrixRow(4),
    nu: readMatrixRow(5),
    geraete: readMatrixRow(6),
    lohn: readMatrixRow(7),
  };

  // Round 4 PART P: header-block extras (rows 8-12).
  const headerExtras: HeaderExtras = {
    mitarbeiter: readNumber(ws, 'J', 8) ?? 0,
    gesStunden: readNumber(ws, 'L', 8) ?? 0,
    arbeitstage: readNumber(ws, 'J', 9) ?? 0,
    monate: readNumber(ws, 'L', 9) ?? 0,
    ueberschuss: readNumber(ws, 'M', 9) ?? 0,
    zeitwert: readNumber(ws, 'J', 11) ?? 0,
    kontrollsumme: readNumber(ws, 'M', 11) ?? 0,
    // Round 5 PART S: L12 Mitarbeiter-Einsatz multiplier. Constant 1 across
    // all 10 example fixtures, but the cell is editable in the Vorlage so
    // capturing it future-proofs the round-trip.
    mitarbeiterFlag: readNumber(ws, 'L', 12) ?? 1,
  };

  // 5) CalcParams derivation from ZSCHLG matrix
  const derivedCalcParams: CalcParams = {
    ...DEFAULT_CALC_PARAMS,
    mittellohn: readNumber(ws, 'K', 2) ?? DEFAULT_CALC_PARAMS.mittellohn,
    verrechnungslohn: readNumber(ws, 'M', 2) ?? DEFAULT_CALC_PARAMS.verrechnungslohn,
    // ZSCHLG values from col K, rows 4 (Stoffe), 5 (NU), 6 (Geräte)
    materialZuschlag: readNumber(ws, 'K', 4) ?? DEFAULT_CALC_PARAMS.materialZuschlag,
    nuZuschlag: readNumber(ws, 'K', 5) ?? DEFAULT_CALC_PARAMS.nuZuschlag,
    geraeteZuschlagPct: readNumber(ws, 'K', 6) ?? DEFAULT_CALC_PARAMS.geraeteZuschlagPct,
    // Zeitwert from J11 (e.g. -0.15 in example 1, +0.5 in example 2)
    zeitabzug: ((readNumber(ws, 'J', 11) ?? 0) * 100), // CalcParams expresses zeitabzug in percent
    mwst: readNumber(ws, 'D', 9) ?? DEFAULT_CALC_PARAMS.mwst,
  };

  // 6) Faktoren-Lookup grid extraction (rows 2-12, cols N-W). Each row is a
  //    factor (F10..F1 per row-13 labels). Cells may contain text tokens
  //    (e.g. "schlitz+Q2*querschnitt") OR numbers OR formula errors.
  const faktorenLookup: FaktorRow[] = [];
  const faktoren: FaktorEntry[] = [];
  const factorCols = ['N','O','P','Q','R','S','T','U','V','W'];
  for (let r = 2; r <= 12; r++) {
    const rowFactor: FaktorRow = {
      factorName: `Row${r}`,
      cells: {},
    };
    for (const c of factorCols) {
      const cell = ws[c + r];
      if (!cell) continue;
      if (isErrorCell(cell)) {
        // Round 2 policy: ALL formula errors are blocking (severity='error').
        // Reasoning: even though Faktoren-Lookup cells are not directly shown
        // to the customer, the user explicitly asked for a hard gate. They
        // can fix the file in Excel and re-import, OR (escape hatch) use the
        // generic mapping wizard which doesn't trip on these cells.
        issues.push({
          severity: 'error',
          location: `${sheetName}!${c}${r}`,
          code: 'formula_error',
          message: `Faktoren-Lookup Zelle ${c}${r} liefert Formelfehler${cell.f ? ` (Formel: ${cell.f})` : ''}. Bitte in Excel reparieren.`,
        });
        rowFactor.cells[c] = (cell.v != null ? String(cell.v) : '#ERR');
      } else {
        rowFactor.cells[c] = cell.v == null ? null : (typeof cell.v === 'number' ? cell.v : String(cell.v));
      }
    }
    if (Object.keys(rowFactor.cells).length > 0) {
      faktorenLookup.push(rowFactor);

      // PART P: derive a structured FaktorEntry. The Vorlage's grid is
      // sparse (most cells are empty placeholders); we treat the first
      // non-empty cell as the entry name, and the cell to its right as
      // the unit if present, then look for a numeric ep + minEinheit
      // anywhere in the row (heuristic — calculators name these
      // inconsistently across files).
      const firstNonEmpty = factorCols.find((c) => {
        const v = rowFactor.cells[c];
        return v != null && v !== '';
      });
      if (firstNonEmpty) {
        const firstVal = rowFactor.cells[firstNonEmpty];
        const numerics: number[] = [];
        let einheit: string | undefined;
        for (const c of factorCols) {
          const v = rowFactor.cells[c];
          if (typeof v === 'number') numerics.push(v);
          else if (typeof v === 'string' && v.length > 0 && c !== firstNonEmpty) {
            // First text cell AFTER the name is treated as the unit.
            if (!einheit && /^[a-zA-Z%/.°²³µm]{1,8}$/.test(v.trim())) einheit = v.trim();
          }
        }
        faktoren.push({
          name: typeof firstVal === 'string' ? firstVal : String(firstVal),
          einheit,
          ep: numerics[0],
          minEinheit: numerics[1],
          sourceCol: firstNonEmpty,
          sourceRow: r,
          raw: rowFactor.cells,
        });
      }
    }
  }

  // 7) Positions — iterate row 14 onward, classify, build Position objects
  const ref = ws['!ref'] ?? 'A1';
  const range = XLSX.utils.decode_range(ref);
  const positions: Position[] = [];
  let nextSort = 1;
  const CUSTOMER_ZONE = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
  for (let r = 14; r <= range.e.r + 1; r++) {
    // Defensive sweep: customer-zone formula errors are CRITICAL — they
    // could put garbage into the EP/GP the customer sees. Block import.
    for (const c of CUSTOMER_ZONE) {
      const cell = ws[c + r];
      if (isErrorCell(cell)) {
        issues.push({
          severity: 'error',
          location: `${sheetName}!${c}${r}`,
          code: 'formula_error',
          message: `Kunden-Spalte ${c}${r} liefert Formelfehler${cell.f ? ` (Formel: ${cell.f})` : ''} — würde dem Kunden gezeigt. Bitte unbedingt reparieren.`,
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
      I: ws['I' + r]?.v ?? null,
      J: ws['J' + r]?.v ?? null,
      M: ws['M' + r]?.v ?? null,
    };
    const isEntirelyEmpty = Object.values(cells).every((v) => v === null || v === '' || v === undefined);
    if (isEntirelyEmpty) continue;

    const kind = classifyRow(cells);
    const id = nanoid(12);
    // Tag every row this parser produces so PositionTableV2's delete-protection
    // logic recognises them as part of the AG-LV. Without this, importing a
    // Kalkulations-Vorlage Excel would leave rows that look manual and could be
    // accidentally deleted in bulk. See Position type comment in types.ts.
    const base: Position = { ...makeBlankPosition(id, nextSort++), importedFrom: 'excel' };
    const oz = String(cells.A ?? '').trim();
    const key = ozKey(oz);

    if (kind === 'group') {
      positions.push({
        ...base,
        oz,
        shortText: String(cells.B ?? '').trim() || `Gruppe ${key}`,
        isHeader: true,
        sectionPath: key,
      });
    } else if (kind === 'buffer') {
      // Hidden hint/buffer row — pushed as a header so it visually groups
      // following positions, but with internal flag visibleToCustomer=false.
      // (Files in the wild use these for internal commentary.)
      if (cells.B != null && String(cells.B).trim()) {
        positions.push({
          ...base,
          oz: '',
          shortText: String(cells.B).trim(),
          isHeader: true,
          visibleToCustomer: false,
          sectionPath: '',
        });
      }
    } else {
      const lvl = ozLevel(oz);
      if (lvl === 0) {
        issues.push({
          severity: 'info',
          location: `${sheetName}!A${r}`,
          code: 'unparseable_oz',
          message: `Zeile ${r} hat keine OZ-Nummer — wird als anonyme Position importiert.`,
        });
      }
      positions.push({
        ...base,
        oz,
        shortText: String(cells.B ?? '').trim(),
        quantity: typeof cells.C === 'number' ? cells.C : parseDeNumber(cells.C),
        unit: String(cells.D ?? '').trim(),
        materialCost: typeof cells.I === 'number' ? cells.I : 0,
        timeMinutes: typeof cells.J === 'number' ? cells.J : 0,
        nuCost: typeof cells.M === 'number' ? cells.M : 0,
        // Heuristic: rows that originally had an EP value get visibleToCustomer=true.
        // Internal-only rows the user adds later default to true (mirroring v1).
        visibleToCustomer: true,
        sectionPath: key.split('.').slice(0, -1).join('.'),
      });
    }
  }

  // Round 5 PART S: surface duplicate OZ keys as warnings. Example 7 in
  // the corpus has 14 — the rows still import cleanly (each gets its own
  // nanoid) but downstream OZ-keyed reconciliation (re-import, comment
  // migration) would be ambiguous. A warning is enough; we do NOT block.
  const ozCount = new Map<string, number>();
  for (const p of positions) {
    if (p.isHeader || !p.oz) continue;
    const key = ozKey(p.oz);
    if (!key) continue;
    ozCount.set(key, (ozCount.get(key) ?? 0) + 1);
  }
  const duplicates = Array.from(ozCount.entries()).filter(([, n]) => n > 1);
  if (duplicates.length > 0) {
    issues.push({
      severity: 'warning',
      location: `${sheetName}!A`,
      code: 'duplicate_oz',
      message: `${duplicates.length} OZ${duplicates.length === 1 ? '' : '-Schlüssel'} mehrfach vergeben (z.B. ${duplicates.slice(0, 3).map(([k, n]) => `${k}×${n}`).join(', ')}). Re-Import + Kommentar-Zuordnung sind dadurch mehrdeutig.`,
    });
  }

  // 8) Assemble ProjectData
  const project: ProjectData = {
    name: meta.bv || 'Importiertes LV',
    client: meta.client,
    clientEmail: '',
    clientAddress: '',
    service: meta.service,
    tenderNumber: meta.tenderNumber,
    deadline: meta.deadline,
    bidder: meta.bidder,
    calcParams: derivedCalcParams,
    positions,
    notes: '',
    // Round 4 PART P — full-fidelity capture stored alongside the basics.
    // `zuschlagOriginal` is frozen here; PART O may add `zuschlagAktuell`
    // overrides at runtime without touching this struct.
    zuschlagOriginal: zuschlagMatrix,
    headerExtras,
    faktoren,
  };

  const ok = !issues.some((i) => i.severity === 'error');
  return { project, issues, ok, faktorenLookup, faktoren, derivedCalcParams, zuschlagMatrix, headerExtras, meta };
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function readString(ws: Record<string, { v?: unknown }>, col: string, row: number): string {
  const v = ws[col + row]?.v;
  if (v == null) return '';
  return String(v).trim();
}

function readNumber(
  ws: Record<string, { v?: unknown }>,
  col: string,
  row: number,
): number | null {
  const v = ws[col + row]?.v;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

function normalizeLabel(s: string): string {
  return s.replace(/[\s:]+/g, '').toLowerCase();
}

function parseDeNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (raw == null) return 0;
  const s = String(raw).replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function emptyResult(issues: ImportIssue[]): ParseResult {
  const emptyRow: ZuschlagRow = { ekTotal: 0, zschlgPct: 0, vkTotal: 0, differnz: 0 };
  return {
    project: null,
    issues,
    ok: false,
    faktorenLookup: [],
    faktoren: [],
    derivedCalcParams: DEFAULT_CALC_PARAMS,
    zuschlagMatrix: { stoffe: emptyRow, nu: emptyRow, geraete: emptyRow, lohn: emptyRow },
    headerExtras: {
      mitarbeiter: 0, gesStunden: 0, arbeitstage: 0, monate: 0,
      ueberschuss: 0, zeitwert: 0, kontrollsumme: 0,
      mitarbeiterFlag: 1,
    },
    meta: {
      client: '', service: '', bv: '', bidder: '',
      tenderNumber: '', deadline: '',
      nettoFromFile: null, bruttoFromFile: null,
      mwstBetragFromFile: null,
    },
  };
}

// re-export for caller convenience
export { ERROR_LITERALS };
