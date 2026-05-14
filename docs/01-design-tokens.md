# 01 — Design Tokens

> **Source of truth:** `frontend/src/pages/LandingPage.tsx` (3254 lines), `frontend/src/components/LandingShell.tsx`, `frontend/tailwind.config.js`, `frontend/src/index.css`.
>
> **Stack assumed by Phase 3:** Vite + React 19 + TypeScript + Tailwind CSS 3.4 + lucide-react icons + `@tailwindcss/forms` + `@tailwindcss/typography`. No design framework (no shadcn, no Radix). Tailwind utility classes carry the design.
>
> **Mental model:** the page is white-first with a single deep-petrol brand blue (`primary-500 = #1a5276`) and a single confident green CTA (`kalku-green = #27ae60`). Everything else is pastel "tag" tints (one per trade) and neutral gray scales. Cards are white-on-gray-50 with rounded-xl/2xl corners and very soft shadows.

---

## 1. Color palette

### 1.1 Brand — `primary` (deep petrol blue)

Defined in `tailwind.config.js` as a custom 50-900 ramp under `colors.primary`:

| Token         | Hex       | Used where                                                                                                                                                                          |
| ------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primary-50`  | `#e6f0f5` | Soft pill backgrounds (hero badge, FAQ link tag, "Was nach dem Start passiert" tag), input focus tint, ROI calculator backdrop, contact tag, founder badge.                         |
| `primary-100` | `#cce0eb` | Mockup icon backgrounds (`bg-primary-100`), pricing-card pop on highlighted Professional, ROI calc border (`border-primary-100`), founder stats card border, lead-magnet card glow. |
| `primary-200` | `#99c2d7` | Borders on hover for feature cards (`hover:border-primary-200`), 30-day trust card, onboarding journey trust callout border.                                                        |
| `primary-300` | `#66a3c3` | Trust-badge hover border (`hover:border-primary-300`), supplier card hover.                                                                                                         |
| `primary-400` | `#3385af` | Avatar gradient stop (`from-primary-400 to-primary-600`).                                                                                                                           |
| `primary-500` | `#1a5276` | **Logo dot, primary-button hover swap, hero highlight word "Minuten", live-metrics section bg, video-modal progress gradient stop, pricing "Beliebt" pill.**                         |
| `primary-600` | `#15425e` | Body link / icon color, active button press, pricing Pro CTA hover, "Alle Funktionen entdecken" link.                                                                               |
| `primary-700` | `#103147` | Hero badge text, lead-magnet "LV per Mail einreichen" text-on-white, pricing badge text, founder primary-50→white card text.                                                        |
| `primary-800` | `#0a212f` | (declared but not used on landing page).                                                                                                                                            |
| `primary-900` | `#051018` | (declared but not used on landing page).                                                                                                                                            |

### 1.2 Brand — `kalku` (semantic accents)

Defined in `tailwind.config.js` as named flat colors (no ramp):

| Token          | Hex       | Used where                                                                                                                                                                                                                                                          |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kalku-blue`   | `#1a5276` | Same hex as `primary-500` — kept as alias (legacy). Not directly referenced in LandingPage.tsx.                                                                                                                                                                      |
| `kalku-green`  | `#27ae60` | **The CTA color. Every "Kostenlos testen" button, sticky mobile CTA, success states, ROI calculator big number, "MIT KALKU" badge, all checkmarks (`text-kalku-green`), tinted trust panels (`bg-kalku-green/10`, `bg-kalku-green/5`), Garantie border, footer.**    |
| `kalku-orange` | `#f39c12` | Declared but not used on landing page (Tailwind native `amber-*` is used instead).                                                                                                                                                                                  |
| `kalku-red`    | `#e74c3c` | Declared but not used on landing page (Tailwind native `red-*` used instead).                                                                                                                                                                                       |
| `kalku-purple` | `#9b59b6` | Declared but not used on landing page.                                                                                                                                                                                                                              |

### 1.3 Tailwind native palettes used (no overrides — Tailwind 3.4 defaults)

The page leans heavily on Tailwind's built-in palettes for trade-color tags and feature cards. Each trade has a consistent `(bg-X-50, bg-X-100, text-X-600, text-X-700, border-X-200)` quintet:

| Trade / role               | bg-tint    | bg-stronger | text-icon    | text-darker  | border       | hex (icon)  |
| -------------------------- | ---------- | ----------- | ------------ | ------------ | ------------ | ----------- |
| **GaLaBau / success**      | emerald-50 | emerald-100 | emerald-600  | emerald-700  | emerald-200  | `#059669`   |
| **Elektro / warning**      | yellow-50  | yellow-100  | yellow-600   | yellow-700   | yellow-200   | `#ca8a04`   |
| **Haustechnik**            | orange-50  | orange-100  | orange-600   | orange-700   | orange-200   | `#ea580c`   |
| **Tiefbau**                | sky-50     | sky-100     | sky-600      | sky-700      | sky-200      | `#0284c7`   |
| **Leitungsbau**            | teal-50    | teal-100    | teal-600     | teal-700     | teal-200     | `#0d9488`   |
| **Schadstoff / danger**    | red-50     | red-100     | red-600      | red-700      | red-200      | `#dc2626`   |
| **Fensterbau**             | blue-50    | blue-100    | blue-600     | blue-700     | blue-200     | `#2563eb`   |
| **AI / KI accent**         | purple-50  | purple-100  | purple-600   | purple-700   | purple-200   | `#9333ea`   |
| **AVV / Schadstoff alt**   | rose-50    | rose-100    | rose-600     | rose-700     | rose-200     | `#e11d48`   |
| **Submissions accent**     | rose-50    | rose-100    | rose-500     | rose-700     | rose-200     | `#f43f5e`   |
| **Onboarding lernphase**   | amber-50   | amber-100   | amber-600    | amber-700    | amber-200    | `#d97706`   |
| **Posteingang / Inbox**    | teal-50    | teal-100    | teal-600     | teal-700     | teal-200     | `#0d9488`   |
| **Vergabe-Status**         | indigo-50  | indigo-100  | indigo-600   | indigo-700   | indigo-200   | `#4f46e5`   |
| **Adaptiver Such-Radius**  | cyan-50    | cyan-100    | cyan-600     | cyan-700     | cyan-200     | `#0891b2`   |
| **Gewerk-Lücken**          | violet-50  | violet-100  | violet-600   | violet-700   | violet-200   | `#7c3aed`   |
| **Submissionskarte map**   | slate-50   | slate-100   | slate-600    | slate-700    | slate-200    | `#475569`   |

