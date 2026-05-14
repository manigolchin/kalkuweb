import { FileCheck, Receipt, Building2, BadgeCheck } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const REQUIREMENTS = [
  {
    icon: FileCheck,
    title: 'Referenzen',
    desc: 'Mindestens 3 vergleichbare Projekte aus Ihrem Gewerk — mit Auftraggeber, Wert und Zeitraum.',
  },
  {
    icon: Receipt,
    title: 'Finanzamt-Bescheinigung',
    desc: 'Nachweis, dass keine steuerlichen Rückstände bestehen. Bekommen Sie auf Antrag online vom Finanzamt.',
  },
  {
    icon: BadgeCheck,
    title: 'Bescheinigung Sozialkassen',
    desc: 'Nachweis ordnungsgemäß bezahlter Beiträge — z.B. SOKA-BAU für Bau und Ausbau.',
  },
  {
    icon: Building2,
    title: 'Umsatz & Mitarbeiter',
    desc: 'Ihre wirtschaftliche und personelle Leistungsfähigkeit — letzte 3 Jahre genügt.',
  },
];

export default function Eligibility() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Eignungsnachweis"
          title="Vier Unterlagen — einmalig zusammengestellt."
          subtitle="Bei der ersten Einreichung gemeinsam zusammengestellt. Danach laufen Ihre Kalkulationen und Einreichungen weitgehend automatisch."
        />

        <div className="grid gap-5 sm:grid-cols-2 max-w-5xl mx-auto">
          {REQUIREMENTS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 flex gap-4 hover:border-primary-200 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-700" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{r.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center">
          <p className="text-sm text-emerald-900">
            <strong className="font-bold">Unterlagen noch nicht vollständig?</strong> Kein
            Problem. Wir gehen das im Erstgespräch gemeinsam durch und unterstützen Sie bei der
            Zusammenstellung — das passiert nur einmal.
          </p>
        </div>
      </div>
    </section>
  );
}
