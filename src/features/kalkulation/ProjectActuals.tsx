/* Feature #5 — Nachkalkulation Lite.
 *
 * Once a project is gewonnen, the owner records actual hours + material + NU
 * cost per position. We compute Soll vs Ist per position, totals, and per-
 * Gewerk Marge-Trend on top of the existing project_data JSON — no new table,
 * no new backend route (uses api.projects.update with the existing data blob).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Save,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { api, ApiError, VersionConflictError } from '@/lib/api';
import { Breadcrumb } from '@/pages/panel/ui';
import { calcTotals, calculatePosition, formatEUR, formatNum, recalcAll } from './calc';
import type {
  PositionActual,
  Position,
  ProjectData,
  ProjectDetail as ProjectDetailType,
} from './types';

export default function ProjectActuals() {
  const { id = '' } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [actuals, setActuals] = useState<Record<string, PositionActual>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const updatedAtRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const detail = await api.projects.get(id);
        if (!alive) return;
        setProject(detail);
        const recalced = recalcAll(detail.data.positions, detail.data.calcParams);
        setData({ ...detail.data, positions: recalced });
        setActuals({ ...(detail.data.actuals || {}) });
        updatedAtRef.current = new Date(detail.updatedAt).getTime();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setError('Projekt nicht gefunden.');
        else setError('Projekt konnte nicht geladen werden.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const updateActual = useCallback((posId: string, patch: Partial<PositionActual>) => {
    setActuals((prev) => {
      const existing = prev[posId] || {};
      const next: PositionActual = { ...existing, ...patch, recordedAt: new Date().toISOString() };
      // Strip empty rows so we don't bloat the JSON.
      const allEmpty =
        next.hours == null &&
        next.materialCost == null &&
        next.nuCost == null &&
        (!next.note || next.note.trim() === '');
      if (allEmpty) {
        const { [posId]: _drop, ...rest } = prev;
        void _drop;
        return rest;
      }
      return { ...prev, [posId]: next };
    });
  }, []);

  const save = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      const updated = await api.projects.update(
        id,
        { ...data, actuals },
        { expectedUpdatedAt: updatedAtRef.current || undefined },
      );
      updatedAtRef.current = new Date(updated.updatedAt).getTime();
      setProject((p) => (p ? { ...p, ...updated } : p));
      toast.success('Ist-Werte gespeichert.');
    } catch (err) {
      if (err instanceof VersionConflictError) {
        updatedAtRef.current = err.currentUpdatedAt;
        toast.error('Konflikt — bitte neu laden.');
      } else {
        toast.error('Speichern fehlgeschlagen.');
      }
    } finally {
      setSaving(false);
    }
  }, [data, actuals, id]);

  const summary = useMemo(() => {
    if (!data) return null;
    return computeSummary(data, actuals);
  }, [data, actuals]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }
  if (error || !data || !project || !summary) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-5 h-5 text-red-500 dark:text-rose-400 mx-auto mb-3" />
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{error || 'Projekt nicht gefunden.'}</h2>
        <Link to={`/panel/kalkulation/${id}`} className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-300 hover:underline mt-3 text-sm">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
      </div>
    );
  }

  const rows = data.positions.filter((p) => !p.isHeader);
  // "Erfasst" = the user gave us at least one numeric Ist value. Note-only rows
  // still appear (with no numbers) but don't count toward the captured-rows KPI.
  const filledCount = Object.values(actuals).filter(
    (a) => a != null && (a.hours != null || a.materialCost != null || a.nuCost != null),
  ).length;

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Nachkalk — {data.name || 'Projekt'} – KALKU Panel</title>
      </Helmet>

      <Breadcrumb
        items={[
          { label: 'Panel', to: '/panel' },
          { label: 'Kalkulation', to: '/panel/kalkulation' },
          { label: data.name || 'Projekt', to: `/panel/kalkulation/${id}` },
          { label: 'Nachkalkulation' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/panel/kalkulation/${id}`}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nachkalkulation — Soll vs. Ist
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {data.name || 'Projekt'}
            </h1>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Ist-Werte speichern
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile
          label="Soll-Netto"
          value={formatEUR(summary.sollNetto)}
          sub={`${rows.length} Positionen`}
        />
        <SummaryTile
          label="Ist-Netto (erfasst)"
          value={formatEUR(summary.istNetto)}
          sub={`${filledCount} / ${rows.length} Positionen erfasst`}
        />
        <SummaryTile
          label="Marge-Delta"
          value={`${summary.delta >= 0 ? '+' : ''}${formatEUR(summary.delta)}`}
          tone={summary.delta >= 0 ? 'positive' : 'negative'}
          sub={summary.delta >= 0 ? 'Über Plan' : 'Unter Plan'}
        />
        <SummaryTile
          label="Aufwand Soll → Ist (erfasst)"
          value={`${formatNum(summary.sollHoursCovered, 1)} → ${formatNum(summary.istHours, 1)} h`}
          sub={`Δ ${summary.istHours - summary.sollHoursCovered >= 0 ? '+' : ''}${formatNum(summary.istHours - summary.sollHoursCovered, 1)} h · Soll-Std insgesamt ${formatNum(summary.sollHours, 1)} h`}
        />
      </div>

      {/* Per-position table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">OZ</th>
                <th className="px-3 py-2.5 text-left font-semibold">Position</th>
                <th className="px-3 py-2.5 text-right font-semibold">Soll-GP</th>
                <th className="px-3 py-2.5 text-right font-semibold">Soll-Std</th>
                <th className="px-3 py-2.5 text-right font-semibold w-32">Ist-Std</th>
                <th className="px-3 py-2.5 text-right font-semibold w-36">Ist-Material €</th>
                <th className="px-3 py-2.5 text-right font-semibold w-32">Ist-NU €</th>
                <th className="px-3 py-2.5 text-right font-semibold">Ist-GP</th>
                <th className="px-3 py-2.5 text-right font-semibold">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                    Keine Positionen.
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <ActualRow
                  key={p.id}
                  position={p}
                  actual={actuals[p.id]}
                  params={data.calcParams}
                  onChange={(patch) => updateActual(p.id, patch)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tipp: Erfassen Sie Ist-Werte fortlaufend während der Ausführung. Über mehrere Projekte
        hinweg entsteht eine reale Datengrundlage, wie zuverlässig Ihre Mittellohn- und
        Material-Ansätze pro Gewerk sind.
      </p>
    </div>
  );
}

/* ─── Row ─────────────────────────────────────────────────────────────── */

