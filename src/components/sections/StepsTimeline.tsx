import SectionHeader from '@/components/ui/SectionHeader';

const STEPS = [
  {
    n: '01',
    title: 'Erstgespräch',
    desc: 'Kurzes Telefonat, 5–10 Minuten. Wir besprechen Gewerke, Zielregion und Kalkulationsgrundlagen — Mittellohn, Verrechnungssätze, Zuschläge.',
  },
  {
    n: '02',
    title: 'Beauftragung & Vollmacht',
    desc: 'Vollmacht für Materialpreisanfragen und Einreichung im Namen Ihres Unternehmens. Wir treten nach außen als Ihre interne Kalkulationsabteilung auf.',
  },
  {
    n: '03',
    title: 'Kalkulation & Einsicht',
    desc: 'Jede Position einzeln kalkuliert. Sie erhalten die fertige Kalkulation zur Einsicht, inkl. Personalaufwand und Gesamtkosten. Änderungswünsche werden eingearbeitet.',
  },
  {
    n: '04',
    title: 'Fristgerechte Einreichung',
    desc: 'Das Vergabeteam reicht das Angebot ein. Auch kurzfristige Abgaben werden eingehalten — wenn nötig über Nacht oder am Wochenende.',
  },
  {
    n: '05',
    title: 'Ergebnis & Nachbereitung',
    desc: 'Vergabeergebnis wird direkt weitergeleitet. Bei Zuschlag: Unterstützung bei Nachforderungen und Vergabegesprächen.',
  },
];

export default function StepsTimeline() {
  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <SectionHeader
          eyebrow="Ablauf"
          title="So läuft's. In fünf Schritten."
          subtitle="Vom Erstgespräch bis zum Vergabeergebnis. Sie unterschreiben nur — den Rest übernehmen wir."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="relative card-flat bg-white hover:shadow-sm transition-shadow flex flex-col"
            >
              {i < STEPS.length - 1 && (
                <span
                  className="hidden lg:block absolute top-8 -right-3 w-6 h-px bg-gray-200"
                  aria-hidden
                />
              )}
              <span className="text-4xl font-bold text-gray-200 leading-none mb-3">{s.n}</span>
              <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
