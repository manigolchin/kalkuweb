/**
 * Firmen-Liste — landing page for the multi-Firma layer.
 *
 * Source of truth: preisanfrage.kalkus.de (98 Bauunternehmer-Ordner aus
 * OneDrive KT01). Live-fetched on every page load via the panel-api
 * proxy (which holds the service-account JWT — never exposed to browser).
 *
 * Mark "Neu — bitte einrichten" badge for unadopted external firms so
 * the calculator knows which firms still need SMTP/SharePoint setup.
 *
 * See: docs/v2_redesign/multi_company_integration_architecture.md
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
  HardHat,
} from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { formatEUR } from '@/features/kalkulation/calc';
import { Skeleton } from '@/components/panel/Skeleton';

type FirmaRow = Awaited<ReturnType<typeof api.firmen.list>>['rows'][number];

const TRADE_LABEL: Record<string, string> = {
  galabau: 'GaLaBau',
  elektro: 'Elektro',
  tiefbau: 'Tiefbau',
  leitungsbau: 'Leitungsbau',
  fenster: 'Fenster',
  haustechnik: 'Haustechnik',
  heizung: 'Heizung',
};

export default function Firmen() {
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.firmen.list>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'managed' | 'external' | 'won-recent'>('all');
  // Keyboard-nav: index into filteredRows. -1 = no row highlighted.
  const [highlight, setHighlight] = useState<number>(-1);
  const searchRef = useRef<HTMLInputElement | null>(null);

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

  // Snapshot "now" once at mount so the filter predicate stays pure
  // (react-hooks/purity). Re-snapshotted on each load() via the
  // `data.generatedAt` server-supplied timestamp. Good enough for a 90-day
  // cutoff — we don't need millisecond-accurate recency.
  const [mountedAt] = useState(() => Date.now());
  const nowSnapshot = data?.generatedAt
    ? new Date(data.generatedAt).getTime()
    : mountedAt;

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const ninetyDaysMs = 1000 * 60 * 60 * 24 * 90;
    return data.rows
      .filter((r) => {
        if (filter === 'managed' && r.kind !== 'managed') return false;
        if (filter === 'external' && r.kind !== 'external') return false;
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
        // Most recent submission first.
        const at = a.lastSubmissionDate ? new Date(a.lastSubmissionDate).getTime() : 0;
        const bt = b.lastSubmissionDate ? new Date(b.lastSubmissionDate).getTime() : 0;
        return bt - at;
      });
  }, [data, search, filter, nowSnapshot]);

  // Keep highlight inside bounds when filteredRows shrinks.
  useEffect(() => {
    if (highlight >= filteredRows.length) setHighlight(filteredRows.length - 1);
  }, [filteredRows.length, highlight]);

  // Page-level keyboard navigation for the Firmen table.
  //   ArrowDown / ArrowUp  — move highlight (wraps at edges)
  //   Enter                 — open the highlighted Firma
  //   /                     — focus the search input (overrides palette hotkey)
  //   Esc                   — clear highlight
  // While focus is inside the search input we let the user type letters
  // freely — only Enter/Esc still work on the search (Enter opens the first
  // hit, Esc blurs).
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      // "/" — always focus the search box (pre-empts the panel-wide palette).
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTypingTarget(e.target)) return; // already typing → let it through
        e.preventDefault();
        e.stopPropagation();
        searchRef.current?.focus();
        return;
      }

      // Inside the search input, only Esc clears the highlight and blurs.
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
    // Capture phase so "/" wins over PanelLayout's window-level handler.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [filteredRows, highlight, navigate]);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Firmen — KALKU Panel</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600" />
            Firmen
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Alle Bauunternehmer aus <strong>preisanfrage.kalkus.de</strong>. Eine Firma anklicken,
            um deren Ausschreibungen zu kalkulieren.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data?.isMock && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold"
              title="Demo-Daten — preisanfrage-Anbindung läuft im MOCK-Modus. Für Echtdaten PREISANFRAGE_SERVICE_JWT setzen."
            >
              DEMO
            </span>
          )}
          {data && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {data.managedCount} verwaltet + {data.externalCount} extern = {data.rows.length} Firmen
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            title="Aktualisieren"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            Aktualisieren
          </button>
        </div>
      </header>

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Firma, Ordnername oder Gewerk suchen"
            className="input pl-9 w-full"
            aria-label="Firmen durchsuchen"
          />
        </div>
        <div
          role="group"
          aria-label="Filter"
          className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5"
        >
          {[
            { id: 'all', label: 'Alle' },
            { id: 'managed', label: 'Verwaltet' },
            { id: 'external', label: 'Nur extern' },
            { id: 'won-recent', label: 'Zuletzt gewonnen' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              aria-pressed={filter === tab.id}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                filter === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* State */}
      {loading && !data && (
        <div
          aria-live="polite"
          aria-busy="true"
          data-testid="firmen-loading"
          className="space-y-3"
        >
          {/* Visually-hidden German announcement — kept verbatim so screen
              readers still hear it and the original test selector matches. */}
          <span className="sr-only" data-testid="firmen-loading-text">
            <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
            Lade Firmen von preisanfrage…
          </span>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                data-testid="firmen-skeleton-row"
              >
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-10 ml-auto" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table
            className="w-full text-sm"
            data-testid="firmen-table"
            aria-label="Firmen-Liste"
          >
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Firma</th>
                <th className="text-left px-4 py-2.5 font-medium">Gewerk</th>
                <th className="text-right px-4 py-2.5 font-medium">Projekte</th>
                <th className="text-right px-4 py-2.5 font-medium">Gewonnen</th>
                <th className="text-right px-4 py-2.5 font-medium">Umsatz brutto</th>
                <th className="text-left px-4 py-2.5 font-medium">Letzte Abgabe</th>
                <th className="text-right px-4 py-2.5 font-medium" aria-label="Aktion" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Keine Firma passt zu den Filtern.
                  </td>
                </tr>
              )}
              {filteredRows.map((row, idx) => (
                <FirmaRowEl
                  key={`${row.kind}:${row.id}`}
                  row={row}
                  selected={highlight === idx}
                  onHover={() => setHighlight(idx)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.lastScanAt && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Letzter OneDrive-Scan: {new Date(data.lastScanAt).toLocaleString('de-DE')}
        </p>
      )}
    </div>
  );
}