Plus standalone semantic uses:

- `text-amber-500 fill-amber-500` (`#f59e0b`) — testimonial 5-star rating row.
- `text-amber-600` (`#d97706`) — onboarding "Lernphase" Tag, lead-magnet feedback, exit-intent download icon.
- `text-green-600` (`#16a34a`) — WhatsApp 3-path CTA.
- `text-green-400 / red-400 / yellow-400` (`#4ade80 / #f87171 / #facc15`) — mockup browser-window dots (red/yellow/green Mac dots).
- `text-blue-600` (`#2563eb`) — Submissionskarte popup "Unser Platz".
- Map-pin colors literal hex (passed inline to SVG `fill` attr in the Submissionskarte mock):
  - `#2563eb` — won (blue)
  - `#10b981` — low / nah am Gewinner (emerald-500)
  - `#f59e0b` — mid (amber-500)
  - `#ef4444` — high / deutlich darüber (red-500)

### 1.4 Neutrals — used everywhere

Tailwind defaults — quoted by exact class name on the landing page:

| Class        | Hex        | Role                                                                                                            |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------- |
| `gray-50`    | `#f9fafb`  | "Cool" page section bg (How-it-works, Gewerke, Contact); secondary button hover; trust badge bg; mockup outer.  |
| `gray-100`   | `#f3f4f6`  | Card borders (`border-gray-100`), step number `text-gray-100`, gentle dividers.                                 |
| `gray-200`   | `#e5e7eb`  | Default card border, comparison-table head bottom border, ROI slider track.                                     |
| `gray-300`   | `#d1d5db`  | Outline-button border, scrollbar thumb, disabled toggle.                                                        |
| `gray-400`   | `#9ca3af`  | "OHNE KALKU" text, mockup placeholder text, ArrowRight muted in onboarding.                                     |
| `gray-500`   | `#6b7280`  | Secondary text, "Procurement" subtitle, FAQ chevron, footer dividers.                                           |
| `gray-600`   | `#4b5563`  | Body text small, nav link rest, feature description.                                                            |
| `gray-700`   | `#374151`  | Form labels, mobile-nav text, secondary button text, eyebrow uppercase text.                                    |
| `gray-800`   | `#1f2937`  | Mockup heading text (`text-gray-800`).                                                                          |
| `gray-900`   | `#111827`  | All headings, hero h1, primary copy, KALKU wordmark.                                                            |
| `slate-50…900` | tailwind  | Used in dark video-modal sections (`from-slate-950`), Submissionskarte chrome, demo "tab bar", outline SVG hint. |

### 1.5 Surfaces

| Surface                             | Tailwind class                                       | Hex resolved           |
| ----------------------------------- | ---------------------------------------------------- | ---------------------- |
| Page bg (default)                   | `bg-white` (LandingShell + LandingPage)              | `#ffffff`              |
| Section bg (alternating, "cool")    | `bg-gray-50`                                         | `#f9fafb`              |
| Section bg (white, default)         | `bg-white`                                           | `#ffffff`              |
| Live-Metrics section bg             | `bg-primary-500`                                     | `#1a5276`              |
| Lead-Magnet section bg              | `bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green` | gradient |
| Footer bg                           | `bg-gray-900`                                        | `#111827`              |
| Card surface                        | `bg-white` on `bg-gray-50` background                | `#ffffff` on `#f9fafb` |
| Soft accent panel (Garantie / KI)   | `bg-gradient-to-br from-kalku-green/5 via-white to-primary-50` | gradient    |
| Modal scrim                         | `bg-black/50` (exit-intent), `bg-black/90 backdrop-blur-sm` (video) | overlay      |
| Sticky mobile CTA bar bg            | `bg-white` + `border-t border-gray-200`              | white + border         |
| FAQ item bg                         | `bg-white` (default) → `hover:bg-gray-50`            | white                  |
| Comparison table head bg            | `bg-gray-50`                                         | `#f9fafb`              |

### 1.6 Gradients (literal class strings)

Quote these verbatim — they're load-bearing for atmosphere:

