import {
  memo,
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
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
  Layers,
  Users,
  MessageCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
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
import CalcPopover from './CalcPopover';
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
    (id: string) => onChange(positions.filter((p) => p.id !== id)),
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
              <ColHead className="w-[80px] bg-slate-100/70" align="right" intern>Material</ColHead>
              <ColHead className="w-[80px] bg-slate-100/70" align="right" intern>Zeit min</ColHead>
              <ColHead className="w-[80px] bg-slate-100/70" align="right" intern>NU €</ColHead>
              <ColHead className="w-[110px] bg-slate-100/70" intern>Typ</ColHead>
              <ColHead className="w-[44px] bg-slate-100/70" intern>{''}</ColHead>
              <ColHead className="w-[44px] bg-slate-100/70" intern>{''}</ColHead>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={14} className="px-6 py-16 text-center text-slate-400 border-t border-slate-100">
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
                />
              ),
            )}
          </tbody>
        </table>
      </div>

      <StickyTotals totals={totals} positionCount={positions.filter((p) => !p.isHeader).length} />
    </div>
    </div>
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
  /** Faktoren-Bibliothek surfaced in the per-cell CalcPopover. */
  faktoren?: FaktorEntry[];
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
}: GroupRowsProps) {
  return (
    <>
      <tr className="group/hdr" data-testid={`v2-group-${group.id}`}>
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
        <td colSpan={6} className="bg-primary-100/40 border-t border-slate-200 px-2 py-1.5">
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
  /** Faktoren-Bibliothek surfaced in the per-cell CalcPopover for the
   *  three editable cost cells in this row. */
  faktoren?: FaktorEntry[];
};

function PositionRow({
  position: p,
  params,
  // updateRow stays unused — Pos/Bezeichnung/Menge/Einheit are PART O
  // locked (LV is read-only, edit the Excel and re-import to change).
  // updateNumber IS used for the per-position cost inputs (Material EK,
  // Min/Einheit, NU EK) — calculators enter these after a GAEB import.
  // PART O's "EK per cost type" lock refers to the row-aggregated totals
  // in the Zuschlag matrix strip, not these per-row inputs.
  updateRow: _updateRow,
  updateNumber,
  removeRow,
  toggleVisibility,
  setPositionType,
  toggleLongText,
  isLongExpanded,
  commentCount,
  onOpenComments,
  isDuplicateOz,
  faktoren,
}: PositionRowProps) {
  const calc = useMemo(() => calculatePosition(p, params), [p, params]);
  const pt = (p.positionType ?? 'standard') as PositionType;
  const internal = INTERNAL_POSITION_TYPES.has(pt);
  const hasLong = (p.longText ?? '').trim().length > 0;
  const accent = TYPE_ACCENT[pt];

  return (
    <>
      <tr
        data-testid={`v2-row-${p.id}`}
        className={clsx(
          'group hover:bg-amber-50/40 transition-colors',
          accent,
          !p.visibleToCustomer && !internal && 'opacity-70',
        )}
      >
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
            Bezeichnung doesn't push the OZ off the row. */}
        <td className="bg-white border-t border-slate-100 px-2 py-[10px] align-top">
          <div
            data-readonly="oz"
            className="w-full font-mono text-[12px] text-slate-700 px-1 py-1 whitespace-pre"
            title={p.oz}
          >
            {p.oz || '—'}
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

        <td className="bg-white border-t border-slate-100 px-2 py-[10px] align-top text-right tabular-nums text-slate-700">
          {formatNum(calc.ep, 2)}
        </td>

        <td className="bg-white border-t border-slate-100 px-2 py-[10px] align-top text-right tabular-nums font-semibold text-slate-900">
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
        <NumCellEditable
          value={p.materialCost}
          onChange={(v) => updateNumber(p.id, 'materialCost', v)}
          calcContext={{ label: 'Material EK', faktoren, menge: p.quantity }}
          onCalcApply={(v) => updateNumber(p.id, 'materialCost', String(v))}
        />
        <NumCellEditable
          value={p.timeMinutes}
          onChange={(v) => updateNumber(p.id, 'timeMinutes', v)}
          calcContext={{ label: 'Min/Einheit', faktoren, menge: p.quantity }}
          onCalcApply={(v) => updateNumber(p.id, 'timeMinutes', String(v))}
        />
        <NumCellEditable
          value={p.nuCost}
          onChange={(v) => updateNumber(p.id, 'nuCost', v)}
          calcContext={{ label: 'NU EK', faktoren, menge: p.quantity }}
          onCalcApply={(v) => updateNumber(p.id, 'nuCost', String(v))}
        />

        <td className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top">
          <PositionTypeSelect
            value={pt}
            onChange={(t) => setPositionType(p.id, t)}
          />
        </td>

        <td className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top">
          {hasLong && (
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded text-slate-400"
              title={`${(p.longText ?? '').length} Zeichen Langtext`}
            >
              <FileText className="w-3 h-3" />
            </span>
          )}
        </td>

        <td className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top">
          <button
            onClick={() => removeRow(p.id)}
            className="p-1 rounded text-slate-300 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Zeile löschen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>

      {isLongExpanded && hasLong && (
        <tr>
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
          <td colSpan={6} className="bg-slate-50/40 border-t border-slate-100" />
        </tr>
      )}
    </>
  );
}

/**
 * NumCellEditable — per-position cost INPUT cell (Material EK, Min/Einheit,
 * NU EK in the internal zone of INTERN view). The calculator NEEDS to edit
 * these after a GAEB import — they're the heart of the workflow.
 *
 * Local draft state during focus so decimal entry works ("1,2" doesn't
 * round-trip to "1" mid-typing). Top-aligned via the <td>'s `align-top` +
 * `py-[10px]` (PART N: a multi-line Bezeichnung in the same row doesn't
 * push these off-row).
 *
 * NOT used for customer-zone cells (Pos / Bezeichnung / Menge / Einheit /
 * EP / GP) — those are PART O read-only divs. Also NOT used for the
 * Zuschlag matrix row-totals (J4-J7), which are PART O locked too and
 * displayed read-only in <ZuschlagMatrixStrip>.
 */
const NumCellEditable = memo(function NumCellEditable({
  value,
  onChange,
  calcContext,
  onCalcApply,
}: {
  value: number;
  onChange: (raw: string) => void;
  /** Optional scratch-calculator context — when set, a Σ trigger renders
   *  next to the input. */
  calcContext?: { label: string; faktoren?: FaktorEntry[]; menge: number };
  onCalcApply?: (value: number) => void;
}) {
  const d = value % 1 === 0 ? 0 : 2;
  const formatted = value === 0 ? '' : formatNum(value, d);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <td className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top">
      <div className="flex items-center gap-1">
        <input
          value={editing ? draft : formatted}
          placeholder="0"
          inputMode="decimal"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          onFocus={(e) => {
            setEditing(true);
            setDraft(formatted);
            e.target.select();
          }}
          onBlur={(e) => {
            const final = e.currentTarget.value;
            if (final !== formatted) onChange(final);
            setEditing(false);
            setDraft('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (e.key === 'Escape') {
              setEditing(false);
              setDraft('');
              e.currentTarget.blur();
            }
          }}
          className={clsx(
            'flex-1 min-w-0 px-1.5 py-1 rounded text-right tabular-nums outline-none transition-colors',
            'placeholder:text-slate-300 cursor-text border border-transparent',
            value === 0
              ? 'text-slate-500 hover:border-slate-300 hover:bg-white'
              : 'text-slate-900',
            'focus:bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-200',
          )}
        />
        {calcContext && onCalcApply && (
          <CalcPopover
            initialValue={value}
            label={calcContext.label}
            faktoren={calcContext.faktoren}
            contextMenge={calcContext.menge}
            onApply={onCalcApply}
          />
        )}
      </div>
    </td>
  );
});

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
