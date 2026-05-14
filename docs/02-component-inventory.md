# 02 — Component Inventory

> **Source files:**
> - `frontend/src/pages/LandingPage.tsx` (3254 lines, the customer-acquisition-booster benchmark)
> - `frontend/src/components/LandingShell.tsx` (137 lines, the shared shell exported as `LandingNav`, `LandingFooter`, `LandingLayout`)
> - `frontend/src/components/ChatWidget.tsx` (Crisp loader, no UI of its own)
>
> **Convention used in this doc:**
> - **Tailwind classes** are quoted exactly. They are the contract.
> - **Reusability notes** assume Phase 3 will refactor inline JSX into a shared component library (e.g. `<Section>`, `<Card>`, `<CTA>`, `<Eyebrow>`, `<TradeBadge>`). Suggestions are advisory.
> - **Animation** assumes the `useInView` + `.landing-fade-in` pattern from `index.css` is replicated. (See doc 1, Section 7.)

---

## Section index (top→bottom in LandingPage.tsx)

| #  | Component / section                                          | Lines       |
| -- | ------------------------------------------------------------ | ----------- |
| 1  | Top Navigation (sticky, scroll-shadow)                       | 390-451     |
| 2  | Hero — split copy + UI mockup                                | 453-633     |
| 3  | Before / After comparison (2-card row)                       | 635-692     |
| 4  | Customer-stats strip + trade icon-tile wall                  | 694-735     |
| 5  | "So funktioniert's" — 4-step how-it-works grid               | 737-798     |
| 6  | Features grid (12 feature cards, with "Neu" badges)          | 800-924     |
| 7  | Submissionskarte showcase (split copy + map mock)            | 926-1082    |
| 8  | Customer testimonials (6 tinted gradient cards)              | 1084-1186   |
| 9  | Detailed case studies (3 metric-table cards)                 | 1188-1300   |
| 10 | ROI calculator (interactive sliders)                         | 1302-1310 (uses ROICalculator at 125-245) |
| 11 | Industry-specific demo selector (3 trade CTAs)               | 1312-1358   |
| 12 | Gewerke list (7 trade cards)                                 | 1360-1404   |
| 13 | Comparison table (KALKU vs Manuell vs Generisch)             | 1406-1460   |
| 14 | Pricing (3 tiers + monthly/yearly toggle)                    | 1462-1603   |
| 15 | Risk-Reversal / Garantie (4 promise tiles)                   | 1605-1670   |
| 16 | Onboarding journey (4 phase cards + trust callout)           | 1672-1761   |
| 17 | Lead-magnet CTA hero (LV-Analyse, on gradient bg)            | 1763-1847   |
| 18 | Live metrics on primary-500 bg (animated counters)           | 1849-1880   |
| 19 | FAQ (search input + accordion list)                          | 1882-1938   |
| 20 | Founder/team trust block (split copy + 2 stat cards)         | 1940-2052   |
| 21 | Contact section (3-path selector + form)                     | 2054-2291   |
| 22 | Footer (single-row dark with all legal links)                | 2293-2322   |
| 23 | Sticky mobile CTA bar                                        | 2324-2337   |
| 24 | Video modal (multi-track slideshow)                          | 2339-2345 + 2410-3237 |
| 25 | Exit-intent modal (whitepaper email capture)                 | 2347-2405   |
| 26 | Chat widget (Crisp loader)                                   | external (App.tsx) |

Internal helpers / sub-components used inside the above:

| Helper                | Lines       | Purpose                                                  |
| --------------------- | ----------- | -------------------------------------------------------- |
| `useInView(threshold)`| 64-78       | IntersectionObserver hook for scroll-triggered fade-in.  |
| `AnimatedCounter`     | 81-100      | Counts from 0→target on enter-viewport (1800 ms).        |
| `FAQItem`             | 103-122     | Single accordion row with chevron + max-height morph.    |
| `ROICalculator`       | 125-245     | Self-contained slider + result panel.                    |
| `BrowserFrame`        | 2429-2445   | Mock browser chrome (mac dots + URL pill) for video.     |
| `SceneChrome`         | 2447-2473   | Eyebrow + title + subtitle wrapper inside video scenes.  |
| `TypewriterText`      | 2475-2487   | (Defined but unused; kept for future scenes.)            |
| `VideoSlideshow`      | 3078-3237   | The whole video-modal player UI.                         |
| `renderCell`          | 3243-3253   | Renders comparison-table cells (✓ / ✗ / partial / value).|

---

## 1. Top Navigation (sticky, scroll-shadow)

**Source:** `LandingPage.tsx` lines 390-451 (this page's inline copy) and `LandingShell.tsx` lines 13-76 (shared version exported as `<LandingNav>`).

### Anatomy

- Left: brand block — `9×9 rounded-lg` blue square with `<Send>` icon → wordmark `KALKU` (bold gray-900) + `Procurement` (light gray-500).
- Right (desktop, `hidden md:flex`): 4 nav anchors (`Funktionen | ROI-Rechner | Preise | Kontakt`) + `Anmelden` link + `Kostenlos testen` green CTA button.
- Right (mobile, `md:hidden`): hamburger toggle (`<Menu>`/`<X>` swap).
- Mobile-open drawer: full-width white sheet under nav with each link as a row + green CTA.

### Outer fingerprint (Tailwind contract)

```jsx
<nav className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-md' : ''}`}>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      …
    </div>
  </div>
</nav>
```

### Variants

- **Resting:** `bg-white` no shadow.
- **Scrolled (`window.scrollY > 10`):** `+shadow-md`.
- **Mobile open:** `<div className="md:hidden bg-white border-t border-gray-100 shadow-lg">…</div>` slides under the bar.

### Interaction

- Hover state on nav links: `hover:text-primary-500 transition-colors`.
- Hover on CTA: `hover:opacity-90 transition-opacity`.
- CTA `disabled:opacity-50` while `demoLoading === 'default'` (button text becomes "Lädt...").
- Brand-block `cursor-pointer` triggers `scrollTo('hero')`.

### Reusability notes

- Two implementations diverge (see doc 1 §13.9). Phase 3 should ship a single `<Header navItems={…} cta={…} variant="scroll-anchor|page-link">`.
- Logo block is itself a reusable `<Brand>` component used in 4 places (nav, footer, video-modal hero, exit modal isn't using it).

---

## 2. Hero — split copy + UI mockup

**Source:** lines 453-633.

### Anatomy

Two-column grid (`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center`):

- **Left column (always visible):**
  - Eyebrow chip: `<Zap>` + "KI-gestützte Automatisierung", in `bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-sm font-medium`.
  - h1 (3 lines, with mid-word colored highlight): `Preisanfragen in <span className="text-primary-500">Minuten</span> statt Stunden`.
  - Lead paragraph: `text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl`.
  - 3 CTAs in a row (`flex flex-wrap gap-4`):
    1. Primary green "Kostenlos testen" with right `<ArrowRight>` (or `<Loader2 animate-spin>` while loading).
    2. Outline "Video ansehen" with left `<Play>` icon (opens `<VideoSlideshow>`).
    3. Outline "Persönliche Demo" (scrolls to contact).
  - Trust-badge row (`mt-6 flex flex-wrap gap-3 text-xs text-gray-600`): 4 anchored chips (`Server in Deutschland`, `DSGVO-konform`, `SSL-verschlüsselt`, `AV-Vertrag verfügbar`), each linking to `/dsgvo` or `/avv`. Pattern: `bg-gray-50 hover:bg-primary-50 hover:border-primary-300 border border-gray-200 px-3 py-1.5 rounded-full`.
  - Trust footer: thin `pt-6 border-t border-gray-100`, then "Bereits im Einsatz bei Bauunternehmen aus" + 7 trade tags (each its own bg/text color combo — see doc 1 §1.3).
- **Right column (`hidden lg:block` — desktop only):**
  - Stylized UI mockup: gray rounded outer (`bg-gray-50 rounded-2xl border border-gray-200 shadow-lg p-6 space-y-4`).
  - Mockup chrome: 3 mac dots + URL `preisanfrage.kalkus.de`.
  - 3 stacked white cards: "LV hochgeladen" (FileText icon), "KI-Klassifizierung" (Brain) with 6 category tiles + "Erkannte Hersteller" chips, "12 Preisanfragen versendet" (Mail).
  - Floating badge (absolute bottom-left): "4 Stunden gespart pro Ausschreibung" with green check icon.

### Outer fingerprint

```jsx
<section id="hero" className="pt-24 pb-16 sm:pt-32 sm:pb-24 bg-white">
  <div ref={heroAnim.ref}
       className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${heroAnim.isVisible ? 'landing-visible' : ''}`}>
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">…</div>
  </div>
</section>
```

