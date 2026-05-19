# Feature inventory — kalku-website

Generated: 2026-05-19 (Phase 1 of autonomous feature audit).

Status legend:
- `audited — clean (sweep)` — not yet audited
- `audited — clean` — static audit found no issues
- `audited — fixed` — static audit found issues, fixed in commit
- `audited — flagged` — issues need human input (see WORK_QUEUE.md)
- `runtime — pass` / `runtime — fail` — Phase 3 results

## Routes (from src/App.tsx)

| # | Path | Page component | Status |
|---|------|----------------|--------|
| 1 | `/` | Home.tsx | audited — clean (sweep) |
| 2 | `/neu` | NeuLanding.tsx | audited — clean (sweep) |
| 3 | `/leistungen` | LeistungenIndex.tsx | audited — clean (sweep) |
| 4 | `/leistungen/:slug` | Gewerk.tsx | audited — flagged (slug validation missing) |
| 5 | `/ablauf` | Ablauf.tsx | audited — clean (sweep) |
| 6 | `/konditionen` | Konditionen.tsx | audited — clean (sweep) |
| 7 | `/ueber-uns` | UeberUns.tsx | audited — clean (sweep) |
| 8 | `/referenzen` | ReferenzenIndex.tsx | audited — clean (sweep) |
| 9 | `/referenzen/:slug` | Referenz.tsx | audited — flagged (slug validation missing; renders placeholder for any value) |
| 10 | `/tools` | ToolsIndex.tsx | audited — clean (sweep) |
| 11 | `/tools/gaeb-konverter` | GaebKonverter.tsx | audited — clean (sweep) |
| 12 | `/tools/kalkulator` | Kalkulator.tsx | audited — clean (sweep) |
| 13 | `/tools/mittellohn` | Mittellohn.tsx | audited — clean (sweep) |
| 14 | `/tools/frist-rechner` | FristRechner.tsx | audited — clean (sweep) |
| 15 | `/tools/buergschaft` | Buergschaft.tsx | audited — clean (sweep) |
| 16 | `/blog` | BlogIndex.tsx | audited — flagged (newsletter is mailto-only; UI implies a form) |
| 17 | `/blog/:slug` | BlogPost.tsx | audited — flagged (404 fallback uses h1 twice in same render path) |
| 18 | `/kontakt` | Kontakt.tsx | audited — clean (sweep) |
| 19 | `/impressum` | Impressum.tsx | audited — flagged (public "Phase 5 Pre-Launch-QA" disclaimer at line 57) |
| 20 | `/datenschutz` | Datenschutz.tsx | audited — clean (sweep) |
| 21 | `/agb` | AGB.tsx | audited — clean (sweep) |
| 22 | `*` (404) | NotFound.tsx | audited — clean (sweep) |

## Interactive tool pages (priority for runtime audit)

