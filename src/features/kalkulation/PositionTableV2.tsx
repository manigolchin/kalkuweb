import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  AlertCircle,
  AlertTriangle,
  Layers,
  Users,
  MessageCircle,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import toast from 'react-hot-toast';
import {
  INTERNAL_POSITION_TYPES,
  POSITION_TYPES,
  POSITION_TYPE_LABELS,
  type CalcParams,
  type FaktorEntry,
  type HeaderExtras,
  type Position,
  type PositionType,
  type ZuschlagMatrix,
} from './types';
import FormulaCell from './FormulaCell';
import PreCalcStrip from './PreCalcStrip';
import { KalkGridProvider, type RowDescriptor } from './kalkGridContext';
import {
  calculatePosition,
  calcTotals,
  formatEUR,
  formatNum,
  makeBlankPosition,
} from './calc';
import ZuschlagMatrixStrip from './ZuschlagMatrixStrip';

type CostType = 'stoffe' | 'nu' | 'geraete' | 'lohn';

export type V2ViewMode = 'intern' | 'kunden';

type Props = {
  positions: Position[];
  params: CalcParams;
  onChange: (positions: Position[]) => void;
  /** Controlled view mode (optional). When omitted, the component manages its own. */
  view?: V2ViewMode;
  onViewChange?: (v: V2ViewMode) => void;
  /** Project meta — used to render a Kunden-Vorschau header that mirrors what the customer sees. */
  projectMeta?: {
    name: string;
    client: string;
    service: string;
    tenderNumber: string;
    deadline: string;
    bidder: string;
  };
  /** PART K: per-position customer-comment counts. Keyed by the position's
   *  OZ string. Each entry has `total` (all comments ever) and `unresolved`
   *  (still-open count, drives the amber dot). Optional — when absent, no
   *  badges render. */
  commentCounts?: Record<string, { total: number; unresolved: number }>;
  /** PART K: handler when the calculator clicks a row's comment badge. Gets
   *  the position's OZ so the parent can open the relevant FeedbackInbox
   *  thread. */
  onOpenComments?: (positionOz: string) => void;
  /** Round 4 PART Q — captured Vorlage Zuschlag matrix for the sticky strip
   *  at the top of INTERN view. When absent, the strip doesn't render. */
  zuschlagOriginal?: ZuschlagMatrix;
  /** Round 4 PART O — current overrides (partial map keyed by cost type). */
  zuschlagAktuell?: Partial<Record<CostType, number>>;
  /** Round 4 PART Q — header-block extras (Mitarbeiter, Stunden, Überschuss…). */
  headerExtras?: HeaderExtras;
  /** Round 4 PART O — fires when a ZSCHLG % cell is edited (debounced 300ms). */
  onZschlgChange?: (cost: CostType, decimal: number) => void;
  /** Round 4 PART O — fires when the calculator clicks "Zurücksetzen" on a row. */
  onZschlgReset?: (cost: CostType) => void;
  /** Round 4 PART P — Faktoren-Bibliothek extracted from the imported
   *  Vorlage's N–W × 2–12 grid. Surfaces in the CalcPopover next to each
   *  editable per-position cost cell (Material EK, Min/Einheit, NU EK)
   *  so the calculator can write expressions like `schlitz + Q*querschnitt`. */
  faktoren?: FaktorEntry[];
};

type Group =
  | { kind: 'group'; id: string; header: Position; rows: Position[]; subtotal: number; visibleSubtotal: number; visibleRowCount: number }
  | { kind: 'orphan'; id: string; row: Position };

/**
 * Round 12 Feature 2 — inline plausibility chips.
 *
 * Two rules, evaluated per non-header row in INTERN view:
 *
 *  - RULE A "Preis fehlt" (red):
 *      materialCost === 0 && nuCost === 0 && timeMinutes === 0
 *      Surfaces the most-expensive bid mistake: submitting an LV with empty
 *      prices (Angebotsausschluss-Risiko).
 *
 *  - RULE B "Ungewöhnlich" (amber):
 *      Compare this row's EP to the median EP of other non-header rows in the
 *      project whose shortText shares ≥2 tokens AND uses the same unit.
 *      Triggers when |ep - median| / median > 0.4 AND the comparison set has
 *      ≥3 other rows. Suggests the calculator may have a copy-paste mistake
 *      (e.g. 999€ when 9,99€ was intended).
 *
 * Output: Map<positionId, PlausibilityChip>. Empty entries skipped.
 * Computed once per (positions, params) change via useMemo so a row render
 * doesn't recompute medians when an unrelated row changes.
 */
type PlausibilityChip = {
  /** Row has zero across material/time/nu — likely "forgot to price" or AI-import gap. */
  missingPrice?: true;
  /** Row's EP deviates >40% from the median of the comparison set. */
  outlier?: {
    median: number;
    actual: number;
    deviationPct: number; // signed: positive = above median, negative = below
  };
};

/** Tokenize a shortText for comparison-set matching: lowercase, split on
 *  non-letter/digit, drop ≤2-char stopwords. Pure function — no mutation. */
function tokenizeShortText(s: string): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[^a-zäöüß0-9]+/i)
    .filter((t) => t.length > 2);
}

