import SectionHeader from '@/components/ui/SectionHeader';

const STEPS = [
  {
    n: '01',
    title: 'Erstgespräch',
    desc: 'Telefonat 5–10 Minuten. Gewerke, Region, Mittellohn, Verrechnungssätze, Zuschläge.',
  },
  {
    n: '02',
    title: 'Vollmacht',
    desc: 'Materialanfragen und Einreichung im Namen Ihres Unternehmens. Wir treten als Ihre Kalkulationsabteilung auf.',
  },
  {
    n: '03',
    title: 'Kalkulation',
    desc: 'Position für Position. Sie erhalten die fertige Kalkulation zur Einsicht inkl. Personalaufwand.',
  },
  {
    n: '04',
    title: 'Einreichung',
    desc: 'Fristgerecht. Auch über Nacht oder am Wochenende — wenn die Submission morgen ist.',
  },
  {
    n: '05',
    title: 'Nachbereitung',
    desc: 'Vergabeergebnis sofort weitergeleitet. Bei Zuschlag: Unterstützung bei Nachforderungen.',
  },
];

export default function StepsTimeline() {
  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <SectionHeader
          eyebrow="Ablauf"
          title="Fünf Schritte — vom Erstgespräch bis zur Einreichung."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 max-w-6xl mx-auto">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="relative bg-white border border-gray-200 rounded-lg p-5 flex flex-col"
            >
              {i < STEPS.length - 1 && (
                <span
                  className="hidden lg:block absolute top-9 -right-2 w-4 h-px bg-gray-300"
                  aria-hidden
                />
              )}
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary-700 text-white text-xs font-bold mb-4">
                {s.n}
              </span>
              <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
