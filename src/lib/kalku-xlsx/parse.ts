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
import { makeBlankPosition, DEFAULT_CALC_PARAMS, round, calcTotals, calculatePosition } from '@/features/kalkulation/calc';
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
    | 'duplicate_oz'
    | 'total_sanity';
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
  // Running Σ of the Excel's own per-position GP (col F) — the offer total a
  // standard Vorlage stores. Used by the post-build sanity guard to catch a
  // column layout that doesn't match (where col F isn't GP).
  let offerSumF = 0;

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
    // Global Geräte-Satz (gzuschlag, AP3) — the per-row default. Per-position
    // overrides ("Zulage Geräte", col Z) are captured on each Position below.
    geraeteStundensatz: readNumber(ws, 'AP', 3) ?? DEFAULT_CALC_PARAMS.geraeteStundensatz,
    // Zeitabzug as a percent. The Vorlage's named range `zeitabzug` IS this
    // percent value, held EXACTLY in cell AP5 (e.g. -55, +50, -15). Read it
    // directly: deriving it as J11×100 (J11 = zeitabzug/100) reintroduces binary
    // -FP error — e.g. -0.55×100 = -55.00000000000001 — which then drags the
    // rounded adjusted-time (AC) a cent off on boundary rows. Fall back to
    // J11×100 only when AP5 is absent.
    zeitabzug: readNumber(ws, 'AP', 5) ?? ((readNumber(ws, 'J', 11) ?? 0) * 100),
    mwst: readNumber(ws, 'D', 9) ?? DEFAULT_CALC_PARAMS.mwst,
  };

  // 6) Faktoren-Lookup grid extraction (rows 2-12, cols N-W). Each row is a
  //    factor (F10..F1 per row-13 labels). Cells may contain text tokens
  //    (e.g. "schlitz+Q2*querschnitt") OR numbers OR formula errors.
  const faktorenLookup: FaktorRow[] = [];
  const faktoren: FaktorEntry[] = [];
  const factorCols = ['N','O','P','Q','R','S','T','U','V','W'];
  // Round 5: the X–AP Vorrechnung helper columns (rows 2–12) that the exporter
  // also reproduces — captured into each FaktorEntry.raw for full Vorlage
  // fidelity. (AD/AI/AL/AO are 1-px spacer columns; harmless to read.)
  const EXTRA_FACTOR_COLS = ['X','Y','Z','AA','AB','AC','AE','AF','AG','AH','AJ','AK','AM','AN','AP'];
  for (let r = 2; r <= 12; r++) {
    const rowFactor: FaktorRow = {
      factorName: `Row${r}`,
      cells: {},
    };
    for (const c of factorCols) {
      const cell = ws[c + r];
      if (!cell) continue;
      if (isErrorCell(cell)) {
        // Faktoren-Lookup is sidebar REFERENCE data (cols N-W, rows 2-12), not
        // the customer LV. A broken factor formula (often a stale #REF! to a
        // deleted helper cell — common in real Elektro Vorlagen) must NOT block
        // the whole import: the actual LV positions carry cached EP/Min/Material
        // values and parse fine. So this is a WARNING. Customer-zone (A-G)
        // formula errors stay blocking (see the row-loop below).
        issues.push({
          severity: 'warning',
          location: `${sheetName}!${c}${r}`,
          code: 'formula_error',
          message: `Faktoren-Bibliothek Zelle ${c}${r} liefert Formelfehler${cell.f ? ` (Formel: ${cell.f})` : ''} — Import läuft weiter, betrifft nur die Faktoren-Referenz.`,
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
        // Round 5: enrich `raw` with the X–AP Vorrechnung helper cells (same
        // rows 2–12) so the exporter can reproduce the full Vorlage block, not
        // just the N–W factor library. These columns double as per-position
        // helpers from row 14 on, but here we only read the header band. We skip
        // internal template instructions (the "INTERN: …diese 4 Zellen löschen!"
        // notes) — they're scaffolding, not data, and don't belong in an export.
        const enrichedRaw: Record<string, number | string | null> = { ...rowFactor.cells };
        for (const c of EXTRA_FACTOR_COLS) {
          const cell = ws[c + r];
          if (!cell || cell.v == null || isErrorCell(cell)) continue;
          const val = typeof cell.v === 'number' ? cell.v : String(cell.v);
          if (typeof val === 'string' && (val === '' || /INTERN/i.test(val))) continue;
          // A Vorrechnung FORMULA that evaluates to 0 displays blank in the
          // source (e.g. `AP8/1.19` with AP8=0) — don't emit a stray "0". A
          // literal 0 (no formula) IS shown, so keep it.
          if (val === 0 && cell.f) continue;
          enrichedRaw[c] = val;
        }
        faktoren.push({
          name: typeof firstVal === 'string' ? firstVal : String(firstVal),
          einheit,
          ep: numerics[0],
          minEinheit: numerics[1],
          sourceCol: firstNonEmpty,
          sourceRow: r,
          raw: enrichedRaw,
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
    if (typeof cells.F === 'number') offerSumF += cells.F;

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
      // Time-per-unit. The real Vorlage carries the raw "Zeit in min" in col Y
      // — stable across BOTH template variants (J="Min/Einheit" where J also
      // equals the time, AND J="Arbeitstage" where J is person-days, NOT the
      // time). Our own export writes the time to J with Y empty.
      const rawY = ws['Y' + r]?.v;
      const yTime =
        typeof rawY === 'number' && rawY > 0
          ? rawY
          : typeof cells.J === 'number'
            ? cells.J
            : 0;
      // The prices are built from "Echte Zeit" (col AC), which in TARGET-PRICE
      // mode is back-solved from the target EP and no longer equals Y·(1+Zeitwert).
      // echteZeitToRawMinutes recovers the raw minutes so calc re-derives exactly
      // AC (a no-op on normal files where AC ≈ Y·(1+Zeitwert)). Verified on the
      // Gesellchen "Besucherplattform" LV (Geräte −42 %, Lohn +6 %, Stunden 218
      // vs 520 before this).
      const timeMinutes = echteZeitToRawMinutes(
        ws['AC' + r]?.v,
        yTime,
        derivedCalcParams.zeitabzug ?? 0,
      );
      // Per-position Geräte. The Vorlage has TWO ways to price equipment:
      //   1) Rate-based (the common case, 274/279 rows in the MPB Biergasse
      //      LV): "EP Geräte" (col AA) is a FORMULA = (Echte-Zeit/60) × "Zulage
      //      Geräte" (col Z). We reproduce this with a per-position geraeteSatz
      //      = Z, so the Stellschrauben re-price it when time changes.
      //   2) Lump-sum override: the calculator HARD-CODES col AA with a fixed
      //      equipment cost (crane/lift on a Baustelleneinrichtung row, or a
      //      flat geräte on a zero-time row) that the time×Z formula can't
      //      reproduce. ΣAA×Menge equals the Vorlage's Geräte-VERKAUF total
      //      exactly, so col AA is the source of truth — we pin it as a flat
      //      per-unit geraeteEp. Without this the Geräte total imports ~4–5 %
      //      low (the "GERAETE_GAP" class in the 100-LV fidelity test).
      const rawZ = ws['Z' + r]?.v;
      const rawAA = ws['AA' + r]?.v;
      // Excel evaluates an EMPTY col-Z as 0 inside `AA = AC/60 * Z`: Stundenlohn/
      // Regie rows leave Z blank, so the Vorlage prices ZERO Geräte on them. An
      // absent Z therefore means rate 0 for THIS row — NOT the global Geräte-Satz.
      // Falling back to the global on a blank Z invents a phantom Geräte cost.
      const effectiveZ = typeof rawZ === 'number' && rawZ >= 0 ? rawZ : 0;
      const adjForGeraete =
        timeMinutes + (timeMinutes / 100) * derivedCalcParams.zeitabzug;
      const formulaGeraete = (adjForGeraete / 60) * effectiveZ;
      let geraeteSatzPatch: { geraeteEp?: number; geraeteSatz?: number } = {};
      // "EP Geräte" (col AA) is the per-unit VERKAUF Geräte that sums into the
      // Vorlage total (Σ Menge×AA), and the calculator can hand-edit it: a
      // lump-sum literal (crane/lift, zero-time row), a custom formula, or a
      // discount. So whenever AA DEVIATES from the rate model we PIN it flat as
      // the source of truth; a row that still matches AC/60×Z stays on the live
      // rate (geraeteSatz=Z) so the Stellschrauben can re-price it. Pinning
      // formula cells is safe now that the time basis is Echte Zeit (AC): a
      // standard `AA=AC/60×Z` row reproduces formulaGeraete to the cent and does
      // NOT trip the gate — only genuine overrides (incl. negatives) do.
      if (typeof rawAA === 'number' && Math.abs(rawAA - formulaGeraete) > 0.01) {
        geraeteSatzPatch = { geraeteEp: rawAA };
      } else if (Math.abs(effectiveZ - derivedCalcParams.geraeteStundensatz) > 1e-9) {
        geraeteSatzPatch = { geraeteSatz: effectiveZ };
      }
      // "EP Löhne" (col AB) = Zeit/60 × Verrechnungslohn × W. Capture the per-row
      // factor W (= AB ÷ the plain Zeit×Verrechnungslohn) as `lohnFaktor` so the
      // Lohn RE-PRICES when the global Verrechnungslohn (or this row's Zeit)
      // changes — a hard-coded specialist rate (84,50 €/h) or a Nachlass/discount
      // folds into W too, so it still scales with VL. Use the SAME rounded time
      // calc uses, so calc's `(round(Zeit)/60)·VL·W` reproduces AB to the cent
      // (the base cancels). A plain no-W row gives W≈1 → left unset → re-prices on
      // the rate. Only a zero-time flat Lohn (no time basis to scale) is pinned
      // as a fixed lohnEp.
      const rawAB = ws['AB' + r]?.v;
      const lohnBaseUnit = (round(adjForGeraete) / 60) * derivedCalcParams.verrechnungslohn;
      let lohnPatch: { lohnEp?: number; lohnFaktor?: number } = {};
      if (typeof rawAB === 'number' && Math.abs(rawAB - lohnBaseUnit) > 0.01) {
        lohnPatch = Math.abs(lohnBaseUnit) > 1e-9
          ? { lohnFaktor: rawAB / lohnBaseUnit }
          : { lohnEp: rawAB };
      }
      // EP Stoffe VK (col AJ) / EP Nachu. (col AK) overrides — capture a flat
      // VERKAUF when the calculator hand-typed a value that deviates from the
      // Material/NU × (1+Zuschlag) default (same pattern as geräteEp/lohnEp).
      const matBase = (typeof cells.I === 'number' ? cells.I : 0) * (1 + derivedCalcParams.materialZuschlag);
      const rawAJ = ws['AJ' + r]?.v;
      const matPatch = typeof rawAJ === 'number' && Math.abs(rawAJ - matBase) > 0.01 ? { materialEp: rawAJ } : {};
      const nuBase = (typeof cells.M === 'number' ? cells.M : 0) * (1 + derivedCalcParams.nuZuschlag);
      const rawAK = ws['AK' + r]?.v;
      const nuPatch = typeof rawAK === 'number' && Math.abs(rawAK - nuBase) > 0.01 ? { nuEp: rawAK } : {};
      // Bedarfs-/Eventualposition: the Vorlage leaves its GP (col F) blank/0 so
      // Excel keeps it OUT of the Angebotssumme — even though the row carries
      // price inputs (a filled EP, a zeroed-out duplicate that still has its raw
      // Stoffe/Zeit/NU, etc.). Mark it so calc excludes it from the total (still
      // shown + editable for folding in). Honoring F=0 matches the Excel offer.
      const gpFilled = typeof cells.F === 'number' && Math.abs(cells.F) > 0.005;
      const hasPricedInput =
        (typeof cells.E === 'number' && cells.E > 0) ||
        (typeof cells.I === 'number' && cells.I > 0) ||
        timeMinutes > 0 ||
        (typeof cells.M === 'number' && cells.M > 0);
      const bedarfsPatch = !gpFilled && hasPricedInput ? { bedarfsposition: true } : {};
      const newPos: Position = {
        ...base,
        oz,
        shortText: String(cells.B ?? '').trim(),
        quantity: typeof cells.C === 'number' ? cells.C : parseDeNumber(cells.C),
        unit: String(cells.D ?? '').trim(),
        materialCost: typeof cells.I === 'number' ? cells.I : 0,
        timeMinutes,
        nuCost: typeof cells.M === 'number' ? cells.M : 0,
        ...geraeteSatzPatch,
        ...lohnPatch,
        ...matPatch,
        ...nuPatch,
        ...bedarfsPatch,
        // Heuristic: rows that originally had an EP value get visibleToCustomer=true.
        // Internal-only rows the user adds later default to true (mirroring v1).
        visibleToCustomer: true,
        sectionPath: key.split('.').slice(0, -1).join('.'),
      };
      // Trust the Vorlage's cached GESAMTPREIS (col F — the authoritative offer
      // price) when our component rebuild deviates a LOT from it: a hand-typed EP
      // markup, a %-Zuschlag row where F≠Menge×EP, or a stale EP. Pin GP=F
      // ("insert the number"). We key on col F, NOT col E: on some files col E is
      // stale/garbage while col F is correct, so trusting E mis-priced them. The
      // 5%+€1 gate leaves normal rows (incl. sub-% rounding) on the live model,
      // and Bedarfspositionen (F blank) are already excluded.
      if (!newPos.bedarfsposition && typeof cells.F === 'number' && Math.abs(cells.F) > 0.01) {
        const modelGp = calculatePosition(newPos, derivedCalcParams).gp;
        const dev = Math.abs(modelGp - cells.F);
        const hi = Math.max(Math.abs(cells.F), Math.abs(modelGp));
        const lo = Math.max(Math.min(Math.abs(cells.F), Math.abs(modelGp)), 0.01);
        // Pin only on a real but MODERATE deviation (>5% and >1 €). The hi≤lo×10
        // ratio gate refuses to trust an implausibly far col F — a corrupt source
        // (e.g. the C²-bug where F = Menge²×…, ratio ≈ Menge) would otherwise make
        // us import junk; instead our sane model value stays and the file-level
        // sanity guard warns.
        if (dev > 1 && dev > Math.abs(cells.F) * 0.05 && hi <= lo * 10) {
          newPos.gpOverride = cells.F;
        }
      }
      positions.push(newPos);
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

  // Sanity guard: if the imported Angebotssumme is wildly larger than the
  // Excel's own col-F (GP) total, the column layout almost certainly doesn't
  // match this Vorlage (e.g. a variant where GP lives in another column) — one
  // such file imported as 1,19 Mrd € instead of 4.584 €. Warn loudly rather
  // than silently surfacing absurd numbers. (Excludes Bedarfspositionen, which
  // are already kept out of both sides.)
  if (Math.abs(offerSumF) > 1) {
    const ourNetto = calcTotals(positions, derivedCalcParams).totalNetto;
    if (Math.abs(ourNetto) > Math.abs(offerSumF) * 5) {
      issues.push({
        severity: 'warning',
        location: `${sheetName}!F`,
        code: 'total_sanity',
        message: `Importierte Angebotssumme (${ourNetto.toFixed(2)} €) weicht extrem von der Excel-GP-Summe (Spalte F: ${offerSumF.toFixed(2)} €) ab — die Spaltenzuordnung passt vermutlich nicht zu dieser Vorlage. Bitte vor Verwendung prüfen.`,
      });
    } else if (Math.abs(offerSumF) > Math.abs(ourNetto) * 5) {
      // Inverse: the Excel's GP total dwarfs ours — the source file likely has
      // broken formulas (e.g. Menge folded into the EP, then ×Menge again, so
      // GP = Menge²×… as on one real RV file). Flag the FILE as suspect rather
      // than letting it look like the import silently lost money.
      issues.push({
        severity: 'warning',
        location: `${sheetName}!F`,
        code: 'total_sanity',
        message: `Excel-GP-Summe (Spalte F: ${offerSumF.toFixed(2)} €) ist um ein Vielfaches größer als die importierte Summe (${ourNetto.toFixed(2)} €) — die Datei enthält vermutlich fehlerhafte Formeln (z.B. Menge doppelt im EP). Bitte die Quelldatei prüfen.`,
      });
    }
  }

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

/**
 * Per-unit minutes for calc, given the Vorlage's "Echte Zeit" (col AC, `rawAC`),
 * the raw "Zeit in min" (col Y, `yTime`), and the Zeitwert percent.
 *
 * Equipment + labor prices are built from AC (AA = AC/60·Z, AB = AC/60·VL).
 * Normally AC = Y·(1+Zeitwert/100), so returning Y lets calc re-apply the
 * Zeitwert back to exactly AC. But when the Vorlage is filled in TARGET-PRICE
 * mode, AC is back-solved from the target EP and no longer equals Y·(1+Zeitwert)
 * — Y is then stale. So when AC materially diverges from the Y-derived time we
 * recover the raw minutes from AC (raw = AC/(1+Zeitwert)); calc then re-derives
 * exactly AC. A no-op on normal files (AC ≈ Y·(1+Zeitwert) → returns Y).
 */
export function echteZeitToRawMinutes(rawAC: unknown, yTime: number, zeitabzugPct: number): number {
  const zf = 1 + (zeitabzugPct ?? 0) / 100;
  if (typeof rawAC === 'number' && zf > 0 && Math.abs(rawAC - yTime * zf) > 0.01) {
    return rawAC / zf;
  }
  return yTime;
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
