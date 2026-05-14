import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet, Calculator } from 'lucide-react';
import { canonical } from '@/lib/seo';

const TITLE = 'Kostenlose Tools für Bauunternehmer | KALKU';
const DESC =
  'Zwei kostenlose Tools für Bauunternehmer und Kalkulatoren: GAEB-Konverter (X83/X84/D83 → Excel/PDF) und Position-Kalkulator (EP/GP berechnen).';

const TOOLS = [
  {
    to: '/tools/gaeb-konverter/',
    icon: FileSpreadsheet,
    name: 'GAEB-Konverter',
    desc: 'GAEB-Dateien (X83, X84, D83, D84) in Excel oder PDF umwandeln. Komplett im Browser, Datei verlässt Ihren Computer nie.',
    badge: 'Kostenlos',
  },
  {
    to: '/tools/kalkulator/',
    icon: Calculator,
    name: 'Position-Kalkulator',
    desc: 'EP/GP berechnen aus Lohn, Zeit, Material und Zuschlag. Live-Summe, Export als PDF/Excel.',
    badge: 'Kostenlos',
  },
];

export default function ToolsIndex() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/tools/')} />
      </Helmet>

      <section className="section">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="eyebrow mb-3">Tools</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5">
              Kostenlose Tools für Bauunternehmer
            </h1>
            <p className="text-lg text-gray-600">
              Zwei Werkzeuge, die wir unseren Kunden geben — kostenlos, ohne Anmeldung, ohne Datenabfrage.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to} className="card card-hover group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <span className="badge badge-success">{t.badge}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {t.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-5">{t.desc}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                    Tool öffnen <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
