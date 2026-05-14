import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, MessageCircle, Calendar } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';
import SectionHeader from '@/components/ui/SectionHeader';
import MultiStepForm from '@/components/forms/MultiStepForm';
import CalendlyEmbed from '@/components/CalendlyEmbed';

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

      {/* HERO */}
      <section className="section-tight bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-3">Kontakt</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              Lassen Sie uns 5 Minuten sprechen.
            </h1>
            <p className="text-lg text-gray-600">
              Wir prüfen kostenlos, ob KALKU für Ihr Unternehmen passt — und legen los, wenn die
              Voraussetzungen passen.
            </p>
          </div>
        </div>
      </section>

      {/* DIRECT CONTACT GRID */}
      <section className="section-tight">
        <div className="container-page">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
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
            <a href="#termin" className="card card-hover text-center">
              <Calendar className="w-7 h-7 text-emerald-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Termin online</p>
              <p className="text-sm text-gray-600">Calendly</p>
            </a>
          </div>
        </div>
      </section>

      {/* CALENDLY */}
      <section id="termin" className="section bg-gray-50 scroll-mt-24">
        <div className="container-page">
          <SectionHeader
            eyebrow="Termin online buchen"
            title="Erstgespräch direkt im Kalender."
            subtitle="15 Minuten Telefonat — wir prüfen, ob die Voraussetzungen passen, und besprechen den nächsten Schritt."
          />
          <div className="max-w-3xl mx-auto">
            <CalendlyEmbed />
          </div>
        </div>
      </section>

      {/* MULTI-STEP FORM */}
      <section id="anfrage-formular" className="section scroll-mt-24">
        <div className="container-page">
          <SectionHeader
            eyebrow="Alternative: Anfrage-Formular"
            title="Lieber schriftlich? Drei Schritte genügen."
            subtitle="Wenn Sie keinen Termin direkt buchen wollen, schicken Sie uns Ihre Anfrage — wir melden uns innerhalb eines Werktages."
          />
          <MultiStepForm />
        </div>
      </section>

      {/* STANDORT */}
      <section className="section">
        <div className="container-page">
          <div className="card-flat max-w-2xl mx-auto text-center">
            <p className="eyebrow mb-3">Standort</p>
            <p className="flex items-center justify-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4 text-primary-500" />
              {NAP.street}, {NAP.postalCode} {NAP.city}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
