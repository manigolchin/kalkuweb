import { Link } from 'react-router-dom';
import { Phone, MessageCircle, ArrowRight, Clock } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

export default function UrgencyCta() {
  return (
    <section className="section">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl bg-primary-700 px-8 py-14 sm:px-14 sm:py-20 text-white">
          {/* subtle grid background */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-6 ring-1 ring-white/20">
              <Clock className="w-3.5 h-3.5" /> Submission morgen?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-5">
              Wir schaffen es. Auch über Nacht.
            </h2>
            <p className="text-base sm:text-lg text-primary-100 mb-9 max-w-2xl leading-relaxed">
              Kurzfristige Abgaben über Nacht oder am Wochenende — kein Aufpreis. Schicken Sie uns
              jetzt das LV. Wir melden uns innerhalb von 60 Minuten zurück.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/kontakt/"
                className="btn btn-lg bg-kalku-green text-white hover:bg-emerald-700 active:bg-emerald-800"
              >
                Erstgespräch vereinbaren
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={telHref(NAP.phone)}
                className="btn btn-lg bg-transparent text-white hover:bg-white/10 ring-1 ring-white/30"
              >
                <Phone className="w-4 h-4" /> {NAP.phone}
              </a>
              <a
                href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, wir haben eine kurzfristige Submission und brauchen Hilfe.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-lg bg-transparent text-white hover:bg-white/10 ring-1 ring-white/30"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            <p className="text-xs text-primary-200 mt-6">
              Anrufen geht immer schneller als das Formular.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
