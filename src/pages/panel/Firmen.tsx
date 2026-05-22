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

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [data, setData] = useState<Awaited<ReturnType<typeof api.firmen.list>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'managed' | 'external' | 'won-recent'>('all');

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Firma, Ordnername oder Gewerk suchen"
            className="input pl-9 w-full"
            aria-label="Firmen durchsuchen"
          />
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
          {[
            { id: 'all', label: 'Alle' },
            { id: 'managed', label: 'Verwaltet' },
            { id: 'external', label: 'Nur extern' },
            { id: 'won-recent', label: 'Zuletzt gewonnen' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
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
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Lade Firmen von preisanfrage…
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
          <table className="w-full text-sm" data-testid="firmen-table">
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
              {filteredRows.map((row) => (
                <FirmaRowEl key={`${row.kind}:${row.id}`} row={row} />
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

function FirmaRowEl({ row }: { row: FirmaRow }) {
  const isExternal = row.kind === 'external';
  const isUnadopted = isExternal && !row.adoptedCompanyId;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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

