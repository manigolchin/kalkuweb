import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';

const TITLE = 'Kontakt — Erstgespräch in 5 Minuten | KALKU';
const DESC =
  'Erstgespräch vereinbaren oder direkt anrufen. Kostenlos, unverbindlich. Telefon, WhatsApp, E-Mail oder Termin online buchen.';

export default function Kontakt() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/kontakt/')} />
      </Helmet>

      <section className="section">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="eyebrow mb-3">Kontakt</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5">
              Lassen Sie uns 5 Minuten sprechen.
            </h1>
            <p className="text-lg text-gray-600">
              Wir prüfen kostenlos, ob KALKU für Ihr Unternehmen passt — und legen los, wenn die
              Voraussetzungen passen.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <a href={telHref(NAP.phone)} className="card card-hover">
              <Phone className="w-6 h-6 text-primary-500 mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Anrufen</p>
              <p className="text-sm text-gray-600">{NAP.phone}</p>
            </a>
            <a
              href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich habe eine Frage zu Ihrer Kalkulationsdienstleistung.')}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover"
            >
              <MessageCircle className="w-6 h-6 text-emerald-600 mb-3" />
              <p className="font-semibold text-gray-900 mb-1">WhatsApp</p>
              <p className="text-sm text-gray-600">{NAP.whatsapp}</p>
            </a>
            <a href={`mailto:${NAP.email}`} className="card card-hover">
              <Mail className="w-6 h-6 text-primary-500 mb-3" />
              <p className="font-semibold text-gray-900 mb-1">E-Mail</p>
              <p className="text-sm text-gray-600">{NAP.email}</p>
            </a>
          </div>

          <div className="card mt-12 max-w-2xl mx-auto text-center">
            <p className="eyebrow mb-3">Standort</p>
            <p className="flex items-center justify-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4" />
              {NAP.street}, {NAP.postalCode} {NAP.city}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Cal.com-Termin-Picker, Mehrstufen-Formular und Self-Check folgen in Phase 3.4.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
