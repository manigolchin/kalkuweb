import { ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

type Case = {
  trade: string;
  tradeColor: 'sky' | 'emerald' | 'yellow';
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
    outcome: 'Eigener Kalkulator entlastet · Komplexe BMA/EMA-LVs zuverlässig in 48 h bepreist',
  },
];

const PILL_CLASSES: Record<Case['tradeColor'], string> = {
  sky: 'bg-sky-100 text-sky-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-yellow-100 text-yellow-800',
};

export default function CaseStudies() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Anonymisierte Cases"
          title="Echte Fälle. Harte Zahlen."
          subtitle="Wir nennen keine Kundennamen — Vertraulichkeit ist nicht verhandelbar. Wir nennen die Zahlen, die zählen."
        />
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {CASES.map((c, i) => (
            <article
              key={i}
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
          Daten anonymisiert · echte Referenzen auf Anfrage
          <ArrowRight className="w-3 h-3" />
        </p>
      </div>
    </section>
  );
}
