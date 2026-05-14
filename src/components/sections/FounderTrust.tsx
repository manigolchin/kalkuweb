import { Link } from 'react-router-dom';
import { Quote, MapPin, Phone, Mail } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';

export default function FounderTrust() {
  return (
    <section className="section">
      <div className="container-page">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14 items-center">
          {/* Photo placeholder — replaced with real photo in Phase 5 */}
          <div className="lg:col-span-2">
            <div className="relative aspect-[4/5] rounded-3xl bg-gradient-to-br from-primary-100 via-primary-50 to-emerald-50 overflow-hidden flex items-center justify-center max-w-sm mx-auto lg:mx-0">
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-full bg-primary-500/20 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary-700">AC</span>
                </div>
                <p className="text-sm text-primary-700 font-medium">Foto folgt</p>
                <p className="text-xs text-primary-600 mt-1">Inhaber-Portrait wird ergänzt</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="eyebrow mb-3">Inhaber</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-5">
              Alaatdin Coksari
            </h2>
            <Quote className="w-8 h-8 text-primary-200 mb-2" />
            <blockquote className="text-lg text-gray-700 italic leading-relaxed mb-7">
              „Unsere Kunden sind Geschäftsführer und Inhaber, die keine Zeit haben, jede
              Ausschreibung selbst durchzurechnen — aber auch kein Angebot verpassen wollen.
              Sie denken in Zahlen und Ergebnissen, nicht in Marketingversprechen."
            </blockquote>

            <div className="grid sm:grid-cols-3 gap-3 mb-7">
              <div className="card-flat">
                <p className="text-2xl font-bold text-primary-600">20+</p>
                <p className="text-xs text-gray-500 mt-1">Jahre Kalkulationserfahrung im Team</p>
              </div>
              <div className="card-flat">
                <p className="text-2xl font-bold text-primary-600">7</p>
                <p className="text-xs text-gray-500 mt-1">Gewerke aus einer Hand</p>
              </div>
              <div className="card-flat">
                <p className="text-2xl font-bold text-primary-600">DE</p>
                <p className="text-xs text-gray-500 mt-1">Bundesweit tätig — Sitz {NAP.city}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <MapPin className="w-4 h-4" /> {NAP.city}
              </span>
              <span className="text-gray-300">·</span>
              <a
                href={telHref(NAP.phone)}
                className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700"
              >
                <Phone className="w-4 h-4" /> {NAP.phone}
              </a>
              <span className="text-gray-300">·</span>
              <a
                href={`mailto:${NAP.email}`}
                className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700"
              >
                <Mail className="w-4 h-4" /> {NAP.email}
              </a>
            </div>

            <div className="mt-7">
              <Link to="/ueber-uns/" className="btn btn-outline">
                Mehr über das Team
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
