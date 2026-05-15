import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, MessageCircle, Calendar, ArrowRight, Clock3, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';
import { telHref, whatsappHref } from '@/lib/utils';
import MultiStepForm from '@/components/forms/MultiStepForm';
import CalendlyEmbed from '@/components/CalendlyEmbed';

const TITLE = 'Kontakt — Erstgespräch in 15 Minuten | KALKU';
const DESC =
  'Erstgespräch direkt vereinbaren oder anrufen. Kostenlos, unverbindlich. Telefon, WhatsApp, E-Mail oder Termin online buchen — Antwort werktags binnen 4 Stunden.';

export default function Kontakt() {
  const [params] = useSearchParams();
  const defaultGewerk = params.get('gewerk') || '';

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/kontakt/')} />
      </Helmet>

      {/* HERO — direct, no scroll wall */}
      <section className="bg-paper border-b border-gray-200">
        <div className="container-page py-14 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow-pill mb-5">
              <span className="status-dot" aria-hidden /> Antwort werktags binnen 4 Stunden
            </p>
            <h1 className="display-h1 mb-5">
              Lassen Sie uns 15 Minuten sprechen.
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
              Wir prüfen kostenlos, ob KALKU für Ihr Unternehmen passt — und legen los,
              wenn die Voraussetzungen passen. Sie sprechen direkt mit dem Inhaber.
            </p>
          </div>
        </div>
      </section>

      {/* 3-CHANNEL CTA STACK */}
      <section className="bg-white border-b border-gray-200">
        <div className="container-page py-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            <ContactCard
              href={telHref(NAP.phone)}
              icon={Phone}
              iconBg="bg-emerald-50 text-emerald-700"
              title="Sofort anrufen"
              line1={NAP.phone}
              hint="Werktags 8–18 Uhr"
              primary
            />
            <ContactCard
              href={whatsappHref(NAP.whatsapp, 'Hallo KALKU, ich hätte gerne ein Erstgespräch.')}
              external
              icon={MessageCircle}
              iconBg="bg-emerald-50 text-emerald-700"
              title="WhatsApp"
              line1={NAP.whatsapp}
              hint="⌀ Antwort 30 Min"
            />
            <ContactCard
              href="#termin"
              icon={Calendar}
              iconBg="bg-primary-50 text-primary-700"
              title="Termin buchen"
              line1="Calendly · 15 Min"
              hint="Sie sehen die freien Slots"
            />
            <ContactCard
              href={`mailto:${NAP.email}?subject=Erstgespraech%20mit%20KALKU`}
              icon={Mail}
              iconBg="bg-primary-50 text-primary-700"
              title="E-Mail"
              line1={NAP.email}
              hint="Antwort am gleichen Tag"
            />
          </div>

          <div className="max-w-5xl mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-emerald-600" />
              4-Stunden-Antwort schriftlich garantiert
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              NDA standardmäßig · DSGVO-konform
            </span>
          </div>
        </div>
      </section>

      {/* CALENDLY EMBED */}
      <section id="termin" className="section bg-paper-soft scroll-mt-24">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <p className="eyebrow-pill mb-4">
                <Calendar className="w-3 h-3" /> Termin direkt buchen
              </p>
              <h2 className="display-h2 mb-4">
                Erstgespräch im Kalender — wählen Sie einen Slot.
              </h2>
              <p className="prose-body mx-auto text-base">
                15 Minuten Telefonat. Wir besprechen Gewerk, Region, Mittellohn und prüfen,
                ob KALKU für Sie passt. Sie sprechen direkt mit Alaatdin Coksari, dem Inhaber.
              </p>
            </div>
            <CalendlyEmbed />
            <p className="text-center text-xs text-gray-500 mt-5">
              Slot nicht passend? <a href={telHref(NAP.phone)} className="text-primary-700 font-medium hover:underline">Rufen Sie an</a> — wir finden gemeinsam einen.
            </p>
          </div>
        </div>
      </section>

      {/* MULTI-STEP FORM */}
      <section id="anfrage" className="section bg-white scroll-mt-24">
        <div className="container-page">
          <div className="grid lg:grid-cols-12 gap-10 max-w-6xl mx-auto items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <p className="eyebrow mb-3">Alternative</p>
              <h2 className="display-h2 mb-5">
                Schriftlich? Drei Schritte, fünf Minuten.
              </h2>
              <p className="prose-body mb-7">
                Wenn Sie keinen Termin direkt buchen möchten, schicken Sie uns Ihre Anfrage —
                wir melden uns innerhalb eines Werktages mit konkreten nächsten Schritten.
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 flex-shrink-0" />
                  <span>Wir prüfen die Eignungsvoraussetzungen vor dem Erstgespräch.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 flex-shrink-0" />
                  <span>Wir bereiten Ihre Gewerk- und Regions-spezifischen Fragen vor.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 flex-shrink-0" />
                  <span>Sie erhalten vorab eine Beispiel-Kalkulation aus Ihrem Gewerk.</span>
                </li>
              </ul>

              <div className="mt-9 p-5 rounded-2xl bg-paper ring-1 ring-gray-200">
                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">
                  Lieber direkt?
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <a href={telHref(NAP.phone)} className="inline-flex items-center gap-1.5 text-primary-700 font-semibold hover:text-primary-800">
                    <Phone className="w-4 h-4" /> {NAP.phone}
                  </a>
                  <Link to="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700">
                    <ArrowRight className="w-4 h-4 rotate-180" /> Zurück zur Übersicht
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <MultiStepForm defaultGewerk={defaultGewerk} />
            </div>
          </div>
        </div>
      </section>

      {/* STANDORT */}
      <section className="section bg-paper-soft">
        <div className="container-page">
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl ring-1 ring-gray-200 p-8 shadow-sm">
            <p className="eyebrow mb-3">Standort</p>
            <p className="flex items-center justify-center gap-2 text-gray-900 font-bold mb-2 text-lg">
              <MapPin className="w-5 h-5 text-primary-600" />
              {NAP.street}, {NAP.postalCode} {NAP.city}
            </p>
            <p className="text-sm text-gray-600">
              Direkt am Hauptbahnhof Saarbrücken. Persönliche Termine nach Vereinbarung.
            </p>
            <a
              href={`https://www.openstreetmap.org/?mlat=${NAP.geo.lat}&mlon=${NAP.geo.lng}#map=17/${NAP.geo.lat}/${NAP.geo.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline mt-5"
            >
              In OpenStreetMap öffnen <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

type CardProps = {
  href: string;
  external?: boolean;
  icon: typeof Phone;
  iconBg: string;
  title: string;
  line1: string;
  hint: string;
  primary?: boolean;
};

function ContactCard({ href, external, icon: Icon, iconBg, title, line1, hint, primary }: CardProps) {
  const targetProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <a
      href={href}
      {...targetProps}
      className={`group relative bg-white rounded-2xl ring-1 p-5 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-0.5 ${
        primary ? 'ring-emerald-200 hover:ring-emerald-400' : 'ring-gray-200 hover:ring-primary-300'
      }`}
    >
      <span className={`inline-flex w-10 h-10 rounded-xl items-center justify-center ${iconBg} mb-4`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </span>
      <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-1">{title}</p>
      <p className="font-bold text-gray-900 mb-1 break-all">{line1}</p>
      <p className="text-xs text-gray-500 mt-auto">{hint}</p>
      {primary && (
        <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
          Schnellste
        </span>
      )}
    </a>
  );
}
