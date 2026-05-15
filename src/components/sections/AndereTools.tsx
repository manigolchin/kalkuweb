import { Link } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet, Calculator, Users, Calendar, ShieldCheck } from 'lucide-react';

const ALL_TOOLS = [
  { to: '/tools/gaeb-konverter/', icon: FileSpreadsheet, name: 'GAEB-Konverter', accent: 'emerald' },
  { to: '/tools/kalkulator/', icon: Calculator, name: 'Position-Kalkulator', accent: 'sky' },
  { to: '/tools/mittellohn/', icon: Users, name: 'Mittellohn-Rechner', accent: 'amber' },
  { to: '/tools/frist-rechner/', icon: Calendar, name: 'Frist-Rechner', accent: 'rose' },
  { to: '/tools/buergschaft/', icon: ShieldCheck, name: 'Bürgschafts-Rechner', accent: 'indigo' },
] as const;

const ACCENT: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  indigo: 'bg-indigo-50 text-indigo-700',
};

type Props = {
  /** Slug of the current tool to exclude from the list. */
  exclude: string;
};

export default function AndereTools({ exclude }: Props) {
  const others = ALL_TOOLS.filter((t) => t.to !== exclude);
  return (
    <section className="section-tight bg-gray-50 print:hidden">
      <div className="container-page">
        <div className="text-center mb-7">
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-gray-500 mb-2">
            Weitere kostenlose Tools
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Vier weitere Werkzeuge für Bauunternehmer.
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {others.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="group flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ACCENT[t.accent] ?? 'bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </span>
                <span className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 truncate">
                  {t.name}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
