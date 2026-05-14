# 06a — Sitemap, URL-Architektur & On-Page-SEO

> **Stand:** 14. Mai 2026
> **Status:** Phase-2-Liefergegenstand IA-1. Direkte Vorlage für Phase-3-Implementierung.
> **Quellen:** [00-phase1-dossier.md](./00-phase1-dossier.md), [03-content-audit-ugur.md](./03-content-audit-ugur.md), [04-competitor-research.md](./04-competitor-research.md), [05-seo-keywords.md](./05-seo-keywords.md)

---

## Inhaltsverzeichnis

1. [Finale Sitemap (Tree mit SEO-Mapping)](#1-finale-sitemap)
2. [URL-Slug-Konventionen](#2-url-slug-konventionen)
3. [Internal-Linking-Plan (Hub-and-Spoke)](#3-internal-linking-plan)
4. [Schema.org JSON-LD pro Seitentyp](#4-schemaorg-json-ld)
5. [Open-Graph & Twitter-Card-Strategie](#5-open-graph--twitter-cards)
6. [robots.txt + sitemap.xml](#6-robotstxt--sitemapxml)
7. [301-Redirect-Plan (WordPress → Vite)](#7-301-redirect-plan)
8. [Hreflang & Canonical](#8-hreflang--canonical)
9. [Performance & Rendering-Strategie](#9-performance--rendering)
10. [Summary (Top-3 Decisions, Top-3 Risiken)](#summary)

---

## 1. Finale Sitemap

Konventionen für die Tree-Notation:
- **URL** = relativer Pfad (Domain `https://kalku.de` immer impliziert)
- **Title** = `<title>`-Tag, ≤ 60 Zeichen, immer mit Suffix " | KALKU" wo Platz
- **Meta** = `<meta name="description">`, 150–160 Zeichen, mit Hauptkeyword + USP + impliziter CTA
- **H1** = einzige `<h1>` der Seite
- **MK** = primäres Money-Keyword aus [05-seo-keywords.md](./05-seo-keywords.md)
- **SK** = sekundäre Keywords (sollten in H2/H3, Body, Anker-Texten auftauchen)

```
/
├── Title: KALKU — Baukalkulation als Service für Bauunternehmen | Saarbrücken
├── Meta:  Externe Baukalkulation für Bauunternehmen ab 3 MA. 7 Gewerke, LV in 48 h bepreist, Marktpreise binnen 24 h. Standort Saarbrücken, bundesweit. Erstgespräch buchen.
├── H1:    Baukalkulation als Service — wenn der eigene Kalkulator fehlt
├── MK:    Baukalkulation Dienstleister
├── SK:    Kalkulation outsourcen Bau, externer Kalkulator Bau, Bauunternehmen Angebot kalkulieren lassen, Kalkulationsbüro Saarland
│
├── /leistungen/
│   ├── Title: Leistungen — Baukalkulation für 7 Gewerke | KALKU
│   ├── Meta:  GaLaBau, Tiefbau, Hochbau, Elektro, Haustechnik, Fenster, Schadstoff. Wir kalkulieren LVs, fertigen Marktpreis-Anfragen, befüllen EFB-Formblätter. Übersicht aller Leistungen.
│   ├── H1:    Leistungen — Baukalkulation für sieben Gewerke aus einer Hand
│   ├── MK:    Baukalkulation Dienstleister
│   └── SK:    Kalkulationsservice Bau, LV ausfüllen lassen, Mengenermittlung Dienstleister
│
│   ├── /leistungen/galabau/
│   │   ├── Title: GaLaBau-Kalkulation — LV in 48 h bepreist | KALKU
│   │   ├── Meta:  GaLaBau-Kalkulation als Dienstleister: LV-Bepreisung in 48 h, Lieferantenanfragen für Pflanzen, Erdbau, Pflaster. Saarland · RLP · bundesweit. Erstgespräch.
│   │   ├── H1:    GaLaBau-Kalkulation Dienstleister — LV-Bepreisung in 48 Stunden
│   │   ├── MK:    GaLaBau Kalkulation Dienstleister
│   │   └── SK:    GaLaBau Angebot erstellen, GaLaBau LV-Kalkulation, GaLaBau Submission Saarland
│   │
│   ├── /leistungen/tiefbau/
│   │   ├── Title: Tiefbau-Kalkulation als Service — Submission & EFB | KALKU
│   │   ├── Meta:  Tiefbau-Kalkulation outsourcen: EP-Kalkulation, Pfahlgründung, Schüttgüter, EFB-Formblätter. Submission morgen? Wir schaffen es. Erstgespräch buchen.
│   │   ├── H1:    Tiefbau-Kalkulation Dienstleister — Submission-Vorbereitung in 48 h
│   │   ├── MK:    Tiefbau Kalkulation
│   │   └── SK:    Tiefbau Submission Vorbereitung, Tiefbau Angebot kalkulieren, Pfahlgründung Kalkulation
│   │
│   ├── /leistungen/hochbau/
│   │   ├── Title: Hochbau- & Stahlbeton-Kalkulation Dienstleister | KALKU
│   │   ├── Meta:  Hochbau-LV-Kalkulation extern erstellen lassen: Stahlbeton, Schalung, Bewehrung, Sauberkeitsschicht. Marktpreise in 24 h. Saarland, RLP, Hessen, bundesweit.
│   │   ├── H1:    Hochbau- und Stahlbeton-Kalkulation als externer Service
│   │   ├── MK:    Hochbau LV-Kalkulation
│   │   └── SK:    Stahlbeton Kalkulation Angebot, Hochbau Kalkulation, Rohbau Kalkulation extern
│   │
│   ├── /leistungen/elektro/
│   │   ├── Title: Elektro-Kalkulation Dienstleister — KFE, Submission, EFB | KALKU
│   │   ├── Meta:  Elektroinstallation kalkulieren lassen: BMA, EMA, Beleuchtung, Datennetz, Schaltanlagen. KFE-Erfahrung, EFB 221/222/223 inklusive. Erstgespräch in 24 h.
│   │   ├── H1:    Elektro-Kalkulation Dienstleister — von BMA bis Schaltanlage
│   │   ├── MK:    Elektroinstallation Angebot kalkulieren
│   │   └── SK:    Elektro LV kalkulieren, Elektro Kalkulation Submission, KFE Kalkulation Hilfe
│   │
│   ├── /leistungen/haustechnik/
│   │   ├── Title: TGA- & Haustechnik-Kalkulation Dienstleister | KALKU
│   │   ├── Meta:  HLS-/TGA-Kalkulation als Service: Sanitär, Heizung, Lüftung, Klima, Kälte. LV bepreist, Lieferantenanfragen, EFB-Formblätter. Erstgespräch buchen.
│   │   ├── H1:    Haustechnik- & TGA-Kalkulation Dienstleister
│   │   ├── MK:    HLS Kalkulation
│   │   └── SK:    TGA Kalkulation Dienstleister, Sanitär Heizung Kalkulation, Haustechnik Kalkulation Subunternehmer
│   │
│   ├── /leistungen/fenster/
│   │   ├── Title: Fensterbau-Kalkulation als Service | KALKU
│   │   ├── Meta:  Fensterbau-Kalkulation outsourcen: Hersteller-Detection im LV, Marktpreise binnen 24 h, Klaes-/msFaktura-Erfahrung. Erstgespräch buchen.
│   │   ├── H1:    Fensterbau-Kalkulation Dienstleister
│   │   ├── MK:    Fensterbau Kalkulation
│   │   └── SK:    Fenster Angebot kalkulieren, Fenster Submission, Fensterbau LV
│   │
│   └── /leistungen/schadstoff/
│       ├── Title: Schadstoffsanierung — Angebot kalkulieren lassen | KALKU
│       ├── Meta:  Asbest, KMF, HBCD, Rückbau: Kalkulation inkl. AVV-Klassifizierung & Entsorgungsmengen. Submission-fertige LVs in 48 h. Erstgespräch buchen.
│       ├── H1:    Schadstoffsanierung & Rückbau — Kalkulation als Dienstleister
│       ├── MK:    Schadstoffsanierung Angebot kalkulieren
│       └── SK:    Asbest KMF Kalkulation Angebot, Rückbau Abbruch Kalkulation, AVV-Mengen Kalkulation
│
├── /ablauf/
│   ├── Title: Ablauf einer externen Kalkulation in 7 Tagen | KALKU
│   ├── Meta:  Wie läuft eine externe Baukalkulation ab? Schritt 1 GAEB hochladen, Schritt 7 Submission abgeben. Inkl. Checkliste, FAQ, Notfall-Express in 24 h.
│   ├── H1:    Ablauf — wie eine externe Kalkulation in 7 Tagen funktioniert
│   ├── MK:    Kalkulation auslagern Ablauf
│   └── SK:    Baukalkulation Ablauf, Submission Vorbereitung extern, externer Kalkulator Bau Ablauf
│
├── /konditionen/
│   ├── Title: Konditionen — Preise für externe Baukalkulation | KALKU
│   ├── Meta:  200–600 € für Einzel-LVs, 3.000 € / 5.000 € Monatspakete + 2,9–5 % Erfolgsprovision. Transparent gelistet, ohne Vertragsbindung. Loyalitäts-Garantie inklusive.
│   ├── H1:    Konditionen — was externe Baukalkulation bei KALKU kostet
│   ├── MK:    Baukalkulation Kosten
│   └── SK:    Kalkulation outsourcen Preis, externer Kalkulator Stundensatz, Baukalkulation Pauschalpreis
│
├── /ueber-uns/
│   ├── Title: Über uns — Inhaber, Team & Standort Saarbrücken | KALKU
│   ├── Meta:  Alaatdin Coksari und das KALKU-Team in Saarbrücken: vier spezialisierte Crews für Kalkulation, Einkauf, Vergabe, Recherche. Mittelstand für Mittelstand.
│   ├── H1:    Über KALKU — vier Teams, ein Auftrag: Ihre Submission gewinnen
│   ├── MK:    Kalkulationsbüro Saarbrücken
│   └── SK:    Baukalkulation Saarland, Kalkulationsdienstleister Saarbrücken, KALKU Inhaber
│
├── /referenzen/
│   ├── Title: Referenzen — Cases aus 7 Gewerken, anonymisiert | KALKU
│   ├── Meta:  Echte Bauprojekte, anonymisiert: 14 Submissions in 8 Wochen, 23 % Zuschlagsquote, ⌀ 280 k € Auftragsvolumen. Cases nach Gewerk gefiltert.
│   ├── H1:    Referenzen — was wir für Bauunternehmen erreicht haben
│   ├── MK:    Baukalkulation Referenzen
│   └── SK:    Bauunternehmen Submission Erfolg, Kalkulationsdienstleister Erfahrung
│
├── /referenzen/[slug]/
│   ├── Title: {Case-Titel} — Referenz | KALKU
│   ├── Meta:  {1-Satz-Case-Summary}: Gewerk, Auftragsvolumen, Zuschlag, Bearbeitungszeit. Anonymisierte Detailbeschreibung.
│   ├── H1:    {Case-Titel}
│   ├── MK:    {gewerk}-Kalkulation Case Study
│   └── SK:    {gewerk} Submission gewonnen, {gewerk} Angebot kalkulieren, Bauunternehmen Erfahrung
│
├── /tools/
│   ├── Title: Tools — kostenlose GAEB- & Kalkulations-Helfer | KALKU
│   ├── Meta:  Kostenlose Browser-Tools für Bauunternehmen: GAEB-Konverter (X83/X84/D83), Position-Kalkulator. Ohne Login, ohne Datenupload zu Drittanbietern.
│   ├── H1:    Tools für Kalkulatoren — kostenlos, ohne Login
│   ├── MK:    Kalkulationstool Bau kostenlos
│   └── SK:    GAEB Tool, Bau-Excel Vorlagen kostenlos, Kalkulator Online
│
│   ├── /tools/gaeb-konverter/
│   │   ├── Title: GAEB-Konverter kostenlos online — X83, X84, D83 öffnen | KALKU
│   │   ├── Meta:  GAEB-Datei (.x83 .x84 .d83 .d84 .p83) im Browser öffnen, in Excel oder PDF konvertieren. Kostenlos, ohne Login, läuft lokal — keine Datei verlässt Ihren Rechner.
│   │   ├── H1:    GAEB-Konverter kostenlos — X83, X84, D83 in Excel & PDF
│   │   ├── MK:    GAEB Konverter kostenlos
│   │   └── SK:    GAEB Datei öffnen, X83 Datei öffnen, GAEB in Excel, GAEB Datei kann nicht öffnen
│   │
│   └── /tools/kalkulator/
│       ├── Title: Position-Kalkulator — EP & GP berechnen online | KALKU
│       ├── Meta:  EP- und GP-Kalkulation online: Lohn, Material, Zuschlag eingeben — Excel/PDF exportieren. Kostenlos, browser-basiert. Premium-Marktvergleich gratis per Mail.
│       ├── H1:    Position-Kalkulator — EP & GP in 30 Sekunden berechnen
│       ├── MK:    Stundenverrechnungssatz Rechner Bau
│       └── SK:    EP-Aufgliederung Excel Vorlage, Bau Kostenrechner online, Kalkulationstool Bau kostenlos
│
├── /blog/
│   ├── Title: Blog — Wissen rund um Baukalkulation, GAEB & VOB/A | KALKU
│   ├── Meta:  Pain-driven Content für Kalkulatoren: GAEB-Tipps, EFB-Formblätter, VOB/A-Bieterleitfaden, Submissions-Hacks. Aus der Praxis für die Praxis.
│   ├── H1:    Blog — was Kalkulatoren 2026 wissen müssen
│   ├── MK:    Baukalkulation Blog
│   └── SK:    GAEB Tipps, EFB-Formblätter erklärt, VOB/A Bieter
│
├── /blog/[slug]/
│   ├── Title: {Post-Titel} | KALKU Blog
│   ├── Meta:  {Custom je Artikel, 150–160 Zeichen, mit Long-Tail-Keyword}
│   ├── H1:    {Post-Titel}
│   ├── MK:    {Long-Tail aus Keyword-Cluster}
│   └── SK:    {2–4 verwandte Long-Tails}
│
├── /kontakt/
│   ├── Title: Kontakt — Erstgespräch buchen oder anrufen | KALKU
│   ├── Meta:  Termin in 24 h, Anruf 0681-41096430 oder Cal.com-Kalender. Saarbrücken, Berliner Promenade 15. Mehrstufiges Anfrage-Formular für Express-Kalkulationen.
│   ├── H1:    Kontakt — Erstgespräch in 24 Stunden
│   ├── MK:    Kalkulationsbüro Saarbrücken Kontakt
│   └── SK:    Baukalkulation Anfrage, Submission Vorbereitung extern Kontakt
│
├── /impressum/
│   ├── Title: Impressum | KALKU Baukalkulationen GmbH
│   ├── Meta:  Anbieterkennzeichnung gemäß § 5 TMG: KALKU Baukalkulationen GmbH, Berliner Promenade 15, 66111 Saarbrücken, USt-ID DE334890692.
│   ├── H1:    Impressum
│   ├── MK:    (kein SEO-Ziel — Pflichtseite)
│   └── SK:    KALKU Impressum
│
├── /datenschutz/
│   ├── Title: Datenschutzerklärung | KALKU
│   ├── Meta:  Wie KALKU Baukalkulationen GmbH personenbezogene Daten verarbeitet — DSGVO-konform, ohne Drittanbieter-Tracking. Cookieless mit Plausible.
│   ├── H1:    Datenschutzerklärung
│   ├── MK:    (kein SEO-Ziel — Pflichtseite)
│   └── SK:    KALKU Datenschutz, DSGVO Baukalkulation
│
└── /agb/
    ├── Title: Allgemeine Geschäftsbedingungen | KALKU
    ├── Meta:  AGB für Kalkulationsdienstleistungen der KALKU Baukalkulationen GmbH — Leistungen, Preise, Erfolgsprovision, Loyalitätsregelung, Gerichtsstand Saarbrücken.
    ├── H1:    Allgemeine Geschäftsbedingungen
    ├── MK:    (kein SEO-Ziel — Pflichtseite)
    └── SK:    KALKU AGB
```

### Phase 2.5 — geplante Ergänzungen (für 30/60/90-Tage-Plan aus 05-seo-keywords.md)

Diese Routen sind in Phase 3 noch **nicht** zwingend live, müssen aber im Routing-Setup bereits als „reserviert" eingeplant werden:

```
/baukalkulation-outsourcen/   Pillar — Money-Keyword Hauptseite (Cluster 1)
/wissen/                      Hub für VOB/A, EFB, VgV, Submissionsleitfäden (Cluster 4 + 5)
/wissen/[slug]/               Glossar/Leitfaden-Artikel (z. B. /wissen/efb-221-erklaert/)
/standorte/                   Hub für Local-SEO-Pages (Cluster 6)
/standorte/saarbruecken/      Pflicht-Page für Local Pack
/standorte/trier/             ab Tag 60
/standorte/kaiserslautern/    ab Tag 60
/standorte/saarlouis/         ab Tag 90
/standorte/mainz/             ab Tag 90
/standorte/frankfurt/         ab Tag 90
/standorte/neunkirchen/       ab Tag 90
/ki-bau/                      Pillar Cluster 7
```

**Begründung:** Routing-Tabelle in `App.tsx` einmal komplett anlegen, statt später Migrationen zu machen, die Redirects brauchen. Die Routen können in Phase 3 zunächst auf eine 503/„kommt bald"-Komponente zeigen oder per Feature-Flag verborgen sein.

---

## 2. URL-Slug-Konventionen

| Regel | Festlegung | Begründung |
|---|---|---|
| **Trailing Slash** | **JA**, alle Pages mit `/` am Ende. Ausnahme: Datei-Endpoints (`/sitemap.xml`, `/robots.txt`). | Konsistente Verzeichnis-Semantik; klare Unterscheidung Page vs. File; Redirect 301 von `/path` → `/path/` zentral in Edge/Traefik. WordPress-Default war ebenfalls trailing-slash → keine massiven 301-Ketten. |
| **Case** | **lowercase only**. | Case-Sensitivity unter Linux/macOS-Servern war historisch ein Bug-Magnet. Lowercase ist Norm bei `de`-TLDs. |
| **Trennzeichen** | **Bindestrich (`-`)**, niemals Unterstrich. | Google behandelt `-` als Wortgrenze, `_` als Wortverbinder ([Google Webmaster-Richtlinien](https://developers.google.com/search/docs/crawling-indexing/url-structure)). |
| **Umlaute** | **Auflösen in Digraphen** (`ä → ae`, `ö → oe`, `ü → ue`, `ß → ss`). Beispiel: `/datenschutz/` (kein `/datenschutzerklaerung/` weil Markenkürze siegt), `/ueber-uns/` (statt `/über-uns/`). | Punycode-URLs in Browsern wirken unprofessionell; bei Mail-Versand/Copy-Paste regelmäßig kaputt; SEO-neutral bei Digraphen. Empfehlung folgt Praxis von [calculon.de](https://www.calculon.de/) und [aufmasstechnik-deutschland.de](https://aufmasstechnik-deutschland.de/). |
| **Tiefe** | **max. 3 Segmente** (`/leistungen/galabau/`, `/blog/[slug]/`). Nie 4+. | Tiefere URLs kosten Crawl-Budget und Click-Equity. |
| **Stopwörter** | **erlaubt** wenn semantisch (`/baukalkulation-outsourcen/`, `/wenn-der-kalkulator-fehlt/`). | Long-Tail-Match in URL ist Ranking-Signal, schlägt Kürze. |
| **Datums-Slugs (Blog)** | **NEIN** — kein `/blog/2026/05/...`. Slug = Topic. | Evergreen-Content; Datum im `<time>`-Element + Schema. Erleichtert Refresh ohne URL-Change. |
| **Sprache** | **Deutsch**. URLs nicht englisch (`/services/` → `/leistungen/`). | Zielgruppe sucht deutsch; EN-URLs senken CTR in deutschen SERPs. |
| **Plural vs. Singular** | **Plural** für Hubs (`/leistungen/`, `/referenzen/`, `/standorte/`, `/tools/`), **Singular** für Detail-Routes (`/blog/[slug]/`, `/standorte/saarbruecken/`). | Folgt menschlichem Sprachgefühl + semantischer Hierarchie. |
| **Anker statt Subpage** | NICHT verwenden — alte Site nutzte `/#leistungen`, neue Site jeder Inhaltsblock = eigene URL. | Anker sind nicht indexierbar als eigene Pages, kein Title/Meta möglich, Bounce-Tracking unmöglich. |

**Reservierte Top-Level-Slugs** (nicht für künftige Inhalte verwenden — kollidieren mit System-Routen):
`/api/`, `/admin/`, `/preview/`, `/static/`, `/assets/`, `/og-images/`, `/sitemap.xml`, `/sitemap-*.xml`, `/robots.txt`, `/favicon.ico`, `/site.webmanifest`.

---

## 3. Internal-Linking-Plan

### 3.1 Hub-and-Spoke-Topologie

| Rolle | Pages | Zweck |
|---|---|---|
| **Power-Pillar** (sammeln Link-Equity, Money-Keywords) | `/`, `/baukalkulation-outsourcen/` (Phase 2.5), `/leistungen/` | Hauptziel jeder Conversion. Eingehende Links aus jeder Spoke-Page. |
| **Service-Spokes** (verteilen Equity, Long-Tail-Keywords) | `/leistungen/galabau/` … `/leistungen/schadstoff/` (7 Pages) | Verteilen interne Links auf Tool-Pages, Wissen-Pages und Pillar zurück. |
| **Trust-Pages** (verkaufen Vertrauen, weniger SEO-Gewicht) | `/ueber-uns/`, `/referenzen/`, `/konditionen/`, `/ablauf/` | Kreuzlinken sich gegenseitig; werden aus Service-Spokes verlinkt. |
| **Lead-Magnete** (verteilen Brand, ziehen externe Backlinks) | `/tools/gaeb-konverter/`, `/tools/kalkulator/` | Sticky-CTA zurück zu `/leistungen/` und `/baukalkulation-outsourcen/`. |
| **Authority-Hubs** (Phase 2.5+) | `/blog/`, `/wissen/` | Sammeln Long-Tail-Traffic, leiten in Pillar weiter. |
| **Local-Hubs** (Phase 2.5+) | `/standorte/saarbruecken/` … | Für Local-Pack-Sichtbarkeit; verlinken in Service-Spokes. |
| **Pflichtseiten** (rechtlich, kein SEO) | `/impressum/`, `/datenschutz/`, `/agb/`, `/kontakt/` | Footer-only. Werden NICHT von Service-Pages verlinkt. |

### 3.2 Outgoing-Link-Plan pro Page (3–5 wichtigste Anker)

| Source-Page | Anchor-Text | Ziel-URL | Rationale |
|---|---|---|---|
| `/` | „Alle 7 Gewerke ansehen" | `/leistungen/` | Hauptpfad für Service-Picker |
| `/` | „GAEB-Datei kostenlos öffnen" | `/tools/gaeb-konverter/` | Lead-Magnet für anonyme Visitor |
| `/` | „Konditionen ansehen" | `/konditionen/` | Pricing-Transparenz USP |
| `/` | „Erstgespräch buchen" | `/kontakt/` | Primärer CTA |
| `/` | „So läuft die Zusammenarbeit ab" | `/ablauf/` | Vertrauen für Erstkontakte |
| `/leistungen/` | „GaLaBau-Kalkulation" | `/leistungen/galabau/` | Alle 7 Spoke-Links als Karten |
| `/leistungen/` | (× 6 weitere Gewerke) | `/leistungen/{trade}/` | s.o. |
| `/leistungen/` | „Konditionen aller Pakete" | `/konditionen/` | Cross-Sell |
| `/leistungen/galabau/` | „Hochbau-Kalkulation auch nötig?" | `/leistungen/hochbau/` | Cross-Linking benachbarter Gewerke |
| `/leistungen/galabau/` | „Tiefbau-Anteile mit kalkulieren" | `/leistungen/tiefbau/` | s.o. — GaLaBau & Tiefbau überlappen |
| `/leistungen/galabau/` | „GaLaBau-Submissionen Saarland 2026" | `/blog/galabau-submissionen-saarland-2026/` | Wissen → Service-Funnel |
| `/leistungen/galabau/` | „GAEB-Datei vorab prüfen" | `/tools/gaeb-konverter/` | Tool im Service-Kontext |
| `/leistungen/galabau/` | „Erstgespräch zu GaLaBau-Projekt" | `/kontakt/?gewerk=galabau` | Primärer CTA mit Pre-Fill |
| `/leistungen/tiefbau/` | „Stahlbeton-Anteile?" | `/leistungen/hochbau/` | Tiefbau ↔ Hochbau überlappen |
| `/leistungen/tiefbau/` | „Schadstoff-Anteile (Asbest, KMF)?" | `/leistungen/schadstoff/` | Abbruch ↔ Schadstoff |
| `/leistungen/elektro/` | „TGA-Anteile mit kalkulieren" | `/leistungen/haustechnik/` | Elektro ↔ Haustechnik bei TGA-Projekten |
| `/leistungen/elektro/` | „Schaltanlagen-LV als GAEB" | `/tools/gaeb-konverter/` | Tool |
| `/leistungen/haustechnik/` | „Elektro-Anteile" | `/leistungen/elektro/` | Cross |
| `/leistungen/hochbau/` | „Tiefbau-Anteile" | `/leistungen/tiefbau/` | Cross |
| `/leistungen/hochbau/` | „Schadstoffsanierung vor Rohbau?" | `/leistungen/schadstoff/` | Cross |
| `/leistungen/schadstoff/` | „Anschlussgewerke Tiefbau" | `/leistungen/tiefbau/` | Cross |
| `/ablauf/` | „Welche Gewerke wir machen" | `/leistungen/` | Conversion-Funnel |
| `/ablauf/` | „Konditionen für Einzel-LVs" | `/konditionen/` | Cross |
| `/ablauf/` | „Express in 24 h — Termin" | `/kontakt/` | CTA |
| `/konditionen/` | „Leistungen pro Gewerk" | `/leistungen/` | Cross |
| `/konditionen/` | „Erstgespräch — unverbindlich" | `/kontakt/` | CTA |
| `/konditionen/` | „Wie wir arbeiten" | `/ablauf/` | Vertrauen |
| `/ueber-uns/` | „Standort Saarbrücken" | `/standorte/saarbruecken/` (Phase 2.5) | Local |
| `/ueber-uns/` | „Unsere Gewerke" | `/leistungen/` | Cross |
| `/ueber-uns/` | „Echte Cases" | `/referenzen/` | Trust |
| `/referenzen/` | „GaLaBau-Cases ansehen" | `/leistungen/galabau/#cases` | Trade-spezifisch |
| `/referenzen/` | „Konditionen" | `/konditionen/` | Cross |
| `/referenzen/[slug]/` | „Mehr {Gewerk}-Cases" | `/leistungen/{trade}/#cases` | Funnel |
| `/referenzen/[slug]/` | „Selbst Erstgespräch buchen" | `/kontakt/` | CTA |
| `/tools/` | „GAEB-Konverter" | `/tools/gaeb-konverter/` | Hub |
| `/tools/` | „Position-Kalkulator" | `/tools/kalkulator/` | Hub |
| `/tools/` | „Lieber gar nicht selbst kalkulieren?" | `/leistungen/` | Conversion-Bridge |
| `/tools/gaeb-konverter/` | „Komplette LV bepreisen lassen" | `/leistungen/` | Sticky-Banner-CTA |
| `/tools/gaeb-konverter/` | „Was sind X83/X84/D83?" | `/blog/x83-x84-d83-d84-unterschied/` (Phase 2.5) | Wissen-Funnel |
| `/tools/gaeb-konverter/` | „Submission morgen — wir helfen" | `/kontakt/` | Notfall-CTA |
| `/tools/kalkulator/` | „Marktvergleich anfordern" | `/kontakt/?source=kalkulator` | Lead-CTA |
| `/tools/kalkulator/` | „Komplette LV-Kalkulation" | `/leistungen/` | Funnel |
| `/blog/` | „Kategorie GAEB" | `/blog/?cat=gaeb` (Filter, kein eigener URL) | Discovery |
| `/blog/[slug]/` | „Verwandter Artikel" | `/blog/[slug2]/` (3 Suggestions) | Stickiness |
| `/blog/[slug]/` | „Service: {Gewerk}-Kalkulation" | `/leistungen/{trade}/` | Conversion |
| `/blog/[slug]/` | „Kostenloses Tool: GAEB-Konverter" | `/tools/gaeb-konverter/` | Cross |
| `/kontakt/` | „Wie läuft das ab?" | `/ablauf/` | Vertrauen vor CTA |
| `/kontakt/` | „Was kostet das?" | `/konditionen/` | Vertrauen vor CTA |
| Footer (alle Pages) | „Impressum", „Datenschutz", „AGB", „Kontakt" | `/impressum/`, `/datenschutz/`, `/agb/`, `/kontakt/` | Pflicht |

### 3.3 Anchor-Text-Diversität

- **Pillar-Page** soll mit verschiedenen Anchor-Texten verlinkt werden, nicht nur einem ("Baukalkulation outsourcen", "Externe Baukalkulation", "Kalkulation auslagern", "Kalkulator extern beauftragen"). Verhindert Over-Optimization-Penalty.
- **Service-Spokes**: 60 % Exact-Match ("GaLaBau-Kalkulation"), 30 % Branded ("KALKU für GaLaBau"), 10 % Generic ("hier mehr").
- **Tools**: Anchor immer mit Action + Format ("GAEB-Datei öffnen", "X83 in Excel"), nicht nur "GAEB-Konverter".

### 3.4 Footer-Sitemap (auf jeder Page)

```
Spalte 1 — Leistungen:    GaLaBau · Tiefbau · Hochbau · Elektro · Haustechnik · Fenster · Schadstoff
Spalte 2 — Unternehmen:   Über uns · Ablauf · Konditionen · Referenzen · Kontakt
Spalte 3 — Tools:         GAEB-Konverter · Position-Kalkulator · Blog
Spalte 4 — Rechtliches:   Impressum · Datenschutz · AGB
```

---

## 4. Schema.org JSON-LD

> Alle JSON-LD-Blöcke gehören in den `<head>` als `<script type="application/ld+json">`. Bei mehreren Schemas pro Page entweder mehrere Script-Blöcke ODER ein einzelner mit `@graph`-Array. Empfehlung: **`@graph`-Array**, einfachere Wartung.
>
> **Phase-3-Implementierung:** Generator-Funktionen in `src/seo/jsonld.ts`, pro Seitentyp eine Funktion mit Variablen. Helmet/`react-helmet-async` rendert ins HTML.
>
> Validate mit [Rich Results Test](https://search.google.com/test/rich-results) und [Schema.org Validator](https://validator.schema.org/) vor jedem Release.

### 4.1 Globale Schemas (in `_layout` oder Helmet aller Pages)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://kalku.de/#organization",
      "name": "KALKU Baukalkulationen GmbH",
      "alternateName": "KALKU",
      "url": "https://kalku.de/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://kalku.de/logo.png",
        "width": 600,
        "height": 200
      },
      "description": "Externe Baukalkulation als Service für mittelständische Bauunternehmen. Sieben Gewerke, Standort Saarbrücken, bundesweit tätig.",
      "foundingDate": "2024-01-01",
      "founder": {
        "@type": "Person",
        "@id": "https://kalku.de/ueber-uns/#alaatdin-coksari",
        "name": "Alaatdin Coksari",
        "jobTitle": "Geschäftsführer"
      },
      "vatID": "DE334890692",
      "contactPoint": [{
        "@type": "ContactPoint",
        "telephone": "+49-681-41096430",
        "email": "info@kalku.de",
        "contactType": "customer service",
        "areaServed": "DE",
        "availableLanguage": ["German"]
      }],
      "sameAs": [
        "https://www.linkedin.com/company/kalku/",
        "https://www.provenexpert.com/de-de/kalku/"
      ]
    },
    {
      "@type": "ProfessionalService",
      "@id": "https://kalku.de/#localbusiness",
      "name": "KALKU Baukalkulationen Saarbrücken",
      "image": "https://kalku.de/og-images/standort-saarbruecken.png",
      "logo": "https://kalku.de/logo.png",
      "url": "https://kalku.de/",
      "telephone": "+49-681-41096430",
      "email": "info@kalku.de",
      "priceRange": "200 € – 5.000 €",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Berliner Promenade 15",
        "postalCode": "66111",
        "addressLocality": "Saarbrücken",
        "addressRegion": "SL",
        "addressCountry": "DE"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 49.2362,
        "longitude": 6.9913
      },
      "openingHoursSpecification": [{
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "18:00"
      }],
      "areaServed": [
        { "@type": "State", "name": "Saarland" },
        { "@type": "State", "name": "Rheinland-Pfalz" },
        { "@type": "State", "name": "Hessen" },
        { "@type": "Country", "name": "Deutschland" }
      ],
      "serviceArea": {
        "@type": "GeoCircle",
        "geoMidpoint": { "@type": "GeoCoordinates", "latitude": 49.2362, "longitude": 6.9913 },
        "geoRadius": "300000"
      },
      "knowsAbout": [
        "Baukalkulation",
        "GAEB",
        "EFB-Preisformblätter",
        "VOB/A",
        "Submission",
        "GaLaBau-Kalkulation",
        "Tiefbau-Kalkulation",
        "Hochbau-Kalkulation",
        "Elektro-Kalkulation",
        "TGA-Kalkulation",
        "Fensterbau-Kalkulation",
        "Schadstoffsanierung-Kalkulation"
      ],
      "parentOrganization": { "@id": "https://kalku.de/#organization" }
    },
    {
      "@type": "WebSite",
      "@id": "https://kalku.de/#website",
      "url": "https://kalku.de/",
      "name": "KALKU",
      "publisher": { "@id": "https://kalku.de/#organization" },
      "inLanguage": "de-DE",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://kalku.de/blog/?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
```

### 4.2 Homepage (`/`) — zusätzlich zum Globalen

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://kalku.de/#webpage",
  "url": "https://kalku.de/",
  "name": "KALKU — Baukalkulation als Service für Bauunternehmen",
  "description": "Externe Baukalkulation für Bauunternehmen ab 3 MA. 7 Gewerke, LV in 48 h bepreist, Marktpreise binnen 24 h. Standort Saarbrücken, bundesweit.",
  "isPartOf": { "@id": "https://kalku.de/#website" },
  "about": { "@id": "https://kalku.de/#organization" },
  "primaryImageOfPage": {
    "@type": "ImageObject",
    "url": "https://kalku.de/og-images/home.png",
    "width": 1200,
    "height": 630
  },
  "inLanguage": "de-DE"
}
```

### 4.3 Gewerk-Landingpage (`/leistungen/{trade}/`)

Variable: `{{trade_label}}` z. B. „GaLaBau", „Tiefbau". `{{trade_slug}}` z. B. „galabau".

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://kalku.de/leistungen/{{trade_slug}}/#service",
      "name": "{{trade_label}}-Kalkulation als Dienstleister",
      "serviceType": "{{trade_label}}-Kalkulation",
      "category": "Baukalkulation",
      "description": "Externe Kalkulation von {{trade_label}}-Leistungsverzeichnissen für Bauunternehmen. LV-Bepreisung in 48 h, Lieferantenanfragen, EFB-Preisformblätter.",
      "provider": { "@id": "https://kalku.de/#organization" },
      "areaServed": [
        { "@type": "Country", "name": "Deutschland" },
        { "@type": "State", "name": "Saarland" },
        { "@type": "State", "name": "Rheinland-Pfalz" },
        { "@type": "State", "name": "Hessen" }
      ],
      "audience": {
        "@type": "BusinessAudience",
        "audienceType": "Bauunternehmen, Generalunternehmer, Handwerksbetriebe ab 3 Mitarbeiter"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "{{trade_label}}-Kalkulationsleistungen",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Angebotskalkulation nach LV" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Lieferantenanfragen / Marktpreis-Recherche" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "EFB-Preis-Formblätter 221, 222, 223" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Mengenermittlung & Aufmaß-Prüfung" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Submissions-Vorbereitung" } }
        ]
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://kalku.de/leistungen/{{trade_slug}}/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Wie schnell wird ein {{trade_label}}-LV bepreist?",
          "acceptedAnswer": { "@type": "Answer", "text": "{{Custom-Antwort, ~150 Wörter}}" }
        },
        {
          "@type": "Question",
          "name": "Welche Unterlagen brauchen Sie für eine {{trade_label}}-Kalkulation?",
          "acceptedAnswer": { "@type": "Answer", "text": "{{Custom-Antwort}}" }
        },
        {
          "@type": "Question",
          "name": "Was kostet eine externe {{trade_label}}-Kalkulation?",
          "acceptedAnswer": { "@type": "Answer", "text": "{{Custom-Antwort, mit Verweis auf /konditionen/}}" }
        }
      ]
    }
  ]
}
```

### 4.4 Konditionen (`/konditionen/`) — mit Pricing

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://kalku.de/konditionen/#service",
      "name": "Baukalkulation Service-Pakete",
      "provider": { "@id": "https://kalku.de/#organization" },
      "offers": [
        {
          "@type": "Offer",
          "name": "Einzel-Kalkulation",
          "description": "Einzelne LV-Kalkulation pro Submission",
          "priceSpecification": {
            "@type": "PriceSpecification",
            "minPrice": "200",
            "maxPrice": "600",
            "priceCurrency": "EUR",
            "valueAddedTaxIncluded": false
          },
          "eligibleQuantity": { "@type": "QuantitativeValue", "value": 1, "unitText": "LV" }
        },
        {
          "@type": "Offer",
          "name": "Paket M — Monatsabo",
          "description": "Bis zu vier Submissionen pro Monat, plus 3,9 % Erfolgsprovision auf Zuschläge",
          "priceSpecification": {
            "@type": "PriceSpecification",
            "price": "3000",
            "priceCurrency": "EUR",
            "valueAddedTaxIncluded": false,
            "billingDuration": "P1M"
          }
        },
        {
          "@type": "Offer",
          "name": "Paket L — Monatsabo",
          "description": "Unbegrenzte Submissionen pro Monat, plus 2,9 % Erfolgsprovision auf Zuschläge",
          "priceSpecification": {
            "@type": "PriceSpecification",
            "price": "5000",
            "priceCurrency": "EUR",
            "valueAddedTaxIncluded": false,
            "billingDuration": "P1M"
          }
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://kalku.de/konditionen/#faq",
      "mainEntity": [
        { "@type": "Question", "name": "Gibt es eine Mindestlaufzeit?", "acceptedAnswer": { "@type": "Answer", "text": "{{Antwort}}" } },
        { "@type": "Question", "name": "Was zählt als Erfolgsprovision-Zuschlag?", "acceptedAnswer": { "@type": "Answer", "text": "{{Antwort}}" } },
        { "@type": "Question", "name": "Was bedeutet die Loyalitäts-Garantie?", "acceptedAnswer": { "@type": "Answer", "text": "{{Antwort}}" } }
      ]
    }
  ]
}
```

### 4.5 Über uns (`/ueber-uns/`)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://kalku.de/ueber-uns/#aboutpage",
      "url": "https://kalku.de/ueber-uns/",
      "name": "Über KALKU — Inhaber, Team & Standort Saarbrücken",
      "about": { "@id": "https://kalku.de/#organization" },
      "mainEntity": { "@id": "https://kalku.de/ueber-uns/#alaatdin-coksari" },
      "inLanguage": "de-DE"
    },
    {
      "@type": "Person",
      "@id": "https://kalku.de/ueber-uns/#alaatdin-coksari",
      "name": "Alaatdin Coksari",
      "jobTitle": "Geschäftsführer KALKU Baukalkulationen GmbH",
      "image": "https://kalku.de/team/alaatdin-coksari.jpg",
      "worksFor": { "@id": "https://kalku.de/#organization" },
      "url": "https://kalku.de/ueber-uns/",
      "sameAs": [
        "https://www.linkedin.com/in/alaatdin-coksari/"
      ]
    }
  ]
}
```

### 4.6 Referenzen-Hub (`/referenzen/`)

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": "https://kalku.de/referenzen/#itemlist",
  "name": "KALKU Referenzen — anonymisierte Cases",
  "numberOfItems": "{{count}}",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://kalku.de/referenzen/{{slug-1}}/",
      "name": "{{Case-Titel-1}}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "url": "https://kalku.de/referenzen/{{slug-2}}/",
      "name": "{{Case-Titel-2}}"
    }
  ]
}
```

### 4.7 Referenz-Detail (`/referenzen/[slug]/`)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://kalku.de/referenzen/{{slug}}/#article",
  "headline": "{{Case-Titel}}",
  "description": "{{Meta-Description}}",
  "image": "https://kalku.de/og-images/referenzen/{{slug}}.png",
  "author": { "@id": "https://kalku.de/#organization" },
  "publisher": {
    "@type": "Organization",
    "@id": "https://kalku.de/#organization",
    "logo": { "@type": "ImageObject", "url": "https://kalku.de/logo.png" }
  },
  "datePublished": "{{ISO-Datum}}",
  "dateModified": "{{ISO-Datum}}",
  "inLanguage": "de-DE",
  "mainEntityOfPage": "https://kalku.de/referenzen/{{slug}}/",
  "about": {
    "@type": "Service",
    "name": "{{Gewerk}}-Kalkulation"
  }
}
```

### 4.8 Tool-Pages (`/tools/gaeb-konverter/`, `/tools/kalkulator/`)

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://kalku.de/tools/gaeb-konverter/#webapp",
  "name": "GAEB-Konverter kostenlos",
  "alternateName": ["GAEB Online Konverter", "GAEB in Excel"],
  "url": "https://kalku.de/tools/gaeb-konverter/",
  "description": "Browser-basierter GAEB-Konverter: X83, X84, D83, D84, P83 öffnen und in Excel oder PDF exportieren. Datenschutz: läuft ausschließlich lokal im Browser.",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "ConstructionEstimating",
  "operatingSystem": "Any",
  "browserRequirements": "Requires JavaScript. Modern browser (Chrome 100+, Firefox 100+, Safari 15+, Edge 100+).",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR"
  },
  "creator": { "@id": "https://kalku.de/#organization" },
  "softwareVersion": "1.0",
  "inLanguage": "de-DE",
  "featureList": [
    "GAEB-Datei (X83, X84, D83, D84, P83) öffnen",
    "Export als Excel (.xlsx)",
    "Export als PDF",
    "100% browserseitig — keine Datei verlässt den Rechner"
  ]
}
```

Analog für `/tools/kalkulator/` mit `name: "Position-Kalkulator"`, `featureList: ["EP berechnen", "GP automatisch", "Excel-Export", ...]`.

### 4.9 Blog-Listing (`/blog/`)

```json
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://kalku.de/blog/#blog",
  "url": "https://kalku.de/blog/",
  "name": "KALKU Blog — Wissen rund um Baukalkulation",
  "description": "Pain-driven Content für Kalkulatoren in Bauunternehmen: GAEB, EFB, VOB/A, Submissions-Hacks, Fachkräftemangel.",
  "publisher": { "@id": "https://kalku.de/#organization" },
  "inLanguage": "de-DE"
}
```

### 4.10 Blog-Post (`/blog/[slug]/`)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://kalku.de/blog/{{slug}}/#article",
  "headline": "{{Post-Titel}}",
  "description": "{{Meta-Description}}",
  "image": [
    "https://kalku.de/og-images/blog/{{slug}}.png"
  ],
  "datePublished": "{{ISO-8601}}",
  "dateModified": "{{ISO-8601}}",
  "author": {
    "@type": "Person",
    "name": "{{Autor-Name}}",
    "url": "https://kalku.de/ueber-uns/#{{autor-slug}}"
  },
  "publisher": {
    "@type": "Organization",
    "@id": "https://kalku.de/#organization",
    "name": "KALKU Baukalkulationen GmbH",
    "logo": { "@type": "ImageObject", "url": "https://kalku.de/logo.png", "width": 600, "height": 200 }
  },
  "mainEntityOfPage": "https://kalku.de/blog/{{slug}}/",
  "inLanguage": "de-DE",
  "articleSection": "{{Cluster-Name z. B. GAEB-Tools}}",
  "keywords": "{{komma-getrennte-Keywords}}",
  "wordCount": "{{integer}}"
}
```

### 4.11 Kontakt (`/kontakt/`)

```json
{
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://kalku.de/kontakt/#contactpage",
  "url": "https://kalku.de/kontakt/",
  "name": "Kontakt — Erstgespräch in 24 Stunden",
  "about": { "@id": "https://kalku.de/#organization" },
  "mainEntity": {
    "@type": "ContactPoint",
    "telephone": "+49-681-41096430",
    "email": "info@kalku.de",
    "contactType": "customer service",
    "areaServed": "DE",
    "availableLanguage": ["German"],
    "hoursAvailable": [{
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "18:00"
    }]
  },
  "inLanguage": "de-DE"
}
```

### 4.12 BreadcrumbList (auf jeder Page außer `/`)

Beispiel für `/leistungen/galabau/`:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": "https://kalku.de/leistungen/galabau/#breadcrumb",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Start", "item": "https://kalku.de/" },
    { "@type": "ListItem", "position": 2, "name": "Leistungen", "item": "https://kalku.de/leistungen/" },
    { "@type": "ListItem", "position": 3, "name": "GaLaBau-Kalkulation", "item": "https://kalku.de/leistungen/galabau/" }
  ]
}
```

