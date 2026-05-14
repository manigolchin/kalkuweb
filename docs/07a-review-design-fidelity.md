# 07a — Design-Fidelity-Review (kalku.de vs. Anfragetool V1)

> **Stand:** 14. Mai 2026 — Phase 4 Pre-Launch-Audit
> **Reviewer:** unabhängige Instanz, keine Code-Änderungen
> **Quellen:** [01-design-tokens.md](./01-design-tokens.md), [02-component-inventory.md](./02-component-inventory.md), `frontend/src/pages/LandingPage.tsx` (3254 Zeilen), `frontend/src/components/LandingShell.tsx` aus dem Anfragetool-Worktree
> **Methode:** File-by-file Vergleich von Tailwind-Fingerprint, Token-Verwendung, Komponenten-Anatomie

---

## 1. Executive Summary

Die neue kalku.de hat den **Markenkern korrekt eingefangen**: weiß, primary-500-Petrol, kalku-green CTA, Inter geladen, `container-page` und `section`-Helpers exakt nachgebaut, Radius-Skala (lg/xl/2xl/3xl) konsequent. Der visuelle Eindruck ist „selbe Marke, ruhigerer Ton" — wie der Service-Schwester-Ableger eines Tool-Produkts. **Score: 7.0/10.**

**Top-3-Stärken:**
1. **Token-Hygiene besser als das Original** (`kalku-blue` raus, Inter via `@fontsource-variable/inter` korrekt geladen, `card`/`btn`/`section`/`container-page` als saubere `@layer components`-Helpers).
2. **Footer & Nav vereinheitlicht** — eine kanonische Implementation statt der zwei divergierenden Varianten im Original.
3. **HeroMockup neu interpretiert mit echter Substanz** (LV-Tabelle mit Positionen, EP/GP, Fußzeile mit Wagnis & Gewinn) — vermittelt das Service-Versprechen besser als der Tool-Mockup im Original.

**Top-3-Lücken:**
1. **Trade-Color-Quintett wird inkonsequent eingesetzt** — Tile-Wall (Home.tsx:89-101) zeigt die Gewerke ohne ihre Farbtöne, VierTeams nutzt willkürlich `primary/emerald/amber/sky` statt der dokumentierten Trade-Mapping-Quintette.
2. **`.landing-fade-in` + IntersectionObserver in `index.css` deklariert, aber nirgends benutzt** — keine einzige Section hat `useInView`. Das raubt der Seite den charakteristischen „Cards rollen rein"-Rhythmus des Originals.
3. **Lead-Magnet-CTA-Hero fehlt komplett** — die bauchladenstärkste Single-Section des Originals (gradient `from-primary-600 via-primary-500 to-kalku-green` mit Beispiel-Analyse-Card rechts) hat im neuen Build kein Pendant. UrgencyCta ist halbwegs verwandt, aber ohne Lead-Magnet-Mechanik (kein Email-Capture, keine Demo-Preview-Card).

---

## 2. Findings nach Severity

### P0 — Launch-Blocker (Familien-Bruch)

Keine echten Launch-Blocker. Die Marken-DNA ist intakt. Nichts auf dieser Severity-Stufe.

### P1 — Important (vor Launch fixen)

**P1-1: Trade-Color-Quintett wird im sichtbarsten Use-Case (Tile-Wall) ignoriert.**
- **Datei:** `src/pages/Home.tsx:89-101` (Trade Tile Wall)
- **Befund:** Sieben Gewerke werden als rein graue Karten gerendert (`card-flat ... text-center`). Im Original (LandingPage.tsx:526-537) hat **jedes Gewerk** seinen Quintett-Tag (`bg-emerald-100 text-emerald-700`, `bg-yellow-100 text-yellow-700`, …). Das ist die *eine* Stelle, an der die Trade-Farben dem Besucher in 1 Sekunde signalisieren „diese Marke kann sieben Gewerke, jedes in seinem Code".
- **Fix-Vorschlag:** In `Home.tsx` jedes `<Link>` als `bg-{trade}-50 text-{trade}-700 border-{trade}-200` rendern, mit Mapping aus `TRADES`-Konstante. `tailwind.config.js` safelist deckt das bereits ab (`bg-${c}-50, text-${c}-700, border-${c}-200`) — keine Build-Anpassung nötig.

