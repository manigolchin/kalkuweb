import { Clock, ShieldCheck, Layers3, Award } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

type Stat = {
  icon: typeof Clock;
  to: number;
  suffix?: string;
  prefix?: string;
  label: string;
  hint?: string;
};

const STATS: Stat[] = [
  {
    icon: Clock,
    to: 48,
    suffix: ' h',
    label: '⌀ Bearbeitungszeit pro LV',
    hint: 'reguläre Submission · auch über Nacht',
  },
  {
    icon: Layers3,
    to: 7,
    label: 'Gewerke aus einer Hand',
    hint: 'GaLaBau · Tiefbau · Hochbau · Elektro · TGA · Fenster · Schadstoff',
  },
  {
    icon: ShieldCheck,
    to: 100,
    suffix: ' %',
    label: 'Vertraulichkeit · NDA standard',
    hint: 'pro Ausschreibung ein Bieter',
  },
  {
    icon: Award,
    to: 20,
    suffix: '+',
    label: 'Jahre Kalkulationserfahrung',
    hint: 'Handwerker & Bauingenieure im Team',
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
              <div key={s.label} className="px-5 sm:px-8 py-7 sm:py-9 flex flex-col items-start gap-2.5">
                <div className="flex items-center gap-2 text-primary-600">
                  <Icon className="w-4 h-4" strokeWidth={2.2} />
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold">Stat</span>
                </div>
                <p className="editorial-number text-3xl sm:text-4xl text-gray-900">
                  <AnimatedCounter to={s.to} suffix={s.suffix} prefix={s.prefix} />
                </p>
                <p className="text-sm font-semibold text-gray-700 leading-snug">{s.label}</p>
                {s.hint && (
                  <p className="text-[11px] text-gray-500 leading-snug">{s.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