1. **Hero before/after section bg:** `bg-gradient-to-br from-gray-50 to-white`
2. **Submissionskarte showcase bg:** `bg-gradient-to-br from-slate-50 via-white to-rose-50/40`
3. **Submissionskarte map backdrop (custom CSS):** `bg-[radial-gradient(ellipse_at_center,_#dbeafe_0%,_#ecfccb_45%,_#fef3c7_100%)]`
4. **Submissionskarte decorative glow:** `bg-gradient-to-br from-rose-200/40 via-amber-200/30 to-emerald-200/40 blur-3xl rounded-full`
5. **Detailed Case Studies bg:** `bg-gradient-to-br from-slate-50 to-white`
6. **Each case-study card bg:** `bg-gradient-to-br ${c.color}` where `c.color` is e.g. `border-teal-300 from-teal-50 to-white` (border + gradient sharing one string).
7. **ROI section bg:** `bg-gradient-to-br from-primary-50 via-white to-kalku-green/5`
8. **ROI calculator results panel:** `bg-gradient-to-br from-kalku-green/10 to-primary-50`
9. **Garantie card bg:** `bg-gradient-to-br from-kalku-green/5 via-white to-primary-50`
10. **Onboarding section bg:** `bg-gradient-to-br from-slate-50 to-white`
11. **Lead-Magnet hero:** `bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green` + overlay `bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]`
12. **Founder stats card bg:** `bg-gradient-to-br from-primary-50 to-white`
13. **Founder promise card bg:** `bg-gradient-to-br from-kalku-green/10 to-white`
14. **Testimonial cards (one per trade):** `bg-gradient-to-br from-{trade}-100 to-{partner}-50` — e.g. `from-teal-100 to-emerald-50`, `from-yellow-100 to-amber-50`, `from-emerald-100 to-green-50`, `from-sky-100 to-blue-50`, `from-orange-100 to-amber-50`, `from-red-100 to-rose-50`.
15. **Inbox avatar:** `bg-gradient-to-br from-primary-400 to-primary-600`
16. **Browser frame chrome (video modal):** `bg-gradient-to-b from-gray-100 to-gray-50`
17. **Video modal scene bg (dark hero outro):** `bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950` (and per-scene variants: `via-red-950`, `via-blue-950`, `via-purple-950`, `via-emerald-950`, `via-orange-950`, `via-teal-950`, `via-yellow-950`).
18. **Brain step-2 mockup icon (video):** `bg-gradient-to-br from-purple-500 to-indigo-500`
19. **Upload progress bar:** `bg-gradient-to-r from-primary-500 to-kalku-green`
20. **Video modal progress bar:** `bg-gradient-to-r from-primary-500 to-kalku-green`

### 1.7 Status / badge colors (from `index.css` `@layer components`)

| Class               | bg                | text                |
| ------------------- | ----------------- | ------------------- |
| `.badge-success`    | `bg-green-100`    | `text-green-800`    |
| `.badge-warning`    | `bg-yellow-100`   | `text-yellow-800`   |
| `.badge-danger`     | `bg-red-100`      | `text-red-800`      |
| `.badge-info`       | `bg-blue-100`     | `text-blue-800`     |
| `.badge-primary`    | `bg-primary-100`  | `text-primary-800`  |

> These `.badge-*` helpers are defined in `frontend/src/index.css` but **the landing page does NOT use them** — it uses inline Tailwind everywhere (`px-3 py-1 rounded-full text-xs font-bold ...`). Phase 3 should treat the inline patterns as the truth.

---

## 2. Typography

### 2.1 Font family

Defined in `tailwind.config.js`:

```js
fontFamily: {
  sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
}
```

- **Primary face:** `Inter`.
- **Loading mechanism:** **None in `index.html`** — the project relies on Inter being present locally or simply falls back to the system font stack. Phase 3 should add an explicit Google Fonts `<link>` for Inter (weights 300, 400, 500, 600, 700, 800) or self-host with `@font-face`. **This is an inconsistency — see Findings.**
- **Inline `font-family` overrides:** the only place in the codebase is the Submissionskarte map-pin SVG: `fontFamily="Inter, sans-serif"` (line 1029).
- **Mono use:** the Tailwind default `font-mono` class is used for browser-frame URL bars (`text-xs ... font-mono`), version "1.8 Sekunden", "v100%", scene timer.

### 2.2 Weights used

The page uses these Tailwind weight tokens; map them to Inter weights:

| Class           | Tailwind value | Used for                                                      |
| --------------- | -------------- | ------------------------------------------------------------- |
| `font-light`    | 300            | "Procurement" subtitle next to KALKU wordmark.                |
| `font-normal`   | 400            | (default) — body copy.                                        |
| `font-medium`   | 500            | Nav links, form labels, supplier card titles.                 |
| `font-semibold` | 600            | "Kostenlos testen" CTA, eyebrow chips, footer headings.       |
| `font-bold`     | 700            | All h1/h2/h3, KALKU wordmark, statistics, section titles.     |
| `font-mono`     | (mono)         | URL bars, "1.8 Sekunden", animated counters context.          |

> No `font-extrabold` / `font-black` is used. Heading visual weight comes from size, not weight ≥ 800.

### 2.3 Type scale (extracted from class strings)

Heading sizes are **responsive** via Tailwind breakpoint prefixes:

| Role                          | Class string (mobile → desktop)                              | Resolved px (mobile / sm / lg)               | Line-height          |
| ----------------------------- | ------------------------------------------------------------ | -------------------------------------------- | -------------------- |
| Hero h1                       | `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight` | 36 / 48 / 60 (line-height 1.25 / 1 / 1)      | `leading-tight`      |
| Section h2 (large)            | `text-3xl sm:text-4xl font-bold`                             | 30 / 36                                      | (default 1.2)        |
| Section h2 (medium)           | `text-2xl sm:text-3xl font-bold`                             | 24 / 30                                      | -                    |
| Submissionskarte h2           | `text-3xl sm:text-4xl font-bold leading-tight`               | 30 / 36                                      | `leading-tight`      |
| Founder h2                    | `text-3xl sm:text-4xl font-bold leading-tight`               | 30 / 36                                      | `leading-tight`      |
| Card / feature h3             | `text-lg font-semibold` or `text-lg font-bold`               | 18                                           | (default)            |
| Pricing card h3               | `text-xl font-bold`                                          | 20                                           | -                    |
| Case study company name       | `text-xl font-bold`                                          | 20                                           | -                    |
| ROI calculator h3             | `text-2xl sm:text-3xl font-bold`                             | 24 / 30                                      | -                    |
| Pricing big price             | `text-4xl font-bold`                                         | 36                                           | -                    |
| ROI big metric                | `text-4xl font-bold` (kalku-green) and `text-3xl font-bold` (gray-900) | 36 / 30                            | -                    |
| Live-metrics counter          | `text-3xl sm:text-5xl font-bold text-white`                  | 30 / 48                                      | -                    |
| Founder stat number           | `text-2xl font-bold`                                         | 24                                           | -                    |
| Hero lead paragraph           | `text-lg sm:text-xl text-gray-600 leading-relaxed`           | 18 / 20                                      | `leading-relaxed`    |
| Section lead paragraph        | `text-lg text-gray-600` + `leading-relaxed`                  | 18                                           | `leading-relaxed`    |
| Body small / card description | `text-sm text-gray-600 leading-relaxed`                      | 14                                           | `leading-relaxed`    |
| Tag / badge / pill            | `text-xs font-medium` or `text-xs font-bold`                 | 12                                           | -                    |
| Eyebrow chip (uppercase)      | `text-xs font-bold uppercase tracking-wider`                 | 12                                           | -                    |
| "Neu" pill                    | `text-[10px] font-bold uppercase tracking-wider`             | 10                                           | -                    |
| Footer fine print             | `text-xs` / `text-[10px]`                                    | 12 / 10                                      | -                    |
| Form label                    | `text-sm font-medium text-gray-700`                          | 14                                           | -                    |