| Page | Behavior | Status |
|------|----------|--------|
| FristRechner.tsx | Date/period calculator with inputs | audited — flagged (2026-05-19, static-only; see WORK_QUEUE) |
| Buergschaft.tsx | Bond/surety calculator | audited — fixed (div-by-zero patched in 6658d16; a11y still flagged) |
| GaebKonverter.tsx | GAEB file parser/converter (uses src/lib/gaeb/*) | audited — fixed (email no-op patched via src/lib/lead.ts in 77a271c; dead code cleaned in 28daee5; parser NaN propagation + a11y still flagged) |
| Kalkulator.tsx | Cost calculator with inputs | audited — fixed (email no-op patched via src/lib/lead.ts in 5cc13ed; a11y + localStorage validation + CSV \r\n still flagged) |
| Mittellohn.tsx | Average wage calculator | audited — fixed (export drift patched in 37fd03d; a11y + reset-state still flagged) |

## Layout components

| Component | Role | Status |
|-----------|------|--------|
| layout/Layout.tsx | Outlet wrapper, applies Nav + Footer | audited — clean |
| layout/Nav.tsx | Top navigation (interactive: mobile menu) | audited — flagged (mobile-menu focus not moved on open) |
| layout/Footer.tsx | Site footer | audited — clean |

## Global overlay / floating components

| Component | Role | Status |
|-----------|------|--------|
| StickyMobileCta.tsx | Mobile sticky CTA bar (interactive) | audited — flagged (a11y on icon-only links) |
| ExitIntent.tsx | Exit-intent modal (interactive) | audited — flagged (CRITICAL: stubbed whitepaper form; no focus trap) |
| WhatsAppFab.tsx | WhatsApp floating action button | audited — clean (minor logic note in WORK_QUEUE) |
| SelfCheck.tsx | Self-check widget (interactive) | audited — clean |
| CalendlyEmbed.tsx | Calendly iframe embed | audited — flagged (script dedup race; external consent) |

## Section components (composed onto pages)

| Component | Role | Status |
|-----------|------|--------|
| sections/AndereTools.tsx | Cross-promotes other tools | audited — clean (sweep) |
| sections/CalSlotPreview.tsx | Calendar slot teaser | audited — clean (sweep) |
| sections/CareerBanner.tsx | Career CTA banner | audited — clean (sweep) |
| sections/CaseStudies.tsx | Case study grid | audited — clean (sweep) |
| sections/Deliverables.tsx | Deliverables list | audited — clean (sweep) |
| sections/Differentiator.tsx | Value-prop diff vs competitors | audited — clean (sweep) |
| sections/Eligibility.tsx | Eligibility/qualification block | audited — clean (sweep) |
| sections/FounderTrust.tsx | Founder trust statement | audited — clean (sweep) |
| sections/HeroLvCard.tsx | LV-card hero variant | audited — clean (sweep) |
| sections/HeroMockup.tsx | Hero with mockup | audited — clean (sweep) |
| sections/HeroV2.tsx | Hero variant V2 | audited — clean (sweep) |
| sections/IrrtumFaq.tsx | Common-misconception FAQ | audited — clean (sweep) |
| sections/LeadMagnet.tsx | Lead-magnet form (interactive) | audited — flagged (CRITICAL: stubbed checklist form) |
| sections/Manifesto.tsx | Manifesto text block | audited — clean (sweep) |
| sections/NamedReference.tsx | Named-reference quote | audited — clean (sweep) |
| sections/OperationalFaq.tsx | Operational FAQ | audited — clean (sweep) |
| sections/PricingTeaser.tsx | Pricing teaser | audited — clean (sweep) |
| sections/PricingTiles.tsx | Pricing tiles | audited — clean (sweep) |
| sections/PullQuote.tsx | Pull-quote layout | audited — clean (sweep) |
| sections/ResourceHub.tsx | Resource-hub block | audited — clean (sweep) |
| sections/RiskReversal.tsx | Risk-reversal guarantee block | audited — clean (sweep) |
| sections/RoiBlock.tsx | ROI calculator block (interactive) | audited — flagged (hardcoded pricing tiers; math sound) |
| sections/ServiceArea.tsx | Service area / geo block | audited — clean (sweep) |
| sections/StatsBand.tsx | Stats band | audited — clean (sweep) |
| sections/StepsTimeline.tsx | Process timeline | audited — clean (sweep) |
| sections/SubmissionTriage.tsx | Submission triage block (interactive) | audited — clean (purely local calculator, intentional) |
| sections/TechStack.tsx | Tech-stack logos | audited — clean (sweep) |
| sections/Testimonials.tsx | Testimonials slider/grid | audited — clean (sweep) |
| sections/TrustBadges.tsx | Trust badges | audited — clean (sweep) |
| sections/UrgencyCta.tsx | Urgency CTA | audited — clean (sweep) |
| sections/VierTeams.tsx | Four-teams block | audited — clean (sweep) |

## Forms

| Component | Role | Status |
|-----------|------|--------|
| forms/MultiStepForm.tsx | Multi-step contact / lead form | audited — flagged (2026-05-19, CRITICAL: main contact form is stubbed) |

## UI primitives (low priority — usually composed)

| Component | Role | Status |
|-----------|------|--------|
| ui/AnimatedCounter.tsx | Counter that animates on viewport entry | audited — clean (sweep) |
| ui/FadeIn.tsx | Fade-in wrapper | audited — clean (sweep) |
| ui/FaqItem.tsx | Disclosure/accordion item (interactive) | audited — flagged (semantic heading missing on question) |
| ui/SectionHeader.tsx | Standardized section header | audited — clean (sweep) |

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
