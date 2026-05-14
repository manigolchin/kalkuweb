import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Calculator,
  BookOpen,
  Newspaper,
  ArrowRight,
} from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const RESOURCES = [
  {
    icon: FileSpreadsheet,
    title: 'GAEB-Konverter',
    desc: 'GAEB-Datei (X83/X84/D83) im Browser öffnen + Vorschau. Datei verlässt Ihren Computer nicht.',
    cta: 'Tool öffnen',
    to: '/tools/gaeb-konverter/',
    badge: 'Kostenlos',
  },
  {
    icon: Calculator,
    title: 'Position-Kalkulator',
    desc: 'EP/GP berechnen aus Lohn × Zeit + Material + Zuschlag. Live-Summe, CSV-Export.',
    cta: 'Tool öffnen',
    to: '/tools/kalkulator/',
    badge: 'Kostenlos',
  },
  {
    icon: BookOpen,
    title: 'Whitepaper',
    desc: '7 typische Fehler in der VOB-Kalkulation — und wie Sie sie vermeiden.',
    cta: 'Per Mail anfordern',
    to: '/kontakt/',
    badge: 'PDF',
  },
  {
    icon: Newspaper,
    title: 'Blog',
    desc: 'EFB 221 erklärt, GAEB X83 vs. X84, „Wenn der Kalkulator fehlt" und mehr.',
    cta: 'Artikel lesen',
    to: '/blog/',
    badge: 'Wissen',
  },
];

export default function ResourceHub() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Werkzeuge & Wissen"
          title="Vier kostenlose Ressourcen für Bauunternehmer."
          subtitle="Tools und Wissen, das wir auch unseren Mandanten zur Verfügung stellen — ohne Anmeldung, ohne Kosten."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.title}
                to={r.to}
                className="group bg-white border border-gray-200 rounded-lg p-6 flex flex-col hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-700" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded">
                    {r.badge}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                  {r.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">{r.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                  {r.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