Raw Tailwind size→px reference:

| Class       | Size  | Line-height (default) |
| ----------- | ----- | --------------------- |
| `text-[10px]` | 10px  | 1                     |
| `text-[11px]` | 11px  | 1                     |
| `text-xs`   | 12px  | 16px (1.333)          |
| `text-sm`   | 14px  | 20px (1.428)          |
| `text-base` | 16px  | 24px (1.5)            |
| `text-lg`   | 18px  | 28px (1.555)          |
| `text-xl`   | 20px  | 28px (1.4)            |
| `text-2xl`  | 24px  | 32px (1.333)          |
| `text-3xl`  | 30px  | 36px (1.2)            |
| `text-4xl`  | 36px  | 40px (1.111)          |
| `text-5xl`  | 48px  | 1                     |
| `text-6xl`  | 60px  | 1                     |

### 2.4 Tracking (letter-spacing)

| Class              | Value     | Used for                                                   |
| ------------------ | --------- | ---------------------------------------------------------- |
| `tracking-tight`   | -0.025em  | Hero h1, video-modal intro h2.                             |
| `tracking-wider`   | 0.05em    | Eyebrow uppercase chips, "Neu" pill, "DAS ERGEBNIS".       |
| `tracking-widest`  | 0.1em     | "Vertraut von …" stat strip, "In Zahlen" eyebrow, founder. |
| `tracking-[0.25em]`| 0.25em    | Video-modal scene chapter eyebrow (`SceneChrome`).         |

### 2.5 Line-height utilities

| Class              | Value     | Used for                                          |
| ------------------ | --------- | ------------------------------------------------- |
| `leading-tight`    | 1.25      | h1, large h2.                                     |
| `leading-relaxed`  | 1.625     | Body paragraphs, card descriptions.               |
| `leading-snug`     | 1.375     | (rare).                                           |

---

## 3. Spacing

### 3.1 Container & layout grid

- **Outer container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` — used for nav, hero, all major sections, footer.
- **Narrower content containers:**
  - `max-w-6xl mx-auto …` — Founder section, before/after compare.
  - `max-w-5xl mx-auto …` — Pricing card row, comparison table, demo selector, ROI calc, lead-magnet section, Garantie.
  - `max-w-3xl mx-auto …` — FAQ, contact form wrapper, onboarding trust callout.
  - `max-w-2xl mx-auto …` — How-it-works subtitle, hero subtitle width, video subtitle copy.
  - `max-w-xl mx-auto …` — Lead-magnet hero copy.
- **Vertical rhythm (section padding):**
  - Standard section: `py-16 sm:py-24` (64 / 96 px)
  - Compact section (logo wall, before/after, customer-stats, pricing): `py-12 sm:py-16` (48 / 64 px)
  - Demo selector: `py-16 sm:py-20` (64 / 80 px)
  - Hero: `pt-24 pb-16 sm:pt-32 sm:pb-24` (extra top to clear sticky 64-px nav)
  - Footer: `py-12` (48 px)

### 3.2 Common gap / padding values

- **Card inner padding:** `p-6` (24 px) for compact cards, `p-6 sm:p-8` (24 → 32 px) for premium cards, `p-8` (32 px) for pricing cards, `p-6 sm:p-10` (24 → 40 px) for ROI calc + Garantie.
- **Grid gap:** `gap-4` (16 px) trust-badges row, `gap-5` (20 px) form rows, `gap-6` (24 px) feature/pricing/case-study cards, `gap-8` (32 px) feature columns + how-it-works steps + live-metrics, `gap-12` (48 px) hero columns, `gap-12 lg:gap-16` (48 → 64 px) hero on lg+.
- **Stack spacing (`space-y-*`):** `space-y-2` for tight lists, `space-y-2.5` for trust-badge lists, `space-y-3` for compare-bullets and FAQ, `space-y-4` for journey items, `space-y-6` for ROI sliders, `space-y-5` for form fields.
- **Inline gap inside flex (`gap-1` … `gap-3`):** badge pill icon-text = `gap-1.5`, button icon-text = `gap-2`, small icon row = `gap-3`.

### 3.3 Nav height

- Fixed nav: `h-16` (64 px). Body offset: `pt-24` on hero (extra padding above nav for breathing room) or `pt-16` in `LandingLayout`.

---

## 4. Border radii

Quoted by Tailwind class — every `rounded-*` instance found:

| Class              | Value (px)    | Role / where                                                                                                                                                       |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rounded` (none)   | -             | (not used directly, defaults to `border-radius: 0.25rem` for tags only in mockup brand pills)                                                                      |
| `rounded-sm`       | 2 px          | Submissionskarte legend swatches (`w-2 h-2 rounded-sm`).                                                                                                            |
| `rounded-md`       | 6 px          | Browser-frame URL pill, inbox tag pill in video.                                                                                                                   |
| `rounded-lg`       | 8 px          | **Default for buttons (`btn` class), inputs, mobile-nav rows, badges in mockup, supplier rows, all small icon containers (`w-8 h-8 rounded-lg`).**                   |
| `rounded-xl`       | 12 px         | **Default for cards (`.card` helper), pill cards, ROI inputs, mockup tiles, FAQ item, 3-path selector, onboarding cards, founder-promise cards, sticky CTA.**       |
| `rounded-2xl`      | 16 px         | **Default for big content cards: feature cards, hero mockup outer, pricing cards, case-study cards, testimonial cards, lead-magnet form panel, contact form box.**  |
| `rounded-3xl`      | 24 px         | Garantie outer wrapper.                                                                                                                                            |
| `rounded-full`     | 9999 px       | Pill chips, trust badges, all icon-circle wrappers (`w-10 h-10 ... rounded-full`), animated step circles, ToggleSwitch knob, exit-intent download icon.            |

