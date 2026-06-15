/**
 * Firmen-Liste — landing page for the multi-Firma layer.
 *
 * Source of truth: preisanfrage.kalkus.de (Bauunternehmer-Ordner aus
 * OneDrive KT01). Live-fetched on every page load via the panel-api proxy
 * (which holds the service-account JWT — never exposed to browser). When the
 * live token isn't configured, the panel falls back to the baked KT01
 * directory (panel-api/src/data/kt01-firmen.ts) so the full company list still
 * shows. See: panel-api/src/routes/firmen.ts, docs/v2_redesign/multi_company_integration_architecture.md
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Building2,
  Search,
  Loader2,
  AlertTriangle,
  Trophy,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Database,
  CalendarDays,
  ShieldCheck,
  Inbox,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { preisanfrageSsoHref } from '@/lib/panelSso';
import { formatEUR } from '@/features/kalkulation/calc';
import { Skeleton } from '@/components/panel/Skeleton';

type FirmaRow = Awaited<ReturnType<typeof api.firmen.list>>['rows'][number];
type FilterId = 'all' | 'managed' | 'external' | 'directory' | 'local' | 'won-recent';

/** Per-trade presentation: label + a tinted chip and a monogram-avatar tint.
 *  Literal class strings (not interpolated) so Tailwind keeps them. Unknown
 *  trades fall back to a neutral slate look. */
const TRADE_META: Record<
  string,
  { label: string; chip: string; avatar: string }
