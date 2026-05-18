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

const TITLE = 'KALKU v2 Preview — Wir kalkulieren Ihre Ausschreibung. Sie unterschreiben.';
const DESCRIPTION =
  'Preview-Version der neuen kalku.de — Conversion-getunte Landingpage für mittelständische Bauunternehmen. Spezialisiert auf öffentliche Ausschreibungen (VOB/A, VgV) in 10 Gewerken.';

/**
 * /neu/ — V2 landing preview.
 *
 * Conversion-tuned redesign for Bauunternehmer-Inhaber. Lives at /neu/ so the
 * established v1 on / stays intact. When v2 is approved, it can replace Home.tsx.
 *
 * Sequence:
 *   1. HeroV2     — pattern-3 anti-marketing headline + availability bar + LV mockup
 *   2. StatsBand  — 4 hard numbers
 *   3. Trades     — 10 colored tiles
 *   4. Triage     — interactive submission-date checker
 *   5. Manifesto  — founder letter (named voice, signed)
 *   6. Deliverables — 3 concrete handoffs
 *   7. VierTeams  — how we deliver
 *   8. Steps      — 5-step timeline
 *   9. NamedRef   — one detailed customer story with hard numbers
 *  10. PullQuote  — editorial break
 *  11. RoiBlock   — Inhaus vs KALKU CFO math
 *  12. RiskRev    — 6 contractual guarantees (dark section)
 *  13. PricingT   — transparent teaser → /konditionen/
 *  14. FAQ        — operational questions
 *  15. Founder    — direct contact, monogram portrait
 *  16. CalSlot    — concrete next-slot preview + 3-channel CTA
 */
export default function NeuLanding() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={canonical('/neu/')} />
        {/* Don't index the preview — keep SEO juice on / for now */}
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical('/neu/')} />
        <script type="application/ld+json">{jsonLd(organizationGraph())}</script>
      </Helmet>

      {/* Preview-banner — small, dismissible-feeling but functional, to make it clear this is the v2 preview */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
        <div className="container-page py-2 flex flex-wrap items-center justify-center gap-3 text-center">
          <span className="font-bold uppercase tracking-wider">v2 Preview</span>
          <span className="text-amber-700">·</span>
          <span>Neue Conversion-getunte Landingpage</span>
          <span className="text-amber-700">·</span>
          <Link to="/" className="font-semibold underline underline-offset-2 hover:text-amber-900">
            Zur aktuellen Startseite
          </Link>
        </div>
      </div>

      <HeroV2 />

      <StatsBand />

      {/* TRADE TILE WALL — colored quintet */}
      <FadeIn>
        <section className="section-tight bg-white">
          <div className="container-page">
            <div className="text-center mb-10">
              <p className="eyebrow mb-3">Gewerke</p>
              <h2 className="display-h2">Zehn Gewerke. Ein Kalkulationsteam.</h2>
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