**Quick rule:** buttons → `rounded-lg`; small cards / inputs → `rounded-xl`; big section cards → `rounded-2xl`; Garantie hero card → `rounded-3xl`; pills/avatars → `rounded-full`.

---

## 5. Shadows

| Class                                       | Used where                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadow-sm`                                 | Default card resting state, `.card` helper (`shadow-sm`), trust strip cards.                                                                |
| `shadow-md`                                 | Nav scrolled state (toggled via JS `${scrolled ? 'shadow-md' : ''}`), hero mockup container, "After" panel border-card.                     |
| `shadow-lg`                                 | Mobile nav drop-shadow when open, hero mockup outer (and floating badge), pricing-card highlighted Pro, 3-path CTA hover, sticky-CTA bg.    |
| `shadow-xl`                                 | ROI calculator outer panel, lead-magnet "LV per Mail" CTA.                                                                                  |
| `shadow-2xl`                                | Submissionskarte mock outer (`shadow-2xl shadow-rose-500/10`), lead-magnet panel, video-modal browser frame, exit-intent modal.             |
| `shadow-2xl shadow-rose-500/10`             | Submissionskarte showcase frame — colored shadow.                                                                                           |
| `shadow-lg shadow-kalku-green/20`           | "Referenz-Anruf" CTA bg in case-study section — green-tinted shadow.                                                                        |
| `shadow-lg shadow-primary-500/40`           | Video-modal hero KALKU-logo glow.                                                                                                           |
| `drop-shadow-md`                            | Submissionskarte SVG map pins.                                                                                                              |

> All shadows use Tailwind defaults; no custom `boxShadow` in tailwind.config.js. Colored shadows use the `shadow-{color}/{opacity}` pattern (Tailwind 3.x feature).

---

## 6. Borders

### 6.1 Widths

| Class       | Value | Role                                                              |
| ----------- | ----- | ----------------------------------------------------------------- |
| `border`    | 1px   | Default — every card, button outline, input, footer divider.      |
| `border-t`  | 1px   | Section dividers (`pt-6 border-t border-gray-100`).               |
| `border-b`  | 1px   | Mobile nav top divider, table cell dividers, mockup card dividers.|
| `border-2`  | 2px   | "Before" red panel, "After" green panel, ROI calc, Pro pricing card, Garantie wrapper, demo CTA "Live-Demo starten" highlighted card. |
| `border-dashed` | 1px dashed | Submissionskarte SVG country outline (`strokeDasharray="4 4"`), upload zone (`border-2 border-dashed border-primary-300`). |

### 6.2 Common border colors

| Class                    | Hex          | Role                                              |
| ------------------------ | ------------ | ------------------------------------------------- |
| `border-gray-100`        | `#f3f4f6`    | Default soft card border.                         |
| `border-gray-200`        | `#e5e7eb`    | Form input border, default outline button, table head bottom. |
| `border-gray-300`        | `#d1d5db`    | Alternate input border, outline-button border.    |
| `border-primary-100`     | `#cce0eb`    | ROI calculator wrap, founder stats card.          |
| `border-primary-200`     | `#99c2d7`    | Hover state for feature cards, onboarding callout.|
| `border-primary-500`     | `#1a5276`    | Highlighted "Professional" pricing card.          |
| `border-kalku-green/20`  | rgba green   | Founder promise card border.                      |
| `border-kalku-green/30`  | rgba green   | "After" comparison card border.                   |
| `border-kalku-green` (full) | `#27ae60` | "Live-Demo starten" 3-path CTA selected card.     |
| `border-red-100`         | `#fee2e2`    | "Before" comparison card border.                  |
| `border-amber-100`/`-200`| -            | Inbox lead-magnet brand chips, mid-rank pin.      |
| `border-white/10` … `/20` | rgba white  | Video-modal pickers, dark-bg buttons.             |

### 6.3 Divider patterns

- Footer divider: `pt-6 border-t border-gray-800` (LandingShell footer).
- Footer divider (LandingPage own): horizontal flex with no top divider (single-row layout).
- Card section internal split: `pt-3 border-t border-gray-100` and `pt-4 border-t border-white/60` (in tinted gradient cards, white/60 is intentional for tinted bg readability).

---

## 7. Motion

### 7.1 Custom CSS keyframes

#### `.landing-fade-in` (defined in `index.css`)

```css
.landing-fade-in {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease-out, transform 0.7s ease-out;
}
.landing-visible {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .landing-fade-in {
    transition: none;
    opacity: 1;
    transform: none;
  }
}
```

- **Duration:** 700 ms.
- **Easing:** `ease-out`.
- **Trigger:** `useInView` hook (IntersectionObserver, threshold 0.15 default; hero uses 0.1) toggles `.landing-visible` on `.landing-fade-in` once and disconnects observer.
- **Distance:** 24 px upward translation.
- **Honors `prefers-reduced-motion`.**

#### `.spinner` (`index.css`, used inline as `animate-spin`)

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- Tailwind's built-in `animate-spin` (1 s linear infinite) is also used directly on `<Loader2 className="w-5 h-5 animate-spin" />`.