### Variants

- Mobile (< lg): mockup hidden; left column expands full width.
- Hero CTA hover: `hover:opacity-90` (green) / `hover:bg-gray-50` (outline buttons).

### Interaction

- `useInView(0.1)` triggers `.landing-fade-in` cascade.
- "Kostenlos testen" → `startDemo()` (POST `/api/auth/demo-login?trade=galabau`, sets localStorage, redirects to `/`).
- "Video ansehen" → opens `<VideoSlideshow>` modal.
- "Persönliche Demo" → smooth scrolls to `#kontakt`.
- Trust-badge hover: bg becomes `primary-50`, border `primary-300`.

### Reusability notes

- Pattern is `<HeroSplit eyebrow={…} title={…} highlight={…} subtitle={…} ctas={[…]} trustBadges={[…]} aside={<MockupCard/>} />`.
- The "highlight word in title" trick (`<span className="text-primary-500">Minuten</span>`) is repeatable.
- The mockup is a one-of-a-kind, decorative — keep as a dedicated `<HeroAppMockup>` component.

---

## 3. Before / After comparison (2-card row)

**Source:** lines 635-692.

### Anatomy

Section eyebrow `Der Unterschied, der zählt` + subtitle `Was sich für Ihre Kalkulation ändert`. Two cards side-by-side (`grid md:grid-cols-2 gap-6`):

- **Before card (left):**
  - Outer: `bg-white rounded-2xl border-2 border-red-100 p-6 sm:p-8`.
  - Eyebrow pill: `bg-red-50 text-red-700` with `<XIcon>` "OHNE KALKU".
  - Title `Der manuelle Alltag`.
  - 6-item list, each `<XIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />` + text.
- **After card (right):**
  - Outer: `bg-white rounded-2xl border-2 border-kalku-green/30 shadow-md p-6 sm:p-8` (the slight `shadow-md` denotes positive emphasis).
  - Eyebrow pill: `bg-kalku-green/10 text-kalku-green` with `<Check>` "MIT KALKU".
  - Title `Automatisiert & strukturiert`.
  - 6-item list, each `<Check className="w-4 h-4 text-kalku-green shrink-0 mt-0.5" />`.

### Outer fingerprint

```jsx
<section className="py-12 sm:py-16 bg-gradient-to-br from-gray-50 to-white">
  <div ref={trustAnim.ref}
       className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${trustAnim.isVisible ? 'landing-visible' : ''}`}>
```

### Reusability notes

- Pattern: `<ComparePair before={{title, items, color: 'red'}} after={{title, items, color: 'green'}} />`.
- The After card's `shadow-md` is the only differentiator beyond color — keep it intentional.

---

## 4. Customer-stats strip + trade icon-tile wall

**Source:** lines 694-735.

### Anatomy

- Eyebrow uppercase: `Vertraut von Bauunternehmen aus ganz Deutschland`.
- Big animated number (`<AnimatedCounter target={stats.companies} suffix="+" />`) + `aktive Bauunternehmen` subtitle.
- 6-tile responsive grid (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto`):
  - Each tile: `bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-md transition-all flex flex-col items-center gap-2`.
  - Icon chip: `w-10 h-10 ${tradeBg} rounded-lg flex items-center justify-center` + lucide icon `w-5 h-5 ${tradeColor}`.
  - Trade label: `text-sm font-bold text-gray-900`.
- Footer line: `★ 4.9 / 5 in Kundenzufriedenheits-Umfrage 2026 · Auf Wunsch organisieren wir einen Referenz-Anruf …`.

### Outer fingerprint

```jsx
<section className="py-12 sm:py-16 bg-white border-y border-gray-100">
  <div ref={logoWallAnim.ref}
       className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${logoWallAnim.isVisible ? 'landing-visible' : ''}`}>
