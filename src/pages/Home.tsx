import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Clock, Layers3, Award } from 'lucide-react';
import { canonical, organizationGraph, jsonLd } from '@/lib/seo';
import { TRADES, NAP } from '@/lib/constants';
import { telHref, cn } from '@/lib/utils';
import FadeIn from '@/components/ui/FadeIn';
import {
  StatsBand,
  TrustBadges,
  VierTeams,
  StepsTimeline,
  PricingTiles,
  CaseStudies,
  IrrtumFaq,
  FounderTrust,
  UrgencyCta,
  HeroMockup,
  PullQuote,
  Eligibility,
  ServiceArea,
  ResourceHub,
  LeadMagnet,
  Differentiator,
  CareerBanner,
  OperationalFaq,
  Testimonials,
} from '@/components/sections';

const TRADE_TILE_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:border-emerald-200',
  sky: 'bg-sky-50 hover:bg-sky-100 text-sky-800 hover:border-sky-200',
  stone: 'bg-stone-50 hover:bg-stone-100 text-stone-800 hover:border-stone-200',
  yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 hover:border-yellow-200',
  orange: 'bg-orange-50 hover:bg-orange-100 text-orange-800 hover:border-orange-200',
  blue: 'bg-blue-50 hover:bg-blue-100 text-blue-800 hover:border-blue-200',
  red: 'bg-red-50 hover:bg-red-100 text-red-800 hover:border-red-200',
  slate: 'bg-slate-50 hover:bg-slate-100 text-slate-800 hover:border-slate-200',
  amber: 'bg-amber-50 hover:bg-amber-100 text-amber-800 hover:border-amber-200',
  rose: 'bg-rose-50 hover:bg-rose-100 text-rose-800 hover:border-rose-200',
};

const TITLE = 'KALKU Baukalkulationen — Wir kalkulieren Ihre Ausschreibung. Sie unterschreiben.';
const DESCRIPTION =
  'Outsourced Baukalkulation für GU und Bauunternehmen. Spezialisiert auf öffentliche Ausschreibungen (VOB/A, VgV) in 10 Gewerken. LV in 48 h bepreist. Festpreis ab 200 €. Saarbrücken.';

export default function Home() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={canonical('/')} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical('/')} />
        <script type="application/ld+json">{jsonLd(organizationGraph())}</script>
      </Helmet>

      {/* HERO */}
      <section className="bg-gradient-to-b from-gray-50 via-gray-50 to-white border-b border-gray-200">
        <div className="container-page py-16 sm:py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.18em] text-primary-700 font-bold mb-5">
                Kalkulationsbüro für öffentliche Vergabe
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.05]">
                Wir kalkulieren Ihre Ausschreibung.{' '}
                <span className="text-primary-600">Sie unterschreiben.</span>
              </h1>
              <p className="text-lg text-gray-600 mb-9 leading-relaxed">
                Outsourced Kalkulation für mittelständische Bauunternehmen — von der
                LV-Bepreisung über die Formblätter (221, 222, 223) bis zur fristgerechten
                Einreichung. Auch über Nacht.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/kontakt/" className="btn btn-success btn-lg">
                  Erstgespräch vereinbaren
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href={telHref(NAP.phone)} className="btn btn-outline btn-lg">
                  <Phone className="w-4 h-4" /> {NAP.phone}
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-9 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary-600" /> LV in 48 h bepreist
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers3 className="w-4 h-4 text-primary-600" /> 10 Gewerke
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-primary-600" /> Festpreis ab 200 €
                </span>
              </div>
              <p className="mt-4 text-xs text-gray-500 inline-flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Antwort werktags binnen 4 Stunden — verbindlich zugesagt.
              </p>
            </div>
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <StatsBand />

      {/* TRADE TILE WALL */}
      <FadeIn>
        <section className="section-tight bg-white">
          <div className="container-page">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-bold mb-3">
                Gewerke
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                Zehn Gewerke. Ein Kalkulationsteam.
              </h2>
              <p className="mt-3 text-sm text-gray-600">
                Hochbau, Tiefbau, Straßenbau, GaLaBau, HLS, Innenausbau, Erd-/Abbruch, Elektro, Fenster, Schadstoff — alle Gewerke aus einer Hand.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {TRADES.map((t) => (
                <Link
                  key={t.slug}
                  to={`/leistungen/${t.slug}/`}
                  className={cn(
                    'rounded-lg border border-transparent text-center py-5 px-3 font-semibold text-sm transition-all duration-150 hover:shadow-sm',
                    TRADE_TILE_CLASSES[t.color] ?? 'bg-gray-50 text-gray-700',
                  )}
                >
                  {t.short}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn><VierTeams /></FadeIn>
      <FadeIn><PullQuote /></FadeIn>
      <FadeIn><StepsTimeline /></FadeIn>
      <FadeIn><Differentiator /></FadeIn>
      <FadeIn><Eligibility /></FadeIn>
      <FadeIn><TrustBadges /></FadeIn>
      <FadeIn><PricingTiles /></FadeIn>
      <FadeIn><CaseStudies /></FadeIn>
      <FadeIn><Testimonials /></FadeIn>
      <FadeIn><IrrtumFaq /></FadeIn>
      <FadeIn><OperationalFaq /></FadeIn>
      <FadeIn><LeadMagnet /></FadeIn>
      <FadeIn><ServiceArea /></FadeIn>
      <FadeIn><FounderTrust /></FadeIn>
      <FadeIn><CareerBanner /></FadeIn>
      <FadeIn><ResourceHub /></FadeIn>
      <FadeIn><UrgencyCta /></FadeIn>
    </>
  );
}