#### Video-modal keyframes (defined inline in JSX `<style>` block at the bottom of LandingPage.tsx, lines 3222-3234)

```css
@keyframes kalkuFadeIn   { from { opacity: 0; }                          to { opacity: 1; } }
@keyframes kalkuFadeUp   { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes kalkuFadeDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes kalkuSlideUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes kalkuSlideRight { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
@keyframes kalkuZoomIn   { from { opacity: 0; transform: scale(0.9); }    to { opacity: 1; transform: scale(1); } }
@keyframes kalkuBounce   { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes kalkuProgress { from { width: 0; } to { width: 100%; } }
@keyframes kalkuProgressScene { from { width: 0; } to { width: 100%; } }
@keyframes kalkuTyping   { from { width: 0; } to { width: 100%; } }
@keyframes kalkuBlink    { 50% { border-color: transparent; } }
```

Triggers (inline `style={{ animation: '…' }}` on JSX nodes):
- Scene title `kalkuFadeDown 0.7s ease-out both`, scene body `kalkuFadeUp 0.7s ease-out 0.2s both`.
- Tile cascade in video scenes `kalkuSlideUp 0.4s ease-out ${0.2 + i * 0.07}s both`.
- Animated counters: pure JS interval (1800 ms duration) inside `<AnimatedCounter>`, gated by `useInView(0.3)`.

### 7.2 Tailwind utility transitions

| Class                              | Duration      | Used for                                                       |
| ---------------------------------- | ------------- | -------------------------------------------------------------- |
| `transition-shadow duration-300`   | 300 ms        | Nav `shadow-md` toggle on scroll.                              |
| `transition-shadow`                | (default 150 ms) | Card hover shadow up.                                       |
| `transition-colors`                | 150 ms        | Link/button color hovers, nav links.                           |
| `transition-opacity`               | 150 ms        | `hover:opacity-90` on `kalku-green` CTAs.                      |
| `transition-all`                   | 150 ms        | Card border + shadow combined hover.                           |
| `transition-all duration-200`      | 200 ms        | `.btn` helper.                                                 |
| `transition-all duration-300`      | 300 ms        | FAQ accordion `max-height` morph.                              |
| `transition-transform`             | 150 ms        | Icon `group-hover:translate-x-1` on 3-path CTAs.               |
| `transition-transform duration-500` | 500 ms       | Video scene cross-fade wrapper (`transition-opacity duration-500`). |
| `hover:-translate-y-1`             | with default transition | Demo selector cards lift on hover.                  |
| `group-hover:scale-105`            | 150 ms        | Feature-card icon scale.                                       |
| `group-hover:scale-110`            | 150 ms        | Demo-selector icon scale.                                      |
| `group-hover:translate-x-1`        | 150 ms        | ArrowRight on 3-path CTAs.                                     |

### 7.3 Scroll-trigger (JS)

- Custom hook `useInView(threshold = 0.15)` uses native `IntersectionObserver`, sets `isVisible` once, disconnects.
- Used to add `landing-visible` to all `.landing-fade-in` section wrappers.
- Hero uses lower threshold `useInView(0.1)`, animated counters use `useInView(0.3)`.

### 7.4 JS scroll listener

Two scroll listeners (passive):
1. `setScrolled(window.scrollY > 10)` — toggles nav `shadow-md` (also same logic in `LandingShell.tsx`).
2. `mouseout` listener on `document` — exit-intent: triggers when `e.clientY <= 0 && window.scrollY > 300` and not yet shown.

---

## 8. Breakpoints

Default Tailwind 3.4 — **no overrides** in `tailwind.config.js`:

| Token | Min-width |
| ----- | --------- |
| `sm`  | 640 px    |
| `md`  | 768 px    |
| `lg`  | 1024 px   |
| `xl`  | 1280 px   |
| `2xl` | 1536 px   |

Container behavior:

- All section containers use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` — fluid below 7xl (1280 px), centered above.
- Mobile padding 16 px → sm 24 px → lg 32 px.
- Hero is two-column at `lg:grid-cols-2` (1024 px+); stacks below.
- Pricing/case-studies/onboarding switch from 1-col → 2-col at `md` (768 px), 3- or 4-col at `lg`.
- Founder section is 2-col at `lg`.
- Mobile menu reveals at `md:hidden` (below 768 px).
- Sticky mobile CTA bar is `md:hidden` (below 768 px).
- Hero "right-side mockup" hides below `lg` (`hidden lg:block`).

---

## 9. Iconography

### 9.1 Library

- **`lucide-react@^0.562.0`** — exclusively. No SVG sprites, no icon font.
- All icons imported by name at the top of LandingPage.tsx (lines 2-58). Re-imported in LandingShell.tsx for nav (`Send, Menu, X`).

### 9.2 Icons used

```
FileText, Brain, Mail, BarChart3, Send, Inbox, ChevronDown, ChevronUp,
Leaf, Zap, Building2, Wrench, HardHat, ArrowRight, CheckCircle2, Check,
X (as XIcon), Menu, X, Loader2, Search, MessageSquare, RefreshCw,
Shield, Lock, Server, FileCheck, Calculator, TrendingUp, Clock, Euro,
Calendar, Phone, Sparkles, Play, Download, MapPin, Trophy, Target,
ShieldAlert, Recycle, Compass, GitMerge, ClipboardCheck, Quote, Heart,
Rocket, Headphones, TrendingDown, GraduationCap, Coffee, Users, Code2,
Star, Award (as AwardIcon)
```

### 9.3 Common icon sizes

| Class           | Pixel | Used for                                                 |
| --------------- | ----- | -------------------------------------------------------- |
| `w-3 h-3`       | 12    | Tiny pill icons, "Neu" sparkles, legend swatches.        |
| `w-3.5 h-3.5`   | 14    | Trust badge icons (`Server`, `Shield`, `Lock`, `FileCheck`), eyebrow chips, dot-pip indicators. |
| `w-4 h-4`       | 16    | Inline button icons, "Alle Funktionen entdecken" arrow, comparison ticks, `ArrowRight` after CTA, hero `Play` icon. |
| `w-5 h-5`       | 20    | All standard CTA icons (`Send`, `ArrowRight`, `CheckCircle2`), hero icon container content, journey card icons, mobile menu hamburger, comparison check (`mx-auto`), founder header icon. |
| `w-6 h-6`       | 24    | Mobile nav `Menu`/`X`, feature-card icons (in `w-12 h-12` chip), how-it-works step icons. |
| `w-7 h-7`       | 28    | Exit-intent download icon, video upload-mock icon.       |
| `w-8 h-8`       | 32    | Lead-magnet card icon, founder promise icon container.   |
| `w-10 h-10`     | 40    | Founder stats badge, lead-magnet card big icon.          |
| `w-14 h-14`     | 56    | Video modal hero KALKU logo container.                   |

**Icon container pattern:** circle/square chip with brand-tinted bg + colored icon. Examples:
- `<div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center"><Send className="w-5 h-5 text-white" /></div>` — logo dot.
- `<div className="w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center"><Icon className={`w-6 h-6 ${iconColor}`} /></div>` — feature/how-it-works.
- `<div className="w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center"><Icon className={`w-5 h-5 ${iconColor}`} /></div>` — submissionskarte feature row.
- `<div className="w-8 h-8 bg-{trade}-100 rounded-lg flex items-center justify-center"><Icon className="w-4 h-4 text-{trade}-600" /></div>` — mockup steps, founder promise.