```

### Reusability notes

- "Anonymized logo wall" via trade icon-tiles (no real logos; respects privacy commit referenced in repo). Phase 3 should preserve this — the tile component is `<TradeTile trade="galabau" icon={Leaf} />`.
- The 5-star rating line is a separate textual block; consider lifting into `<RatingLine value="4.9" outOf="5" copy="…" />`.

---

## 5. "So funktioniert's" — 4-step how-it-works grid

**Source:** lines 737-798.

### Anatomy

- Centered header: `text-3xl sm:text-4xl font-bold` + descriptive subtitle.
- 4 cards in `grid sm:grid-cols-2 lg:grid-cols-4 gap-8`:
  - Outer: `relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group`.
  - Watermarked step number (`<span className="absolute top-4 right-4 text-4xl font-bold text-gray-100 group-hover:text-primary-100 transition-colors select-none">{step}</span>`).
  - Icon chip: `w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4` + `w-6 h-6 ${iconColor}`.
  - Title `text-lg font-semibold text-gray-900 mb-2`.
  - Body `text-gray-600 text-sm leading-relaxed`.

Steps & color pairs: 01 Upload (primary-100/primary-600), 02 KI (purple-100/purple-600), 03 Versand (`kalku-green/10`/kalku-green), 04 Verwalten (amber-100/amber-600).

### Outer fingerprint

```jsx
<section id="so-funktionierts" className="py-16 sm:py-24 bg-gray-50">
```

### Reusability notes

- Component: `<HowItWorksStep step="01" icon={Icon} title="…" body="…" iconBg="bg-primary-100" iconColor="text-primary-600" />`.
- The watermarked step number that brightens on hover is the signature interaction — preserve it.

---

## 6. Features grid (12 cards)

**Source:** lines 800-924.

### Anatomy

- Centered header `Alles, was Ihre Kalkulation braucht`.
- 12 feature cards (data-driven, `.map()`) in `grid sm:grid-cols-2 lg:grid-cols-3 gap-8`:
  - Outer: `relative bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group`.
  - Optional "Neu" pill (`absolute top-4 right-4 inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider`) with `<Sparkles className="w-3 h-3" />`.
  - Icon chip: `w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`.
  - Title `text-lg font-semibold text-gray-900 mb-2`.
  - Body `text-gray-600 text-sm leading-relaxed`.
- "Alle Funktionen entdecken" link below grid: `inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700` + `<ArrowRight>`.

### Feature data (12 entries)

```
KI-Klassifizierung (purple)
Automatischer Versand (primary)
KI-Lieferantensuche (emerald)
Posteingang-Überwachung (teal)
Lernagent (amber)
Vollautomatisierung (sky)
Submissionskarte ✦ (rose, isNew)
Vergabe-Status-Tracking ✦ (indigo, isNew)
Adaptiver Such-Radius ✦ (cyan, isNew)
AVV-Abfallschlüssel-PDF ✦ (red, isNew)
Lücken-Erkennung im Gewerk-PDF ✦ (violet, isNew)
```

### Outer fingerprint

```jsx
<section id="funktionen" className="py-16 sm:py-24 bg-white">
```

### Reusability notes

- Component: `<FeatureCard icon={Icon} title="…" body="…" iconBg="bg-purple-100" iconColor="text-purple-600" isNew={false} />`.
- "Neu" pill should be a separate `<NewBadge />` component since it's used in multiple sections (features, gewerke).

---

## 7. Submissionskarte showcase (split copy + custom map mock)

**Source:** lines 926-1082.

### Anatomy

Split layout (`grid lg:grid-cols-2 gap-12 items-center`):

- **Left:**
  - "Neu in KALKU" rose eyebrow chip with `<Sparkles>`.
  - h2 `Submissionskarte — Ihre Wettbewerbsposition auf einen Blick` (with `&shy;` soft-hyphen).
  - Body paragraph.
  - 4 feature rows with icon-on-left + title + body:
    - Trophy/amber — Platzierung auf einen Klick
    - MapPin/rose — Alle Baustellen auf einer Karte
    - Target/emerald — Strategische Erkenntnisse
    - FileCheck/sky — Direkter PDF-Zugriff
- **Right (the map mock):**
  - Outer card: `relative bg-white rounded-2xl shadow-2xl shadow-rose-500/10 border border-gray-100 overflow-hidden`.
  - Map area: `relative h-[420px] bg-[radial-gradient(ellipse_at_center,_#dbeafe_0%,_#ecfccb_45%,_#fef3c7_100%)] overflow-hidden`.
  - Faint country outline: SVG `<path>` with `strokeDasharray="4 4"`.
  - 6 hand-drawn map pins (custom SVG with rank text inside), positioned with `style={{ top: '12%', left: '62%' }}`.
  - Popup mock for the blue "winner" pin: `bg-white rounded-lg shadow-lg border border-slate-200 p-3 text-xs` with project name, postal code, teilnehmer, our rank, sum.
  - Legend chip (bottom-left): `bg-white/90 backdrop-blur rounded-lg shadow-sm border border-slate-200 px-3 py-2 text-[10px]` with 4 swatch colors (emerald/amber/red/blue).
  - Bottom "tab bar" chrome: `bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500`.
  - Decorative glow (behind card, `-z-10`): `bg-gradient-to-br from-rose-200/40 via-amber-200/30 to-emerald-200/40 blur-3xl rounded-full`.

### Outer fingerprint

```jsx
<section className="py-16 sm:py-24 bg-gradient-to-br from-slate-50 via-white to-rose-50/40">
```

### Reusability notes

- This is a **highly bespoke** showcase. Phase 3 should keep it as a single `<SubmissionskarteShowcase />` component because every detail (custom SVG pins, popup positioning, legend) is hand-tuned.
- The icon-row pattern on the left (`<div className="flex gap-4"><div className="shrink-0 w-10 h-10 ${iconBg} rounded-lg ...">`) is reusable as `<IconRow icon={…} title={…} body={…} />` — appears here, in Founder section, in Garantie subset.

---

## 8. Customer testimonials (6 tinted gradient cards)

**Source:** lines 1084-1186.

### Anatomy

- Eyebrow `Was unsere Kunden sagen` (primary tint with `<Quote>` icon).
- h2 `Bauunternehmer, die heute schon mit KALKU arbeiten`.
- Subtitle paragraph.
- 6 cards in `grid md:grid-cols-2 lg:grid-cols-3 gap-6`:
  - Outer: `relative bg-gradient-to-br ${t.color} rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow`.
  - Background `Quote` icon (decorative, top-right): `absolute top-4 right-4 w-8 h-8 text-white/50`.
  - 5-star row: `flex items-center gap-1 mb-3` with 5× `<Star className="w-4 h-4 text-amber-500 fill-amber-500" />`.
  - Quote text: `text-gray-800 leading-relaxed italic` wrapped in German typographic quotes `&bdquo;…&ldquo;`.
  - Author block at bottom (`mt-5 pt-4 border-t border-white/60 flex items-center gap-3`): solid-color `w-10 h-10 ${iconBg} text-white rounded-full` icon + role + company/location text.

### Tinted gradients per testimonial (one per trade)

```
Leitungsbau:    from-teal-100 to-emerald-50    + bg-teal-500 icon
Elektro:        from-yellow-100 to-amber-50    + bg-yellow-500
GaLaBau:        from-emerald-100 to-green-50   + bg-emerald-500
Tiefbau:        from-sky-100 to-blue-50        + bg-sky-500
Haustechnik:    from-orange-100 to-amber-50    + bg-orange-500
Schadstoff:     from-red-100 to-rose-50        + bg-red-500
```

### Outer fingerprint

```jsx
<section id="kundenstimmen" className="py-16 sm:py-24 bg-white">
```

### Reusability notes

- Component: `<TestimonialCard quote="…" role="…" company="…" location="…" tradeColor="teal-emerald" icon={HardHat} />`.
- Names anonymized intentionally (privacy commit `3da2962`); keep that contract in props (no `name` field).
- The decorative `<Quote>` watermark is at `text-white/50` so it shows on tinted gradients — reuse this exact opacity.

---

## 9. Detailed case studies (3 metric-table cards)

**Source:** lines 1188-1300.

### Anatomy

- Eyebrow (kalku-green tint with `<TrendingUp>`).
- h2 `Drei Bauunternehmen, drei messbare Erfolge`.
- 3 cards in `grid lg:grid-cols-3 gap-6`:
  - Outer: `bg-gradient-to-br ${color} rounded-2xl p-6 border-2 ${borderColor} shadow-sm hover:shadow-lg transition-all`. (Border color and gradient share one string like `border-teal-300 from-teal-50 to-white` — see doc 1 §1.6.)
  - Header: icon chip + small `MA-Größe` pill (`text-xs font-medium text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200`).
  - Company name `text-xl font-bold text-gray-900`.
  - Location · trade meta line.
  - 3 metric rows (`bg-white rounded-xl p-3 border border-gray-100`):
    - Eyebrow label `text-xs font-semibold text-gray-500 uppercase tracking-wide`.
    - Before-→-After row: `text-red-500 line-through tabular-nums` `<ArrowRight w-3.5>` `font-bold text-kalku-green tabular-nums`.
    - Right-end "savings" pill: `text-[11px] font-bold text-kalku-green bg-kalku-green/10 px-2 py-0.5 rounded-full`.
- Below grid, centered CTA: `bg-kalku-green text-white px-7 py-3 rounded-xl font-semibold ... shadow-lg shadow-kalku-green/20` "Auf Wunsch: Referenz-Anruf mit einem dieser Kunden".

### Outer fingerprint

```jsx
<section className="py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-white">
```

### Reusability notes

- Component: `<CaseStudyCard company={…} location={…} trade={…} size={…} metrics={[{label, from, to, savings}]} tradeColor="teal" />`.
- The before-→-after with strikethrough red + green bold is the visual contract — reuse exactly.
- `tabular-nums` keeps the digits monospace-aligned even in a proportional font.

---

## 10. ROI calculator

**Source:** wrapper section lines 1302-1310; `ROICalculator` component lines 125-245.

### Anatomy

Outer wrap card: `bg-white rounded-2xl border-2 border-primary-100 shadow-xl p-6 sm:p-10 max-w-5xl mx-auto`.

- Header (centered):
  - Eyebrow `bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-sm font-semibold` with `<Calculator>` "ROI-Rechner".
  - h3 `text-2xl sm:text-3xl font-bold` "Berechnen Sie Ihre Ersparnis".
  - Subtitle.
- Two columns (`grid md:grid-cols-2 gap-8`):
  - **Left — inputs:** 3 sliders (`tendersPerMonth`, `hours`, `rate`) each in a `<div>` with:
    - Top row: `flex items-center justify-between mb-2` — label (with icon) + bold value `text-lg font-bold text-primary-600`.
    - Slider: `<input type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500" />`.
    - Min/max ticks: `flex justify-between text-xs text-gray-400 mt-1`.
  - **Right — results panel:** `bg-gradient-to-br from-kalku-green/10 to-primary-50 rounded-2xl p-6 flex flex-col justify-between`.
    - 3 stacked metrics separated by `<div className="h-px bg-white/60" />` dividers:
      1. Sparen pro Monat (big green `text-4xl font-bold text-kalku-green`).
      2. Netto-Ersparnis pro Jahr (`text-3xl font-bold text-gray-900`).
      3. ROI-Tage line (`<TrendingUp>` icon).
    - Bottom CTA: full-width green `mt-6 w-full bg-kalku-green text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2`.

### Outer fingerprint (wrapper section)

```jsx
<section id="roi" className="py-16 sm:py-24 bg-gradient-to-br from-primary-50 via-white to-kalku-green/5">
  <div ref={roiAnim.ref} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${roiAnim.isVisible ? 'landing-visible' : ''}`}>
    <ROICalculator onCTA={() => startDemo()} />
  </div>
</section>
```

### Math (encoded in component)

- `monthlyHoursSaved = tenders × hours × 0.9`
- `monthlySavings = monthlyHoursSaved × rate`
- `yearlySavings = monthlySavings × 12`
- `kalkuCost = 499` (Pro plan, hardcoded)
- `roiDays = Math.max(1, Math.round(kalkuCost / (monthlySavings / 30)))`
- `netYearly = yearlySavings - kalkuCost × 12`

### Interaction

- All values reactive to slider input.
- Number formatting `toLocaleString('de-DE', { maximumFractionDigits: 0 })` — German thousands sep with `.`.
- "Kostenlos testen" button calls `startDemo()` (passed in as `onCTA` prop).

### Reusability notes

- Keep ROICalculator as a self-contained component — its math is feature-specific.
- The slider styling pattern (`accent-primary-500`) is a Tailwind 3.4+ feature; ensure the new build is on Tailwind ≥ 3.3.

---

## 11. Industry-specific demo selector (3 trade CTAs)

**Source:** lines 1312-1358.

### Anatomy

- Centered h2 `Demo für Ihr Gewerk starten` + subtitle.
- 3 buttons in `grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto`:
  - `<button>`: `bg-white rounded-2xl p-6 border ${border} hover:shadow-lg hover:-translate-y-1 transition-all text-left group cursor-pointer disabled:opacity-50`.
  - Icon chip: `w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`.
  - h3 `text-lg font-bold` + body description.
  - Footer link (inside the button): `inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600` with `<ArrowRight>` (or `<Loader2>` while loading).
- Footer text: `Kein Account nötig · Sofortiger Zugang · Keine Kreditkarte`.

### Outer fingerprint

```jsx
<section id="demo-waehlen" className="py-16 sm:py-20 bg-white">
```

### Reusability notes

- Component: `<DemoChoice trade="galabau" icon={Leaf} label="GaLaBau" desc="…" loading={…} onStart={…} />`.
- Hover lift (`hover:-translate-y-1`) is exclusive to this section — keep it as the "selectable card" tell.

---

## 12. Gewerke list (7 trade cards)

**Source:** lines 1360-1404.

### Anatomy

Same shape as the demo selector but informational (`<div>`, not `<button>`):

- 7 cards in `grid sm:grid-cols-2 lg:grid-cols-3 gap-6` (overflow row on lg+).
- Each: icon chip + label `text-lg font-bold` + full name `text-sm text-gray-600` + category count `mt-3 text-sm font-medium text-primary-600` (or italic "Auf Anfrage" if `cats === null`).
- Optional "Neu" pill (Schadstoff): same as features.

### Outer fingerprint

```jsx
<section id="gewerke" className="py-16 sm:py-24 bg-gray-50">
```

### Reusability notes

- Component: `<TradeCard icon trade="…" full="…" cats={number|null} isNew={…} />`.

---

## 13. Comparison table (KALKU vs Manuell vs Generisch)

**Source:** lines 1406-1460. Helper `renderCell` lines 3243-3253.

### Anatomy

- Centered h2 `Warum KALKU?`.
- Card-wrapped table: `overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm`.
- `<table className="w-full text-sm">`:
  - `<thead className="bg-gray-50 border-b border-gray-200">` with 4 columns: `Funktion | KALKU (with Sparkles + primary-600) | Manuell | Generische Tools`.
  - `<tbody className="divide-y divide-gray-100">` — 15 rows, each a `{label, kalku, manual, generic}` tuple.
  - Cell renderer (`renderCell(value, col)`):
    - `true` → `<Check className="w-5 h-5 mx-auto text-kalku-green/text-gray-400" />` (green for kalku col, gray for others).
    - `false` → `<XIcon className="w-5 h-5 mx-auto text-red-400" />`.
    - `'partial'` → `text-xs text-amber-600 font-medium` "teilweise".
    - String → `text-sm font-semibold` (primary-600 in kalku col, gray-500 elsewhere).
- Row hover: `hover:bg-gray-50`.

### Outer fingerprint

```jsx
<section className="py-16 sm:py-24 bg-white">
  <div ref={compareAnim.ref} className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${compareAnim.isVisible ? 'landing-visible' : ''}`}>
```

### Reusability notes

- Component: `<ComparisonTable headers={[…]} rows={[{label, [colKey]: value}]} highlightCol="kalku" />`.
- Keep the `renderCell` value vocabulary (`true | false | 'partial' | string`) — it's the data contract.

---

## 14. Pricing (3 tiers + monthly/yearly toggle)

**Source:** lines 1462-1603.

### Anatomy

- Centered h2 `Transparente Preise` + subtitle.
- Toggle row (`flex items-center justify-center gap-4 mb-12`):
  - Two text labels (`text-sm font-semibold`) that swap active state via `text-gray-900` vs `text-gray-400`.
  - Custom toggle: `<button className={\`relative w-14 h-7 rounded-full transition-colors ${billingYearly ? 'bg-kalku-green' : 'bg-gray-300'} cursor-pointer\`}>` with a `w-5 h-5 bg-white rounded-full shadow` knob and `translate-x-7` shift.
  - "10% sparen" badge (kalku-green tint).
- 3 cards in `grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto`:
  - **Starter card** (default): `bg-white rounded-2xl border border-gray-200 p-8 flex flex-col` — outline button.
  - **Professional card** (highlight): `bg-white rounded-2xl border-2 border-primary-500 p-8 flex flex-col relative shadow-lg`.
    - "Beliebt" pill on top edge: `absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-semibold px-4 py-1 rounded-full`.
    - Filled primary-blue CTA button.
  - **Enterprise card**: same as Starter but price says "Auf Anfrage" — outline button "Kontakt aufnehmen".
- Each card body:
  - Tier name `text-xl font-bold`.
  - Tagline `text-sm text-gray-500`.
  - Price block: `text-4xl font-bold` + `/Monat` + (yearly only) per-year-savings line.
  - Feature list (`mt-8 space-y-3 flex-1`): each item `flex items-start gap-3 text-sm text-gray-700` with `<Check className="w-5 h-5 text-kalku-green shrink-0 mt-0.5" />`.
  - Bottom button (`mt-8 w-full ...`).
- Footer fine print: `Alle Preise netto zzgl. MwSt. · Monatlich kündbar · 14 Tage kostenlos testen`.

### Outer fingerprint

```jsx
<section id="preise" className="py-16 sm:py-24 bg-white">
```

### Pricing data

- Starter: 299€/299€·yr (269€ when yearly), 1 user, 10 projects.
- Professional: 499€/499€·yr (449€ when yearly), 3 users, unlimited projects, **"Beliebt"** pill, blue button.
- Enterprise: "Auf Anfrage", unlimited users, custom integration.

### Reusability notes

- Component: `<PricingCard tier="…" price={…} priceYearly={…} highlighted={false} features={[…]} cta={…} />` + `<PricingToggle />`.
- The `-top-3` floating "Beliebt" pill on the highlighted card is a visual signature — keep it.

---

## 15. Risk-Reversal / Garantie (4 promise tiles)

**Source:** lines 1605-1670.

### Anatomy

- Outer wrap card: `bg-gradient-to-br from-kalku-green/5 via-white to-primary-50 rounded-3xl border-2 border-kalku-green/20 p-6 sm:p-10`.
- Header (centered):
  - Eyebrow chip: `bg-kalku-green text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider` + `<Shield>`.
  - h2 `Sie gehen kein Risiko ein. Wirklich keins.`.
  - Subtitle paragraph.
- 4-tile grid (`grid sm:grid-cols-2 lg:grid-cols-4 gap-4`):
  - Each tile: `bg-white rounded-2xl p-5 border border-gray-100 shadow-sm`.
  - Icon chip: `w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`.
  - Title `font-bold text-gray-900 mb-1.5`.
  - Body `text-sm text-gray-600 leading-relaxed`.
- Footer line (centered): `Bisher haben 0 % unserer Kunden die Geld-zurück-Option gezogen` with green check.

### Tiles

```
TrendingDown / kalku-green/10  → 30-Tage Geld-zurück
Calendar / primary-100         → Monatlich kündbar
Euro / amber-100               → Keine Setup-Kosten
Headphones / purple-100        → Persönlicher Support
```

### Outer fingerprint

```jsx
<section className="py-12 sm:py-16 bg-white">
  <div ref={guaranteeAnim.ref} className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${guaranteeAnim.isVisible ? 'landing-visible' : ''}`}>