function ActualRow({
  position,
  actual,
  params,
  onChange,
}: {
  position: Position;
  actual: PositionActual | undefined;
  params: Parameters<typeof calculatePosition>[1];
  onChange: (patch: Partial<PositionActual>) => void;
}) {
  // Soll values from the existing per-position calc.
  const calc = calculatePosition(position, params);
  const sollHours = calc.hoursTotal;
  const sollGp = calc.gp;

  // Ist values from `actual`, falling back to Soll if not yet recorded.
  const istHours = actual?.hours;
  const istMaterial = actual?.materialCost;
  const istNu = actual?.nuCost;

  // Compute Ist-GP from the user-entered numbers when present.
  // Lohn-Ist = istHours × verrechnungslohn (the same conversion as Soll uses).
  const istGp =
    (istHours != null ? istHours * params.verrechnungslohn : calc.gpLohn) +
    (istMaterial != null ? istMaterial : calc.gpMaterial) +
    (istNu != null ? istNu : calc.gpNu) +
    calc.gpGeraet; // Geräte not separately captured

  const delta = istGp - sollGp;
  const dirty = !!actual;
  const filled = istHours != null || istMaterial != null || istNu != null;

  return (
    <tr className={clsx(dirty && 'bg-amber-50/20 dark:bg-amber-950/10')}>
      <td className="px-3 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
        {position.oz || '—'}
      </td>
      <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200 truncate max-w-[16rem]">
        {position.shortText || '—'}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatEUR(sollGp)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{formatNum(sollHours, 1)}</td>
      <td className="px-3 py-1.5">
        <NumInput
          value={istHours}
          onChange={(v) => onChange({ hours: v })}
          placeholder={formatNum(sollHours, 1)}
        />
      </td>
      <td className="px-3 py-1.5">
        <NumInput
          value={istMaterial}
          onChange={(v) => onChange({ materialCost: v })}
          placeholder={formatNum(calc.gpMaterial, 2)}
        />
      </td>
      <td className="px-3 py-1.5">
        <NumInput
          value={istNu}
          onChange={(v) => onChange({ nuCost: v })}
          placeholder={formatNum(calc.gpNu, 2)}
        />
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {filled ? formatEUR(istGp) : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {filled ? (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 font-semibold',
              delta > 0 && 'text-rose-700 dark:text-rose-300',
              delta < 0 && 'text-emerald-700 dark:text-emerald-300',
              delta === 0 && 'text-slate-500',
            )}
            title={delta > 0 ? 'Überzogen' : delta < 0 ? 'Eingespart' : 'Punktlandung'}
          >
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Check className="w-3 h-3" />}
            {delta >= 0 ? '+' : ''}
            {formatEUR(delta)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}

/* ─── Tiny number input that accepts German decimals on blur ─────────── */

function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  const display = value != null ? formatNum(value, value % 1 === 0 ? 0 : 2) : '';
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      value={draft != null ? draft : display}
      placeholder={placeholder}
      inputMode="decimal"
      onFocus={(e) => {
        setDraft(display);
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        const raw = e.currentTarget.value.trim();
        setDraft(null);
        if (raw === '') {
          onChange(undefined);
          return;
        }
        // German number: "." thousand-separator, "," decimal.
        const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(n)) onChange(n);
        else onChange(undefined);
      }}
      className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 text-right tabular-nums placeholder:text-slate-300 dark:placeholder:text-slate-600"
    />
  );
}

