import { FileSpreadsheet, ClipboardList, SendHorizonal } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const DELIVERABLES = [
  {
    icon: FileSpreadsheet,
    pos: '01',
    title: 'Bepreistes Leistungsverzeichnis',
    body:
      'Jede Position einzeln auf Zeit, Geräte und Material kalkuliert — nach Ihren Vorgaben (Mittellohn, Verrechnungssätze, Zuschläge). Sie sehen die Vorab-Version, bevor wir einreichen.',
    detail: 'GAEB X83/X84/D83 · PDF · Excel',
    accent: 'bg-primary-50 text-primary-700 ring-primary-100',
  },
  {
    icon: ClipboardList,
    pos: '02',
    title: 'EFB-Formblätter 221 · 222 · 223',
    body:
      'Vollständig ausgefüllte EFB-Preisblätter samt Urkalkulation. Logisch ableitbar aus der Positions-Kalkulation — keine nachträglichen Pauschal-Aufschläge, kein Erklärungsnotstand bei Aufklärungsersuchen.',
    detail: 'inkl. Urkalkulation · DIN-konform',
    accent: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  {
    icon: SendHorizonal,
    pos: '03',
    title: 'Einreichung in Ihrem Namen',
    body:
      'Wir reichen fristgerecht ein — über das jeweilige Vergabeportal oder klassisch postalisch. Auch über Nacht, auch sonntags. Sie unterschreiben die Vollmacht einmalig; wir treten nach außen als Ihre Kalkulationsabteilung auf.',
    detail: 'Vollmacht · fristgerecht · 4-Augen-geprüft',
    accent: 'bg-amber-50 text-amber-800 ring-amber-100',
  },
];

export default function Deliverables() {
  return (
    <section className="section bg-white">
      <div className="container-page">
        <SectionHeader
          eyebrow="Was Sie konkret bekommen"
          title="Drei Lieferungen pro Submission. Mehr nicht."
          subtitle="Wir verkaufen keinen abstrakten Service. Wir liefern drei greifbare Ergebnisse — bevor die Submissionsfrist abläuft."
        />

        <div className="grid gap-px bg-gray-200 rounded-2xl overflow-hidden ring-1 ring-gray-200 max-w-6xl mx-auto md:grid-cols-3">
          {DELIVERABLES.map((d) => {
            const Icon = d.icon;
            return (
              <article
                key={d.pos}
                className="bg-white p-7 sm:p-8 flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <span className={`inline-flex w-11 h-11 items-center justify-center rounded-xl ring-1 ${d.accent}`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-bold tabular-nums">
                    {d.pos}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{d.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">{d.body}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-bold pt-4 border-t border-gray-100">
                  {d.detail}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