**P1-2: `.landing-fade-in` ist totes CSS — kein `useInView`-Hook im neuen Build.**
- **Datei:** `src/index.css:118-134` (Klassen-Definition vorhanden), aber `grep -r "landing-fade-in" src/` liefert null Treffer in Components.
- **Befund:** Original benutzt das Pattern *überall* — `heroAnim`, `trustAnim`, `compareAnim`, `roiAnim`, `metricsAnim`, `faqAnim`, `founderAnim`, `contactAnim`, `guaranteeAnim`. Cards rollen sanft rein. Im neuen Build erscheint alles statisch.
- **Fix-Vorschlag:** Mini-Hook `useInView(threshold)` aus `02-component-inventory.md` Lines 50-78 portieren (≤30 Zeilen Code), pro Section einmal anwenden. Alternativ pragmatisch: per CSS `@view-timeline`/`animation-timeline` ab Chrome 115 — modern, aber Safari-Lücken. Hook ist die sicherere Wahl.
- **Pro/Contra MVP:** Pro = sofort spürbarer Marken-Match; Contra = ~30 Zeilen Code + Risiko, dass irgendeine Reduced-Motion-Konstellation kaputt geht. **Empfehlung:** vor Launch implementieren — der Effort ist klein, der wahrgenommene Qualitätsgewinn groß.