```

### Reusability notes

- Component: `<GuaranteeBlock title="…" subtitle="…" tiles={[{icon, title, body, color}]} footnote="…" />`.
- The `rounded-3xl border-2` outer pattern only appears here — flag as the "highest emphasis" card.

---

## 16. Onboarding journey (4 phase cards + trust callout)

**Source:** lines 1672-1761.

### Anatomy

- Eyebrow `Was nach dem Start passiert` (primary tint with `<Rocket>`).
- h2 `Ihre ersten 30 Tage mit KALKU` + subtitle.
- 4 cards in `grid md:grid-cols-2 lg:grid-cols-4 gap-5`:
  - Outer: `relative bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow`.
  - **Decorative arrow** between cards (lg+ only): `<ArrowRight className="hidden lg:block absolute top-1/2 -right-4 w-6 h-6 text-gray-300 -translate-y-1/2 z-10 bg-gray-50 rounded-full" />` on first 3 cards (`{i < 3 && …}`).
  - Phase pill: `inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3`.
  - Icon chip: `w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-4`.
  - Title `text-lg font-bold text-gray-900 mb-2`.
  - Body `text-sm text-gray-600 leading-relaxed mb-4`.
  - 3-item bullet list: each `flex items-start gap-2 text-xs text-gray-600` + `<Check className="w-3.5 h-3.5 text-kalku-green shrink-0 mt-0.5" />`.
- Trust callout below grid: `mt-10 max-w-3xl mx-auto bg-white rounded-2xl p-6 border border-primary-200 flex items-start gap-4` with `<Coffee>` icon + body.

### Phases

```
Tag 1   / primary-100      → Setup & Kickoff
Tag 2-3 / purple-100       → Team-Schulung
Woche 1-2 / amber-100      → Lernphase
Tag 30+ / kalku-green/10   → Volle Produktion
```

### Outer fingerprint

```jsx
<section className="py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-white">
```

### Reusability notes

- Component: `<JourneyTimeline phases={[{phase, icon, title, body, items, color}]} />`. The connector-arrow logic (`i < length - 1`) is part of the timeline's responsibility.

---

## 17. Lead-magnet CTA hero (LV-Analyse)

**Source:** lines 1763-1847.

### Anatomy

Full-bleed gradient section with two-column layout (`grid lg:grid-cols-5 gap-8 items-center`):

- **Background:**
  - `bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green` (deep brand → green).
  - Radial overlay: `<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />`.
- **Left (3/5 cols):**
  - Eyebrow `bg-white/15 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20` + `<Sparkles>`.
  - h2 `Schicken Sie uns Ihr letztes LV — wir analysieren es kostenlos`.
  - Body paragraph `text-lg text-white/90 leading-relaxed` with bold finishing claim.
  - 4-bullet list (`mt-6 space-y-2.5`): each `flex items-start gap-2.5 text-white/95` + `<CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />`.
  - 2 CTAs in `flex flex-wrap gap-3`:
    1. White-on-blue (inverted): `bg-white text-primary-700 px-7 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-xl` + `<Mail>`.
    2. Glassy outline: `bg-white/10 backdrop-blur text-white px-7 py-3.5 rounded-xl font-bold hover:bg-white/15 transition-colors border border-white/20` + `<Phone>`.
  - Footnote `text-xs text-white/70`: data-deletion notice.
- **Right (2/5 cols, the floating preview card):**
  - `bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm`.
  - `<FileText>` big icon centered.
  - Title `Beispiel-Analyse · Schulhof-Neubau · 142 Positionen`.
  - 4 category rows: each `flex items-center justify-between text-xs` + tinted pill.
  - Bottom block (`pt-3 border-t border-gray-100`): "Erkannte Hersteller" purple chips.

### Outer fingerprint

```jsx
<section className="py-16 sm:py-20 bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green relative overflow-hidden">
```

### Reusability notes

- Component: `<LeadMagnetHero eyebrow="…" title="…" body="…" bullets={[…]} ctas={[…]} previewCard={<…/>} />`.
- The "white CTA on dark gradient" + "glassy outline CTA" pair is reused conceptually elsewhere; standardize as `Button variant="cta-on-dark"` + `Button variant="glass-on-dark"`.

---

## 18. Live metrics on primary-500 bg

**Source:** lines 1849-1880.

### Anatomy

- Full-section `bg-primary-500` (the only solid-blue section).
- Centered header: white h2 + `text-primary-100` subtitle.
- 7 metric cells in `grid grid-cols-2 lg:grid-cols-4 gap-8 text-center` (so on `lg+` you get 4-2-1 layout for 7 items):
  - Big number: `text-3xl sm:text-5xl font-bold text-white` containing `<AnimatedCounter target={value} suffix={…} />`.
  - Label below: `mt-2 text-primary-100 text-sm sm:text-base`.

### Metrics

```
positions_classified  +
rfqs_sent             +
tenders_processed     (no suffix)
hours_saved           h
companies             (no suffix)
ai_accuracy           %
trades_supported      (no suffix)
```

### Outer fingerprint

```jsx
<section className="py-16 sm:py-24 bg-primary-500">
```

### Reusability notes

- Component: `<MetricsBand stats={[{value, label, suffix}]} bg="primary-500" />`.
- The `AnimatedCounter` should be a shared widget; it's parameterized by `target` + `suffix` and uses `useInView(0.3)` internally.

---

## 19. FAQ (search input + accordion)

**Source:** section lines 1882-1938; `FAQItem` component lines 103-122.

### Anatomy

- Centered h2 `Häufige Fragen` + subtitle with inline link.
- Search input (`mb-6 relative`):
  - `<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />`.
  - `<input type="search" className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white" />`.