### 9.4 Special non-lucide visuals

- **Map pins:** hand-rolled inline SVG (`w=28 h=36 viewBox="0 0 32 42"`) with `path` + `circle` + `text` (rank number).
- **Country outline hint:** SVG `<path>` with `strokeDasharray="4 4" stroke="#64748b"`.
- **Browser-window dots:** plain divs, `w-3 h-3 bg-{red,yellow,green}-400 rounded-full`.

### 9.5 Emoji used (keep them — they're intentional)

- `🌳` `⚡` `🇩🇪` `🔒` `🔍` `⏱️` `📧` `📎` — used in video-modal scenes and founder copy.
- Footer signoff includes `Made in Saarbrücken` (no emoji), but founder bio includes `🇩🇪`.

---

## 10. Z-index scale

Only a handful of layered components exist:

| Element                          | Tailwind class | Notes                                         |
| -------------------------------- | -------------- | --------------------------------------------- |
| Sticky mobile CTA bar            | `z-40`         | Above page content, below modals.             |
| Fixed top nav                    | `z-50`         | Above mobile CTA.                             |
| Exit-intent modal                | `z-50`         | Same level as nav (modal scrim covers nav).   |
| Video-modal overlay              | `z-50`         | -                                             |
| Video-modal close + picker buttons | `z-30`       | Above the scene content inside the modal.     |
| Onboarding cards' arrow icon     | `z-10`         | Floats over card border (decorative).         |
| Lead-magnet bg overlay           | (default)      | Pseudo-layer with `pointer-events-none`.      |

Effective stack: page < `z-10` (decoration) < `z-30` (intra-modal chrome) < `z-40` (sticky CTA) < `z-50` (nav, modals).

---

## 11. Other primitives (helpers in `index.css`)

These helpers exist in `frontend/src/index.css` `@layer components`. **The landing page uses inline Tailwind for nearly all CTAs**, so these helpers are mostly relevant for the rest of the app. Phase 3 should mirror them in the new project, but treat the landing page's inline class strings as canonical for landing usage.

```css
.btn        → px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2
.btn-primary → bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700
.btn-secondary → bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300
.btn-success → bg-kalku-green text-white hover:opacity-90
.btn-danger  → bg-kalku-red text-white hover:opacity-90
.btn-outline → border border-gray-300 bg-white text-gray-700 hover:bg-gray-50
.btn-sm      → px-3 py-1.5 text-sm

.input       → w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white
.card        → bg-white rounded-xl shadow-sm border border-gray-100 p-6
.badge       → px-2.5 py-0.5 rounded-full text-xs font-medium inline-block
.stat-card   → rounded-xl p-6 text-white

/* scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { @apply bg-gray-100; }
::-webkit-scrollbar-thumb { @apply bg-gray-300 rounded-full hover:bg-gray-400; }

/* table base styles applied globally */
table { @apply w-full; }
th    { @apply text-left px-4 py-3 bg-gray-50 font-semibold text-gray-600 text-sm border-b border-gray-200; }
td    { @apply px-4 py-3 border-b border-gray-100; }
tbody tr:hover { @apply bg-gray-50; }

/* progress */
.progress-bar  → h-2 bg-gray-200 rounded-full overflow-hidden
.progress-fill → h-full bg-kalku-green transition-all duration-300
```

Tailwind plugins:
- `@tailwindcss/forms` — provides reset for `<input>`, `<select>`, `<textarea>`. The landing page also adds `accent-primary-500` to `<input type="range">` for the ROI calculator slider.
- `@tailwindcss/typography` — included but **not used on the landing page** (no `prose` classes).

---

## 12. CTA palette decision tree (for Phase 3)

This is the rule the landing page implicitly follows:

