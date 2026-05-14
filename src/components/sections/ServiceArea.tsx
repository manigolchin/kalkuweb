import { MapPin } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const SCHWERPUNKT = ['Saarland', 'Rheinland-Pfalz', 'Hessen'];
const BUNDESWEIT = [
  'Nordrhein-Westfalen', 'Baden-Württemberg', 'Bayern',
  'Niedersachsen', 'Schleswig-Holstein', 'Hamburg', 'Bremen',
  'Berlin', 'Brandenburg', 'Mecklenburg-Vorpommern',
  'Sachsen', 'Sachsen-Anhalt', 'Thüringen',
];

/**
 * Visual approximation of "Schwerpunkt + bundesweit". A real SVG map of
 * Germany would be the next step (e.g. via simplemaps), but this chips
 * version is faster to ship and reads cleanly without imagery dependencies.
 */
export default function ServiceArea() {
  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <SectionHeader
          eyebrow="Einzugsgebiet"
          title="Sitz Saarbrücken. Bundesweit für Sie tätig."
          subtitle="Schwerpunkt Saarland, Rheinland-Pfalz und Hessen. Mandate aus allen Bundesländern willkommen — alle Submissionen lassen sich digital betreuen."
        />

        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
            <div className="mb-7">
              <p className="text-xs uppercase tracking-wider font-bold text-primary-700 mb-3 inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 fill-current" /> Schwerpunkt-Region
              </p>
              <div className="flex flex-wrap gap-2">
                {SCHWERPUNKT.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-semibold shadow-sm"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">
                Auch bundesweit aktiv
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BUNDESWEIT.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-7 pt-5 border-t border-gray-100">
              Im Schwerpunkt-Gebiet bieten wir Loyalität & Gebietsschutz — pro Gewerk arbeiten
              wir dort exklusiv für Ihr Unternehmen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