- Filtered list of `<FAQItem>`s in `space-y-3`:
  - Outer: `border border-gray-200 rounded-xl overflow-hidden`.
  - Toggle button: `w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors cursor-pointer`.
  - Question text + `<ChevronUp/Down className="w-5 h-5 text-gray-500 shrink-0" />`.
  - Body: `overflow-hidden transition-all duration-300` with inline `style={{ maxHeight: open ? '600px' : '0', opacity: open ? 1 : 0 }}`.
  - Body text: `px-5 pb-5 text-gray-600 leading-relaxed whitespace-pre-line`.
- Empty-state: `text-center text-gray-500 py-8` + link.

### Outer fingerprint

```jsx
<section id="faq" className="py-16 sm:py-24 bg-white">
  <div ref={faqAnim.ref} className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${faqAnim.isVisible ? 'landing-visible' : ''}`}>
```

### Interaction

- Search filters items by case-insensitive substring on `(question + answer).toLowerCase()`.
- Each accordion is independent (`useState(false)` per item — multiple can be open simultaneously).
- `whitespace-pre-line` so `\n\n` in answer text becomes paragraph breaks.

### Reusability notes

- Component: `<FAQ items={[{q, a}]} searchable={true} />` plus internal `<FAQItem question answer />`.
- Open animation uses `max-height` + `opacity` (not `height: auto` morph) — keep this CSS-only pattern.

---

## 20. Founder/team trust block

**Source:** lines 1940-2052.

### Anatomy

Split layout (`grid lg:grid-cols-2 gap-12 items-center`):

- **Left:**
  - Eyebrow with `<Users>`.
  - h2 `Gebaut von Menschen, die das Bau-Geschäft kennen`.
  - Body paragraph.
  - 3-item promise list (`mt-7 space-y-4`):
    - Each: `flex gap-3 items-start` with `w-9 h-9 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center shrink-0` icon + title + body.
    - Icons: `<AwardIcon>`, `<Code2>`, `<Heart>`.
  - 2 CTAs in `mt-8 flex flex-wrap gap-3`:
    1. `bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600` + `<Phone>` "Direkt mit dem Gründer sprechen".
    2. `bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50` + `<Mail>` "support@kalku.de".
- **Right:** Two stacked cards in `space-y-4`:
  - **Stats card:** `bg-gradient-to-br from-primary-50 to-white rounded-2xl p-6 border border-primary-100`.
    - Eyebrow `text-xs font-bold uppercase tracking-widest text-primary-700`.
    - 2x2 grid of stats: each in `bg-white rounded-xl p-4 border border-gray-100`, big number `text-2xl font-bold text-gray-900` + label `text-xs text-gray-500`.
    - Stats: 2024 Gegründet · 7 Gewerke · 70+ Automationen · 100% Made in Germany.
  - **Promise card:** `bg-gradient-to-br from-kalku-green/10 to-white rounded-2xl p-6 border border-kalku-green/20`.
    - Eyebrow `text-xs font-bold uppercase tracking-widest text-kalku-green`.
    - 4-item bulleted list with `text-kalku-green` checks.

### Outer fingerprint

```jsx
<section className="py-16 sm:py-24 bg-white">
  <div ref={founderAnim.ref} className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${founderAnim.isVisible ? 'landing-visible' : ''}`}>
```

