# 06b — Wireframes (ASCII) für die neue kalku.de

> **Stand:** 14. Mai 2026
> **Scope:** 11 Pflicht-Seiten + 4 Querschnitts-Komponenten (Top-Nav, Footer, Sticky Mobile CTA, Exit-Intent Modal)
> **Konvention:**
> - ASCII-Box-Wireframes pro Seite, danach pro Block eine Tabelle: Block-Name · Komponente aus [02-component-inventory.md](./02-component-inventory.md) · Inhalt-Slots · CTA · Mobile-Verhalten.
> - Container-Breite `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` ist ausserhalb der ASCII-Boxen impliziert. Boxen sind ~92 Zeichen breit (entspricht Desktop-Container).
> - Trade-Color-Variant pro Gewerk: `galabau=emerald, elektro=yellow, haustechnik=orange, tiefbau=sky, leitungsbau=teal, schadstoff=red, fenster=blue`. CTA bleibt immer `kalku-green`.
> - Alle Verbatim-Quotes aus [03-content-audit-ugur.md](./03-content-audit-ugur.md) sind mit `>>` markiert.
> - Komponenten-Referenzen verweisen auf Section-# in `02-component-inventory.md` plus Linerange in `frontend/src/pages/LandingPage.tsx`.

---

## 0. Querschnitts-Komponenten (einmal wireframen, gilt überall)

### 0.1 Top-Navigation (Desktop + Mobile)

```
DESKTOP (>= md)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [▣ KALKU]   Leistungen ▾   Tools ▾   Konditionen   Referenzen   Über uns   Blog        │
│  Procurement                                                       [Anmelden] [Termin]  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
   sticky · bg-white · shadow-md ab scrollY > 10

  Leistungen Dropdown:                          Tools Dropdown:
  ┌────────────────────────────┐                ┌────────────────────────────┐
  │ • GaLaBau     (emerald)    │                │ • GAEB-Konverter           │
  │ • Tiefbau     (sky)        │                │ • Position-Kalkulator      │
  │ • Leitungsbau (teal)       │                │ • Marktvergleich (bald)    │
  │ • Elektro     (yellow)     │                └────────────────────────────┘
  │ • Haustechnik (orange)     │
  │ • Fenster     (blue)       │
  │ • Schadstoff  (red)        │
  │ ── Alle 7 Gewerke ──>     │
  └────────────────────────────┘

MOBILE (< md)
┌──────────────────────────────────────┐
│ [▣ KALKU]                  [☰ Menu]  │
└──────────────────────────────────────┘
   tap ☰ → vollflaechiges Drawer-Sheet
   ┌──────────────────────────────────┐
   │ Leistungen                       │
   │   GaLaBau · Tiefbau · ...        │
   │ Tools                            │
   │ Konditionen                      │
   │ Referenzen                       │
   │ Über uns                         │
   │ Blog                             │
   │ Anmelden                         │
   │ [ Termin vereinbaren  green ]    │
   └──────────────────────────────────┘
```

| Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|
| Top-Nav | `#1 Top Navigation` (LandingPage.tsx 390-451 / LandingShell.tsx 13-76) | Brand-Block links · 6 Nav-Items · Anmelden + Termin-CTA rechts. Dropdowns fuer "Leistungen" (7 Gewerke, Trade-Color) und "Tools" (GAEB-Konverter, Kalkulator) | Primaer: "Termin vereinbaren" (kalku-green) → /kontakt/#cal · Sekundaer: "Anmelden" → preisanfrage.kalku.de | Dropdowns kollabieren in Drawer-Sheet, alle Items als Rows; CTA bleibt unten als gruener Full-Width-Button im Drawer |

### 0.2 Footer (mit Rechts-Doks-Block)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-900 text-gray-400 py-12                                                        │
│                                                                                         │
│  ┌─[Brand]──────────┐  ┌─[Leistungen]──────┐  ┌─[Tools]─────────┐  ┌─[Unternehmen]──┐ │
│  │ ▣ KALKU          │  │ GaLaBau           │  │ GAEB-Konverter  │  │ Über uns       │ │
│  │ Procurement      │  │ Tiefbau           │  │ Kalkulator      │  │ Referenzen     │ │
│  │                  │  │ Leitungsbau       │  │ Marktvergleich  │  │ Blog           │ │
│  │ Ihre Kalkulation │  │ Elektro           │  │                 │  │ Konditionen    │ │
│  │ in 48 Stunden.   │  │ Haustechnik       │  │                 │  │ Ablauf         │ │
│  │                  │  │ Fenster           │  │                 │  │ Karriere       │ │
│  │ Saarbruecken     │  │ Schadstoff        │  │                 │  │ Kontakt        │ │
│  │ 0681-41096430    │  │                   │  │                 │  │                │ │
│  │ info@kalku.de    │  │                   │  │                 │  │                │ │
│  │ WhatsApp         │  │                   │  │                 │  │                │ │
│  └──────────────────┘  └───────────────────┘  └─────────────────┘  └────────────────┘ │
│                                                                                         │
│  ─────────────────────────── Recht & Compliance ───────────────────────────             │
│  DSGVO · Sicherheit · AVV · TOM · Subprozessoren · Datenschutz · Impressum · AGB        │
│                                                                                         │
│  ────────────────────────────────────────────────────────────────────────────           │
│  © 2026 KALKU Coksari. Alle Rechte vorbehalten.       Made in Saarbruecken              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

| Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|
| Footer | `#22 Footer` (LandingPage.tsx 2293-2322), erweitert von Single-Row zu 4-Spalten-Grid (eigenstaendig fuer Multi-Page-Site) | Brand+Kontakt-Block · Leistungen-Liste (7) · Tools-Liste (3) · Unternehmens-Links (7) · Recht-Doks-Strip (8 Items) · Copyright | mailto:info@kalku.de · tel:0681-41096430 · wa.me/4915167671877 | 4 Spalten kollabieren zu Accordion (Brand-Block immer offen, andere getoggelt). Recht-Strip bleibt sichtbar als wrapped Liste |

### 0.3 Sticky Mobile CTA Bar

```
MOBILE only (< md), fixed bottom-0, z-40
┌──────────────────────────────────────┐
│   [ Termin vereinbaren  →   green ]  │
└──────────────────────────────────────┘
   bg-white · border-t · shadow-lg · p-3
```

| Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|
| Sticky Mobile CTA | `#23 Sticky Mobile CTA bar` (LandingPage.tsx 2324-2337) | Ein Full-Width-Button kalku-green | "Termin vereinbaren" → scrollTo(#cal) auf Home/Kontakt; auf Tools-Pages → "Jetzt kostenlos nutzen" → ScrollTo Tool-Block | NUR mobile sichtbar; verschwindet bei scrollY > document.scrollHeight - 200 (kollidiert sonst mit Footer-CTAs) |

### 0.4 Exit-Intent Modal

```
DESKTOP only (mouseY <= 0 && scrollY > 600)
┌────────────────────────────────────────────────┐
│  bg-black/50 (Backdrop)         max-w-md       │
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │                                  [X]      │ │
│   │     ╔════════╗                           │ │
│   │     ║   📩   ║   amber-100               │ │
│   │     ╚════════╝                           │ │
│   │                                           │ │
│   │   Bevor Sie gehen ...                    │ │
│   │                                           │ │
│   │   Kostenloser Submissions-Check          │ │
│   │   "VOB/A 2026: Die 7 haeufigsten         │ │
│   │   Ausschluss-Gruende und wie Sie sie     │ │
│   │   vermeiden" — Whitepaper, 18 Seiten.    │ │
│   │                                           │ │
│   │   Bewertet von 142 Kalkulatoren.         │ │
│   │                                           │ │
│   │   [ ihre@email.de               ]        │ │
│   │                                           │ │
│   │   [ Whitepaper holen           green ]   │ │
│   │                                           │ │
│   │   Oder lieber direkt einen Termin? →     │ │
│   │                                           │ │
│   │   Wir senden Ihnen das PDF + 1 Mail mit  │ │
│   │   Beispiel-Cases. Kein Newsletter,       │ │
│   │   kein Spam. Abmeldung 1-Klick.          │ │
│   └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

| Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|
| Exit-Intent Modal | `#25 Exit-intent modal` (LandingPage.tsx 2347-2405) | Amber-Download-Icon · Title "Bevor Sie gehen ..." · Whitepaper-Pitch verbatim · Email-Input · DSGVO-Footnote | Primaer: kalku-green "Whitepaper holen" → POST /api/public/whitepaper-request · Sekundaer-Link: scrollTo(#cal) | NICHT auf Mobile triggern (kein mouseout-Pattern). Stattdessen: nach 90 s passive scroll-depth > 70 % einmalig anzeigen, dismissable |

---

## 1. Home (`/`)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [Top-Nav 0.1]                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== HERO =================================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-16 bg-white                                                                   │
│                                                                                         │
│  ┌─[Linke Spalte 60%]──────────────┐    ┌─[Rechte Spalte 40%]────────────────┐         │
│  │ [▸ KALKULATIONS-DIENSTLEISTER]  │    │  ┌─ Browser-Frame Mock ──────────┐  │         │
│  │                                  │    │  │ ●●●  preisanfrage.kalku.de   │  │         │
│  │ Wir kalkulieren Ihre             │    │  ├──────────────────────────────┤  │         │
│  │ Ausschreibung —                  │    │  │ ✓ LV hochgeladen (142 Pos)   │  │         │
│  │ Sie unterschreiben.              │    │  │                              │  │         │
│  │ (text-5xl bold)                  │    │  │ ● Klassifizierung laeuft     │  │         │
│  │                                  │    │  │   Beton  · Schuettgueter ·   │  │         │
│  │ LV in 48 h bepreist · 7 Gewerke  │    │  │   Bewehrung · Naturstein     │  │         │
│  │ · Festpreis ab 200 €             │    │  │                              │  │         │
│  │                                  │    │  │ ● 12 Lieferanten angefragt   │  │         │
│  │ Vier Teams uebernehmen Recherche,│    │  │   Saarbruecken · 100 km      │  │         │
│  │ Kalkulation, Einkauf und         │    │  │                              │  │         │
│  │ Vergabe — Sie pruefen und        │    │  │ ✓ Submission abgegeben       │  │         │
│  │ unterschreiben.                  │    │  │   25.04.2026 09:15 Uhr       │  │         │
│  │                                  │    │  └──────────────────────────────┘  │         │
│  │ [Termin: 15 Min ☎ green] [LV    │    │  Floating Badge:                  │         │
│  │  hochladen ➜ outline]            │    │  "48 h Bearbeitungszeit garantiert"│         │
│  │                                  │    │                                    │         │
│  │ ◯ DSGVO  ◯ Server in DE         │    │                                    │         │
│  │ ◯ AVV    ◯ Loyalitaet            │    │                                    │         │
│  │                                  │    │                                    │         │
│  │ ─────────────────────            │    │                                    │         │
│  │ 7 Gewerke aus einer Hand:        │    │                                    │         │
│  │ [GaLa][Tief][Leit][Elek]         │    │                                    │         │
│  │ [Haus][Fens][Schad]              │    │                                    │         │
│  └──────────────────────────────────┘    └────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== SOCIAL-PROOF-STRIP ===================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white border-y border-gray-100  py-10                                               │
│                                                                                         │
│   VERTRAUT VON BAUUNTERNEHMEN AUS DEM SAARLAND, RHEINLAND-PFALZ UND HESSEN             │
│                                                                                         │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                                    │
│   │ <##> │  │  <#> │  │ <##> │  │  <#> │  │  <#> │                                    │
│   │ Sub- │  │Zuschl│  │Best- │  │Gewerke│  │ Jahre│                                    │
│   │missio│  │      │  │kunden│  │      │  │      │                                    │
│   │ 2025 │  │      │  │      │  │      │  │      │                                    │
│   └──────┘  └──────┘  └──────┘  └──────┘  └──────┘                                    │
│                                                                                         │
│   ★ 4,9 / 5 Kundenzufriedenheit · Referenz-Anruf auf Wunsch                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== 7-GEWERKE TILE-WALL ==================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   Sieben Gewerke. Ein Kalkulationsteam.                                                 │
│   Jedes Gewerk mit eigenen Kategorien-Sets, Lieferanten-Pools, Vergabepraxis.           │
│                                                                                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                                  │
│   │   🌿     │ │   🏗️     │ │   📡     │ │   ⚡     │                                  │
│   │ GaLaBau  │ │ Tiefbau  │ │ Leitungs│ │ Elektro │                                   │
│   │ emerald  │ │   sky    │ │   teal   │ │  yellow  │                                  │
│   │ → Detail │ │ → Detail │ │ → Detail │ │ → Detail │                                  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘                                  │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐                                               │
│   │   🔧     │ │   🪟     │ │   ⚠️     │                                                │
│   │Haustechn │ │ Fenster  │ │Schadstoff│                                                │
│   │  orange  │ │   blue   │ │   red    │                                               │
│   │ → Detail │ │ → Detail │ │ → Detail │                                               │
│   └──────────┘ └──────────┘ └──────────┘                                               │
│                                                                                         │
│   "alle Gewerke aus einer Hand" — kein anderer Outsourcer hat dieses Spektrum.         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== VIER-TEAMS-STORY =====================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Vier Teams — eine Kalkulationsabteilung. Ihre.                                        │
│   Wir treten nach aussen als interne Kalkulationsabteilung Ihres Unternehmens auf.     │
│                                                                                         │
│   ┌────────────────────┐ ┌────────────────────┐                                         │
│   │ 📊 KALKULATION     │ │ 🛒 EINKAUF         │                                         │
│   │ primary-100        │ │ kalku-green/10     │                                         │
│   │                    │ │                    │                                         │
│   │ Handwerker und     │ │ Ermittelt parallel │                                         │
│   │ Bauingenieure mit  │ │ Materialpreise und │                                         │
│   │ 20+ Jahren Praxis. │ │ Entsorgungskosten. │                                         │
│   │                    │ │                    │                                         │
│   │ Reale Zeitwerte    │ │ Stellt bei Bedarf  │                                         │
│   │ statt akademischer │ │ NU-Anfragen im     │                                         │
│   │ Ansaetze.          │ │ regionalen Umfeld. │                                         │
│   └────────────────────┘ └────────────────────┘                                         │
│   ┌────────────────────┐ ┌────────────────────┐                                         │
│   │ 📋 VERGABE         │ │ 🔍 RECHERCHE       │                                         │
│   │ amber-100          │ │ purple-100         │                                         │
│   │                    │ │                    │                                         │
│   │ Spezialisiert auf  │ │ Wuechentlich alle  │                                         │
│   │ Vergaberecht.      │ │ Plattformen nach   │                                         │
│   │                    │ │ passenden Aus-     │                                         │
│   │ Fristgerechte      │ │ schreibungen.      │                                         │
│   │ Einreichung —      │ │                    │                                         │
│   │ wenn noetig nachts │ │ Kein Kunde verpasst│                                         │
│   │ oder am Wochenende.│ │ eine Chance.       │                                         │
│   └────────────────────┘ └────────────────────┘                                         │
│                                                                                         │
│   Alle Teams sind am finanziellen Erfolg beteiligt.                                     │
│   >> "Das ist der Grund, warum auch kurzfristige Abgaben — nachts oder am Wochenende  │
│      — zuverlaessig eingehalten werden."                                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== "SO LAEUFT'S AB" 5-SCHRITTE TIMELINE =================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   So laeuft eine Zusammenarbeit ab.                                                     │
│                                                                                         │
│   ┌─[01]──────┐ →  ┌─[02]──────┐ →  ┌─[03]──────┐ →  ┌─[04]──────┐ →  ┌─[05]──────┐  │
│   │ ☎          │    │ ✍ Vollm.  │    │ 🧮 Kalk.   │    │ 📤 Einreich│    │ 🏆 Ergebnis│  │
│   │ Erstgespr.│    │ Kickoff    │    │ Einsicht   │    │ fristgerec │    │ Nachbe-    │  │
│   │ 5–10 Min  │    │ Mittellohn │    │ Aenderungen│    │ auch nachts│    │ reitung    │  │
│   │           │    │ Zuschlaege │    │ moeglich   │    │ od. WoEnde │    │ + Nachfrag │  │
│   │ → mehr    │    │ → mehr     │    │ → mehr     │    │ → mehr     │    │ → mehr     │  │
│   └───────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘  │
│                                                                                         │
│   [ Volle Ablauf-Beschreibung lesen → /ablauf/   text-link ]                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== PRICING-BLOCK (KOMPAKT) ==============================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Transparente Konditionen — sichtbar, nicht "auf Anfrage".                             │
│                                                                                         │
│   ┌──[Einzelbeauftr.]──┐ ┌──[PAKET M]───────┐ ┌──[PAKET L]──────┐                       │
│   │  ab 200 €          │ │  3.000 €/Mon     │ │  5.000 €/Mon    │                       │
│   │  pro Ausschreibung │ │  + 3,9 % Erfolg  │ │  + 2,9 % Erfolg │                       │
│   │  bis 600 €         │ │                  │ │                 │                       │
│   │                    │ │  unbegrenzt LVs  │ │  unbegrenzt LVs │                       │
│   │  + 5 % Erfolg      │ │  Recherche inkl. │ │  Niedrigste     │                       │
│   │    bei Zuschlag    │ │  monatl. kuendb. │ │  Provision      │                       │
│   │                    │ │                  │ │                 │                       │
│   │  ✓ Keine Grund-    │ │  Beliebt         │ │  ✓ Gebiets-     │                       │
│   │    gebuehren       │ │  ↑ -top-3 pill   │ │    schutz inkl. │                       │
│   │                    │ │                  │ │                 │                       │
│   │  [ Anfragen ]      │ │  [ Termin ]      │ │  [ Termin ]     │                       │
│   │   outline          │ │   blau gefuellt  │ │   outline       │                       │
│   └────────────────────┘ └──────────────────┘ └─────────────────┘                       │
│                                                                                         │
│   Alle Preise netto · Erfolgsprovision nur bei Zuschlag · Loyalitaet & Gebietsschutz   │
│   [ Volle Konditionen + Vergleichstabelle → /konditionen/ ]                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== "4 HAEUFIGE IRRTUEMER" FAQ-HOOK ======================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-gray-50 to-white py-16                                          │
│                                                                                         │
│   4 haeufige Irrtuemer ueber oeffentliche Ausschreibungen                                │
│                                                                                         │
│   ┌──────────────────────────────────────────┐  ┌──────────────────────────────────────┐│
│   │ ✗ Man braucht eine Praequalifikation.   │  │ ✗ Die Firma muss 3 Jahre bestehen.   ││
│   │                                           │  │                                       ││
│   │ ✓ Nein. Eignung ueber Umsatz, Referenzen│  │ ✓ Nein. Auch juengere Unternehmen    ││
│   │   und Bescheinigungen nachweisbar.       │  │   erhalten Zuschlaege — teils nach   ││
│   │                                           │  │   unter 6 Monaten.                   ││
│   └───────────────────────────────────────────┘  └───────────────────────────────────────┘│
│   ┌──────────────────────────────────────────┐  ┌──────────────────────────────────────┐│
│   │ ✗ Oeffentliche Auftraggeber zahlen      │  │ ✗ Man muss eine GmbH oder AG sein.   ││
│   │   schlecht.                               │  │                                       ││
│   │                                           │  │ ✓ Nein. Auch Einzelunternehmer       ││
│   │ ✓ Nein. VOB-Regelung: Abschlagsrechnung │  │   duerfen teilnehmen, sofern         ││
│   │   innerhalb von 3 Wochen.                │  │   vergleichbare Referenzen vorliegen.││
│   └───────────────────────────────────────────┘  └───────────────────────────────────────┘│
│                                                                                         │
│   [ Alle Fragen lesen → /ablauf/#faq ]                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== ANONYMISIERTE CASE-STUDIES (3 KARTEN) ================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-slate-50 to-white py-16                                         │
│                                                                                         │
│   Drei Bauunternehmen, drei messbare Erfolge. Anonymisiert. Echte Zahlen.               │
│                                                                                         │
│   ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐               │
│   │ from-sky-50         │ │ from-emerald-50     │ │ from-yellow-50      │               │
│   │ border-sky-300      │ │ border-emerald-300  │ │ border-yellow-300   │               │
│   │                     │ │                     │ │                     │               │
│   │ 🏗️                   │ │ 🌿                  │ │ ⚡                   │               │
│   │ Tiefbau-Betrieb     │ │ GaLaBau-Mittel-     │ │ Elektro-Mittel-     │               │
│   │ Saarland · 12 MA    │ │ stand · NRW · 18 MA │ │ stand · BW · 25 MA  │               │
│   │                     │ │                     │ │                     │               │
│   │ ┌─[Stunden/LV]──┐   │ │ ┌─[Submissions]─┐   │ │ ┌─[Zuschlagsquote]┐ │               │
│   │ │ 40 → 4 (-90 %)│   │ │ │ 6 → 18 /Jahr  │   │ │ │ 14 % → 31 %     │ │               │
│   │ └───────────────┘   │ │ └───────────────┘   │ │ └─────────────────┘ │               │
│   │ ┌─[Zuschlaege]──┐   │ │ ┌─[Zuschlaege]──┐   │ │ ┌─[Auftragsvol.]──┐ │               │
│   │ │ 1 → 4 von 14  │   │ │ │ 2 → 7 (+250 %)│   │ │ │ 1,8 M → 4,2 M € │ │               │
│   │ └───────────────┘   │ │ └───────────────┘   │ │ └─────────────────┘ │               │
│   │ ┌─[Auftragsvol.]┐   │ │ ┌─[Mittellohn]──┐   │ │ ┌─[Submissionen]──┐ │               │
│   │ │ 280 k € durch │   │ │ │ +12 % moeglich│   │ │ │ 8 → 26 /Jahr    │ │               │
│   │ └───────────────┘   │ │ └───────────────┘   │ │ └─────────────────┘ │               │
│   └─────────────────────┘ └─────────────────────┘ └─────────────────────┘               │
│                                                                                         │
│   [ Alle Cases ansehen → /referenzen/  text-link ]                                      │
│   [ Auf Wunsch: Referenz-Anruf mit einem dieser Kunden  green ]                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== INHABER-TRUST-BLOCK ==================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   ┌─[Foto links]─────┐    ┌─[Statement + Vita]──────────────────────────┐              │
│   │                   │    │  ▸ INHABER & GRUENDER                        │              │
│   │   ┌─────────┐     │    │                                              │              │
│   │   │         │     │    │  Alaatdin Coksari                            │              │
│   │   │  Foto   │     │    │  text-3xl bold                               │              │
│   │   │ Coksari │     │    │                                              │              │
│   │   │ rounded │     │    │  >> "Unsere Kunden sind Geschaeftsfuehrer    │              │
│   │   │  -2xl   │     │    │     und Inhaber, die keine Zeit haben, jede  │              │
│   │   │         │     │    │     Ausschreibung selbst durchzurechnen —   │              │
│   │   └─────────┘     │    │     aber auch kein Angebot verpassen wollen. │              │
│   │                   │    │     Sie denken in Zahlen und Ergebnissen,    │              │
│   │  Berliner         │    │     nicht in Marketingversprechen."          │              │
│   │  Promenade 15     │    │                                              │              │
│   │  66111 SB         │    │  Ausgebildet im Handwerk, kalkuliert seit    │              │
│   │                   │    │  18 Jahren oeffentliche Ausschreibungen.     │              │
│   │  ☎ 0681-410964… │    │  Gruender von KALKU 2024 nach 14 Jahren als  │              │
│   │  ☎ wa.me/...     │    │  Kalkulator in mittelstaendischen Bauunter-  │              │
│   │  ✉ info@…       │    │  nehmen.                                     │              │
│   └───────────────────┘    │                                              │              │
│                            │  [ Direkt mit dem Gruender sprechen  green ] │              │
│                            └──────────────────────────────────────────────┘              │
│                                                                                         │
│   ┌─[Stat-Karte 1]─┐ ┌─[Stat-Karte 2]─┐ ┌─[Stat-Karte 3]─┐ ┌─[Stat-Karte 4]─┐         │
│   │ 18+            │ │ 7              │ │ 200–600 €      │ │ 100 %          │         │
│   │ Jahre Praxis   │ │ Gewerke        │ │ Festpreis      │ │ Made in        │         │
│   │                │ │ aus einer Hand │ │ ab             │ │ Saarbruecken   │         │
│   └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== "SUBMISSION MORGEN?" URGENCY + CAL.COM-DIREKT-BUCHUNG ================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green                      │
│  py-16  text-white                                                                      │
│                                                                                         │
│   ┌─[Linke Spalte 60%]─────────────┐    ┌─[Rechte Spalte 40%]──────────────┐           │
│   │ ▸ SUBMISSION MORGEN?            │    │  ┌─ Cal.com Embed ────────────┐  │           │
│   │                                 │    │  │ Termin in 15 Minuten waehlen│  │          │
│   │ Wir schaffen es.                │    │  │                             │  │          │
│   │ text-4xl bold white             │    │  │ ┌──── Mai 2026 ────┐        │  │          │
│   │                                 │    │  │ │ M D M D F S S    │        │  │          │
│   │ >> "Bei knappen Fristen         │    │  │ │  ●●●●○○○         │        │  │          │
│   │    arbeiten wir auch ueber      │    │  │ │  ○●●●●○○         │        │  │          │
│   │    Nacht oder am Wochenende."   │    │  │ │  ●●●●●○○         │        │  │          │
│   │                                 │    │  │ └──────────────────┘        │  │          │
│   │ Wenn Sie heute noch ein         │    │  │                             │  │          │
│   │ Erstgespraech buchen:           │    │  │ Verfuegbare Slots heute:    │  │          │
│   │                                 │    │  │  • 14:00  • 15:30  • 17:00  │  │          │
│   │ ✓ Innerhalb 30 Min Rueckruf    │    │  │                             │  │          │
│   │ ✓ LV-Pruefung in 2 h            │    │  │ [ Slot waehlen → Cal.com ] │  │          │
│   │ ✓ Bepreisung in 24–48 h         │    │  └─────────────────────────────┘  │          │
│   │ ✓ Einreichung uebernehmen wir   │    │                                   │          │
│   │                                 │    │  Alternative:                     │          │
│   │ [ Termin in 15 Min  white-cta ] │    │  ☎ 0681-41096430 (sofort)        │          │
│   │ [ WhatsApp        glass     ]   │    │  ☎ wa.me/4915167671877           │          │
│   └─────────────────────────────────┘    └───────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| H-1 | Hero | `#2 Hero — split copy + UI mockup` (453-633) | Eyebrow "Kalkulations-Dienstleister" · H1 "Wir kalkulieren Ihre Ausschreibung — Sie unterschreiben." (mit `<span text-primary-500>Sie unterschreiben.</span>` highlight) · Stat-Zeile "LV in 48 h bepreist · 7 Gewerke · Festpreis ab 200 €" · Subzeile (Vier-Teams-Pitch verbatim) · Trust-Badges (DSGVO/Server in DE/AVV/Loyalitaet) · 7 Trade-Pills · Mockup zeigt vier-Schritt-Workflow Upload→Klassifizierung→Anfragen→Submission | Primaer kalku-green: "Termin: 15 Min" → scrollTo(#cal) · Sekundaer outline: "LV hochladen" → /tools/gaeb-konverter/ | Mockup `hidden lg:block` → entfaellt; CTAs stacken vertical full-width; Trade-Pills wrappen 2-spaltig |
| H-2 | Social-Proof-Strip | `#4 Customer-stats strip + trade icon-tile wall` (694-735), Counter-Variante | Eyebrow "Vertraut von Bauunternehmen aus dem Saarland, RLP, Hessen" · 5 AnimatedCounter (Submissions 2025, Zuschlaege, Bestandskunden, Gewerke=7, Jahre Erfahrung — Zahlen TBD vom Boss) · Footer-Line ★ 4,9/5 + Referenz-Anruf-Hinweis | keiner direkt, Karten sind dekorativ | Counter-Tiles `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`; Footer-Line wrappt |
| H-3 | 7-Gewerke Tile-Wall | `#12 Gewerke list (7 trade cards)` (1360-1404), Trade-Color-Variant | H2 "Sieben Gewerke. Ein Kalkulationsteam." · Subtitle · 7 Karten (Icon + Trade-Name + "Auf eigene Landingpage") | je Karte: → /leistungen/[gewerk]/ | `grid sm:grid-cols-2 lg:grid-cols-4` → kollabiert auf 2 Cols mobile, 7. Karte umbricht in 2. Reihe |
| H-4 | Vier-Teams-Story | `#6 Features grid` (800-924) reduziert auf 4 Karten, je ein Team | H2 "Vier Teams — eine Kalkulationsabteilung. Ihre." · 4 Karten (Kalkulation primary / Einkauf kalku-green / Vergabe amber / Recherche purple) je mit Icon + Body verbatim aus Audit · Footer-Quote "Alle Teams sind am finanziellen Erfolg beteiligt." | nur Storytelling, kein direkter Button-CTA | `grid sm:grid-cols-2 lg:grid-cols-4` → 2x2 mobile |
| H-5 | "So laeuft's ab" Timeline | `#5 "So funktioniert's" 4-step` (737-798) erweitert auf 5 Steps mit Connector-Pfeilen aus `#16 Onboarding journey` (1672-1761) | H2 "So laeuft eine Zusammenarbeit ab." · 5 Karten: 01 Erstgespraech ☎ · 02 Vollmacht & Kickoff ✍ · 03 Kalkulation & Einsicht 🧮 · 04 Einreichung 📤 · 05 Ergebnis & Nachbereitung 🏆 · jede Karte mit "→ mehr" Link | text-link "Volle Ablauf-Beschreibung lesen → /ablauf/" | Cards stacken vertical, Connector-Pfeile (`hidden lg:block`) verschwinden mobile |
| H-6 | Pricing-Block (kompakt) | `#14 Pricing` (1462-1603), 3 Karten ohne Toggle (Toggle nur auf /konditionen/) | H2 "Transparente Konditionen — sichtbar, nicht 'auf Anfrage'." · Karte 1 Einzel 200–600 € + 5 % · Karte 2 PAKET M 3.000 € + 3,9 % (highlight, "Beliebt"-Pill) · Karte 3 PAKET L 5.000 € + 2,9 % · Footer-Note + Link auf /konditionen/ | Karte 1: "Anfragen" outline → /kontakt/ · Karte 2: "Termin" blau gefuellt → /kontakt/#cal · Karte 3: "Termin" outline → /kontakt/#cal | `grid lg:grid-cols-3` → stack vertical; "Beliebt"-Pill bleibt am Top der mittleren Karte |
| H-7 | "4 Irrtuemer" FAQ-Hook | `#3 Before/After comparison` (635-692) Pattern in 2x2-Grid, je Frage = Before-rot + Antwort-gruen | H2 "4 haeufige Irrtuemer ueber oeffentliche Ausschreibungen" · 4 Karten je mit ✗-roter Frage + ✓-gruener Antwort verbatim aus Audit (Praequalifikation/3-Jahre/Zahlung/GmbH) | text-link "Alle Fragen lesen → /ablauf/#faq" | 2x2-Grid → 1-spaltig stacken; ✗ und ✓-Block bleiben in einer Karte (nicht splitten) |
| H-8 | Anonymisierte Case-Studies | `#9 Detailed case studies (3 metric-table cards)` (1188-1300) | H2 "Drei Bauunternehmen, drei messbare Erfolge. Anonymisiert. Echte Zahlen." · 3 Karten Trade-Color (Tiefbau sky / GaLaBau emerald / Elektro yellow) je mit 3 Vorher-Nachher-Metriken (line-through-rot → bold-gruen) · Karte ohne Firmenname, nur Branche+Region+MA-Groesse | text-link "Alle Cases → /referenzen/" + green "Referenz-Anruf mit einem dieser Kunden" → /kontakt/?topic=referenz | `grid lg:grid-cols-3` → stack vertical; tabular-nums halten Zahlen sauber |
| H-9 | Inhaber-Trust-Block | `#20 Founder/team trust block` (1940-2052) erweitert um Foto-Spalte links | Foto Coksari rounded-2xl + Adresse/Tel/WA/Email · Statement-Quote verbatim · Vita-Absatz · 4 Stat-Karten unten (18+ Jahre / 7 Gewerke / 200 € / 100 % Saarbruecken) | green "Direkt mit dem Gruender sprechen" → tel:0681-41096430 | Foto-Spalte rueckt nach oben (centered, kleiner); Stats stacken 2x2 |
| H-10 | Urgency + Cal.com | `#17 Lead-magnet CTA hero` (1763-1847) als Wrapper, rechts Cal.com-iframe statt Preview-Karte | Linke Spalte: Eyebrow "Submission morgen?" · H2 "Wir schaffen es." (white) · Verbatim-Quote · 4-Bullet-Liste · 2 CTAs (white-cta + glass-WhatsApp) · Rechte Spalte: Cal.com `<iframe>` mit Direkt-Buchung 15-Min-Slot | Primaer white-on-blue: "Termin in 15 Min" → cal.com/kalku/15min · Sekundaer glass: WhatsApp wa.me · Tertiar text: tel: | Cal-Iframe `min-h-[520px]` mobile; CTAs full-width stacken |
| H-11 | Footer | siehe 0.2 | siehe 0.2 | siehe 0.2 | siehe 0.2 |
| H-12 | Sticky Mobile CTA | siehe 0.3 | siehe 0.3 | "Termin vereinbaren" → scrollTo(#cal) | NUR mobile |

---

## 2. Gewerk-Landingpage Template (`/leistungen/[gewerk]/`)

> **Trade-Color-Variant pro Instanz.** Im Wireframe als `[TRADE-COLOR]` markiert — wird je nach Gewerk durch `emerald|sky|teal|yellow|orange|blue|red` ersetzt. CTA bleibt immer kalku-green. Beispiel hier: `[tiefbau = sky]`.

```
== HERO (Trade-Color) ===================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-16 bg-gradient-to-br from-sky-50 via-white to-white                           │
│                                                                                         │
│  ┌─[Linke Spalte 60%]─────────────────┐    ┌─[Rechte Spalte 40%]─────────────┐         │
│  │ ┌─[Trade-Badge]─┐                   │    │   ┌──── Beispiel-LV-Snippet ──┐  │         │
│  │ │ 🏗️  TIEFBAU   │ bg-sky-100        │    │   │ Pos 03.001  Mutterboden    │  │         │
│  │ │     bg-sky-700 text                │    │   │   abtragen, lagern         │  │         │
│  │ └────────────────┘                   │    │   │   2 800 m³        ___ €/m³ │  │         │
│  │                                      │    │   │                            │  │         │
│  │ Tiefbau-Submissionen                 │    │   │ Pos 03.012  Schotter 0/45  │  │         │
│  │ in 48 h bepreist.                    │    │   │   liefern, einbauen        │  │         │
│  │ text-5xl bold                        │    │   │   1 250 t         ___ €/t  │  │         │
│  │                                      │    │   │                            │  │         │
│  │ Spezialtiefbau, Erdbewegung,         │    │   │ Pos 03.045  Pfahl D=600    │  │         │
│  │ Pfahlgruendung, Abbruch, Entsorgung, │    │   │   bohren, bewehren         │  │         │
│  │ Transporte. Komplette Submission —   │    │   │   42 Stk          ___ €/St │  │         │
│  │ ein Ansprechpartner.                 │    │   │                            │  │         │
│  │                                      │    │   │ ... 138 weitere Positionen │  │         │
│  │ [Termin: 15 Min  green]              │    │   │                            │  │         │
│  │ [LV hochladen   outline]             │    │   │ → in 48 h vollstaendig    │  │         │
│  │                                      │    │   │   bepreist.                │  │         │
│  │ ── Bewertet von 18 Tiefbau-          │    │   └────────────────────────────┘  │         │
│  │    Bauunternehmen ★4,9 ──            │    │                                   │         │
│  └──────────────────────────────────────┘    └───────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== "WAS WIR FUER TIEFBAU UEBERNEHMEN" — 6 LEISTUNGS-KARTEN ==============================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Was wir fuer Tiefbau-Submissionen uebernehmen.                                        │
│                                                                                         │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐                                          │
│   │ 🧮 Kalk.    │ │ 🛒 Einkauf │ │ 📋 Vergabe │                                          │
│   │ EFB 221/   │ │ Schuettgut │ │ Form-      │                                          │
│   │ 223, Ur-   │ │ Beton, Be- │ │ blaetter,  │                                          │
│   │ kalk., je  │ │ wehrungs-  │ │ Eignungs-  │                                          │
│   │ Position   │ │ stahl,     │ │ nachweise, │                                          │
│   │ Zeitwerte  │ │ Pfahlgrue. │ │ Einreich.  │                                          │
│   └────────────┘ └────────────┘ └────────────┘                                          │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐                                          │
│   │ 🔍 Such-    │ │ 🏷️ Pfahl-   │ │ 🚚 Trans-  │                                          │
│   │ radius +   │ │ gruendung  │ │ porte +    │                                          │
│   │ NU-Anfrag. │ │ Spezial-   │ │ Entsorg.   │                                          │
│   │ regional   │ │ tiefbau    │ │ AVV-konform│                                          │
│   │ 100 km     │ │ Pruefung   │ │ Wellstahl- │                                          │
│   │            │ │ inkl.      │ │ bauwerke   │                                          │
│   └────────────┘ └────────────┘ └────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== BEISPIEL-SUBMISSION (LV-FRAGMENT MOCK) ===============================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   So sah unsere letzte Tiefbau-Kalkulation aus.                                         │
│   Beispiel anonymisiert — aber echte Zahlen.                                            │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐         │
│   │ ▸ Projekt Brueckensanierung im Saarland · 142 Positionen · 1,8 Mio. EUR │         │
│   │   Submission Mai 2026 · Bepreist in 41 Stunden · Zuschlag erhalten      │         │
│   ├──────────────────────────────────────────────────────────────────────────┤         │
│   │ Kategorie         | Pos | Menge      | EP-Bandbreite  | Lieferanten     │         │
│   │ Pfahlgruendung    | 18  |   42 Stk   | 380–520 €/St   | 3 angefragt     │         │
│   │ Bewehrungsstahl   | 22  | 28 t       | 1.180–1.290 €/t| 4 angefragt     │         │
│   │ Schuettgueter     | 31  | 1 250 t    | 18,40–22,10 €/t| 5 angefragt     │         │
│   │ Beton C25/30      | 14  | 320 m³     | 92–108 €/m³    | 3 angefragt     │         │
│   │ Entsorgung        | 19  | 1 800 t    | 28–34 €/t      | 4 angefragt     │         │
│   │ Eigenleistung     | 38  | 4 200 h    | Kunden-Mittel- │ —               │         │
│   │                   |     |            | lohn 49,80 €/h │                 │         │
│   └──────────────────────────────────────────────────────────────────────────┘         │
│                                                                                         │
│   [ Echtes LV anonymisiert anschauen → PDF (8 Seiten) ]                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== GEWERK-FAQ (8 FRAGEN) ================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Tiefbau-spezifische Fragen.                                                           │
│                                                                                         │
│   [ 🔍 Frage suchen ...                                                              ]  │
│                                                                                         │
│   ▸ Welche Tiefbau-Kategorien bepreisen Sie?                                ▾           │
│   ▸ Bis zu welchem LV-Umfang ist 48 h realistisch?                          ▾           │
│   ▸ Pfahlgruendung — fragen Sie auch Spezialtiefbau-Subs an?                ▾           │
│   ▸ Wie wird der Schuettgut-Markt regional abgedeckt?                       ▾           │
│   ▸ AVV-Abfallschluessel fuer Aushub und Entsorgung — uebernehmen Sie das?  ▾           │
│   ▸ Wellstahlbauwerke — nicht jedes Buero kann das. Sie?                    ▾           │
│   ▸ Mein Bagger-Mittellohn ist 52 €/h. Wie geht das in die Kalk?            ▾           │
│   ▸ Tiefbau-Submission morgen — was sende ich Ihnen?                        ▾           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CROSS-LINK-BLOCK ("AUCH INTERESSANT") ================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-slate-50 to-white py-12                                         │
│                                                                                         │
│   Auch fuer Sie interessant.                                                            │
│                                                                                         │
│   ┌────────────────────┐  ┌────────────────────┐                                        │
│   │ 📡 Leitungsbau     │  │ 🌿 GaLaBau         │                                        │
│   │ Wenn Tiefbau auf   │  │ Wenn Aushub auf    │                                        │
│   │ Versorgungsleitung │  │ Pflanzung trifft.  │                                        │
│   │ trifft.            │  │                    │                                        │
│   │ → /leistungen/     │  │ → /leistungen/     │                                        │
│   │   leitungsbau/     │  │   galabau/         │                                        │
│   └────────────────────┘  └────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== ANONYMISIERTE TIEFBAU-CASE ===========================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Eine Tiefbau-Case mit harten Zahlen.                                                  │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐         │
│   │ from-sky-50  border-sky-300                                               │         │
│   │ 🏗️  Tiefbau-Mittelstand · Saarland · 12 MA · 7,4 Mio. Umsatz             │         │
│   │                                                                            │         │
│   │ ┌─[Stunden/LV]──────┐ ┌─[Submissions]────┐ ┌─[Zuschlaege]──────┐        │         │
│   │ │ 40 h → 4 h        │ │ 8 → 26 /Jahr     │ │ 1 → 9 von 26       │        │         │
│   │ │ -90 % intern      │ │ + 225 %          │ │ Quote 12 → 35 %    │        │         │
│   │ └───────────────────┘ └──────────────────┘ └────────────────────┘        │         │
│   │                                                                            │         │
│   │ "Wir haben in 2025 mehr Auftragsvolumen gewonnen als in den 3 Jahren     │         │
│   │  davor zusammen — und das mit weniger Buero-Aufwand."                    │         │
│   │ — Geschaeftsfuehrer (Name auf Wunsch verfuegbar)                          │         │
│   └──────────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CTA-BLOCK ============================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green py-16  text-white    │
│                                                                                         │
│            Jetzt Tiefbau-Submission anfragen.                                           │
│            text-4xl bold white                                                          │
│                                                                                         │
│            48 h Bearbeitungszeit · Festpreis ab 200 € · Erfolgsprovision 5 %            │
│                                                                                         │
│            [ Termin: 15 Min  white-cta ]    [ LV hochladen  glass ]                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| G-1 | Hero (Trade-Color) | `#2 Hero — split copy + UI mockup` (453-633), Background-Gradient mit Trade-Tint | Trade-Badge (Icon + Trade-Name in `bg-[TRADE]-100 text-[TRADE]-700`) · H1 "[Gewerk]-Submissionen in 48 h bepreist." · Subzeile mit Gewerk-Spezifika (Tiefbau: Spezialtiefbau/Erdbewegung/Pfahlgr./Abbruch/Entsorgung) · 2 CTAs · Rating-Line "Bewertet von X [Gewerk]-Bauunternehmen ★4,9" · Rechts: Beispiel-LV-Snippet im Browser-Frame | green "Termin: 15 Min" → /kontakt/#cal · outline "LV hochladen" → /tools/gaeb-konverter/ | Mockup `hidden lg:block`; Trade-Badge bleibt sichtbar |
| G-2 | "Was wir uebernehmen" 6 Karten | `#6 Features grid (12 cards)` (800-924) reduziert auf 6 | H2 gewerk-spezifisch · 6 Karten je mit Icon + Title + Body. Beispiel Tiefbau: Kalkulation+EFB / Einkauf+Schuettgueter / Vergabe+Formblaetter / Suchradius+NU / Pfahlgruendung+Spezialtiefbau / Transporte+Entsorgung+AVV | keiner direkt | `grid sm:grid-cols-2 lg:grid-cols-3` → 1-spaltig stacken |
| G-3 | Beispiel-Submission (LV-Snippet) | NEU — Komponente `<LVPreviewCard>` (basiert auf `BrowserFrame` 2429-2445 + Tabellen-Stil aus `#9` 1188-1300) | Projekt-Header (Anonym + Positionsanzahl + Volumen + Submission-Datum + Bearbeitungszeit + Zuschlag-Status) · Tabelle Kategorie/Pos/Menge/EP-Bandbreite/Lieferanten — gewerk-spezifisch | text-link "Echtes LV anonymisiert anschauen → PDF" | Tabelle wird scrollbar `overflow-x-auto`; Header-Block bleibt sticky innerhalb der Karte |
| G-4 | Gewerk-FAQ | `#19 FAQ (search input + accordion)` (1882-1938) | Search-Input · 5–8 gewerk-spezifische Fragen (Beispiel Tiefbau: Kategorien / 48-h-Realismus / Spezialtiefbau-NU / Schuettgut-Markt / AVV / Wellstahl / Mittellohn / Submission-morgen) | accordion-toggle | wie Original |
| G-5 | Cross-Link-Block | `#11 Industry-specific demo selector` (1312-1358) reduziert auf 2 Karten, ohne Demo-Loading | 2 verwandte Gewerke-Karten mit kurzer Verbindungs-Story. Tiefbau → Leitungsbau + GaLaBau. Mapping: GaLaBau↔Tiefbau / Tiefbau↔Leitungsbau / Leitungsbau↔Tiefbau / Elektro↔Haustechnik / Haustechnik↔Elektro / Fenster↔(allein) / Schadstoff↔(allein) | je Karte: → /leistungen/[gewerk]/ | `grid sm:grid-cols-2` → stack vertical |
| G-6 | Anonymisierte Case | `#9 Detailed case studies` (1188-1300) — eine einzelne Karte breit | Eine Trade-Color-Karte mit Branche+Region+MA-Groesse+Umsatz, 3 Vorher-Nachher-Metriken, 1 Quote ohne Name | text-link "Alle Cases → /referenzen/?gewerk=tiefbau" | 1-spaltig sowieso, bleibt full-width |
| G-7 | CTA-Block | `#17 Lead-magnet CTA hero` (1763-1847) ohne Preview-Karte, zentriert | H2 "Jetzt [Gewerk]-Submission anfragen." · Subzeile mit Versprechen · 2 CTAs (white-cta + glass) | Primaer white-on-blue: "Termin: 15 Min" → /kontakt/#cal · Sekundaer glass: "LV hochladen" → /tools/gaeb-konverter/ | CTAs full-width stacken |

---

## 3. Konditionen (`/konditionen/`)

```
== HERO: PRICING-VERGLEICHSTABELLE ======================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ┌─[Eyebrow]─┐                                                                         │
│   │ ▸ KONDITIONEN│ primary-50                                                           │
│   └────────────┘                                                                         │
│                                                                                         │
│   Faire Konditionen.                                                                    │
│   Sie zahlen, wenn wir liefern.                                                         │
│   text-4xl bold                                                                         │
│                                                                                         │
│   Sichtbar — keine "auf Anfrage"-Verstecker.                                            │
│                                                                                         │
│   ┌────────────────────────────────────────────────────────────────────────┐           │
│   │ Vergleichs-Matrix              | Einzel  | PAKET M  | PAKET L         │           │
│   ├────────────────────────────────┼─────────┼──────────┼─────────────────┤           │
│   │ Pauschale je Ausschreibung     | 200–600 | inkl.    | inkl.           │           │
│   │ Erfolgsprovision               | 5 %     | 3,9 %    | 2,9 %           │           │
│   │ Monatliche Grundgebuehr        | —       | 3.000 €  | 5.000 €         │           │
│   │ Ausschreibungs-Recherche       | —       | ✓ woech. | ✓ woech.        │           │
│   │ Anzahl LVs / Monat             | je-call | unbegr.  | unbegr.         │           │
│   │ Kuendigungsfrist               | n/a     | monatl.  | monatl.         │           │
│   │ Loyalitaet (kein Wettbewerber) | ✓       | ✓        | ✓               │           │
│   │ Gebietsschutz                  | —       | teilw.   | ✓ inkl.         │           │
│   │ Persoenl. Ansprechpartner      | ✓       | ✓        | ✓ Senior        │           │
│   │ Nachts/Wochenend-Submission    | auf Pr. | inkl.    | inkl.           │           │
│   │ Nachforderungen-Begleitung     | optional| ✓ inkl.  | ✓ inkl.         │           │
│   │ Bestpreis pro Submission       | normal  | -10 %    | -20 %           │           │
│   │ Ideal fuer ...                 | <2/Mon  | 2–8/Mon  | 8+/Mon          │           │
│   └────────────────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== 3-KARTEN-PRICING (TOGGLE MONATLICH/JAEHRLICH) ========================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   Modell waehlen                                                                        │
│                                                                                         │
│   monatlich  ●━━━○ jaehrlich   (10 % sparen pill kalku-green)                           │
│                                                                                         │
│   ┌──[Einzelbeauftr.]──┐ ┌──[PAKET M] ●Beliebt┐ ┌──[PAKET L]──────┐                     │
│   │  Selbstkostenbasis │ │  Mittelstand      │ │  Vielnutzer     │                     │
│   │                    │ │                   │ │                 │                     │
│   │  ab 200 €          │ │  3.000 €/Mon      │ │  5.000 €/Mon    │                     │
│   │  pro Ausschreibung │ │  jaehrl. 32.400   │ │  jaehrl. 54.000 │                     │
│   │                    │ │                   │ │                 │                     │
│   │  + 5 % Erfolg      │ │  + 3,9 % Erfolg   │ │  + 2,9 % Erfolg │                     │
│   │                    │ │                   │ │                 │                     │
│   │  Features:         │ │  Features:        │ │  Features:      │                     │
│   │  ✓ Pauschale je    │ │  ✓ Unbegr. LVs    │ │  ✓ Alle aus M   │                     │
│   │    LV-Umfang       │ │  ✓ Recherche inkl │ │  ✓ Gebietsschutz│                     │
│   │  ✓ Erfolgsprov.    │ │  ✓ Nachts-Subm.   │ │  ✓ Senior AP    │                     │
│   │    nur b. Zuschl.  │ │  ✓ NU-Anfragen    │ │  ✓ -20 % Best-  │                     │
│   │  ✓ Keine Grund-    │ │  ✓ Vergabebegl.   │ │    preis        │                     │
│   │    gebuehren       │ │                   │ │                 │                     │
│   │  ✓ Flexibel        │ │                   │ │                 │                     │
│   │                    │ │                   │ │                 │                     │
│   │ [ Anfragen ]       │ │ [ Termin ]        │ │ [ Termin ]      │                     │
│   │  outline           │ │  primary-500 fill │ │  outline        │                     │
│   └────────────────────┘ └───────────────────┘ └─────────────────┘                     │
│                                                                                         │
│   Alle Preise netto zzgl. MwSt. · Monatlich kuendbar · Erfolgsprovision optional bei    │
│   Einzelbeauftragung verhandelbar.                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== FAQ ZU ABRECHNUNG / ERFOLGSPROVISION / KUENDIGUNG ====================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Konditionen-FAQ.                                                                      │
│                                                                                         │
│   [ 🔍 Frage suchen ...                                                              ]  │
│                                                                                         │
│   ── Abrechnung & Bezahlung ──                                                          │
│   ▸ Wann wird die Pauschale faellig?                                          ▾         │
│   ▸ Wann ist die Erfolgsprovision faellig?                                    ▾         │
│   ▸ Was passiert, wenn der Auftraggeber nicht zahlt?                          ▾         │
│   ▸ Wie funktioniert die Bestpreis-Reduzierung in PAKET L?                    ▾         │
│                                                                                         │
│   ── Erfolgsprovision-Edge-Cases ──                                                     │
│   ▸ Was zaehlt als "Zuschlag"? Auch Nebenangebote? Auch Teil-Lose?            ▾         │
│   ▸ Was, wenn wir den Zuschlag erhalten, das Projekt aber nicht ausfuehren?   ▾         │
│   ▸ Provision auf Brutto oder Netto?                                          ▾         │
│   ▸ Provision auf das urspruengliche Angebot oder Schlussrechnung?            ▾         │
│                                                                                         │
│   ── Kuendigung ──                                                                      │
│   ▸ Wie kuendige ich PAKET M oder L?                                          ▾         │
│   ▸ Was passiert mit laufenden Submissionen bei Kuendigung?                   ▾         │
│   ▸ Gibt es eine Mindestlaufzeit?                                             ▾         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== "LOYALITAET & GEBIETSSCHUTZ" GARANTIE-BOXEN ==========================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-kalku-green/5 via-white to-primary-50  py-16                    │
│                                                                                         │
│   ┌─[Eyebrow]──────────┐                                                                │
│   │ ▸ GARANTIE          │ kalku-green                                                   │
│   └─────────────────────┘                                                                │
│                                                                                         │
│   Loyalitaet & Gebietsschutz — schwarz auf weiss.                                       │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐         │
│   │  rounded-3xl border-2 border-kalku-green/20 p-10                         │         │
│   │                                                                           │         │
│   │  ┌────────────────────────────┐  ┌────────────────────────────────────┐ │         │
│   │  │ 🤝 LOYALITAET              │  │ 🗺️ GEBIETSSCHUTZ                   │ │         │
│   │  │                            │  │                                     │ │         │
│   │  │ Pro Ausschreibung arbeiten │  │ Wenn Sie in einem bestimmten        │ │         │
│   │  │ wir ausschliesslich fuer  │  │ Einzugsgebiet und Gewerk aktiv      │ │         │
│   │  │ EIN Unternehmen.           │  │ sind, nehmen wir KEINE weiteren    │ │         │
│   │  │                            │  │ Kunden aus demselben Bereich.       │ │         │
│   │  │ Das ist keine Einschrae-   │  │                                     │ │         │
│   │  │ nkung — es ist eine        │  │ Inkludiert in PAKET L.              │ │         │
│   │  │ Garantie.                  │  │ Optional als Add-on in PAKET M.     │ │         │
│   │  │                            │  │                                     │ │         │
│   │  │ Inkludiert in allen Modell.│  │ Definition: Postleitzahl-Bereich    │ │         │
│   │  │                            │  │ + Gewerk + Optional Wettbewerber-   │ │         │
│   │  │                            │  │ Liste.                              │ │         │
│   │  └────────────────────────────┘  └─────────────────────────────────────┘ │         │
│   └──────────────────────────────────────────────────────────────────────────┘         │
│                                                                                         │
│   Bisher hatten 0 % unserer Bestandskunden Konflikte mit Wettbewerbern in unserer      │
│   Kalkulationsabteilung. ✓ kalku-green                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== MINDEST-VORAUSSETZUNGEN (FILTER) =====================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-12                                                                         │
│                                                                                         │
│   Voraussetzungen fuer eine Zusammenarbeit.                                             │
│   Damit wir Sie effektiv bedienen, sollten Sie mitbringen:                              │
│                                                                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                                  │
│   │ 👥           │  │ 📅           │  │ 📋           │                                  │
│   │ 3 Mitarbeiter│  │ 6 Monate     │  │ 3 Referenz-  │                                  │
│   │              │  │ am Markt     │  │ projekte     │                                  │
│   │ Personelle   │  │ Wirtschaftl. │  │ Im Gewerk    │                                  │
│   │ Leistungs-   │  │ Stabilitaet  │  │ vergleichb.  │                                  │
│   │ faehigkeit   │  │              │  │ Auftraege    │                                  │
│   └──────────────┘  └──────────────┘  └──────────────┘                                  │
│                                                                                         │
│   Unterlagen noch nicht vollstaendig? Kein Problem — wir gehen das gemeinsam durch.    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== FINAL CTA ============================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green  py-16  text-white   │
│                                                                                         │
│   Modell unklar? Lassen Sie uns 5 Minuten reden — wir empfehlen das passende.           │
│                                                                                         │
│   [ Termin: 15 Min  white-cta ]   [ ☎ 0681-410964  glass ]                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| K-1 | Pricing-Vergleichstabelle (Hero) | `#13 Comparison table` (1406-1460) als Hero-Element statt nach unten verschoben | Eyebrow "Konditionen" · H1 "Faire Konditionen. Sie zahlen, wenn wir liefern." · Subzeile · Tabelle 13 Rows × 3 Spalten (Einzel/M/L) mit `renderCell`-Vokabular (✓ / ✗ / 'partial' / String). Highlight-Spalte = PAKET M | keiner direkt, dient Erklaerung | `overflow-x-auto` — Tabelle scrollt horizontal, Spaltenkopf bleibt sticky |
| K-2 | 3-Karten-Pricing + Toggle | `#14 Pricing` (1462-1603) komplett mit Toggle | H2 "Modell waehlen" · Toggle monatlich/jaehrlich · 3 Karten: Einzel ab 200 €+5% (outline-CTA) / PAKET M 3.000 €+3,9% mit "Beliebt"-Pill (primary-fill-CTA) / PAKET L 5.000 €+2,9% (outline-CTA) · Footer-Note | Karte 1: outline "Anfragen" → /kontakt/?topic=einzel · Karte 2: blau "Termin" → /kontakt/#cal · Karte 3: outline "Termin" → /kontakt/#cal | `grid lg:grid-cols-3` → stack vertical; "Beliebt"-Pill bleibt am mittleren Card-Top |
| K-3 | Konditionen-FAQ | `#19 FAQ` (1882-1938) mit Gruppen-Headern (eigene H3 statt flat) | Such-Input · 3 Gruppen (Abrechnung & Bezahlung 4 Q · Erfolgsprovision-Edge-Cases 4 Q · Kuendigung 3 Q) | accordion-toggle | wie Original |
| K-4 | Loyalitaet & Gebietsschutz | `#15 Risk-Reversal / Garantie` (1605-1670) Variante mit 2 Tiles statt 4 | Eyebrow "Garantie" · H2 "Loyalitaet & Gebietsschutz — schwarz auf weiss." · 2 grosse Boxen in `rounded-3xl border-2 border-kalku-green/20`-Wrapper · Footer-Stat "0 % Konflikte" mit gruenem Check | keiner direkt | 2 Boxen stacken vertical innerhalb des grossen Wrapper-Cards |
| K-5 | Mindest-Voraussetzungen | `#15 Risk-Reversal` (1605-1670) als 3-Tile-Variante (kein Wrapper-Card) | H2 "Voraussetzungen fuer eine Zusammenarbeit" · 3 Tiles (3 MA / 6 Mon / 3 Ref) · Empathie-Footer "Unterlagen noch nicht vollstaendig?" verbatim | keiner | `grid sm:grid-cols-3` → 1-spaltig stack |
| K-6 | Final CTA | `#17 Lead-magnet CTA hero` (1763-1847) ohne Preview, zentriert | H2 "Modell unklar? Lassen Sie uns 5 Minuten reden" · 2 CTAs | white-cta "Termin: 15 Min" · glass "☎" → tel: | CTAs full-width stacken |

---

## 4. Ablauf (`/ablauf/`)

```
== HERO =================================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ┌─[Eyebrow]──┐                                                                        │
│   │ ▸ ABLAUF    │ primary-50                                                            │
│   └─────────────┘                                                                        │
│                                                                                         │
│   So laeuft eine Zusammenarbeit ab.                                                     │
│   text-4xl bold                                                                         │
│                                                                                         │
│   Vom Erstgespraech bis zum Vergabeergebnis. 5 Schritte, klar definiert.                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== 5-SCHRITTE-TIMELINE GROSS ============================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   ┌─[01 ERSTGESPRAECH]─────────────────────────────────────────────────────────┐       │
│   │  ☎ primary-100   |  5–10 Minuten                                            │       │
│   │                                                                              │       │
│   │  In einem kurzen Telefonat besprechen wir Gewerke, Zielregion und           │       │
│   │  Kalkulationsgrundlagen: Mittellohn, Verrechnungssaetze, Zuschlaege.        │       │
│   │                                                                              │       │
│   │  ┌─[Was Sie tun]──────────────┐    ┌─[Was wir tun]─────────────────┐       │       │
│   │  │ • Termin buchen (Cal.com)  │    │ • Einzugsgebiet abfragen      │       │       │
│   │  │ • Telefon abnehmen         │    │ • Mindestvoraussetzungen pr.  │       │       │
│   │  │ • Eckdaten nennen          │    │ • Erste Empfehlung geben      │       │       │
│   │  └────────────────────────────┘    └────────────────────────────────┘       │       │
│   └──────────────────────────────────────────────────────────────────────────────┘       │
│                                  ↓                                                       │
│   ┌─[02 BEAUFTRAGUNG & VOLLMACHT]─────────────────────────────────────────────┐         │
│   │  ✍ purple-100   |  Tag 1                                                  │         │
│   │                                                                            │         │
│   │  Vollmacht fuer Materialpreisanfragen und Einreichung im Namen Ihres      │         │
│   │  Unternehmens. KALKU tritt nach aussen als interne Kalkulationsabteilung. │         │
│   │                                                                            │         │
│   │  ┌─[Was Sie tun]──────────────┐    ┌─[Was wir tun]─────────────────┐     │         │
│   │  │ • Vollmacht unterschreiben │    │ • Vorlage senden              │     │         │
│   │  │ • Eckdaten Mittellohn etc. │    │ • Lieferanten-Pool aktivieren │     │         │
│   │  │ • Zugaenge fuer Vergabe-   │    │ • Mailing-Templates anpassen  │     │         │
│   │  │   plattformen freigeben    │    │                                │     │         │
│   │  └────────────────────────────┘    └────────────────────────────────┘     │         │
│   └────────────────────────────────────────────────────────────────────────────┘         │
│                                  ↓                                                       │
│   ┌─[03 KALKULATION & EINSICHT]──────────────────────────────────────────────┐          │
│   │  🧮 amber-100   |  24–48 h pro LV                                         │          │
│   │                                                                            │          │
│   │  Jede Position einzeln kalkuliert. Sie erhalten die fertige Kalkulation   │          │
│   │  zur Einsicht — inkl. Personalaufwand und Gesamtkosten. Aenderungen werden│          │
│   │  eingearbeitet.                                                            │          │
│   │                                                                            │          │
│   │  ┌─[Was Sie tun]──────────────┐    ┌─[Was wir tun]─────────────────┐     │          │
│   │  │ • LV-Datei hochladen       │    │ • LV-Pruefung & Klassifiz.    │     │          │
│   │  │ • Kalkulation pruefen      │    │ • Lieferanten anfragen        │     │          │
│   │  │ • Aenderungen melden       │    │ • Position fuer Position kalk.│     │          │
│   │  └────────────────────────────┘    └────────────────────────────────┘     │          │
│   └────────────────────────────────────────────────────────────────────────────┘         │
│                                  ↓                                                       │
│   ┌─[04 FRISTGERECHTE EINREICHUNG]───────────────────────────────────────────┐          │
│   │  📤 kalku-green/10   |  vor Submission-Termin                             │          │
│   │                                                                            │          │
│   │  Das Vergabeteam reicht das Angebot in Ihrem Namen ein. Auch kurzfristige  │          │
│   │  Abgaben werden eingehalten — wenn noetig ueber Nacht oder am Wochenende. │          │
│   │                                                                            │          │
│   │  ┌─[Was Sie tun]──────────────┐    ┌─[Was wir tun]─────────────────┐     │          │
│   │  │ • Angebotsdatei freigeben  │    │ • Formblaetter 221/223/Ur-    │     │          │
│   │  │ • Eignungsnachweise        │    │   kalkulation erstellen       │     │          │
│   │  │   beilegen                 │    │ • Auf Vergabeplattform laden  │     │          │
│   │  │                            │    │ • Submission-Termin pruefen   │     │          │
│   │  └────────────────────────────┘    └────────────────────────────────┘     │          │
│   └────────────────────────────────────────────────────────────────────────────┘         │
│                                  ↓                                                       │
│   ┌─[05 ERGEBNIS & NACHBEREITUNG]────────────────────────────────────────────┐          │
│   │  🏆 emerald-100   |  bei Vergabeergebnis                                  │          │
│   │                                                                            │          │
│   │  Vergabeergebnis wird direkt weitergeleitet. Bei Zuschlag: Unterstuetzung │          │
│   │  bei Nachforderungen und Vergabegespraechen.                              │          │
│   │                                                                            │          │
│   │  ┌─[Was Sie tun]──────────────┐    ┌─[Was wir tun]─────────────────┐     │          │
│   │  │ • Zuschlag annehmen / ab.  │    │ • Vergabe-Doku archivieren    │     │          │
│   │  │ • Auftrag ausfuehren       │    │ • Begleitung Vergabegespraech │     │          │
│   │  │                            │    │ • Bei nicht-oeffentl. Aussch. │     │          │
│   │  │                            │    │   Nachverfolgung Zu/Absage    │     │          │
│   │  └────────────────────────────┘    └────────────────────────────────┘     │          │
│   └────────────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== ABLAUF-FAQ ===========================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Ablauf-FAQ.                                                                           │
│                                                                                         │
│   [ 🔍 Frage suchen ...                                                              ]  │
│                                                                                         │
│   ▸ Was muss ich beim Erstgespraech mitbringen?                              ▾          │
│   ▸ Wie lange dauert die Vollmacht-Erstellung?                                ▾          │
│   ▸ Was, wenn ich die Kalkulation aendern moechte?                            ▾          │
│   ▸ Was, wenn der Submission-Termin morgen ist?                               ▾          │
│   ▸ Wie sehe ich den Stand meiner laufenden Submissionen?                     ▾          │
│   ▸ Welche Vergabeplattformen unterstuetzen Sie?                              ▾          │
│   ▸ Was passiert bei einem Vergabegespraech / Bietergespraech?                ▾          │
│   ▸ Brauche ich eine Praequalifikation?                                       ▾          │
│   ▸ Unser Betrieb besteht erst seit 1 Jahr — geht das?                        ▾          │
│   ▸ Koennen Sie auch fuer unsere Wettbewerber kalkulieren?                    ▾          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CTA ==================================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green  py-16  text-white   │
│                                                                                         │
│   Klingt gut? Lassen Sie uns starten.                                                   │
│                                                                                         │
│   [ Termin: 15 Min  white-cta ]   [ Konditionen ansehen → glass ]                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| A-1 | Hero | `#2 Hero — split copy + UI mockup` (453-633) ohne Mockup, single-column | Eyebrow "Ablauf" · H1 "So laeuft eine Zusammenarbeit ab." · Subzeile | scrollTo(#timeline) (impliziert) | full-width centered |
| A-2 | 5-Schritte-Timeline gross | `#16 Onboarding journey` (1672-1761) Pattern in vertikaler Stack-Variante mit Pfeil-Connectors zwischen Karten | 5 Schritt-Karten je mit Phase-Pill (Zeitangabe), Icon, Titel, Body verbatim aus Audit, plus Sub-Karte mit "Was Sie tun" / "Was wir tun" 2-Spalten-Block | keiner direkt | Karten stacken sowieso vertical, "Was Sie/Wir tun"-Block kollabiert auf 1-spaltig |
| A-3 | Ablauf-FAQ | `#19 FAQ` (1882-1938) | Such-Input · 10 prozessbezogene Fragen (Erstgespraech, Vollmacht, Aenderungen, Termin morgen, Stand, Vergabeplattformen, Bietergespraech + 3 Irrtumsfragen) | accordion-toggle | wie Original |
| A-4 | CTA | `#17 Lead-magnet CTA hero` (1763-1847) zentriert | H2 "Klingt gut? Lassen Sie uns starten." · 2 CTAs | white-cta "Termin: 15 Min" → /kontakt/#cal · glass "Konditionen ansehen" → /konditionen/ | CTAs full-width stacken |

---

## 5. Über uns (`/ueber-uns/`)

```
== INHABER-HERO MIT FOTO ================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-16 bg-white                                                                   │
│                                                                                         │
│   ┌─[Linke 50% — Foto]─────────┐    ┌─[Rechte 50% — Vita]──────────────────┐           │
│   │   ┌──────────────────┐     │    │  ▸ INHABER & GRUENDER                  │           │
│   │   │                   │     │    │                                        │           │
│   │   │                   │     │    │  Alaatdin Coksari                      │           │
│   │   │   Foto-Portrait   │     │    │  text-5xl bold                         │           │
│   │   │   Coksari         │     │    │                                        │           │
│   │   │   rounded-3xl     │     │    │  Inhaber & Gruender                    │           │
│   │   │   shadow-2xl      │     │    │                                        │           │
│   │   │                   │     │    │  >> "Wir sind auf Kalkulation und     │           │
│   │   │                   │     │    │     Einreichung von oeffentlichen     │           │
│   │   │                   │     │    │     Ausschreibungen spezialisiert."   │           │
│   │   └───────────────────┘     │    │                                        │           │
│   │                              │    │  Ausgebildet im Handwerk, kalkuliert  │           │
│   │   Saarbruecken               │    │  seit 18 Jahren oeffentliche          │           │
│   │   Berliner Promenade 15      │    │  Ausschreibungen. Gruender von KALKU  │           │
│   │   66111 Saarbruecken         │    │  2024 nach 14 Jahren als Kalkulator   │           │
│   │                              │    │  in mittelstaendischen Bauunter-      │           │
│   │   📍 → Anfahrt                │    │  nehmen.                              │           │
│   │                              │    │                                        │           │
│   │                              │    │  [ Termin direkt mit Coksari  green ]│           │
│   └──────────────────────────────┘    └────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== VIER-TEAMS-DETAIL ====================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   Wer sind die vier Teams?                                                              │
│                                                                                         │
│   ┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐    │
│   │ 📊 KALKULATIONSTEAM                  │  │ 🛒 EINKAUFSTEAM                      │    │
│   │ primary-100                          │  │ kalku-green/10                       │    │
│   │                                      │  │                                      │    │
│   │ Handwerker und Bauingenieure –       │  │ Ermittelt parallel Materialpreise   │    │
│   │ teilweise mit ueber 20 Jahren        │  │ und Entsorgungskosten. Stellt bei   │    │
│   │ Kalkulationserfahrung. Die Kombi-    │  │ Bedarf NU-Anfragen im regionalen    │    │
│   │ nation aus Praxiswissen und          │  │ Umfeld. Keine Preisluecken in der    │    │
│   │ Ingenieursexpertise sorgt fuer       │  │ Kalkulation.                         │    │
│   │ realistische Zeitwerte.              │  │                                      │    │
│   │                                      │  │ Tools: KALKU-Procurement Anfrage-   │    │
│   │ Spezialisiert auf: Mittellohn-       │  │ tool, KI-Lieferantensuche, OneDrive  │    │
│   │ ermittlung, Verrechnungssaetze,      │  │ Material-Archiv.                     │    │
│   │ Erfahrungswerte, Formblaetter.       │  │                                      │    │
│   └──────────────────────────────────────┘  └──────────────────────────────────────┘    │
│   ┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐    │
│   │ 📋 VERGABETEAM                       │  │ 🔍 RECHERCHETEAM                     │    │
│   │ amber-100                            │  │ purple-100                           │    │
│   │                                      │  │                                      │    │
│   │ Spezialisiert auf Vergaberecht.      │  │ Durchsucht woechentlich alle         │    │
│   │ Regelmaessige Fortbildungen. Feste   │  │ relevanten Plattformen nach          │    │
│   │ Ansprechperson pro Kunde. Fehler-    │  │ passenden Ausschreibungen. Kein      │    │
│   │ freie Einreichung und Minimierung    │  │ Kunde verpasst eine Chance, weil     │    │
│   │ von Ausschlussrisiken.               │  │ die Recherche im Tagesgeschaeft     │    │
│   │                                      │  │ untergeht.                           │    │
│   │ Kompetenzen: VOB/A, VOB/B, VgV,      │  │                                      │    │
│   │ EFB-Preisblaetter, Bietergespraeche, │  │ Plattformen: DTVP, evergabe.de,      │    │
│   │ Nachforderungen.                     │  │ regionale Vergabeplattformen,        │    │
│   │                                      │  │ Submission-Boersen.                  │    │
│   └──────────────────────────────────────┘  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== STANDORT SAARBRUECKEN ================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Standort Saarbruecken — bundesweit taetig.                                            │
│                                                                                         │
│   ┌─[Karte / Map-Embed]──────────────┐   ┌─[Adresse + Kontakt]─────────────────┐        │
│   │                                   │   │                                      │        │
│   │   ┌────────────────────────┐     │   │   KALKU                              │        │
│   │   │  ◯ ◯ ◯                 │     │   │   Inh. Alaatdin Coksari              │        │
│   │   │       ●                │     │   │                                      │        │
│   │   │   Saarbruecken         │     │   │   Berliner Promenade 15              │        │
│   │   │   ─── A6 ───           │     │   │   66111 Saarbruecken                 │        │
│   │   │   ◯ Voelklingen        │     │   │                                      │        │
│   │   │   Map iframe (OSM)     │     │   │   ☎ 0681-41096430                  │        │
│   │   │                        │     │   │   ☎ wa.me/4915167671877            │        │
│   │   └────────────────────────┘     │   │   ✉ info@kalku.de                  │        │
│   │                                   │   │                                      │        │
│   │   [ Anfahrt ueber Google Maps ↗ ]│   │   USt-ID: DE334890692               │        │
│   └───────────────────────────────────┘   └──────────────────────────────────────┘        │
│                                                                                         │
│   >> "Kalku arbeitet fuer Bauunternehmen in ganz Deutschland.                           │
│      Die Recherche nach Ausschreibungen erfolgt im Einzugsgebiet des Kunden."           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== WERTE-STATEMENT ======================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-slate-50 via-white to-primary-50  py-16                         │
│                                                                                         │
│   Was uns wichtig ist.                                                                  │
│                                                                                         │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                        │
│   │ ⚖️          │  │ 🤝         │  │ 🛡️          │  │ 📊         │                        │
│   │ Trans-     │  │ Loyalitaet │  │ Vertrau-   │  │ Realismus  │                        │
│   │ parenz     │  │            │  │ lichkeit   │  │            │                        │
│   │            │  │            │  │            │  │            │                        │
│   │ Sichtbare  │  │ Pro Aussch.│  │ NDA mit    │  │ Reale Zeit-│                        │
│   │ Preise,    │  │ nur EIN    │  │ jedem Kun- │  │ werte aus  │                        │
│   │ klare      │  │ Kunde.     │  │ den. Daten-│  │ dem Hand-  │                        │
│   │ Konditionen│  │ Kein Konfl.│  │ schutz nach│  │ werk, nicht│                        │
│   │            │  │            │  │ DSGVO.     │  │ Lehrbuch.  │                        │
│   └────────────┘  └────────────┘  └────────────┘  └────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== WERDEGANG-TIMELINE ===================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Werdegang.                                                                            │
│                                                                                         │
│   ●─── 2008 ─────  Ausbildung im Handwerk (Bau)                                         │
│   │                                                                                     │
│   ●─── 2012 ─────  Quereinstieg Kalkulation (Hochbau)                                   │
│   │                                                                                     │
│   ●─── 2015 ─────  Erste eigene Submission als Kalkulationsleiter                       │
│   │                                                                                     │
│   ●─── 2020 ─────  Spezialisierung auf VOB/A oeffentliche Ausschreibungen               │
│   │                                                                                     │
│   ●─── 2024 ─────  Gruendung KALKU Saarbruecken                                         │
│   │                                                                                     │
│   ●─── 2025 ─────  Aufbau Vier-Teams-Struktur (Kalk/Einkauf/Vergabe/Recherche)          │
│   │                                                                                     │
│   ●─── 2026 ─────  KALKU-Procurement-Tool live · 7 Gewerke produktiv                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== PRESSEMITTEILUNGEN-SLOT (PLACEHOLDER FUER SPAETER) ===================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   Presse & Auszeichnungen.                                                              │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐         │
│   │  Aktuell keine Pressemitteilungen.                                        │         │
│   │  Wir geben Erstinterviews gerne — bitte ueber info@kalku.de.             │         │
│   │                                                                            │         │
│   │  Pressekontakt: Alaatdin Coksari · 0681-41096430 · info@kalku.de          │         │
│   └──────────────────────────────────────────────────────────────────────────┘         │
│                                                                                         │
│   (Slot fuer kuenftige Pressemitteilungen, Logos der Medien, Awards.)                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CTA ==================================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green  py-16  text-white   │
│                                                                                         │
│   Lust auf ein Gespraech?                                                               │
│                                                                                         │
│   [ Termin: 15 Min  white-cta ]   [ ☎ direkt mit Coksari  glass ]                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| U-1 | Inhaber-Hero mit Foto | `#20 Founder/team trust block` (1940-2052) als Hero-Variante mit grossem Foto links | Foto Coksari rounded-3xl shadow-2xl + Adresse-Block · Eyebrow "Inhaber & Gruender" · H1 "Alaatdin Coksari" · Untertitel · Verbatim-Quote + Vita-Absatz | green "Termin direkt mit Coksari" → /kontakt/#cal | Foto rueckt nach oben, kleiner; Vita darunter |
| U-2 | Vier-Teams-Detail | `#6 Features grid` (800-924) als 2x2-Layout mit ausfuehrlicheren Bodies | 4 Karten mit den verbatim Team-Beschreibungen aus Audit + jeweils 2-3 Zeilen Tools/Kompetenzen | keiner | `grid lg:grid-cols-2` → 1-spaltig stack |
| U-3 | Standort Saarbruecken | NEU — 2-Spalten-Layout mit Map-iframe (OSM oder Google Maps) + Adress-Karte. Verwandt mit `#21 Contact section` (2054-2291) | Linke Spalte: OSM-iframe Saarbruecken zentriert auf Berliner Promenade 15 mit Marker · Rechte Spalte: Adresse-Karte mit Tel/WA/E-Mail/USt-ID + Anfahrt-Link · Footer-Quote verbatim | "Anfahrt ueber Google Maps" → maps.google.com/... | 2 Spalten stacken; Map bleibt sichtbar mit `min-h-[300px]` |
| U-4 | Werte-Statement | `#15 Risk-Reversal / Garantie` (1605-1670) 4-Tile-Variante ohne Wrapper | H2 "Was uns wichtig ist" · 4 Tiles (Transparenz / Loyalitaet / Vertraulichkeit / Realismus) je mit Icon und Body | keiner | `grid sm:grid-cols-2 lg:grid-cols-4` → 2x2 mobile |
| U-5 | Werdegang-Timeline | NEU — Komponente `<VerticalTimeline>` (vertikale Variante von `#5 How-it-works` 737-798 mit dot-on-line statt Karten) | Vertikale Linie mit 7 Datums-Punkten (2008–2026) je 1 kurzer Beschreibung | keiner | bleibt 1-spaltig sowieso; Linie kollabiert auf links-aligned |
| U-6 | Pressemitteilungen-Slot | `#15 Risk-Reversal` (1605-1670) Wrapper-Card als Empty-State | H2 "Presse & Auszeichnungen" · Empty-State-Body mit Pressekontakt | mailto:info@kalku.de | 1-spaltig sowieso |
| U-7 | CTA | `#17 Lead-magnet CTA hero` (1763-1847) zentriert | H2 "Lust auf ein Gespraech?" · 2 CTAs | white-cta "Termin: 15 Min" · glass "☎ direkt mit Coksari" → tel: | CTAs full-width stacken |

---

## 6. Referenzen (`/referenzen/` + `/referenzen/[slug]/`)

```
== HERO + FILTER ========================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ┌─[Eyebrow]──────┐                                                                    │
│   │ ▸ REFERENZEN    │ kalku-green/10                                                    │
│   └─────────────────┘                                                                    │
│                                                                                         │
│   Anonymisiert. Aber mit echten Zahlen.                                                 │
│   text-4xl bold                                                                         │
│                                                                                         │
│   Wir nennen keine Kundennamen ohne Freigabe — aus Loyalitaet. Auf Wunsch organisieren  │
│   wir gerne einen Referenz-Anruf mit einem unserer Bestandskunden.                      │
│                                                                                         │
│   ┌─[Filter]───────────────────────────────────────────────────────────────────┐       │
│   │ Gewerk:  [Alle ▾] [GaLaBau emerald] [Tiefbau sky] [Leitungsbau teal]      │       │
│   │          [Elektro yellow] [Haustechnik orange] [Fenster blue] [Schadstoff red]│   │
│   │ Region:  [Alle ▾] [Saarland] [Rheinland-Pfalz] [Hessen] [NRW] [BW] [andere]│      │
│   │ MA-Groesse: [Alle ▾] [< 10] [10–25] [26–50] [50+]                          │       │
│   └─────────────────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CASE-CARD GRID =======================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   ┌─[Tiefbau Saarland]──┐ ┌─[GaLaBau NRW]───────┐ ┌─[Elektro BW]────────┐               │
│   │ from-sky-50         │ │ from-emerald-50     │ │ from-yellow-50      │               │
│   │ border-sky-300      │ │ border-emerald-300  │ │ border-yellow-300   │               │
│   │                     │ │                     │ │                     │               │
│   │ 🏗️                   │ │ 🌿                  │ │ ⚡                   │               │
│   │ Tiefbau · 12 MA     │ │ GaLaBau · 18 MA     │ │ Elektro · 25 MA     │               │
│   │ Saarland            │ │ NRW                 │ │ BW                  │               │
│   │                     │ │                     │ │                     │               │
│   │ 40 → 4 h/LV         │ │ 6 → 18 LVs/Jahr     │ │ 14 → 31 % Quote     │               │
│   │ 1 → 4 Zuschlaege    │ │ 2 → 7 Zuschlaege    │ │ 1,8 → 4,2 Mio €     │               │
│   │ ⌀ 280 k € Volumen   │ │ +12 % Mittellohn    │ │ 8 → 26 LVs/Jahr     │               │
│   │                     │ │                     │ │                     │               │
│   │ → Detail-Case       │ │ → Detail-Case       │ │ → Detail-Case       │               │
│   └─────────────────────┘ └─────────────────────┘ └─────────────────────┘               │
│   ┌─[Haustechnik HE]────┐ ┌─[Leitungsbau RLP]───┐ ┌─[Fenster Bayern]───┐               │
│   │ from-orange-50      │ │ from-teal-50        │ │ from-blue-50       │               │
│   │ border-orange-300   │ │ border-teal-300     │ │ border-blue-300    │               │
│   │ ...                 │ │ ...                 │ │ ...                │               │
│   └─────────────────────┘ └─────────────────────┘ └────────────────────┘               │
│   ┌─[Schadstoff BW]─────┐ ┌─[GaLaBau Saar]──────┐ ┌─[Tiefbau Hessen]───┐               │
│   │ from-red-50         │ │ from-emerald-50     │ │ from-sky-50        │               │
│   │ ...                 │ │ ...                 │ │ ...                │               │
│   └─────────────────────┘ └─────────────────────┘ └────────────────────┘               │
│                                                                                         │
│   [ Mehr laden ▾ ]                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== REFERENZ-ANRUF CTA ===================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green  py-16  text-white   │
│                                                                                         │
│   Sie wollen einen unserer Bestandskunden direkt anrufen?                               │
│                                                                                         │
│   Kein Problem. Sagen Sie uns, welches Gewerk und welche Region Sie interessiert —      │
│   wir vermitteln innerhalb von 24 h einen Referenz-Anruf.                               │
│                                                                                         │
│   [ Referenz-Anruf anfragen  white-cta ]                                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

```
== /referenzen/[slug]/ — DETAIL-SEITE EINER CASE (optional) =============================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ← Zurueck zu allen Referenzen                                                         │
│                                                                                         │
│   🏗️ Tiefbau-Mittelstand · Saarland · 12 MA · 7,4 Mio € Umsatz                         │
│   text-3xl bold                                                                         │
│                                                                                         │
│   Eine Case mit harten Zahlen.                                                          │
│                                                                                         │
│   ┌─[Vorher / Nachher Vollbild]──────────────────────────────────────────────┐         │
│   │ from-sky-50  border-sky-300  rounded-2xl                                 │         │
│   │                                                                            │         │
│   │ ┌─[Stunden/LV]───┐ ┌─[Submissions]──┐ ┌─[Zuschlaege]──┐ ┌─[Volumen]──┐  │         │
│   │ │ 40 h → 4 h     │ │ 8 → 26 /Jahr    │ │ 1 → 9 von 26  │ │ 280 → 1,2M  │  │         │
│   │ │ -90 % intern   │ │ + 225 %         │ │ Quote 12→35 % │ │ ⌀ je Zusch. │  │         │
│   │ └────────────────┘ └─────────────────┘ └───────────────┘ └─────────────┘  │         │
│   └────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                         │
│   Die Ausgangslage:                                                                     │
│                                                                                         │
│   12-MA-Tiefbauunternehmen aus dem Saarland. Ein interner Kalkulator (Inhaber selbst)  │
│   zustaendig fuer alle Submissionen. Bis 2024: 8 Submissionen/Jahr, davon 1 Zuschlag.  │
│   Die meisten Submissionen wurden gar nicht abgegeben — Frist nicht geschafft.         │
│                                                                                         │
│   Die Loesung mit KALKU:                                                                │
│                                                                                         │
│   PAKET M (3.000 €/Mon + 3,9 % Erfolgsprovision). Recherche-Team identifiziert         │
│   woechentlich passende Tiefbau-Submissionen im Saarland und RLP. Kalkulationsteam     │
│   bepreist innerhalb von 48 h. Vergabeteam reicht ein.                                  │
│                                                                                         │
│   Das Ergebnis 2025:                                                                    │
│                                                                                         │
│   • 26 Submissionen abgegeben (statt 8)                                                 │
│   • 9 Zuschlaege erhalten (statt 1)                                                     │
│   • Zuschlagsquote 35 % (statt 12 %)                                                    │
│   • 4 Stunden Inhaber-Zeit pro Submission (statt 40 h)                                  │
│                                                                                         │
│   "Wir haben in 2025 mehr Auftragsvolumen gewonnen als in den 3 Jahren davor zusammen  │
│    — und das mit weniger Buero-Aufwand. Die Vier-Teams-Struktur klingt erst nach        │
│    Marketing, aber jeder kennt seinen Kollegen, jeder weiss meine Konditionen, niemand  │
│    fragt zweimal nach."                                                                 │
│   — Geschaeftsfuehrer (Name auf Wunsch verfuegbar fuer Referenz-Anruf)                  │
│                                                                                         │
│   ── Verwandte Cases ──                                                                 │
│   ┌─[GaLaBau Saar]─┐ ┌─[Tiefbau Hessen]─┐ ┌─[Leitungsbau RLP]─┐                         │
│   │ ...             │ │ ...               │ │ ...               │                         │
│   └─────────────────┘ └───────────────────┘ └───────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| R-1 | Hero + Filter | `#2 Hero` (453-633) reduziert + Filter-Bar (NEU, basiert auf Trade-Pills aus Hero-Trust-Badge-Pattern) | Eyebrow "Referenzen" · H1 "Anonymisiert. Aber mit echten Zahlen." · Erklaerung zur Anonymisierung · 3 Filter-Reihen (Gewerk Trade-Color-Pills / Region / MA-Groesse) | Filter triggern Re-Query der Karten unten | Filter werden zu Dropdowns (1 pro Zeile) statt Pills |
| R-2 | Case-Card Grid | `#9 Detailed case studies (3 metric-table cards)` (1188-1300) als endloses Grid mit "Mehr laden" | 9–12 Karten initial, je mit Trade-Color-Background, Branche+Region+MA, 3 Vorher-Nachher-Metriken, "→ Detail-Case" Link | je Karte → /referenzen/[slug]/ + "Mehr laden" → Pagination | `grid lg:grid-cols-3` → 1-spaltig stack |
| R-3 | Referenz-Anruf CTA | `#17 Lead-magnet CTA hero` (1763-1847) ohne Preview-Karte | H2 "Sie wollen einen unserer Bestandskunden direkt anrufen?" · Subzeile · 1 CTA | white-cta "Referenz-Anruf anfragen" → /kontakt/?topic=referenz-anruf | CTA full-width |
| R-D-1 | Detail-Case Hero | NEU — Kombiniert `#9 Case studies` (1188-1300) Karten-Pattern als Vollbild-Block | Trade-Icon + Branche+Region+MA+Umsatz · 4 Vorher-Nachher-Metriken im Vollbild-Wrapper | Backlink "← Zurueck" | Metriken stacken 2x2 |
| R-D-2 | Long-Form Story | NEU — Standard `<article>` mit `prose`-Klasse | 4 H3-Bloecke (Ausgangslage / Loesung mit KALKU / Ergebnis / Quote) mit Body-Copy | keiner | `prose-lg` → `prose-base` mobile |
| R-D-3 | Verwandte Cases | `#11 Industry-specific demo selector` (1312-1358) Pattern | 3 verwandte Karten | je → /referenzen/[slug]/ | stack vertical |

---

## 7. GAEB-Konverter (`/tools/gaeb-konverter/`)

```
== HERO =================================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ┌─[Eyebrow]──────┐                                                                    │
│   │ ▸ KOSTENLOSES TOOL│ kalku-green/10                                                  │
│   └────────────────┘                                                                    │
│                                                                                         │
│   GAEB-Konverter.                                                                       │
│   Aus .x83 wird Excel — in 30 Sekunden.                                                 │
│   text-5xl bold                                                                         │
│                                                                                         │
│   Sie haben ein GAEB-LV vom oeffentlichen Auftraggeber bekommen, koennen die Datei     │
│   aber mit Ihrer Software nicht oeffnen? Hier ohne Anmeldung konvertieren — die Datei   │
│   verlaesst nie Ihren Browser.                                                          │
│                                                                                         │
│   Unterstuetzt: GAEB X81 · X83 · X84 · D81 · D83 · D84 · P83 · P84                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== DRAG&DROP-BEREICH ====================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐         │
│   │  border-2 border-dashed border-primary-300 rounded-2xl                   │         │
│   │  bg-white p-12 text-center                                                │         │
│   │                                                                           │         │
│   │           ┌───────────┐                                                   │         │
│   │           │   📤      │  primary-500                                      │         │
│   │           │   GAEB    │                                                   │         │
│   │           └───────────┘                                                   │         │
│   │                                                                           │         │
│   │       Dateien hierher ziehen.                                             │         │
│   │                                                                           │         │
│   │       Oder:                                                               │         │
│   │       [ Datei auswaehlen ... ]                                            │         │
│   │                                                                           │         │
│   │       Akzeptiert: .x81 .x83 .x84 .d81 .d83 .d84 .p83 .p84                 │         │
│   │       Max. 50 MB pro Datei.                                               │         │
│   │                                                                           │         │
│   │       🔒 Datei verlaesst nie Ihren Browser. 100 % client-seitig.         │         │
│   └───────────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== PARSER-RESULT-PREVIEW (NACH UPLOAD) ==================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16  (animiert eingeblendet nach Parser-Run)                                │
│                                                                                         │
│   ✓ Erfolgreich geparst.                                                                │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐         │
│   │  Datei: schulhof-neubau-LV.x83 · 142 Positionen · 2,1 MB                  │         │
│   │  GAEB-Version: 3.2 · Format: X83 · Erstellt: 04.05.2026                  │         │
│   ├──────────────────────────────────────────────────────────────────────────┤         │
│   │  Pos    | Kurztext                  | Menge   | Einheit | LZ    | EP   │         │
│   │  01.001 | Mutterboden abtragen      | 2 800   | m³      | OZ    |  __  │         │
│   │  01.002 | Schotter 0/45 liefern     | 1 250   | t       | OZ    |  __  │         │
│   │  01.003 | Pflaster Naturstein       |   420   | m²      | OZ    |  __  │         │
│   │  01.004 | Bewehrungsstahl B500B     |    14   | t       | OZ    |  __  │         │
│   │  01.005 | Beton C25/30              |   320   | m³      | OZ    |  __  │         │
│   │  ...    | (137 weitere Positionen)  |         |         |       |      │         │
│   └──────────────────────────────────────────────────────────────────────────┘         │
│                                                                                         │
│   [ ⬇ Excel-Download ]   [ ⬇ PDF-Druckansicht ]   [ Andere Datei laden ]                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== "PREMIUM-AUSWERTUNG KOSTENLOS PER MAIL" ==============================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green  py-16  text-white   │
│                                                                                         │
│   ┌─[Linke 60%]─────────────────┐  ┌─[Rechte 40%: Beispiel-Karte]──────────┐           │
│   │ ▸ PREMIUM (KOSTENLOS)        │  │  bg-white text-gray-900               │           │
│   │                              │  │  ┌──── Beispiel-Auswertung ────┐     │           │
│   │ KI-Klassifizierung des LV   │  │  │ Schulhof-Neubau · 142 Pos     │     │           │
│   │ kostenlos per E-Mail.        │  │  │                                │     │           │
│   │ text-4xl bold white          │  │  │ Schuettgueter      18 Pos     │     │           │
│   │                              │  │  │ Beton              14 Pos     │     │           │
│   │ Wir analysieren Ihr LV mit   │  │  │ Bewehrungsstahl    11 Pos     │     │           │
│   │ unserer KI:                  │  │  │ Naturstein         22 Pos     │     │           │
│   │                              │  │  │ Pflanzung          38 Pos     │     │           │
│   │ ✓ Klassifizierung jeder      │  │  │ Eigenleistung      39 Pos     │     │           │
│   │   Position in Gewerke und   │  │  │                                │     │           │
│   │   Kategorien                 │  │  │ Erkannte Hersteller:           │     │           │
│   │ ✓ Hersteller-Detection       │  │  │ Tiger · Jura · Wienerberger   │     │           │
│   │ ✓ Lieferanten-Vorschlaege    │  │  └────────────────────────────────┘     │           │
│   │ ✓ Marktpreis-Bandbreiten     │  │                                       │           │
│   │   pro Kategorie              │  │  PDF kommt per E-Mail innerhalb       │           │
│   │                              │  │  von 5 Minuten.                       │           │
│   │ [ ihre@email.de         ]    │  │                                       │           │
│   │                              │  │                                       │           │
│   │ [ KI-Auswertung holen white]│  │                                       │           │
│   │                              │  │                                       │           │
│   │ Wir senden ein PDF + 1 Mail. │  │                                       │           │
│   │ Kein Newsletter, kein Spam. │  │                                       │           │
│   └──────────────────────────────┘  └────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== TRUST-BLOCK (DATENSCHUTZ) ============================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-12                                                                         │
│                                                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                                │
│   │ 🔒        │  │ 🇩🇪       │  │ 🚫        │  │ ⏱️        │                                │
│   │ 100 %    │  │ Hosting  │  │ Keine    │  │ Auto-    │                                │
│   │ client-  │  │ in DE    │  │ Daten-   │  │ Loesch.  │                                │
│   │ seitig   │  │          │  │ Speicher.│  │ nach 24h │                                │
│   │          │  │          │  │ Premium  │  │ (Premium)│                                │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== TOOL-FAQ =============================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   Haeufige Fragen zum GAEB-Konverter.                                                   │
│                                                                                         │
│   ▸ Was ist GAEB?                                                            ▾          │
│   ▸ Welche GAEB-Versionen werden unterstuetzt?                               ▾          │
│   ▸ Wie sicher ist meine Datei?                                              ▾          │
│   ▸ Was ist der Unterschied zwischen X83 und D83?                            ▾          │
│   ▸ Kann ich auch GAEB-Dateien aus AVA-Programmen konvertieren?              ▾          │
│   ▸ Was ist die "KI-Auswertung" zusaetzlich?                                 ▾          │
│   ▸ Welches Excel-Format kommt raus?                                         ▾          │
│   ▸ Funktioniert das auch mit GAEB 90 (D81/D83)?                             ▾          │
│   ▸ Ich bekomme einen Parsing-Fehler — was tun?                              ▾          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CROSS-CTA: KALKULATIONSDIENSTLEISTUNG ================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│            Datei konvertiert — und jetzt bepreisen?                                     │
│                                                                                         │
│            Wir uebernehmen die komplette Kalkulation. 48 h Bearbeitung,                 │
│            Festpreis ab 200 €. Sie unterschreiben.                                      │
│                                                                                         │
│            [ Kalkulation anfragen → /kontakt/  green ]                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| GK-1 | Hero | `#2 Hero` (453-633) ohne Mockup, einseitig | Eyebrow "Kostenloses Tool" · H1 "GAEB-Konverter. Aus .x83 wird Excel — in 30 Sekunden." · Body mit Use-Case · Format-Liste | scrollTo(#dropzone) impliziert | full-width centered |
| GK-2 | Drag&Drop-Bereich | NEU — Komponente `<DropZone>` (basiert auf Browser-Mock-Stil + dashed border aus dem Lead-Magnet-Pattern) | Dashed-Border-Bereich · GAEB-Datei-Icon · "Dateien hierher ziehen" · "Datei auswaehlen"-Button · Format-Liste · 100%-client-seitig-Trust-Note | "Datei auswaehlen" → File-Picker, dann Parser-Run | Bereich bleibt 1-spaltig, Padding reduziert |
| GK-3 | Parser-Result-Preview | NEU — `<ParseResultTable>` (Tabellen-Stil aus `#13 Comparison table` 1406-1460) | Datei-Header (Name/Pos-Anzahl/Groesse/Version/Format/Datum) · Tabelle 6 Spalten (Pos/Kurztext/Menge/Einheit/LZ/EP-leer) · 3 Action-Buttons | "Excel-Download" / "PDF-Druckansicht" / "Andere Datei laden" — alle client-seitig | Tabelle `overflow-x-auto`, Action-Buttons stacken vertical |
| GK-4 | Premium-Email-Capture | `#17 Lead-magnet CTA hero` (1763-1847) komplett uebernommen mit Email-Input statt CTA-Button-Pair | Eyebrow "Premium (kostenlos)" · H2 "KI-Klassifizierung des LV kostenlos per E-Mail" · 4-Bullet-Liste · Email-Input · CTA-Button · Footnote · Rechts: Beispiel-Auswertungs-Karte | "KI-Auswertung holen" → POST /api/public/gaeb-premium-request mit Email + parsed file | Beispiel-Karte stack unter; Email-Input + CTA full-width |
| GK-5 | Trust-Block (Datenschutz) | `#15 Risk-Reversal / Garantie` (1605-1670) 4-Tile-Variante ohne Wrapper-Card | 4 Tiles (client-seitig / Hosting DE / keine Speicherung / Auto-Loesch nach 24h Premium) | keiner | `grid sm:grid-cols-2 lg:grid-cols-4` → 2x2 mobile |
| GK-6 | Tool-FAQ | `#19 FAQ` (1882-1938) | 9 Fragen (Was ist GAEB / Versionen / Sicherheit / X83 vs D83 / AVA-Programme / KI-Auswertung / Excel-Format / GAEB 90 / Parsing-Fehler) | accordion-toggle | wie Original |
| GK-7 | Cross-CTA Kalkulation | `#17 Lead-magnet CTA hero` (1763-1847) zentriert ohne Preview, nur 1 CTA | H2 "Datei konvertiert — und jetzt bepreisen?" · Body verbatim aus Pricing-Block · 1 CTA | green "Kalkulation anfragen" → /kontakt/?topic=lv-bepreisung | CTA full-width |

---

## 8. Position-Kalkulator (`/tools/kalkulator/`)

```
== HERO =================================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ┌─[Eyebrow]──────┐                                                                    │
│   │ ▸ KOSTENLOSES TOOL│ kalku-green/10                                                  │
│   └────────────────┘                                                                    │
│                                                                                         │
│   Position-Kalkulator.                                                                  │
│   Lohn × Zeit + Material + Zuschlag = Ihr EP.                                           │
│   text-5xl bold                                                                         │
│                                                                                         │
│   Schnelle Kalkulation einzelner Positionen — fuer Nachtraege, Erstkalkulationen oder  │
│   den Plausi-Check vor Submission. 100 % im Browser, keine Anmeldung.                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== 10-ZEILEN-KALKULATIONS-TABELLE =======================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ # | Bezeichnung      | Lohn €/h | Zeit h/Stk | Material €/Stk | Zusch.% | EP €/Stk│ Menge | GP €  ││
│   │ 1 | [____________]  | [_42,80] | [___0,18] | [______1,80]   | [__18 ] | 11,30   ║ [_12_]│ 135,60│   │
│   │ 2 | [____________]  | [_42,80] | [___0,12] | [______0,90]   | [__18 ] |  6,68   ║ [_24_]│ 160,32│   │
│   │ 3 | [____________]  | [_42,80] | [___2,40] | [_____18,00]   | [__15 ] |126,72   ║ [_4__]│ 506,88│   │
│   │ 4 | [____________]  | [_____ ] | [_______] | [__________]   | [_____ ] | _____   ║ [____]│ ____ │   │
│   │ ... (10 Zeilen total)                                                                       │   │
│   ├────────────────────────────────────────────────────────────────────────────────────────────┤   │
│   │                                                                       Summe GP:  802,80 €  │   │
│   └────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   [ + Zeile hinzufuegen ]   [ ⬇ Excel-Export ]   [ ⬇ PDF-Export ]   [ Reset ]            │
│                                                                                         │
│   Live-Berechnung: EP = (Lohn × Zeit + Material) × (1 + Zuschlag/100)                  │
│                    GP = EP × Menge                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== EMAIL-CAPTURE: MARKTVERGLEICH ========================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green  py-16  text-white   │
│                                                                                         │
│   ┌─[Linke 60%]─────────────────┐  ┌─[Rechte 40%: Sample-Card]─────────────┐           │
│   │ ▸ MARKTVERGLEICH (KOSTENLOS) │  │  bg-white text-gray-900               │           │
│   │                              │  │  ┌──── Beispiel-Vergleich ──────┐    │           │
│   │ Wie liegt Ihre Kalkulation  │  │  │ Pos: Schotter 0/45            │    │           │
│   │ im Markt?                    │  │  │ Ihr EP:        24,50 €/t      │    │           │
│   │ text-4xl bold white          │  │  │ Marktbandbreite:              │    │           │
│   │                              │  │  │   18,40 — 22,10 €/t           │    │           │
│   │ Sie zeigen uns Ihre Pos —   │  │  │   ⌀ 20,15 €/t                  │    │           │
│   │ wir senden Ihnen einen      │  │  │ → Sie liegen 21 % ueber Markt │    │           │
│   │ Marktvergleich basierend     │  │  │                                │    │           │
│   │ auf 50.000+ realen Kalku-    │  │  │ Pos: Pflaster Naturstein      │    │           │
│   │ lationen aus 7 Gewerken.     │  │  │ Ihr EP:       128,00 €/m²     │    │           │
│   │                              │  │  │ Marktbandbreite:              │    │           │
│   │ ✓ Anonym                     │  │  │   118 — 142 €/m²              │    │           │
│   │ ✓ Auswertung in 5 Min        │  │  │   ⌀ 130 €/m²                   │    │           │
│   │ ✓ PDF mit Empfehlung pro Pos │  │  │ → marktkonform                │    │           │
│   │                              │  │  └────────────────────────────────┘    │           │
│   │ [ ihre@email.de         ]    │  │                                       │           │
│   │                              │  │                                       │           │
│   │ [ Marktvergleich holen white]│  │                                       │           │
│   │                              │  │                                       │           │
│   │ Wir senden ein PDF + 1 Mail. │  │                                       │           │
│   │ Kein Newsletter, kein Spam. │  │                                       │           │
│   └──────────────────────────────┘  └────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== TOOL-FAQ =============================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Haeufige Fragen zum Position-Kalkulator.                                              │
│                                                                                         │
│   ▸ Was ist EP, was ist GP?                                                  ▾          │
│   ▸ Wie ermittle ich den richtigen Mittellohn?                               ▾          │
│   ▸ Welcher Zuschlag ist ueblich?                                            ▾          │
│   ▸ Was deckt der Zuschlag ab (BGK, AGK, Wagnis & Gewinn)?                   ▾          │
│   ▸ Wie verlaesslich ist der Marktvergleich?                                 ▾          │
│   ▸ Kann ich das auch als Urkalkulation verwenden?                           ▾          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CROSS-CTA: KALKULATIONSDIENSTLEISTUNG ================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-12                                                                       │
│                                                                                         │
│            Mehr als 10 Positionen? Lassen Sie uns das ganze LV uebernehmen.             │
│                                                                                         │
│            [ Komplettes LV bepreisen lassen → /konditionen/  green ]                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| KK-1 | Hero | `#2 Hero` (453-633) ohne Mockup, einseitig | Eyebrow "Kostenloses Tool" · H1 "Position-Kalkulator. Lohn × Zeit + Material + Zuschlag = Ihr EP." · Body mit Use-Cases | scrollTo(#tabelle) impliziert | full-width centered |
| KK-2 | 10-Zeilen-Tabelle | NEU — `<CalcTable>` (Tabellen-Pattern aus `#13 Comparison table` 1406-1460 mit Inputs statt Werten + Live-Calc) | Tabellen-Header 8 Spalten (#/Bezeichnung/Lohn/Zeit/Material/Zuschlag/EP-readonly/Menge/GP-readonly) · 10 leere Zeilen · Live-Summe-Footer · 4 Action-Buttons unten · Formel-Hinweis | "+ Zeile hinzufuegen" / "Excel-Export" / "PDF-Export" / "Reset" — alle client-seitig | Tabelle `overflow-x-auto` (auf mobile: gestackt als Karten je Zeile mit Label:Value-Pairs) |
| KK-3 | Email-Capture: Marktvergleich | `#17 Lead-magnet CTA hero` (1763-1847) | Eyebrow "Marktvergleich (kostenlos)" · H2 "Wie liegt Ihre Kalkulation im Markt?" · Body mit "50.000+ Kalkulationen aus 7 Gewerken" · 3-Bullet-Liste · Email-Input · CTA · Sample-Karte rechts mit 2 Beispiel-Vergleichen | white-cta "Marktvergleich holen" → POST /api/public/marktvergleich-request mit Email + tabellen-positionen | Sample-Karte stack unter; Email + CTA full-width |
| KK-4 | Tool-FAQ | `#19 FAQ` (1882-1938) | 6 Fragen (EP/GP / Mittellohn / Zuschlag uebliche Werte / BGK/AGK/W&G / Marktvergleich-Verlaesslichkeit / Urkalkulation) | accordion-toggle | wie Original |
| KK-5 | Cross-CTA | `#17 Lead-magnet CTA hero` (1763-1847) zentriert minimal | "Mehr als 10 Positionen? Lassen Sie uns das ganze LV uebernehmen." · 1 CTA | green "Komplettes LV bepreisen lassen" → /konditionen/ | CTA full-width |

---

## 9. Blog-Listing (`/blog/`)

```
== HERO =================================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ┌─[Eyebrow]──┐                                                                        │
│   │ ▸ BLOG      │ primary-50                                                            │
│   └─────────────┘                                                                        │
│                                                                                         │
│   Wissen ueber oeffentliche Ausschreibungen.                                            │
│   text-4xl bold                                                                         │
│                                                                                         │
│   Praktische Anleitungen, VOB/A-Updates, Gewerk-Insights — von Kalkulatoren fuer        │
│   Kalkulatoren.                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== FILTER + GRID + SIDEBAR ==============================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-12                                                                       │
│                                                                                         │
│   ┌─[Filter-Strip]─────────────────────────────────────────────────────────┐           │
│   │ Topic: [Alle ▾] [VOB/A] [GAEB] [Pricing] [Gewerke ▾] [Kurzfristig]   │           │
│   └─────────────────────────────────────────────────────────────────────────┘           │
│                                                                                         │
│   ┌─[Card-Grid 8/12 cols]──────────────────────────┐  ┌─[Sticky-Sidebar 4/12]──┐       │
│   │                                                  │  │                        │       │
│   │  ┌─[Featured Post]────────────────────────────┐ │  │  ┌──[Newsletter]────┐  │       │
│   │  │ Cover-Bild (Aspect-Video)                  │ │  │  │ Wissen direkt   │  │       │
│   │  │ ──────────────────────────────────────     │ │  │  │ in Ihrem        │  │       │
│   │  │ ▸ VOB/A · 8 Min Lesezeit                   │ │  │  │ Postfach.       │  │       │
│   │  │                                             │ │  │  │                 │  │       │
│   │  │ EFB 221 erklaert: Was Sie wirklich         │ │  │  │ 1× im Monat,    │  │       │
│   │  │ eintragen muessen — und was nicht.         │ │  │  │ kein Spam.      │  │       │
│   │  │                                             │ │  │  │                 │  │       │
│   │  │ Das Preisermittlungsformblatt 221 wird    │ │  │  │ [_email__]      │  │       │
│   │  │ oft falsch ausgefuellt — dabei ist es ...  │ │  │  │ [Abonnieren]    │  │       │
│   │  │                                             │ │  │  └─────────────────┘  │       │
│   │  │ — Alaatdin Coksari · 8. Mai 2026          │ │  │                        │       │
│   │  │                                             │ │  │  ┌──[Top-Posts]────┐  │       │
│   │  │ → Lesen                                     │ │  │  │ • EFB 221 erkl. │  │       │
│   │  └─────────────────────────────────────────────┘ │  │  │ • GAEB X81/X83  │  │       │
│   │                                                  │  │  │ • Mittellohn    │  │       │
│   │  ┌──[Post]───────┐ ┌──[Post]───────┐            │  │  │ • Submission    │  │       │
│   │  │ Cover         │ │ Cover         │            │  │  │   morgen        │  │       │
│   │  │ ▸ GAEB · 6 Min│ │ ▸ Pricing · 5│            │  │  │ • 4 Irrtuemer   │  │       │
│   │  │               │ │  Min          │            │  │  └─────────────────┘  │       │
│   │  │ GAEB X81 vs   │ │ Festpreis vs │            │  │                        │       │
│   │  │ X83 vs P83 —  │ │ Erfolgs-     │            │  │  ┌──[Tools-Promo]──┐  │       │
│   │  │ welcher ...   │ │ provision —  │            │  │  │ Kostenlose      │  │       │
│   │  │               │ │ was passt ...│            │  │  │ Tools nutzen:   │  │       │
│   │  │ → Lesen       │ │ → Lesen      │            │  │  │ • GAEB-Konv.    │  │       │
│   │  └───────────────┘ └───────────────┘            │  │  │ • Position-Kalk │  │       │
│   │                                                  │  │  └─────────────────┘  │       │
│   │  ┌──[Post]───────┐ ┌──[Post]───────┐            │  │                        │       │
│   │  │ ...           │ │ ...           │            │  │                        │       │
│   │  └───────────────┘ └───────────────┘            │  │                        │       │
│   │                                                  │  │                        │       │
│   │  ┌──[Post]───────┐ ┌──[Post]───────┐            │  │                        │       │
│   │  │ ...           │ │ ...           │            │  │                        │       │
│   │  └───────────────┘ └───────────────┘            │  │                        │       │
│   │                                                  │  │                        │       │
│   │  [ Mehr laden ▾ ]                                │  │                        │       │
│   └──────────────────────────────────────────────────┘  └────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| BL-1 | Hero | `#2 Hero` (453-633) reduziert, single-column | Eyebrow "Blog" · H1 "Wissen ueber oeffentliche Ausschreibungen." · Subzeile | keiner | full-width centered |
| BL-2 | Filter-Strip | NEU — Pills basierend auf Trade-Pill-Pattern aus `#2 Hero` Trust-Badges | 6 Filter-Pills (Alle / VOB/A / GAEB / Pricing / Gewerke-Dropdown / Kurzfristig) | Pills triggern Re-Query | wraps zu 2-3 Zeilen Pills |
| BL-3 | Featured + Card-Grid | `#6 Features grid (12 cards)` (800-924) Pattern fuer Posts, plus 1 Featured-Post (gross, full-width Erste Reihe) | 1 Featured-Card (gross): Cover-Image / Topic-Pill / Lesezeit / Title / Excerpt / Author / Datum / "Lesen"-Link · darunter 6–9 Standard-Cards same fields | je Card → /blog/[slug]/ + "Mehr laden" → Pagination | Featured stack vertical full-width; Cards `grid sm:grid-cols-2` → 1-spaltig stack |
| BL-4 | Sidebar (sticky, 4/12 Cols) | NEU — Komponente `<BlogSidebar>` mit 3 Bloecken | Newsletter-Capture (Email-Input + CTA) · Top-Posts-Liste (5 Items) · Tools-Promo-Karte | "Abonnieren" → POST /api/public/newsletter-subscribe · Top-Posts → /blog/[slug]/ · Tools → /tools/* | Sidebar entfaellt mobile, dafuer vor Footer ein Newsletter-Block volle Breite |

---

## 10. Blog-Post (`/blog/[slug]/`)

```
== POST-HEADER ==========================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ← Zurueck zum Blog                                                                    │
│                                                                                         │
│   ┌─[Topic-Pill]──┐ ┌─[Lesezeit]──┐                                                     │
│   │ ▸ VOB/A        │ │ 📖 8 Min     │                                                   │
│   └────────────────┘ └──────────────┘                                                   │
│                                                                                         │
│   EFB 221 erklaert: Was Sie wirklich eintragen muessen — und was nicht.                 │
│   text-4xl bold                                                                         │
│                                                                                         │
│   Das Preisermittlungsformblatt 221 wird oft falsch ausgefuellt — dabei ist es eines    │
│   der entscheidenden Dokumente bei oeffentlichen Vergaben. Hier die Anleitung mit       │
│   Beispielen.                                                                           │
│                                                                                         │
│   ┌─[Author]─────────────────┐                                                          │
│   │ 👤 Foto                   │                                                          │
│   │ Alaatdin Coksari         │                                                          │
│   │ Gruender · 18 Jahre Praxis│                                                         │
│   │ 8. Mai 2026              │                                                          │
│   └───────────────────────────┘                                                          │
│                                                                                         │
│   Cover-Image (aspect-video, rounded-2xl)                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== ARTICLE BODY MIT INHALTSVERZEICHNIS-STICKY ==========================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-12                                                                         │
│                                                                                         │
│   ┌─[Sticky TOC 3/12 cols]──┐  ┌─[Article 9/12 cols]─────────────────────────┐         │
│   │ INHALT                   │  │                                              │         │
│   │                          │  │  Was ist EFB 221?                            │         │
│   │ • Was ist EFB 221?       │  │  text-2xl bold                               │         │
│   │ • Wer fordert es?        │  │                                              │         │
│   │ • Pflichtfelder          │  │  Body-Copy (prose-lg)...                     │         │
│   │ • Beispiel mit Zahlen    │  │                                              │         │
│   │ • Haeufige Fehler        │  │  ┌──[Inline-CTA-Box]──────────────────┐    │         │
│   │ • Download-Vorlage       │  │  │ ▸ Tipp                              │    │         │
│   │ • FAQ                    │  │  │                                      │    │         │
│   │                          │  │  │ Wir uebernehmen EFB 221 fuer Sie —  │    │         │
│   │                          │  │  │ inklusive in PAKET M und L.         │    │         │
│   │                          │  │  │                                      │    │         │
│   │                          │  │  │ [ Konditionen ansehen → ]            │    │         │
│   │                          │  │  └──────────────────────────────────────┘    │         │
│   │                          │  │                                              │         │
│   │                          │  │  Wer fordert es?                             │         │
│   │                          │  │  text-2xl bold                               │         │
│   │                          │  │                                              │         │
│   │                          │  │  Body-Copy ...                               │         │
│   │                          │  │                                              │         │
│   │                          │  │  Pflichtfelder                               │         │
│   │                          │  │  text-2xl bold                               │         │
│   │                          │  │                                              │         │
│   │                          │  │  ┌──[Tabelle]──────────────────────┐       │         │
│   │                          │  │  │ Feld    | Was reinkommt | Tipp │       │         │
│   │                          │  │  │ ...     | ...           | ...  │       │         │
│   │                          │  │  └─────────────────────────────────┘       │         │
│   │                          │  │                                              │         │
│   │                          │  │  ...                                         │         │
│   │                          │  │                                              │         │
│   │                          │  │  ┌──[Inline-CTA-Box 2]────────────────┐   │         │
│   │                          │  │  │ ▸ Vorlage                            │   │         │
│   │                          │  │  │                                      │   │         │
│   │                          │  │  │ Wir haben eine ausfuellbare EFB 221  │   │         │
│   │                          │  │  │ Vorlage als XLSX. Per E-Mail        │   │         │
│   │                          │  │  │ kostenlos.                          │   │         │
│   │                          │  │  │                                      │   │         │
│   │                          │  │  │ [_email_____] [ Holen → ]           │   │         │
│   │                          │  │  └──────────────────────────────────────┘   │         │
│   │                          │  │                                              │         │
│   │                          │  │  ── FAQ zum Thema ──                        │         │
│   │                          │  │  ▸ Was, wenn ich EFB 221 nicht ausfuelle?▾ │         │
│   │                          │  │  ▸ Welche Zuschlaege rechne ich rein?    ▾ │         │
│   │                          │  │  ▸ Wann muss ich Urkalkulation hinzufueg?▾│         │
│   │                          │  │                                              │         │
│   │                          │  │  ── Verwandte Artikel ──                    │         │
│   │                          │  │  ┌──[Post]───┐ ┌──[Post]───┐ ┌──[Post]──┐  │         │
│   │                          │  │  │ EFB 223   │ │ Urkalku-  │ │ Mittel-  │  │         │
│   │                          │  │  │ erklaert   │ │ lation    │ │ lohn 2026│  │         │
│   │                          │  │  │ → Lesen   │ │ → Lesen   │ │ → Lesen  │  │         │
│   │                          │  │  └───────────┘ └───────────┘ └──────────┘  │         │
│   └──────────────────────────┘  └──────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== FOOTER-CTA NACH ARTIKEL ==============================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-primary-600 via-primary-500 to-kalku-green  py-16  text-white   │
│                                                                                         │
│   Selber kalkulieren oder kalkulieren lassen?                                           │
│                                                                                         │
│   Wenn Sie regelmaessig oeffentliche Ausschreibungen bearbeiten, lohnt sich PAKET M    │
│   ab 8 Submissionen pro Jahr.                                                           │
│                                                                                         │
│   [ Konditionen ansehen  white-cta ]   [ Termin: 15 Min  glass ]                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| BP-1 | Post-Header | `#2 Hero` (453-633) reduziert + Author-Card (NEU, basiert auf Testimonial-Author-Pattern aus `#8` 1084-1186) | Backlink "← Zurueck" · 2 Pills (Topic + Lesezeit) · H1 · Lead-Paragraph · Author-Card (Foto, Name, Funktion, Datum) · Cover-Image (aspect-video) | Backlink → /blog/ | Author-Card horizontal stack; Cover bleibt aspect-video |
| BP-2 | Sticky TOC + Article + Inline-CTAs + FAQ + Verwandte | NEU — `<ArticleLayout>` mit Tailwind `prose`. TOC-Sidebar via `position:sticky` und IntersectionObserver-Hook fuer Active-State. Inline-CTA-Box basiert auf `#15 Risk-Reversal`-Pattern, FAQ aus `#19`, Verwandte aus `#11 Industry-specific demo selector` | Linke Spalte: 7-Item-TOC mit Active-Tracking · Rechte Spalte: H2-strukturierter Body mit `prose-lg` · 2 Inline-CTA-Boxen (1 Service-Pitch + 1 Email-Capture-Vorlage) · Inline-Tabellen · FAQ am Ende (3-5 Q) · Verwandte Artikel (3 Cards) | Inline-CTA-1: text-link → /konditionen/ · Inline-CTA-2: Email-Capture → POST /api/public/vorlage-request · Verwandte → /blog/[slug]/ | TOC entfaellt mobile (oder als kollabiertes "Inhalt"-Accordion oben). Inline-CTAs bleiben full-width. Verwandte stacken vertical |
| BP-3 | Footer-CTA | `#17 Lead-magnet CTA hero` (1763-1847) zentriert ohne Preview | H2 "Selber kalkulieren oder kalkulieren lassen?" · Body · 2 CTAs | white-cta "Konditionen ansehen" → /konditionen/ · glass "Termin: 15 Min" → /kontakt/#cal | CTAs stacken |

---

## 11. Kontakt (`/kontakt/`)

```
== HERO + 3-PATH-SELECTOR ===============================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  pt-24 pb-12 bg-white                                                                   │
│                                                                                         │
│   ┌─[Eyebrow]──┐                                                                        │
│   │ ▸ KONTAKT   │ kalku-green/10                                                        │
│   └─────────────┘                                                                        │
│                                                                                         │
│   Lassen Sie uns reden — 15 Minuten, kostenlos.                                         │
│   text-4xl bold                                                                         │
│                                                                                         │
│   Drei Wege, uns zu erreichen. Schnellster zuerst.                                      │
│                                                                                         │
│   ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐          │
│   │ 📅 TERMIN BUCHEN     │  │ 💬 WHATSAPP          │  │ ☎ DIREKT-ANRUF      │          │
│   │ kalku-green BORDER-2 │  │ green-300            │  │ primary-200          │          │
│   │                      │  │                      │  │                      │          │
│   │ Cal.com Kalender     │  │ Antwort < 30 Min     │  │ Sofort: 0681-       │          │
│   │ 15 Min Slots         │  │ wa.me/49151...       │  │ 41096430             │          │
│   │ inkl. Erstberatung   │  │                      │  │                      │          │
│   │                      │  │                      │  │                      │          │
│   │ → Termin waehlen     │  │ → WhatsApp oeffnen   │  │ → Anrufen            │          │
│   └──────────────────────┘  └──────────────────────┘  └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== CAL.COM EMBED GROSS ==================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16  id=cal                                                               │
│                                                                                         │
│   Termin direkt waehlen.                                                                │
│   text-2xl bold                                                                         │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐         │
│   │  Cal.com iframe                                                          │         │
│   │  src="https://cal.com/kalku/erstgespraech-15min"                         │         │
│   │  min-h-[640px]                                                            │         │
│   │                                                                            │         │
│   │  ┌────────────────────────────────────────────────────────────┐          │         │
│   │  │  [< Mai 2026 >]                  Verfuegbare Slots          │          │         │
│   │  │                                                              │          │         │
│   │  │  M D M D F S S                   Montag, 19. Mai            │          │         │
│   │  │       1 2 3 4                    ┌──────────┐                │          │         │
│   │  │  5 6 7 8 9 10 11                 │ 09:00    │                │          │         │
│   │  │ 12 13 14 15 16 17 18             │ 10:30    │                │          │         │
│   │  │  ●  ●  ●  ●                       │ 14:00    │                │          │         │
│   │  │ 19 20 21 22 23 24 25             │ 15:30    │                │          │         │
│   │  │  ●  ●  ●  ●                       │ 17:00    │                │          │         │
│   │  │                                  └──────────┘                │          │         │
│   │  └────────────────────────────────────────────────────────────┘          │         │
│   └──────────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== MEHRSTUFIGES FORMULAR (SEKUNDAER-PFAD) ===============================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-white py-16                                                                         │
│                                                                                         │
│   Lieber per Formular?                                                                  │
│   3 Schritte — wir melden uns innerhalb von 4 h.                                        │
│                                                                                         │
│   ┌──[Step 1 — Ihr Unternehmen]──────────────────────────────────────────────┐         │
│   │  ●━━━○━━━○                                                               │         │
│   │  Schritt 1 von 3                                                          │         │
│   │                                                                            │         │
│   │  Firma *               [______________________]                           │         │
│   │  Branche / Gewerke *   [Dropdown ▾  GaLaBau · Tiefbau · ...]              │         │
│   │  Einzugsgebiet *       [______________________]                           │         │
│   │  Umkreis               [Dropdown ▾  25/50/75/100/150/200/+]               │         │
│   │  Mitarbeiterzahl *     [Dropdown ▾  1-3/4-10/11-25/26-50/51-100/100+]     │         │
│   │                                                                            │         │
│   │                                                  [ Weiter → green ]       │         │
│   └────────────────────────────────────────────────────────────────────────────┘         │
│                                                                                         │
│   (Step 2: Vor-/Nachname, Email, Telefon, Kurze Anfrage)                                │
│   (Step 3: Datenschutz-Checkbox + Submit "Anfrage senden")                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

== STANDORT MIT MAP =====================================================================
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  bg-gray-50 py-16                                                                       │
│                                                                                         │
│   Wo Sie uns finden.                                                                    │
│                                                                                         │
│   ┌─[Karte]─────────────────────┐    ┌─[Adresse + Direktkontakt]────────────┐           │
│   │  OSM/Google Map iframe       │    │ KALKU                                │           │
│   │  zentriert auf               │    │ Inh. Alaatdin Coksari                │           │
│   │  Berliner Promenade 15       │    │                                      │           │
│   │  66111 Saarbruecken           │    │ Berliner Promenade 15                │           │
│   │  ●                            │    │ 66111 Saarbruecken                  │           │
│   │  min-h-[400px]               │    │                                      │           │
│   │                              │    │ ☎ 0681-41096430                    │           │
│   │                              │    │ ☎ wa.me/4915167671877              │           │
│   │                              │    │ ✉ info@kalku.de                    │           │
│   │                              │    │                                      │           │
│   │ [ Anfahrt → Google Maps ↗ ] │    │ Buerozeiten: Mo–Fr 8–18 Uhr         │           │
│   │                              │    │ Sa nach Vereinbarung                 │           │
│   │                              │    │ (auch fuer Last-Minute-Submissions)  │           │
│   └──────────────────────────────┘    └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Footer 0.2]  [Sticky Mobile CTA 0.3]
```

| # | Block | Komponente | Inhalt-Slots | CTA | Mobile-Verhalten |
|---|---|---|---|---|---|
| KO-1 | Hero + 3-Path-Selector | `#21 Contact section (3-path selector + form)` (2054-2291) — 3-Path-Teil | Eyebrow "Kontakt" · H1 "Lassen Sie uns reden — 15 Minuten, kostenlos." · Subzeile · 3 Karten (Termin Cal.com kalku-green border-2 highlighted / WhatsApp green-300 / Direkt-Anruf primary-200) | Karte 1 → scrollTo(#cal) · Karte 2 → wa.me/4915167671877 · Karte 3 → tel:0681-41096430 | `grid md:grid-cols-3` → 1-spaltig stack; Termin-Karte bleibt erste Position |
| KO-2 | Cal.com Embed gross | NEU — `<CalEmbed>` (iframe-Wrapper) | H2 "Termin direkt waehlen" · Cal.com iframe `min-h-[640px]` mit Direkt-Buchungslink | "Slot waehlen" passiert innerhalb iframe → confirm + email | iframe `min-h-[520px]` mobile, scrollbar |
| KO-3 | Mehrstufiges Formular | `#21 Contact section` (2054-2291) Form-Teil komplett uebernommen, plus Multi-Step-Wrapper (NEU) mit Progress-Indicator | H2 "Lieber per Formular?" · Subzeile · Step-Indicator · 3 Schritte verbatim aus Audit (Step 1: Firma/Branche/Einzugsgebiet/Umkreis/MA · Step 2: Name/Email/Tel/Anfrage · Step 3: Datenschutz-Checkbox + Submit) | "Weiter →" zwischen Steps (kalku-green) · Final "Anfrage senden" (kalku-green) → POST /api/contact | Inputs stacken sowieso vertical; Step-Indicator bleibt sichtbar oben |
| KO-4 | Standort mit Map | NEU (gleich wie U-3 in /ueber-uns/) | Linke Spalte: Map iframe Saarbruecken · Rechte Spalte: Adresse + Tel/WA/Email + Buerozeiten | tel: / wa.me: / mailto: / Anfahrt-Link | Map full-width, Adresse darunter |

---

## Gesamt-Sektionen-Anzahl

| Seite | Sektionen |
|---|---|
| 1. Home | 12 (inkl. Footer + Sticky Mobile CTA) |
| 2. Gewerk-Landingpage Template | 7 |
| 3. Konditionen | 6 |
| 4. Ablauf | 4 |
| 5. Über uns | 7 |
| 6. Referenzen Listing + Detail | 3 + 3 |
| 7. GAEB-Konverter | 7 |
| 8. Position-Kalkulator | 5 |
| 9. Blog-Listing | 4 |
| 10. Blog-Post | 3 |
| 11. Kontakt | 4 |
| Querschnitt (0.1–0.4) | 4 |
| **TOTAL** | **69 Block-Spezifikationen** |

---

## Summary

**Gesamt 69 Block-Spezifikationen** verteilt auf 11 Pflicht-Seiten plus 4 Querschnitts-Komponenten (Top-Nav, Footer, Sticky Mobile CTA, Exit-Intent Modal). Home ist mit 12 Sektionen am dichtesten, Blog-Post am leichtesten (3 grosse Bloecke), Referenzen-Detail-Seite optional ergaenzt.

**Die drei meistgenutzten Komponenten aus dem V1-Inventar:**
1. **`#17 Lead-magnet CTA hero` (1763-1847)** — als Final-CTA auf fast jeder Seite, auch als Email-Capture-Wrapper auf den Tools (8 Verwendungen). Die white-on-blue + glass-on-dark CTA-Pattern gehoeren standardisiert in einen `<Button variant="cta-on-dark|glass-on-dark">`.
2. **`#19 FAQ (search input + accordion)` (1882-1938)** — auf Home, Konditionen, Ablauf, jeder Gewerk-LP, beiden Tools (7 Verwendungen). Die Such-+-Accordion-Variante wird ueberall gleich verwendet.
3. **`#9 Detailed case studies` (1188-1300)** — auf Home, Gewerk-LP, Referenzen-Listing, Referenzen-Detail (5 Verwendungen, alle Trade-Color-Variant).

**Drei neue Komponenten muessen fuer Tools+Blog+Referenzen dazu gebaut werden:**
1. **`<DropZone>` + `<ParseResultTable>`** — fuer den GAEB-Konverter. Drag-and-Drop mit dashed Border, dann Tabellen-Preview mit Excel/PDF-Export-Buttons. 100 % client-seitig.
2. **`<CalcTable>`** — die 10-Zeilen-Position-Kalkulator-Tabelle mit Live-Berechnung (EP/GP), Excel/PDF-Export. Mobile braucht eine Card-Variante pro Zeile statt Tabelle.
3. **`<ArticleLayout>` mit Sticky-TOC + Inline-CTA-Box + verwandte-Artikel-Block** — fuer Blog-Post. TOC-Sidebar via `position:sticky` und IntersectionObserver fuer Active-State.

Zusatz-Bauten kleiner: `<LVPreviewCard>` (Browser-Frame + Tabellen-Mock fuer Gewerk-LP-Beispiel-Submission), `<VerticalTimeline>` fuer Über-uns-Werdegang, `<CalEmbed>`-Wrapper fuer Cal.com-iframe, `<BlogSidebar>` mit 3 Bloecken, sowie Filter-Pills fuer Referenzen+Blog-Listing.
