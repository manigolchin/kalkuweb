import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { PRICING } from '@/lib/constants';
import SectionHeader from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';

type Props = {
  /** When true, omits the section wrapper (use inside Konditionen page that already has its own intro). */
  bare?: boolean;
};

export default function PricingTiles({ bare = false }: Props) {
  const tiers = [PRICING.einzel, PRICING.paketM, PRICING.paketL];
  const Wrapper = bare
    ? ({ children }: { children: React.ReactNode }) => <>{children}</>
    : ({ children }: { children: React.ReactNode }) => (
        <section className="section">
          <div className="container-page">{children}</div>
        </section>
      );

  return (
    <Wrapper>
      {!bare && (
        <SectionHeader
          eyebrow="Konditionen"
          title="Faire Konditionen. Sie zahlen, wenn wir liefern."
          subtitle="Zwei Modelle — passend zu Ihrem Bedarf. Kein Setup, keine Mindestlaufzeit, monatlich kündbar."
        />
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => {
          const featured = i === 1;
          return (
            <div
              key={tier.name}
              className={cn(
                'card relative flex flex-col',
                featured && 'border-2 border-primary-500 shadow-lg lg:scale-[1.02]',
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Beliebt
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold text-primary-600">{tier.price}</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">+ {tier.successFee} Erfolgsprovision bei Zuschlag</p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-kalku-green flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/kontakt/"
                className={cn(
                  'btn w-full justify-center',
                  featured ? 'btn-primary' : 'btn-outline',
                )}
              >
                Erstgespräch vereinbaren
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </Wrapper>
  );
}
