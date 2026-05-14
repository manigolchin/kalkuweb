import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { PRICING } from '@/lib/constants';

const TITLE = 'Konditionen — Festpreis ab 200 € | KALKU';
const DESC =
  'Transparente Preise: Einzelbeauftragung 200–600 € + 5 % Erfolgsprovision. PAKET M 3.000 €/Mon · PAKET L 5.000 €/Mon. Monatlich kündbar. Loyalität & Gebietsschutz inklusive.';

export default function Konditionen() {
  const tiers = [PRICING.einzel, PRICING.paketM, PRICING.paketL];
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/konditionen/')} />
      </Helmet>

      <section className="section">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="eyebrow mb-3">Konditionen</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5">
              Faire Konditionen. Sie zahlen, wenn wir liefern.
            </h1>
            <p className="text-lg text-gray-600">
              Zwei Modelle — passend zu Ihrem Bedarf. Kein Setup, keine Mindestlaufzeit, monatlich kündbar.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {tiers.map((tier, i) => {
              const featured = i === 1;
              return (
                <div
                  key={tier.name}
                  className={
                    featured
                      ? 'card border-2 border-primary-500 shadow-lg relative'
                      : 'card'
                  }
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Beliebt
                    </span>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h2>
                  <p className="text-3xl font-bold text-primary-600 mb-1">{tier.price}</p>
                  <p className="text-sm text-gray-500 mb-5">+ {tier.successFee} Erfolgsprovision bei Zuschlag</p>
                  <ul className="space-y-2.5 mb-6">
                    {tier.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-kalku-green flex-shrink-0 mt-0.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/kontakt/"
                    className={featured ? 'btn btn-primary w-full justify-center' : 'btn btn-outline w-full justify-center'}
                  >
                    Beratung vereinbaren
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
