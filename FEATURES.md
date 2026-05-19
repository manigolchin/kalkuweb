# Feature inventory — kalku-website

Generated: 2026-05-19 (Phase 1 of autonomous feature audit).

Status legend:
- `untested` — not yet audited
- `audited — clean` — static audit found no issues
- `audited — fixed` — static audit found issues, fixed in commit
- `audited — flagged` — issues need human input (see WORK_QUEUE.md)
- `runtime — pass` / `runtime — fail` — Phase 3 results

## Routes (from src/App.tsx)

| # | Path | Page component | Status |
|---|------|----------------|--------|
| 1 | `/` | Home.tsx | untested |
| 2 | `/neu` | NeuLanding.tsx | untested |
| 3 | `/leistungen` | LeistungenIndex.tsx | untested |
| 4 | `/leistungen/:slug` | Gewerk.tsx | untested |
| 5 | `/ablauf` | Ablauf.tsx | untested |
| 6 | `/konditionen` | Konditionen.tsx | untested |
| 7 | `/ueber-uns` | UeberUns.tsx | untested |
| 8 | `/referenzen` | ReferenzenIndex.tsx | untested |
| 9 | `/referenzen/:slug` | Referenz.tsx | untested |
| 10 | `/tools` | ToolsIndex.tsx | untested |
| 11 | `/tools/gaeb-konverter` | GaebKonverter.tsx | untested |
| 12 | `/tools/kalkulator` | Kalkulator.tsx | untested |
| 13 | `/tools/mittellohn` | Mittellohn.tsx | untested |
| 14 | `/tools/frist-rechner` | FristRechner.tsx | untested |
| 15 | `/tools/buergschaft` | Buergschaft.tsx | untested |
| 16 | `/blog` | BlogIndex.tsx | untested |
| 17 | `/blog/:slug` | BlogPost.tsx | untested |
| 18 | `/kontakt` | Kontakt.tsx | untested |
| 19 | `/impressum` | Impressum.tsx | untested |
| 20 | `/datenschutz` | Datenschutz.tsx | untested |
| 21 | `/agb` | AGB.tsx | untested |
| 22 | `*` (404) | NotFound.tsx | untested |

## Interactive tool pages (priority for runtime audit)

| Page | Behavior | Status |
|------|----------|--------|
| FristRechner.tsx | Date/period calculator with inputs | audited — flagged (2026-05-19, static-only; see WORK_QUEUE) |
| Buergschaft.tsx | Bond/surety calculator | audited — flagged (2026-05-19, static-only; see WORK_QUEUE) |
| GaebKonverter.tsx | GAEB file parser/converter (uses src/lib/gaeb/*) | untested |
| Kalkulator.tsx | Cost calculator with inputs | untested |
| Mittellohn.tsx | Average wage calculator | untested |

## Layout components

| Component | Role | Status |
|-----------|------|--------|
| layout/Layout.tsx | Outlet wrapper, applies Nav + Footer | untested |
| layout/Nav.tsx | Top navigation (interactive: mobile menu) | untested |
| layout/Footer.tsx | Site footer | untested |

## Global overlay / floating components

| Component | Role | Status |
|-----------|------|--------|
| StickyMobileCta.tsx | Mobile sticky CTA bar (interactive) | untested |
| ExitIntent.tsx | Exit-intent modal (interactive) | untested |
| WhatsAppFab.tsx | WhatsApp floating action button | untested |
| SelfCheck.tsx | Self-check widget (interactive) | untested |
| CalendlyEmbed.tsx | Calendly iframe embed | untested |

## Section components (composed onto pages)

| Component | Role | Status |
|-----------|------|--------|
| sections/AndereTools.tsx | Cross-promotes other tools | untested |
| sections/CalSlotPreview.tsx | Calendar slot teaser | untested |
| sections/CareerBanner.tsx | Career CTA banner | untested |
| sections/CaseStudies.tsx | Case study grid | untested |
| sections/Deliverables.tsx | Deliverables list | untested |
| sections/Differentiator.tsx | Value-prop diff vs competitors | untested |
| sections/Eligibility.tsx | Eligibility/qualification block | untested |
| sections/FounderTrust.tsx | Founder trust statement | untested |
| sections/HeroLvCard.tsx | LV-card hero variant | untested |
| sections/HeroMockup.tsx | Hero with mockup | untested |
| sections/HeroV2.tsx | Hero variant V2 | untested |
| sections/IrrtumFaq.tsx | Common-misconception FAQ | untested |
| sections/LeadMagnet.tsx | Lead-magnet form (interactive) | untested |
| sections/Manifesto.tsx | Manifesto text block | untested |
| sections/NamedReference.tsx | Named-reference quote | untested |
| sections/OperationalFaq.tsx | Operational FAQ | untested |
| sections/PricingTeaser.tsx | Pricing teaser | untested |
| sections/PricingTiles.tsx | Pricing tiles | untested |
| sections/PullQuote.tsx | Pull-quote layout | untested |
| sections/ResourceHub.tsx | Resource-hub block | untested |
| sections/RiskReversal.tsx | Risk-reversal guarantee block | untested |
| sections/RoiBlock.tsx | ROI calculator block (interactive) | untested |
| sections/ServiceArea.tsx | Service area / geo block | untested |
| sections/StatsBand.tsx | Stats band | untested |
| sections/StepsTimeline.tsx | Process timeline | untested |
| sections/SubmissionTriage.tsx | Submission triage block (interactive) | untested |
| sections/TechStack.tsx | Tech-stack logos | untested |
| sections/Testimonials.tsx | Testimonials slider/grid | untested |
| sections/TrustBadges.tsx | Trust badges | untested |
| sections/UrgencyCta.tsx | Urgency CTA | untested |
| sections/VierTeams.tsx | Four-teams block | untested |

## Forms

| Component | Role | Status |
|-----------|------|--------|
| forms/MultiStepForm.tsx | Multi-step contact / lead form | untested |

## UI primitives (low priority — usually composed)

| Component | Role | Status |
|-----------|------|--------|
| ui/AnimatedCounter.tsx | Counter that animates on viewport entry | untested |
| ui/FadeIn.tsx | Fade-in wrapper | untested |
| ui/FaqItem.tsx | Disclosure/accordion item (interactive) | untested |
| ui/SectionHeader.tsx | Standardized section header | untested |

## Library / data modules (audited indirectly via consuming features)

- `src/data/blog.tsx` — blog posts data source (covered when auditing BlogIndex/BlogPost)
- `src/lib/gaeb/*` — GAEB parser/exporter (covered when auditing GaebKonverter)
- `src/lib/seo.ts` — SEO helper (cross-cutting)
- `src/lib/toolSchema.ts` — tool schema helpers (cross-cutting)
- `src/lib/useInView.ts` — viewport hook (cross-cutting)
- `src/lib/utils.ts` / `src/lib/constants.ts` — utilities (cross-cutting)

## Audit plan

- Phase 2 priority order: interactive tool pages first (FristRechner, Buergschaft, GaebKonverter, Kalkulator, Mittellohn), then forms (MultiStepForm), then global overlays (Nav, ExitIntent, StickyMobileCta, SelfCheck, WhatsAppFab, CalendlyEmbed), then sections with interactivity (LeadMagnet, RoiBlock, SubmissionTriage, FaqItem), then static pages and section components.
- Phase 3 runs after Phase 2 completes for each feature.