function computePlausibility(
  positions: Position[],
  params: CalcParams,
): Map<string, PlausibilityChip> {
  const result = new Map<string, PlausibilityChip>();
  if (positions.length === 0) return result;

  // Pre-compute per-position EP + token set (single pass). Skip headers.
  type Row = {
    id: string;
    ep: number;
    materialCost: number;
    nuCost: number;
    timeMinutes: number;
    unit: string;
    tokens: string[];
  };
  const rows: Row[] = [];
  // Inverted index: token → list of row indices that contain it.
  // Bucketed by unit so the comparison-set query only scans same-unit rows.
  // Map<unit, Map<token, Set<rowIndex>>>
  const indexByUnit = new Map<string, Map<string, Set<number>>>();

  for (const p of positions) {
    if (p.isHeader) continue;
    const calc = calculatePosition(p, params);
    const unit = (p.unit ?? '').trim().toLowerCase();
    const tokens = tokenizeShortText(p.shortText ?? '');
    const idx = rows.length;
    rows.push({
      id: p.id,
      ep: calc.ep,
      materialCost: p.materialCost,
      nuCost: p.nuCost,
      timeMinutes: p.timeMinutes,
      unit,
      tokens,
    });
    if (unit && calc.ep > 0 && tokens.length > 0) {
      let unitMap = indexByUnit.get(unit);
      if (!unitMap) {
        unitMap = new Map();
        indexByUnit.set(unit, unitMap);
      }
      for (const t of tokens) {
        let set = unitMap.get(t);
        if (!set) {
          set = new Set();
          unitMap.set(t, set);
        }
        set.add(idx);
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const chip: PlausibilityChip = {};

    // RULE A — missing price across all 3 inputs.
    if (row.materialCost === 0 && row.nuCost === 0 && row.timeMinutes === 0) {
      chip.missingPrice = true;
    }

    // RULE B — outlier vs comparison set (same unit + ≥2 token overlap).
    // Skipped for rows that already trigger Rule A.
    if (!chip.missingPrice && row.ep > 0 && row.unit && row.tokens.length > 0) {
      const unitMap = indexByUnit.get(row.unit);
      if (unitMap) {
        // Tally overlap counts across this row's tokens — only candidates
        // that hit ≥2 different tokens make the comparison set.
        const overlap = new Map<number, number>();
        for (const t of row.tokens) {
          const bucket = unitMap.get(t);
          if (!bucket) continue;
          for (const cand of bucket) {
            if (cand === i) continue;
            overlap.set(cand, (overlap.get(cand) ?? 0) + 1);
          }
        }
        const eps: number[] = [];
        for (const [cand, count] of overlap) {
          if (count >= 2) eps.push(rows[cand].ep);
        }
        // Need ≥3 comparable rows for the median to be meaningful.
        if (eps.length >= 3) {
          const sorted = [...eps].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          const median =
            sorted.length % 2 === 0
              ? (sorted[mid - 1] + sorted[mid]) / 2
              : sorted[mid];
          if (median > 0) {
            const deviation = (row.ep - median) / median;
            // Round to 4 dp before comparing so IEEE-754 noise (e.g. exactly
            // +40% can land at 0.40000000000000013) does NOT fire the chip.
            // Threshold is "strictly above 40%" — the tooltip would otherwise
            // claim "+40,0 %" and look like a bug. Caught by Round-12 debug
            // suite (PositionTableV2.plausibility.edges.test.tsx).
            const roundedAbsDev = Math.round(Math.abs(deviation) * 10000) / 10000;
            if (roundedAbsDev > 0.4) {
              chip.outlier = {
                median,
                actual: row.ep,
                deviationPct: deviation * 100,
              };
            }
          }
        }
      }
    }

    if (chip.missingPrice || chip.outlier) {
      result.set(row.id, chip);
    }
  }

  return result;
}

const TYPE_ACCENT: Record<PositionType, string> = {
  standard: '',
  wagnis: 'bg-amber-50/50',
  reserve: 'bg-violet-50/50',
  nu_marge: 'bg-sky-50/50',
  lohn_puffer: 'bg-rose-50/50',
};

export default function PositionTableV2({
  positions,
  params,
  onChange,
  view: controlledView,
  onViewChange,
  projectMeta,
  commentCounts,
  onOpenComments,
  zuschlagOriginal,
  zuschlagAktuell,
  headerExtras,
  onZschlgChange,
  onZschlgReset,
  faktoren,
}: Props) {
  const [uncontrolledView, setUncontrolledView] = useState<V2ViewMode>('intern');
  const view = controlledView ?? uncontrolledView;
  const setView = useCallback(
    (v: V2ViewMode) => {
      if (onViewChange) onViewChange(v);
      else setUncontrolledView(v);
    },
    [onViewChange],
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedLong, setExpandedLong] = useState<Set<string>>(new Set());
  const [expandedPreCalc, setExpandedPreCalc] = useState<Set<string>>(new Set());

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    let current: { header: Position; rows: Position[] } | null = null;

    function flush() {
      if (!current) return;
      const subtotal = current.rows.reduce(
        (s, p) => s + calculatePosition(p, params).gp,
        0,
      );
      const visibleSubtotal = current.rows.reduce(
        (s, p) =>
          s +
          (p.visibleToCustomer && !INTERNAL_POSITION_TYPES.has(p.positionType ?? 'standard')
            ? calculatePosition(p, params).gp
            : 0),
        0,
      );
      const visibleRowCount = current.rows.filter(
        (p) =>
          p.visibleToCustomer &&
          !INTERNAL_POSITION_TYPES.has(p.positionType ?? 'standard'),
      ).length;
      out.push({
        kind: 'group',
        id: current.header.id,
        header: current.header,
        rows: current.rows,
        subtotal,
        visibleSubtotal,
        visibleRowCount,
      });
      current = null;
    }

    for (const p of positions) {
      if (p.isHeader) {
        flush();
        current = { header: p, rows: [] };
      } else if (current) {
        current.rows.push(p);
      } else {
        out.push({ kind: 'orphan', id: p.id, row: p });
      }
    }
    flush();
    return out;
  }, [positions, params]);

  const totals = useMemo(() => calcTotals(positions, params), [positions, params]);

  // Round 6 PART Z: detect duplicate OZ keys among non-header positions.
  // The parser already flags this on import (ImportIssue code 'duplicate_oz';
  // ex7 has 14). At render time we keep a Set so PositionRow can tag its
  // comment badge with the "kommt mehrfach vor" hint without recomputing
  // per row.
  const duplicateOzKeys = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of positions) {
      if (p.isHeader) continue;
      const oz = (p.oz ?? '').trim();
      if (!oz) continue;
      count.set(oz, (count.get(oz) ?? 0) + 1);
    }
    return new Set(Array.from(count.entries()).filter(([, n]) => n > 1).map(([k]) => k));
  }, [positions]);

  // Round 12 Feature 2 — plausibility chips. Memoized so a row render doesn't
  // recompute medians when an unrelated row changes (still recomputes when
  // any position changes — acceptable for a 400-row LV at <2ms).
  const plausibility = useMemo(
    () => computePlausibility(positions, params),
    [positions, params],
  );

  // Round 12 Feature 1 — bulk edit + multi-select. Selection lives in-component
  // (not persisted). Cleared on view toggle to KUNDEN, Esc, and bulk-action
  // commit/cancel. `lastSelectedId` anchors shift+click range selection.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);

  /** All non-header position ids in render order — anchor for shift-click. */
  const selectableIds = useMemo(
    () => positions.filter((p) => !p.isHeader).map((p) => p.id),
    [positions],
  );

  // Clear selection when leaving INTERN (the bar is hidden in KUNDEN by
  // construction — but also drop the state so toggling back doesn't surface
  // a stale selection).
  useEffect(() => {
    if (view !== 'intern' && selectedIds.size > 0) {
      setSelectedIds(new Set());
      lastSelectedIdRef.current = null;
    }
  }, [view, selectedIds.size]);

  // Esc clears selection (parity with Nevaris / iTwo).
  useEffect(() => {
    if (selectedIds.size === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        lastSelectedIdRef.current = null;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds.size]);

  const toggleSelected = useCallback(
    (id: string, opts?: { shift?: boolean }) => {
      // Drop selection of headers / unknown ids defensively.
      if (!selectableIds.includes(id)) return;
      if (opts?.shift && lastSelectedIdRef.current && lastSelectedIdRef.current !== id) {
        const a = selectableIds.indexOf(lastSelectedIdRef.current);
        const b = selectableIds.indexOf(id);
        if (a === -1 || b === -1) {
          // Anchor missing — fall back to single toggle.
        } else {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          const range = selectableIds.slice(lo, hi + 1);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const rid of range) next.add(rid);
            return next;
          });
          lastSelectedIdRef.current = id;
          return;
        }
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      lastSelectedIdRef.current = id;
    },
    [selectableIds],
  );

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(selectableIds));
    lastSelectedIdRef.current = selectableIds[selectableIds.length - 1] ?? null;
  }, [selectableIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  /** Apply a transformation to every selected position in a single onChange
   *  call. This is the canonical "one save, not N" path the brief mandates. */
  const applyBulk = useCallback(
    (transform: (p: Position) => Position) => {
      if (selectedIds.size === 0) return;
      const next = positions.map((p) =>
        selectedIds.has(p.id) && !p.isHeader ? transform(p) : p,
      );
      onChange(next);
    },
    [positions, onChange, selectedIds],
  );

  // Clamp the multiplier so a -200 % bulk discount can't flip values negative.
  // Math: factor = 1 + pct/100, but a user-typed "-200" yields -1 → values
  // get negated. Clamping at 0 means "-100 %" zeroes out (well-defined) and
  // anything below -100 % silently saturates at 0 instead of going negative.
  // Caught by Round-12 debug suite (PositionTableV2.bulkEdit.edges.test.tsx).
  const pctFactor = (pct: number) => Math.max(0, 1 + pct / 100);

  const bulkAdjustMaterialPct = useCallback(
    (pct: number) => {
      const factor = pctFactor(pct);
      applyBulk((p) => ({ ...p, materialCost: round2(p.materialCost * factor) }));
    },
    [applyBulk],
  );

  const bulkAdjustTimePct = useCallback(
    (pct: number) => {
      const factor = pctFactor(pct);
      applyBulk((p) => ({ ...p, timeMinutes: round2(p.timeMinutes * factor) }));
    },
    [applyBulk],
  );

  const bulkAdjustNuPct = useCallback(
    (pct: number) => {
      const factor = pctFactor(pct);
      applyBulk((p) => ({ ...p, nuCost: round2(p.nuCost * factor) }));
    },
    [applyBulk],
  );

  const bulkMarkAs = useCallback(
    (positionType: PositionType) => {
      applyBulk((p) => ({
        ...p,
        positionType,
        // Mirror setPositionType's contract — internal types force-hide.
        visibleToCustomer: INTERNAL_POSITION_TYPES.has(positionType)
          ? false
          : p.visibleToCustomer,
      }));
    },
    [applyBulk],
  );

  const bulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    // Filter the selection down to rows that ARE actually deletable.
    // GAEB / Excel / preisanfrage rows carry `importedFrom` — those are part
    // of the AG's LV and must never disappear by accident. Silently skip
    // them and report the count via toast so the user knows.
    const protectedIds = new Set<string>();
    const deletableIds = new Set<string>();
    for (const p of positions) {
      if (!selectedIds.has(p.id)) continue;
      if (p.isHeader) continue; // headers were always preserved
      if (p.importedFrom) protectedIds.add(p.id);
      else deletableIds.add(p.id);
    }
    if (deletableIds.size === 0) {
      if (typeof window !== 'undefined') {
        toast.error(
          `${protectedIds.size} ${protectedIds.size === 1 ? 'Position ist' : 'Positionen sind'} aus dem GAEB/Excel-Import und kann nicht gelöscht werden.`,
        );
      }
      return;
    }
    if (typeof window !== 'undefined') {
      const note =
        protectedIds.size > 0
          ? ` (${protectedIds.size} aus GAEB/Excel werden NICHT gelöscht.)`
          : '';
      const ok = window.confirm(
        `${deletableIds.size} ${deletableIds.size === 1 ? 'Position' : 'Positionen'} wirklich löschen?${note} Diese Aktion lässt sich nicht rückgängig machen.`,
      );
      if (!ok) return;
    }
    const next = positions.filter((p) => !deletableIds.has(p.id));
    onChange(next);
    clearSelection();
    if (protectedIds.size > 0 && typeof window !== 'undefined') {
      toast(`${protectedIds.size} GAEB-${protectedIds.size === 1 ? 'Position' : 'Positionen'} übersprungen (Quellschutz).`);
    }
  }, [positions, onChange, selectedIds, clearSelection]);

  const updateRow = useCallback(
    (id: string, patch: Partial<Position>) => {
      onChange(positions.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [positions, onChange],
  );

  const updateNumber = useCallback(
    (id: string, key: keyof Position, raw: string) => {
      const n = parseDeNumber(raw);
      onChange(positions.map((p) => (p.id === id ? { ...p, [key]: n } : p)));
    },
    [positions, onChange],
  );

  const removeRow = useCallback(
    (id: string) => {
      // Protect imported rows (GAEB / Excel / preisanfrage seed) from
      // accidental deletion. The trash icon on these rows is already
      // disabled in the UI, but the defensive check here guards against
      // future programmatic callers, keyboard shortcut wiring, etc.
      const pos = positions.find((p) => p.id === id);
      if (pos?.importedFrom) {
        if (typeof window !== 'undefined') {
          toast.error('GAEB-Position kann nicht gelöscht werden — sie ist Teil des Auftraggeber-LV.');
        }
        return;
      }
      onChange(positions.filter((p) => p.id !== id));
    },
    [positions, onChange],
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      onChange(
        positions.map((p) =>
          p.id === id ? { ...p, visibleToCustomer: !p.visibleToCustomer } : p,
        ),
      );
    },
    [positions, onChange],
  );

  const setPositionType = useCallback(
    (id: string, positionType: PositionType) => {
      onChange(
        positions.map((p) =>
          p.id === id
            ? {
                ...p,
                positionType,
                visibleToCustomer: INTERNAL_POSITION_TYPES.has(positionType)
                  ? false
                  : p.visibleToCustomer,
              }
            : p,
        ),
      );
    },
    [positions, onChange],
  );

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleLongText = useCallback((id: string) => {
    setExpandedLong((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePreCalc = useCallback((id: string) => {
    setExpandedPreCalc((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addPosition = useCallback(() => {
    const id = nanoid(12);
    const sortOrder = (positions[positions.length - 1]?.sortOrder ?? 0) + 1;
    onChange([...positions, makeBlankPosition(id, sortOrder)]);
  }, [positions, onChange]);

  const addHeader = useCallback(() => {
    const id = nanoid(12);
    const sortOrder = (positions[positions.length - 1]?.sortOrder ?? 0) + 1;
    onChange([
      ...positions,
      { ...makeBlankPosition(id, sortOrder), isHeader: true, shortText: 'Neuer Titel' },
    ]);
  }, [positions, onChange]);

  const collapseAll = useCallback(
    () => setCollapsed(new Set(groups.filter((g) => g.kind === 'group').map((g) => g.id))),
    [groups],
  );
  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  // Excel-style keyboard navigation + F-cell point mode: the flat, *visible*
  // order of navigable position rows (collapsed groups + header rows excluded).
  // Mirrors exactly what GroupRows/PositionRow mount, so neighbour math in
  // KalkGridProvider stays in sync with the DOM. `hasPreCalc` = the row's
  // F1..F7 strip is open (its F-columns are mounted + navigable).
  const orderedRows = useMemo<RowDescriptor[]>(() => {
    const out: RowDescriptor[] = [];
    for (const g of groups) {
      if (g.kind === 'group') {
        if (collapsed.has(g.id)) continue;
        for (const r of g.rows) out.push({ rowId: r.id, hasPreCalc: expandedPreCalc.has(r.id) });
      } else {
        out.push({ rowId: g.row.id, hasPreCalc: expandedPreCalc.has(g.row.id) });
      }
    }
    return out;
  }, [groups, collapsed, expandedPreCalc]);

  if (view === 'kunden') {
    return (
      <KundenPreview
        groups={groups}
        positions={positions}
        params={params}
        totals={totals}
        projectMeta={projectMeta}
        viewToggle={<ViewToggle view={view} onChange={setView} />}
      />
    );
  }

  return (
    <KalkGridProvider orderedRows={orderedRows}>
    <div className="space-y-3">
      {/* PART Q: sticky Zuschlag matrix at the top of INTERN view. Renders
          only when the imported project carries the captured matrix (i.e.
          imported through the kalku-xlsx fast-path). Old projects without
          it just see the existing layout. */}
      {zuschlagOriginal && (
        <ZuschlagMatrixStrip
          original={zuschlagOriginal}
          aktuell={zuschlagAktuell}
          extras={headerExtras}
          params={params}
          onZschlgChange={(cost, decimal) => onZschlgChange?.(cost, decimal)}
          onZschlgReset={(cost) => onZschlgReset?.(cost)}
        />
      )}

    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <ViewToggle view={view} onChange={setView} />

        <div className="h-5 w-px bg-slate-200" aria-hidden />

        <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
          <span className="inline-block w-3 h-3 rounded-sm bg-white border border-slate-200" />
          <span>Kunde sieht</span>
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 ml-2" />
          <span>nur intern</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {groups.length > 0 && (
            <button
              onClick={collapsed.size > 0 ? expandAll : collapseAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:border-slate-300"
              title={collapsed.size > 0 ? 'Alle Gruppen ausklappen' : 'Alle Gruppen einklappen'}
            >
              <Layers className="w-3.5 h-3.5" />
              {collapsed.size > 0 ? 'Alle ausklappen' : 'Alle einklappen'}
            </button>
          )}
          <button
            onClick={addHeader}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:border-slate-300"
          >
            <Plus className="w-3.5 h-3.5" />
            Titel
          </button>
          <button
            onClick={addPosition}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700 hover:bg-primary-100"
          >
            <Plus className="w-3.5 h-3.5" />
            Position
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none">
              {/* Round 12 Feature 1 — bulk-select header checkbox.
                  Click toggles "all visible non-header rows" on/off.
                  Indeterminate state when only some rows are selected. */}
              <th className="sticky top-0 z-10 bg-white border-b border-slate-200 px-1.5 py-2.5 w-7">
                <SelectAllCheckbox
                  total={selectableIds.length}
                  selected={selectedIds.size}
                  onSelectAll={selectAllVisible}
                  onClearAll={clearSelection}
                />
              </th>
              <ColHead className="w-8 bg-white">{''}</ColHead>
              <ColHead className="w-[110px] bg-white">OZ</ColHead>
              <ColHead className="bg-white">Bezeichnung</ColHead>
              <ColHead className="w-[90px] bg-white" align="right">Menge</ColHead>
              <ColHead className="w-[60px] bg-white">EH</ColHead>
              <ColHead className="w-[110px] bg-white" align="right">EP €/EH</ColHead>
              <ColHead className="w-[130px] bg-white" align="right">GP €</ColHead>
              <th className="bg-white p-0 w-0">
                <div className="h-9 w-px bg-slate-300 mx-auto" aria-hidden />
              </th>
              <ColHead className="w-[108px] bg-slate-100/70" align="right" intern>Material</ColHead>
              <ColHead className="w-[108px] bg-slate-100/70" align="right" intern>Zeit min</ColHead>
              <ColHead className="w-[108px] bg-slate-100/70" align="right" intern>NU €</ColHead>
              <ColHead className="w-[108px] bg-slate-100/70" align="right" intern>
                <span title="Zulage Geräte (€/h) je Position — Standard: projektweiter Geräte-Stundensatz. Zahl überschreibt diese Zeile, leeren = zurück zum Projektsatz.">Zulage Ger.</span>
              </ColHead>
              <ColHead className="w-[116px] bg-slate-100/70" align="right" intern>
                <span title="EP Geräte je Einheit — Standard: Zeit/60 × Zulage Geräte. Zahl oder =Formel überschreibt diese Zeile.">EP Geräte</span>
              </ColHead>
              <ColHead className="w-[116px] bg-slate-100/70" align="right" intern>
                <span title="EP Löhne je Einheit — Standard: Zeit/60 × Verrechnungslohn. Zahl oder =Formel überschreibt diese Zeile.">EP Löhne</span>
              </ColHead>
              <ColHead className="w-[110px] bg-slate-100/70" intern>Typ</ColHead>
              {/* Header for the Vorrechnung toggle column. Was empty in
                  prior versions — labeling it helps users discover the
                  F1..F7 per-row scratch slots. */}
              <ColHead className="w-[60px] bg-slate-100/70 text-center" intern>
                <span title="Pro Zeile 7 Vorrechnungs-Felder (F1..F7) — Klick öffnet die Strip-Ansicht">
                  Vorr.
                </span>
              </ColHead>
              <ColHead className="w-[44px] bg-slate-100/70" intern>{''}</ColHead>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={18} className="px-6 py-16 text-center text-slate-400 border-t border-slate-100">
                  Noch keine Positionen. Mit <strong>+ Position</strong> oder <strong>+ Titel</strong> beginnen.
                </td>
              </tr>
            )}
            {groups.map((g) =>
              g.kind === 'group' ? (
                <GroupRows
                  key={g.id}
                  group={g}
                  params={params}
                  isCollapsed={collapsed.has(g.id)}
                  onToggleCollapse={() => toggleGroup(g.id)}
                  updateRow={updateRow}
                  updateNumber={updateNumber}
                  removeRow={removeRow}
                  toggleVisibility={toggleVisibility}
                  setPositionType={setPositionType}
                  toggleLongText={toggleLongText}
                  expandedLong={expandedLong}
                  commentCounts={commentCounts}
                  onOpenComments={onOpenComments}
                  duplicateOzKeys={duplicateOzKeys}
                  faktoren={faktoren}
                  togglePreCalc={togglePreCalc}
                  expandedPreCalc={expandedPreCalc}
                  selectedIds={selectedIds}
                  toggleSelected={toggleSelected}
                  plausibility={plausibility}
                />
              ) : (
                <PositionRow
                  key={g.row.id}
                  position={g.row}
                  params={params}
                  updateRow={updateRow}
                  updateNumber={updateNumber}
                  removeRow={removeRow}
                  toggleVisibility={toggleVisibility}
                  setPositionType={setPositionType}
                  toggleLongText={toggleLongText}
                  isLongExpanded={expandedLong.has(g.row.id)}
                  commentCount={commentCounts?.[g.row.oz?.trim() ?? '']}
                  onOpenComments={onOpenComments}
                  isDuplicateOz={duplicateOzKeys.has((g.row.oz ?? '').trim())}
                  faktoren={faktoren}
                  togglePreCalc={togglePreCalc}
                  isPreCalcExpanded={expandedPreCalc.has(g.row.id)}
                  isSelected={selectedIds.has(g.row.id)}
                  onToggleSelect={toggleSelected}
                  chip={plausibility.get(g.row.id)}
                />
              ),
            )}
          </tbody>
        </table>
      </div>

      <StickyTotals totals={totals} positionCount={positions.filter((p) => !p.isHeader).length} />
    </div>

    {/* Round 12 Feature 1 — bulk action bar. Fixed to the viewport bottom
        while in INTERN view + ≥1 row selected. Hidden in KUNDEN (the
        component early-returns to KundenPreview before reaching here). */}
    {selectedIds.size > 0 && (
      <BulkActionBar
        count={selectedIds.size}
        onAdjustMaterialPct={bulkAdjustMaterialPct}
        onAdjustTimePct={bulkAdjustTimePct}
        onAdjustNuPct={bulkAdjustNuPct}
        onMarkAs={bulkMarkAs}
        onDeleteSelected={bulkDelete}
        onClear={clearSelection}
      />
    )}
    </div>
    </KalkGridProvider>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: V2ViewMode;
  onChange: (v: V2ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Ansicht umschalten"
      data-testid="v2-view-toggle"
      className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm"
    >
      <button
        role="tab"
        aria-selected={view === 'intern'}
        onClick={() => onChange('intern')}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg transition-colors',
          view === 'intern'
            ? 'bg-primary-600 text-white shadow-sm font-semibold'
            : 'text-slate-600 hover:text-slate-900',
        )}
      >
        <Lock className="w-3.5 h-3.5" />
        INTERN
      </button>
      <button
        role="tab"
        aria-selected={view === 'kunden'}
        onClick={() => onChange('kunden')}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg transition-colors',
          view === 'kunden'
            ? 'bg-emerald-600 text-white shadow-sm font-semibold'
            : 'text-slate-600 hover:text-slate-900',
        )}
      >
        <Users className="w-3.5 h-3.5" />
        KUNDEN-Vorschau
      </button>
    </div>
  );
}

function ColHead({
  children,
  className,
  align = 'left',
  intern,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  intern?: boolean;
}) {
  return (
    <th
      className={clsx(
        'sticky top-0 z-10 px-2 py-2.5 font-semibold border-b border-slate-200',
        align === 'right' ? 'text-right' : 'text-left',
        intern && 'text-slate-600',
        className,
      )}
    >
      {children}
    </th>
  );
}

type GroupRowsProps = {
  group: Extract<Group, { kind: 'group' }>;
  params: CalcParams;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  updateRow: (id: string, patch: Partial<Position>) => void;
  updateNumber: (id: string, key: keyof Position, raw: string) => void;
  removeRow: (id: string) => void;
  toggleVisibility: (id: string) => void;
  setPositionType: (id: string, t: PositionType) => void;
  toggleLongText: (id: string) => void;
  expandedLong: Set<string>;
  commentCounts?: Record<string, { total: number; unresolved: number }>;
  onOpenComments?: (positionOz: string) => void;
  /** Round 6 PART Z: OZ keys that appear on more than one non-header
   *  position. Comments on these OZs hit ALL matching rows (back end
   *  stores by OZ text). The badge surfaces this with a hint. */
  duplicateOzKeys?: Set<string>;
  /** Faktoren-Bibliothek surfaced in the per-cell FormulaCell autocomplete. */
  faktoren?: FaktorEntry[];
  /** Per-row F1..F7 Vorrechnung toggle + expanded-state tracker. */
  togglePreCalc: (id: string) => void;
  expandedPreCalc: Set<string>;
  /** Round 12 Feature 1 — bulk-select state + handler. */
  selectedIds: Set<string>;
  toggleSelected: (id: string, opts?: { shift?: boolean }) => void;
  /** Round 12 Feature 2 — per-row plausibility chips. */
  plausibility: Map<string, PlausibilityChip>;
};

function GroupRows({
  group,
  params,
  isCollapsed,
  onToggleCollapse,
  updateRow,
  updateNumber,
  removeRow,
  toggleVisibility,
  setPositionType,
  toggleLongText,
  expandedLong,
  commentCounts,
  onOpenComments,
  duplicateOzKeys,
  faktoren,
  togglePreCalc,
  expandedPreCalc,
  selectedIds,
  toggleSelected,
  plausibility,
}: GroupRowsProps) {
  return (
    <>
      <tr className="group/hdr" data-testid={`v2-group-${group.id}`}>
        {/* Round 12 Feature 1 — empty placeholder cell to keep the column
            grid aligned. Header rows are never selectable per spec. */}
        <td className="bg-primary-50/60 border-t border-slate-200 px-1 py-1.5" aria-hidden />
        <td className="bg-primary-50/60 border-t border-slate-200 px-1 py-1.5">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-primary-700 hover:bg-primary-100"
            aria-label={isCollapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </td>
        <td colSpan={5} className="bg-primary-50/60 border-t border-slate-200 px-2 py-2">
          <div className="flex items-start gap-2">
            {/* PART N: group/KG headings wrap. PART O: read-only. */}
            <div
              data-readonly="group-name"
              data-testid={`v2-group-name-${group.header.id}`}
              className="flex-1 font-semibold text-primary-800 px-1 py-0.5 whitespace-pre-wrap break-words leading-[1.45]"
            >
              {group.header.shortText || '—'}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-700/70 tabular-nums whitespace-nowrap shrink-0 mt-1">
              {group.rows.length} Pos
              {group.visibleRowCount !== group.rows.length && (
                <span className="ml-1 text-amber-700">
                  ({group.visibleRowCount} Kunde)
                </span>
              )}
            </span>
          </div>
        </td>
        <td className="bg-primary-50/60 border-t border-slate-200 px-2 py-1.5 text-right tabular-nums font-bold text-primary-900 whitespace-nowrap">
          {formatEUR(group.subtotal)}
        </td>
        <td className="bg-primary-50/60 border-t border-slate-200 p-0">
          <div className="h-full w-px bg-slate-300 mx-auto" aria-hidden />
        </td>
        <td colSpan={9} className="bg-primary-100/40 border-t border-slate-200 px-2 py-1.5">
          {group.visibleSubtotal !== group.subtotal && (
            <div className="text-[10px] uppercase tracking-wider text-primary-800/80 text-right tabular-nums">
              ∑ Kunde: {formatEUR(group.visibleSubtotal)}
            </div>
          )}
        </td>
      </tr>
      {!isCollapsed &&
        group.rows.map((p) => (
          <PositionRow
            key={p.id}
            position={p}
            params={params}
            updateRow={updateRow}
            updateNumber={updateNumber}
            removeRow={removeRow}
            toggleVisibility={toggleVisibility}
            setPositionType={setPositionType}
            toggleLongText={toggleLongText}
            isLongExpanded={expandedLong.has(p.id)}
            commentCount={commentCounts?.[p.oz?.trim() ?? '']}
            onOpenComments={onOpenComments}
            isDuplicateOz={duplicateOzKeys?.has((p.oz ?? '').trim()) ?? false}
            faktoren={faktoren}
            togglePreCalc={togglePreCalc}
            isPreCalcExpanded={expandedPreCalc.has(p.id)}
            isSelected={selectedIds.has(p.id)}
            onToggleSelect={toggleSelected}
            chip={plausibility.get(p.id)}
          />
        ))}
    </>
  );
}

type PositionRowProps = {
  position: Position;
  params: CalcParams;
  updateRow: (id: string, patch: Partial<Position>) => void;
  updateNumber: (id: string, key: keyof Position, raw: string) => void;
  removeRow: (id: string) => void;
  toggleVisibility: (id: string) => void;
  setPositionType: (id: string, t: PositionType) => void;
  toggleLongText: (id: string) => void;
  isLongExpanded: boolean;
  commentCount?: { total: number; unresolved: number };
  onOpenComments?: (positionOz: string) => void;
  /** Round 6 PART Z: true when this row's OZ appears on >1 non-header
   *  position in the project. Comments persist by OZ text — surface that
   *  ambiguity in the badge title so the calculator knows. */
  isDuplicateOz?: boolean;
  /** Faktoren-Bibliothek surfaced in the per-cell FormulaCell autocomplete
   *  for the three editable cost cells in this row + the F1..F7 strip. */
  faktoren?: FaktorEntry[];
  /** Per-row F1..F7 Vorrechnung expand toggle + state. */
  togglePreCalc?: (id: string) => void;
  isPreCalcExpanded?: boolean;
  /** Round 12 Feature 1 — bulk-select state + handler.  When `onToggleSelect`
   *  is omitted (e.g. tests that exercise the row in isolation), the checkbox
   *  becomes inert but still renders so colSpan stays consistent. */
  isSelected?: boolean;
  onToggleSelect?: (id: string, opts?: { shift?: boolean }) => void;
  /** Round 12 Feature 2 — plausibility chip data, if this row triggered one
   *  or both of the two rules. */
  chip?: PlausibilityChip;
};

function PositionRow({
  position: p,
  params,
  // updateRow IS used now — FormulaCell commits both the cached value AND
  // the (optional) stored formula via a single { materialCost, materialFormula }
  // patch. updateNumber is no longer needed on this row since FormulaCell
  // handles its own numeric commit through the patch shape.
  updateRow,
  updateNumber: _updateNumber,
  removeRow,
  toggleVisibility,
  setPositionType,
  toggleLongText,
  isLongExpanded,
  commentCount,
  onOpenComments,
  isDuplicateOz,
  faktoren,
  togglePreCalc,
  isPreCalcExpanded,
  isSelected,
  onToggleSelect,
  chip,
}: PositionRowProps) {
  const calc = useMemo(() => calculatePosition(p, params), [p, params]);
  // Effective per-unit EP Geräte / EP Löhne for the editable cells. Default =
  // the Vorlage formula (Echte-Zeit/60 × Zulage-Geräte resp. × Verrechnungslohn,
  // pre-Ziel-Aufschlag, matching the stored override basis); a per-row override
  // (geraeteEp / lohnEp) wins. Type a number/=formula to override, clear to revert.
  const adjMin = p.timeMinutes + (p.timeMinutes / 100) * params.zeitabzug;
  const epGeraeteCell = p.geraeteEp ?? (adjMin / 60) * (p.geraeteSatz ?? params.geraeteStundensatz);
  // Include the per-row Lohn-Faktor W (Vorlage AB = Zeit/60 × Verrechnungslohn × W)
  // so a Stundenlohn row shows its real EP Löhne (e.g. 64,90 × 1,35 = 87,62), not
  // the bare Verrechnungslohn. Default 1; a flat lohnEp override still wins.
  const epLohnCell = p.lohnEp ?? (adjMin / 60) * params.verrechnungslohn * (p.lohnFaktor ?? 1);
  // Named tokens a custom EP-Geräte / EP-Löhne formula can reference, so the
  // calculator can rebuild the Vorlage's own formula (e.g. `=Zeit/60*verrechnungslohn*1.41`).
  const formulaTokens = useMemo(
    () => ({
      Zeit: p.timeMinutes,
      EchteZeit: adjMin,
      verrechnungslohn: params.verrechnungslohn,
      mittellohn: params.mittellohn,
      geraetesatz: p.geraeteSatz ?? params.geraeteStundensatz,
    }),
    [p.timeMinutes, adjMin, params.verrechnungslohn, params.mittellohn, p.geraeteSatz, params.geraeteStundensatz],
  );
  const pt = (p.positionType ?? 'standard') as PositionType;
  const internal = INTERNAL_POSITION_TYPES.has(pt);
  const hasLong = (p.longText ?? '').trim().length > 0;
  const accent = TYPE_ACCENT[pt];

  return (
    <>
      <tr
        data-testid={`v2-row-${p.id}`}
        aria-selected={isSelected ? 'true' : undefined}
        className={clsx(
          'group hover:bg-amber-50/40 transition-colors',
          accent,
          !p.visibleToCustomer && !internal && 'opacity-70',
          // Subtle highlight for selected rows — distinct from hover so the
          // calculator sees what they've marked at a glance.
          isSelected && 'bg-primary-50/60 hover:bg-primary-50/80',
        )}
      >
        {/* Round 12 Feature 1 — bulk-select checkbox. Lives in its own cell
            so a row body click doesn't toggle selection (the cell stops
            event propagation). */}
        <td
          className="bg-white border-t border-slate-100 px-1.5 py-[10px] align-top"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!isSelected}
            data-testid={`v2-select-row-${p.id}`}
            aria-label={`Position ${p.oz || p.shortText || p.id} markieren`}
            onChange={(e) => {
              // Shift+click: extend the range from the last anchor.
              const shift = (e.nativeEvent as MouseEvent).shiftKey;
              onToggleSelect?.(p.id, shift ? { shift: true } : undefined);
            }}
            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
        </td>
        <td className="bg-white border-t border-slate-100 px-1 py-[10px] align-top">
          <button
            onClick={() =>
              internal ? setPositionType(p.id, 'standard') : toggleVisibility(p.id)
            }
            aria-label="Sichtbarkeit umschalten"
            title={
              internal
                ? `${POSITION_TYPE_LABELS[pt]} — immer intern. Klicken: zurück auf Standard.`
                : p.visibleToCustomer
                  ? 'Kunde sieht diese Zeile'
                  : 'Vor Kunde versteckt'
            }
            className={clsx(
              'p-1 rounded-md transition-colors',
              internal
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                : p.visibleToCustomer
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-300 hover:bg-slate-100',
            )}
          >
            {internal ? (
              <Lock className="w-3.5 h-3.5" />
            ) : p.visibleToCustomer ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>
        </td>

        {/* OZ — read-only display, whitespace preserved so " 1. 4. 1.  .   1"
            renders exactly as imported. Top-aligned so a multi-line
            Bezeichnung doesn't push the OZ off the row.
            Round 12 Feature 2 — plausibility chips sit BELOW the OZ string
            (the OZ field is narrow; stacking vertically keeps the column
            from overflowing). */}
        <td className="bg-white border-t border-slate-100 px-2 py-[10px] align-top">
          <div className="flex flex-col gap-1">
            <div
              data-readonly="oz"
              className="w-full font-mono text-[12px] text-slate-700 px-1 py-1 whitespace-pre"
              title={p.oz}
            >
              {p.oz || '—'}
            </div>
            {chip && <PlausibilityChips position={p} chip={chip} />}
          </div>
        </td>

        {/* Bezeichnung — read-only display, FULL text always rendered.
            white-space: pre-wrap respects newlines + spaces; break-words
            breaks overlong tokens (e.g. cable specs without spaces).
            line-height 1.45 + py-[10px] gives breathing room when the
            row grows past a single line. */}
        <td className="bg-white border-t border-slate-100 px-2 py-[10px] align-top">
          <div className="flex items-start gap-1 min-w-0">
            {hasLong ? (
              <button
                onClick={() => toggleLongText(p.id)}
                className={clsx(
                  'p-0.5 mt-0.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 shrink-0',
                  isLongExpanded && 'text-primary-700 bg-primary-50',
                )}
                title={isLongExpanded ? 'Langtext einklappen' : 'Langtext anzeigen'}
              >
                {isLongExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <span className="w-4 shrink-0" aria-hidden />
            )}
            <div
              data-readonly="bezeichnung"
              data-testid={`v2-bezeichnung-${p.id}`}
              className="flex-1 min-w-0 px-1 py-1 whitespace-pre-wrap break-words leading-[1.45] text-slate-900"
            >
              {p.shortText}
            </div>
            {/* PART K: customer-comment badge. Shows only when count > 0.
                Amber if any unresolved, slate if all resolved. Click → fires
                onOpenComments(positionOz) so the parent can open the
                FeedbackInbox thread filtered to this OZ. */}
            {commentCount && commentCount.total > 0 && (
              <button
                type="button"
                onClick={() => onOpenComments?.(p.oz?.trim() ?? '')}
                data-testid={`v2-comment-badge-${p.id}`}
                data-duplicate-oz={isDuplicateOz ? 'true' : undefined}
                title={
                  (commentCount.unresolved > 0
                    ? `${commentCount.unresolved} offene Kunden-Anmerkung${commentCount.unresolved === 1 ? '' : 'en'} (${commentCount.total} gesamt)`
                    : `${commentCount.total} erledigte Kunden-Anmerkung${commentCount.total === 1 ? '' : 'en'}`) +
                  (isDuplicateOz
                    ? ` — Achtung: OZ "${p.oz?.trim()}" kommt mehrfach vor; Kommentar zur ersten passenden Position zugeordnet`
                    : '')
                }
                className={clsx(
                  'inline-flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums',
                  commentCount.unresolved > 0
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  // Round 6 PART Z: amber ring when OZ is duplicated so the
                  // calculator notices at a glance.
                  isDuplicateOz && 'ring-1 ring-amber-400',
                )}
              >
                <MessageCircle className="w-3 h-3" />
                {commentCount.unresolved > 0 ? commentCount.unresolved : commentCount.total}
                {isDuplicateOz && <span className="text-amber-700 ml-0.5" aria-hidden>!</span>}
              </button>
            )}
          </div>
        </td>

        {/* Menge — read-only (PART O). Top-aligned so a multi-line Bezeichnung
            doesn't push the price off the row. */}
        <td className="bg-white border-t border-slate-100 px-2 py-[10px] align-top text-right tabular-nums text-slate-700">
          <div data-readonly="menge">{formatNum(p.quantity, p.quantity % 1 === 0 ? 0 : 2)}</div>
        </td>

        <td className="bg-white border-t border-slate-100 px-2 py-[10px] align-top">
          <div data-readonly="einheit" className="w-full text-xs text-slate-500 px-1 py-1">
            {p.unit || '—'}
          </div>
        </td>

        <td
          className="bg-white border-t border-slate-100 px-2 py-[10px] align-top text-right tabular-nums text-slate-700"
          title={
            // 4-line EP breakdown — same formula as the Excel Vorlage:
            //   E = AA + AB + AJ + AK
            // Documented in docs/v2_redesign/formula_audit_vs_real_excel.md
            `EP-Zerlegung\n` +
            `  Material:  ${formatNum(p.materialCost, 2)} × (1 + ${formatNum(params.materialZuschlag * 100, 0)} %) = ${formatNum(calc.epMaterial, 2)} €\n` +
            `  Lohn:      ${formatNum(p.timeMinutes, 1)} min / 60 × ${formatNum(params.verrechnungslohn, 2)} €/h = ${formatNum(calc.epLohn, 2)} €\n` +
            `  Geräte:    ${formatNum(p.timeMinutes, 1)} min / 60 × ${formatNum(params.geraeteStundensatz, 2)} €/h = ${formatNum(calc.epGeraet, 2)} €\n` +
            `  NU:        ${formatNum(p.nuCost, 2)} × (1 + ${formatNum(params.nuZuschlag * 100, 0)} %) = ${formatNum(calc.epNu, 2)} €\n` +
            `  ─────────────────────────────\n` +
            `  EP         = ${formatNum(calc.ep, 2)} €`
          }
        >
          {formatNum(calc.ep, 2)}
        </td>

        <td
          className="bg-white border-t border-slate-100 px-2 py-[10px] align-top text-right tabular-nums font-semibold text-slate-900"
          title={
            `GP = Menge × EP\n` +
            `   = ${formatNum(p.quantity, p.quantity % 1 === 0 ? 0 : 2)} ${p.unit ?? ''} × ${formatNum(calc.ep, 2)} €\n` +
            `   = ${formatEUR(calc.gp)}`
          }
        >
          {formatEUR(calc.gp)}
        </td>

        <td className="bg-white border-t border-slate-100 p-0">
          <div className="h-full w-px bg-slate-200 mx-auto" aria-hidden />
        </td>

        {/* Per-position cost INPUTS — editable. The calculator enters
            Material EK / Min/Einheit / NU EK after a GAEB import or from
            supplier quotes; this is the core workflow. PART O's "EK per
            cost type" lock refers to the row-aggregated J4/J5/J6/J7 TOTALS
            in the Zuschlag matrix strip (top of INTERN view), NOT these
            per-row inputs. Top-aligned via NumCellEditable's td styling. */}
        <FormulaCell
          value={p.materialCost}
          formula={p.materialFormula}
          onCommit={(v, f) => updateRow(p.id, { materialCost: v, materialFormula: f })}
          faktoren={faktoren}
          contextMenge={p.quantity}
          preCalcs={p.preCalcs}
          label="Material EK"
          rowId={p.id}
          col="material"
        />
        <FormulaCell
          value={p.timeMinutes}
          formula={p.timeMinutesFormula}
          onCommit={(v, f) => updateRow(p.id, { timeMinutes: v, timeMinutesFormula: f })}
          faktoren={faktoren}
          contextMenge={p.quantity}
          preCalcs={p.preCalcs}
          label="Min/Einheit"
          rowId={p.id}
          col="time"
        />
        <FormulaCell
          value={p.nuCost}
          formula={p.nuFormula}
          onCommit={(v, f) => updateRow(p.id, { nuCost: v, nuFormula: f })}
          faktoren={faktoren}
          contextMenge={p.quantity}
          preCalcs={p.preCalcs}
          label="NU EK"
          rowId={p.id}
          col="nu"
        />
        {/* Zulage Geräte (col Z) — the per-position Geräte-Stundensatz that
            drives the EP-Geräte default formula. Defaults to the project rate
            (calcParams.geraeteStundensatz); a number here pins a per-row rate
            (crane/lift), clearing (0) reverts to the project rate. */}
        <FormulaCell
          value={p.geraeteSatz ?? params.geraeteStundensatz}
          onCommit={(v) =>
            updateRow(p.id, { geraeteSatz: v === 0 ? undefined : v })
          }
          faktoren={faktoren}
          contextMenge={p.quantity}
          preCalcs={p.preCalcs}
          label="Zulage Geräte (€/h)"
          rowId={p.id}
          col="geraeteSatz"
        />
        {/* EP Geräte (col AA) + EP Löhne (col AB) — per-position outputs that
            default to the Vorlage formula but can be overridden per row with a
            fixed number or a custom formula (like Excel). Clearing the cell
            (empty / 0) reverts to the formula. v === 0 ⇒ drop the override. */}
        <FormulaCell
          value={epGeraeteCell}
          formula={p.geraeteEpFormula}
          onCommit={(v, f) =>
            updateRow(
              p.id,
              f
                ? { geraeteEp: v, geraeteEpFormula: f }
                : v === 0
                  ? { geraeteEp: undefined, geraeteEpFormula: undefined }
                  : { geraeteEp: v, geraeteEpFormula: undefined },
            )
          }
          faktoren={faktoren}
          contextMenge={p.quantity}
          preCalcs={p.preCalcs}
          extraTokens={formulaTokens}
          label="EP Geräte"
          rowId={p.id}
          col="epGeraete"
        />
        <FormulaCell
          value={epLohnCell}
          formula={p.lohnEpFormula}
          onCommit={(v, f) =>
            updateRow(
              p.id,
              f
                ? { lohnEp: v, lohnEpFormula: f }
                : v === 0
                  ? { lohnEp: undefined, lohnEpFormula: undefined }
                  : { lohnEp: v, lohnEpFormula: undefined },
            )
          }
          faktoren={faktoren}
          contextMenge={p.quantity}
          preCalcs={p.preCalcs}
          extraTokens={formulaTokens}
          label="EP Löhne"
          rowId={p.id}
          col="epLohn"
        />

        <td className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top">
          <PositionTypeSelect
            value={pt}
            onChange={(t) => setPositionType(p.id, t)}
          />
        </td>

        <td className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top">
          {/* Vorrechnung F1..F7 toggle. Always visible on hover; shows
              active state when the strip is open OR when any slot has a
              non-zero value (so the calculator can find rows with stashed
              pre-calcs at a glance). */}
          {togglePreCalc && (() => {
            const populatedCount = p.preCalcs
              ? Object.values(p.preCalcs).filter((s) => s && (s.value !== 0 || s.formula)).length
              : 0;
            return (
              <button
                onClick={() => togglePreCalc(p.id)}
                title={
                  isPreCalcExpanded
                    ? 'Vorrechnung F1..F7 einklappen'
                    : populatedCount > 0
                      ? `Vorrechnung öffnen — ${populatedCount} von 7 Feldern befüllt`
                      : 'Vorrechnung F1..F7 öffnen — 7 freie Felder pro Position für Zwischenergebnisse'
                }
                aria-label="Vorrechnung F1..F7"
                data-testid={`precalc-toggle-${p.id}`}
                className={clsx(
                  // Always visible — no opacity gating. Discoverability >>
                  // sparkle effect.
                  'inline-flex items-center justify-center min-w-[28px] h-6 px-1 rounded text-[10px] font-mono font-bold transition-colors gap-0.5',
                  isPreCalcExpanded
                    ? 'bg-emerald-600 text-white'
                    : populatedCount > 0
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700',
                )}
              >
                {isPreCalcExpanded ? '−' : '+'} F₁₇
                {populatedCount > 0 && !isPreCalcExpanded && (
                  <span className="text-emerald-700 font-bold">·{populatedCount}</span>
                )}
              </button>
            );
          })()}
          {hasLong && !togglePreCalc && (
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded text-slate-400"
              title={`${(p.longText ?? '').length} Zeichen Langtext`}
            >
              <FileText className="w-3 h-3" />
            </span>
          )}
        </td>

        <td className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top">
          {p.importedFrom ? (
            // GAEB / Excel / preisanfrage-seeded row — protected from
            // deletion. Disabled trash + descriptive tooltip so the
            // calculator knows why the icon doesn't fire.
            <span
              className="inline-flex p-1 rounded text-slate-300 cursor-not-allowed opacity-0 group-hover:opacity-60"
              title={`Aus ${
                p.importedFrom === 'gaeb'
                  ? 'GAEB-Import'
                  : p.importedFrom === 'excel'
                    ? 'Excel-Import'
                    : 'preisanfrage'
              } — kann nicht gelöscht werden (Teil des Auftraggeber-LV).`}
              data-testid={`v2-trash-locked-${p.id}`}
              aria-disabled="true"
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          ) : (
            <button
              onClick={() => removeRow(p.id)}
              className="p-1 rounded text-slate-300 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Zeile löschen"
              data-testid={`v2-trash-${p.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </td>
      </tr>

      {/* Per-row F1..F7 Vorrechnung sub-row — only renders when the
          calculator has expanded it via the F₁₇ toggle button. Spans the
          full table width. Commits each slot individually through
          updateRow so unmodified slots stay untouched. colSpan tracks the
          full intern width: leading checkbox col + the EP-Geräte/EP-Löhne
          columns bring it to 17. */}
      {isPreCalcExpanded && (
        <PreCalcStrip
          rowId={p.id}
          preCalcs={p.preCalcs}
          colSpan={18}
          faktoren={faktoren}
          contextMenge={p.quantity}
          positionLabel={`${(p.oz || '—').trim()} · ${p.shortText || ''}`.slice(0, 80)}
          onSlotCommit={(slot, value, formula) => {
            const nextPreCalcs = { ...(p.preCalcs ?? {}) };
            if (value === 0 && !formula) {
              delete nextPreCalcs[slot];
            } else {
              nextPreCalcs[slot] = { value, formula };
            }
            updateRow(p.id, {
              preCalcs: Object.keys(nextPreCalcs).length === 0 ? undefined : nextPreCalcs,
            });
          }}
        />
      )}

      {isLongExpanded && hasLong && (
        <tr>
          {/* Round 12: leading empty cell for the new checkbox column. */}
          <td className="bg-slate-50/40 border-t border-slate-100" aria-hidden />
          <td className="bg-slate-50/40 border-t border-slate-100" />
          <td className="bg-slate-50/40 border-t border-slate-100" />
          <td colSpan={5} className="bg-slate-50/40 border-t border-slate-100 px-2 py-2">
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 mt-1.5 shrink-0" />
              {/* PART N + O: full Langtext rendered read-only with pre-wrap.
                  LV langtext is sourced from Excel — edit in Excel and re-import
                  to change. */}
              <div
                data-readonly="longText"
                data-testid={`v2-longtext-${p.id}`}
                className="flex-1 text-sm bg-white border border-slate-200 rounded p-2 whitespace-pre-wrap break-words font-sans leading-[1.45] text-slate-800"
              >
                {p.longText}
              </div>
            </div>
          </td>
          <td className="bg-slate-50/40 border-t border-slate-100" />
          <td colSpan={9} className="bg-slate-50/40 border-t border-slate-100" />
        </tr>
      )}
    </>
  );
}

// NumCellEditable + CalcPopover were superseded by FormulaCell — the
// inline-formula pattern matches what Excel / Nevaris / California.pro
// actually do. The modal-popover Σ was a UX dead end (users had to
// discover it, click to open, lose the inline rhythm). FormulaCell
// activates formula mode by typing `=` as the first character — same
// affordance as Excel — and shows the live preview + fx badge inline.

function PositionTypeSelect({
  value,
  onChange,
}: {
  value: PositionType;
  onChange: (t: PositionType) => void;
}) {
  const internal = INTERNAL_POSITION_TYPES.has(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PositionType)}
      title={internal ? 'Intern — Kunde sieht diese Zeile nie' : 'Position-Typ'}
      className={clsx(
        'w-full text-[10px] uppercase tracking-wider rounded px-1 py-1 border border-transparent bg-transparent outline-none',
        'focus:bg-white focus:border-slate-300 cursor-pointer',
        internal
          ? 'text-amber-700 bg-amber-50/60 border-amber-200/60 font-semibold'
          : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {POSITION_TYPES.map((t) => (
        <option key={t} value={t}>
          {POSITION_TYPE_LABELS[t]}
        </option>
      ))}
    </select>
  );
}

function StickyTotals({
  totals,
  positionCount,
}: {
  totals: ReturnType<typeof calcTotals>;
  positionCount: number;
}) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 text-sm">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-primary-500" />
          <span>{positionCount} Positionen · {formatNum(totals.totalHours, 1)} h</span>
        </div>
        <div className="flex items-center gap-5">
          <TotalChip label="Lohn" value={totals.totalLohn} muted />
          <TotalChip label="Material" value={totals.totalMaterial} muted />
          <TotalChip label="Geräte" value={totals.totalGeraet} muted />
          <TotalChip label="NU" value={totals.totalNu} muted />
          <span className="h-5 w-px bg-slate-200" aria-hidden />
          <TotalChip label="Netto" value={totals.totalNetto} strong />
          <TotalChip label="Brutto" value={totals.totalBrutto} strong primary />
        </div>
      </div>
    </div>
  );
}

function TotalChip({
  label,
  value,
  muted,
  strong,
  primary,
}: {
  label: string;
  value: number;
  muted?: boolean;
  strong?: boolean;
  primary?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={clsx('text-[10px] uppercase tracking-wider', muted ? 'text-slate-400' : 'text-slate-500')}>
        {label}
      </span>
      <span
        className={clsx(
          'tabular-nums whitespace-nowrap',
          muted ? 'text-slate-500' : 'text-slate-900',
          strong && 'font-semibold',
          primary && 'text-primary-700',
        )}
      >
        {formatEUR(value)}
      </span>
    </span>
  );
}

function KundenPreview({
  groups,
  positions,
  params,
  totals,
  projectMeta,
  viewToggle,
}: {
  groups: Group[];
  positions: Position[];
  params: CalcParams;
  totals: ReturnType<typeof calcTotals>;
  projectMeta?: Props['projectMeta'];
  viewToggle: React.ReactNode;
}) {
  const visibleIds = useMemo(
    () =>
      new Set(
        positions
          .filter(
            (p) =>
              !p.isHeader &&
              p.visibleToCustomer &&
              !INTERNAL_POSITION_TYPES.has(p.positionType ?? 'standard'),
          )
          .map((p) => p.id),
      ),
    [positions],
  );

  const visibleGroups = useMemo(() => {
    const out: Group[] = [];
    for (const g of groups) {
      if (g.kind === 'orphan') {
        if (visibleIds.has(g.row.id)) out.push(g);
        continue;
      }
      const rows = g.rows.filter((r) => visibleIds.has(r.id));
      if (rows.length === 0) continue;
      const subtotal = rows.reduce(
        (s, p) => s + calculatePosition(p, params).gp,
        0,
      );
      out.push({
        kind: 'group',
        id: g.id,
        header: g.header,
        rows,
        subtotal,
        visibleSubtotal: subtotal,
        visibleRowCount: rows.length,
      });
    }
    return out;
  }, [groups, params, visibleIds]);

  const kundenTotals = useMemo(
    () => calcTotals(positions, params, visibleIds),
    [positions, params, visibleIds],
  );

  return (
    <div
      className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden"
      data-testid="v2-kunden-preview"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-emerald-50/40">
        {viewToggle}
        <div className="text-xs text-emerald-800 font-medium">
          Vorschau — exakt das, was der Kunde sieht.{' '}
          <span className="text-emerald-700/70">Keine Margen, kein Lohn, keine Zuschläge.</span>
        </div>
      </div>

      {projectMeta && (
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Meta label="AG" value={projectMeta.client || '—'} />
            <Meta label="Leistung" value={projectMeta.service || projectMeta.name || '—'} />
            <Meta label="BV / Projekt" value={projectMeta.name || '—'} />
            <Meta label="Bieter" value={projectMeta.bidder || '—'} />
            {projectMeta.tenderNumber && (
              <Meta label="Vergabe-Nr." value={projectMeta.tenderNumber} />
            )}
            {projectMeta.deadline && <Meta label="Abgabe" value={projectMeta.deadline} />}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none bg-white">
              <th className="sticky top-0 px-3 py-2.5 text-left font-semibold border-b border-slate-200 w-[120px]">OZ</th>
              <th className="sticky top-0 px-3 py-2.5 text-left font-semibold border-b border-slate-200">Bezeichnung</th>
              <th className="sticky top-0 px-3 py-2.5 text-right font-semibold border-b border-slate-200 w-[100px]">Menge</th>
              <th className="sticky top-0 px-3 py-2.5 text-left font-semibold border-b border-slate-200 w-[60px]">EH</th>
              <th className="sticky top-0 px-3 py-2.5 text-right font-semibold border-b border-slate-200 w-[120px]">EP €/EH</th>
              <th className="sticky top-0 px-3 py-2.5 text-right font-semibold border-b border-slate-200 w-[140px]">GP €</th>
            </tr>
          </thead>
          <tbody>
            {visibleGroups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-400 border-t border-slate-100">
                  Keine Positionen sind aktuell für den Kunden sichtbar.{' '}
                  <span className="text-slate-500">
                    Wechseln Sie zur INTERN-Ansicht und aktivieren Sie das Auge-Symbol an jeder Zeile, die geteilt werden soll.
                  </span>
                </td>
              </tr>
            )}
            {visibleGroups.map((g) =>
              g.kind === 'group' ? (
                <KundenGroupRows key={g.id} group={g} params={params} />
              ) : (
                <KundenPositionRow key={g.row.id} position={g.row} params={params} />
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl ml-auto text-sm">
          <Row label="Netto Angebotssumme" value={kundenTotals.visibleNetto} />
          <Row label="MwSt 19 %" value={kundenTotals.visibleMwst} muted />
          <Row label="Brutto Angebotssumme" value={kundenTotals.visibleBrutto} strong />
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40 text-[11px] text-slate-500 flex items-center gap-1.5">
        <AlertCircle className="w-3 h-3 text-slate-400" />
        Sicherheits-Check: {visibleIds.size} von {totals.totalNetto > 0 ? positions.filter((p) => !p.isHeader).length : 0} Zeilen sichtbar.
        Alle internen Spalten (Material EK · Zeit · NU · Lohn · Zuschlag · Typ) bleiben verborgen.
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-slate-900 truncate" title={value}>{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: number;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={clsx('text-slate-600', strong && 'font-semibold text-slate-900')}>{label}</span>
      <span
        className={clsx(
          'tabular-nums whitespace-nowrap',
          muted ? 'text-slate-500' : 'text-slate-900',
          strong && 'font-bold text-lg',
        )}
      >
        {formatEUR(value)}
      </span>
    </div>
  );
}

function KundenGroupRows({
  group,
  params,
}: {
  group: Extract<Group, { kind: 'group' }>;
  params: CalcParams;
}) {
  return (
    <>
      <tr>
        <td colSpan={5} className="px-3 py-2 border-t border-slate-200 bg-slate-50 font-semibold text-slate-800 text-sm">
          {group.header.shortText || '—'}
        </td>
        <td className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-right tabular-nums font-semibold text-slate-800">
          {formatEUR(group.subtotal)}
        </td>
      </tr>
      {group.rows.map((p) => (
        <KundenPositionRow key={p.id} position={p} params={params} />
      ))}
    </>
  );
}

function KundenPositionRow({ position: p, params }: { position: Position; params: CalcParams }) {
  const calc = useMemo(() => calculatePosition(p, params), [p, params]);
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-3 py-2 border-t border-slate-100 font-mono text-[12px] text-slate-700 align-top whitespace-nowrap">
        {p.oz || '—'}
      </td>
      <td className="px-3 py-[10px] border-t border-slate-100 align-top text-slate-900">
        {/* PART N: full Bezeichnung visible — no clipping, no ellipsis. */}
        <div
          data-testid={`kunden-bezeichnung-${p.id}`}
          className="whitespace-pre-wrap break-words leading-[1.45]"
        >
          {p.shortText || '—'}
        </div>
        {p.longText && (
          <div className="mt-1 text-xs text-slate-500 whitespace-pre-wrap break-words leading-[1.45]">
            {p.longText}
          </div>
        )}
      </td>
      <td className="px-3 py-2 border-t border-slate-100 text-right tabular-nums text-slate-700 align-top">
        {formatNum(p.quantity, p.quantity % 1 === 0 ? 0 : 2)}
      </td>
      <td className="px-3 py-2 border-t border-slate-100 text-xs text-slate-500 align-top">
        {p.unit || '—'}
      </td>
      <td className="px-3 py-2 border-t border-slate-100 text-right tabular-nums text-slate-700 align-top">
        {formatNum(calc.ep, 2)}
      </td>
      <td className="px-3 py-2 border-t border-slate-100 text-right tabular-nums font-semibold text-slate-900 align-top">
        {formatEUR(calc.gp)}
      </td>
    </tr>
  );
}

function parseDeNumber(s: string): number {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const cleaned = String(s).replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** 2-decimal rounding for bulk %-Adjustments. Mirrors the precision the
 *  Excel template carries for EK columns. */
function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

// ────────────────────────────────────────────────────────────────────────────
// Round 12 Feature 1 — SelectAllCheckbox + BulkActionBar
// ────────────────────────────────────────────────────────────────────────────

function SelectAllCheckbox({
  total,
  selected,
  onSelectAll,
  onClearAll,
}: {
  total: number;
  selected: number;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  // Wire the indeterminate state on the underlying DOM node — React doesn't
  // expose it as a controlled prop. Effect runs after every render so the
  // box always reflects (selected/total).
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = selected > 0 && selected < total;
    }
  }, [selected, total]);
  const allChecked = total > 0 && selected === total;
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allChecked}
      data-testid="v2-select-all"
      aria-label={
        allChecked
          ? 'Alle Positionen abwählen'
          : selected > 0
            ? `${selected} von ${total} markiert — alle markieren`
            : 'Alle Positionen markieren'
      }
      disabled={total === 0}
      onChange={() => {
        if (allChecked || selected > 0) {
          onClearAll();
        } else {
          onSelectAll();
        }
      }}
      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
    />
  );
}

type BulkPercentMode = null | 'material' | 'time' | 'nu';

function BulkActionBar({
  count,
  onAdjustMaterialPct,
  onAdjustTimePct,
  onAdjustNuPct,
  onMarkAs,
  onDeleteSelected,
  onClear,
}: {
  count: number;
  onAdjustMaterialPct: (pct: number) => void;
  onAdjustTimePct: (pct: number) => void;
  onAdjustNuPct: (pct: number) => void;
  onMarkAs: (t: PositionType) => void;
  onDeleteSelected: () => void;
  onClear: () => void;
}) {
  const [pctMode, setPctMode] = useState<BulkPercentMode>(null);
  const [pctSign, setPctSign] = useState<1 | -1>(1);
  const [pctInput, setPctInput] = useState('');
  const [markOpen, setMarkOpen] = useState(false);

  function commitPct() {
    if (!pctMode) return;
    const raw = parseDeNumber(pctInput);
    if (raw <= 0 || !Number.isFinite(raw)) {
      setPctMode(null);
      setPctInput('');
      return;
    }
    const pct = raw * pctSign;
    if (pctMode === 'material') onAdjustMaterialPct(pct);
    else if (pctMode === 'time') onAdjustTimePct(pct);
    else if (pctMode === 'nu') onAdjustNuPct(pct);
    setPctMode(null);
    setPctInput('');
  }

  function openPct(mode: Exclude<BulkPercentMode, null>, sign: 1 | -1) {
    setPctMode(mode);
    setPctSign(sign);
    setPctInput('');
    setMarkOpen(false);
  }

  return (
    <div
      role="region"
      aria-label="Bulk-Bearbeitung"
      data-testid="v2-bulk-bar"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,1100px)] bg-slate-900 text-white shadow-2xl rounded-2xl border border-slate-700"
    >
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2 mr-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-xs font-semibold tabular-nums">
            {count}
          </span>
          <span className="text-sm font-medium">
            {count === 1 ? 'Position markiert' : 'Positionen markiert'}
          </span>
        </div>

        <div className="h-5 w-px bg-slate-700 mx-1" aria-hidden />

        {/* ±% adjusters — open the inline input for a chosen cost type. */}
        <BulkPctTrigger
          label="Material-EK +%"
          testId="v2-bulk-material-plus"
          onClick={() => openPct('material', 1)}
        />
        <BulkPctTrigger
          label="Material-EK –%"
          testId="v2-bulk-material-minus"
          onClick={() => openPct('material', -1)}
        />
        <BulkPctTrigger
          label="Min/Einheit +%"
          testId="v2-bulk-time-plus"
          onClick={() => openPct('time', 1)}
        />
        <BulkPctTrigger
          label="Min/Einheit –%"
          testId="v2-bulk-time-minus"
          onClick={() => openPct('time', -1)}
        />
        <BulkPctTrigger
          label="NU-EK +%"
          testId="v2-bulk-nu-plus"
          onClick={() => openPct('nu', 1)}
        />

        <div className="h-5 w-px bg-slate-700 mx-1" aria-hidden />

        <div className="relative">
          <button
            type="button"
            data-testid="v2-bulk-mark-toggle"
            onClick={() => {
              setMarkOpen((s) => !s);
              setPctMode(null);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium border border-slate-700"
          >
            Markieren als…
            <ChevronDown className="w-3 h-3" />
          </button>
          {markOpen && (
            <div
              role="menu"
              data-testid="v2-bulk-mark-menu"
              className="absolute bottom-full mb-1 left-0 w-[160px] bg-white text-slate-800 rounded-lg shadow-lg border border-slate-200 py-1"
            >
              {POSITION_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="menuitem"
                  data-testid={`v2-bulk-mark-${t}`}
                  onClick={() => {
                    onMarkAs(t);
                    setMarkOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {POSITION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            data-testid="v2-bulk-delete"
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-xs font-medium"
          >
            <Trash2 className="w-3 h-3" />
            Auswahl löschen
          </button>
          <button
            type="button"
            data-testid="v2-bulk-cancel"
            onClick={onClear}
            aria-label="Auswahl aufheben"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs"
          >
            <X className="w-3.5 h-3.5" />
            Abbrechen
          </button>
        </div>
      </div>

      {pctMode && (
        <div
          className="flex items-center gap-2 px-4 pb-3 pt-1 border-t border-slate-700"
          data-testid="v2-bulk-pct-input-row"
        >
          <span className="text-xs text-slate-300">
            {pctMode === 'material' && 'Material-EK'}
            {pctMode === 'time' && 'Min/Einheit'}
            {pctMode === 'nu' && 'NU-EK'}
            {' '}
            {pctSign === 1 ? '+' : '–'} %:
          </span>
          <input
            type="text"
            inputMode="decimal"
            data-testid="v2-bulk-pct-input"
            autoFocus
            value={pctInput}
            onChange={(e) => setPctInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPct();
              else if (e.key === 'Escape') {
                setPctMode(null);
                setPctInput('');
              }
            }}
            placeholder="z.B. 5"
            className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-400"
          />
          <button
            type="button"
            data-testid="v2-bulk-pct-commit"
            onClick={commitPct}
            className="px-3 py-1 rounded bg-primary-600 hover:bg-primary-500 text-xs font-semibold"
          >
            Anwenden
          </button>
          <button
            type="button"
            data-testid="v2-bulk-pct-cancel"
            onClick={() => {
              setPctMode(null);
              setPctInput('');
            }}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs"
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}

function BulkPctTrigger({
  label,
  testId,
  onClick,
}: {
  label: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium border border-slate-700"
    >
      {label}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Round 12 Feature 2 — PlausibilityChips component
// ────────────────────────────────────────────────────────────────────────────

function PlausibilityChips({
  position,
  chip,
}: {
  position: Position;
  chip: PlausibilityChip;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chip.missingPrice && (
        <span
          data-testid={`v2-chip-missing-${position.id}`}
          data-chip-rule="missing-price"
          title="Material-EK, Zeit und NU sind alle 0 — Position hat keinen Preis. Vor Abgabe ausfüllen!"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-semibold border border-red-200"
        >
          <AlertCircle className="w-2.5 h-2.5" />
          EP fehlt
        </span>
      )}
      {chip.outlier && (
        <span
          data-testid={`v2-chip-outlier-${position.id}`}
          data-chip-rule="outlier"
          title={`Median vergleichbarer Positionen: ${formatNum(chip.outlier.median, 2)} €. Diese Position: ${formatNum(chip.outlier.actual, 2)} €. Abweichung: ${chip.outlier.deviationPct > 0 ? '+' : ''}${formatNum(chip.outlier.deviationPct, 1)} %.`}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200"
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          Ungewöhnlich
        </span>
      )}
    </div>
  );
}
