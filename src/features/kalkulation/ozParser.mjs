/**
 * Whitespace-tolerant OZ (position-number) parser shared between the importer
 * and the in-app classifier.
 *
 * Kept in plain JS so it's importable by both Vite (the React app) and Node
 * (`node --test`). No dependencies.
 *
 * Real-file examples this MUST normalize identically:
 *   " 1. 4. 1.  .   1"  →  ["1","4","1","1"]
 *   " 1.4.1.1"          →  ["1","4","1","1"]
 *   "1.4.1.1"           →  ["1","4","1","1"]
 *   " 1. 4. 1.   .  1"  →  ["1","4","1","1"]
 *   " 1. 4"             →  ["1","4"]              (KG-level group header)
 *   "Pos. 1"            →  ["Pos","1"]            (example 2 flat numbering)
 *   " .  .  10"         →  ["10"]                 (example 3 number-only)
 *   ""                  →  []                     (buffer / hint row)
 */

const ERROR_VALUES = new Set([
  '#VALUE!',
  '#REF!',
  '#DIV/0!',
  '#N/A',
  '#NAME?',
  '#NULL!',
  '#NUM!',
]);

/**
 * Return the cleaned segments of an OZ string.
 * - Splits on '.'
 * - Trims internal whitespace from each segment
 * - Drops empty segments (so " .  .  10" → ["10"])
 *
 * @param {unknown} raw
 * @returns {string[]}
 */
export function ozSegments(raw) {
  if (raw == null) return [];
  const s = String(raw).trim();
  if (!s) return [];
  return s
    .split('.')
    .map((seg) => seg.trim())
    .filter((seg) => seg.length > 0);
}

/**
 * Canonical key for an OZ — segments joined by ".", trimmed, no whitespace.
 * Useful for de-duping or pointing at the same position across re-imports.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function ozKey(raw) {
  return ozSegments(raw).join('.');
}

/**
 * How deep is this OZ? Useful to distinguish group headers from positions.
 * Returns 0 for empty/buffer rows.
 *
 * @param {unknown} raw
 * @returns {number}
 */
export function ozLevel(raw) {
  return ozSegments(raw).length;
}

/**
 * Classify a row by inspecting the OZ depth AND the customer-zone cells (col
 * D = unit, col E = EP, col F = GP). Mirrors the rule in
 * `docs/v2_redesign/column_classification.md` §4.
 *
 * - `position`  → has Menge + Einheit + EP filled in → render in KUNDEN
 * - `group`    → group header → render as collapsible header with subtotal
 * - `buffer`   → empty OZ + non-empty Bezeichnung → render as italic hint
 *                (NOT customer-visible by default; some templates use these
 *                rows for hidden internal notes)
 *
 * @param {{ oz: unknown, D?: unknown, E?: unknown, F?: unknown, B?: unknown }} row
 * @returns {'position'|'group'|'buffer'}
 */
export function classifyRow(row) {
  const lvl = ozLevel(row.oz);
  const hasUnit = row.D != null && String(row.D).trim().length > 0;
  const hasEP = typeof row.E === 'number' && Number.isFinite(row.E);
  const hasMenge = typeof row.C === 'number' && Number.isFinite(row.C);
  const hasDescription = row.B != null && String(row.B).trim().length > 0;

  // A blank-OZ row that still carries full price data (Einheit + EP) IS a
  // position: some LVs — cleaning/Reinigung especially — number their positions
  // inside the Bezeichnung text ("1. Gebäude 1") and leave col A (OZ) empty.
  // Treating those as buffers silently dropped whole priced bids (e.g. 91 rows /
  // €121.585 / 96 % of one offer). Only a blank-OZ row WITHOUT price data is a
  // genuine buffer / italic hint.
  if (lvl === 0) return hasUnit && hasEP ? 'position' : 'buffer';
  if (hasUnit && hasEP) return 'position';
  if (hasMenge && !hasUnit && !hasEP) return 'group'; // col C overload — group total
  if (!hasUnit && !hasEP) return 'group';
  return 'position';
}

/**
 * Detect formula-error cells. Excel stores them as cell.t === 'e' with the
 * error symbol as cell.v. Our parser also defensively treats string literals
 * matching the symbol set as errors (covers files re-saved as plain values).
 *
 * @param {{ v?: unknown, t?: string }} cell
 * @returns {boolean}
 */
export function isErrorCell(cell) {
  if (!cell) return false;
  if (cell.t === 'e') return true;
  if (typeof cell.v === 'string' && ERROR_VALUES.has(cell.v)) return true;
  return false;
}

/** Set of formula-error literals (exported for use in error reports). */
export const ERROR_LITERALS = ERROR_VALUES;