### 4.13 FAQ-Schema (überall wo FAQ-Abschnitt vorkommt)

Bereits in 4.3 (Gewerk-Pages) und 4.4 (Konditionen) integriert. Für `/ablauf/` zusätzlich:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://kalku.de/ablauf/#faq",
  "mainEntity": [
    { "@type": "Question", "name": "Was muss ich liefern, damit ihr loslegen könnt?", "acceptedAnswer": { "@type": "Answer", "text": "{{Antwort}}" } },
    { "@type": "Question", "name": "Wie lange dauert eine Erstanalyse?", "acceptedAnswer": { "@type": "Answer", "text": "{{Antwort}}" } },
    { "@type": "Question", "name": "Was, wenn die Submission morgen ist?", "acceptedAnswer": { "@type": "Answer", "text": "{{Antwort, mit Express-CTA}}" } },
    { "@type": "Question", "name": "Wer hat Zugriff auf unser LV?", "acceptedAnswer": { "@type": "Answer", "text": "{{Antwort, NDA-Hinweis}}" } }
  ]
}
```

---

## 5. Open-Graph & Twitter-Cards

### 5.1 Globale Defaults (in `_layout`)

```html
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="KALKU">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@kalku_bau">  <!-- nur falls Account aktiv -->
```

### 5.2 Per-Page Overrides

| URL | og:type | og:title | og:description | og:image | Naming-Convention |
|---|---|---|---|---|---|
| `/` | `website` | KALKU — Baukalkulation als Service | Externe Baukalkulation für Bauunternehmen ab 3 MA. 7 Gewerke, LV in 48 h bepreist. Standort Saarbrücken. | `/og-images/home.png` | hero+claim+logo, dark teal bg |
| `/leistungen/` | `website` | 7 Gewerke, ein Kalkulationsteam — Leistungen | GaLaBau, Tiefbau, Hochbau, Elektro, Haustechnik, Fenster, Schadstoff. Übersicht aller Leistungen. | `/og-images/leistungen.png` | 7 Gewerk-Icons im Grid |
| `/leistungen/{trade}/` | `website` | {Trade}-Kalkulation Dienstleister — KALKU | {Custom Description je Gewerk} | `/og-images/leistungen-{trade}.png` | Trade-Color-Hintergrund + Icon + USP |
| `/ablauf/` | `website` | So läuft eine externe Kalkulation in 7 Tagen | 7 Schritte vom GAEB-Upload bis zur Submission. Inkl. Express-Option. | `/og-images/ablauf.png` | 7-Schritte-Zeitleiste |
| `/konditionen/` | `website` | Konditionen — was externe Baukalkulation kostet | 200–600 € Einzel · 3.000 € / 5.000 € Pakete · 2,9–5 % Erfolgsprovision. | `/og-images/konditionen.png` | 3-Spalten-Pricing-Karten |
| `/ueber-uns/` | `profile` | Über uns — Team & Standort Saarbrücken | Vier Teams: Kalkulation, Einkauf, Vergabe, Recherche. Inhaber Alaatdin Coksari, Berliner Promenade. | `/og-images/ueber-uns.png` | Team-Foto oder Inhaber + Office |
| `/referenzen/` | `website` | Referenzen — Cases aus 7 Gewerken | Anonymisierte Bauprojekte: 14 Submissions in 8 Wochen, 23 % Zuschlagsquote. | `/og-images/referenzen.png` | Stat-Highlight + Logo-Wall (anonym) |
| `/referenzen/{slug}/` | `article` | {Case-Titel} | {Case-Description} | `/og-images/referenzen/{slug}.png` | Stat-Hero pro Case |
| `/tools/gaeb-konverter/` | `website` | GAEB-Konverter kostenlos online | X83, X84, D83 öffnen und in Excel exportieren. Browserseitig, ohne Datenupload. | `/og-images/gaeb-konverter.png` | Datei-Icon + „kostenlos" + „läuft lokal" |
| `/tools/kalkulator/` | `website` | Position-Kalkulator — EP & GP berechnen | Lohn × Zeit + Material + Zuschlag = EP. Browserseitig, kostenlos. | `/og-images/kalkulator.png` | Tabellen-Mock + Live-Summe-Anim |
| `/blog/` | `website` | KALKU Blog — Baukalkulation, GAEB, VOB/A | Pain-driven Content für Kalkulatoren in Bauunternehmen. | `/og-images/blog.png` | Stack-Cards mit Post-Titeln |
| `/blog/{slug}/` | `article` | {Post-Titel} | {Post-Meta} | `/og-images/blog/{slug}.png` | pro Post: Titel + Cluster-Tag |
| `/kontakt/` | `website` | Kontakt — Erstgespräch in 24 Stunden | Cal.com-Termin · 0681-41096430 · WhatsApp. Saarbrücken, Berliner Promenade 15. | `/og-images/kontakt.png` | Telefon-Icon + Cal.com-Mock |
| `/impressum/`, `/datenschutz/`, `/agb/` | `website` | {Page-Title} | {Page-Meta} | `/og-images/default.png` | Default mit KALKU-Logo & Claim |

### 5.3 OG-Image-Vorgaben (für Designer / Phase 3)

| Spec | Wert |
|---|---|
| Format | PNG (mit JPEG-Fallback bei > 200 KB) |
| Dimension | exakt 1200 × 630 px |
| Dateigrösse | < 200 KB (nutze [Squoosh](https://squoosh.app/) oder `oxipng`) |
| Safe-Area | Inneres Rechteck 1080 × 510 px (Twitter & WhatsApp croppen am Rand) |
| Typografie | Inter Bold 64–88 px für Headline, max. 3 Zeilen |
| Kontrast | min. 4.5:1 zwischen Text und Hintergrund |
| Farben | Brand-Tokens aus [01-design-tokens.md](./01-design-tokens.md): primary-500 (`#1a5276`), kalku-green (`#27ae60`), Trade-Color je Gewerk |
| Mandatory Elements | KALKU-Logo unten rechts (60 px Höhe) + Domain `kalku.de` als Footer-Text |
| Naming | `{slug-mit-bindestrich}.png` — z. B. `gaeb-konverter.png`, `leistungen-galabau.png` |
| Erzeugung | statisch im Build via `vite-plugin-og-image` ODER manuell in Figma/Canva, manuell 1× pro Page |

