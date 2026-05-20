import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

type TradeColor =
  | 'sky'
  | 'emerald'
  | 'yellow'
  | 'rose'
  | 'amber'
  | 'slate'
  | 'violet'
  | 'orange'
  | 'teal'
  | 'indigo'
  | 'gray'
  | 'lime'
  | 'cyan'
  | 'zinc'
  | 'red'
  | 'stone'
  | 'blue'
  | 'fuchsia';

type Case = {
  trade: string;
  tradeColor: TradeColor;
  region: string;
  size: string;
  before: { metric: string; value: string };
  after: { metric: string; value: string };
  outcome: string;
};

const CASES: Case[] = [
  {
    trade: 'Tiefbau',
    tradeColor: 'sky',
    region: 'Saarland',
    size: '12 MA',
    before: { metric: 'Eigenaufwand pro Submission', value: '40 Std.' },
    after: { metric: 'Eigenaufwand pro Submission', value: '4 Std.' },
    outcome: '14 Submissions in 2025 · 4 Zuschläge · ⌀ 280 k € Auftragsvolumen',
  },
  {
    trade: 'GaLaBau',
    tradeColor: 'emerald',
    region: 'Rheinland-Pfalz',
    size: '8 MA',
    before: { metric: 'Submissionen / Quartal', value: '2' },
    after: { metric: 'Submissionen / Quartal', value: '7' },
    outcome: 'Eigene Recherche entfällt · Inhaber zurück auf der Baustelle · 3 Zuschläge in Q1',
  },
  {
    trade: 'Elektro',
    tradeColor: 'yellow',
    region: 'Hessen',
    size: '35 MA',
    before: { metric: 'Reibungsverluste / Jahr', value: '~ 110 k €' },
    after: { metric: 'Reibungsverluste / Jahr', value: '0 €' },
    outcome: 'Eigener Kalkulator entlastet · komplexe BMA/EMA-LVs zuverlässig in 48 h bepreist',
  },
  {
    trade: 'SHK',
    tradeColor: 'rose',
    region: 'NRW',
    size: '22 MA',
    before: { metric: 'Angebotsquote', value: '8 %' },
    after: { metric: 'Angebotsquote', value: '34 %' },
    outcome: '9 Aufträge in H1 · ⌀ 165 k € Volumen · keine Wochenend-Kalkulationen mehr',
  },
  {
    trade: 'Trockenbau',
    tradeColor: 'amber',
    region: 'Bayern',
    size: '18 MA',
    before: { metric: 'Kalkulationsdurchlauf pro LV', value: '6 Tage' },
    after: { metric: 'Kalkulationsdurchlauf pro LV', value: '1,5 Tage' },
    outcome: '22 Submissionen ohne Überstunden · Inhaber kalkuliert nur noch strategische LVs selbst',
  },
  {
    trade: 'Rohbau',
    tradeColor: 'slate',
    region: 'Baden-Württemberg',
    size: '45 MA',
    before: { metric: 'Margenkorridor (Soll vs. Ist)', value: '± 9 %' },
    after: { metric: 'Margenkorridor (Soll vs. Ist)', value: '± 2,5 %' },
    outcome: 'Festkalkulation in 48 h · 6 Zuschläge in 2025 · stabile Deckungsbeiträge im Großprojektbereich',
  },
  {
    trade: 'Maler & Lack',
    tradeColor: 'violet',
    region: 'Saarland',
    size: '9 MA',
    before: { metric: 'Verlorene Submissionen wegen Termin', value: '6 / Jahr' },
    after: { metric: 'Verlorene Submissionen wegen Termin', value: '0' },
    outcome: 'Inhaber wieder als Bauleiter aktiv · Angebote pünktlich auch in Stoßzeiten',
  },
  {
    trade: 'Dachdecker',
    tradeColor: 'orange',
    region: 'Pfalz',
    size: '14 MA',
    before: { metric: 'Angebote / Monat', value: '3' },
    after: { metric: 'Angebote / Monat', value: '11' },
    outcome: 'Auslastung 2026 zu 78 % vorab gesichert · Festpreismodell macht Akquise planbar',
  },
  {
    trade: 'Estrich & Boden',
    tradeColor: 'teal',
    region: 'Hessen',
    size: '11 MA',
    before: { metric: 'Eigenaufwand pro Submission', value: '32 Std.' },
    after: { metric: 'Eigenaufwand pro Submission', value: '3 Std.' },
    outcome: '5 Zuschläge in Q2 · saisonale Lastspitzen ohne externe Aushilfen abgefangen',
  },
  {
    trade: 'Metallbau',
    tradeColor: 'indigo',
    region: 'NRW',
    size: '28 MA',
    before: { metric: 'Bepreisung Mischgewerk', value: '7 – 10 Tage' },
    after: { metric: 'Bepreisung Mischgewerk', value: '72 Std.' },
    outcome: 'LV + Schmiede-Sondergewerke in einem Aufwasch · Inhaber pflegt nur noch Stammdaten',
  },
  {
    trade: 'Straßen- & Asphaltbau',
    tradeColor: 'gray',
    region: 'Bayern',
    size: '38 MA',
    before: { metric: 'EFB-Nachweise pro Großlos', value: '3 Wochen' },
    after: { metric: 'EFB-Nachweise pro Großlos', value: '4 Tage' },
    outcome: '4 Großlose 2025 · ⌀ 720 k € Volumen · Vermessungsdaten direkt in die Massenermittlung übernommen',
  },
  {
    trade: 'Zimmerei & Holzbau',
    tradeColor: 'lime',
    region: 'Schwarzwald',
    size: '16 MA',
    before: { metric: 'Auslastung Q4 – Q1', value: '35 %' },
    after: { metric: 'Auslastung Q4 – Q1', value: '92 %' },
    outcome: 'Erstmals durchgehende Auftragslage über Winter · 2 Kita-Holzbauten in Q1 gewonnen',
  },
  {
    trade: 'Fliesenleger',
    tradeColor: 'cyan',
    region: 'NRW',
    size: '7 MA',
    before: { metric: 'Submissionen / Monat', value: '1' },
    after: { metric: 'Submissionen / Monat', value: '4' },
    outcome: '11 öffentliche Aufträge in 2025 · Inhaber kalkuliert nur noch Sonderbeläge selbst',
  },
  {
    trade: 'Abbruch & Rückbau',
    tradeColor: 'zinc',
    region: 'Sachsen',
    size: '24 MA',
    before: { metric: 'Massenermittlung pro LV', value: '5 Tage' },
    after: { metric: 'Massenermittlung pro LV', value: '1 Tag' },
    outcome: '⌀ 220 k € Volumen · präzise Entsorgungskosten reduzieren Nachträge spürbar',
  },
  {
    trade: 'Brandschutz',
    tradeColor: 'red',
    region: 'Hamburg',
    size: '19 MA',
    before: { metric: 'Angebotsquote', value: '12 %' },
    after: { metric: 'Angebotsquote', value: '41 %' },
    outcome: 'Komplexe BMA- & Sprinkler-LVs ohne Nachtrags-Konflikte · 3 Folgeaufträge im selben Quartal',
  },
  {
    trade: 'Fassade & WDVS',
    tradeColor: 'stone',
    region: 'Niedersachsen',
    size: '14 MA',
    before: { metric: 'Sondergerüst-Bepreisung', value: '5 Tage' },
    after: { metric: 'Sondergerüst-Bepreisung', value: '48 h' },
    outcome: '3 Großaufträge gegen Konzern-GU gewonnen · stabile Marge trotz Materialpreis-Volatilität',
  },
  {
    trade: 'HLK Industrie',
    tradeColor: 'blue',
    region: 'Bayern',
    size: '52 MA',
    before: { metric: 'Industrieanlagen-LV Durchlauf', value: '3 Wochen' },
    after: { metric: 'Industrieanlagen-LV Durchlauf', value: '96 Std.' },
    outcome: 'Lebensmittel- & Pharma-Industrie als Stammkunden · 2 Rahmenverträge in Süddeutschland',
  },
  {
    trade: 'Schlosserei & Stahlbau',
    tradeColor: 'fuchsia',
    region: 'Saarland',
    size: '6 MA',
    before: { metric: 'Submissionsteilnahme / Jahr', value: '0' },
    after: { metric: 'Submissionsteilnahme / Jahr', value: '9' },
    outcome: 'KALKU als externe Kalkulationsabteilung · 5 Schul- & Verwaltungsbauten 2025 erstmals direkt gewonnen',
  },
];

