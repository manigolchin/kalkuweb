import { useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { TRADES } from '@/lib/constants';

export default function Gewerk() {
  const { slug } = useParams<{ slug: string }>();
  const trade = TRADES.find((t) => t.slug === slug);

  if (!trade) return <Navigate to="/leistungen/" replace />;

  const title = `${trade.name}-Kalkulation als Dienstleister | KALKU`;
  const description = `Outsourced ${trade.name}-Kalkulation für Bauunternehmen. ${trade.tagline} VOB/A-konform, in 48 h, ab 200 € Festpreis. Saarbrücken, bundesweit.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical(`/leistungen/${trade.slug}/`)} />
      </Helmet>

      <section className={`section bg-${trade.color}-50/40`}>
        <div className="container-page">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full bg-${trade.color}-100 text-${trade.color}-700 text-xs font-semibold uppercase tracking-wider mb-6`}
            >
              {trade.name}
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5">
              {trade.name}-Kalkulation. Wir bepreisen — Sie unterschreiben.
            </h1>
            <p className="text-lg text-gray-600 mb-8">{trade.tagline}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/kontakt/" className="btn btn-success btn-lg">
                {trade.name}-Submission anfragen
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/konditionen/" className="btn btn-outline btn-lg">
                Konditionen
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              'LV-Bepreisung Position für Position',
              'Formblätter 221, 222, 223 ausgefüllt',
              'Materialpreis-Recherche aktuell',
              'Nachunternehmer-Anfragen regional',
              'Fristgerechte Einreichung',
              'Nachverfolgung bis Vergabeergebnis',
            ].map((item) => (
              <div key={item} className="card flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-kalku-green flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="card mt-12 max-w-2xl mx-auto text-center">
            <p className="eyebrow mb-3">Build-Status</p>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {trade.name}-Detailseite in Bauphase 3.3
            </h2>
            <p className="text-gray-600 text-sm mb-5">
              Diese Seite zeigt aktuell das Template. Phase 3.3 ergänzt: gewerk-spezifische FAQ, Beispiel-LV,
              Cross-Links zu verwandten Gewerken und eine anonymisierte Case mit harten Zahlen.
            </p>
            <Link to="/kontakt/" className="btn btn-success">
              Trotzdem anfragen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
