import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet, Calculator } from 'lucide-react';
import { canonical } from '@/lib/seo';

const TITLE = 'Kostenlose Tools für Bauunternehmer | KALKU';
const DESC =
  'Zwei kostenlose Tools für Bauunternehmer und Kalkulatoren: GAEB-Konverter (X83/X84/D83 → Excel/CSV) und Position-Kalkulator (EP/GP berechnen, Excel-Export, Trade-Templates).';

type Tool = {
  to: string;
  icon: typeof FileSpreadsheet;
  name: string;
  desc: string;
  badge: string;
  features: string[];
};

const TOOLS: Tool[] = [
  {
    to: '/tools/gaeb-konverter/',
    icon: FileSpreadsheet,
    name: 'GAEB-Konverter',
    desc: 'GAEB-Dateien (X81–X89, D81–D84, P83/P84) im Browser öffnen, Positionen anzeigen, als Excel oder CSV exportieren.',
    badge: 'Im Browser',
    features: ['Datei verlässt nie Ihren PC', 'Excel + CSV Export', 'Format-Auto-Erkennung'],
  },
  {
    to: '/tools/kalkulator/',
    icon: Calculator,
    name: 'Position-Kalkulator',
    desc: 'EP/GP berechnen aus Lohn × Zeit + Material + Zuschlag. Mit Trade-Vorlagen (GaLaBau, Tiefbau, Elektro), Auto-Save und Excel-Export.',
    badge: 'Im Browser',
    features: ['Trade-Presets', 'Auto-Save', 'Excel + CSV Export'],
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

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to} className="card card-hover group flex flex-col">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary-600" strokeWidth={2} />
                    </div>
                    <span className="badge badge-success">{t.badge}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {t.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-5">{t.desc}</p>
                  <ul className="space-y-1.5 mb-6 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary-500" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 group-hover:text-primary-800">
                    Tool öffnen
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 text-center mt-6">
            Beide Tools laufen vollständig in Ihrem Browser. Keine Anmeldung, keine Datenübertragung an
            unsere Server (außer bei optionaler Premium-Auswertung per E-Mail).
          </p>
        </div>
      </section>
    </>
  );
}
