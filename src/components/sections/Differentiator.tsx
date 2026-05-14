import { Check, X } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const DO = [
  'Wir bepreisen jede Position einzeln auf Zeit, Geräte und Material — keine Pauschalen.',
  'Wir reichen im Namen Ihres Unternehmens ein, mit Vollmacht und Vier-Augen-Prinzip.',
  'Wir halten Submissions-Termine — auch wenn das Wochenend- oder Nachtarbeit bedeutet.',
  'Wir sagen Ihnen vor Beauftragung, ob die Voraussetzungen für eine Zusammenarbeit passen.',
];

const DONT = [
  'Wir kalkulieren keine privaten Einfamilienhaus-Bauherren — nur Bauunternehmen.',
  'Wir geben keine Festpreise ab, bevor wir das LV gesehen haben — kein Bauchgefühl.',
  'Wir nehmen keine konkurrierenden Mandate in Ihrem Einzugsgebiet und Gewerk.',
  'Wir versprechen keinen garantierten Zuschlag — das entscheidet der Auftraggeber.',
];

export default function Differentiator() {
  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <SectionHeader
          eyebrow="Klare Verhältnisse"
          title="Was wir tun — und was wir bewusst nicht tun."
          subtitle="Selbstbewusstsein vor dem Erstgespräch — damit beide Seiten keine Zeit verlieren."
        />

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-7">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-emerald-50">
                <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
              </span>
              <h3 className="font-bold text-gray-900">So arbeiten wir.</h3>
            </div>
            <ul className="space-y-4">
              {DO.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-7">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-gray-100">
                <X className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              </span>
              <h3 className="font-bold text-gray-900">Was wir nicht machen.</h3>
            </div>
            <ul className="space-y-4">
              {DONT.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                  <X className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
