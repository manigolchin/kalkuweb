import { Clock, ShieldCheck, Layers3, Award } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

type Stat = {
  icon: typeof Clock;
  to: number;
  suffix?: string;
  prefix?: string;
  display?: string; // for non-numeric like "100 %"
  label: string;
};

const STATS: Stat[] = [
  {
    icon: Clock,
    to: 48,
    suffix: ' h',
    label: 'durchschnittliche Bearbeitungszeit pro LV',
  },
  {
    icon: Layers3,
    to: 7,
    label: 'Gewerke aus einer Hand — von GaLaBau bis Schadstoff',
  },
  {
    icon: ShieldCheck,
    to: 100,
    suffix: ' %',
    label: 'Vertraulichkeit · ein Bieter pro Ausschreibung',
  },
  {
    icon: Award,
    to: 20,
    suffix: '+',
    label: 'Jahre Kalkulationserfahrung im Team',
  },
];

export default function StatsBand() {
  return (
    <section className="border-y border-gray-200 bg-white">
      <div className="container-page">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="px-6 py-8 flex flex-col items-start gap-3">
                <Icon className="w-5 h-5 text-primary-600" strokeWidth={2.2} />
                <p className="text-3xl sm:text-4xl font-extrabold text-primary-700 tabular-nums tracking-tight">
                  <AnimatedCounter to={s.to} suffix={s.suffix} prefix={s.prefix} />
                </p>
                <p className="text-sm text-gray-600 leading-snug">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