1. **Primary action / "Start now" / sign-up** → `bg-kalku-green text-white hover:opacity-90 px-5 py-2 rounded-lg text-sm font-semibold` (small) or `px-6 py-3 ... font-semibold` (large) or `px-7 py-3.5 rounded-xl` (XL on the lead-magnet hero).
2. **Secondary / "Demo / Phone"** → `border border-gray-300 bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50`.
3. **Tertiary / inline link** → `text-primary-600 font-semibold hover:text-primary-700` (with `inline-flex items-center gap-2 + ArrowRight` for forward-feel).
4. **Highlighted Pro pricing CTA** → `bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600` — the only place primary-blue is used as a button, to differentiate from green and signal "selected plan."
5. **Inverted CTA on dark/colored bg** (lead-magnet) → `bg-white text-primary-700 px-7 py-3.5 rounded-xl font-bold hover:bg-gray-50 shadow-xl`. Or transparent: `bg-white/10 backdrop-blur text-white px-7 py-3.5 rounded-xl font-bold border border-white/20 hover:bg-white/15`.

---

## 13. Findings & Inconsistencies

These deserve a Phase 3 decision; flag them but do not silently fix in this extraction.

1. **Inter font is referenced but never loaded.** `tailwind.config.js` declares `fontFamily.sans = ['Inter', ...]` but `index.html` has no `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter…">` and no `@import` in `index.css`. Result: visitors without Inter installed fall through to `-apple-system / BlinkMacSystemFont / sans-serif`. **Fix:** add the Google Fonts `<link>` (preconnect + display=swap) or self-host.
2. **Two blue tokens for the same value.** `primary-500` and `kalku-blue` both equal `#1a5276`. The page mostly uses `primary-*`; `kalku-blue` is dead code in this file. **Fix:** drop `kalku-blue` or alias it explicitly.
3. **Three unused `kalku.*` colors.** `kalku-orange (#f39c12)`, `kalku-red (#e74c3c)`, `kalku-purple (#9b59b6)` are declared but the landing page uses Tailwind's native `amber-*`, `red-*`, `purple-*` instead. **Fix:** remove or document these as "reserved for Stammdaten chips."
4. **Two button styles for the same role.** In the hero, the primary CTA "Kostenlos testen" uses `bg-kalku-green ... rounded-lg font-semibold`; in the case-studies "Referenz-Anruf" CTA it's `rounded-xl shadow-lg shadow-kalku-green/20`; in the lead-magnet hero it's `bg-white text-primary-700 rounded-xl font-bold shadow-xl`. **Fix:** define a `Button` component with explicit `size="md|lg|xl"` and `variant="cta|cta-on-dark|outline|primary"`.
5. **Two card border conventions.** Most cards use `border border-gray-100 shadow-sm`. Pricing's Pro card uses `border-2 border-primary-500 shadow-lg`. Before/After uses `border-2 border-red-100` and `border-2 border-kalku-green/30`. **Fix:** define `--card-elev-1, --card-elev-2-highlight, --card-warning, --card-success`.
6. **`AnimatedCounter` accepts a number but the landing-page imports counters as the same type as `stats.ai_accuracy = 95` (a percentage) and `stats.hours_saved = 1191` (raw hours). Suffix differentiates them.** Make sure the new build keeps the `.toLocaleString('de-DE')` formatting (German thousands separator with `.`).
7. **Two `Star` color tokens used for ratings.** Testimonial stars use `text-amber-500 fill-amber-500`; "4.9 / 5" textual rating uses no icon. **Fix:** decide whether the small inline rating gets stars too.
8. **Two footer styles.** `LandingShell.tsx`'s footer is a 4-column dark grid with brand block + 3 link columns. `LandingPage.tsx` (lines 2294-2322) has a **different** single-row dark footer with all legal links inline. **Fix:** standardize on one footer; the LandingPage's single-row variant ships the most legal links (DSGVO, Sicherheit, AVV, TOM, Subprozessoren) and is the customer-acquisition target.
9. **Two nav definitions.** `LandingShell.tsx` exports `<LandingNav>` (used by other public pages); `LandingPage.tsx` reimplements its own nav inline (lines 390-451). They diverge in nav links: LandingShell links `Funktionen | Preise | Kunden | Sicherheit | Blog | Kontakt`; LandingPage's inline nav uses scroll-to anchors `Funktionen | ROI-Rechner | Preise | Kontakt`. **Fix:** decide whether the landing page keeps inline scroll nav or adopts the shared shell nav.
10. **Mockup-sized icons mix two scales.** Hero mockup steps use `w-8 h-8 ... rounded-lg` icon containers, but the Submissionskarte feature list uses `w-10 h-10 rounded-lg`, and feature cards use `w-12 h-12 rounded-xl`. Document explicit sizes (S=32, M=40, L=48) in a chip-size scale.
11. **Submissionskarte map gradient uses raw hex in arbitrary value:** `bg-[radial-gradient(ellipse_at_center,_#dbeafe_0%,_#ecfccb_45%,_#fef3c7_100%)]`. None of those hexes (`#dbeafe = blue-200`, `#ecfccb = lime-100`, `#fef3c7 = amber-100`) are tokenized — they're hard-coded for the visual. Acceptable but worth noting as "decorative-only color escape hatch."
12. **`tracking-[0.25em]` is a one-off** in `SceneChrome` for the video-modal eyebrow. Other eyebrows use `tracking-wider` (0.05em) or `tracking-widest` (0.1em). Either standardize at `tracking-widest` or keep as the "video-only" maximum.
13. **`bg-gray-300` is used on the pricing toggle off-state**, while the rest of the design uses `bg-gray-200` for similar inactive surfaces. Minor inconsistency.

---

## 14. Quick reference — "the 6 colors you need"

If a Phase 3 reviewer wants to remember the design with one hand:

1. **`#1a5276` (primary-500)** — the brand blue. Hero highlight, logo dot, links, live-metrics bg.
2. **`#27ae60` (kalku-green)** — the action color. Every CTA, every checkmark, every success.
3. **`#111827` (gray-900)** — heading text + footer bg.
4. **`#6b7280` (gray-500)** — body subtitle, footer text.
5. **`#f9fafb` (gray-50)** — alternating section bg, secondary surface.
6. **`#ffffff`** — default surface, cards.

Everything else is a tinted accent for one of seven trades, or a Tailwind native semantic color used directly.
