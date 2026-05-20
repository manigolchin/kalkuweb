import { useMemo } from 'react';
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
  | 'indigo';

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
};

const VISIBLE_CASES = 3;

function pickCases(pool: Case[], n: number): Case[] {
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function CaseStudies() {
  const visible = useMemo(() => pickCases(CASES, VISIBLE_CASES), []);

  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Anonymisierte Cases"
          title="Echte Fälle. Harte Zahlen."
          subtitle="Wir nennen keine Kundennamen — Vertraulichkeit ist nicht verhandelbar. Wir nennen die Zahlen, die zählen."
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
        <p className="text-center text-xs text-gray-500 mt-8 inline-flex items-center justify-center w-full gap-1.5">
          {CASES.length} Cases im Pool · jeder Aufruf zeigt eine neue Auswahl · echte Referenzen auf Anfrage
          <ArrowRight className="w-3 h-3" />
        </p>
      </div>
    </section>
  );
}