**P1-3: Lead-Magnet-Hero fehlt komplett.**
- **Original:** `LandingPage.tsx:1763-1847` — gradient bg `from-primary-600 via-primary-500 to-kalku-green`, h2 „Schicken Sie uns Ihr letztes LV — wir analysieren es kostenlos", weiß-auf-blau CTA + glassy outline CTA + Beispiel-Analyse-Card rechts.
- **Neue Seite:** Es gibt nur `UrgencyCta` (`src/components/sections/UrgencyCta.tsx`). Verwandt im Geist (gradient, weiße CTAs), aber:
  - Keine Lead-Magnet-Mechanik (kein „LV einreichen", keine Beispiel-Analyse-Card als Vorschau).
  - Bullet-Liste mit konkreten Outputs fehlt.
  - Im neuen Tools-Bereich (`pages/GaebKonverter.tsx`, `pages/Kalkulator.tsx`) sind ggf. Email-Capture-Boxen (nicht geprüft), aber das **ersetzt nicht** den Lead-Magnet auf der Home-Seite.
- **Fix-Vorschlag:** Eine zusätzliche Section `LvAnalyseLeadMagnet` im neuen Build zwischen `IrrtumFaq` und `FounderTrust` einsetzen, die exakt das Original-Pattern kopiert (gradient, 4-Bullet-Liste, „LV per Mail einreichen" Mailto-CTA, „Lieber kurz telefonieren" als Phone-Fallback, Beispiel-Analyse-Card als 2/5 Spalte). Diese Section ist im Service-Geschäft sogar relevanter als im Tool-Geschäft — „schicken Sie uns Ihr LV" ist die Kernbotschaft.

**P1-4: Inkonsistente CTA-Variante in der Konditionen-Pricing-Karte.**
- **Datei:** `src/components/sections/PricingTiles.tsx:62-65`
- **Befund:** Featured („Beliebt") Tier nutzt `btn-primary` (blau). Das **deckt sich mit dem Original** (`primary-500` Button für die hervorgehobene Pricing-Karte) — *aber* die nicht-featured Tiles nutzen `btn-outline` und der Hero auf `Konditionen.tsx:63` nutzt `btn-success` (grün). Die Pricing-Section selbst hat keinen grünen CTA — Besucher springt von „grüner Hero-CTA" → „blau-grau-blau-grau Pricing-Karten" → „grüner Bottom-CTA". Im Original ist diese Hierarchie identisch, also **akzeptabel**, aber:
  - **Risiko:** Pricing-Karten ohne grünen CTA können dem Besucher signalisieren, dass die Pricing-Tiles selbst *nicht* der Conversion-Hot-Spot sind. Im Original wird das durch das „Beliebt"-Pin gemildert; im neuen Build ist es ebenfalls da.
- **Empfehlung:** Beobachten in Phase 5 mit Plausible/Heatmap. Kein Pre-Launch-Fix nötig.

**P1-5: HeroMockup zeigt Tabelle statt Workflow — bewusste Re-Interpretation, aber Glow-Pattern bricht aus.**
- **Datei:** `src/components/sections/HeroMockup.tsx:13-15`
- **Befund:** Hintergrund-Glow `bg-gradient-to-br from-primary-100/60 via-emerald-50/60 to-amber-50/40 rounded-[2.5rem] blur-2xl`. Das ist der Submissionskarte-Glow-Pattern (LandingPage.tsx, sect 7), aber in 3-Farben-Stretch und mit **arbiträrem Radius `rounded-[2.5rem]`** statt der dokumentierten Skala (lg=8, xl=12, 2xl=16, 3xl=24px). `2.5rem` = 40px = zwischen 3xl und einem hypothetischen 4xl.
- **Fix-Vorschlag:** `rounded-[2.5rem]` → `rounded-3xl` ändern. Glow-Farbe ist OK, Card selbst ist `rounded-2xl` und auf der Skala.

### P2 — Nice-to-have (Phase 5 Polish)

**P2-1: Doppel-CTA-Konflikt im Hero.**
- **Datei:** `src/pages/Home.tsx:51-58`
- **Befund:** Zwei CTAs nebeneinander: `Erstgespräch vereinbaren` (`btn-success`, grün) + `Konditionen ansehen` (`btn-outline`). Der Phase-1-Dossier (`00-phase1-dossier.md` §3) sagt explizit: „Doppelte CTAs … nebeneinander → ein primärer CTA pro Section". Das Original hat allerdings auch **drei** Hero-CTAs („Kostenlos testen" + „Video ansehen" + „Persönliche Demo"), also die Pattern-Treue ist gegeben. Boss-Entscheid.

**P2-2: Eyebrow-Casing inkonsistent.**
- **Datei:** `src/components/ui/SectionHeader.tsx:26` definiert `<p className="eyebrow">` (`uppercase tracking-wider`). Das matched das Original-Eyebrow-Pattern. **Aber:** im Hero `Home.tsx:40-42` wird das eyebrow als inline Span gerendert (`px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold uppercase tracking-wider`), nicht als simpler `<p className="eyebrow">`. Das ist ein **Pill-Eyebrow** (mit bg + padding) — auch eine valide Original-Variante (LandingPage.tsx:462-465), aber: die Schriftgröße `text-xs` ist beim Pill korrekt, beim plain `eyebrow` aus `index.css:82-84` ebenfalls — passt.
- **Fix:** Pill-Variante als zweite Helper-Klasse `.eyebrow-pill` definieren, damit die zwei Varianten dokumentiert sind.

**P2-3: SectionHeader Heading h2 zu groß im Vergleich zum Original.**
- **Datei:** `src/components/ui/SectionHeader.tsx:27`
- **Befund:** `text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight`. Original (siehe `01-design-tokens.md` §2.3) verwendet für „Section h2 (large)" `text-3xl sm:text-4xl font-bold` — ohne `lg:text-5xl`. Das `lg:text-5xl` (48px) macht die neue Seite auf Desktop **größer und plakativer** als das Original. Ist das gewollt?
- **Empfehlung:** Wenn das die bewusste Marken-Entscheidung ist (Service-Marke wirkt souveräner mit größerer Headline), beibehalten und in `01-design-tokens.md` als Abweichung dokumentieren. Sonst auf `text-3xl sm:text-4xl` zurückdrehen.

**P2-4: FaqItem nutzt `card-flat` statt der Original-Anatomie.**
- **Original (LandingPage.tsx FAQItem):** `border border-gray-200 rounded-xl overflow-hidden` mit Toggle-Button `w-full ... p-5 ... hover:bg-gray-50`. Body morpht via `max-height` von `0` auf `'600px'` mit `transition-all duration-300`.
- **Neuer Build (FaqItem.tsx):** `card-flat hover:shadow-sm transition-shadow` — also `bg-white rounded-2xl border border-gray-100 p-6`. Größerer Radius (2xl statt xl), weichere Border (gray-100 statt gray-200), inneres `p-6` statt `p-5`. Optisch *etwas weicher / luftiger* als das Original. Body morpht via `scrollHeight`-gemessenem `maxHeight` (eleganter als `'600px'`-Hardcode).
- **Bewertung:** Bessere Implementierung, aber **anders aussehend** als Original. Familie? Ja. Gleiche Komponente? Nein.
- **Empfehlung:** Beibehalten, ist ein UX-Gewinn.

**P2-5: Footer-Brand-Subtitle sagt „Baukalkulationen" statt „Procurement".**
- **Datei:** `src/components/layout/Footer.tsx:49` (`<span ... text-gray-400>Baukalkulationen</span>`)
- **Befund:** Korrekt für die neue Service-Marke. Original sagt „Procurement". Bewusste Marken-Differenzierung — keine Abweichung im Sinne von „falsch", nur dokumentieren.

**P2-6: Founder-Card Avatar ist `bg-primary-500/20` statt der Original-Gradient-Avatar.**
- **Datei:** `src/components/sections/FounderTrust.tsx:15-16`, `src/pages/UeberUns.tsx:53-54`
- **Original (LandingPage.tsx Inbox-Avatar):** `bg-gradient-to-br from-primary-400 to-primary-600`. Das ist der einzige Gradient-Avatar im ganzen Original-File.
- **Empfehlung:** Auf `bg-gradient-to-br from-primary-400 to-primary-600` umstellen (dann wirkt das Initial-Plate der `AC`-Initialen weniger „Skelett-Platzhalter").

**P2-7: Konditionen-Mindestvoraussetzungen rendert ohne Trade-Pill-Tags.**
- **Datei:** `src/pages/Konditionen.tsx:120-127`
- **Befund:** 3 Tiles mit nur Nummer + Label, `card-flat text-center`. Funktional OK, aber dem Original-Stil entspräche, eine Icon-Chip-Combo zu rendern (`w-12 h-12 rounded-xl bg-emerald-50 ... <Icon ... text-emerald-600 />` etc.). Das ist eine echte Geschmacksfrage — minimalistischer ist auch valide.

**P2-8: Pricing-Card `lg:scale-[1.02]` ist nicht im Original.**
- **Datei:** `src/components/sections/PricingTiles.tsx:39`
- **Befund:** Featured-Tier wird auf `lg+` um 2 % skaliert. Das ist eine **eigene Erfindung**. Im Original hebt die Featured-Karte sich nur über `border-2 border-primary-500 shadow-lg` ab. Der `scale-[1.02]` macht die Karte minimal größer, kann aber Kanten-Anti-Aliasing produzieren.
- **Empfehlung:** Entfernen, nur `border-2 border-primary-500 shadow-lg` reicht.

**P2-9: Konditionen Hero h1 nutzt `leading-tight` (1.25), Home Hero nutzt `leading-[1.05]` (1.05).**
- **Dateien:** `Konditionen.tsx:55` vs. `Home.tsx:43`
- **Befund:** Inkonsistente Hero-h1-Line-Height. Original nutzt überall `leading-tight`. `leading-[1.05]` ist enger als jeder Original-Wert.
- **Empfehlung:** Beide auf `leading-tight` (oder `leading-[1.1]`) angleichen.

**P2-10: `UrgencyCta` Gradient endet auf `emerald-700` statt `kalku-green`.**
- **Datei:** `src/components/sections/UrgencyCta.tsx:10`
- **Befund:** `bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-700`. Original Lead-Magnet (LandingPage.tsx:1764): `from-primary-600 via-primary-500 to-kalku-green`. `emerald-700` (`#047857`) ist dunkler als `kalku-green` (`#27ae60`) — das gibt dem Übergang einen tieferen Wald-Ton statt des Original-„kraft­vollen Apfelgrün".
- **Empfehlung:** Auf `to-kalku-green` ändern. Es ist die markentragende CTA-Farbe.

**P2-11: VierTeams Team-Beschreibungen sind länger als die Feature-Card-Bodies im Original — Karten unterschiedlich hoch wirkend.**
- **Datei:** `src/components/sections/VierTeams.tsx:7-28`
- **Befund:** Beschreibungen sind 3-4 Zeilen statt der typischen 2 Zeilen im Original (LandingPage.tsx Features). Mit `h-full flex flex-col` wirkt das ausgewogen, aber im Vergleich zu „so funktioniert's" im Original wirken die Karten textlastiger.
- **Empfehlung:** Akzeptabel, da die Vier-Teams-Geschichte das Markenversprechen ist und Textlänge die Substanz signalisiert.

---

## 3. Komponenten-Mapping-Tabelle (26 Original-Komponenten)

Status-Vokabular:
- **portiert** = direkt aus dem Original übernommen, Tailwind-Fingerprint stimmt überein
- **neu interpretiert** = visueller Geist eingehalten, Implementierung anders
- **ausgelassen** = bewusst nicht übernommen (Tool-Pattern statt Service-Pattern)
- **fehlt** = sollte da sein, ist aber nicht da

| #  | Original-Komponente                     | Status          | Hinweis |
|----|------------------------------------------|-----------------|---------|
| 1  | Top Navigation                           | portiert        | `Nav.tsx` matched LandingShell. NavLink + active-state ist sogar besser als Original. **Eine** kanonische Variante statt der zwei Original-Divergenzen — gut. |
| 2  | Hero (split copy + UI mockup)            | neu interpretiert | Layout 1:1, aber Mockup zeigt LV-Tabelle statt Tool-Workflow. Pillen-Eyebrow + Highlight-Word-Trick (`<span className="text-primary-500">…</span>`) korrekt. |
| 3  | Before/After Compare (2-card row)        | ausgelassen     | Service-Marke braucht das nicht zwingend, aber der Kontrast „mit/ohne KALKU" wäre ein wirksames Tool fürs Konditionen-Sales. **Empfehlung:** in Phase 5 als optionale Section nachziehen. |
| 4  | Customer-stats strip + trade icon-tile wall | neu interpretiert | Tile-Wall vorhanden (Home.tsx:81-103) — aber **ohne Trade-Color-Quintette** (siehe P1-1). Stat-Counter fehlt komplett (kein „X aktive Bauunternehmen"). Ist das Service-Geschäft, da macht ein Counter weniger Sinn. |
| 5  | "So funktioniert's" 4-step grid          | neu interpretiert | StepsTimeline.tsx mit 5 Schritten statt 4. Nutzt watermarked step number (`text-4xl font-bold text-gray-200`) — Original-Pattern korrekt umgesetzt. Connector-Line zwischen Karten als `w-6 h-px bg-gray-200` ist eine Eigenleistung — sauber. |
| 6  | Features grid (12 cards mit "Neu" badges) | ausgelassen     | Macht Sinn — Service-Marke verkauft keine 12 Tool-Features. „Vier Teams" tritt an die Stelle. |
| 7  | Submissionskarte showcase (custom map)   | ausgelassen     | Korrekt ausgelassen — Tool-Feature, kein Service-Argument. |
| 8  | Customer testimonials (6 tinted cards)   | fehlt           | **Empfehlung:** in Phase 5 nachziehen, sobald 2-3 echte Customer-Zitate freigegeben sind. CaseStudies.tsx ist verwandt aber datengetriebener (Vorher/Nachher), die *menschliche Stimme* fehlt. |
| 9  | Detailed case studies (3 metric cards)   | portiert        | CaseStudies.tsx übernimmt das Pattern fast 1:1. Trade-Pill, Vorher-Karte (gray-50), Nachher-Karte (emerald-50), Outcome-Footer mit border-top. **Sehr gut.** |
| 10 | ROI calculator                           | ausgelassen     | Korrekt ausgelassen — Service-Geschäft hat keinen einfachen ROI-Slider („Submissionen × Stunden × Stundensatz"). |
| 11 | Industry-specific demo selector          | ausgelassen     | Wird durch Trade-Tile-Wall ersetzt. Akzeptabel. |
| 12 | Gewerke list (7 cards)                   | neu interpretiert | Trade-Tile-Wall macht den Job, allerdings ohne Kategorien-Counter und ohne Trade-Quintet (P1-1). |
| 13 | Comparison table (KALKU vs Manuell)      | fehlt           | **Empfehlung:** wäre stark im Service-Geschäft („KALKU vs interne Kalkulation vs anderer Outsourcer"). Phase 5 nachziehen. |
| 14 | Pricing (3 tiers + monthly toggle)       | neu interpretiert | PricingTiles.tsx zeigt 3 Tiers (Einzel / M / L), Featured = Mitte mit blauer CTA, "Beliebt" Pill. Pattern intakt, **aber** kein Monthly/Yearly-Toggle (Service hat keine 12-Monats-Rabatt-Logik). |
| 15 | Risk-Reversal / Garantie (4 promise tiles) | neu interpretiert | Konditionen.tsx hat „Loyalität & Gebietsschutz" Section (2 Tiles statt 4). Geist getroffen (Garantie-Versprechen, Trust-Anker), aber das **3xl-Outer-Wrap** mit `border-2 border-kalku-green/20` aus dem Original fehlt. Die zwei Cards sind einzeln `card`-Klasse. Optisch weniger emphatic. |
| 16 | Onboarding journey (4 phase cards + arrow connectors) | fehlt | Im Service-Pitch wäre eine „Was passiert in den ersten 30 Tagen"-Section starker Trust-Anker. Empfehlung: Phase 5. |
| 17 | Lead-magnet CTA hero (LV-Analyse)        | fehlt           | **Siehe P1-3.** Wichtigste Fehlstelle. UrgencyCta ist verwandt, aber kein vollwertiger Lead-Magnet. |
| 18 | Live metrics on primary-500 bg           | ausgelassen     | Macht Sinn — Service hat keine „live counter" Stats. |
| 19 | FAQ (search input + accordion)           | neu interpretiert | IrrtumFaq.tsx hat 4-Item Accordion, aber **ohne Search-Input** und **ohne** zentrale h2-Section-Header — stattdessen 2-Spalten-Layout (Title links, Items rechts). Eigene Variante, sauber umgesetzt. Konditionen.tsx hat noch eine zweite FAQ-Section, dort mit zentralem Header — beide Varianten sind dokumentiert worth. |
| 20 | Founder/team trust block                 | portiert        | FounderTrust.tsx übernimmt das split-Layout, mit Quote-Icon + blockquote + 3 Stat-Cards. Avatar-Plate statt Foto (Phase 5). **Siehe P2-6** für Avatar-Gradient-Verbesserung. |
| 21 | Contact section (3-path selector + form) | nicht im Scope dieses Reviews | Kontakt.tsx wurde nicht angefragt — vermutlich vorhanden, aber nicht in der Review-Liste. |
| 22 | Footer (single-row dark)                 | neu interpretiert | Footer.tsx ist **4-spaltig** (Brand-Block + Leistungen + Unternehmen + Tools+Rechtlich) — also näher an LandingShell-Footer als an LandingPage-Footer. Service-Geschäft hat mehr Sub-Navigation, das ist korrekt. „Single dark-row" Variante des Originals wäre für eine Service-Marke unterspielt. |
| 23 | Sticky mobile CTA bar                    | neu interpretiert | StickyMobileCta.tsx ist **3-spaltig** (Anrufen/WhatsApp/Termin) statt 1-spaltig wie im Original. Service-relevanter — Telefonie ist im Service B2B-Geschäft Conversion-Driver. **Sehr gut.** |
| 24 | Video modal (multi-track slideshow)      | ausgelassen     | Korrekt — Service braucht keinen Tool-Demo-Video. |
| 25 | Exit-intent modal (whitepaper capture)   | fehlt           | **Phase 5 Empfehlung.** Whitepaper-Lead-Magnet à la „4 häufige Irrtümer als PDF" hätte starke Conversion-Wirkung. |
| 26 | Chat widget (Crisp loader)               | nicht geprüft   | Nicht im Review-Scope. |

**Bilanz:** 8 portiert/neu interpretiert in Schlüsselrolle, 6 bewusst ausgelassen mit guter Begründung, 6 fehlend (davon 1 als P1, 5 als P2/Phase-5-Backlog).

---

## 4. Token-Verstoß-Liste

### 4.1 CTA-Farbe (Regel: jeder primärer CTA = `kalku-green`, Ausnahme: hervorgehobene Pricing-Karte = `primary-500`)

| Datei:Zeile | CTA-Text | Klasse | Erwartung | Status |
|---|---|---|---|---|
| `Home.tsx:52` | „Erstgespräch vereinbaren" | `btn btn-success btn-lg` | grün | OK |
| `Home.tsx:57` | „Konditionen ansehen" | `btn btn-outline btn-lg` | outline | OK (sekundär) |
| `Nav.tsx:60` | „Erstgespräch vereinbaren" | `btn btn-success` | grün | OK |
| `Konditionen.tsx:63` | „Beratung vereinbaren" | `btn btn-success btn-lg` | grün | OK |
| `Konditionen.tsx:156` | „Erstgespräch vereinbaren" | `btn btn-success btn-lg` | grün | OK |
| `UeberUns.tsx:177` | „Erstgespräch vereinbaren" | `btn btn-success btn-lg` | grün | OK |
| `UeberUns.tsx:72` | „Mehr über das Team" | `btn btn-outline` | outline | OK |
| `UrgencyCta.tsx:30` | „Erstgespräch vereinbaren" | `btn btn-lg bg-white text-primary-700` | weiß-auf-blau | OK (CTA-on-dark Variante) |
| `PricingTiles.tsx:64` | „Beratung vereinbaren" (featured) | `btn btn-primary` | blau | OK (Original-Pattern für hervorgehobene Pricing-Karte) |
| `PricingTiles.tsx:64` | „Beratung vereinbaren" (default) | `btn btn-outline` | outline | OK |
| `FounderTrust.tsx:72` | „Mehr über das Team" | `btn btn-outline` | outline | OK |

**Befund:** **Keine CTA-Token-Verstöße.** Sehr sauber.

### 4.2 Brand-Farbe (Regel: primary-500 = Logo-Akzent + Highlight-Wort + ggf. blau-CTA)

| Datei:Zeile | Stelle | Verwendung | Status |
|---|---|---|---|
| `Nav.tsx:36` | Logo-Square | `bg-primary-500` | OK |
| `Footer.tsx:44` | Logo-Square | `bg-primary-500` | OK |
| `Home.tsx:45` | Hero-Highlight „Sie unterschreiben" | `text-primary-500` | OK |
| `Konditionen.tsx:57` | Hero-Highlight „Sie zahlen, wenn wir liefern" | `text-primary-500` | OK |
| `HeroMockup.tsx:73` | Summe-Zahl | `text-primary-700` | OK |
| `HeroMockup.tsx:68-71` | Summe-Footer-bg | `bg-primary-50/60` | OK |
| `PricingTiles.tsx:43` | „Beliebt" Pill bg | `bg-primary-500` | OK |
| `PricingTiles.tsx:49` | Preis-Text | `text-primary-600` | OK (nicht 500, aber primary-Familie) |

**Befund:** Keine Verstöße. Pricing-Preis als `text-primary-600` statt `gray-900` ist eine Eigenleistung — das Original setzt den Preis als `text-4xl font-bold text-gray-900`. Im Service-Kontext lenkt das die Aufmerksamkeit deutlicher auf die Zahl, ist aber eine **Abweichung vom Token** — vermutlich gewollt, dokumentieren.

### 4.3 Radius-Skala (Regel: `lg`=Buttons, `xl`=Inputs/kleine Cards, `2xl`=große Cards, `3xl`=Garantie/Hero)

| Datei:Zeile | Klasse | Skala-konform? |
|---|---|---|
| `index.css:26-49` (`btn`-Helpers) | `rounded-lg` | OK |
| `index.css:52` (`input`) | `rounded-xl` | OK |
| `index.css:60-65` (`card`, `card-flat`) | `rounded-2xl` | OK |
| `Nav.tsx:36` (Logo-Square) | `rounded-lg` | OK |
| `HeroMockup.tsx:14` (Glow-Wrapper) | `rounded-[2.5rem]` | **VERSTOSS** — siehe P1-5 |
| `HeroMockup.tsx:17` (Mockup-Card) | `rounded-2xl` | OK |
| `HeroMockup.tsx:23` (URL-pill) | `rounded-md` | OK (Browser-Frame Pattern) |
| `HeroMockup.tsx:78` (Trust-Badge) | `rounded-xl` | OK |
| `UrgencyCta.tsx:10` (Hero-Outer) | `rounded-3xl` | OK (Garantie/Hero-Pattern) |
| `FounderTrust.tsx:13` (Foto-Plate) | `rounded-3xl` | OK (Foto = Hero-Klasse-Element) |
| `UeberUns.tsx:51` (Foto-Plate) | `rounded-3xl` | OK |
| `UeberUns.tsx:160` (Map-Plate) | `rounded-2xl` | OK |
| `CaseStudies.tsx:76,81` (Vorher/Nachher) | `rounded-xl` | OK |
| `Konditionen.tsx` (alle `card`) | `rounded-2xl` (via card) | OK |
| `PricingTiles.tsx:43` (Beliebt-Pill) | `rounded-full` | OK |

**Befund:** **Ein Verstoß** — `rounded-[2.5rem]` in HeroMockup.tsx:14. Sonst sauber.

### 4.4 Trade-Color-Quintett

| Stelle | Soll-Mapping | Ist | Konform? |
|---|---|---|---|
| `tailwind.config.js:2` `TRADE_COLORS` | emerald, sky, stone, yellow, orange, blue, red, teal | richtig konfiguriert | OK |
| `Home.tsx:89-101` (Tile-Wall) | bg-{trade}-50, text-{trade}-700, border-{trade}-200 | rein grau (`card-flat`) | **VERSTOSS** — siehe P1-1 |
| `CaseStudies.tsx:44-52` PILL_CLASSES | sky/emerald/yellow/orange/stone/blue/red | korrekt | OK |
| `VierTeams.tsx:31-36` COLOR_CLASSES | primary/emerald/amber/sky | **AMBER ist nicht im Trade-Mapping** — Haustechnik soll `orange` sein, Elektro soll `yellow` | **GRENZWERTIG** — die VierTeams sind aber *nicht* Gewerke (Kalkulation/Einkauf/Vergabe/Recherche), sondern interne Teams. Da darf auch `amber` benutzt werden. Konform, wenn man die Logik versteht. |

**Empfehlung:** im VierTeams-File einen Kommentar setzen: „diese Farben sind interne-Team-Farben, nicht Trade-Quintett". Sonst übermisst ein zukünftiger Reviewer das.

### 4.5 Spacing-Rhythmus

- **`section` (py-16 sm:py-24)** — verwendet in: Home, VierTeams, StepsTimeline, PricingTiles, CaseStudies, IrrtumFaq, FounderTrust, UrgencyCta, Konditionen (5x), UeberUns (5x). **Konsistent.**
- **`section-tight` (py-12 sm:py-16)** — verwendet in: Home (Trade-Wall), Konditionen (Pricing). **Konsistent.**
- **`container-page` (max-w-7xl)** — überall Standard. **Konsistent.**

**Keine Verstöße.**

### 4.6 Inter-Font

- `package.json:13` `@fontsource-variable/inter@^5.2.7` ✓
- `src/main.tsx:6` `import '@fontsource-variable/inter'` ✓
- `tailwind.config.js:39-48` `fontFamily.sans = ['"Inter Variable"', 'Inter', '-apple-system', …]` ✓
- `index.css:11` `body { @apply ... }` mit `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';` ✓ (Inter-spezifische Glyphen-Varianten aktiviert — geht über das Original hinaus, gute Praxis)

**Inter-Loading: vorbildlich umgesetzt.** Eine echte Verbesserung gegenüber dem Original.

---

## 5. Empfehlung

### Soll vor Launch noch was gefixt werden?

**Ja — die folgenden 3 Fixes sollten in einem Sprint erledigt werden, idealerweise vor dem Boss-Approval-Roundtrip:**

1. **P1-1 — Trade-Tiles einfärben** (Home.tsx, ~10 LOC). Verändert den ersten Eindruck der Section dramatisch und kostet 5 Minuten.
2. **P1-2 — `useInView` + `.landing-fade-in` aktivieren** (~30 LOC im Hook + 1 Wrapping-Komponente, dann ~10 Sections wrappen). Dieser eine Fix bringt am meisten „selber Marke"-Eindruck.
3. **P1-3 — `LvAnalyseLeadMagnet` Section ergänzen** (~70 LOC, kopiert aus Original LandingPage.tsx:1763-1847, nur Texte ans Service-Geschäft anpassen). Das ist eine Lead-Engine-Sektion, die im Service-Verkauf *zwingender* ist als im Tool-Verkauf — die Lücke ist objektiv vorhanden.

Plus die zwei trivialen P1-Schönheitsfehler:
- **P1-5** `rounded-[2.5rem]` → `rounded-3xl` (1 Zeile)
- **P2-10** `to-emerald-700` → `to-kalku-green` (1 Zeile)

**Geschätzter Aufwand insgesamt:** 1–2 Stunden.

### Oder ist die aktuelle Fidelity ausreichend für einen Boss-Approval-Roundtrip?

**Bedingt ja — aber:** Wenn der Boss ein Auge fürs Detail hat (und das ist anzunehmen, sonst gäbe es dieses Review nicht), wird die *fehlende Animation* sofort auffallen — das Original „atmet" beim Scrollen, die neue Seite steht. Ich würde **P1-2 und P1-3 zwingend vor dem ersten Boss-Roundtrip machen**, P1-1 und die P1-Trivials gehen mit. Dann ist die Fidelity sauber bei **8.5/10** und das Feedback wird sich auf Inhalte (Texte, Konditionen-Zahlen, Foto) konzentrieren statt auf Markendetails.

**Go-Empfehlung mit einem Sprint Pre-Launch-Polish:** GO.

---

## Anhang — Top-Verbesserungen gegenüber dem Original

Die neue Seite ist an folgenden Stellen **besser** als das Anfragetool V1, das sollte explizit gewürdigt werden:

1. **Token-Hygiene** (`kalku-blue` raus, ungenutzte `kalku.orange/red/purple` weiterhin im Config aber dokumentierbar entfernbar).
2. **Inter wirklich geladen** (Phase-1-Dossier hatte das als kritischen Fix markiert — erledigt).
3. **Eine kanonische Nav + ein kanonischer Footer** statt der zwei divergierenden Versionen im Original.
4. **`@layer components`-Helpers vollständig** (`btn`, `card`, `input`, `section`, `container-page`, `eyebrow`) — dokumentiertes Design-System statt inline-Tailwind überall.
5. **3-spaltige Sticky-Mobile-CTA** mit Anrufen/WhatsApp/Termin — service-relevanter als die 1-spaltige Original-Variante.
6. **Trade-Color-Safelist im tailwind.config.js** — saubere Lösung für JIT-Sichtbarkeit.
7. **NavLink active-state** in Nav.tsx — Nuance, die im Original fehlt, weil das Original nur eine einzige Landing-Route bedient.
8. **FaqItem mit `scrollHeight`-Measurement** statt Hardcode-`'600px'` — sauberere Implementation.
9. **`focus-visible`-Outline + `::selection` in `index.css:15-20`** — A11y-Detail, das im Original fehlt.
10. **`font-feature-settings: 'cv02' …`** — aktiviert die Inter-spezifischen Glyphen-Varianten (alternative `1`, alternative `4`, etc.). Subtil, aber typografisch korrekt.

Die neue Seite ist nicht „eine schlechtere Kopie" — sie ist eine **konsolidierte, aufgeräumte zweite Marken-Iteration**. Das Risiko ist nur, dass der Cleanup zu weit ging (fehlende Animation, fehlender Lead-Magnet) und die Marke dadurch *ruhiger / statischer* wirkt als sie wirken sollte.
