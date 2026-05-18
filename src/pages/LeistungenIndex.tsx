import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { TRADES } from '@/lib/constants';

const TITLE = 'Leistungen — Baukalkulation für 10 Gewerke | KALKU';
const DESC =
  'Übersicht aller KALKU-Leistungen pro Gewerk: Hochbau, Tiefbau, Straßenbau, GaLaBau, HLS, Innenausbau, Erd-/Abbrucharbeiten, Elektro, Fenster, Schadstoff. Outsourced Kalkulation für VOB/A-Ausschreibungen — alle Gewerke aus einer Hand.';

export default function LeistungenIndex() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/leistungen/')} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
      </Helmet>

      <section className="section">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="eyebrow mb-3">Leistungen</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5">
              Zehn Gewerke. Ein Kalkulationsteam.
            </h1>
            <p className="text-lg text-gray-600">
              Hochbau, Tiefbau, Straßenbau, GaLaBau, HLS, Innenausbau, Erd-/Abbrucharbeiten, Elektro, Fenster,
              Schadstoff — alle Gewerke aus einer Hand. Wir bepreisen, füllen Formblätter und reichen ein.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TRADES.map((t) => (
              <Link
                key={t.slug}
                to={`/leistungen/${t.slug}/`}
                className="card card-hover group flex flex-col"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {t.name}
                </h2>
                <p className="text-sm text-gray-600 flex-1 mb-5">{t.tagline}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                  Mehr erfahren <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