function FirmaRowEl({
  row,
  selected = false,
  onHover,
}: {
  row: FirmaRow;
  selected?: boolean;
  onHover?: () => void;
}) {
  const isExternal = row.kind === 'external';
  const isUnadopted = isExternal && !row.adoptedCompanyId;
  return (
    <tr
      aria-selected={selected}
      data-selected={selected ? 'true' : undefined}
      onMouseEnter={onHover}
      className={clsx(
        'transition-colors',
        selected
          ? 'bg-primary-50 dark:bg-primary-500/15 ring-2 ring-primary-500 ring-inset outline-none'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
      )}
    >
      <td className="px-4 py-3 align-top">
        <Link
          to={`/panel/firmen/${row.kind}/${row.id}`}
          className="font-medium text-slate-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-300"
        >
          {row.displayName}
        </Link>
        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
          {row.folderName && <span className="font-mono">{row.folderName}</span>}
          {isUnadopted && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold"
              title="Diese Firma ist noch nicht im preisanfrage-System eingerichtet (kein SMTP/SharePoint-Setup)."
            >
              Neu — Setup ausstehend
            </span>
          )}
          {row.hasCustomDefaults && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
              title="Eigene Zuschlag-/Stundensatz-Werte gespeichert"
            >
              Eigene Defaults
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-400">
        {row.tradeType ? (
          <span className="inline-flex items-center gap-1">
            <HardHat className="w-3.5 h-3.5" />
            {TRADE_LABEL[row.tradeType] ?? row.tradeType}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-right tabular-nums text-slate-700 dark:text-slate-300">
        {row.projectCount}
      </td>
      <td className="px-4 py-3 align-top text-right tabular-nums">
        {row.wonCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
            <Trophy className="w-3.5 h-3.5" />
            {row.wonCount}
          </span>
        ) : (
          <span className="text-slate-400">0</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-right tabular-nums text-slate-700 dark:text-slate-300">
        {row.wonSumBrutto > 0 ? formatEUR(row.wonSumBrutto) : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 align-top text-slate-500 dark:text-slate-400">
        {row.lastSubmissionDate ? (
          <time dateTime={row.lastSubmissionDate}>
            {new Date(row.lastSubmissionDate).toLocaleDateString('de-DE')}
          </time>
        ) : (
          '—'
        )}
      </td>
      <td className="px-4 py-3 align-top text-right">
        <Link
          to={`/panel/firmen/${row.kind}/${row.id}`}
          className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 text-xs font-medium"
        >
          Öffnen <ArrowRight className="w-3 h-3" />
        </Link>
      </td>
    </tr>
  );
}

