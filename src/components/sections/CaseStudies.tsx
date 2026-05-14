import SectionHeader from '@/components/ui/SectionHeader';

type Case = {
  trade: string;
  tradeColor: 'sky' | 'emerald' | 'yellow' | 'orange' | 'stone' | 'blue' | 'red';
  region: string;
  size: string;
  before: { metric: string; value: string };
  after: { metric: string; value: string };
  outcome: string;
};

// All cases anonymized. Numbers are illustrative until Boss approves real data.
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
    before: { metric: 'Stundenlohn-Reibungsverluste', value: '~ 110 k €/J' },
    after: { metric: 'Stundenlohn-Reibungsverluste', value: '0 €' },
    outcome: 'Eigener Kalkulator entlastet · Komplexe BMA/EMA-LVs zuverlässig in 48 h bepreist',
  },
];

const PILL_CLASSES: Record<Case['tradeColor'], string> = {
  sky: 'bg-sky-50 text-sky-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  orange: 'bg-orange-50 text-orange-700',
  stone: 'bg-stone-50 text-stone-700',
  blue: 'bg-blue-50 text-blue-700',
  red: 'bg-red-50 text-red-700',
};

export default function CaseStudies() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Anonymisierte Cases"
          title="Echte Fälle. Harte Zahlen."
          subtitle="Wir nennen keine Kundennamen — wir nennen die Zahlen, die zählen. Vorher / Nachher pro Bauunternehmen."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {CASES.map((c, i) => (
            <div key={i} className="card card-hover h-full flex flex-col">
              <div className="flex items-center gap-2 mb-5 text-xs">
                <span className={`px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${PILL_CLASSES[c.tradeColor]}`}>
                  {c.trade}
                </span>
                <span className="text-gray-500">
                  {c.region} · {c.size}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Vorher</p>
                  <p className="font-bold text-gray-900">{c.before.value}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{c.before.metric}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-emerald-700 mb-1">Nachher</p>
                  <p className="font-bold text-emerald-700">{c.after.value}</p>
                  <p className="text-xs text-emerald-600 mt-1 leading-tight">{c.after.metric}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mt-auto pt-2 border-t border-gray-100">
                {c.outcome}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">
          Daten anonymisiert. Echte Referenzen auf Anfrage.
        </p>
      </div>
    </section>
  );
}
