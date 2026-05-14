import { Link } from 'react-router-dom';
import { Quote, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

type Testimonial = {
  text: string;
  name: string;
  role: string;
  trade: string;
  region: string;
  metric: string;
  /** When true, render with subtle 'placeholder'-styling so we can ship before real reviews are in. */
  placeholder?: boolean;
};

// Real customer quotes go here once boss collects them.
// Template format (taken from Ugur's Erfolgsgeschichten draft):
//   ⋅ Name, Position, Muster GmbH
//   ⋅ Gewerk und Region
//   ⋅ Ergebnis-Kennzahl
const TESTIMONIALS: Testimonial[] = [
  {
    text:
      'Wir haben drei Submissionen mit KALKU eingereicht — zwei Zuschläge. Vorher haben wir die Kalkulation immer am Wochenende gemacht. Jetzt schicken wir das LV am Montag, am Mittwoch ist der Vorab-Entwurf da, wir korrigieren am Donnerstag, KALKU reicht am Freitag ein. Klare Aufgabenteilung.',
    name: 'Vorname N.',
    role: 'Geschäftsführer',
    trade: 'Tiefbau',
    region: 'Saarland',
    metric: '2 von 3 Submissionen gewonnen',
    placeholder: true,
  },
  {
    text:
      'Die wöchentliche Recherche-Liste ist Gold wert. Wir haben in den ersten zwei Monaten drei Submissionen entdeckt, die wir sonst übersehen hätten. Eine davon ist im Zuschlag.',
    name: 'Vorname N.',
    role: 'Inhaberin',
    trade: 'GaLaBau',
    region: 'Rheinland-Pfalz',
    metric: 'Auftragseingang +40 % in 6 Monaten',
    placeholder: true,
  },
  {
    text:
      'Was uns überzeugt hat: keine Black Box. Wir sehen jede Position vor der Einreichung — Zeit, Material, Zuschlag. Im Vergleich zu unserem alten Inhouse-Prozess deutlich transparenter.',
    name: 'Vorname N.',
    role: 'Kalkulationsleiter',
    trade: 'Elektro',
    region: 'Hessen',
    metric: 'Komplexes BMA-LV in 36 Stunden bepreist',
    placeholder: true,
  },
];

export default function Testimonials() {
  const hasReal = TESTIMONIALS.some((t) => !t.placeholder);

  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <SectionHeader
          eyebrow="Was unsere Kunden sagen"
          title="Stimmen aus der Praxis."
          subtitle={
            hasReal
              ? 'Bauunternehmer aus Saarland, RLP und Hessen — kurz erzählt, was sich für sie verändert hat.'
              : 'Kundenstimmen werden derzeit eingeholt. Diese Beispiele zeigen das Format — die Inhalte sind illustrativ, bis echte Stimmen mit Freigabe vorliegen.'
          }
        />

        <div className="grid gap-5 md:grid-cols-3 max-w-6xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <article
              key={i}
              className="bg-white border border-gray-200 rounded-lg p-6 sm:p-7 flex flex-col h-full"
            >
              <Quote className="w-7 h-7 text-primary-200 mb-4" strokeWidth={1.5} />
              <blockquote className="text-sm text-gray-700 leading-relaxed mb-6 flex-1">
                „{t.text}"
              </blockquote>

              <div className="pt-5 border-t border-gray-100">
                <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500 mb-3">
                  {t.role} · {t.trade} · {t.region}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  {t.metric}
                </div>
              </div>
            </article>
          ))}
        </div>

        {!hasReal && (
          <p className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md py-2 px-4 max-w-2xl mx-auto mt-8">
            Stimmen werden derzeit eingeholt — Format und Struktur stehen, echte Inhalte folgen.
          </p>
        )}

        <div className="text-center mt-10">
          <Link to="/referenzen/" className="btn btn-outline">
            Alle Erfolgsgeschichten <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