### Reusability notes

- Component: `<FounderBlock title="…" body="…" promises={[{icon, title, body}]} stats={[{v, l}]} promiseList={[…]} />`.
- The split "tinted gradient stats card" + "tinted gradient promise card" is reused — extract `<TintedCard color="primary|kalku-green" eyebrow body />`.

---

## 21. Contact section (3-path selector + form)

**Source:** lines 2054-2291.

### Anatomy

- Centered h2 `Bereit, Ihre Kalkulation zu beschleunigen?` + subtitle.
- **3-path selector** (`grid md:grid-cols-3 gap-4 mb-10`):
  - Live-Demo card: `bg-white rounded-xl p-5 border-2 border-kalku-green hover:shadow-lg transition-shadow text-left cursor-pointer group` (the highlighted one with double border).
  - Calendly card: `bg-white rounded-xl p-5 border border-gray-200 hover:border-primary-200 hover:shadow-lg transition-all text-left group`.
  - WhatsApp card: same pattern but `hover:border-green-300`.
  - Each header has small eyebrow + `<ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />`.
- "or" divider: `text-center text-sm text-gray-500 mb-8` with `<span className="inline-block px-4 bg-gray-50">oder per Formular</span>`.
- **Form** (`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5`):
  - Error banner (conditional): `bg-red-50 text-red-700 text-sm rounded-lg p-3`.
  - 4 input rows (each `grid sm:grid-cols-2 gap-5`):
    - Firma + Name (required, with `<span className="text-red-500">*</span>` markers).
    - E-Mail + Telefon.
    - Gewerk select + Ausschreibungen-pro-Monat select.
  - 1 row: Priority select.
  - 1 textarea: Nachricht (`rows={4}`, `resize-none`).
  - Submit button: `w-full bg-kalku-green text-white py-3 rounded-lg font-semibold hover:opacity-90 ... gap-2` with `<Send>` icon (or `<Loader2 animate-spin>`).
  - Footnote `text-xs text-gray-400 text-center`.
