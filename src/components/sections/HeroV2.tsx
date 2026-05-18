import { Link } from 'react-router-dom';
import { ArrowRight, Phone, FileCheck2, CheckCircle2 } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';
import HeroLvCard from './HeroLvCard';

/**
 * Premium hero — built for the skeptical Bauunternehmer.
 *
 * Visual structure:
 *   ┌──────────────── availability bar ─────────────────┐
 *   │ ● Antwort heute bis 18 Uhr · 3 freie Slots diese Woche │
 *   ├───────────────────────────────────────────────────┤
 *   │  Pattern-3 anti-marketing eyebrow                  │
 *   │  Display headline (specific, no fluff)             │
 *   │  Subhead with region + hard number + risk reversal │
 *   │                                                    │
 *   │  [ Erstgespräch vereinbaren ]  [ tel: ]            │
 *   │                                                    │
 *   │  trust strip — 4h · 7 Gewerke · ab 200 €           │
 *   └───────────────────────────────────────────────────┘
 *
 * Right column is the refined LV-card mockup (HeroLvCard.tsx).
 */
export default function HeroV2() {
  return (
    <section className="relative bg-paper border-b border-gray-200 overflow-hidden">
      {/* Subtle dot-grid background for editorial paper feel */}
      <div className="absolute inset-0 bg-dot-grid opacity-60" aria-hidden />

      {/* Top availability bar — pulses, signals "we are awake right now" */}
      <div className="relative bg-gray-900 text-gray-100">
        <div className="container-page py-2 sm:py-2.5 text-[12px] sm:text-[13px] flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <p className="inline-flex items-center gap-2">
            <span className="status-dot" aria-hidden />
            <span className="font-semibold">Antwort heute bis 18 Uhr — verbindlich zugesagt in 4 Stunden.</span>
          </p>
          <p className="text-gray-400 hidden sm:inline-flex items-center gap-3">
            <span>Aktuell <span className="text-white font-semibold">3 Slots</span> diese Woche frei</span>
            <span className="w-px h-3 bg-gray-700" aria-hidden />
            <a href={telHref(NAP.phone)} className="text-white hover:underline">
              {NAP.phone}
            </a>
          </p>
        </div>
      </div>

      <div className="relative container-page pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="lg:col-span-7 max-w-2xl">
            <p className="eyebrow-pill mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" aria-hidden />
              Kalkulationsbüro Saarbrücken · seit 2019
            </p>

            <h1 className="display-h1 mb-6">
              Keine Software. Keine KI-Plattform. <br className="hidden sm:block" />
              <span className="text-primary-600">Vier Kalkulatoren</span> bearbeiten Ihr LV —
              bis Freitag 17 Uhr.
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-9 max-w-xl">
              Outsourced Baukalkulation für mittelständische Bauunternehmen. Wir bepreisen Ihre öffentliche Ausschreibung,
              füllen Formblätter 221, 222, 223 aus und reichen <span className="font-semibold text-gray-900">in Ihrem Namen</span> ein.
              Auch über Nacht. Festpreis ab 200 €.
            </p>

            {/* Triple-CTA stack — phone primary, termin secondary, anchor scroll tertiary */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <a
                href={telHref(NAP.phone)}
                className="btn btn-success btn-lg cta-magnetic shadow-lg shadow-emerald-600/10"
              >
                <Phone className="w-4 h-4" />
                {NAP.phone}
              </a>
              <Link to="/kontakt/" className="btn btn-outline btn-lg">
                15-Min-Termin buchen
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Inline trust strip — concrete promises near the CTA */}
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-gray-600">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                <span>LV in <span className="font-bold text-gray-900">48 h</span> bepreist</span>
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                <span>Festpreis ab <span className="font-bold text-gray-900">200 €</span></span>
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                <span><span className="font-bold text-gray-900">4-Augen-Prinzip</span> · NDA standard</span>
              </li>
            </ul>

            {/* Discreet anchor — speaks to the high-intent owner who skipped above */}
            <p className="mt-9 text-xs text-gray-500 inline-flex items-center gap-2">
              <FileCheck2 className="w-3.5 h-3.5" />
              Kostenlose LV-Vorprüfung — schicken Sie Ihre GAEB-Datei an{' '}
              <a href={`mailto:${NAP.email}`} className="text-primary-700 font-medium hover:underline">
                {NAP.email}
              </a>
            </p>
          </div>

          {/* Right — LV card */}
          <div className="lg:col-span-5">
            <HeroLvCard />
          </div>
        </div>
      </div>
    </section>
  );
}
