/* Feature #2 — Preisspiegel (Subunternehmer-Angebote nebeneinander).
 *
 * Manual data-entry matrix: rows = project positions, columns = NU/Lieferant
 * quotes. Min/max highlighting per row. "Übernehmen" applies a single
 * quote's material/NU price to the corresponding project position.
 *
 * Storage: piggybacks on project_data.nuQuotes (no schema migration, no new
 * endpoint — uses api.projects.update). The share-link-to-NU flow described
 * in the roadmap will reuse this data model; for the MVP we ship the matrix.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Save,
  Trash2,
  Check,
  Scale,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { nanoid } from 'nanoid';
import { api, ApiError, VersionConflictError } from '@/lib/api';
import { Breadcrumb } from '@/pages/panel/ui';
import { formatEUR, formatNum, recalcAll } from './calc';
import type {
  NuQuote,
  NuQuoteSource,
  Position,
  ProjectData,
  ProjectDetail as ProjectDetailType,
} from './types';

export default function ProjectPreisspiegel() {
  const { id = '' } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [sources, setSources] = useState<NuQuoteSource[]>([]);
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
        setSources(detail.data.nuQuotes || []);
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

  const addSource = useCallback(() => {
    setSources((prev) => [
      ...prev,
      {
        id: nanoid(8),
        name: `Anbieter ${prev.length + 1}`,
        quotes: {},
        receivedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
  }, []);

  const renameSource = useCallback((sid: string, name: string) => {
    setSources((prev) => prev.map((s) => (s.id === sid ? { ...s, name } : s)));
  }, []);

  const removeSource = useCallback((sid: string) => {
    if (!window.confirm('Diesen Anbieter und alle Preise entfernen?')) return;
    setSources((prev) => prev.filter((s) => s.id !== sid));
  }, []);

  const updateQuote = useCallback((sid: string, posId: string, patch: Partial<NuQuote>) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== sid) return s;
        const existing = s.quotes[posId] || {};
        const merged: NuQuote = { ...existing, ...patch };
        // Drop empty entries.
        if (merged.materialCost == null && merged.nuCost == null && !merged.note) {
          const { [posId]: _drop, ...rest } = s.quotes;
          void _drop;
          return { ...s, quotes: rest };
        }
        return { ...s, quotes: { ...s.quotes, [posId]: merged } };
      }),
    );
  }, []);

  const applyQuoteToPosition = useCallback(
    (sourceId: string, position: Position) => {
      if (!data) return;
      const src = sources.find((s) => s.id === sourceId);
      if (!src) return;
      const q = src.quotes[position.id];
      if (!q) return;
      const patched = data.positions.map((p) =>
        p.id === position.id
          ? {
              ...p,
              materialCost: q.materialCost != null ? q.materialCost : p.materialCost,
              nuCost: q.nuCost != null ? q.nuCost : p.nuCost,
            }
          : p,
      );
      setData({ ...data, positions: recalcAll(patched, data.calcParams) });
      toast.success(`Preis von "${src.name}" auf ${position.oz || position.shortText} übernommen.`);
    },
    [data, sources],
  );

  const save = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      const updated = await api.projects.update(
        id,
        { ...data, nuQuotes: sources },
        { expectedUpdatedAt: updatedAtRef.current || undefined },
      );
      updatedAtRef.current = new Date(updated.updatedAt).getTime();
      setProject((p) => (p ? { ...p, ...updated } : p));
      toast.success('Preisspiegel gespeichert.');
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
  }, [data, sources, id]);

  // Aggregate per-source totals.
  const sourceTotals = useMemo(() => {
    if (!data) return {};
    const t: Record<string, { total: number; coverage: number }> = {};
    const items = data.positions.filter((p) => !p.isHeader);
    for (const s of sources) {
      let total = 0;
      let covered = 0;
      for (const p of items) {
        const q = s.quotes[p.id];
        if (!q) continue;
        const mat = q.materialCost != null ? q.materialCost : p.materialCost;
        const nu = q.nuCost != null ? q.nuCost : p.nuCost;
        total += (mat + nu) * p.quantity;
        covered += 1;
      }
      t[s.id] = { total, coverage: items.length > 0 ? covered / items.length : 0 };
    }
    return t;
  }, [data, sources]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }
  if (error || !data || !project) {
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

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Preisspiegel — {data.name || 'Projekt'} – KALKU Panel</title>
      </Helmet>

      <Breadcrumb
        items={[
          { label: 'Panel', to: '/panel' },
          { label: 'Kalkulation', to: '/panel/kalkulation' },
          { label: data.name || 'Projekt', to: `/panel/kalkulation/${id}` },
          { label: 'Preisspiegel' },
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
              Preisspiegel — NU/Lieferant-Vergleich
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {data.name || 'Projekt'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addSource}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary-300"
          >
            <Plus className="w-4 h-4" />
            Anbieter
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Scale className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Noch keine NU/Lieferant-Angebote.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
            Klicken Sie „Anbieter" um eine Spalte hinzuzufügen, dann tragen Sie pro Position
            das NU-Angebot ein. Min/Max werden automatisch hervorgehoben; mit „Übernehmen"
            wandert ein Preis in die Kalkulation.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold w-20">OZ</th>
                  <th className="px-3 py-2.5 text-left font-semibold min-w-[14rem]">Position</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-20">Menge</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-28">
                    EK netto
                    <br />
                    <span className="font-normal opacity-70">Mat + NU €/EH</span>
                  </th>
                  {sources.map((s) => (
                    <th key={s.id} className="px-2 py-2 text-left font-semibold min-w-[12rem] border-l border-slate-200 dark:border-slate-700">
                      <SourceHeader
                        source={s}
                        total={sourceTotals[s.id]?.total ?? 0}
                        coverage={sourceTotals[s.id]?.coverage ?? 0}
                        onRename={(n) => renameSource(s.id, n)}
                        onRemove={() => removeSource(s.id)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4 + sources.length} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                      Keine Positionen.
                    </td>
                  </tr>
                )}
                {rows.map((p) => (
                  <QuoteRow
                    key={p.id}
                    position={p}
                    sources={sources}
                    onChange={updateQuote}
                    onApply={applyQuoteToPosition}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tipp: Mehrere Anbieter pro Gewerk vergleichen, die niedrigsten Preise pro Position
        per „Übernehmen" in die Kalkulation übertragen. Die Werte werden in <code>project_data</code>
        gespeichert — Sie können später jederzeit eine andere Wahl treffen.
      </p>
    </div>
  );
}

/* ─── Source column header ────────────────────────────────────────────── */

