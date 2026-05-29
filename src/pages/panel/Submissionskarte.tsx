/**
 * Submissionskarte — cross-company geo-map of every located tender, fed by the
 * panel-api bridge to preisanfrage (`GET /api/panel/submissionskarte`, the
 * not-gated `/combined` upstream endpoint the admin service account can read).
 *
 * The heavy leaflet map lives in SubmissionskarteMap.tsx and is lazy-loaded so
 * its bundle only ships when the user opens the Karte view. This page owns the
 * data fetch, the Gewerk + date filters, the list view and the legend.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Map as MapIcon,
  List as ListIcon,
  Calendar,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Trophy,
  Building2,
} from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError, type Submissionskarte as SubmissionskarteData, type SubmissionskartePin } from '@/lib/api';

const SubmissionskarteMap = lazy(() => import('./SubmissionskarteMap'));

const WINNER_COLOR = '#2563eb';
const UNKNOWN_COLOR = '#64748b';
const PREISLAGE_META: Record<string, { color: string; label: string }> = {
  niedrig: { color: '#10b981', label: 'Niedrig (≤ +3 %)' },
  mittel: { color: '#f59e0b', label: 'Mittel (≤ +10 %)' },
  hoch: { color: '#ef4444', label: 'Hoch (> +10 %)' },
};

function formatEuro(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function pinColor(pin: SubmissionskartePin): string {
  if (pin.ourRank === 1) return WINNER_COLOR;
  if (pin.preislage && PREISLAGE_META[pin.preislage]) return PREISLAGE_META[pin.preislage].color;
  return UNKNOWN_COLOR;
}

export default function Submissionskarte() {
  const [data, setData] = useState<SubmissionskarteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enabledGewerke, setEnabledGewerke] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'karte' | 'liste'>('karte');
  const [flyTarget, setFlyTarget] = useState<{ pin: SubmissionskartePin; key: number } | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.submissionskarte();
      setData(res);
      setEnabledGewerke(new Set(res.gewerke));
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        const body = e.body as { error?: string } | undefined;
        setError(
          body?.error === 'integration_disabled'
            ? 'Die preisanfrage-Integration ist nicht aktiviert.'
            : 'preisanfrage.kalkus.de ist gerade nicht erreichbar.',
        );
      } else {
        setError(`Submissionskarte konnte nicht geladen werden: ${String(e)}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Step 1: date-range filter — shared by both map and list so the time window
  // stays consistent across views. Pins without a submissionDate drop out as
  // soon as either end of the range is set.
  const dateFilteredPins = useMemo(() => {
    if (!data) return [];
    if (!dateFrom && !dateTo) return data.pins;
    return data.pins.filter((p) => {
      if (!p.submissionDate) return false;
      const d = p.submissionDate.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [data, dateFrom, dateTo]);

  // Step 2: Gewerk filter on top (map view only).
  const filteredPins = useMemo(
    () => dateFilteredPins.filter((p) => !p.gewerk || enabledGewerke.has(p.gewerk)),
    [dateFilteredPins, enabledGewerke],
  );

  const dateFilterActive = !!dateFrom || !!dateTo;

  function applyDatePreset(preset: 'all' | '30d' | '90d' | '12m') {
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const today = new Date();
    const past = new Date();
    if (preset === '30d') past.setDate(today.getDate() - 30);
    else if (preset === '90d') past.setDate(today.getDate() - 90);
    else past.setFullYear(today.getFullYear() - 1);
    setDateFrom(past.toISOString().slice(0, 10));
    setDateTo('');
  }

  function toggleGewerk(g: string) {
    setEnabledGewerke((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function showOnMap(pin: SubmissionskartePin) {
    setViewMode('karte');
    setFlyTarget({ pin, key: Date.now() });
  }

  const subtitle = data
    ? `${data.pins.length} Baustellen · ${data.gewerke.length} Gewerke${data.isMock ? ' · Beispieldaten' : ''}`
    : 'Alle Ausschreibungen mit Standort auf einen Blick';

  const viewToggle = (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
      {(
        [
          ['karte', 'Karte', MapIcon],
          ['liste', 'Liste', ListIcon],
        ] as const
      ).map(([mode, label, Icon]) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          aria-pressed={viewMode === mode}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            viewMode === mode
              ? 'bg-primary-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  const dateFilterBar = (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1">
      <Calendar className="w-3.5 h-3.5 text-slate-400" />
      <div className="inline-flex rounded-md bg-slate-50 dark:bg-slate-800 p-0.5">
        {(
          [
            ['all', 'Alle'],
            ['30d', '30 Tage'],
            ['90d', '90 Tage'],
            ['12m', '12 Monate'],
          ] as const
        ).map(([key, label]) => {
          const today = new Date();
          let presetFrom = '';
          if (key === '30d') {
            const d = new Date();
            d.setDate(today.getDate() - 30);
            presetFrom = d.toISOString().slice(0, 10);
          } else if (key === '90d') {
            const d = new Date();
            d.setDate(today.getDate() - 90);
            presetFrom = d.toISOString().slice(0, 10);
          } else if (key === '12m') {
            const d = new Date();
            d.setFullYear(today.getFullYear() - 1);
            presetFrom = d.toISOString().slice(0, 10);
          }
          const isActive = key === 'all' ? !dateFrom && !dateTo : dateFrom === presetFrom && !dateTo;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyDatePreset(key)}
              className={clsx(
                'px-2 py-1 rounded text-[11px] font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Von</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <span>Bis</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {dateFilterActive && (
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            title="Datumsfilter zurücksetzen"
            className="ml-1 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Submissionskarte — KALKU Panel</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary-600 shrink-0" />
            Submissionskarte
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {viewToggle}
          {dateFilterBar}
        </div>
      </header>

      {loading && (
        <div
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-12 justify-center text-sm text-slate-500 dark:text-slate-400"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          Lade Submissionskarte…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => load(true)}
            className="inline-flex items-center gap-1 text-xs font-medium underline hover:no-underline"
          >
            <RefreshCw className={clsx('w-3 h-3', refreshing && 'animate-spin')} />
            Erneut
          </button>
        </div>
      )}

      {data && !loading && !error && data.pins.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-16 text-center">
          <MapPin className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            Noch keine Baustellen auf der Karte
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Sobald Projekte mit Bekanntmachungs-Adresse oder Submissionsergebnis vorliegen, erscheinen
            sie hier.
          </p>
        </div>
      )}

      {data && !loading && !error && data.pins.length > 0 && (
        <>
          {viewMode === 'liste' ? (
            <ListView pins={dateFilteredPins} onShowOnMap={showOnMap} />
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-15rem)] min-h-[480px]">
              {/* Sidebar: Gewerk layers + legend */}
              <aside className="lg:w-64 flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gewerke</h2>
                  <button
                    type="button"
                    onClick={() => load(true)}
                    disabled={refreshing}
                    title="Karte aktualisieren"
                    aria-label="Karte aktualisieren"
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-50"
                  >
                    <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
                  </button>
                </div>

                <div className="p-3 space-y-1 overflow-y-auto flex-1">
                  {data.gewerke.map((g) => {
                    const count = dateFilteredPins.filter((p) => (p.gewerk || 'Sonstige') === g).length;
                    const active = enabledGewerke.has(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGewerk(g)}
                        aria-pressed={active}
                        className={clsx(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className={clsx(
                              'inline-block w-2.5 h-2.5 rounded-full shrink-0',
                              active ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600',
                            )}
                          />
                          <span className="font-medium truncate">{g}</span>
                        </span>
                        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Preislage
                  </div>
                  {[
                    { c: PREISLAGE_META.niedrig.color, l: PREISLAGE_META.niedrig.label },
                    { c: PREISLAGE_META.mittel.color, l: PREISLAGE_META.mittel.label },
                    { c: PREISLAGE_META.hoch.color, l: PREISLAGE_META.hoch.label },
                    { c: WINNER_COLOR, l: 'Platz 1' },
                    { c: UNKNOWN_COLOR, l: 'Nicht ausgewertet' },
                  ].map((row) => (
                    <div key={row.l} className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: row.c }} />
                      <span className="text-slate-600 dark:text-slate-300">{row.l}</span>
                    </div>
                  ))}
                </div>

                {(data.projectsWithoutLocation > 0 || data.projectsWithoutParse > 0) && (
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    {data.projectsWithoutLocation > 0 && (
                      <div>{data.projectsWithoutLocation} Projekt(e) ohne Koordinaten.</div>
                    )}
                    {data.projectsWithoutParse > 0 && (
                      <div>{data.projectsWithoutParse} Projekt(e) ohne Submissionsergebnis.</div>
                    )}
                  </div>
                )}
              </aside>

              {/* Map */}
              <div className="flex-1 min-h-[360px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                <Suspense
                  fallback={
                    <div className="h-full w-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Karte wird geladen…
                    </div>
                  }
                >
                  <SubmissionskarteMap pins={filteredPins} flyTarget={flyTarget} />
                </Suspense>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── List view ──────────────────────────────────────────────────────────── */

function ListView({
  pins,
  onShowOnMap,
}: {
  pins: SubmissionskartePin[];
  onShowOnMap: (pin: SubmissionskartePin) => void;
}) {
  const sorted = useMemo(
    () =>
      [...pins].sort((a, b) => {
        const at = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
        const bt = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
        return bt - at;
      }),
    [pins],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Keine Baustellen im gewählten Zeitraum.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <th className="px-4 py-2.5 font-medium">Baustelle</th>
            <th className="px-3 py-2.5 font-medium">Firma</th>
            <th className="px-3 py-2.5 font-medium">Gewerk</th>
            <th className="px-3 py-2.5 font-medium">Abgabe</th>
            <th className="px-3 py-2.5 font-medium text-center">Bieter</th>
            <th className="px-3 py-2.5 font-medium text-center">Platz</th>
            <th className="px-3 py-2.5 font-medium">Gewinner</th>
            <th className="px-3 py-2.5 font-medium text-right">Gewinner-Summe</th>
            <th className="px-4 py-2.5 font-medium text-right">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const wonIt = p.ourRank === 1;
            return (
              <tr
                key={p.projectId}
                className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-2.5 max-w-[260px]">
                  <div className="font-medium text-slate-800 dark:text-slate-100 truncate" title={p.projectName}>
                    {p.projectName || p.projectNumber}
                  </div>
                  {p.anschriftPlzOrt && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.anschriftPlzOrt}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                  {p.companyName ? (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[140px]" title={p.companyName}>
                        {p.companyName}
                      </span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {p.gewerk ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: pinColor(p) }}
                      />
                      <span className="text-slate-600 dark:text-slate-300">{p.gewerk}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                  {p.submissionDate ? new Date(p.submissionDate).toLocaleDateString('de-DE') : '—'}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums text-slate-600 dark:text-slate-300">
                  {p.teilnehmerCount ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {typeof p.ourRank === 'number' ? (
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium tabular-nums',
                        wonIt
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      )}
                    >
                      {wonIt && <Trophy className="w-3 h-3" />}
                      {p.ourRank}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[160px]">
                  <span className="truncate block" title={p.winnerName || ''}>
                    {p.winnerName || '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {formatEuro(p.winnerNettoSum ?? p.winnerSum)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onShowOnMap(p)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-300 hover:underline whitespace-nowrap"
                  >
                    <MapPin className="w-3 h-3" />
                    Auf Karte
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
