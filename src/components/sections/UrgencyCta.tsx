import { Link } from 'react-router-dom';
import { Phone, MessageCircle, ArrowRight, Clock } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

export default function UrgencyCta() {
  return (
    <section className="section">
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-3xl bg-editorial-dark px-8 py-14 sm:px-14 sm:py-20 text-white ring-1 ring-white/5 shadow-2xl shadow-primary-900/30">
          {/* Layer 1 — aurora orbs for color depth */}
          <span aria-hidden className="aurora-orb aurora-emerald w-[40rem] h-[40rem] -top-40 -right-40" />
          <span aria-hidden className="aurora-orb aurora-petrol w-[36rem] h-[36rem] -bottom-48 -left-32" />

          {/* Layer 2 — masked grid pattern */}
          <div aria-hidden className="absolute inset-0 bg-grid-fade" />

          {/* Layer 3 — soft spotlight to focus content */}
          <div aria-hidden className="absolute inset-0 bg-spotlight" />

          {/* Layer 4 — noise grain for tactile feel */}
          <div aria-hidden className="absolute inset-0 bg-noise" />

          {/* Layer 5 — horizon glow at top edge */}
          <span aria-hidden className="absolute inset-x-12 top-0 edge-glow-top" />

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] text-white text-[11px] font-bold uppercase tracking-[0.16em] mb-7 ring-1 ring-white/15 backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Submission morgen?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.05] mb-6">
              Wir schaffen es. <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                Auch über Nacht.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-primary-100/90 mb-10 max-w-2xl leading-relaxed">
              Kurzfristige Abgaben über Nacht oder am Wochenende — kein Aufpreis. Schicken Sie uns
              jetzt das LV. Wir melden uns innerhalb von 60 Minuten zurück.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/kontakt/"
                className="btn btn-lg bg-kalku-green text-white hover:bg-emerald-700 active:bg-emerald-800 cta-magnetic shadow-lg shadow-emerald-600/20"
              >
                Erstgespräch vereinbaren
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={telHref(NAP.phone)}
                className="btn btn-lg bg-white/[0.04] text-white hover:bg-white/10 ring-1 ring-white/20 backdrop-blur-sm"
              >
                <Phone className="w-4 h-4" /> {NAP.phone}
              </a>
              <a
                href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, wir haben eine kurzfristige Submission und brauchen Hilfe.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-lg bg-white/[0.04] text-white hover:bg-white/10 ring-1 ring-white/20 backdrop-blur-sm"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            <p className="text-xs text-primary-200/70 mt-7 inline-flex items-center gap-2">
              <span className="status-dot" aria-hidden />
              Anrufen geht immer schneller als das Formular.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