function SourceHeader({
  source,
  total,
  coverage,
  onRename,
  onRemove,
}: {
  source: NuQuoteSource;
  total: number;
  coverage: number;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <input
          value={source.name}
          onChange={(e) => onRename(e.target.value)}
          className="flex-1 min-w-0 px-1.5 py-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-transparent border border-transparent rounded hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary-300 focus:outline-none"
        />
        <button
          onClick={onRemove}
          aria-label="Anbieter entfernen"
          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
        Σ {formatEUR(total)} · {Math.round(coverage * 100)} % erfasst
      </div>
    </div>
  );
}

/* ─── Per-position row ───────────────────────────────────────────────── */

function QuoteRow({
  position,
  sources,
  onChange,
  onApply,
}: {
  position: Position;
  sources: NuQuoteSource[];
  onChange: (sourceId: string, posId: string, patch: Partial<NuQuote>) => void;
  onApply: (sourceId: string, position: Position) => void;
}) {
  // Calculate min/max across this row (Mat + NU sum, falling back to project value).
  const rowTotals = sources.map((s) => {
    const q = s.quotes[position.id];
    if (!q) return null;
    const mat = q.materialCost != null ? q.materialCost : position.materialCost;
    const nu = q.nuCost != null ? q.nuCost : position.nuCost;
    return mat + nu;
  });
  const presentTotals = rowTotals.filter((v): v is number => v != null);
  const min = presentTotals.length ? Math.min(...presentTotals) : null;
  const max = presentTotals.length ? Math.max(...presentTotals) : null;

  return (
    <tr>
      <td className="px-3 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300 align-top">
        {position.oz || '—'}
      </td>
      <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200 align-top truncate max-w-[16rem]">
        {position.shortText || '—'}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400 align-top">
        {formatNum(position.quantity, position.quantity % 1 === 0 ? 0 : 2)} {position.unit}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300 align-top">
        {formatEUR(position.materialCost + position.nuCost)}
      </td>
      {sources.map((s, i) => {
        const total = rowTotals[i];
        // Highlight Min only when there's a real spread. With only one source,
        // or when all sources quote the same price, no green badge.
        const hasSpread = min != null && max != null && max > min;
        const isMin = total != null && total === min && hasSpread;
        const isMax = total != null && total === max && hasSpread;
        return (
          <td
            key={s.id}
            className={clsx(
              'px-2 py-1 border-l border-slate-100 dark:border-slate-800 align-top',
              isMin && 'bg-emerald-50/50 dark:bg-emerald-950/15',
              isMax && 'bg-rose-50/40 dark:bg-rose-950/10',
            )}
          >
            <QuoteCell
              quote={s.quotes[position.id]}
              isMin={isMin}
              onChange={(patch) => onChange(s.id, position.id, patch)}
              onApply={() => onApply(s.id, position)}
            />
          </td>
        );
      })}
    </tr>
  );
}

function QuoteCell({
  quote,
  isMin,
  onChange,
  onApply,
}: {
  quote: NuQuote | undefined;
  isMin: boolean;
  onChange: (patch: Partial<NuQuote>) => void;
  onApply: () => void;
}) {
  const filled = quote && (quote.materialCost != null || quote.nuCost != null);
  return (
    <div className="flex items-center gap-1.5">
      <div className="grid grid-cols-2 gap-1 flex-1 min-w-0">
        <NumCell
          value={quote?.materialCost}
          onChange={(v) => onChange({ materialCost: v })}
          label="Mat"
        />
        <NumCell
          value={quote?.nuCost}
          onChange={(v) => onChange({ nuCost: v })}
          label="NU"
        />
      </div>
      {filled && (
        <button
          onClick={onApply}
          title="In Kalkulation übernehmen"
          aria-label="In Kalkulation übernehmen"
          className={clsx(
            'flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors',
            isMin
              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-700 hover:border-primary-300 dark:text-slate-400 dark:hover:text-primary-200 dark:hover:border-primary-500/40',
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function NumCell({
  value,
  onChange,
  label,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  label: string;
}) {
  const display = value != null ? formatNum(value, value % 1 === 0 ? 0 : 2) : '';
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      value={draft != null ? draft : display}
      placeholder={label}
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
        const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(n)) onChange(n);
        else onChange(undefined);
      }}
      className="w-full px-1.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 text-right tabular-nums placeholder:text-slate-300 dark:placeholder:text-slate-600"
      title={label}
    />
  );
}
