import { Link } from 'react-router-dom';
import { Check, ArrowRight, Star } from 'lucide-react';
import { PRICING } from '@/lib/constants';
import SectionHeader from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';

type Props = {
  bare?: boolean;
};

export default function PricingTiles({ bare = false }: Props) {
  const tiers = [
    { ...PRICING.einzel, featured: false },
    { ...PRICING.paketM, featured: true },
    { ...PRICING.paketL, featured: false },
  ];

  const inner = (
    <>
      {!bare && (
        <SectionHeader
          eyebrow="Konditionen"
          title="Transparente Festpreise. Keine Mindestlaufzeit."
          subtitle="Zwei Modelle, klare Preise — und eine Erfolgsprovision, die erst nach erteiltem Zuschlag fällig wird."
        />
      )}
      <div className="grid gap-0 lg:grid-cols-3 max-w-6xl mx-auto rounded-2xl overflow-hidden border border-gray-200 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              'relative flex flex-col bg-white p-7 sm:p-8',
              tier.featured && 'bg-primary-50/50',
            )}
          >
            {tier.featured && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-700 text-white text-[11px] font-bold uppercase tracking-wider">
                <Star className="w-3 h-3 fill-current" />
                Beliebt
              </span>
            )}
            <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">
              {tier.name}
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold text-primary-700 tracking-tight mb-1 tabular-nums">
              {tier.price}
            </p>
            <p className="text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
              + {tier.successFee} Erfolgsprovision bei Zuschlag
            </p>
            <ul className="space-y-3 mb-7 flex-1">
              {tier.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/kontakt/"
              className={cn(
                'btn w-full justify-center',
                tier.featured ? 'btn-primary' : 'btn-outline',
              )}
            >
              Erstgespräch vereinbaren
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-gray-500 mt-5">
        Alle Preise netto, zzgl. USt. Monatliche Pakete monatlich kündbar — keine Mindestlaufzeit.
      </p>
    </>
  );

  if (bare) return inner;
  return (
    <section className="section">
      <div className="container-page">{inner}</div>
    </section>
  );
}