> = {
  elektro: { label: 'Elektro', chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800', avatar: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  galabau: { label: 'GaLaBau', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800', avatar: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  tiefbau: { label: 'Tiefbau', chip: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:ring-orange-800', avatar: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' },
  leitungsbau: { label: 'Leitungsbau', chip: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800', avatar: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  fenster: { label: 'Fenster', chip: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-800', avatar: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200' },
  metallbau: { label: 'Metallbau', chip: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700', avatar: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
  haustechnik: { label: 'Haustechnik', chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:ring-cyan-800', avatar: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' },
  heizung: { label: 'Heizung', chip: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800', avatar: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  sanitaer: { label: 'Sanitär', chip: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800', avatar: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  dach: { label: 'Dachdecker', chip: 'bg-stone-100 text-stone-700 ring-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700', avatar: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200' },
  fassade: { label: 'Fassade', chip: 'bg-stone-50 text-stone-700 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700', avatar: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200' },
  putz: { label: 'Putz/Stuck', chip: 'bg-stone-50 text-stone-700 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700', avatar: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200' },
  maler: { label: 'Maler', chip: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-800', avatar: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' },
  trockenbau: { label: 'Trockenbau', chip: 'bg-stone-50 text-stone-700 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700', avatar: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200' },
  brandschutz: { label: 'Brandschutz', chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800', avatar: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200' },
  schadstoff: { label: 'Schadstoff', chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800', avatar: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200' },
  reinigung: { label: 'Reinigung', chip: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:ring-teal-800', avatar: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200' },
  sonstiges: { label: 'Sonstiges', chip: 'bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700', avatar: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
};

const NEUTRAL_AVATAR =
  'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200';

function tradeMeta(trade: string | null) {
  return (trade && TRADE_META[trade]) || null;
}

/** Curated trade list shown in the Neue-Firma dropdown. */
const TRADE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  'galabau', 'elektro', 'tiefbau', 'leitungsbau', 'fenster', 'haustechnik',
  'heizung', 'sanitaer', 'dach', 'fassade', 'putz', 'maler', 'sonstiges',
].map((v) => ({ value: v, label: TRADE_META[v]?.label ?? v }));

/** Legal-form suffixes dropped when computing a company monogram. */
const LEGAL_FORMS = new Set([
  'gmbh', 'ug', 'gbr', 'ag', 'kg', 'ohg', 'ek', 'e.k.', 'co', 'co.', '&', 'und', 'mbh',
]);

/** Two-letter monogram from a company name (ignores a leading index digit and
 *  legal-form suffixes). "1 Rado Facility…" → "RF", "Gabas GmbH" → "GA". */
function monogram(name: string): string {
  const cleaned = name.replace(/^\s*\d+\s+/, '').trim();
  const words = cleaned
    .split(/[\s.\-_/]+/)
    .filter((w) => w && !LEGAL_FORMS.has(w.toLowerCase()));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const base = words[0] ?? cleaned;
  return base.slice(0, 2).toUpperCase() || '??';
}

export default function Firmen() {
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.firmen.list>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  // Keyboard-nav: index into filteredRows. -1 = no row highlighted.
  const [highlight, setHighlight] = useState<number>(-1);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.firmen.list();
      setData(res);
    } catch (e) {
      if (e instanceof ApiError) {
        const body = e.body as { error?: string; detail?: string } | undefined;
        if (e.status === 503 && body?.error === 'integration_disabled') {
          setError(
            'Die preisanfrage-Anbindung ist auf dem Server noch nicht konfiguriert. ' +
              'Bitte den Service-JWT (env PREISANFRAGE_SERVICE_JWT) hinterlegen.',
          );
        } else if (e.status === 503) {
          setError('preisanfrage.kalkus.de ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.');
        } else {
          setError(`Konnte Firmen nicht laden (${e.status}).`);
        }
      } else {
        setError(`Unbekannter Fehler: ${String(e)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchiveLocal(row: FirmaRow) {
    if (row.kind !== 'local' || typeof row.id !== 'string') return;
    if (!confirm(`Lokale Firma "${row.displayName}" archivieren? Alle zugehörigen lokalen Ausschreibungen werden ebenfalls archiviert.`)) {
      return;
    }
    setArchivingId(row.id);
    try {
      await api.firmen.archiveLocal(row.id);
      toast.success('Firma archiviert.');
      setData((d) =>
        d
          ? {
              ...d,
              rows: d.rows.filter((r) => !(r.kind === 'local' && r.id === row.id)),
              localCount: Math.max(0, d.localCount - 1),
            }
          : d,
      );
    } catch (e) {
      toast.error(`Archivieren fehlgeschlagen: ${String(e)}`);
    } finally {
      setArchivingId(null);
    }
  }

  // Snapshot "now" once at mount so the filter predicate stays pure.
  const [mountedAt] = useState(() => Date.now());
  const nowSnapshot = data?.generatedAt ? new Date(data.generatedAt).getTime() : mountedAt;

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const ninetyDaysMs = 1000 * 60 * 60 * 24 * 90;
    return data.rows
      .filter((r) => {
        if (filter === 'managed' && r.kind !== 'managed') return false;
        if (filter === 'external' && r.kind !== 'external') return false;
        if (filter === 'directory' && r.kind !== 'directory') return false;
        if (filter === 'local' && r.kind !== 'local') return false;
        if (filter === 'won-recent') {
          if (r.wonCount === 0) return false;
          if (!r.lastSubmissionDate) return false;
          const last = new Date(r.lastSubmissionDate).getTime();
          if (Number.isNaN(last)) return false;
          if (nowSnapshot - last > ninetyDaysMs) return false;
        }
        if (!q) return true;
        return (
          r.displayName.toLowerCase().includes(q) ||
          (r.folderName ?? '').toLowerCase().includes(q) ||
          (r.tradeType ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Won/active firms first (by recency), then alphabetically — keeps the
        // directory's date-less rows in a stable, readable A→Z order.
        const at = a.lastSubmissionDate ? new Date(a.lastSubmissionDate).getTime() : 0;
        const bt = b.lastSubmissionDate ? new Date(b.lastSubmissionDate).getTime() : 0;
        if (bt !== at) return bt - at;
        return a.displayName.localeCompare(b.displayName, 'de');
      });
  }, [data, search, filter, nowSnapshot]);

  useEffect(() => {
    if (highlight >= filteredRows.length) setHighlight(filteredRows.length - 1);
  }, [filteredRows.length, highlight]);

  // Page-level keyboard navigation (↑/↓ move, Enter opens, "/" focuses search).
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        searchRef.current?.focus();
        return;
      }
      if (isTypingTarget(e.target)) {
        if (e.key === 'Escape') {
          setHighlight(-1);
          (e.target as HTMLElement).blur();
        }
        return;
      }
      if (filteredRows.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => (h < 0 ? 0 : (h + 1) % filteredRows.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => (h <= 0 ? filteredRows.length - 1 : h - 1));
        return;
      }
      if (e.key === 'Enter') {
        if (highlight < 0 || highlight >= filteredRows.length) return;
        e.preventDefault();
        const row = filteredRows[highlight];
        navigate(`/panel/firmen/${row.kind}/${row.id}`);
        return;
      }
      if (e.key === 'Escape') {
        if (highlight >= 0) {
          e.preventDefault();
          setHighlight(-1);
        }
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [filteredRows, highlight, navigate]);

  const directoryCount = data?.directoryCount ?? 0;
  const verzeichnisCount = (data?.externalCount ?? 0) + directoryCount;

  const FILTERS: ReadonlyArray<{ id: FilterId; label: string }> = [
    { id: 'all', label: 'Alle' },
    { id: 'managed', label: 'Verwaltet' },
    { id: 'directory', label: 'KT01-Verzeichnis' },
    { id: 'external', label: 'Extern' },
    { id: 'local', label: 'Lokal' },
    { id: 'won-recent', label: 'Zuletzt gewonnen' },
  ];

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Firmen — KALKU Panel</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
            KT01 · Bauunternehmer
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <Building2 className="h-6 w-6 text-primary-600" />
            Firmen
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Alle Bauunternehmer aus dem <strong>KT01-OneDrive</strong>. Eine Firma anklicken,
            um deren Ausschreibungen zu kalkulieren.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {data?.isMock && (
            <span
              className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              title="Demo-Daten — preisanfrage-Anbindung läuft im MOCK-Modus. Für Echtdaten PREISANFRAGE_SERVICE_JWT setzen."
            >
              DEMO
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Aktualisieren"
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} />
            Aktualisieren
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
            data-testid="firmen-new-button"
            title="Lokale Firma manuell anlegen (ohne preisanfrage-Onboarding)"
          >
            <Plus className="h-3.5 w-3.5" />
            Neue Firma
          </button>
        </div>
      </header>

      {/* ── Stat strip ─────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Building2 className="h-4 w-4" />} label="Firmen gesamt" value={data.rows.length} accent />
          <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Verwaltet" value={data.managedCount} />
          <StatCard icon={<Database className="h-4 w-4" />} label="Im Verzeichnis" value={verzeichnisCount} />
          <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Projekte gesamt" value={data.totalProjects} />
        </div>
      )}

      {/* ── Search + filters ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Firma, Ordnername oder Gewerk suchen …"
            className="input w-full pl-9 pr-24"
            aria-label="Firmen durchsuchen"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[11px] text-slate-400 sm:flex">
            {data && (
              <span className="tabular-nums">
                {filteredRows.length}/{data.rows.length}
              </span>
            )}
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 font-sans dark:border-slate-700 dark:bg-slate-800">/</kbd>
          </span>
        </div>
        <div
          role="group"
          aria-label="Filter"
          className="inline-flex flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
        >
          {FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              aria-pressed={filter === tab.id}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                filter === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ────────────────────────────────────────────────── */}
      {loading && !data && (
        <div aria-live="polite" aria-busy="true" data-testid="firmen-loading" className="space-y-3">
          <span className="sr-only" data-testid="firmen-loading-text">
            <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
            Lade Firmen von preisanfrage…
          </span>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0 dark:border-slate-800"
                data-testid="firmen-skeleton-row"
              >
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-4 w-10" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      {!loading && !error && data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm" data-testid="firmen-table" aria-label="Firmen-Liste">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Firma</th>
                <th className="px-4 py-2.5 text-left font-medium">Gewerk</th>
                <th className="px-4 py-2.5 text-right font-medium">Projekte</th>
                <th className="px-4 py-2.5 text-right font-medium">Gewonnen</th>
                <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">Umsatz brutto</th>
                <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">Letzte Abgabe</th>
                <th className="px-4 py-2.5 text-right font-medium" aria-label="Aktion" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Building2 className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500">Keine Firma passt zu den Filtern.</p>
                    {(search || filter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setFilter('all');
                        }}
                        className="mt-2 text-xs font-medium text-primary-600 hover:underline dark:text-primary-300"
                      >
                        Filter zurücksetzen
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {filteredRows.map((row, idx) => (
                <FirmaRowEl
                  key={`${row.kind}:${row.id}`}
                  row={row}
                  selected={highlight === idx}
                  onHover={() => setHighlight(idx)}
                  onArchive={row.kind === 'local' ? () => handleArchiveLocal(row) : undefined}
                  archiving={row.kind === 'local' && typeof row.id === 'string' && archivingId === row.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.lastScanAt && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Stand der Firmendaten: {new Date(data.lastScanAt).toLocaleString('de-DE')}
          {directoryCount > 0 && ` · ${directoryCount} aus KT01-Verzeichnis`}
        </p>
      )}

      {createOpen && (
        <NewFirmaModal
          onClose={() => setCreateOpen(false)}
          onCreated={(row) => {
            setData((d) =>
              d
                ? {
                    ...d,
                    rows: [
                      ...d.rows,
                      {
                        kind: 'local' as const,
                        id: row.id,
                        folderName: null,
                        displayName: row.displayName,
                        tradeType: row.tradeType,
                        projectCount: 0,
                        wonCount: 0,
                        wonSumBrutto: 0,
                        lastSubmissionDate: null,
                        adoptedCompanyId: null,
                        hasCustomDefaults: false,
                      },
                    ],
                    localCount: d.localCount + 1,
                  }
                : d,
            );
            setCreateOpen(false);
            toast.success('Lokale Firma angelegt.');
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border px-4 py-3',
        accent
          ? 'border-primary-200 bg-primary-50/60 dark:border-primary-900/60 dark:bg-primary-900/20'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className={accent ? 'text-primary-600 dark:text-primary-300' : 'text-slate-400'}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

/**
 * Modal dialog for creating a new local Firma.
 */
function NewFirmaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: Awaited<ReturnType<typeof api.firmen.createLocal>>) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [tradeType, setTradeType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmedName = displayName.trim();
  const canSubmit = trimmedName.length > 0 && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const row = await api.firmen.createLocal({
        displayName: trimmedName,
        tradeType: tradeType || null,
        notes: notes.trim() || null,
      });
      onCreated(row);
    } catch (e) {
      toast.error(`Anlegen fehlgeschlagen: ${String(e)}`);
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-firma-title"
      data-testid="new-firma-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 id="new-firma-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Neue lokale Firma anlegen
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Bleibt nur im KALKU-Panel — keine preisanfrage-Anbindung nötig.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="new-firma-name" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Firmenname *
            </label>
            <input
              id="new-firma-name"
              ref={nameRef}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={200}
              required
              className="input mt-1 w-full"
              placeholder="z. B. Privatkunde Müller, Berlin"
            />
          </div>
          <div>
            <label htmlFor="new-firma-trade" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Gewerk (optional)
            </label>
            <select
              id="new-firma-trade"
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
              className="input mt-1 w-full"
            >
              <option value="">— kein Gewerk —</option>
              {TRADE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-firma-notes" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Notizen (optional)
            </label>
            <textarea
              id="new-firma-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
              rows={3}
              className="input mt-1 w-full resize-none"
              placeholder="Kontaktdaten, Hinweise, Sonderwünsche…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** One Firma row: monogram + name + source/trade chips + metrics. */
function FirmaRowEl({
  row,
  selected = false,
  onHover,
  onArchive,
  archiving = false,
}: {
  row: FirmaRow;
  selected?: boolean;
  onHover?: () => void;
  onArchive?: () => void;
  archiving?: boolean;
}) {
  const isExternal = row.kind === 'external';
  const isDirectory = row.kind === 'directory';
  const isUnadopted = isExternal && !row.adoptedCompanyId;
  const meta = tradeMeta(row.tradeType);
  const href = `/panel/firmen/${row.kind}/${row.id}`;
  // Per-company preisanfrage links (Posteingang + Statistik) exist only for a
  // managing preisanfrage company: managed firms (id == companies.id) and
  // adopted external firms (adoptedCompanyId). Both deep-link via ?company=<id>.
  const preisanfrageCompanyId: number | null =
    row.kind === 'managed' && typeof row.id === 'number'
      ? row.id
      : row.kind === 'external'
        ? row.adoptedCompanyId
        : null;

  return (
    <tr
      aria-selected={selected}
      data-selected={selected ? 'true' : undefined}
      onMouseEnter={onHover}
      className={clsx(
        'transition-colors',
        selected
          ? 'bg-primary-50 outline-none ring-2 ring-inset ring-primary-500 dark:bg-primary-500/15'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
      )}
    >
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={clsx(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-tight',
              meta?.avatar ?? NEUTRAL_AVATAR,
            )}
          >
            {monogram(row.displayName)}
          </span>
          <div className="min-w-0">
            <Link
              to={href}
              className="font-medium text-slate-900 hover:text-primary-600 dark:text-slate-100 dark:hover:text-primary-300"
            >
              {row.displayName}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              {row.folderName && <span className="truncate font-mono">{row.folderName}</span>}
              <KindBadge kind={row.kind} />
              {isUnadopted && (
                <span
                  className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                  title="Diese Firma ist noch nicht im preisanfrage-System eingerichtet (kein SMTP/SharePoint-Setup)."
                >
                  Neu — Setup ausstehend
                </span>
              )}
              {row.hasCustomDefaults && (
                <span
                  className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                  title="Eigene Zuschlag-/Stundensatz-Werte gespeichert"
                >
                  Eigene Defaults
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        {meta ? (
          <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', meta.chip)}>
            {meta.label}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right align-top tabular-nums text-slate-700 dark:text-slate-300">
        {row.projectCount > 0 ? row.projectCount : <span className="text-slate-300 dark:text-slate-600">0</span>}
      </td>
      <td className="px-4 py-3 text-right align-top tabular-nums">
        {row.wonCount > 0 ? (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
            <Trophy className="h-3.5 w-3.5" />
            {row.wonCount}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">0</span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-right align-top tabular-nums text-slate-700 dark:text-slate-300 lg:table-cell">
        {row.wonSumBrutto > 0 ? formatEUR(row.wonSumBrutto) : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </td>
      <td className="hidden px-4 py-3 align-top text-slate-500 dark:text-slate-400 md:table-cell">
        {row.lastSubmissionDate ? (
          <time dateTime={row.lastSubmissionDate}>
            {new Date(row.lastSubmissionDate).toLocaleDateString('de-DE')}
          </time>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div className="inline-flex items-center justify-end gap-2">
          {onArchive && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onArchive();
              }}
              disabled={archiving}
              aria-label="Firma archivieren"
              data-testid="firma-archive-button"
              className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400"
              title="Archivieren"
            >
              {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
          {preisanfrageCompanyId != null && (
            <>
              <a
                href={preisanfrageSsoHref(`/statistik?company=${preisanfrageCompanyId}`)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
                title={`Statistik (Gewonnen/Verloren) von ${row.displayName} in preisanfrage öffnen`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Statistik</span>
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </a>
              <a
                href={preisanfrageSsoHref(`/posteingang?company=${preisanfrageCompanyId}`)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
                title={`Posteingang von ${row.displayName} in preisanfrage öffnen`}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Posteingang</span>
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </a>
            </>
          )}
          <Link
            to={href}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
          >
            {isDirectory ? 'Ansehen' : 'Öffnen'} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

/** Small source badge — distinct color per Firma kind. */
function KindBadge({ kind }: { kind: FirmaRow['kind'] }) {
  if (kind === 'local') {
    return (
      <span
        className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
        title="Lokal angelegt — nicht aus preisanfrage."
        data-testid="firma-local-badge"
      >
        Lokal
      </span>
    );
  }
  if (kind === 'managed') {
    return (
      <span
        className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
        title="Im preisanfrage-System verwaltet (SMTP/SharePoint eingerichtet)."
      >
        Verwaltet
      </span>
    );
  }
  if (kind === 'directory') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200"
        title="Aus dem KT01-OneDrive-Verzeichnis. Für Live-Kennzahlen die preisanfrage-Anbindung aktivieren."
      >
        <Database className="h-2.5 w-2.5" />
        KT01
      </span>
    );
  }
  // external
  return (
    <span
      className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
      title="Aus OneDrive erkannt, aber noch nicht im preisanfrage-System eingerichtet."
    >
      Extern
    </span>
  );
}
