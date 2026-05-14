# Phase 2 — Plan & Decision-Log (Zusammenfassung)

> **Stand:** 14. Mai 2026
> **Status:** Phase 2 abgeschlossen. Ich gehe weiter zu Phase 3 (Build), wenn keine Einrede kommt.
> **Detail-Docs:** [06a-sitemap-urls.md](./06a-sitemap-urls.md) (1.334 Zeilen), [06b-wireframes.md](./06b-wireframes.md) (1.813 Zeilen), [06c-conversion-pipedrive.md](./06c-conversion-pipedrive.md) (828 Zeilen).

---

## 1. Sitemap (final, 21 Routes für Phase 3)

```
/
/leistungen/
  /leistungen/galabau/   /tiefbau/   /hochbau/   /elektro/
  /leistungen/haustechnik/   /fenster/   /schadstoff/
/ablauf/
/konditionen/
/ueber-uns/
/referenzen/   /referenzen/[slug]/
/tools/
  /tools/gaeb-konverter/
  /tools/kalkulator/
/blog/   /blog/[slug]/
/kontakt/
/impressum/   /datenschutz/   /agb/
```

Phase-2.5-reservierte Slugs (für später, **nicht** Phase 3): `/baukalkulation-outsourcen/` (SEO-Pillar), `/wissen/` (Knowledge Hub), `/standorte/` (Local SEO), `/ki-bau/` (AI-Pitch).

**URL-Konvention:** Trailing-Slash JA, lowercase-only, Bindestriche, Umlaute → Digraphen (`ueber-uns` statt `über-uns`).

---

## 2. Rendering-Empfehlung

**Stack:** Vite + React 19 + TS + Tailwind 3.4 + lucide-react + **`vite-react-ssg`** für statisches Pre-Rendering aller 21 Routes (außer Tool-Routen, die hydratisieren client-seitig).

**Begründung:** Bleibt im Vite-Stack, React 19 supported, LCP < 2.0 s erreichbar ohne Astro/Next-Migration. Migration zu Astro nur wenn Blog später ≥ 30 Posts wird.

---

## 3. Schema.org Strategie

13 vollständige JSON-LD-Skeletons sind in [06a §4](./06a-sitemap-urls.md) — copy-paste-fertig für Phase 3. Globaler `@graph` (Organization + ProfessionalService + WebSite) auf jeder Seite, additive Per-Page-Schemas (Service, FAQPage, Article, WebApplication, BreadcrumbList).

NAP-Daten: **Berliner Promenade 15, 66111 Saarbrücken · +49 681 41096430 · info@kalku.de · USt-ID DE334890692 · Geo 49.2362, 6.9913**.

---

## 4. Wireframe-Output (11 Seiten + 4 Querschnitte)

69 Block-Spezifikationen total. Top-3-wiederverwendete Komponenten aus dem V1-Inventar:
- **#17 Lead-magnet CTA hero** — 8× als Final-CTA + Email-Capture
- **#19 FAQ** — 7× mit Such+Accordion-Pattern
- **#9 Case studies** — 5× mit Trade-Color-Variant

**Neue Komponenten** für Tools/Blog/Referenzen, die in Phase 3 gebaut werden:
- `<DropZone>` + `<ParseResultTable>` (GAEB-Konverter, client-seitig)
- `<CalcTable>` (Position-Kalkulator mit Live-Berechnung + PDF/Excel-Export)
- `<ArticleLayout>` mit Sticky-TOC + Inline-CTA + verwandte Artikel
- `<LVPreviewCard>`, `<VerticalTimeline>`, `<CalEmbed>`, `<BlogSidebar>`, Filter-Pills

Mobile-Verhalten ist in jedem der 69 Blöcke spezifiziert.

---

## 5. Conversion- & Form-Strategie

### Pipedrive-Pipeline (6 Stages)
„Qualified Lead" → „Erstgespräch geplant" → „Probe-Kalkulation" → „Konditionen verschickt" → „Aktiver Kunde" + „Verloren" (10 Lost-Reasons enumeriert).

### Webhook
**Asynchron** (eigene DB als Source of Truth + Retry-Queue). Form akzeptiert sofort, Pipedrive-Push im Hintergrund — robuster gegen Pipedrive-Ausfälle.