- **Success state** (replaces form):
  - `bg-white rounded-2xl border border-green-200 p-8 text-center`.
  - Big green check circle (`w-16 h-16 bg-kalku-green/10 rounded-full flex items-center justify-center mx-auto mb-4`).
  - h3 `Vielen Dank!` + body + "Weitere Anfrage senden" link.

### Form input pattern (consistent throughout)

```jsx
<input className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white" />
```

(`select` and `textarea` use the same class string.)

### Outer fingerprint

```jsx
<section id="kontakt" className="py-16 sm:py-24 bg-gray-50">
  <div ref={contactAnim.ref} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-fade-in ${contactAnim.isVisible ? 'landing-visible' : ''}`}>
    <div className="max-w-3xl mx-auto">…</div>
```

### Reusability notes

- Component: `<ContactSection options={[{icon, label, desc, eyebrow, ctaLabel, action}]} formFields={[…]} onSubmit={…} />`.
- The 3-path selector is the "channel chooser" pattern — useful elsewhere in the marketing site (e.g. demo page).

---

## 22. Footer

**Source:** lines 2293-2322 (LandingPage's own footer). Distinct from `LandingShell.tsx` footer (lines 78-127).

### Anatomy

Single dark-gray-900 row:

- `bg-gray-900 text-gray-400 py-12`.
- Inner: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- 3-block row (`flex flex-col sm:flex-row items-center justify-between gap-6`):
  - **Brand block:** logo dot + `KALKU` (white bold) + `Procurement` (gray-500 light).
  - **Legal links** (`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm`):
    - `DSGVO | Sicherheit | AVV | TOM | Subprozessoren | Datenschutz | Impressum | AGB | mailto:support@kalku.de`.
    - Each: `hover:text-gray-300`.
  - **Copyright line:** `text-sm text-gray-500` "© 2026 KALKU. Alle Rechte vorbehalten.".

### Outer fingerprint

```jsx
<footer className="bg-gray-900 text-gray-400 py-12">
```

### Reusability notes

- See doc 1 §13.8 — there are two footer designs in this codebase. This one (single-row) is the customer-acquisition target with the most legal links. Phase 3 should adopt this as canonical.

---

## 23. Sticky mobile CTA bar

**Source:** lines 2324-2337.

### Anatomy

```jsx
<div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3 shadow-lg">
  <button onClick={() => startDemo()}
          className="w-full bg-kalku-green text-white py-3 rounded-lg font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
    {demoLoading === 'default' ? <><Loader2 className="w-5 h-5 animate-spin" /> Lädt...</> : <>Kostenlos testen <ArrowRight className="w-5 h-5" /></>}
  </button>