/* ─── Summary tile ────────────────────────────────────────────────────── */

function SummaryTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={clsx(
          'mt-2 text-2xl font-bold tabular-nums',
          tone === 'positive' && 'text-emerald-700 dark:text-emerald-300',
          tone === 'negative' && 'text-rose-700 dark:text-rose-300',
          !tone && 'text-slate-900 dark:text-slate-100',
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Summary computation ────────────────────────────────────────────── */

function computeSummary(data: ProjectData, actuals: Record<string, PositionActual>) {
  const totals = calcTotals(data.positions, data.calcParams);
  let istNetto = 0;
  let istHours = 0;          // sum of ACTUAL hours typed in (no Soll fallback)
  let sollHoursCovered = 0;  // sum of Soll-hours for rows the user has at least started
  for (const p of data.positions) {
    if (p.isHeader) continue;
    const calc = calculatePosition(p, data.calcParams);
    const a = actuals[p.id];
    if (!a) {
      istNetto += calc.gp;
      continue;
    }
    const hLohn = a.hours != null ? a.hours * data.calcParams.verrechnungslohn : calc.gpLohn;
    const hMat = a.materialCost != null ? a.materialCost : calc.gpMaterial;
    const hNu = a.nuCost != null ? a.nuCost : calc.gpNu;
    istNetto += hLohn + hMat + hNu + calc.gpGeraet;
    if (a.hours != null) {
      istHours += a.hours;
      sollHoursCovered += calc.hoursTotal;
    }
  }
  return {
    sollNetto: totals.totalNetto,
    sollHours: totals.totalHours,
    istNetto,
    istHours,
    /** Soll-hours that correspond to positions the user has actually entered Ist-Std for. */
    sollHoursCovered,
    delta: istNetto - totals.totalNetto,
  };
}
