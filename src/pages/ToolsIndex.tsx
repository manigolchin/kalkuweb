import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileSpreadsheet,
  Calculator,
  Users,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { canonical } from '@/lib/seo';
import { cn } from '@/lib/utils';

const TITLE = 'Kostenlose Tools für Bauunternehmer | KALKU';
const DESC =
  'Fünf kostenlose Tools für Bauunternehmer und Kalkulatoren: GAEB-Konverter, Position-Kalkulator, Mittellohn-Rechner, Submissions-Frist-Rechner, Bürgschafts-Rechner.';

type Tool = {
  to: string;
  icon: typeof FileSpreadsheet;
  name: string;
  desc: string;
  badge: string;
  features: string[];
  accent: 'emerald' | 'sky' | 'amber' | 'rose' | 'indigo';
};

const ACCENT_CLASSES: Record<Tool['accent'], { bg: string; text: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
};

const TOOLS: Tool[] = [
  {
    to: '/tools/gaeb-konverter/',
    icon: FileSpreadsheet,
    name: 'GAEB-Konverter',
    desc: 'GAEB-Dateien (X81–X89, D81–D84, P83/P84) im Browser öffnen, Positionen anzeigen, als Excel oder CSV exportieren.',
    badge: 'Im Browser',
    features: ['Datei verlässt nie Ihren PC', 'Excel + CSV Export', 'Format-Auto-Erkennung'],
    accent: 'emerald',
  },
  {
    to: '/tools/kalkulator/',
    icon: Calculator,
    name: 'Position-Kalkulator',
    desc: 'EP/GP berechnen aus Lohn × Zeit + Material + Zuschlag. Mit Trade-Vorlagen (GaLaBau, Tiefbau, Elektro), Auto-Save und Excel-Export.',
    badge: 'Im Browser',
    features: ['4 Trade-Presets', 'Auto-Save aktiv', 'Excel + CSV Export'],
    accent: 'sky',
  },
  {
    to: '/tools/mittellohn/',
    icon: Users,
    name: 'Mittellohn-Rechner',
    desc: 'Mittellohn AS und ASL aus Team-Mix berechnen. Stundensatz pro Rolle, Lohnnebenkosten-Slider, Excel-Export.',
    badge: 'Im Browser',
    features: ['AS + ASL Berechnung', 'Lohnnebenkosten-Slider', 'Auto-Save aktiv'],
    accent: 'amber',
  },
  {
    to: '/tools/frist-rechner/',
    icon: Calendar,
    name: 'Submissions-Frist-Rechner',
    desc: 'Werktage bis Submissionstermin, deutsche Feiertage berücksichtigt, Bieterfragen-Frist nach VOB-Praxis, ICS-Kalender-Export.',
    badge: 'Im Browser',
    features: ['Deutsche Feiertage', 'Bieterfragen-Frist', 'ICS-Export'],
    accent: 'rose',
  },
  {
    to: '/tools/buergschaft/',
    icon: ShieldCheck,
    name: 'Bürgschafts-Rechner',
    desc: 'Vertragserfüllungs- und Gewährleistungs-Bürgschaft + Avalprovision über die volle Laufzeit. Nach VOB/B § 17.',
    badge: 'Im Browser',
    features: ['VOB/B § 17', 'Avalprovision', 'Über volle Laufzeit'],
    accent: 'indigo',
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
            <p className="text-xs uppercase tracking-[0.18em] text-primary-700 font-bold mb-3">Tools</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              Fünf kostenlose Tools für Bauunternehmer.
            </h1>
            <p className="text-lg text-gray-600">
              Werkzeuge, die wir auch unseren Mandanten zur Verfügung stellen — kostenlos, ohne
              Anmeldung, komplett im Browser. Kein Daten-Tracking, keine Login-Pflicht.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const a = ACCENT_CLASSES[t.accent];
              return (
                <Link key={t.to} to={t.to} className="card card-hover group flex flex-col">
                  <div className="flex items-start justify-between mb-5">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', a.bg)}>
                      <Icon className={cn('w-6 h-6', a.text)} strokeWidth={2} />
                    </div>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded',
                        a.bg,
                        a.text,
                      )}
                    >
                      {t.badge}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                    {t.name}
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">{t.desc}</p>
                  <ul className="space-y-1.5 mb-5">
                    {t.features.map((f) => (
                      <li key={f} className="text-xs text-gray-600 flex items-center gap-2">
                        <span className={cn('w-1 h-1 rounded-full', a.dot)} aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 group-hover:text-primary-800 mt-auto">
                    Tool öffnen
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 text-center mt-8 max-w-2xl mx-auto">
            Alle Tools laufen vollständig in Ihrem Browser. Keine Anmeldung, keine Datenübertragung
            an unsere Server (außer bei optionaler Premium-Auswertung per E-Mail). Auto-Save in
            localStorage — Ihre Daten bleiben auf Ihrem Gerät.
          </p>
        </div>
      </section>
    </>
  );
}