const PILL_CLASSES: Record<TradeColor, string> = {
  sky: 'bg-sky-100 text-sky-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  rose: 'bg-rose-100 text-rose-800',
  amber: 'bg-amber-100 text-amber-800',
  slate: 'bg-slate-100 text-slate-800',
  violet: 'bg-violet-100 text-violet-800',
  orange: 'bg-orange-100 text-orange-800',
  teal: 'bg-teal-100 text-teal-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  gray: 'bg-gray-100 text-gray-800',
  lime: 'bg-lime-100 text-lime-800',
  cyan: 'bg-cyan-100 text-cyan-800',
  zinc: 'bg-zinc-100 text-zinc-800',
  red: 'bg-red-100 text-red-800',
  stone: 'bg-stone-100 text-stone-800',
  blue: 'bg-blue-100 text-blue-800',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800',
};

const SAMPLE_SIZE = 3;

function shuffle(pool: Case[]): Case[] {
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Props = {
  showAll?: boolean;
};

export default function CaseStudies({ showAll = false }: Props) {
  const visible = useMemo(
    () => (showAll ? CASES : shuffle(CASES).slice(0, SAMPLE_SIZE)),
    [showAll],
  );

  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Anonymisierte Cases"
          title="Echte Fälle. Harte Zahlen."
          subtitle={
            showAll
              ? 'Alle Cases im Pool. Vertraulich und anonymisiert — die Zahlen, die zählen.'
              : 'Wir nennen keine Kundennamen — Vertraulichkeit ist nicht verhandelbar. Wir nennen die Zahlen, die zählen.'
          }
        />
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {visible.map((c) => (
            <article
              key={c.trade}
              className="bg-white border border-gray-200 rounded-lg p-6 sm:p-7 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${PILL_CLASSES[c.tradeColor]}`}>
                  {c.trade}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {c.region} · {c.size}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Vorher</p>
                  <p className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight">{c.before.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.before.metric}</p>
                </div>
                <div className="h-px bg-gray-200" aria-hidden />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold mb-1">Nachher mit KALKU</p>
                  <p className="text-3xl font-extrabold text-emerald-700 tabular-nums tracking-tight">{c.after.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.after.metric}</p>
                </div>
              </div>

              <div className="mt-auto pt-5 border-t border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">{c.outcome}</p>
              </div>
            </article>
          ))}
        </div>

        {!showAll && (
          <div className="flex justify-center mt-10">
            <Link
              to="/referenzen/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Alle {CASES.length} Cases ansehen
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-5">
          Daten anonymisiert · echte Referenzen auf Anfrage
        </p>
      </div>
    </section>
  );
}
