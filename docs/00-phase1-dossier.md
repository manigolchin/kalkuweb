# Phase 1 — Dossier & Strategie-Empfehlung

> **Stand:** 14. Mai 2026
> **Status:** Phase 1 (Discovery & Research) abgeschlossen. Wartet auf Boss-Freigabe für Phase 2.
> **Quellen:** [01-design-tokens.md](./01-design-tokens.md), [02-component-inventory.md](./02-component-inventory.md), [03-content-audit-ugur.md](./03-content-audit-ugur.md), [04-competitor-research.md](./04-competitor-research.md), [05-seo-keywords.md](./05-seo-keywords.md)

---

## 1. Stack & Tooling — Empfehlung

| Bereich | Empfehlung | Begründung |
|---|---|---|
| Frontend | **Vite 7 + React 19 + TypeScript + Tailwind CSS 3.4 + lucide-react** | Identischer Stack wie das Anfragetool → Design-Fidelity ohne Reibung; volles Component-Inventar (26 Sektionen) ist 1:1 portierbar |
| Routing | **React Router 7** | Wie im Anfragetool; alternativ Astro/Next nur, wenn SSR/SEO-Argumente überwiegen — Tailwind-Tokens würden gleichbleiben |
| Hosting | **Eigener Container hinter Traefik** auf 91.98.185.113 (gleicher Server) | Subdomain `kalku.de` & `www.kalku.de`, eigenes docker-compose, getrennt von preisanfrage.kalkus.de |
| Forms | **Pipedrive API** (Leads + Deals) — Boss hat Key | Smart-BCC bleibt parallel als Fallback |
| Analytics | **Plausible** (cookieless, EU-gehostet) | DSGVO ohne Banner-Friction |
| Cookie-Consent | **Klaro!** (DE-OSS, Plausible-konform) | nur falls Drittanbieter dazukommen |

⚠️ **Wichtige Erkenntnis aus dem Style-Audit:** Im Anfragetool wird `Inter` als Font referenziert, aber **nirgends geladen** — derzeit fällt alles auf System-Sans zurück. Im Rewrite **muss** Inter via `@fontsource/inter` (oder Google self-hosted) korrekt geladen werden, sonst wirken die identischen Tailwind-Klassen subtil anders.

---

## 2. Design-System (Verdichtung der 626-Zeilen-Tokens-Doc)

**Mentales Modell:** weiße Seite + ein tiefes Petrol-Blau (`#1a5276`) als Brand + ein selbstbewusstes Grün (`#27ae60`) als CTA. Pastel-Tints pro Gewerk. Cards mit `rounded-xl/2xl` und sehr soften Shadows.

**Drei nicht-verhandelbare Regeln für Phase 3:**
1. **CTA = `kalku-green`. Brand = `primary-500`.** Jeder „Kostenlos testen"-Button ist grün, jeder Logo-Akzent blau. Einzige Ausnahme: hervorgehobene Pricing-Karte hat einen blauen Button.
2. **Radius-Skala ist strikt:** Buttons → `rounded-lg`, Inputs → `rounded-xl`, große Section-Cards → `rounded-2xl`, Garantie → `rounded-3xl`. Keine Zwischenwerte.
3. **Trade-Color-Quintett pro Gewerk:** `bg-X-50, bg-X-100, text-X-600, text-X-700, border-X-200`. Mapping: GaLaBau = emerald, Elektro = yellow, Haustechnik = orange, Tiefbau = sky, Leitungsbau = teal, Schadstoff = red, Fenster = blue.

**13 Inkonsistenzen aus dem Anfragetool, die wir im Rewrite bereinigen** — vollständige Liste in [01-design-tokens.md §13](./01-design-tokens.md). Die wichtigsten:
- Inter wird referenziert, aber nicht geladen → fixen.
- `kalku-blue == primary-500` (Duplikat) → `kalku-blue` rauswerfen.
- `kalku-orange/red/purple` deklariert, aber nirgends benutzt → entfernen oder konsequent einsetzen.
- LandingShell und LandingPage tragen **zwei** divergierende Footer-Designs und **zwei** Navs → eine kanonische Version festlegen.

