import { Link } from 'react-router-dom';
import { Phone, Mail, ArrowRight, MapPin, Quote } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';

const VITA = [
  'Über 20 Jahre Erfahrung in Baukalkulation und Vergabewesen',
  'Spezialisierung auf öffentliche Vergabe nach VOB/A und VgV',
  'Aufbau des Vier-Teams-Modells: Kalkulation, Einkauf, Vergabe, Recherche',
  'Persönlicher Ansprechpartner für jeden Stamm-Mandanten',
];

export default function FounderTrust() {
  return (
    <section className="section bg-paper">
      <div className="container-page">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Monogram portrait — premium plate, signed feel */}
          <div className="lg:col-span-4">
            <div className="relative max-w-xs mx-auto lg:mx-0">
              <div
                aria-hidden
                className="absolute -inset-2 bg-gradient-to-br from-primary-100 to-emerald-50/30 rounded-2xl blur-2xl opacity-60"
              />
              <div className="relative aspect-[4/5] rounded-2xl bg-gradient-to-br from-primary-700 via-primary-700 to-primary-900 overflow-hidden flex flex-col items-center justify-end p-7 ring-1 ring-primary-900/10 shadow-xl">
                {/* Faint paper texture — diagonal stripes */}
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, white 0, white 1px, transparent 1px, transparent 22px)',
                  }}
                />

                <div className="relative flex-1 flex items-center justify-center w-full">
                  <span
                    className="monogram text-[7rem] sm:text-[8rem] leading-none text-white/95 tracking-tighter"
                    aria-hidden
                  >
                    AC
                  </span>
                </div>

                <div className="relative w-full text-center pt-5 border-t border-white/20">
                  <p className="text-sm font-bold text-white">Alaatdin Coksari</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary-200 font-semibold mt-0.5">
                    Gründer · seit 2012
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <p className="eyebrow-pill mb-5">Geschäftsführung</p>
            <h2 className="display-h2 mb-3">
              Sie sprechen direkt mit Alaatdin Coksari.
            </h2>
            <p className="text-base text-gray-600 mb-8">
              Kein Vertriebsfilter, kein Account-Manager. Im Erstgespräch ist der Inhaber persönlich am Telefon —
              auch danach.
            </p>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 mb-8 shadow-sm">
              <Quote className="w-7 h-7 text-primary-300 mb-3" strokeWidth={1.5} />
              <blockquote className="text-base sm:text-lg text-gray-800 italic leading-relaxed">
                „Unsere Kunden sind Geschäftsführer und Inhaber, die keine Zeit haben, jede Ausschreibung selbst
                durchzurechnen — aber auch kein Angebot verpassen wollen. Sie denken in Zahlen und Ergebnissen,
                nicht in Marketingversprechen."
              </blockquote>
            </div>

            <ul className="space-y-2.5 mb-8">
              {VITA.map((v) => (
                <li key={v} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-600 flex-shrink-0 mt-2" aria-hidden />
                  <span className="leading-relaxed">{v}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm pt-6 border-t border-gray-200">
              <a
                href={telHref(NAP.phone)}
                className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-semibold"
              >
                <Phone className="w-4 h-4" /> {NAP.phone}
              </a>
              <a
                href={`mailto:${NAP.email}?subject=Erstgespraech%20mit%20Alaatdin`}
                className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-semibold"
              >
                <Mail className="w-4 h-4" /> {NAP.email}
              </a>
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <MapPin className="w-4 h-4" /> {NAP.street}, {NAP.city}
              </span>
            </div>

            <Link to="/ueber-uns/" className="btn btn-outline mt-7">
              Über das Team <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
