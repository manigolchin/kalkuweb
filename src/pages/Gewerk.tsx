import { useParams, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { TRADES } from '@/lib/constants';
import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';
import UrgencyCta from '@/components/sections/UrgencyCta';
import MultiStepForm from '@/components/forms/MultiStepForm';

const PILL_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  stone: 'bg-stone-100 text-stone-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
};

const HERO_BG: Record<string, string> = {
  emerald: 'from-emerald-50/50 to-white',
  sky: 'from-sky-50/50 to-white',
  stone: 'from-stone-50/50 to-white',
  yellow: 'from-yellow-50/50 to-white',
  orange: 'from-orange-50/50 to-white',
  blue: 'from-blue-50/50 to-white',
  red: 'from-red-50/50 to-white',
};

const LEISTUNGEN = [
  'LV-Bepreisung Position für Position',
  'Formblätter 221, 222, 223 ausgefüllt',
  'Urkalkulation lückenlos abgeleitet',
  'Materialpreis-Recherche aktuell',
  'Nachunternehmer-Anfragen regional',
  'Fristgerechte Einreichung',
  'Nachverfolgung bis Vergabeergebnis',
  'Unterstützung bei Vergabegesprächen',
];

const FAQ_GENERIC = [
  {
    q: 'Welche LV-Formate akzeptieren Sie?',
    a: 'GAEB DA XML (X81, X83, X84), GAEB ASCII (D83, D84, P83), PDF und Papier. Bei Papier scannen wir vor Ort.',
  },
  {
    q: 'Wie lange dauert eine Kalkulation für ein typisches LV?',
    a: 'Für ein durchschnittliches LV mit 80–150 Positionen: 24–48 Stunden. Komplexere LVs (300+ Positionen, mehrere Lose) brauchen bis zu 5 Werktage.',
  },
  {
    q: 'Können Sie auch Nachträge kalkulieren?',
    a: 'Ja. Nachträge sind Bestandteil der Monatspakete (M und L) und werden bei Einzelbeauftragung mit der gleichen Pauschalenstruktur abgerechnet.',
  },
];

export default function Gewerk() {
  const { slug } = useParams<{ slug: string }>();
  const trade = TRADES.find((t) => t.slug === slug);

  if (!trade) return <Navigate to="/leistungen/" replace />;

  const title = `${trade.name}-Kalkulation als Dienstleister | KALKU`;
  const description = `Outsourced ${trade.name}-Kalkulation für Bauunternehmen. ${trade.tagline} VOB/A-konform, in 48 h, ab 200 € Festpreis. Saarbrücken, bundesweit.`;
  const otherTrades = TRADES.filter((t) => t.slug !== trade.slug).slice(0, 3);
  const pillClass = PILL_CLASSES[trade.color] ?? PILL_CLASSES.stone;
  const heroBg = HERO_BG[trade.color] ?? HERO_BG.stone;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical(`/leistungen/${trade.slug}/`)} />
      </Helmet>

      {/* HERO */}
      <section className={`section bg-gradient-to-br ${heroBg}`}>
        <div className="container-page">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 ${pillClass}`}
            >
              {trade.name}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              {trade.name}-Kalkulation. Wir bepreisen — Sie unterschreiben.
            </h1>
            <p className="text-lg text-gray-600 mb-8">{trade.tagline}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/kontakt/?gewerk=${encodeURIComponent(trade.name)}`}
                className="btn btn-success btn-lg cta-magnetic"
              >
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

      {/* LEISTUNGEN */}
      <section className="section">
        <div className="container-page">
          <SectionHeader
            eyebrow="Was wir übernehmen"
            title={`Komplette ${trade.name}-Kalkulation aus einer Hand.`}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {LEISTUNGEN.map((l) => (
              <div key={l} className="card-flat flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-kalku-green flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader eyebrow="Häufige Fragen" title={`Zum Thema ${trade.name}-Kalkulation.`} />
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ_GENERIC.map((q) => (
              <FaqItem key={q.q} question={q.q} answer={q.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CROSS-LINKS */}
      <section className="section">
        <div className="container-page">
          <SectionHeader eyebrow="Auch interessant" title="Andere Gewerke aus unserem Portfolio." />
          <div className="grid gap-5 md:grid-cols-3 max-w-4xl mx-auto">
            {otherTrades.map((t) => (
              <Link
                key={t.slug}
                to={`/leistungen/${t.slug}/`}
                className="card card-hover group flex flex-col"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {t.name}
                </h3>
                <p className="text-sm text-gray-600 flex-1 mb-4">{t.tagline}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                  Mehr erfahren <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* IN-PAGE FORM with prefilled gewerk */}
      <section id="anfrage-formular" className="section bg-gray-50 scroll-mt-24">
        <div className="container-page">
          <SectionHeader
            eyebrow="Anfrage-Formular"
            title={`${trade.name}-Submission anfragen`}
            subtitle="In drei Schritten — wir melden uns innerhalb eines Werktages."
          />
          <MultiStepForm defaultGewerk={trade.name} />
        </div>
      </section>

      {/* URGENCY CTA */}
      <UrgencyCta />
    </>
  );
}
