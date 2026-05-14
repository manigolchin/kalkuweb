import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { canonical } from '@/lib/seo';
import SectionHeader from '@/components/ui/SectionHeader';
import CaseStudies from '@/components/sections/CaseStudies';

const TITLE = 'Referenzen — Anonymisierte Case-Studies | KALKU';
const DESC =
  'Echte Fälle, harte Zahlen, anonymisiert. Vorher / Nachher pro Bauunternehmen aus 7 Gewerken — Tiefbau, GaLaBau, Hochbau, Elektro u.a.';

export default function ReferenzenIndex() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/referenzen/')} />
      </Helmet>

      {/* HERO */}
      <section className="section bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="eyebrow mb-3">Referenzen</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              Anonymisierte Cases. <span className="text-primary-500">Harte Zahlen.</span>
            </h1>
            <p className="text-lg text-gray-600">
              Wir nennen keine Kundennamen — Loyalität und Vertraulichkeit sind nicht
              verhandelbar. Wir nennen aber die Zahlen, die Bauunternehmen interessieren.
            </p>
          </div>
        </div>
      </section>

      {/* CASE STUDIES — reused from Home */}
      <CaseStudies />

      {/* WAS WIR NICHT MACHEN */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Was wir nicht machen"
            title="Logo-Walls mit Konzern-Namen."
            subtitle="Andere Anbieter werben mit Hochtief, Porr, Köster. Wir nicht. Unsere Kunden sind mittelständische Bauunternehmen — und ihre Verträge mit uns sind vertraulich."
          />
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-2">Loyalität schlägt Marketing.</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Wir bekommen regelmäßig Anfragen, ob wir nicht doch mit einem Kundennamen werben
                dürften. Die Antwort ist immer dieselbe: nein.
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-2">Echte Referenzen auf Anfrage.</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Wenn Sie konkrete Referenzen brauchen — gerne im Erstgespräch. Mit Freigabe der
                jeweiligen Kunden, persönlich, nicht öffentlich.
              </p>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link to="/kontakt/" className="btn btn-success btn-lg">
              Referenzen im Erstgespräch besprechen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
