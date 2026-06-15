/**
 * KalkGrid — Excel-style keyboard navigation + F-cell "point mode" for the
 * Kalkulation position grid (PositionTableV2 · intern view).
 *
 * Two interactions the Excel LV-Vorlage has and calculators expect:
 *
 *   1. KEYBOARD NAVIGATION — Arrow keys move the selected cell; Enter commits
 *      and moves down; Tab/Shift+Tab move right/left; typing a digit or `=` on
 *      a focused-but-not-editing cell begins editing.
 *
 *   2. POINT MODE — while editing a formula, click an F1..F7 cell to insert its
 *      reference into the formula at the caret (auto-inserting `+` so two clicks
 *      build a sum: F1=50, F2=59, click F1 then F2 → "F1+F2" → 109). Mirrors
 *      Excel's click-to-add-to-formula.
 *
 * Design: a THIN context owns transient focus dispatch + point-mode state.
 * Coordinate math is DATA-DRIVEN from the grid's existing row/group state
 * (`orderedRows`), never DOM geometry — the PreCalcStrip nests mini-<table>s and
 * jsdom has no layout engine, so geometry would be fragile and untestable.
 *
 * The default context value is a NO-OP: a `FormulaCell` rendered without a
 * provider (every existing unit test) behaves exactly as before — all new
 * behaviour is gated on `ctx.enabled`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// ───────────────────────── column / coordinate model ─────────────────────────

/** The six editable cost columns of a position row, in visual left-to-right /
 *  Tab order. Mirrors the FormulaCell order in PositionTableV2's PositionRow. */
export const MAIN_COLS = ['material', 'time', 'nu', 'geraeteSatz', 'epGeraete', 'epLohn'] as const;
/** The seven per-row Vorrechnung scratch slots (PreCalcStrip). */
export const F_COLS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] as const;

export type MainCol = (typeof MAIN_COLS)[number];
export type FCol = (typeof F_COLS)[number];
export type ColKey = MainCol | FCol;

export type Coord = { rowId: string; col: ColKey };

/** One visible, navigable position row. `hasPreCalc` = its F1..F7 strip is open
 *  (so its F-columns are mounted and navigable). */
export type RowDescriptor = { rowId: string; hasPreCalc: boolean };

const F_COL_SET: ReadonlySet<string> = new Set(F_COLS);

export function isFCol(col: ColKey): col is FCol {
  return F_COL_SET.has(col);
}

export function coordKey(c: Coord): string {
  return `${c.rowId}::${c.col}`;
}

export function sameCoord(a: Coord | null | undefined, b: Coord | null | undefined): boolean {
  return !!a && !!b && a.rowId === b.rowId && a.col === b.col;
}

/** Columns present in a row, in linear (Tab / left-right) order: the 6 main
 *  cost cells, then the 7 F-slots iff that row's Vorrechnung strip is open. */
export function fullCols(row: RowDescriptor): ColKey[] {
  return row.hasPreCalc ? [...MAIN_COLS, ...F_COLS] : [...MAIN_COLS];
}

/** Reference token for a column, or null if the column cannot be referenced in
 *  a formula. Only F1..F7 have a token in the aufmass grammar — the per-row
 *  cost cells of OTHER rows have no addressable reference. */
export function tokenForCol(col: ColKey): string | null {
  return isFCol(col) ? col : null;
}

/**
 * Should a `+` be auto-inserted before a clicked cell reference? True when the
 * text before the caret ends in an operand — a number, a reference (F1/Q), a
 * factor name, or a closing paren — so two consecutive clicks build a sum
 * ("F1" then click F2 → "F1+F2"). False after an operator / open-paren / when
 * empty, where the bare reference is what the user wants.
 */
export function shouldPrependPlus(before: string): boolean {
  const trimmed = before.replace(/\s+$/, '');
  if (trimmed.length === 0) return false;
  const last = trimmed[trimmed.length - 1];
  return /[A-Za-z0-9_).,]/.test(last);
}

// ───────────────────────── navigation (pure) ─────────────────────────

function rowIndex(orderedRows: RowDescriptor[], rowId: string): number {
  return orderedRows.findIndex((r) => r.rowId === rowId);
}

/**
 * Neighbour for arrow navigation. Returns null when movement should CLAMP:
 * at a grid edge, or a vertical move into a column the adjacent row lacks
 * (e.g. an F-column when the next row's strip is closed). Arrows never wrap
 * across rows — only Tab does (see tabCoord).
 */
export function nextCoord(
  orderedRows: RowDescriptor[],
  from: Coord,
  dir: 'up' | 'down' | 'left' | 'right',
): Coord | null {
  const ri = rowIndex(orderedRows, from.rowId);
  if (ri < 0) return null;
  const cols = fullCols(orderedRows[ri]);
  const ci = cols.indexOf(from.col);
  if (ci < 0) return null;

  if (dir === 'left') return ci > 0 ? { rowId: from.rowId, col: cols[ci - 1] } : null;
  if (dir === 'right') return ci < cols.length - 1 ? { rowId: from.rowId, col: cols[ci + 1] } : null;

  // up / down → same column in the adjacent row, if that row has the column.
  const tri = dir === 'up' ? ri - 1 : ri + 1;
  if (tri < 0 || tri >= orderedRows.length) return null;
  const targetCols = fullCols(orderedRows[tri]);
  if (!targetCols.includes(from.col)) return null;
  return { rowId: orderedRows[tri].rowId, col: from.col };
}

