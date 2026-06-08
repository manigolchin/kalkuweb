/**
 * Firma-Detail — single Bauunternehmer overview.
 *
 * Three sections:
 *  1. Header — master data from preisanfrage (read-only)
 *  2. Kalkulations-Defaults — editable form, written to panel-api's
 *     firma_calc_defaults table (per-Firma overrides of global defaults)
 *  3. Ausschreibungen — live list from preisanfrage, click to open
 *     (Phase 1b will wire each row to "Kalkulation starten")
 *
 * Source of truth split: see docs/v2_redesign/multi_company_integration_architecture.md.
 */

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Building2,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Settings2,
  ExternalLink,
  Trophy,
  RotateCcw,
  Save,
  HardHat,
  Calendar,
  MapPin,
  CalendarDays,
  Calculator,
  Plus,
  Trash2,
  X,
  Database,
  Inbox,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { formatEUR } from '@/features/kalkulation/calc';
import { Skeleton } from '@/components/panel/Skeleton';

/** Derive the customer-facing „04_Angebote"-link from a preisanfrage project's
 *  OneDrive folder URL. That folder is a fixed sibling inside every project
 *  folder, so we append it to the (trailing-slash-trimmed) base. Only http(s)
 *  bases qualify — anything else returns undefined so we never seed a bogus
 *  href. NOTE: the result is an internal SharePoint path; the calculator may
 *  still need to swap in an "anyone-with-link" share URL before an external
 *  customer can actually open it (done in the Share-Dialog per share). */
function deriveAngeboteFolderUrl(oneDriveShareUrl?: string | null): string | undefined {
  if (!oneDriveShareUrl) return undefined;
  const base = oneDriveShareUrl.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) return undefined;
  return `${base}/04_Angebote`;
}

/** Round 11 — status enum for local Ausschreibungen. Keep colors stable so
 *  the panel reads like a Kanban (offen=slate, in-progress=amber, done=blue,
 *  win=green, loss=rose). */
type AuschreibungStatus = 'offen' | 'in_arbeit' | 'abgegeben' | 'gewonnen' | 'verloren';
const STATUS_LABEL: Record<AuschreibungStatus, string> = {
  offen: 'Offen',
  in_arbeit: 'In Arbeit',
  abgegeben: 'Abgegeben',
  gewonnen: 'Gewonnen',
  verloren: 'Verloren',
};
const STATUS_CLASS: Record<AuschreibungStatus, string> = {
  offen: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_arbeit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  abgegeben: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  gewonnen: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  verloren: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
};
const STATUS_OPTIONS: ReadonlyArray<AuschreibungStatus> = [
  'offen', 'in_arbeit', 'abgegeben', 'gewonnen', 'verloren',
];

function isAuschreibungStatus(s: string | undefined): s is AuschreibungStatus {
  return s === 'offen' || s === 'in_arbeit' || s === 'abgegeben' || s === 'gewonnen' || s === 'verloren';
}

type FirmaDetail = Awaited<ReturnType<typeof api.firmen.detail>>;

const TRADE_LABEL: Record<string, string> = {
  galabau: 'GaLaBau',
  elektro: 'Elektro',
  tiefbau: 'Tiefbau',
  leitungsbau: 'Leitungsbau',
  fenster: 'Fenster',
  haustechnik: 'Haustechnik',
  heizung: 'Heizung',
};

