import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';
import SectionHeader from '@/components/ui/SectionHeader';
import MultiStepForm from '@/components/forms/MultiStepForm';

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

      {/* HERO + FORMULAR */}
      <section
        id="anfrage-formular"
        className="relative scroll-mt-24 py-16 sm:py-24 bg-gradient-to-br from-primary-50 via-white to-gray-50"
      >
        <div id="termin" className="scroll-mt-24" />
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="eyebrow mb-3">jetzt starten</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4 leading-tight">
              Sie kalkulieren noch alles selbst?
            </h1>
            <p className="text-lg text-gray-600">
              Lassen Sie uns in 5 Minuten besprechen, wie wir Ihre Kalkulationsabteilung entlasten können.
            </p>
          </div>
          <MultiStepForm />
        </div>
      </section>

      {/* DIRECT CONTACT GRID */}
      <section className="section-tight">
        <div className="container-page">
          <SectionHeader
            eyebrow="Oder direkt"
            title="Lieber persönlich? Geht auch."
            subtitle="Telefon, WhatsApp oder E-Mail — wählen Sie den Weg, der Ihnen am liebsten ist."
          />
          <div className="grid gap-5 sm:grid-cols-3 max-w-4xl mx-auto">
            <a href={telHref(NAP.phone)} className="card card-hover text-center">
              <Phone className="w-7 h-7 text-primary-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Anrufen</p>
              <p className="text-sm text-gray-600">{NAP.phone}</p>
            </a>
            <a
              href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich habe eine Frage.')}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover text-center"
            >
              <MessageCircle className="w-7 h-7 text-emerald-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">WhatsApp</p>
              <p className="text-sm text-gray-600">{NAP.whatsapp}</p>
            </a>
            <a href={`mailto:${NAP.email}`} className="card card-hover text-center">
              <Mail className="w-7 h-7 text-primary-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">E-Mail</p>
              <p className="text-sm text-gray-600 break-all">{NAP.email}</p>
            </a>
          </div>
        </div>
      </section>

      {/* STANDORT */}
      <section className="section">
        <div className="container-page">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <p className="eyebrow mb-3">Standort</p>
              <p className="flex items-center justify-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-primary-500" aria-hidden="true" />
                {NAP.street}, {NAP.postalCode} {NAP.city}
              </p>
            </div>
            <div className="aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
              <iframe
                title={`KALKU Standort ${NAP.city} — ${NAP.street}`}
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${NAP.geo.lng - 0.005}%2C${NAP.geo.lat - 0.003}%2C${NAP.geo.lng + 0.005}%2C${NAP.geo.lat + 0.003}&layer=mapnik&marker=${NAP.geo.lat}%2C${NAP.geo.lng}`}
                className="w-full h-full block"
              />
            </div>
            <p className="text-center text-xs text-gray-500 mt-3">
              <a
                href={`https://www.openstreetmap.org/?mlat=${NAP.geo.lat}&mlon=${NAP.geo.lng}&zoom=17`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600 hover:underline"
              >
                Größere Karte auf OpenStreetMap öffnen ↗
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