</div>
```

- Only renders below `md` (768 px).
- Z-index 40, below nav (50) but above page content.
- Provides constant CTA access on mobile while scrolling.

### Reusability notes

- Component: `<StickyMobileCTA label="…" onClick={…} loading={…} />`.

---

## 24. Video modal (multi-track slideshow)

**Source:** trigger lines 2339-2345; `VideoSlideshow` lines 3078-3237; helpers `BrowserFrame`, `SceneChrome`, `TypewriterText` lines 2429-2487; tracks `OVERVIEW_TRACK`, `GALABAU_TRACK`, `ELEKTRO_TRACK` lines 2491-3074.

### Anatomy

- **Backdrop:** `fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6` + `bg-black/90 backdrop-blur-sm` overlay.
- **Modal frame:** `relative bg-black rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden ring-1 ring-white/10`.
- **Close button** (top-right, z-30): `w-9 h-9 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white rounded-full flex items-center justify-center backdrop-blur-sm`.
- **Track picker** (top-left, z-30): row of pill buttons, active = `bg-white text-gray-900 shadow-lg`, inactive = `bg-white/10 text-white/70 hover:bg-white/20`.
- **Scene area:** `relative aspect-video w-full overflow-hidden`. Each scene is a full-bleed `render()` returning a JSX tree with its own dark gradient bg + `<SceneChrome>` overlay.
- **Scene-dot pager** (bottom): each `<button>` is `h-1 rounded-full transition-all`, active = `w-8 bg-white`, inactive = `w-1.5 bg-white/30 hover:bg-white/60`.
- **Progress bar** (under dots): `h-1 bg-white/10` with inner gradient fill `h-full bg-gradient-to-r from-primary-500 to-kalku-green` driven by inline `animation: kalkuProgressScene ${duration}ms linear both`.
- **Bottom control bar:** `bg-gradient-to-b from-gray-950 to-black text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-4 border-t border-white/10`.
  - Play/pause button (white circle, scales on hover).
  - Track title (white) + subtitle (`text-white/50`).
  - Optional progress percent (mono).
  - "Jetzt live testen" green CTA (always visible).

### Scene primitives

- `<BrowserFrame title>`: realistic mac browser chrome (`bg-white rounded-xl shadow-2xl border border-gray-200`) with 3 dots + URL pill, used inside scenes for product mockups.
- `<SceneChrome chapter title subtitle>`: standard scene scaffolding with `kalkuFadeDown`/`kalkuFadeUp` cascades.
- `<TypewriterText text delay>`: typewriter animation (defined but unused right now).

### Tracks (3)

```
OVERVIEW_TRACK   → 8 scenes (intro, problem, upload, ai, hersteller, versand, inbox, outro)
GALABAU_TRACK    → 4 scenes (intro, project, suppliers, outro)
ELEKTRO_TRACK    → 4 scenes (intro, cats, brands, outro)
```

### Animations (inline keyframes)

See doc 1 §7.1. Eleven custom `@keyframes` declared in a `<style>` tag at the bottom of the modal component.

### Reusability notes

- This is a **single-purpose** component. Phase 3 can either ship it as-is (worthwhile because the cinematic feel is hard to replicate cheaply) or replace with a real video file (`<video>` tag) and drop ~700 lines of code.
- If kept, refactor scenes into a JSON config + per-scene render fn (already mostly the case).

---

## 25. Exit-intent modal (whitepaper email capture)

**Source:** trigger / state lines 257-260, 332-343, 364-378; UI lines 2347-2405.

### Anatomy

- **Trigger:** mouseout listener fires when `e.clientY <= 0 && window.scrollY > 300 && !exitIntentShown`.
- **Backdrop:** `fixed inset-0 z-50 flex items-center justify-center p-4` + `fixed inset-0 bg-black/50` (clickable to close).
- **Modal:** `relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8`.
- **Close button:** `absolute top-4 right-4 text-gray-400 hover:text-gray-600` `<X>`.
- **Default state:**
  - Big amber download icon: `w-14 h-14 bg-amber-100 rounded-full ... mx-auto mb-4` + `<Download className="w-7 h-7 text-amber-600" />`.
  - h3 `text-xl font-bold` "Bevor Sie gehen…".
  - Body with whitepaper title in bold quotes.
  - Tiny detail line `text-xs text-gray-500`.
  - Email input (standard: `w-full px-4 py-2.5 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500`).
  - Primary CTA: `w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600` + `<Download>`.
  - Secondary text-link: `text-sm text-gray-600 hover:text-gray-900` "Oder lieber direkt die Demo testen →".
  - DSGVO footnote `text-[10px] text-gray-400 text-center mt-3`.
- **Success state** (replaces default after submit):
  - Green check circle (`w-14 h-14 bg-kalku-green/10 rounded-full`) + `<CheckCircle2 className="w-7 h-7 text-kalku-green" />`.
  - h3 "Perfekt!" + confirmation copy.
  - Auto-closes after 2500 ms.

### Backend

- Submits to `POST /api/public/whitepaper-request` — the comment in the source explicitly notes this differs from `/api/contact` because it actually emails the visitor and notifies support.

### Reusability notes

- Component: `<ExitIntentModal triggerCondition={…} onSubmit={…} />`.
- Email-only capture pattern reusable for newsletter sign-ups.

---

## 26. Chat widget (Crisp loader)

**Source:** `frontend/src/components/ChatWidget.tsx`.

### Anatomy

- No own UI. Returns `null`.
- On mount: reads `VITE_CRISP_WEBSITE_ID` from env, sets `window.$crisp = []` and `window.CRISP_WEBSITE_ID`, injects `<script src="https://client.crisp.chat/l.js">` into `document.head`.
- Guards against double-load via DOM check (`document.getElementById('crisp-widget-script')`).
- Mounted globally in `App.tsx` (line 210) — appears on every public + authenticated page.

### Reusability notes

- Drop-in replacement: replace with whatever live-chat the new product uses (Intercom, HubSpot, Olark, etc.).
- The pattern of "env-gated optional 3rd-party widget" is correct — keep it.

---

## Cross-cutting patterns to extract in Phase 3

These appear ≥3 times in the file and deserve dedicated components:

| Pattern                              | Suggested component                                                       |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Eyebrow chip                         | `<Eyebrow icon={Icon} tone="primary|rose|kalku-green|gray">…</Eyebrow>` — 11 instances |
| Centered section header (h2 + subtitle) | `<SectionHeader eyebrow title body align="center" />`                  |
| Icon-on-left feature row             | `<FeatureRow icon iconBg iconColor title body />` — 3+ sections           |
| Trade-tinted icon chip               | `<TradeChip trade="galabau|elektro|...">` — 12+ instances                 |
| "Neu" pill                           | `<NewBadge />`                                                            |
| Scroll-fade-in section wrapper       | `<RevealSection threshold={0.15}>…</RevealSection>` (wraps `useInView`)   |
| Soft pill (`bg-gray-50 hover:bg-primary-50 …`) | `<SoftPill href icon>…</SoftPill>` — used for trust badges      |
| Animated counter number              | `<Counter target suffix />` (already a component; just expose)            |
| CTA button                           | `<Button variant="cta|primary|outline|cta-on-dark|glass">`                |
| 3-path option card                   | `<OptionCard eyebrow title desc href|onClick highlighted />`              |
| Dual-tone tinted card                | `<TintedCard tone="primary|kalku-green" eyebrow body />` — Founder uses 2x|
| Browser frame mock                   | `<BrowserFrame url>{children}</BrowserFrame>` (already exists)            |
| Trade list                           | `<TradeList items={[{trade, label, color, bg}]} />`                       |

---

## Routing assumptions confirmed

From `App.tsx` (lines 65-202):

- The landing page is shown at:
  - `/` (root, when unauthenticated)
  - `/info` (always — even for authenticated users)
  - any unknown path while unauthenticated (catch-all fallback)
- Co-existing public routes (LandingShell-based, not LandingPage):
  - `/info-v2`, `/info-v3` — alternate landing pages.
  - `/funktionen`, `/sicherheit`, `/blog`, `/kundenreferenzen`, `/dsgvo`, `/impressum`, `/datenschutz`, `/agb`, `/avv`, `/tom`, `/subprozessoren` — legal/info pages.
  - `/gaeb-datei-auswerten`, `/preisanfragen-galabau`, `/ki-lieferantensuche` — SEO landing pages.
- Reset-password path uses URL token detection.
- `/login` is a separate (small) page.
- Root entry: `main.tsx` mounts `<App />` inside `<StrictMode>` after importing `index.css`.

For the new build, Phase 3 only needs the **public routes** plus `/login` if it's also part of the marketing scope.

---

## Suggested component-library skeleton for Phase 3

```
src/components/
  layout/
    Header.tsx              ← (1) Top Navigation
    Footer.tsx              ← (22) Footer (single-row dark)
    Section.tsx             ← reusable section wrapper with bg + reveal
    StickyMobileCTA.tsx     ← (23)
  ui/
    Button.tsx              ← variant: cta | primary | outline | cta-on-dark | glass
    Eyebrow.tsx             ← chip
    Card.tsx                ← variant: default | highlighted | tinted | comparison
    NewBadge.tsx
    SoftPill.tsx            ← for trust badges
    TintedCard.tsx          ← Founder-style gradient
    BrowserFrame.tsx        ← reused from video modal
    Counter.tsx             ← AnimatedCounter
    TradeChip.tsx
  sections/
    Hero.tsx                ← (2)
    BeforeAfterCompare.tsx  ← (3)
    TradeWall.tsx           ← (4)
    HowItWorks.tsx          ← (5)
    FeaturesGrid.tsx        ← (6)
    SubmissionskarteShowcase.tsx ← (7)
    TestimonialsGrid.tsx    ← (8)
    CaseStudies.tsx         ← (9)
    ROICalculator.tsx       ← (10)
    DemoSelector.tsx        ← (11)
    GewerkeList.tsx         ← (12)
    ComparisonTable.tsx     ← (13)
    Pricing.tsx             ← (14)
    Guarantee.tsx           ← (15)
    OnboardingJourney.tsx   ← (16)
    LeadMagnetHero.tsx      ← (17)
    MetricsBand.tsx         ← (18)
    FAQ.tsx                 ← (19)
    FounderBlock.tsx        ← (20)
    ContactSection.tsx      ← (21)
  modals/
    VideoSlideshow.tsx      ← (24)
    ExitIntentModal.tsx     ← (25)
  external/
    ChatWidget.tsx          ← (26)
  hooks/
    useInView.ts            ← already a hook in source
```

This corresponds 1:1 with the section index above; Phase 3 can build top-down section by section.
