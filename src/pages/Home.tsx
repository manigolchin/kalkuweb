import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { canonical, organizationGraph, jsonLd } from '@/lib/seo';
import { TRADES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import FadeIn from '@/components/ui/FadeIn';
import {
  HeroV2,
  StatsBand,
  SubmissionTriage,
  Manifesto,
  Deliverables,
  VierTeams,
  StepsTimeline,
  NamedReference,
  PullQuote,
  RoiBlock,
  RiskReversal,
  PricingTeaser,
  OperationalFaq,
  FounderTrust,
  CalSlotPreview,
} from '@/components/sections';

const TRADE_TILE_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 ring-emerald-100 hover:ring-emerald-200',
  sky:     'bg-sky-50 hover:bg-sky-100 text-sky-800 ring-sky-100 hover:ring-sky-200',
  stone:   'bg-stone-50 hover:bg-stone-100 text-stone-800 ring-stone-200 hover:ring-stone-300',
  yellow:  'bg-yellow-50 hover:bg-yellow-100 text-yellow-900 ring-yellow-100 hover:ring-yellow-200',
  orange:  'bg-orange-50 hover:bg-orange-100 text-orange-800 ring-orange-100 hover:ring-orange-200',
  blue:    'bg-blue-50 hover:bg-blue-100 text-blue-800 ring-blue-100 hover:ring-blue-200',
  red:     'bg-red-50 hover:bg-red-100 text-red-800 ring-red-100 hover:ring-red-200',
  slate:   'bg-slate-50 hover:bg-slate-100 text-slate-800 ring-slate-100 hover:ring-slate-200',
  amber:   'bg-amber-50 hover:bg-amber-100 text-amber-800 ring-amber-100 hover:ring-amber-200',
  rose:    'bg-rose-50 hover:bg-rose-100 text-rose-800 ring-rose-100 hover:ring-rose-200',
};

const TITLE = 'KALKU Baukalkulationen — Wir kalkulieren Ihre Ausschreibung. Sie unterschreiben.';
const DESCRIPTION =
  'Outsourced Baukalkulation für mittelständische Bauunternehmen. Spezialisiert auf öffentliche Ausschreibungen (VOB/A, VgV) in 10 Gewerken. LV in 48 h bepreist. Festpreis ab 200 €. Saarbrücken.';

/**
 * The Home page is a single argument:
 *
 *   1. HERO        — pattern-3 anti-marketing headline + availability bar + product mockup
 *   2. STATS       — 4 hard numbers
 *   3. TRADES      — 10 colored tiles, signals scope in 1 second
 *   4. TRIAGE      — interactive submission-date checker (the radical move)
 *   5. MANIFESTO   — founder letter (named voice, signed)
 *   6. DELIVERABLES — what you actually get (3 deliverables)
 *   7. VIER TEAMS  — how we deliver
 *   8. PROCESS     — 5-step timeline
 *   9. NAMED REF   — one detailed customer story with hard numbers
 *  10. PULL QUOTE  — editorial break
 *  11. ROI BLOCK   — Inhaus vs KALKU CFO math
 *  12. RISK REV    — 6 contractual guarantees (dark section)
 *  13. PRICING     — transparent teaser linking to /konditionen/
 *  14. FAQ         — operational questions
 *  15. FOUNDER     — direct contact, monogram portrait
 *  16. CAL SLOTS   — concrete next-slot preview + 3-channel CTA
 */
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

      <HeroV2 />

      <StatsBand />

      {/* TRADE TILE WALL — colored quintet */}
      <FadeIn>
        <section className="section-tight bg-white">
          <div className="container-page">
            <div className="text-center mb-10">
              <p className="eyebrow mb-3">Gewerke</p>
              <h2 className="display-h2">
                Zehn Gewerke. Ein Kalkulationsteam.
              </h2>
              <p className="prose-body mx-auto mt-4 text-base">
                Anders als reine Hochbau-Outsourcer decken wir das volle Spektrum mittelständischer Bauunternehmen ab —
                von GaLaBau bis Schadstoffsanierung.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 max-w-6xl mx-auto">
              {TRADES.map((t) => (
                <Link
                  key={t.slug}
                  to={`/leistungen/${t.slug}/`}
                  className={cn(
                    'rounded-lg ring-1 text-center py-5 px-3 font-semibold text-sm transition-all duration-150 hover:shadow-sm',
                    TRADE_TILE_CLASSES[t.color] ?? 'bg-gray-50 text-gray-700 ring-gray-100',
                  )}
                >
                  {t.short}
                </Link>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-6 inline-flex items-center justify-center w-full gap-1.5">
              Klicken Sie ein Gewerk an — wir zeigen Ihnen Praxisbeispiele und Pricing.
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </section>
      </FadeIn>

      <FadeIn><SubmissionTriage /></FadeIn>
      <FadeIn><Manifesto /></FadeIn>
      <FadeIn><Deliverables /></FadeIn>
      <FadeIn><VierTeams /></FadeIn>
      <FadeIn><StepsTimeline /></FadeIn>
      <FadeIn><NamedReference /></FadeIn>
      <FadeIn><PullQuote /></FadeIn>
      <FadeIn><RoiBlock /></FadeIn>
      <FadeIn><RiskReversal /></FadeIn>
      <FadeIn><PricingTeaser /></FadeIn>
      <FadeIn><OperationalFaq /></FadeIn>
      <FadeIn><FounderTrust /></FadeIn>
      <FadeIn><CalSlotPreview /></FadeIn>
    </>
  );
}
