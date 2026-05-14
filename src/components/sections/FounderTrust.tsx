import { Link } from 'react-router-dom';
import { Quote, Phone, Mail, ArrowRight, MapPin } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';

const VITA = [
  '20+ Jahre Erfahrung in Baukalkulation und Vergabewesen',
  'Spezialisierung auf öffentliche Vergabe nach VOB/A und VgV',
  'Aufbau eines vier-Teams-Modells: Kalkulation, Einkauf, Vergabe, Recherche',
  'Persönlicher Ansprechpartner für jeden Stamm-Mandanten',
];

export default function FounderTrust() {
  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
          {/* Photo placeholder — solid card, not gradient */}
          <div className="lg:col-span-4">
            <div className="aspect-[4/5] rounded-lg bg-primary-700 overflow-hidden flex items-center justify-center max-w-xs mx-auto lg:mx-0 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary-900/30" aria-hidden />
              <div className="relative text-center">
                <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 border border-white/20">
                  <span className="text-4xl font-extrabold text-white tracking-tight">AC</span>
                </div>
                <p className="text-xs uppercase tracking-wider text-primary-100 font-semibold">Inhaber</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <p className="text-xs uppercase tracking-wider text-primary-700 font-bold mb-3">
              Geschäftsführung
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 mb-2">
              Alaatdin Coksari
            </h2>
            <p className="text-base text-gray-600 mb-7">
              Gründer & Geschäftsführer · KALKU Baukalkulationen, {NAP.city}
            </p>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-7">
              <Quote className="w-7 h-7 text-primary-300 mb-2" strokeWidth={1.5} />
              <blockquote className="text-base text-gray-700 italic leading-relaxed">
                „Unsere Kunden sind Geschäftsführer und Inhaber, die keine Zeit haben, jede
                Ausschreibung selbst durchzurechnen — aber auch kein Angebot verpassen wollen.
                Sie denken in Zahlen und Ergebnissen, nicht in Marketingversprechen."
              </blockquote>
            </div>

            <ul className="space-y-2 mb-7">
              {VITA.map((v) => (
                <li key={v} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="w-1 h-1 rounded-full bg-primary-600 flex-shrink-0 mt-2" aria-hidden />
                  {v}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a href={telHref(NAP.phone)} className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-medium">
                <Phone className="w-4 h-4" /> {NAP.phone}
              </a>
              <span className="text-gray-300" aria-hidden>·</span>
              <a href={`mailto:${NAP.email}`} className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800 font-medium">
                <Mail className="w-4 h-4" /> {NAP.email}
              </a>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <MapPin className="w-4 h-4" /> {NAP.city}
              </span>
            </div>

            <Link to="/ueber-uns/" className="btn btn-outline mt-7">
              Mehr über das Team <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
