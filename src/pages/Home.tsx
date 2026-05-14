import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Award } from 'lucide-react';
import { canonical, organizationGraph, jsonLd } from '@/lib/seo';
import { TRADES } from '@/lib/constants';
import FadeIn from '@/components/ui/FadeIn';
import { cn } from '@/lib/utils';

const TRADE_TILE_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:border-emerald-200',
  sky: 'bg-sky-50 hover:bg-sky-100 text-sky-700 hover:border-sky-200',
  stone: 'bg-stone-50 hover:bg-stone-100 text-stone-700 hover:border-stone-200',
  yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 hover:border-yellow-200',
  orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 hover:border-orange-200',
  blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:border-blue-200',
  red: 'bg-red-50 hover:bg-red-100 text-red-700 hover:border-red-200',
};
import {
  VierTeams,
  StepsTimeline,
  PricingTiles,
  CaseStudies,
  IrrtumFaq,
  FounderTrust,
  UrgencyCta,
  HeroMockup,
} from '@/components/sections';

const TITLE = 'KALKU Baukalkulationen — Wir kalkulieren Ihre Ausschreibung. Sie unterschreiben.';
const DESCRIPTION =
  'Outsourced Baukalkulation für GU und Bauunternehmen. Spezialisiert auf öffentliche Ausschreibungen (VOB/A, VgV) in 7 Gewerken. LV in 48 h bepreist. Festpreis ab 200 €. Saarbrücken.';

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
      <section className="section bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold uppercase tracking-wider mb-6">
                VOB/A · VgV · 7 Gewerke
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-[1.05]">
                Wir kalkulieren Ihre Ausschreibung.{' '}
                <span className="text-primary-500">Sie unterschreiben.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8">
                Outsourced Kalkulation für Bauunternehmen — von der LV-Bepreisung über die
                Formblätter (221, 222, 223) bis zur fristgerechten Einreichung. Auch über Nacht.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/kontakt/" className="btn btn-success btn-lg">
                  Erstgespräch vereinbaren
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/konditionen/" className="btn btn-outline btn-lg">
                  Konditionen ansehen
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <Clock className="w-4 h-4 text-kalku-green" />
                  LV in 48 h bepreist
                </span>
                <span className="inline-flex items-center gap-2">
                  <Award className="w-4 h-4 text-kalku-green" />
                  7 Gewerke
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-kalku-green" />
                  Festpreis ab 200 €
                </span>
              </div>
            </div>
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* TRADE TILE WALL */}
      <section className="section-tight bg-white">
        <div className="container-page">
          <div className="text-center mb-10">
            <p className="eyebrow mb-3">Gewerke</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Sieben Gewerke. Ein Kalkulationsteam.
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {TRADES.map((t) => (
              <Link
                key={t.slug}
                to={`/leistungen/${t.slug}/`}
                className={cn(
                  'rounded-2xl border border-transparent text-center py-5 px-3 font-semibold text-sm transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5',
                  TRADE_TILE_CLASSES[t.color] ?? 'bg-gray-50 text-gray-700',
                )}
              >
                {t.short}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FadeIn><VierTeams /></FadeIn>
      <FadeIn><StepsTimeline /></FadeIn>
      <FadeIn><PricingTiles /></FadeIn>
      <FadeIn><CaseStudies /></FadeIn>
      <FadeIn><IrrtumFaq /></FadeIn>
      <FadeIn><FounderTrust /></FadeIn>
      <FadeIn><UrgencyCta /></FadeIn>
    </>
  );
}
