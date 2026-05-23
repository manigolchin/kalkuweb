/* Feature #1 — EFB-Preisblätter 221 / 222 / 223 auto-generation.
 *
 * Renders the three Formblätter required by every VOB/A öffentliche Vergabe
 * directly from the project's existing calc data. Use Cmd+P / Drucken to
 * convert to PDF via the browser — the print stylesheet hides the panel
 * chrome and prints the form on a single A4 page each.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Printer, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Helmet } from 'react-helmet-async';
import { api, ApiError } from '@/lib/api';
import { Breadcrumb } from '@/pages/panel/ui';
import type { CalcParams, ProjectData, ProjectDetail as ProjectDetailType } from './types';
import { calcTotals, formatEUR, formatNum, recalcAll } from './calc';

type Tab = 'efb-221' | 'efb-222' | 'efb-223';

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: 'efb-221', label: 'EFB 221', subtitle: 'Zuschlagskalkulation' },
  { id: 'efb-222', label: 'EFB 222', subtitle: 'Endsummenkalkulation' },
  { id: 'efb-223', label: 'EFB 223', subtitle: 'Aufgliederung der EP' },
];

export default function ProjectEfb() {
  const { id = '' } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [tab, setTab] = useState<Tab>('efb-221');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const detail = await api.projects.get(id);
        if (!alive) return;
        setProject(detail);
        // Recalc to ensure derived fields are current — matches ProjectDetail.
        setData({ ...detail.data, positions: recalcAll(detail.data.positions, detail.data.calcParams) });
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

  const totals = useMemo(() => (data ? calcTotals(data.positions, data.calcParams) : null), [data]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }
  if (error || !data || !project || !totals) {
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

  return (
    <div className="space-y-5">
      <Helmet>
        <title>EFB — {data.name || 'Kalkulation'} – KALKU Panel</title>
      </Helmet>

      <div className="print:hidden">
        <Breadcrumb
          items={[
            { label: 'Panel', to: '/panel' },
            { label: 'Kalkulation', to: '/panel/kalkulation' },
            { label: data.name || 'Projekt', to: `/panel/kalkulation/${id}` },
            { label: 'EFB-Formblätter' },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
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
                EFB-Preisblätter · VOB/A
              </p>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {data.name || 'Projekt'}
              </h1>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
          >
            <Printer className="w-4 h-4" />
            Drucken / Als PDF speichern
          </button>
        </div>

        {/* Tab strip */}
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium border transition-colors',
                tab === t.id
                  ? 'bg-primary-600 text-white border-primary-600 dark:bg-primary-500/30 dark:text-primary-100 dark:border-primary-500/50'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-primary-200 hover:text-primary-700 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 dark:hover:border-primary-500/40',
              )}
            >
              <FileText className="w-4 h-4" />
              <span className="font-semibold">{t.label}</span>
              <span className="hidden sm:inline text-xs opacity-80">· {t.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Print stylesheet — runs only when window.print() fires.
          Hides the panel chrome (sidebar already collapsed by panel layout's
          print:hidden) and renders the active form on a clean A4 page. */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body { background: white !important; }
          .efb-print-section { page-break-after: always; }
          .efb-print-section:last-child { page-break-after: auto; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .efb-form { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>

      <div className="efb-form bg-white dark:bg-slate-900 dark:print:bg-white border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 print:p-0 print:border-0">
        {tab === 'efb-221' && (
          <Efb221 data={data} totals={totals} params={data.calcParams} />
        )}
        {tab === 'efb-222' && (
          <Efb222 data={data} totals={totals} params={data.calcParams} />
        )}
        {tab === 'efb-223' && (
          <Efb223 data={data} params={data.calcParams} />
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 print:hidden">
        Hinweis: Die Werte sind aus der aktuellen Kalkulation abgeleitet. Vor Abgabe
        bitte stichprobenartig gegen Ihre internen Zuschlagsfaktoren prüfen. Die EFB-
        Formblätter sind Vertragsbestandteil — Tippfehler sind kein Aufklärungsgrund.
      </p>
    </div>
  );
}

/* ─── EFB 221 — Zuschlagskalkulation ──────────────────────────────────── */

function Efb221({
  data,
  totals,
  params,
}: {
  data: ProjectData;
  totals: ReturnType<typeof calcTotals>;
  params: CalcParams;
}) {
  // Total Lohn-Kosten Mittellohn-bezogen.
  // Mittellohn (cost) × Stunden total = Lohnkosten ohne Zuschläge.
  // Verrechnungslohn × Stunden total = Lohnkosten inkl. Zuschläge (was in totals.totalLohn).
  const stundenTotal = totals.totalHours;
  const lohnkostenMittellohn = params.mittellohn * stundenTotal;
  const computable = lohnkostenMittellohn > 0 && stundenTotal > 0;
  const lohnZuschlagAbsolut = computable ? totals.totalLohn - lohnkostenMittellohn : 0;
  const lohnZuschlagPct = computable
    ? (lohnZuschlagAbsolut / lohnkostenMittellohn) * 100
    : null;

  return (
    <Form
      number="221"
      title="Preisermittlung bei Zuschlagskalkulation"
      project={data}
    >
      <Row label="Mittellohn AP (Aufgliederung Pos. 4.1)" value={`${formatNum(params.mittellohn)} €/h`} />
      <Row label="Aufwand laut Kalkulation" value={`${formatNum(stundenTotal, 1)} h`} />
      <Row label="Lohnkosten (Mittellohn × Stunden)" value={computable ? formatEUR(lohnkostenMittellohn) : '—'} bold />
      <Divider />
      <Row label="Lohnzuschläge (Lohnnebenkosten + BGK + AGK + W&G auf Lohn)" value={computable ? formatEUR(lohnZuschlagAbsolut) : '—'} />
      <Row label="Lohnzuschlagsfaktor effektiv" value={lohnZuschlagPct != null ? `${formatNum(lohnZuschlagPct, 1)} %` : '—'} muted />
      <Row label="Verrechnungslohn (= Mittellohn × (1 + Faktor))" value={`${formatNum(params.verrechnungslohn)} €/h`} bold />
      <Divider />
      <Row label="Material-Zuschlag (Pos. 4.2)" value={`${formatNum(params.materialZuschlag * 100, 1)} %`} />
      <Row label="Geräte-Stundensatz (Pos. 4.3)" value={`${formatNum(params.geraeteStundensatz)} €/h`} />
      <Row label="Nachunternehmer-Zuschlag (Pos. 4.4)" value={`${formatNum(params.nuZuschlag * 100, 1)} %`} />
      <Divider />
      <Row label="MwSt-Satz" value={`${formatNum(params.mwst * 100, 1)} %`} />
    </Form>
  );
}

/* ─── EFB 222 — Endsummenkalkulation ──────────────────────────────────── */

function Efb222({
  data,
  totals,
  params,
}: {
  data: ProjectData;
  totals: ReturnType<typeof calcTotals>;
  params: CalcParams;
}) {
  return (
    <Form
      number="222"
      title="Preisermittlung bei Endsummenkalkulation"
      project={data}
    >
      <Row label="1. Lohnkosten (Mittellohn-Anteil aller Positionen)" value={formatEUR(totals.totalLohn)} />
      <Row label="2. Stoffkosten (Materialkosten + Material-Zuschlag)" value={formatEUR(totals.totalMaterial)} />
      <Row label="3. Geräte- und Maschinenkosten" value={formatEUR(totals.totalGeraet)} />
      <Row label="4. Nachunternehmerleistungen (inkl. NU-Zuschlag)" value={formatEUR(totals.totalNu)} />
      <Divider />
      <Row label="5. Herstellkosten (Summe 1–4)" value={formatEUR(totals.totalNetto)} bold />
      <Divider />
      <Row
        label="6. Allgemeine Geschäftskosten + Wagnis & Gewinn"
        value="in den ZSCHLG-Sätzen je Kostenart enthalten (siehe EFB 221)"
        muted
      />
      <Row label="7. Angebotssumme netto" value={formatEUR(totals.totalNetto)} bold />
      <Row label="8. MwSt." value={`${formatEUR(totals.totalMwst)} (${formatNum(params.mwst * 100, 1)} %)`} />
      <Row label="9. Angebotssumme brutto" value={formatEUR(totals.totalBrutto)} bold />
    </Form>
  );
}

/* ─── EFB 223 — EP-Aufgliederung ──────────────────────────────────────── */

function Efb223({ data, params }: { data: ProjectData; params: CalcParams }) {
  // Per non-header position: break the EP into 4 buckets (Lohn / Stoff / Gerät / NU).
  const rows = data.positions.filter((p) => !p.isHeader);
  return (
    <Form
      number="223"
      title="Aufgliederung der Einheitspreise"
      project={data}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 print:text-slate-700">
        Aufschlüsselung jeder Position in Lohn-, Stoff-, Geräte- und NU-Anteil. Lohnnebenkosten,
        BGK, AGK und W&G sind im jeweiligen Anteil enthalten (kalkulatorischer Verrechnungslohn
        {' '}{formatNum(params.verrechnungslohn)} €/h, Material-Zuschlag {formatNum(params.materialZuschlag * 100, 1)} %,
        NU-Zuschlag {formatNum(params.nuZuschlag * 100, 1)} %).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-left font-semibold w-20">OZ</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-left font-semibold">Kurztext</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold w-16">Menge</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-left font-semibold w-12">EH</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold w-20">Lohn €/EH</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold w-20">Stoff €/EH</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold w-20">Gerät €/EH</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold w-20">NU €/EH</th>
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold w-20">EP €/EH</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="text-slate-800 dark:text-slate-100">
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">{p.oz || '—'}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 truncate max-w-[18rem]">{p.shortText || '—'}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right tabular-nums">{formatNum(p.quantity, p.quantity % 1 === 0 ? 0 : 2)}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1">{p.unit || '—'}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right tabular-nums">{formatEUR(p.epLohn)}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right tabular-nums">{formatEUR(p.epMaterial)}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right tabular-nums">{formatEUR(p.epGeraet)}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right tabular-nums">{formatEUR(p.epNu)}</td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right tabular-nums font-semibold">{formatEUR(p.ep)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="border border-slate-200 dark:border-slate-700 px-2 py-4 text-center text-slate-400">
                  Keine Positionen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Form>
  );
}

/* ─── Shared form chrome ──────────────────────────────────────────────── */

function Form({
  number,
  title,
  project,
  children,
}: {
  number: string;
  title: string;
  project: ProjectData;
  children: React.ReactNode;
}) {
  return (
    <section className="efb-print-section">
      <header className="border-b-2 border-slate-300 dark:border-slate-600 pb-3 mb-4 print:border-slate-700">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-700">
              Formblatt EFB-Preis {number} (VHB-Bund)
            </p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 print:text-black mt-0.5">
              {title}
            </h2>
          </div>
          <dl className="text-xs text-right space-y-0.5 text-slate-700 dark:text-slate-200 print:text-black">
            <DefRow term="Projekt" def={project.name || '—'} />
            {project.tenderNumber && <DefRow term="Vergabe-Nr." def={project.tenderNumber} />}
            {project.client && <DefRow term="Auftraggeber" def={project.client} />}
            {project.bidder && <DefRow term="Bieter" def={project.bidder} />}
            {project.deadline && <DefRow term="Abgabe" def={project.deadline} />}
          </dl>
        </div>
      </header>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function DefRow({ term, def }: { term: string; def: string }) {
  return (
    <div className="inline-flex gap-2">
      <dt className="font-semibold">{term}:</dt>
      <dd>{def}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 print:border-slate-300',
        bold && 'font-semibold text-slate-900 dark:text-slate-100 print:text-black',
        muted && 'text-slate-500 dark:text-slate-400 print:text-slate-600',
      )}
    >
      <span className="text-sm">{label}</span>
      <span className="text-sm tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-slate-200 dark:border-slate-700 print:border-slate-400" />;
}