/**
 * Tab / Shift+Tab order: linear over fullCols, wrapping to the first cell of
 * the next row (or last cell of the previous row). Returns null only at the
 * very first / last cell of the whole grid (clamp).
 */
export function tabCoord(
  orderedRows: RowDescriptor[],
  from: Coord,
  backwards: boolean,
): Coord | null {
  const ri = rowIndex(orderedRows, from.rowId);
  if (ri < 0) return null;
  const cols = fullCols(orderedRows[ri]);
  const ci = cols.indexOf(from.col);
  if (ci < 0) return null;

  if (!backwards) {
    if (ci < cols.length - 1) return { rowId: from.rowId, col: cols[ci + 1] };
    if (ri < orderedRows.length - 1) {
      const nr = orderedRows[ri + 1];
      return { rowId: nr.rowId, col: fullCols(nr)[0] };
    }
    return null;
  }
  if (ci > 0) return { rowId: from.rowId, col: cols[ci - 1] };
  if (ri > 0) {
    const pr = orderedRows[ri - 1];
    const pcols = fullCols(pr);
    return { rowId: pr.rowId, col: pcols[pcols.length - 1] };
  }
  return null;
}

// ───────────────────────── context ─────────────────────────

/** Imperative handle a cell registers so the grid can drive it. */
export type CellHandle = {
  /** Move browser focus to this cell's display element. */
  focusCell: () => void;
  /** Insert a reference token at this cell's formula caret (point-mode origin). */
  insertReference: (token: string) => void;
};

export type Direction = 'up' | 'down' | 'left' | 'right';

export type KalkGridContextValue = {
  /** False for the no-op default (no provider) — cells use it to gate behaviour. */
  enabled: boolean;
  register: (coord: Coord, handle: CellHandle) => () => void;
  moveFocus: (from: Coord, dir: Direction) => void;
  moveTab: (from: Coord, backwards: boolean) => void;
  focusCoord: (coord: Coord) => boolean;
  setPointOrigin: (coord: Coord | null) => void;
  pointOrigin: Coord | null;
  /** A non-origin cell was clicked while a point origin is active → insert ref. */
  emitReferenceClick: (clicked: Coord) => void;
};

const NOOP: KalkGridContextValue = {
  enabled: false,
  register: () => () => {},
  moveFocus: () => {},
  moveTab: () => {},
  focusCoord: () => false,
  setPointOrigin: () => {},
  pointOrigin: null,
  emitReferenceClick: () => {},
};

const KalkGridContext = createContext<KalkGridContextValue>(NOOP);

export function useKalkGrid(): KalkGridContextValue {
  return useContext(KalkGridContext);
}

export function KalkGridProvider({
  orderedRows,
  children,
}: {
  orderedRows: RowDescriptor[];
  children: ReactNode;
}) {
  const registry = useRef(new Map<string, CellHandle>());
  const [pointOrigin, setPointOriginState] = useState<Coord | null>(null);

  // Mirror into refs so the stable callbacks below always read the latest value
  // without changing identity every render (which would re-render every cell).
  // Updated in an effect (not during render); the refs are seeded with the
  // initial values and only the navigation/click callbacks — which fire from
  // user events, always after effects — read them.
  const rowsRef = useRef(orderedRows);
  const pointOriginRef = useRef<Coord | null>(null);
  useEffect(() => {
    rowsRef.current = orderedRows;
    pointOriginRef.current = pointOrigin;
  });

  const register = useCallback((coord: Coord, handle: CellHandle) => {
    const key = coordKey(coord);
    registry.current.set(key, handle);
    return () => {
      // Only remove if this exact handle is still registered (a remount can
      // register the new handle before the old one's cleanup fires).
      if (registry.current.get(key) === handle) registry.current.delete(key);
      // If the unmounting cell was the point origin, clear it so no other cell
      // keeps showing a dangling "click to insert" affordance.
      if (pointOriginRef.current && coordKey(pointOriginRef.current) === key) {
        setPointOriginState(null);
      }
    };
  }, []);

  const focusCoord = useCallback((coord: Coord) => {
    const h = registry.current.get(coordKey(coord));
    if (!h) return false;
    h.focusCell();
    return true;
  }, []);

  const moveFocus = useCallback(
    (from: Coord, dir: Direction) => {
      const target = nextCoord(rowsRef.current, from, dir);
      if (target) focusCoord(target);
    },
    [focusCoord],
  );

  const moveTab = useCallback(
    (from: Coord, backwards: boolean) => {
      const target = tabCoord(rowsRef.current, from, backwards);
      if (target) focusCoord(target);
    },
    [focusCoord],
  );

  const setPointOrigin = useCallback((coord: Coord | null) => {
    setPointOriginState(coord);
  }, []);

  const emitReferenceClick = useCallback((clicked: Coord) => {
    const origin = pointOriginRef.current;
    if (!origin || sameCoord(origin, clicked)) return;
    const token = tokenForCol(clicked.col);
    if (!token) return;
    const originHandle = registry.current.get(coordKey(origin));
    originHandle?.insertReference(token);
  }, []);

  const value = useMemo<KalkGridContextValue>(
    () => ({
      enabled: true,
      register,
      moveFocus,
      moveTab,
      focusCoord,
      setPointOrigin,
      pointOrigin,
      emitReferenceClick,
    }),
    [register, moveFocus, moveTab, focusCoord, setPointOrigin, pointOrigin, emitReferenceClick],
  );

  return <KalkGridContext.Provider value={value}>{children}</KalkGridContext.Provider>;
}
