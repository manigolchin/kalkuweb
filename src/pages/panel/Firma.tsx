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

import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { formatEUR } from '@/features/kalkulation/calc';

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
  const kind = (kindRaw === 'managed' || kindRaw === 'external' ? kindRaw : null) as
    | 'managed'
    | 'external'
    | null;
  const id = Number(idRaw);

  const [data, setData] = useState<FirmaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!kind || !Number.isInteger(id) || id <= 0) {
      setError('Ungültige Firma-Referenz.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.firmen.detail(kind, id);
      setData(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError('Diese Firma gibt es nicht (mehr) in preisanfrage.');
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
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Lade Firma…
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
          <DefaultsCard
            kind={kind}
            id={id}
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
          <ProjectsCard
            projects={data.projects}
            firmaKind={kind}
            firmaDisplayName={data.firma.displayName}
            defaults={data.defaults}
          />
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
  kind: 'managed' | 'external';
}) {
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
            <span
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                kind === 'managed'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
              )}
            >
              {kind === 'managed' ? 'Verwaltet (preisanfrage)' : 'Extern (OneDrive)'}
            </span>
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
    setSaving(true);
    try {
      const res = await api.firmen.updateDefaults(kind, id, {
        materialZuschlag: matZ / 100,
        nuZuschlag: nuZ / 100,
        verrechnungslohn: vl,
        geraeteStundensatz: gs,
        displayName,
      });
      toast.success('Eigene Defaults gespeichert.');
      onSaved({ ...res.defaults });
    } catch (e) {
      toast.error(`Speichern fehlgeschlagen: ${String(e)}`);
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
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input flex-1 text-right tabular-nums"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400 w-8 shrink-0">{suffix}</span>
      </div>
      {hint && <span className="block text-[10px] text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}

function ProjectsCard({
  projects,
  firmaKind,
  firmaDisplayName,
  defaults,
}: {
  projects: FirmaDetail['projects'];
  firmaKind: 'managed' | 'external';
  firmaDisplayName: string;
  defaults: FirmaDetail['defaults'];
}) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState<string | null>(null);

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
      // Pre-fill the new project with everything we already know:
      //  - bidder = Firma name (so the Excel export header is correct from minute 1)
      //  - calcParams = Firma defaults cascaded into globals
      //  - client / service / tenderNumber / deadline from the Ausschreibung
      //  - name = the Ausschreibung title
      // Empty positions[] — the calculator imports the GAEB/PDF in a follow-up
      // step (Phase 1c will wire "Positionen aus preisanfrage holen").
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
        },
        positions: [],
        notes: `Aus preisanfrage importiert — Firma: ${firmaDisplayName} (${firmaKind}), Ref: ${p.source}:${p.id}`,
      });
      toast.success('Kalkulation angelegt — jetzt GAEB importieren oder Positionen einpflegen.');
      navigate(`/panel/kalkulation/${created.id}`);
    } catch (e) {
      toast.error(`Konnte Kalkulation nicht starten: ${String(e)}`);
      setStarting(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <header className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          Ausschreibungen ({sorted.length})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Klick auf <strong>Kalkulation starten</strong> legt ein neues Projekt mit den Firma-Defaults an.
        </p>
      </header>
      {sorted.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-slate-500">
          Noch keine Ausschreibungen für diese Firma.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((p) => (
            <li key={`${p.source}:${p.id}`} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                  <button
                    type="button"
                    onClick={() => startKalkulation(p)}
                    disabled={starting !== null}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {starting === `${p.source}:${p.id}` ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Calculator className="w-3 h-3" />
                    )}
                    Kalkulation starten
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