export default function Firma() {
  const { kind: kindRaw, id: idRaw } = useParams<{ kind: string; id: string }>();
  const navigate = useNavigate();
  const kind = (kindRaw === 'managed' || kindRaw === 'external' || kindRaw === 'local' || kindRaw === 'directory'
    ? kindRaw
    : null) as 'managed' | 'external' | 'local' | 'directory' | null;
  /** id is a `string` for local (nanoid) and directory (slug) kinds, `number`
   *  for the preisanfrage kinds. We pass it through as the raw param string
   *  everywhere except the legacy numeric checks the defaults endpoint needs. */
  const usesStringId = kind === 'local' || kind === 'directory';
  const idParam: string | number | null = usesStringId ? (idRaw ?? null) : Number(idRaw);

  const [data, setData] = useState<FirmaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!kind) {
      setError('Ungültige Firma-Referenz.');
      setLoading(false);
      return;
    }
    if (!usesStringId && (!Number.isInteger(idParam) || (idParam as number) <= 0)) {
      setError('Ungültige Firma-Referenz.');
      setLoading(false);
      return;
    }
    if (usesStringId && (!idParam || typeof idParam !== 'string')) {
      setError('Ungültige Firma-Referenz.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.firmen.detail(kind, idParam as number | string);
      setData(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError(
          kind === 'local'
            ? 'Diese lokale Firma gibt es nicht (mehr).'
            : kind === 'directory'
              ? 'Diese Firma gibt es nicht (mehr) im KT01-Verzeichnis.'
              : 'Diese Firma gibt es nicht (mehr) in preisanfrage.',
        );
      } else if (e instanceof ApiError && e.status === 503) {
        setError('preisanfrage.kalkus.de ist gerade nicht erreichbar.');
      } else {
        setError(`Konnte Firma nicht laden: ${String(e)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindRaw, idRaw]);

  if (!kind) {
    return (
      <div className="text-sm text-rose-600">
        Ungültige Firma-Referenz. <button onClick={() => navigate('/panel/firmen')} className="underline">Zurück zur Liste</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{data?.firma.displayName ?? 'Firma'} — KALKU Panel</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div>
        <Link
          to="/panel/firmen"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Alle Firmen
        </Link>
      </div>

      {loading && !data && (
        <div
          aria-live="polite"
          aria-busy="true"
          data-testid="firma-loading"
          className="space-y-4"
        >
          <span className="sr-only" data-testid="firma-loading-text">
            <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
            Lade Firma…
          </span>

          {/* Header skeleton (mirrors Header layout) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-3 w-40" />
                <div className="flex gap-3 pt-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <Skeleton className="h-12 w-20" />
                <Skeleton className="h-12 w-20" />
                <Skeleton className="h-12 w-24" />
              </div>
            </div>
          </div>

          {/* Defaults-form skeleton */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-3 w-full max-w-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>

          {/* Ausschreibungen skeleton (3 rows) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <Skeleton className="h-5 w-48" />
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="px-5 py-3 flex items-start justify-between gap-3"
                  data-testid="firma-skeleton-project"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-7 w-36 shrink-0" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {data && (
        <>
          <Header firma={data.firma} kind={kind} />
          {kind === 'directory' ? (
            // Directory firms are a read-only KT01 snapshot: no editable
            // defaults, no preisanfrage projects. Offer a direct entry point.
            <DirectoryNotice firma={data.firma} defaults={data.defaults} />
          ) : (
            <>
              {/* Calc defaults only exist for preisanfrage firmas — the
                  firma_calc_defaults table CHECK restricts kind to managed/external.
                  For local firms we show the global defaults via ProjectsCard but
                  don't render the editable form. */}
              {kind !== 'local' && (
                <DefaultsCard
                  kind={kind}
                  id={idParam as number}
                  initial={data.defaults}
                  displayName={data.firma.displayName}
                  onSaved={(next) => setData({ ...data, defaults: next })}
                  onReset={() =>
                    setData({
                      ...data,
                      defaults: {
                        materialZuschlag: 0.12,
                        nuZuschlag: 0.12,
                        verrechnungslohn: 49.9,
                        geraeteStundensatz: 0.5,
                        isCustom: false,
                      },
                    })
                  }
                />
              )}
              <ProjectsCard
                projects={data.projects}
                firmaKind={kind}
                firmaId={idParam as number | string}
                firmaDisplayName={data.firma.displayName}
                defaults={data.defaults}
                onChanged={load}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Header({
  firma,
  kind,
}: {
  firma: FirmaDetail['firma'];
  kind: 'managed' | 'external' | 'local' | 'directory';
}) {
  const KIND_BADGE: Record<typeof kind, { label: string; cls: string }> = {
    managed: { label: 'Verwaltet (preisanfrage)', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
    external: { label: 'Extern (OneDrive)', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
    local: { label: 'Lokal (Panel)', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200' },
    directory: { label: 'KT01-Verzeichnis', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' },
  };
  const badge = KIND_BADGE[kind];
  // The preisanfrage Posteingang is scoped to a managing company. Only managed
  // firms (firma.id == companies.id) and adopted external firms (adoptedCompanyId)
  // have one; un-adopted external / local / directory firms don't.
  const posteingangCompanyId: number | null =
    kind === 'managed'
      ? typeof firma.id === 'number'
        ? firma.id
        : null
      : kind === 'external'
        ? firma.adoptedCompanyId
        : null;
  return (
    <header className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600 shrink-0" />
            <span className="truncate">{firma.displayName}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {firma.folderName ?? '(kein OneDrive-Ordner)'}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
            {firma.tradeType && (
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <HardHat className="w-3.5 h-3.5" />
                {TRADE_LABEL[firma.tradeType] ?? firma.tradeType}
              </span>
            )}
            <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', badge.cls)}>
              {badge.label}
            </span>
            {posteingangCompanyId != null && (
              <a
                href={`https://preisanfrage.kalkus.de/posteingang?company=${posteingangCompanyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
                title={`Posteingang von ${firma.displayName} in preisanfrage öffnen`}
              >
                <Inbox className="w-3.5 h-3.5" />
                Posteingang
                <ExternalLink className="w-3 h-3 opacity-70" aria-hidden />
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm shrink-0">
          <Stat label="Projekte" value={firma.projectCount} />
          <Stat
            label="Gewonnen"
            value={firma.wonCount}
            icon={firma.wonCount > 0 ? <Trophy className="w-3 h-3 inline mr-0.5 text-emerald-600" /> : null}
          />
          <Stat label="Umsatz brutto" value={firma.wonSumBrutto > 0 ? formatEUR(firma.wonSumBrutto) : '—'} />
        </div>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
        {icon}
        {value}
      </div>
    </div>
  );
}

/**
 * Read-only notice for a KT01-directory Firma — there are no preisanfrage
 * projects to list, so we explain the source and offer a direct "Kalkulation
 * starten" that opens a fresh (empty) calculation pre-filled with the Firma
 * name as bidder + the global KALKU defaults.
 */
function DirectoryNotice({
  firma,
  defaults,
}: {
  firma: FirmaDetail['firma'];
  defaults: FirmaDetail['defaults'];
}) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  async function startBlank() {
    setStarting(true);
    try {
      const created = await api.projects.create({
        name: `Kalkulation — ${firma.displayName}`,
        client: '',
        service: '',
        tenderNumber: '',
        deadline: '',
        bidder: firma.displayName,
        calcParams: {
          mittellohn: 30,
          verrechnungslohn: defaults.verrechnungslohn,
          materialZuschlag: defaults.materialZuschlag,
          nuZuschlag: defaults.nuZuschlag,
          geraeteZuschlagPct: 0.1,
          geraeteStundensatz: defaults.geraeteStundensatz,
          zeitabzug: 0,
          tagesstunden: 8,
          personaleinsatz: 3,
          mwst: 0.19,
          zielAufschlag: 0,
        },
        positions: [],
        notes: `KT01-Verzeichnis-Firma: ${firma.displayName}${firma.folderName ? ` (${firma.folderName})` : ''}`,
      });
      toast.success('Kalkulation angelegt — jetzt GAEB importieren oder Positionen einpflegen.');
      navigate(`/panel/kalkulation/${created.id}`);
    } catch (e) {
      toast.error(`Konnte Kalkulation nicht starten: ${String(e)}`);
      setStarting(false);
    }
  }

  return (
    <section
      aria-label="KT01-Verzeichnis"
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
          <Database className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Aus dem KT01-Verzeichnis</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Diese Firma stammt aus dem KT01-OneDrive. Sobald die preisanfrage-Anbindung
            aktiv ist, erscheinen hier Ausschreibungen, Submissionsergebnisse und Kennzahlen
            automatisch. Sie können aber schon jetzt eine Kalkulation für diese Firma starten.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={startBlank}
              disabled={starting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
              Kalkulation starten
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DefaultsCard({
  kind,
  id,
  initial,
  displayName,
  onSaved,
  onReset,
}: {
  kind: 'managed' | 'external';
  id: number;
  initial: FirmaDetail['defaults'];
  displayName: string;
  onSaved: (next: FirmaDetail['defaults']) => void;
  onReset: () => void;
}) {
  const [matZ, setMatZ] = useState(initial.materialZuschlag * 100);
  const [nuZ, setNuZ] = useState(initial.nuZuschlag * 100);
  const [vl, setVl] = useState(initial.verrechnungslohn);
  const [gs, setGs] = useState(initial.geraeteStundensatz);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMatZ(initial.materialZuschlag * 100);
    setNuZ(initial.nuZuschlag * 100);
    setVl(initial.verrechnungslohn);
    setGs(initial.geraeteStundensatz);
  }, [initial]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    // ── Optimistic UI ────────────────────────────────────────────────
    // 1) Snapshot pre-save state so we can roll back on failure.
    // 2) Apply the new values to local state IMMEDIATELY (parent + form).
    // 3) Show a "Wird gespeichert…" toast that mutates into success/error.
    const prev = {
      matZ,
      nuZ,
      vl,
      gs,
      defaults: initial,
    };
    const nextDefaults = {
      materialZuschlag: matZ / 100,
      nuZuschlag: nuZ / 100,
      verrechnungslohn: vl,
      geraeteStundensatz: gs,
      isCustom: true,
    };
    onSaved(nextDefaults);

    // toast.loading exists in react-hot-toast v2+ but the existing tests
    // historically only mocked .success/.error. Call it defensively so a
    // stubbed environment without .loading still goes through (id stays
    // undefined; subsequent .success/.error fall back to a fresh toast).
    const loadingId =
      typeof (toast as unknown as { loading?: (m: string) => string }).loading === 'function'
        ? (toast as unknown as { loading: (m: string) => string }).loading('Wird gespeichert…')
        : undefined;

    setSaving(true);
    try {
      const res = await api.firmen.updateDefaults(kind, id, {
        materialZuschlag: nextDefaults.materialZuschlag,
        nuZuschlag: nextDefaults.nuZuschlag,
        verrechnungslohn: nextDefaults.verrechnungslohn,
        geraeteStundensatz: nextDefaults.geraeteStundensatz,
        displayName,
      });
      toast.success('Gespeichert.', loadingId ? { id: loadingId } : undefined);
      onSaved({ ...res.defaults });
    } catch (e) {
      // Rollback local form state AND parent-held defaults to pre-save values.
      setMatZ(prev.matZ);
      setNuZ(prev.nuZ);
      setVl(prev.vl);
      setGs(prev.gs);
      onSaved(prev.defaults);
      toast.error(
        `Speichern fehlgeschlagen: ${String(e)}`,
        loadingId ? { id: loadingId } : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm('Eigene Defaults dieser Firma löschen und auf KALKU-Globalwerte zurücksetzen?')) {
      return;
    }
    setSaving(true);
    try {
      await api.firmen.resetDefaults(kind, id);
      toast.success('Auf Globalwerte zurückgesetzt.');
      onReset();
    } catch (e) {
      toast.error(`Zurücksetzen fehlgeschlagen: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Kalkulations-Defaults"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-500" />
            Kalkulations-Defaults für diese Firma
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Werden bei jedem neuen Kalkulations-Projekt für diese Firma als Startwerte
            genutzt — pro Projekt überschreibbar.{' '}
            {initial.isCustom ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                Eigene Werte gespeichert.
              </span>
            ) : (
              <span className="text-slate-400">Aktuell KALKU-Globalwerte (12 % / 49,90 / 0,50).</span>
            )}
          </p>
        </div>
        {initial.isCustom && (
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NumberField
          label="Material-Zuschlag"
          suffix="%"
          step={0.5}
          value={matZ}
          onChange={setMatZ}
          hint="Excel K4 — Stoffe"
        />
        <NumberField
          label="NU-Zuschlag"
          suffix="%"
          step={0.5}
          value={nuZ}
          onChange={setNuZ}
          hint="Excel K5 — Nachunternehmer"
        />
        <NumberField
          label="Verrechnungslohn"
          suffix="€/h"
          step={0.1}
          value={vl}
          onChange={setVl}
          hint="Excel M2 — Stundensatz"
        />
        <NumberField
          label="Geräte-Stundensatz"
          suffix="€/h"
          step={0.1}
          value={gs}
          onChange={setGs}
          hint="Excel gzuschlag — Z-Spalte"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Speichern
        </button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  suffix,
  step,
  value,
  onChange,
  hint,
}: {
  label: string;
  suffix: string;
  step: number;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  // useId() gives a stable, unique id per render-tree position — preferred
  // over Math.random() which would force re-renders and break ref equality.
  const inputId = useId();
  const hintId = useId();
  return (
    <div className="block">
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-slate-600 dark:text-slate-300"
      >
        {label}
      </label>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-describedby={hint ? hintId : undefined}
          className="input flex-1 text-right tabular-nums"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400 w-8 shrink-0">{suffix}</span>
      </div>
      {hint && (
        <span id={hintId} className="block text-[10px] text-slate-400 mt-0.5">
          {hint}
        </span>
      )}
    </div>
  );
}

function ProjectsCard({
  projects,
  firmaKind,
  firmaId,
  firmaDisplayName,
  defaults,
  onChanged,
}: {
  projects: FirmaDetail['projects'];
  firmaKind: 'managed' | 'external' | 'local';
  firmaId: number | string;
  firmaDisplayName: string;
  defaults: FirmaDetail['defaults'];
  /** Called after a successful create / status-change / delete so the parent
   *  page can reload its data (counts, lastSubmissionDate, etc.). */
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      const at = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
      const bt = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
      return bt - at;
    });
  }, [projects]);

  async function startKalkulation(p: FirmaDetail['projects'][number]) {
    const key = `${p.source}:${p.id}`;
    setStarting(key);
    try {
      // For MANAGED firmas, try to seed the new project with positions that
      // preisanfrage already parsed from the GAEB. External firmas don't
      // have positions in preisanfrage yet, so we leave positions empty
      // and let the calculator upload the GAEB manually.
      const seededPositions: NonNullable<Parameters<typeof api.projects.create>[0]['positions']> = [];
      if (p.source === 'managed') {
        try {
          const res = await api.firmen.projectPositions(firmaKind, firmaId, p.id);
          // The route validates (kind, firmaId, projectId) and then asks
          // preisanfrage for the GAEB-parsed positions. project_id is the
          // upstream's globally-unique id; firmaId is kept in the URL for
          // route-hierarchy consistency + future cross-firma leakage guards.
          let order = 0;
          for (const pos of res.positions) {
            const isHdr = !!pos.isHeader;
            seededPositions.push({
              id: crypto.randomUUID(),
              oz: pos.oz,
              shortText: pos.shortText,
              longText: pos.longText,
              hinweisText: '',
              quantity: pos.quantity,
              unit: pos.unit,
              // EK columns start empty — that's the calculator's job to fill.
              materialCost: 0,
              timeMinutes: 0,
              nuCost: 0,
              isHeader: isHdr,
              sortOrder: order++,
              sectionPath: pos.oz.split('.').slice(0, -1).join('.') || pos.oz,
              epLohn: 0,
              epMaterial: 0,
              epGeraet: 0,
              epNu: 0,
              ep: 0,
              gp: 0,
              visibleToCustomer: true,
              positionType: 'standard',
              // From preisanfrage's OneDrive GAEB parse — protected from
              // deletion in PositionTableV2 (trash icon disabled + bulk-
              // delete skips them). See Position type comment.
              importedFrom: 'preisanfrage',
            });
          }
        } catch (e) {
          // Non-fatal — fall back to empty positions[].
          console.warn('[Firma] positions seed failed, continuing with empty LV:', e);
        }
      }

      // Pre-fill the new project with everything we already know:
      //  - bidder = Firma name (so the Excel export header is correct from minute 1)
      //  - calcParams = Firma defaults cascaded into globals
      //  - client / service / tenderNumber / deadline from the Ausschreibung
      //  - name = the Ausschreibung title
      //  - positions = seeded from preisanfrage if available
      const submissionIso = p.submissionDate
        ? (p.submissionTime ? `${p.submissionDate}T${p.submissionTime}` : p.submissionDate)
        : '';
      const created = await api.projects.create({
        name: p.name ?? p.baumassnahme ?? p.folderName ?? `Ausschreibung ${p.projectNumber ?? ''}`,
        client: p.auftraggeberName ?? '',
        service: '',
        tenderNumber: p.projectNumber ?? '',
        deadline: submissionIso,
        bidder: firmaDisplayName,
        calcParams: {
          mittellohn: 30,
          verrechnungslohn: defaults.verrechnungslohn,
          materialZuschlag: defaults.materialZuschlag,
          nuZuschlag: defaults.nuZuschlag,
          geraeteZuschlagPct: 0.1,
          geraeteStundensatz: defaults.geraeteStundensatz,
          zeitabzug: 0,
          tagesstunden: 8,
          personaleinsatz: 3,
          mwst: 0.19,
          zielAufschlag: 0,
        },
        positions: seededPositions,
        notes: `Aus preisanfrage importiert — Firma: ${firmaDisplayName} (${firmaKind}), Ref: ${p.source}:${p.id}`,
        // Auto-fill the „04_Angebote"-Ordner link from the project's OneDrive
        // folder so the calculator can expose it to the customer with one toggle.
        angeboteFolderUrl: deriveAngeboteFolderUrl(p.oneDriveShareUrl),
      });
      const seededN = seededPositions.length;
      toast.success(
        seededN > 0
          ? `Kalkulation mit ${seededN} Positionen aus preisanfrage angelegt.`
          : 'Kalkulation angelegt — jetzt GAEB importieren oder Positionen einpflegen.',
      );
      navigate(`/panel/kalkulation/${created.id}`);
    } catch (e) {
      toast.error(`Konnte Kalkulation nicht starten: ${String(e)}`);
      setStarting(null);
    }
  }

  return (
    <section
      aria-label="Ausschreibungen"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <header className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            Ausschreibungen ({sorted.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Klick auf <strong>Kalkulation starten</strong> legt ein neues Projekt mit den Firma-Defaults an.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          data-testid="auschreibung-new-button"
        >
          <Plus className="w-3.5 h-3.5" />
          Neue Ausschreibung
        </button>
      </header>
      {sorted.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-slate-500">
          Noch keine Ausschreibungen für diese Firma.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((p) => (
            <AuschreibungRow
              key={`${p.source}:${p.id}`}
              project={p}
              startingKey={starting}
              onStart={() => startKalkulation(p)}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}

      {createOpen && (
        <NewAuschreibungModal
          firmaKind={firmaKind}
          firmaId={firmaId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            toast.success('Ausschreibung angelegt.');
            onChanged();
          }}
        />
      )}
    </section>
  );
}

/**
 * One row in the Ausschreibungen list. Renders read-only fields for
 * preisanfrage-sourced projects, plus inline status quick-edit + edit/delete
 * for local Ausschreibungen.
 */
function AuschreibungRow({
  project: p,
  startingKey,
  onStart,
  onChanged,
}: {
  project: FirmaDetail['projects'][number];
  startingKey: string | null;
  onStart: () => void;
  onChanged: () => void;
}) {
  const isLocal = p.source === 'local';
  const status: AuschreibungStatus | undefined = isAuschreibungStatus(p.status) ? p.status : undefined;
  const [statusDraft, setStatusDraft] = useState<AuschreibungStatus | undefined>(status);
  const [statusEditing, setStatusEditing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setStatusDraft(status);
  }, [status]);

  async function commitStatus(next: AuschreibungStatus) {
    if (!isLocal || typeof p.id !== 'string') return;
    if (next === status) {
      setStatusEditing(false);
      return;
    }
    setStatusBusy(true);
    try {
      await api.firmen.updateAuschreibung(p.id, { status: next });
      toast.success('Status aktualisiert.');
      setStatusEditing(false);
      onChanged();
    } catch (e) {
      toast.error(`Status-Änderung fehlgeschlagen: ${String(e)}`);
      // Roll back the draft to the prior value.
      setStatusDraft(status);
    } finally {
      setStatusBusy(false);
    }
  }

  async function deleteLocal() {
    if (!isLocal || typeof p.id !== 'string') return;
    if (!confirm(`Ausschreibung "${p.name ?? '(ohne Titel)'}" archivieren?`)) return;
    setDeleting(true);
    try {
      await api.firmen.archiveAuschreibung(p.id);
      toast.success('Ausschreibung archiviert.');
      onChanged();
    } catch (e) {
      toast.error(`Archivieren fehlgeschlagen: ${String(e)}`);
      setDeleting(false);
    }
  }

  return (
    <li
      className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
      data-testid={isLocal ? 'auschreibung-local-row' : 'auschreibung-row'}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {p.name ?? p.baumassnahme ?? p.folderName ?? p.projectNumber ?? '(ohne Titel)'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
            {p.projectNumber && <span className="font-mono">#{p.projectNumber}</span>}
            {p.auftraggeberName && <span>{p.auftraggeberName}</span>}
            {p.anschriftPlzOrt && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {p.anschriftPlzOrt}
              </span>
            )}
            {p.submissionDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(p.submissionDate).toLocaleDateString('de-DE')}
                {p.submissionTime && ` ${p.submissionTime}`}
              </span>
            )}
            {typeof p.totalPositions === 'number' && p.totalPositions > 0 && (
              <span>{p.totalPositions} Positionen</span>
            )}
            {typeof p.ourRank === 'number' && (
              <span
                className={clsx(
                  'inline-flex items-center gap-1 px-1.5 rounded',
                  p.ourRank === 1
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                <Trophy className="w-3 h-3" />
                Rang {p.ourRank}
              </span>
            )}
            {isLocal && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200"
                data-testid="auschreibung-local-source-badge"
                title="Diese Ausschreibung wurde manuell im Panel angelegt — nicht aus preisanfrage."
              >
                Lokal
              </span>
            )}
            {/* Status badge — for local Aus, click to quick-edit. */}
            {status && (
              isLocal ? (
                statusEditing ? (
                  <select
                    aria-label="Status ändern"
                    value={statusDraft}
                    onChange={(e) => {
                      const v = e.target.value as AuschreibungStatus;
                      setStatusDraft(v);
                      commitStatus(v);
                    }}
                    onBlur={() => setStatusEditing(false)}
                    autoFocus
                    disabled={statusBusy}
                    className={clsx(
                      'px-1.5 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
                    )}
                    data-testid="auschreibung-status-select"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatusEditing(true)}
                    className={clsx(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium hover:ring-2 hover:ring-primary-400',
                      STATUS_CLASS[status],
                    )}
                    data-testid="auschreibung-status-badge"
                    title="Klick zum Ändern"
                  >
                    {STATUS_LABEL[status]}
                  </button>
                )
              ) : (
                <span
                  className={clsx(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium',
                    STATUS_CLASS[status],
                  )}
                  data-testid="auschreibung-status-badge"
                >
                  {STATUS_LABEL[status]}
                </span>
              )
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.oneDriveShareUrl && (
            <a
              href={p.oneDriveShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:underline"
            >
              OneDrive <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {isLocal && (
            <button
              type="button"
              onClick={deleteLocal}
              disabled={deleting}
              aria-label="Ausschreibung archivieren"
              data-testid="auschreibung-delete-button"
              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded disabled:opacity-50"
              title="Archivieren"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={startingKey !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {startingKey === `${p.source}:${p.id}` ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Calculator className="w-3 h-3" />
            )}
            Kalkulation starten
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Modal for adding a new local Ausschreibung onto any Firma. Mirrors the
 * NewFirmaModal shape — focused form with sensible defaults.
 */
function NewAuschreibungModal({
  firmaKind,
  firmaId,
  onClose,
  onCreated,
}: {
  firmaKind: 'managed' | 'external' | 'local';
  firmaId: number | string;
  onClose: () => void;
  onCreated: (row: Awaited<ReturnType<typeof api.firmen.createAuschreibung>>) => void;
}) {
  const [name, setName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [auftraggeber, setAuftraggeber] = useState('');
  const [anschrift, setAnschrift] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [submissionTime, setSubmissionTime] = useState('');
  const [status, setStatus] = useState<AuschreibungStatus>('offen');
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

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const row = await api.firmen.createAuschreibung(firmaKind, firmaId, {
        name: trimmedName,
        projectNumber: projectNumber.trim() || null,
        auftraggeberName: auftraggeber.trim() || null,
        anschriftPlzOrt: anschrift.trim() || null,
        submissionDate: submissionDate || null,
        submissionTime: submissionTime || null,
        status,
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
      aria-labelledby="new-aus-title"
      data-testid="new-auschreibung-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 id="new-aus-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Neue Ausschreibung anlegen
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Wird lokal im Panel gespeichert.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label htmlFor="new-aus-name" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Bezeichnung *
            </label>
            <input
              id="new-aus-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="input w-full mt-1"
              placeholder="z. B. Sanierung Marktstraße 12"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-aus-num" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Projektnummer
              </label>
              <input
                id="new-aus-num"
                type="text"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                maxLength={64}
                className="input w-full mt-1 font-mono"
                placeholder="2026-05-XX"
              />
            </div>
            <div>
              <label htmlFor="new-aus-status" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Status
              </label>
              <select
                id="new-aus-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AuschreibungStatus)}
                className="input w-full mt-1"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="new-aus-ag" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Auftraggeber
            </label>
            <input
              id="new-aus-ag"
              type="text"
              value={auftraggeber}
              onChange={(e) => setAuftraggeber(e.target.value)}
              maxLength={255}
              className="input w-full mt-1"
              placeholder="Stadtverwaltung Saarbrücken"
            />
          </div>
          <div>
            <label htmlFor="new-aus-addr" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Anschrift / PLZ-Ort
            </label>
            <input
              id="new-aus-addr"
              type="text"
              value={anschrift}
              onChange={(e) => setAnschrift(e.target.value)}
              maxLength={255}
              className="input w-full mt-1"
              placeholder="66111 Saarbrücken"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-aus-date" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Abgabedatum
              </label>
              <input
                id="new-aus-date"
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="input w-full mt-1"
              />
            </div>
            <div>
              <label htmlFor="new-aus-time" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Abgabezeit
              </label>
              <input
                id="new-aus-time"
                type="time"
                value={submissionTime}
                onChange={(e) => setSubmissionTime(e.target.value)}
                className="input w-full mt-1"
              />
            </div>
          </div>
          <div>
            <label htmlFor="new-aus-notes" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Notizen
            </label>
            <textarea
              id="new-aus-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={5000}
              className="input w-full mt-1 resize-none"
              placeholder="Sonderwünsche, Ansprechpartner…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