### 5.4 Open-Graph-Validierung

- Vor jedem Release: [opengraph.xyz](https://www.opengraph.xyz/), [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/), [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- Cache-Bust nach jedem Image-Update: `?v={timestamp}` an `og:image` URL anhängen, sobald sich Bild ändert

---

## 6. robots.txt + sitemap.xml

### 6.1 `/public/robots.txt`

```
# robots.txt — KALKU Baukalkulationen GmbH (kalku.de)
# Letzte Aktualisierung: Phase 3 Launch

User-agent: *
Allow: /

# Interne / technische Bereiche
Disallow: /api/
Disallow: /admin/
Disallow: /preview/
Disallow: /static/admin/

# Tracking-Parameter — verhindert Duplicate Content
Disallow: /*?utm_*
Disallow: /*?gclid=
Disallow: /*?fbclid=
Disallow: /*?msclkid=
Disallow: /*?source=

# Tool-interne API-Endpunkte (nur die User-Pages sollen ranken)
Disallow: /tools/gaeb-konverter/api/
Disallow: /tools/kalkulator/api/

# Suche (Blog), gefilterte Listen
Disallow: /blog/?q=
Disallow: /blog/?cat=
Disallow: /blog/?tag=

# Sonstige technische Pfade
Disallow: /*.json$
Disallow: /*.xml$
Allow: /sitemap.xml
Allow: /sitemap-pages.xml
Allow: /sitemap-blog.xml
Allow: /sitemap-standorte.xml

# AI-Crawler: bewusst NICHT blocken (Strategie: Sichtbarkeit in ChatGPT/Perplexity > Content-Schutz für B2B-Service)
# User-agent: GPTBot
# Allow: /
# User-agent: PerplexityBot
# Allow: /
# User-agent: ClaudeBot
# Allow: /

# Aggressive Scraper / Bad-Bots (optional, wenn beobachtet)
# User-agent: SemrushBot
# Crawl-delay: 10
# User-agent: AhrefsBot
# Crawl-delay: 10

Sitemap: https://kalku.de/sitemap.xml
```

### 6.2 `/public/sitemap.xml` — Sitemap-Index

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://kalku.de/sitemap-pages.xml</loc>
    <lastmod>2026-05-14</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://kalku.de/sitemap-blog.xml</loc>
    <lastmod>2026-05-14</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://kalku.de/sitemap-standorte.xml</loc>
    <lastmod>2026-05-14</lastmod>
  </sitemap>
</sitemapindex>
```

### 6.3 `/public/sitemap-pages.xml` — Statische Seiten

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kalku.de/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/galabau/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/tiefbau/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/hochbau/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/elektro/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/haustechnik/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/fenster/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/leistungen/schadstoff/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/ablauf/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://kalku.de/konditionen/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/ueber-uns/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://kalku.de/referenzen/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://kalku.de/tools/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://kalku.de/tools/gaeb-konverter/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kalku.de/tools/kalkulator/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://kalku.de/kontakt/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://kalku.de/impressum/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
  <url>
    <loc>https://kalku.de/datenschutz/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
  <url>
    <loc>https://kalku.de/agb/</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
```

### 6.4 `/sitemap-blog.xml` (dynamisch generiert im Build)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kalku.de/blog/</loc>
    <lastmod>{{neuestes Post-Datum}}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <!-- Pro Blog-Post: -->
  <url>
    <loc>https://kalku.de/blog/{{slug}}/</loc>
    <lastmod>{{post.dateModified}}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

**Generator (Phase 3):** `vite-plugin-sitemap` ODER eigenes Build-Script in `scripts/generate-sitemap.ts`, das nach Vite-Build läuft, alle MDX-Posts in `content/blog/` einliest und die XML schreibt.

### 6.5 `/sitemap-standorte.xml` (Phase 2.5+, vorerst leer-Skeleton)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Zunächst leer; ab Phase 2.5 mit /standorte/saarbruecken/ etc. befüllt -->
</urlset>
```

### 6.6 Submission

- **Google Search Console:** Sitemap unter `https://kalku.de/sitemap.xml` einreichen am Launch-Tag
- **Bing Webmaster Tools:** identisch
- **IndexNow:** für Bing/Yandex unmittelbares Pingen bei neuen Posts (`POST https://api.indexnow.org/indexnow` mit Key)

---

## 7. 301-Redirect-Plan

### 7.1 Annahmen über bestehende WordPress-URLs

Da die alte kalku.de auf Bricks Builder/WordPress läuft und das Content-Audit ([03-content-audit-ugur.md](./03-content-audit-ugur.md)) Ankerlinks wie `#leistungen`, `#team` erwähnt, gehe ich davon aus dass die meiste Information aktuell auf einer einzigen Long-Scroll-Page liegt (One-Pager-Stil) plus separate Tool-Stubs `/gaeb-konverter/` und `/kalkulator/`. Mögliche zusätzliche URLs aus typischer WP-Bricks-Struktur. **Ungesicherte Annahmen** sind explizit als „(angenommen)" markiert — vor Cutover via Screaming Frog Crawl der alten Seite verifizieren.

### 7.2 Redirect-Tabelle

| Alte URL (WordPress) | Neue URL (Vite) | Status | Notiz |
|---|---|---|---|
| `https://www.kalku.de/` | `https://kalku.de/` | 301 | Domain-Konsolidierung www → non-www |
| `https://kalku.de/?p=*` | `https://kalku.de/` | 301 | WP-Default-IDs |
| `https://kalku.de/index.php` | `https://kalku.de/` | 301 | WP-Legacy |
| `https://kalku.de/wp-admin/*` | `https://kalku.de/` | 301 | wp-admin schützen |
| `https://kalku.de/wp-content/*` | (lassen falls Bilder noch referenziert sind, sonst 410) | 301/410 | siehe Notes unten |
| `https://kalku.de/#leistungen` | `https://kalku.de/leistungen/` | client-side (Anker → Page-URL) | Hash-Redirects nicht serverseitig — JS-Snippet im neuen App-Root |
| `https://kalku.de/#team` | `https://kalku.de/ueber-uns/` | client-side | s.o. |
| `https://kalku.de/#preise` (angenommen) | `https://kalku.de/konditionen/` | client-side | s.o. |
| `https://kalku.de/#kontakt` | `https://kalku.de/kontakt/` | client-side | s.o. |
| `https://kalku.de/#galabau` (angenommen) | `https://kalku.de/leistungen/galabau/` | client-side | Pro Gewerk |
| `https://kalku.de/#tiefbau` (angenommen) | `https://kalku.de/leistungen/tiefbau/` | client-side | s.o. |
| `https://kalku.de/#hochbau` (angenommen) | `https://kalku.de/leistungen/hochbau/` | client-side | s.o. |
| `https://kalku.de/#elektro` (angenommen) | `https://kalku.de/leistungen/elektro/` | client-side | s.o. |
| `https://kalku.de/#haustechnik` (angenommen) | `https://kalku.de/leistungen/haustechnik/` | client-side | s.o. |
| `https://kalku.de/#fenster` (angenommen) | `https://kalku.de/leistungen/fenster/` | client-side | s.o. |
| `https://kalku.de/#schadstoff` (angenommen) | `https://kalku.de/leistungen/schadstoff/` | client-side | s.o. |
| `https://kalku.de/gaeb-konverter/` | `https://kalku.de/tools/gaeb-konverter/` | 301 | Pfad-Tieferlegung |
| `https://kalku.de/kalkulator/` | `https://kalku.de/tools/kalkulator/` | 301 | s.o. |
| `https://kalku.de/impressum/` | `https://kalku.de/impressum/` | KEINE Änderung | Pfad bleibt gleich |
| `https://kalku.de/datenschutz/` (angenommen) | `https://kalku.de/datenschutz/` | KEINE Änderung | Pfad bleibt gleich |
| `https://kalku.de/datenschutzerklaerung/` (Alternative) | `https://kalku.de/datenschutz/` | 301 | Falls WP diesen Slug nutzt |
| `https://kalku.de/feed/` | `https://kalku.de/blog/` | 301 | WP-RSS auf Blog-Hub |
| `https://kalku.de/feed/atom/` | `https://kalku.de/blog/` | 301 | s.o. |
| `https://kalku.de/category/*` | `https://kalku.de/blog/` | 301 | WP-Kategorien |
| `https://kalku.de/tag/*` | `https://kalku.de/blog/` | 301 | WP-Tags |
| `https://kalku.de/author/*` | `https://kalku.de/ueber-uns/` | 301 | WP-Autoren |
| `https://kalku.de/page/*` | `https://kalku.de/blog/` | 301 | WP-Paginierung |
| `https://kalku.de/wp-json/*` | (410 Gone) | 410 | API-Endpunkte abschalten |
| `https://kalku.de/xmlrpc.php` | (410 Gone) | 410 | Sicherheit |
| `https://kalku.de/wp-login.php` | (410 Gone) | 410 | Sicherheit |
| `https://kalku.de/?gewerk=galabau` (angenommen Bricks-Filter) | `https://kalku.de/leistungen/galabau/` | 301 | Falls vorhanden |

### 7.3 Implementierung in Traefik / Vite-Container

**Option A — Edge-Redirects in Traefik (empfohlen):**

```yaml
# kalku-website-redirects.yml — Traefik dynamic config
http:
  middlewares:
    kalku-www-to-naked:
      redirectRegex:
        regex: "^https?://www\\.kalku\\.de/(.*)"
        replacement: "https://kalku.de/${1}"
        permanent: true

    kalku-trailing-slash:
      redirectRegex:
        regex: "^(https://kalku\\.de/[^?]*[^/?])$"
        replacement: "${1}/"
        permanent: true

    kalku-legacy-redirects:
      redirectRegex:
        regex: "^https://kalku\\.de/(gaeb-konverter|kalkulator)/?$"
        replacement: "https://kalku.de/tools/${1}/"
        permanent: true
```

**Option B — In `vite.config.ts` als 404-Fallback-Logik:** nur für Hash-Redirects (`#anker`), die Browser-seitig sind:

```ts
// src/HashRedirect.tsx — gerendert im Layout-Root
useEffect(() => {
  const map: Record<string, string> = {
    '#leistungen': '/leistungen/',
    '#team': '/ueber-uns/',
    '#preise': '/konditionen/',
    '#kontakt': '/kontakt/',
    '#galabau': '/leistungen/galabau/',
    '#tiefbau': '/leistungen/tiefbau/',
    '#hochbau': '/leistungen/hochbau/',
    '#elektro': '/leistungen/elektro/',
    '#haustechnik': '/leistungen/haustechnik/',
    '#fenster': '/leistungen/fenster/',
    '#schadstoff': '/leistungen/schadstoff/',
  };
  const target = map[window.location.hash];
  if (target) window.location.replace(target);
}, []);
```

### 7.4 Verifizierung

- Vor Cutover: Screaming Frog Crawl der alten Site → vollständige URL-Liste extrahieren, Lücken in dieser Tabelle füllen
- Nach Cutover: 100 Stichproben-Redirects mit `curl -I` testen, Status `301` + `Location:` header prüfen
- Search Console „Crawl-Statistik" 2 Wochen beobachten — verbleibende 404 manuell mappen

---

## 8. Hreflang & Canonical

### 8.1 Hreflang

**Festlegung:** Alle Pages tragen `<html lang="de">` und nur `de-DE`. **Kein** mehrsprachiger Hreflang nötig (kein FR/AT/EN-Markt geplant — siehe [05-seo-keywords.md §6.1](./05-seo-keywords.md)).

```html
<html lang="de">
  <head>
    <link rel="alternate" hreflang="de-DE" href="https://kalku.de/{{path}}">
    <link rel="alternate" hreflang="x-default" href="https://kalku.de/{{path}}">
  </head>
</html>
```

Die `x-default`-Variante ist optional und kennzeichnet die Seite für unbestimmte Locales.

**Falls später AT-Markt:** Sub-Subdomain `at.kalku.de` ODER `/at/`-Präfix mit zusätzlichem `<link rel="alternate" hreflang="de-AT" href="...">`. Heute nicht setzen.

### 8.2 Canonical

**Regel:** Jede Page trägt einen Self-Referencing Canonical mit absoluter URL und Trailing Slash. Bei Filter-/Query-Pages (Blog, Referenzen) zeigt Canonical IMMER auf die Hub-URL ohne Query.

```html
<!-- /leistungen/galabau/ -->
<link rel="canonical" href="https://kalku.de/leistungen/galabau/">

<!-- /blog/?cat=gaeb (Filter) -->
<link rel="canonical" href="https://kalku.de/blog/">

<!-- /kontakt/?gewerk=galabau (UTM-ähnliche Pre-Fill-Params) -->
<link rel="canonical" href="https://kalku.de/kontakt/">
```

**Wichtig:** Niemals relative Canonicals (`<link rel="canonical" href="/leistungen/galabau/">`) — Google folgt absoluten URLs zuverlässiger und 301s funktionieren sauber.

---

## 9. Performance & Rendering

### 9.1 Pre-Rendering-Bedarf pro Route

Vite + React Router 7 = client-side rendering by default → **schlechtes SEO** für Crawler ohne JS-Render-Pass + LCP > 3.5s.

| Route-Typ | Render-Strategie | Begründung |
|---|---|---|
| `/`, `/leistungen/`, `/leistungen/{trade}/`, `/ablauf/`, `/konditionen/`, `/ueber-uns/`, `/referenzen/`, `/kontakt/`, `/impressum/`, `/datenschutz/`, `/agb/` | **Static Pre-Rendering (SSG)** | Statisch, Content selten ändernd. SSG = perfektes Lighthouse-Score, kein Backend-Cost, Crawler bekommen vollständiges HTML. |
| `/referenzen/{slug}/` | **SSG mit Build-Trigger** | Cases werden manuell geschrieben, Build re-trigger via Webhook bei neuem Case. |
| `/blog/`, `/blog/{slug}/` | **SSG** | Markdown/MDX-Dateien in `content/blog/`, Vite Build erzeugt statisches HTML pro Post. |
| `/tools/gaeb-konverter/`, `/tools/kalkulator/` | **SSG für Shell + Hydration für Tool-UI** | HTML-Shell mit `<h1>`, Beschreibung, Schema.org statisch. Tool-Komponente lädt nach Hydration. „Above-the-fold-LCP" sofort. |
| `/standorte/{ort}/` (Phase 2.5+) | **SSG** | s.o. |

### 9.2 Empfehlung: Welche Toolchain?

**Optionen geprüft:**

| Tool | Pro | Contra | Empfehlung |
|---|---|---|---|
| `vite-ssg` | Bleibt im Vite-Stack, minimal-invasiv, 5 Zeilen Setup. Funktioniert mit React Router. | React-19-Support hängt nach (Vue ist primary). Async-Data-Loading umständlich. | **Nicht empfohlen für React 19** |
| `vite-react-ssg` | React-spezifischer Fork von vite-ssg. React 19 + React Router 7 unterstützt. | Kleines Maintainer-Team, jüngeres Projekt. | **Empfohlen wenn man im Vite-Stack bleibt** |
| Migration zu **Astro** | Bestes SEO-Output, Islands-Architecture, native MDX, integriertes Sitemap-Plugin. React-Komponenten als Islands ladbar. | Stack-Wechsel kostet 2–3 Tage Setup. Tool-Komponenten (GAEB-Konverter) müssen als React-Island deklariert werden. | **Empfohlen falls Bandbreite vorhanden** — bestes Long-Term-SEO |
| Migration zu **Next.js 15** | App Router + RSC = Best-in-Class SSG/ISR. | Schwergewichtig für Marketing-Site, Vendor-Lock zu Vercel-Patterns. | Nicht empfohlen — Overkill für Marketing-Page |

**Final-Empfehlung:** **`vite-react-ssg` als Phase-3-Default**. Begründung in einem Satz: Bleibt im im 00-Dossier festgelegten Vite-Stack, gibt uns 100 % statische HTML-Pre-Rendering ohne Backend-Cost, und lässt die Tools (GAEB-Konverter, Kalkulator) als Hydration-Komponenten weiterleben. **Falls** der Boss in Phase 2.5 entscheidet, dass Blog + Wissen-Cluster groß werden: Migration zu Astro evaluieren — der Wechsel ist bei < 30 Pages noch günstig.

### 9.3 LCP-Budget pro Route (< 2.0 s auf 4G)

| Route | LCP-Element | Budget | Maßnahmen |
|---|---|---|---|
| `/` | Hero-Headline + Hero-Bild | 1.6 s | AVIF Hero `fetchpriority="high"`, kritischer CSS inline (< 14 KB), Inter via `font-display: swap` mit Subset |
| `/leistungen/{trade}/` | Hero-Stat ("LV in 48 h") | 1.4 s | textbasierter LCP, kein Bild → schnell |
| `/tools/gaeb-konverter/` | Tool-Headline + Drop-Zone-Mock | 1.8 s | Drop-Zone als CSS-Mock, JS für Datei-Parsing erst nach Hydration |
| `/blog/{slug}/` | Article-H1 | 1.2 s | text-only LCP, optionales Hero-Bild lazy |

### 9.4 Asset-Strategie

- **Bilder:** AVIF + JPEG-Fallback via `<picture>`. Alle Hero-Images < 150 KB. Alle Inline-Images < 50 KB. `loading="lazy"` außer Hero (`loading="eager"` + `fetchpriority="high"`).
- **Fonts:** Inter Variable WOFF2, self-hosted unter `/fonts/inter-var.woff2`, `font-display: swap`, preload nur `inter-var.woff2` (Body 400). Headline-Weights laden nach.
- **Icons:** lucide-react inline ✓ (keine Icon-Fonts).
- **Third-Party JS:** Plausible (1.2 KB, async). Cal.com Embed nur auf `/kontakt/` lazy-loaded (`<script defer>` after user-interaction). Pipedrive Form über Native HTML Form (POST direkt an Pipedrive API über eigenes Backend-Proxy — keine Pipedrive-JS-SDKs).

### 9.5 Cache-Strategie

- HTML: `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`
- CSS/JS mit Hash: `Cache-Control: public, max-age=31536000, immutable`
- Bilder mit Hash: `Cache-Control: public, max-age=31536000, immutable`
- OG-Images: `Cache-Control: public, max-age=86400` (kürzer wegen Cache-Bust-Bedarf)

---

## Summary

**Top-3 Architektur-Decisions:**

1. **Hub-and-Spoke mit `/leistungen/{trade}/`-Spokes statt Anker auf One-Pager.** Sieben dedizierte Gewerk-URLs sind die Voraussetzung für die Money-Keyword-Strategie aus 05-seo-keywords.md (jedes Gewerk eigener Cluster mit Pillar + 4 Posts). Cross-Linking zwischen verwandten Gewerken (Tiefbau↔Hochbau, Elektro↔Haustechnik, Hochbau↔Schadstoff) verteilt Link-Equity sauber.

2. **Statisches Pre-Rendering via `vite-react-ssg`, nicht client-side React.** Erreicht LCP < 2.0 s, gibt Crawlern vollständiges HTML, kostet kein Backend, behält den im Phase-1-Dossier festgelegten Vite-Stack. Tools (GAEB-Konverter, Kalkulator) bleiben als Hydration-Komponenten interaktiv. Migration zu Astro nur wenn Blog/Wissen-Cluster ≥ 30 Posts.

3. **Schema.org `@graph`-Array mit globalem `Organization`+`LocalBusiness`+`WebSite`-Block in jedem Layout, Per-Page-Schemas additiv.** Saarbrücken-`LocalBusiness` mit Geo + areaServed (Saarland/RLP/Hessen + DE) gibt Local-Pack-Sichtbarkeit. `Service`+`FAQPage`+`Offer` auf jeder Gewerk- und Konditionen-Page füttert SERP-Rich-Results und unterstützt die in Tag-60 anvisierten Money-Keyword-Rankings.

**Top-3 Risiken / Trade-offs:**

1. **Trailing-Slash-Konvention erzeugt einmaligen Redirect-Aufwand.** Edge-Redirect in Traefik ist Pflicht; falls vergessen, doppelter Index für `/page` und `/page/`. Mitigation: Traefik-Middleware in 7.3 vor Launch testen.

2. **`vite-react-ssg` ist jüngeres Projekt mit kleinerem Maintainer-Team als Astro/Next.** Risiko: React 19 / React Router 7 Edge-Cases, langsame Issue-Response. Mitigation: Phase 3 baut Tool-Pages so, dass sie auch im Pure-CSR-Modus funktionieren — Fallback ist möglich.

3. **Hash-Redirects (`#leistungen` → `/leistungen/`) müssen client-side gemacht werden.** Suchmaschinen sehen die alten Anker nie als URLs, aber alte Backlinks (E-Mail-Signaturen, Social) tragen evtl. Hash-URLs. Mitigation: JS-Snippet in 7.3 + Outreach an die wichtigsten Backlink-Quellen für URL-Update.
