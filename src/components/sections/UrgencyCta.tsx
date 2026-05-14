import { Link } from 'react-router-dom';
import { Clock, ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

export default function UrgencyCta() {
  return (
    <section className="section">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-700 p-10 sm:p-16 text-white">
          {/* decorative blob */}
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"
          />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold uppercase tracking-wider mb-6">
              <Clock className="w-3.5 h-3.5" /> Submission morgen?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
              Wir schaffen es. Auch über Nacht.
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl">
              Kurzfristige Abgaben über Nacht oder am Wochenende — kein Aufpreis. Schicken Sie uns
              jetzt das LV, wir melden uns innerhalb von 60 Minuten.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/kontakt/"
                className="btn btn-lg bg-white text-primary-700 hover:bg-gray-100 active:bg-gray-200 shadow-lg"
              >
                Erstgespräch vereinbaren
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={telHref(NAP.phone)}
                className="btn btn-lg bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm"
              >
                <Phone className="w-4 h-4" /> {NAP.phone}
              </a>
              <a
                href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, wir haben eine kurzfristige Submission und brauchen Hilfe.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-lg bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
