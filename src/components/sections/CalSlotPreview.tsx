import { Link } from 'react-router-dom';
import { Calendar, Clock3, Phone, ArrowRight, MessageCircle } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

/**
 * Cal-slot preview — visual placeholder for available 15-min slots.
 *
 * Real Cal.com / Calendly integration lives on /kontakt/. Here we surface
 * a "next available" preview to anchor the CTA in something concrete —
 * the visitor sees "Donnerstag 14:30" and the abstract idea of "Termin"
 * becomes a specific decision point.
 */
const SLOTS = [
  { day: 'Heute', time: '15:30', available: true },
  { day: 'Heute', time: '17:00', available: true },
  { day: 'Morgen', time: '08:30', available: true },
  { day: 'Morgen', time: '10:00', available: false },
  { day: 'Morgen', time: '14:30', available: true },
  { day: 'Donnerstag', time: '09:00', available: true },
];

export default function CalSlotPreview() {
  return (
    <section className="section bg-paper">
      <div className="container-page">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Copy */}
          <div>
            <p className="eyebrow-pill mb-5">
              <Calendar className="w-3 h-3" /> Erstgespräch in 15 Minuten
            </p>
            <h2 className="display-h2 mb-5">
              Wählen Sie einen Slot — wir rufen pünktlich an.
            </h2>
            <p className="prose-body text-lg mb-7">
              Fünf bis zehn Minuten Telefonat. Wir besprechen Gewerk, Region, Mittellohn und prüfen,
              ob KALKU für Ihr Unternehmen passt. Kostenlos. Unverbindlich. Keine Folge-Marketingmails.
            </p>

            <ul className="space-y-3 mb-9 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <Clock3 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                <span>15 Minuten · per Telefon oder Microsoft Teams</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock3 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                <span>Sie sprechen direkt mit Alaatdin Coksari, dem Inhaber</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock3 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                <span>Am Ende wissen Sie, ob es passt — auf beiden Seiten</span>
              </li>
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/kontakt/#termin" className="btn btn-success btn-lg cta-magnetic">
                Slot wählen <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich hätte gerne ein Erstgespräch.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>

          {/* Slot grid */}
          <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                <p className="text-sm font-bold text-gray-900">Nächste freie Slots</p>
              </div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 inline-flex items-center gap-1.5">
                <span className="status-dot" aria-hidden />
                Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SLOTS.map((s, i) => (
                <Link
                  key={i}
                  to="/kontakt/#termin"
                  aria-disabled={!s.available}
                  className={`relative rounded-lg ring-1 px-3.5 py-3 text-left transition-colors ${
                    s.available
                      ? 'ring-gray-200 hover:ring-primary-500 hover:bg-primary-50/40 bg-white'
                      : 'ring-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed pointer-events-none line-through'
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">
                    {s.day}
                  </p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">{s.time}</p>
                </Link>
              ))}
            </div>

            <p className="text-[11px] text-gray-500 mt-5 leading-relaxed text-center">
              Vorschau · finale Bestätigung im Kalender auf{' '}
              <Link to="/kontakt/#termin" className="text-primary-700 font-medium hover:underline">
                /kontakt/
              </Link>
              . Lieber sofort sprechen?{' '}
              <a href={telHref(NAP.phone)} className="text-primary-700 font-medium hover:underline inline-flex items-center gap-1">
                <Phone className="w-3 h-3" /> {NAP.phone}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