### 7 Form-Typen
1. **Mehrstufen-Erstgespräch** (3 Schritte, vom Ugur-Audit übernommen, durchgängig „Sie") — Hauptfunnel
2. **Self-Check Eligibility** (4 Ja/Nein-Fragen) — Vor-Filter; bei Disqualifikation Tool-Empfehlung statt Form
3. **GAEB-Konverter Premium-Capture** (E-Mail only)
4. **Position-Kalkulator Capture** (E-Mail + „Berechnung mitnehmen"-Checkbox)
5. **Newsletter-Subscribe** (≤ 1×/Monat, Empfehlung: Listmonk OSS)
6. **Kontakt-Kurz-Form** (Anliegen-Routing zu Pipelines)
7. **Cal.com-Embed** (3 Event-Typen, HMAC-validierter Webhook)

### Spam-Schutz
3-Layer (Honeypot überall, Rate-Limit, Cloudflare Turnstile **nur** auf Tool-Forms — Hauptform bleibt friction-arm).

### Cookie-Banner
**KEIN Banner zum Launch** (Plausible cookie-less, Cal.com self-hosted, Turnstile managed-mode). Klaro!-Trigger nur falls externe Tools dazukommen.

### Tracking
16 Plausible-Goals enumeriert (form_submit_erstgespraech, gaeb_upload, calendar_booked, …). UTM-Konvention pro Channel.

---

## 6. Sub-Decisions die ich für Phase 3 selbst getroffen habe

| Punkt | Entscheidung | Begründung |
|---|---|---|
| Fonts | Inter Variable WOFF2 self-hosted via `@fontsource-variable/inter` | Anfragetool referenziert Inter, lädt es aber nicht — wir laden sauber, kein FOUT |
| Newsletter-Tool | Listmonk OSS, self-hosted auf gleichem Server | Boss-Setup ist Self-Hosting-fokussiert; Listmonk ist einzige seriöse OSS-Option |
| Spam | Cloudflare Turnstile (Managed-Mode, cookie-less) auf Tool-Forms | DSGVO-konformer als reCAPTCHA, kein Cookie, kostenlos |
| Termin-Picker | Cal.com self-hosted (nicht Cal.com Cloud) | DSGVO + kein Drittanbieter-Cookie + kostenlos |
| A/B-Test-Tool | GrowthBook OSS (Phase 5+) | OSS, self-hosted-fähig, REST-/JS-SDK passt zu Vite |
| Cutover | `neu.kalku.de` während Bauphase, dann Cutover mit 301 von WordPress-URLs | Bestätigt vom Boss in Phase 1 Decision #7 |

---

## 7. Eine Sache, die der Boss vor Phase 3 wissen muss

**WhatsApp-Business-API Risk:** Die WhatsApp-Nummer +49 1516 7671877 (aus dem Ugur-Audit) ist `wa.me`-Tap-to-Chat-tauglich, aber **nicht** Business-API. Eingehende Chats landen nur im persönlichen WhatsApp und **nicht im Pipedrive**.

**Optionen:**
- **(a) Tap-to-Chat-only behalten** (gratis, blind im CRM) — empfohlen für jetzt
- **(b) Business-API-Provider** (360dialog/Twilio/MessageBird), 2–4 Wochen Setup + monatliche Kosten

Ich gehe für Phase 3 mit **(a)**. Falls Boss (b) will, ist das ein nachgelagerter 2-Tage-Job nach Launch.

---

## 8. Phase-3-Plan (was als nächstes passiert)

**Gesamt-Aufwand:** vermutlich 4–8 Stunden Agent-Laufzeit, abhängig von Komplexität und Iteration. Ich arbeite in 4 Sub-Phasen mit Status-Updates dazwischen:

### 3.1 — Scaffold + Design-System (~30 Min)
- `npm create vite@latest`, TypeScript-Strict, Tailwind 3.4 mit übernommener Config aus Anfragetool
- Tokens, CSS-Layers, `vite-react-ssg`-Setup
- Inter Variable laden
- Dockerfile + docker-compose.prod.yml für Cutover auf Hetzner-Server

### 3.2 — Komponenten-Library (~60–90 Min)
Portierung der 26 Inventar-Komponenten + die 8 neuen Komponenten aus den Wireframes. Storybook **nicht** — wir validieren in echten Pages.

### 3.3 — Pages bauen (~2–3 Std)
Reihenfolge:
1. Home (priorität 1)
2. Konditionen + Über uns + Ablauf (priorität 1, gemeinsam)
3. Gewerk-Landingpage Template + 7 Instanzen (priorität 2)
4. Referenzen + Kontakt (priorität 2)
5. Blog-Listing + Blog-Post-Template (priorität 3)
6. Pflicht-Pages (Impressum/Datenschutz/AGB)

### 3.4 — Tools + Forms + Backend (~90 Min)
- GAEB-Konverter mit GAEB-Parser-Migration ins neue Repo
- Position-Kalkulator
- Form-Backend (Express oder FastAPI? — entscheide ich nach Stack-Compatibility-Check)
- Pipedrive-Webhook + Retry-Queue
- Cal.com-Self-Hosting-Setup oder Embed
- Cloudflare Turnstile Integration

### Nach Phase 3
Status-Update, dann Phase 4 (3 Reviewer-Agents) + Phase 5 (QA + Deploy).

---

## Wenn keine Einrede kommt, starte ich Phase 3.1 jetzt.