**Komponenten-Inventar:** 26 Sektionen sind dokumentiert mit Tailwind-Fingerprint, Anatomie, Varianten, Interaktion, Source-Linerange. Phase 3 portiert 1:1 in eine `<components/>`-Library.

---

## 3. Content-Strategie (aus Ugur-Audit)

**Behalten — die Säulen, die KALKU als Marke trägt:**
1. **Vier-Teams-Erzählung** (Kalkulation / Einkauf / Vergabe / Recherche) — der zentrale USP. Stark, erzählerisch, von keinem Konkurrenten kopiert.
2. **Preistransparenz** (200–600 € Einzel, 3.000 € / 5.000 € Monatspakete + 5/3,9/2,9 % Erfolgsprovision) — *einzigartig in der Branche*, siehe Konkurrenzanalyse.
3. **Loyalität & Gebietsschutz** als Garantie — starkes Differenzierungs-Argument.
4. **„Über Nacht / am Wochenende"-Versprechen** für kurzfristige Submissionen — sofort glaubhaft.
5. **Mindestvoraussetzungen-Filter** (3 MA / 6 Mon / 3 Ref) — schafft Vertrauen statt Friction.
6. **„4 häufige Irrtümer"** als FAQ-Hook.

**Rauswerfen / komplett umschreiben:**
- **Du/Sie-Wechsel** → konsequent „Sie" (B2B, GF mittelständische Bau).
- **Doppelte CTAs** („Erstgespräch" + „Abstimmungstermin" + „Konditionen ansehen" nebeneinander) → ein primärer CTA pro Section.
- **/gaeb-konverter/ und /kalkulator/ sind leere Platzhalter** — wir bauen die echten Tools (siehe §6).
- **Slider-Hero mit rotierenden Gewerken** → eine klare Kernaussage, Gewerke darunter als Karten-Grid.
- **Anker-Sprünge** (`#leistungen`, `#team`) → eigene URLs für SEO + Klarheit.
- **AGB fehlen komplett** → Pflicht für ein Dienstleistungsangebot mit Erfolgsprovision/Loyalitätsklausel.
- **Datenschutzerklärung** ist lückenhaft (~60 %), kein Cookie-Banner trotz Google Analytics-Erwähnung → komplett neu.

---

## 4. Wettbewerbs-Position

**Nur 2 echte Bedrohungen:**
1. **Aufmaßtechnik Deutschland** — direktester Konkurrent. Logo-Wall mit Hochtief, Porr, Züblin, Köster, Leonhard Weiss. Aber: **reiner Hochbau-Fokus**. KALKU bedient GaLaBau/Tiefbau/Hochbau/Elektro/Haustechnik/Fenster/Schadstoff — niemand hat dieses Spektrum als Service.
2. **Cosuno** — KI-Procurement-Marktplatz, aber andere Marktseite (GU schreibt an Subs aus). KALKU bedient den Sub. Wenn KALKU AI-Procurement pusht, schwimmen wir in deren Marketing-Schatten — wir müssen klar abgrenzen.

**Acht Hebel, mit denen KALKU den Markt schlägt** — vollständig in [04-competitor-research.md](./04-competitor-research.md) §„Wo KALKU schlagen kann". Die 4 wichtigsten:

1. **Hybrid-USP: managed Service + KI-Procurement-Tool.** Niemand bietet beides. Aufmaßtechnik = 100 % Service. Cosuno/Cathago = 100 % Tool. KALKU = beides aus einer Hand.
2. **Trade-Mix-Story.** 7 Gewerke in einem Outsourcer — einzigartig.
3. **Pricing-Transparenz.** Außer Hasenbein (59 €/Monat) und Sirados versteckt **jeder** Konkurrent seine Preise. Eine sichtbare Preisspanne ist sofortiger Konversions-Vorteil.
4. **Konkrete Hero-Stat.** Calcora gewinnt mit „80 % schneller", Cosuno mit „5,7 % Baukostenersparnis". Aufmaßtechnik DE und Rohbauabrechnung haben *keine* Zahl im Hero. KALKU braucht eine eigene — Vorschlag: **„LV in 48 h bepreist statt 14 Tage intern"** oder **„Submission morgen? Wir schaffen es."**.

---

## 5. SEO-Strategie (Verdichtung von 685 Zeilen)

**Wichtigste Erkenntnis:** Der Markt ist Software-dominiert (Nevaris, RIB, Hero, Capmo, Sirados). Outsourcing-Service-Content ist **freie Fläche**. Einziger sichtbarer Pure-Play-Wettbewerber: [calculon.de](https://www.calculon.de) (Berlin). In Saarland/RLP/Hessen **kein sichtbarer Konkurrent**.

**Top-5 Money-Keywords**, in Reihenfolge der Erreichbarkeit:

| Keyword | Realistisch in | Warum |
|---|---|---|
| GaLaBau Kalkulation Dienstleister | 3–4 Mon Top-3 | SERP komplett Software, kein Service-Match. Story für alle 7 Gewerke replizierbar. |
| Baukalkulation Saarbrücken / Kalkulationsbüro Saarland | 60–90 Tage Top-3 lokal | Local Pack frei. GBP + 30 Bewertungen + 10 NAP-konsistente Verzeichnisse. |
| Baukalkulation outsourcen / extern erstellen lassen | 4–6 Mon Top-3 | aufmasstechnik-deutschland.de ist die Latte; mit FAQ-Schema + Case-Studies schlagbar. |
| Baukalkulation Dienstleister | 6–9 Mon Top-5 | calculon.de ist Berlin, kein Saarland-Bezug. |
| GAEB Konverter kostenlos | 6–12 Mon Top-3 | Größter Tool-Traffic-Hebel, aber teures Browser-Tool nötig. Trojanisches Pferd zur Zielgruppe. |

**Strategischer Hook fürs Q1-Content:** **„Wenn der eigene Kalkulator fehlt"** — adressiert direkt den DIHK-Fachkräftereport (59 % Bauunternehmen mit Stellenbesetzungsproblemen, 391.000 fehlende Fachkräfte).

---

## 6. Tool-Strategie (Free-Tools als Lead-Magnete)

### 6.1 GAEB-Konverter
- **Stufe 1 (anonym, kostenlos forever):** Browser-Upload `.x83/.x84/.d83/.d84/.p83` → schöne PDF (LV-Druckansicht) + Excel-Export. Komplett client-seitig, **null** Backend-Kosten.
- **Stufe 2 (gegen E-Mail-Pflicht):** „Premium-Auswertung kostenlos per Mail" → AI-Klassifizierung der Positionen (Gewerk, Material, Hersteller-Detection). Ruft Anthropic API. Rate-Limit: 3 Files/24h pro IP, optional Captcha bei >2.
- Code-Basis: Parser aus [app/utils/gaeb_parser.py](../../kalku-procurement/.claude/worktrees/zealous-margulis-04ce6d/app/utils/gaeb_parser.py) ins neue Repo migrieren oder als Service-Aufruf zum Procurement-Backend.

### 6.2 Einfaches Kalkulationstool
- **Vorschlag:** Position-Kalkulator. Lohn (€/h) × Zeit (h) + Material (€) + Zuschlag (%) → **EP** + GP bei Mengeneingabe. Tabellen-Format (10 Positionen), Live-Summe, Export als PDF/Excel.
- Komplett im Browser, **null** Backend.
- Premium-Auswertung gegen Email: „Sie zeigen uns Ihre Positionen — wir senden Ihnen einen Marktvergleich basierend auf 50.000+ realen Kalkulationen aus 7 Gewerken." → echter Lead, echtes Service-Erlebnis.
- Style-Vorlage: [/Users/admin/projects/bauki/kalku-ki/](file:///Users/admin/projects/bauki/kalku-ki/) — Vite + React + Tailwind, aber alle Komponenten **neu in unserem Design-System** bauen (siehe §2).

---

## 7. Sitemap-Empfehlung für Phase 2

```
/                       Hero + USP + Vier-Teams + Trust-Stat + CTA
/leistungen/            Übersicht Leistungen (alle 7 Gewerke)
  /galabau/             Gewerk-Landingpage (eigener H1, eigenes FAQ, eigener Case)
  /tiefbau/
  /hochbau/
  /elektro/
  /haustechnik/
  /fenster/
  /schadstoff/
/ablauf/                Wie läuft eine Zusammenarbeit ab? (5 Schritte + FAQ)
/konditionen/           Pricing transparent (Einzel + M + L + Erfolgsprovision)
/ueber-uns/             Inhaber + Team + Standort Saarbrücken + Werte
/referenzen/            Anonymisierte Cases mit harten Zahlen
/tools/
  /gaeb-konverter/      Browser-Tool + AI-Premium-Variante
  /kalkulator/          Position-Kalkulator + Marktvergleich-Lead-Magnet
/blog/                  Pain-driven Content („Wenn der Kalkulator fehlt", „EFB 221 erklärt")
/kontakt/               Termin-Picker + Telefon + WhatsApp + Mehrstufen-Form
/karriere/              optional, später
/impressum/
/datenschutz/
/agb/                   neu — fehlt komplett auf Ugur-Seite
```

Conversion-Pfad: **jede Seite** muss zu einem von zwei Zielen führen — „Erstgespräch vereinbaren" (primär) oder „Tool nutzen" (Lead-Magnet, sekundär).

---

## 8. Offene Entscheidungen für Phase 2

Diese Punkte braucht Phase 2 als Input:

1. **Trade-Fokus** — soll die neue Seite auch private Bauherren ansprechen, oder rein B2B (GU/Bauunternehmen) wie bisher?
2. **Pricing-Transparenz** — übernehmen wir die Preise aus Ugur (200–600 € Einzel, 3.000 / 5.000 € Pakete + 5/3,9/2,9 % Erfolgsprovision) **wörtlich**, oder gibt's neue Konditionen?
3. **Inhaber-Story** — Alaatdin Coksari als Gesicht der Marke prominent (Foto, Vita, Statement) oder weiter im Hintergrund? Empfehlung: **prominent**, weil Wettbewerber kein Gesicht zeigen.
4. **Referenz-Logos** — welche Bauunternehmen-Kunden dürfen wir nennen / als Logo zeigen? Falls keine Freigaben: anonymisierte Cases („Tiefbauunternehmen aus dem Saarland, 12 MA, 2025: 14 Submissions, 4 Zuschläge, ⌀ 280 k € Auftragsvolumen") sind besser als gar nichts und schlagen sogar Logo-Walls von Konzernen.
5. **Termin-Picker** — Cal.com (OSS, self-hosted möglich) oder Calendly? Oder bleibt's beim Mehrstufen-Formular?
6. **Hero-Zahl** — welche Zahl trägt den Hero? Vorschläge:
   - „LV in 48 h bepreist"
   - „Submission morgen? Wir schaffen es."
   - „7 Gewerke, ein Kalkulationsteam"
   - Konkrete Stat aus Pipedrive/CRM falls vorhanden („XYZ Submissionen 2025 betreut, 23 % Zuschlagsquote")
7. **Umzug der bestehenden kalku.de WordPress-Seite** — neue Subdomain `neu.kalku.de` während Bauphase, dann Cutover auf `kalku.de` mit 301-Redirects? Oder direkt überschreiben?

---

## 9. Phase-2-Plan (zur Freigabe)

Wenn freigegeben, läuft Phase 2 als **drei parallele Agents** + meine Synthese:

- **Agent IA-1 (Sitemap & URL-Struktur):** Finale Sitemap inkl. SEO-URL-Slugs, Internal-Linking-Plan, OG/Schema.org-Strategie pro Seitentyp.
- **Agent IA-2 (Wireframes pro Seitentyp):** ASCII/Markdown-Wireframes für Home, Gewerk-Landingpage (Template), Konditionen, Tools, Blog-Post, Kontakt — mit klaren Conversion-Hooks pro Section.
- **Agent IA-3 (Conversion-Pfade & Form-Strategie):** Pipedrive-Integration (Lead vs. Deal), Multi-Step-Form-Flow, WhatsApp-Tap-to-Chat, exit-intent, sticky-CTA-Logik mobil.

Output: ein einziges `06-phase2-plan.md` zur Freigabe — gleicher Gate-Mechanismus wie jetzt.

**Geschätzte Dauer Phase 2:** ~30–45 Minuten Agent-Laufzeit + meine Synthese.
