# Phase 2 — Conversion-Pfade, Forms & Pipedrive-Strategie

> **Stand:** 14. Mai 2026
> **Phase:** 2 (Information Architecture & Conversion-Strategie) — Agent IA-3
> **Quellen:** [00-phase1-dossier.md](./00-phase1-dossier.md), [03-content-audit-ugur.md](./03-content-audit-ugur.md)
> **Status:** Entwurf zur Boss-Freigabe vor Phase 3 (Build)

---

## 0. Kontext & Annahmen

- **CRM:** Pipedrive (API-Key wird in Phase 3 vom Boss bereitgestellt). Alle Form-Submissions, Kalender-Buchungen und Tool-Lead-Magnete laufen letztlich dort zusammen.
- **Termin-Picker:** Cal.com (self-hosted oder Cloud, beides DSGVO-konform).
- **WhatsApp Business:** +49 1516 7671877 (vom Ugur-Audit übernommen, identisch).
- **Telefon:** +49 681 41096430.
- **E-Mail:** info@kalku.de.
- **Mindestvoraussetzungen:** 3 Mitarbeiter, 6 Monate Marktpräsenz, 3 vergleichbare Referenzen — werden als Self-Check vor dem Form-Submit eingebaut.
- **Zielgruppe:** Geschäftsführer und Inhaber mittelständischer Bauunternehmen, mobil dominant. Ansprache durchgängig „Sie".
- **Analytics:** Plausible (cookie-less, EU-Hosting). Kein Tracking-Cookie-Banner nötig, solange wir bei Plausible bleiben.

---

## 1. Conversion-Pfad-Übersicht

### 1.1 Visitor-Intentionen

Wir unterscheiden sechs Visitor-Profile. Jedes hat einen klaren primären Pfad und einen Backup-Pfad.

| # | Intent | Typische Quelle | Mental-Status | Was er tun will |
|---|---|---|---|---|
| A | **Researching** — vergleicht Outsourcing-Optionen | Google „Baukalkulation outsourcen" | unentschlossen, sammelt Infos | Lesen, ggf. Tool ausprobieren, Newsletter / PDF mitnehmen |
| B | **Comparing** — KALKU vs. Wettbewerber | Konkurrenz-SEO-Cluster | preisbewusst, will USPs sehen | Pricing prüfen, Cases lesen, evtl. Termin |
| C | **Ready-to-buy** — hat dringende Submission | Empfehlung, Direct, Brand-Search | hoch motiviert, Zeitdruck | Sofort Termin / Telefon / WhatsApp |
| D | **Tool-User** — sucht Free-Tool | Google „GAEB Konverter kostenlos" | tool-affin, evtl. nicht im ICP | Tool nutzen, ggf. Premium-Auswertung |
| E | **Karriere** — sucht Job (Phase 5+ relevant) | Google „Kalkulator Saarbrücken" | zukünftiger Mitarbeiter | Stellen ansehen, bewerben |
| F | **Press / Partner** — Journalist, Verband, Lieferant | Direct, Suche „Kalku Saarbrücken" | recherchiert die Firma | Pressekit / Kontakt finden |

### 1.2 Funnel-Mapping pro Intent

Sechs Funnels, jeweils mit Landing-Page → CTA-Hierarchie → Form-Typ → Pipedrive-Stage. Karriere und Press sind für Phase 5+ skizziert, aber jetzt schon eingeplant, damit das Pipedrive-Setup nicht zweimal angefasst wird.

#### Funnel 1: „Researching → Trust → Erstgespräch" (Hauptpfad, Intent A)

```
SEO-Landing (z. B. /leistungen/galabau/)
    ↓ (scrollt durch USP, Vier-Teams, Cases, FAQ)
Sticky-Header-CTA „Erstgespräch vereinbaren" (immer sichtbar)
    ↓
Self-Check Eligibility-Widget (4 Fragen, Inline-Modul)
    ↓ (passt) → Cal.com-Embed mit vorausgefüllten Slots
    ↓ (passt nicht) → Tool-Empfehlung („/tools/kalkulator/")
    ↓
Cal.com-Booking → Webhook → Pipedrive-Lead (Stage „Qualified Lead")
```

#### Funnel 2: „Comparing → Pricing → Erstgespräch" (Intent B)

```
/konditionen/ (oder Vergleichs-Blog-Post)
    ↓
Pricing-Tabelle Einzel / M / L
    ↓
Inline-CTA „Welches Modell passt? — 5 Min telefonisch klären"
    ↓
Mehrstufen-Form (3 Schritte) ODER Cal.com-Embed (Tab-Switch)
    ↓
Pipedrive-Lead, Custom Field „Bevorzugtes Modell" (Einzel/M/L/unsicher)
```

#### Funnel 3: „Ready-to-buy → Direkt-Kontakt" (Intent C)

```
Beliebige Landing-Page
    ↓
Sticky-Mobile-CTA-Bar (📞 Anrufen / 💬 WhatsApp / ✉ Termin)
    ↓
Telefon (tel:) ODER WhatsApp (wa.me) ODER Cal.com „Heute/Morgen"-Slot
    ↓
Pipedrive-Lead via Webhook (WhatsApp/Cal) bzw. manuell vom Empfang (Telefon)
Stage: „Erstgespräch geplant" (überspringt Qualified Lead, weil schon im Gespräch)
```

#### Funnel 4: „Tool-User → Lead-Magnet → Lead" (Intent D)

```
/tools/gaeb-konverter/ (oder /tools/kalkulator/)
    ↓
Tool nutzen (Stufe 1 anonym, kostenlos)
    ↓
Ergebnis-Screen mit Soft-Upsell „Premium-Auswertung kostenlos per Mail"
    ↓
Email-Capture-Form (E-Mail + DSGVO + optional „mit zur Beratung mitnehmen")
    ↓
Pipedrive-Lead, Source = „GAEB-Konverter" oder „Kalkulator", Stage „Qualified Lead"
    ↓
Backend-Worker generiert Premium-PDF + Mail (innerhalb 2 h)
```

#### Funnel 5: „Karriere → Bewerbung" (Intent E, Phase 5+)

```
/karriere/ (Stellenliste)
    ↓
Stellen-Detailseite
    ↓
Bewerbungs-Form (eigener Pipedrive-Pipeline „Recruiting", separat von Sales)
```

#### Funnel 6: „Press / Partner" (Intent F)

```
/kontakt/ oder /presse/ (kleine Sektion)
    ↓
Kontakt-Kurz-Form (Name, E-Mail, Anliegen-Dropdown: Presse/Partnerschaft/Sonstiges)
    ↓
Pipedrive-Lead, Source „Kontakt", manuelle Triage (kein automatisches Sales)
```

### 1.3 Funnel-Übersicht als Tabelle

| # | Funnel | Form-Typ | Pipedrive-Stage (Start) | Pipedrive-Pipeline |
|---|---|---|---|---|
| 1 | Researching → Erstgespräch | Cal.com-Booking + Self-Check | „Qualified Lead" | Sales |
| 2 | Comparing → Erstgespräch | Mehrstufen-Form ODER Cal.com | „Qualified Lead" | Sales |
| 3 | Ready-to-buy → Direkt | Cal.com „Heute/Morgen" / WhatsApp / Telefon | „Erstgespräch geplant" | Sales |
| 4 | Tool-Lead-Magnet | Email-Capture (minimal) | „Qualified Lead" | Sales |
| 5 | Karriere | Bewerbungs-Form (Phase 5+) | „Bewerbung eingegangen" | Recruiting |
| 6 | Press / Partner | Kontakt-Kurz-Form | „Eingegangen" (manuell) | Allgemein |

---

## 2. Pipedrive Lead vs. Deal — Mapping & Pipeline-Setup

### 2.1 Lead vs. Deal — Entscheidungsregel

Pipedrive trennt **Leads** (qualifizierungsbedürftig) und **Deals** (qualifiziert, Sales-bereit).

**Lead** entsteht bei jedem Form-Submit, der **noch nicht** alle drei harten Mindestvoraussetzungen bestätigt hat:
- Tool-Email-Capture (kein Self-Check)
- Newsletter (Phase optional)
- Kontakt-Kurz-Form (allgemeine Anfrage)
- Self-Check **nicht** ausgefüllt oder mit „weiß nicht" beantwortet

**Deal** entsteht direkt, wenn alle drei Bedingungen erfüllt sind:
- Self-Check 4/4 grün (3 MA, 6 Mon, 3 Ref, passendes Gewerk)
- Mehrstufen-Form Schritt 1 vollständig (Firma, Gewerk, Einzugsgebiet, MA-Zahl)
- Datenschutz-Einwilligung erteilt

Deals starten in Pipeline „Sales" Stage **„Qualified Lead"**.
Leads landen im **Lead-Inbox** und werden vom Empfang/Vertrieb manuell zu Deals umgewandelt — oder nach 14 Tagen ohne Reaktion auf „Lost (kein Bedarf)" gesetzt.

> **Ausnahme „Erstgespräch geplant"-Stage:** Wenn Cal.com-Booking erfolgreich UND Self-Check grün → Deal startet direkt in Stage 2 („Erstgespräch geplant"). Spart einen manuellen Klick im CRM.

### 2.2 Pipeline „Sales" — empfohlene Stages

```
Stage 1 — Qualified Lead          (eingegangen, Mindest-Voraussetzungen geprüft)
Stage 2 — Erstgespräch geplant    (Cal.com-Termin steht im Kalender)
Stage 3 — Erstgespräch geführt    (Notiz im CRM, nächster Schritt definiert)
Stage 4 — Probe-Kalkulation       (kostenlose Test-Kalkulation in Arbeit)
Stage 5 — Konditionen verschickt  (Angebot Einzel / M / L raus)
Stage 6 — Aktiver Kunde           (mind. 1 Auftrag erteilt) → Won
   ↓
Verloren (Lost) mit Pflicht-Lost-Reason (siehe 2.4)
```

Won-Stage „Aktiver Kunde": Deal bleibt im CRM als Won, parallel kann Folge-Pipeline „Bestandskunden" für laufende Betreuung aufgebaut werden (Phase 4+, hier nicht weiter spezifiziert).

### 2.3 Pipedrive Custom Fields (für Person + Deal)

Diese Felder müssen in Phase 3 **vor** dem ersten echten Pipedrive-Push angelegt sein. Pflicht-Felder im Deal-Layer, sonst rauschen sie beim Anlegen unter.

#### Person-Level (Kontakt)

| Feld | Typ | Pflicht | Quelle | Bemerkung |
|---|---|---|---|---|
| Vorname | Standard | Ja | Form Schritt 2 | |
| Nachname | Standard | Ja | Form Schritt 2 | |
| E-Mail | Standard | Ja | Form Schritt 2 | |
| Telefon | Standard | Empfohlen | Form Schritt 2 | |
| Firma | Standard (Org-Link) | Ja | Form Schritt 1 | wird Pipedrive-Organization angelegt |
| Position im Unternehmen | Single-Option | Nein | Form Schritt 2 (optional) | „Inhaber/GF" / „Kalkulator" / „Bauleiter" / „Sonstiges" |

#### Organization-Level

| Feld | Typ | Pflicht | Quelle |
|---|---|---|---|
| Firmenname | Standard | Ja | Form Schritt 1 |
| Mitarbeiterzahl | Single-Option | Ja | Form Schritt 1 (1–3, 4–10, 11–25, 26–50, 51–100, 100+) |
| Hauptgewerk | Single-Option | Ja | Form Schritt 1 (Hochbau, Tiefbau, GaLaBau, Elektro, Haustechnik, Fenster, Schadstoff, Sonstiges) |
| Weitere Gewerke | Multi-Option | Nein | Form Schritt 1 |
| Einzugsgebiet (PLZ-Region) | Text | Ja | Form Schritt 1 |
| Umkreis (km) | Single-Option | Ja | Form Schritt 1 (25/50/75/100/150/200/+) |

#### Deal-Level (das Wichtige)

| Feld | Typ | Pflicht | Quelle |
|---|---|---|---|
| **Lead-Source** | Single-Option | Ja | Frontend-Submit (Erstgespräch / Tool GAEB / Tool Kalkulator / Kontakt / Cal.com / WhatsApp / Telefon manuell) |
| **Submission-Termin** | Datum | Nein | Form Schritt 2 (Freitext oder Date-Picker, falls Visitor angibt) |
| **LV-Anhang-Link** | URL | Nein | Pre-signed S3/MinIO-URL aus Tool-Upload (GAEB-Konverter speichert die hochgeladene Datei 30 Tage) |
| **Bevorzugtes Modell** | Single-Option | Nein | Form-Beifang (Einzel / M / L / unsicher) |
| **Self-Check-Ergebnis** | Multi-Option | Ja (falls Self-Check ausgefüllt) | „MA OK / Markt OK / Referenzen OK / Gewerk OK" |
| **Kurze Anfrage** | Long-Text | Nein | Form Schritt 2 |
| **Wunsch-Termin** | Datum/Zeit | Nein | Cal.com-Webhook |
| **UTM-Source** | Text | Nein | URL-Parameter beim Submit |
| **UTM-Medium** | Text | Nein | URL-Parameter |
| **UTM-Campaign** | Text | Nein | URL-Parameter |
| **UTM-Content** | Text | Nein | URL-Parameter |
| **UTM-Term** | Text | Nein | URL-Parameter |
| **First-Page-Path** | Text | Nein | localStorage (erste angesurfte Seite, hilft Attribution wenn UTM fehlt) |
| **Referrer** | Text | Nein | document.referrer beim ersten Visit |
| **Form-Variant** | Text | Nein | A/B-Test-Variante (für Phase 5+, jetzt schon mitlogen) |
| **DSGVO-Consent-Timestamp** | Datum/Zeit | Ja | Server-Timestamp beim Submit |
| **DSGVO-Consent-Text-Version** | Text | Ja | Versionsstring der akzeptierten Consent-Erklärung |

### 2.4 Lost-Reasons (Pflicht-Dropdown bei Stage „Verloren")

Pflicht, weil ohne Lost-Reason keine Marketing-Optimierung möglich ist. Vorschlag:

| Code | Lost-Reason | Wann gesetzt |
|---|---|---|
| `too_small` | Zu klein (< 3 MA) | Mindest-Voraussetzung nicht erfüllt |
| `wrong_region` | Falsche Region / kein Einzugsgebietsbedarf | Außerhalb Bedienungsraum |
| `no_references` | Keine 3 vergleichbaren Referenzen | Eignung nicht nachweisbar |
| `wrong_market_phase` | < 6 Monate am Markt | Mindest-Voraussetzung |
| `pricing_too_high` | Preis zu hoch / Budget knapp | Konditionen-Verhandlung gescheitert |
| `competitor_chosen` | Konkurrenz gewählt | „Wir haben uns für [X] entschieden" |
| `inhouse_decision` | Inhouse-Lösung präferiert | „Wir machen es weiter selbst" |
| `no_response` | Kein Kontakt nach mehrfachem Versuch | 14 Tage Funkstille |
| `bad_fit_other` | Sonstiger Misfit (Trade nicht bedient, Insolvenz etc.) | Freitext-Notiz Pflicht |
| `wrong_intent` | War nur Recherche / kein Kaufinteresse | Klarstellung im Erstgespräch |

### 2.5 Webhook-Strategy: synchron vs. asynchron

**Empfehlung: asynchron mit Retry-Queue.**

| Aspekt | Synchron | Asynchron (empfohlen) |
|---|---|---|
| Form-UX | Spinner solange Pipedrive antwortet | Form sofort „Danke" anzeigen |
| Pipedrive-Outage | Visitor sieht Fehler → frustriert | Form bleibt funktional, Retry im Hintergrund |
| Implementierung | Einfach (HTTP-Call inline) | Job-Queue (BullMQ/PG-Cron/RabbitMQ) |
| Risiko Lead-Verlust | Hoch bei API-Down | Niedrig (Persistenz in eigener DB) |

**Architektur:**

```
Browser → POST /api/forms/erstgespraech
           ↓ (validiert, persistiert in eigener DB als "submission")
Server: HTTP 200 "Danke"
           ↓
Worker: liest pending Submissions, pushed nach Pipedrive,
        bei Fehler exponential Backoff (60s, 5min, 30min, 2h, 12h, 24h, dann Slack-Alert)
```

Eigene DB-Tabelle `form_submissions` ist auch DSGVO-relevant (Auskunfts-/Löschpflicht). Sie ist die **Source of Truth**, Pipedrive ist Spiegel.

---

## 3. Form-Typen-Inventar

### 3.1 Hauptform — Mehrstufen-Erstgespräch (3 Schritte)

**Zweck:** Primärer Conversion-Pfad. Auf jeder Hauptseite (Home, Leistungen, Konditionen, Kontakt) erreichbar — entweder als Inline-Modul oder via CTA-Button („Erstgespräch vereinbaren").

**Konzept:** Drei sichtbare Schritte mit Progress-Bar. Mobile-First: Pro Schritt nur die Felder, die hinpassen ohne Scroll. Tablet+ kann Schritt 1 zweispaltig zeigen.

#### Schritt 1 — „Ihr Unternehmen"

| Feld | Typ | Validierung | Error-Message DE |
|---|---|---|---|
| Firma | text, required, min 2, max 120 | Pflicht, mind. 2 Zeichen | „Bitte geben Sie Ihren Firmennamen an." |
| Hauptgewerk | select, required | Pflicht | „Bitte wählen Sie Ihr Hauptgewerk." |
| Weitere Gewerke | multiselect, optional | — | — |
| Einzugsgebiet | text, required | Pflicht, freier Text (z. B. „Saarland und Rheinland-Pfalz") | „Bitte geben Sie an, in welcher Region Sie tätig sind." |
| Umkreis | select, required | Pflicht | „Bitte wählen Sie einen Umkreis." |
| Mitarbeiterzahl | select, required | Pflicht | „Bitte wählen Sie Ihre Mitarbeiterzahl." |

**Optionen Hauptgewerk:** Hochbau, Tiefbau, GaLaBau, Elektro, Haustechnik (HLS/TGA), Fenster/Türen, Schadstoffsanierung, Leitungsbau, Innenausbau, Straßenbau, Sonstiges.

**Optionen Mitarbeiterzahl:** 1–3, 4–10, 11–25, 26–50, 51–100, 100+.
**Optionen Umkreis:** 25, 50, 75, 100, 150, 200, „über 200 km / deutschlandweit".

**Inline-Hint unter dem Feld „Mitarbeiterzahl"**, wenn „1–3" gewählt wurde:
> „Hinweis: Wir arbeiten ab 3 Mitarbeitern, da Sie für öffentliche Ausschreibungen entsprechende Eignungsnachweise benötigen. Sie sind unsicher? Werfen Sie einen Blick auf unsere [Mindestvoraussetzungen](/ablauf/#mindestvoraussetzungen) — oder probieren Sie zunächst unsere [kostenlosen Tools](/tools/) aus."

(Visitor wird **nicht geblockt**, nur transparent informiert. Submit ist möglich → Lead, kein Deal.)

**Nach „Weiter":** Schritt 1 wird im localStorage zwischengespeichert (siehe §8). Progress-Bar springt auf 33 → 66 %.

#### Schritt 2 — „Ihre Kontaktdaten"

| Feld | Typ | Validierung | Error-Message DE |
|---|---|---|---|
| Vorname | text, required, max 60 | Pflicht | „Bitte geben Sie Ihren Vornamen an." |
| Nachname | text, required, max 60 | Pflicht | „Bitte geben Sie Ihren Nachnamen an." |
| Position | select, optional | — | — („Inhaber/GF" / „Kalkulator" / „Bauleiter" / „Assistenz" / „Sonstiges") |
| E-Mail | email, required, RFC-5322 | Pflicht, gültiges Format | „Bitte geben Sie eine gültige E-Mail-Adresse an." |
| Telefon | tel, recommended, deutsche Nummer-Heuristik (akzeptiert auch +49 / 0049) | Empfohlen, aber kein hard fail | „Bitte prüfen Sie die Telefonnummer (z. B. 0681 41096430)." (nur als Hinweis bei sichtbarem Format-Fehler) |
| Submission-Termin (optional) | date, optional | Datum >= heute, max +90 Tage | „Bitte wählen Sie ein Datum innerhalb der nächsten 90 Tage." |
| Kurze Anfrage | textarea, optional, max 1500 Zeichen | Zähler unter dem Feld | bei Überlauf: „Maximale Zeichenzahl erreicht (1500)." |

**Inline-Disclaimer unter dem Anfrage-Feld:**
> „Ihre Daten dienen ausschließlich der Bearbeitung Ihrer Anfrage. Wir geben sie nicht an Dritte weiter."

#### Schritt 3 — „Bestätigung & Datenschutz"

Zusammenfassung der bisherigen Eingaben (read-only, mit „Bearbeiten"-Link zurück zu Schritt 1/2). Darunter:

| Feld | Typ | Validierung | Error-Message DE |
|---|---|---|---|
| Honeypot „Webseite" | text, hidden, leer bleiben muss | falls ausgefüllt → silent reject (kein User-Feedback, Server protokolliert) | — |
| Datenschutz-Einwilligung | checkbox, required | Pflicht | „Bitte bestätigen Sie die Datenschutzhinweise, um fortzufahren." |
| (optional) Newsletter-Opt-In | checkbox, optional, defaultet auf NICHT angekreuzt | — | — (nur falls wir Newsletter machen — siehe 3.5) |

**Datenschutz-Text (verbal ausformuliert, für Versionierung):**

> „Ich willige ein, dass die KALKU GmbH die von mir angegebenen Daten zur Bearbeitung meiner Anfrage verarbeitet und mich per E-Mail oder Telefon kontaktiert. Die Daten werden gemäß unserer [Datenschutzerklärung](/datenschutz) verarbeitet und nicht an Dritte weitergegeben. Diese Einwilligung kann ich jederzeit per E-Mail an info@kalku.de widerrufen."

Versions-String fürs CRM: `consent-erstgespraech-v1-2026-05`.

#### Submit-Button & Erfolgs-State

- Button-Label: **„Anfrage absenden"** (Verb + Objekt, kein dummes „Senden")
- Während Request: Button disabled, Spinner, Label „Wird gesendet …"
- Erfolg: Replace Form mit Success-State (kein Modal, voller Container):
  > **Vielen Dank für Ihre Anfrage.**
  > Wir melden uns innerhalb eines Werktages bei Ihnen — meist deutlich schneller.
  > Möchten Sie direkt einen Termin vorschlagen? [Kalender öffnen](/kontakt/#termin)
  > Brauchen Sie sofort jemanden? [📞 +49 681 41096430](tel:+496814109643) oder [💬 WhatsApp](https://wa.me/4915167671877)

- Fehler-State (Server-Fehler, kein Validation):
  > Leider konnten wir Ihre Anfrage gerade nicht entgegennehmen. Bitte versuchen Sie es in einem Moment erneut, oder rufen Sie uns direkt an: +49 681 41096430.

**Plausible-Goal:** `form_submit_erstgespraech` (Custom-Property: `step_completed=3`, `lead_source=erstgespraech`)

---

### 3.2 Self-Check Eligibility — vorgelagerter Filter

**Zweck:** Visitor, der unsicher ist, ob er ins Profil passt, bekommt vor Form-Submit eine schnelle Antwort. Bei Disqualifikation: Empfehlung Tool (statt Frust).

**Platzierung:** Inline-Widget auf `/ablauf/`, `/leistungen/`, optional als Modal-Trigger neben „Erstgespräch vereinbaren"-Button („Passt das überhaupt zu uns? — 30 Sekunden").

**4 Ja/Nein-Fragen, jeweils mit Kurz-Erklärung:**

1. **„Hat Ihr Betrieb mindestens 3 Mitarbeiter?"**
   > Für die Eignung bei öffentlichen Ausschreibungen werden in der Regel mindestens drei Beschäftigte vorausgesetzt.

2. **„Besteht Ihr Unternehmen seit mindestens 6 Monaten?"**
   > Auftraggeber verlangen meist Nachweise zur wirtschaftlichen Stabilität — diese sind ab ca. einem halben Jahr realistisch belegbar.

3. **„Können Sie 3 vergleichbare Referenzprojekte vorweisen?"**
   > Referenzen sind das Herzstück Ihrer Eignung. Wir helfen Ihnen, diese passend zur Ausschreibung aufzubereiten.

4. **„Bedienen Sie mindestens eines unserer Schwerpunkt-Gewerke?"**
   > GaLaBau, Tiefbau, Hochbau, Elektro, Haustechnik, Fenster, Schadstoff. (Sonstiges → wir prüfen im Einzelfall.)

**Auswertung:**
- **4 × Ja** → grüner Block: „Sie erfüllen alle Voraussetzungen. Buchen Sie ein 15-Minuten-Erstgespräch — kostenlos, unverbindlich." → CTA „Termin wählen" (Cal.com).
- **3 × Ja** → gelber Block: „Sie sind fast soweit. Lassen Sie uns kurz besprechen, was noch fehlt." → CTA „Erstgespräch vereinbaren" (Mehrstufen-Form).
- **≤ 2 × Ja** → blauer Hinweis: „Aktuell sehen wir noch keinen idealen Match für eine Zusammenarbeit. Aber: Unsere kostenlosen Tools helfen Ihnen sofort." → CTA-Tiles auf `/tools/gaeb-konverter/` und `/tools/kalkulator/`.

**Wichtig:** Self-Check sammelt **keine personenbezogenen Daten** (keine Mail, kein Name). Antworten werden nur clientseitig ausgewertet, optional als Plausible-Goal `eligibility_check_completed` mit Property `score=4/3/2/1/0` mitgeloggt (anonym).

Falls aus dem Self-Check heraus zur Hauptform gewechselt wird, wird das Ergebnis im Hidden-Field „Self-Check-Ergebnis" mitgeschickt → landet im Pipedrive-Custom-Field.

---

### 3.3 GAEB-Konverter — Tool-Email-Capture

**Zweck:** Lead-Magnet. Tool ist anonym nutzbar (Stufe 1). Premium-Auswertung (Stufe 2: AI-Klassifizierung) erfordert E-Mail.

**Felder Premium-Capture:**

| Feld | Typ | Validierung | Error-Message DE |
|---|---|---|---|
| E-Mail | email, required | gültiges Format | „Bitte geben Sie eine gültige E-Mail-Adresse an." |
| (optional) Firma | text, optional | — | — |
| Honeypot „Telefon-Kontakt" | hidden | leer bleiben | — |
| DSGVO-Checkbox | required | Pflicht | „Bitte bestätigen Sie die Datenschutzhinweise." |

**DSGVO-Text:**
> „Ich willige ein, dass mir die Premium-Auswertung meiner GAEB-Datei per E-Mail zugesendet wird und meine Kontaktdaten zur einmaligen Bearbeitung gespeichert werden. Mehr in der [Datenschutzerklärung](/datenschutz)."

**Erfolgs-State:** „Wir verarbeiten Ihre Datei. Die Premium-Auswertung erhalten Sie innerhalb von 2 Stunden per Mail an [E-Mail]."

**Pipedrive-Push:**
- Lead (nicht Deal — keine Mindest-Voraussetzungen geprüft)
- Source: „Tool: GAEB-Konverter"
- Custom Field „LV-Anhang-Link": pre-signed URL zur hochgeladenen Datei (30 Tage TTL)
- Stage: „Lead Inbox" → manuell triagieren

**Rate-Limit:** 3 Premium-Konvertierungen pro IP / 24h, danach Cloudflare-Turnstile-Challenge.

**Plausible-Goals:** `gaeb_upload_anonymous` (Stufe 1 ohne E-Mail), `gaeb_upload_premium` (Stufe 2 mit E-Mail).

---

### 3.4 Position-Kalkulator — Tool-Email-Capture

**Zweck:** Identische Logik wie GAEB-Konverter, aber für den Online-Kalkulator. Lead-Magnet ist „Marktvergleich basierend auf 50.000+ realen Kalkulationen".

**Felder:**

| Feld | Typ | Validierung |
|---|---|---|
| E-Mail | email, required | gültiges Format |
| (optional) Firma | text, optional | — |
| Honeypot | hidden | leer |
| DSGVO-Checkbox | required | Pflicht |
| **Optional**: „Diese Berechnung mit zur Beratung mitnehmen?" Checkbox | optional, default OFF | — |

Wenn die optionale Checkbox **angekreuzt** ist:
- Berechnungs-JSON wird als Anhang an den Pipedrive-Lead gehängt (Note + URL)
- Custom Field „Kurze Anfrage" wird vorausgefüllt mit „Online-Kalkulator-Berechnung — siehe Anhang"
- Lead-Source = „Tool: Kalkulator (mit Berechnung)"

Wenn nicht angekreuzt: nur Lead mit E-Mail, Source = „Tool: Kalkulator".

**Rate-Limit:** 5/24h pro IP.

**Plausible-Goals:** `kalkulator_used`, `kalkulator_lead_with_calc`.

---

### 3.5 Newsletter — Empfehlung & Begründung

**Empfehlung: JA, aber bewusst klein gehalten.**

**Begründung:**
- Bauunternehmer-GFs sind keine Newsletter-Abnehmer-Spezies (geringe Öffnungsraten in diesem Segment).
- Dennoch: für „Researching"-Visitor (Intent A), die noch nicht ready sind, ist Newsletter der einzige Weg, im Spiel zu bleiben.
- Use-Case ist „Wissens-Update": neue Vergaberecht-Urteile, Formblatt-Änderungen, GAEB-Versionsupdates. Nicht Werbung.
- Frequency: **maximal 1× pro Monat**. Sonst Abmeldewelle.

**Tool-Empfehlung: Listmonk** (OSS, self-hosted, neben Plausible auf eigenem Server, DSGVO clean). Alternativen falls keine Self-Hosting-Kapazität: **Brevo** (DE-Server, AVV verfügbar) oder **CleverReach** (DE-Anbieter).

**Form (Footer + im Blog):**

| Feld | Typ | Validierung |
|---|---|---|
| E-Mail | email, required | gültig |
| (optional) Vorname | text, optional | — |
| DSGVO-Checkbox | required | Pflicht |

**DSGVO-Text:**
> „Ja, ich möchte den KALKU-Newsletter mit Branchen-Updates zu Vergaberecht, Formblättern und Kalkulationspraxis erhalten (max. 1× monatlich). Ich kann mich jederzeit über den Abmelde-Link am Ende jeder Mail wieder austragen."

**Double-Opt-In Pflicht** (Bestätigungs-Mail). DOI-Bestätigungen werden gesondert protokolliert.

**Pipedrive-Push:**
- Newsletter-Anmeldungen sind **kein** Deal-Trigger.
- Person wird in Pipedrive als Kontakt angelegt (oder Tag „Newsletter" gesetzt, falls schon vorhanden).
- Pipeline „Sales" wird **nicht** angefasst.
- Vorteil: spätere Newsletter → Deal-Conversion ist trackbar.

**Plausible-Goal:** `newsletter_signup_doi` (erst nach DOI-Bestätigung).

---

### 3.6 Kontakt-Kurz-Form (Kontakt-Seite)

**Zweck:** Niedrigschwellige Anfrage für Visitor, die nicht ins Verkaufstrichter wollen — Presse, Lieferanten, „nur eine Frage". Filter, damit der Vertrieb nicht mit „Habt ihr eine Stellenanzeige?" zugemüllt wird.

**Felder:**

| Feld | Typ | Validierung | Error |
|---|---|---|---|
| Anliegen-Dropdown | select, required | Pflicht (Optionen: „Frage zu Ihren Leistungen", „Presse / Medien", „Partnerschaft / Lieferant", „Bewerbung", „Sonstiges") | „Bitte wählen Sie ein Anliegen." |
| Vorname | text, required | min 2 | „Bitte geben Sie Ihren Vornamen an." |
| Nachname | text, required | min 2 | „Bitte geben Sie Ihren Nachnamen an." |
| E-Mail | email, required | gültig | „Bitte geben Sie eine gültige E-Mail-Adresse an." |
| (optional) Firma | text, optional | — | — |
| Nachricht | textarea, required, min 20, max 2000 | min 20 Zeichen | „Bitte schildern Sie Ihr Anliegen kurz (mindestens 20 Zeichen)." |
| Honeypot | hidden | leer | — |
| DSGVO-Checkbox | required | Pflicht | „Bitte bestätigen Sie die Datenschutzhinweise." |

**Routing nach Anliegen:**
- „Frage zu Leistungen" → Lead in Pipedrive Sales-Pipeline, Source „Kontakt allgemein", Stage „Lead Inbox"
- „Presse" → Lead, Pipeline „Allgemein", Tag „Presse", **kein Sales-Touch**
- „Partnerschaft / Lieferant" → Lead, Pipeline „Allgemein", Tag „Partner"
- „Bewerbung" → Pipeline „Recruiting" (Phase 5+), bis dahin: Lead in Allgemein mit Tag „Bewerbung", manueller Forward an HR-Mailadresse
- „Sonstiges" → Lead, Pipeline „Allgemein", manuelle Triage

**Plausible-Goal:** `form_submit_kontakt` (Custom-Property: `anliegen=<wert>`)

---

### 3.7 Cal.com-Booking — Embed + Webhook

**Kein klassisches Form**, sondern Iframe-Embed bzw. Routing zur Cal.com-Subdomain (`termin.kalku.de` oder `cal.com/kalku`). Empfehlung: **Embed** mit Inline-Variant, damit Visitor unsere Seite nicht verlässt.

**Konfiguration in Cal.com:**

- **Event-Typ „Erstgespräch (15 Min telefonisch)"** — Standard
- **Event-Typ „Probe-Kalkulation Onboarding (30 Min, Telefon/Video)"** — nach Erstgespräch
- **Event-Typ „Übergabe einer Ausschreibung (15 Min, kurzfristig)"** — für Funnel 3
- Cal.com-Custom-Fields am Booking:
  - Firma (text, required)
  - Hauptgewerk (select, required, gleiche Optionen wie Mehrstufen-Form)
  - Mitarbeiterzahl (select, required)
  - Telefonnummer (tel, required)
  - Submission-Termin (date, optional)
  - Kurze Anfrage (textarea, optional)

**Webhook → Server-Endpoint:**

```
Cal.com → POST https://kalku.de/api/webhooks/cal
   Header: Authorization (HMAC signature, Pflicht prüfen!)
   Body: { event_type, attendee, payload, fields, ... }
       ↓
Server: validiert Signatur, persistiert in DB,
        pushed in Pipedrive (Deal in Stage „Erstgespräch geplant")
        Custom Field „Wunsch-Termin" = Cal.com-Slot
        Custom Field „Lead-Source" = "Cal.com Booking"
```

**Wichtig:** Cal.com-Booking ist immer **Deal**, nie Lead — der Visitor hat aktiv Termin gebucht. Self-Check kann optional vorgeschaltet werden (Cal.com erlaubt Routing-Forms im Workflow).

**DSGVO:**
- Cal.com-Cloud setzt Cookies → Cookie-Banner-Trigger (siehe §7).
- Alternative: Cal.com selbsthosten, dann Cookie-frei konfigurierbar. **Empfehlung: self-host** (passt zur Plausible-/Listmonk-Linie).

**Plausible-Goal:** `calendar_booked` (Custom-Property: `event_type=erstgespraech/probekalkulation/uebergabe`)

---

## 4. Spam-Schutz

Drei Schichten, je nach Form-Typ unterschiedlich strikt eingesetzt.

### 4.1 Honeypot-Field (Layer 1, alle Forms)

- Ein verstecktes Input-Feld (`<input name="webseite" type="text" autocomplete="off" tabindex="-1" style="position:absolute;left:-9999px">`).
- Wird von Browsern ignoriert (CSS off-screen + tabindex), von Bots aber stumpf ausgefüllt.
- Server-side: Wenn nicht leer → silent reject (HTTP 200 fake-success, aber kein Pipedrive-Push).
- **Kosten: null. Effizienz: ~80 % Bots gefangen.**

### 4.2 Rate-Limit per IP (Layer 2, alle Forms)

- Pro IP-Adresse maximal **3 Form-Submits / Stunde**, **10 / Tag**.
- Pro IP+E-Mail-Kombination: **1 / 5 Minuten** (verhindert versehentliches Doppel-Klicken bei Spinner-Verlust).
- Implementierung: Redis (oder Postgres-Tabelle mit Index auf `(ip, created_at)`).
- Tool-Forms haben separate, lockerere Limits (siehe 3.3 / 3.4).

### 4.3 Cloudflare Turnstile (Layer 3, optional/strikt)

- DSGVO-konforme reCAPTCHA-Alternative von Cloudflare (kein Tracking-Cookie, keine Personenbezogene-Daten-Übertragung außer der IP an Cloudflare).
- Unsichtbar in 95 % der Fälle, fordert Challenge nur bei Verdacht.
- **Wann einsetzen:**

| Form | Honeypot | Rate-Limit | Turnstile |
|---|---|---|---|
| Mehrstufen-Erstgespräch | Ja | Ja | **Nein** (zu viel Friction für High-Intent) |
| Self-Check | — (kein Submit) | — | — |
| GAEB-Konverter Premium | Ja | Ja | **Ja** (Tool-Forms ziehen Bots an) |
| Kalkulator Premium | Ja | Ja | **Ja** |
| Newsletter | Ja | Ja | **Nein** (DOI ist eigener Spam-Filter) |
| Kontakt-Kurz | Ja | Ja | **Ja, ab 2. Submission desselben Browsers** |
| Cal.com-Booking | (Cal.com-eigen) | (Cal.com-eigen) | (Cal.com-eigen) |

**Cookie-Frage:** Turnstile setzt unter bestimmten Konfigurationen ein Cookie (`__cf_bm`). Bei „Managed"-Mode kann es ohne Cookie betrieben werden — diese Option **erzwingen**. Sonst: Klaro!-Banner-Trigger.

---

## 5. WhatsApp & Mobile-Conversion

### 5.1 Sticky-Mobile-CTA-Bar

**Wann erscheint sie:**
- Nur Mobile (`< 768 px Viewport`) und Tablet-Portrait
- Erscheint nach **30 % Scroll-Tiefe** ODER nach **8 Sekunden Verweildauer**, je nachdem was zuerst eintritt
- Bleibt sichtbar bis Form-Submit oder bis Cal.com-Modal offen
- Schließbar via X (Close), Re-Trigger erst nach 24 h (localStorage)

**Inhalt (3 Buttons, gleichmäßige Aufteilung):**

```
┌───────────────────────────────────────────┐
│ 📞 Anrufen │ 💬 WhatsApp │ ✉ Termin     │
└───────────────────────────────────────────┘
```

- **Anrufen:** `tel:+496814109643` → Plausible `cta_mobile_call`
- **WhatsApp:** `https://wa.me/4915167671877?text=...` (Text siehe 5.2) → Plausible `cta_mobile_whatsapp`
- **Termin:** Scroll-To-Cal.com-Embed bzw. Modal → Plausible `cta_mobile_termin`

Höhe: 56 px, Background `bg-primary-700` (kalku-blau), Text weiß. Safe-Area-Inset für iOS Notch berücksichtigen.

### 5.2 WhatsApp Tap-to-Chat — vorausgefüllter Text pro Page-Context

Der `text=`-Parameter im WhatsApp-Link wird pro Seitenkontext angepasst (URL-encoded):

| Page | Vorausgefüllter Text |
|---|---|
| Home / generisch | „Hallo, ich interessiere mich für Ihre Baukalkulations-Leistungen und hätte eine kurze Frage." |
| /leistungen/galabau/ | „Hallo, ich habe eine Frage zu Ihrer GaLaBau-Kalkulation: " |
| /leistungen/elektro/ | „Hallo, ich habe eine Frage zu Ihrer Elektro-Kalkulation: " |
| (analog für jedes Gewerk — generisch templated mit Gewerk-Name) | … |
| /konditionen/ | „Hallo, ich hätte eine Frage zu Ihren Konditionen: " |
| /tools/gaeb-konverter/ | „Hallo, ich habe eine Frage zum GAEB-Konverter: " |
| /tools/kalkulator/ | „Hallo, ich habe eine Frage zum Online-Kalkulator: " |
| /ablauf/ | „Hallo, ich möchte gerne den Ablauf einer Zusammenarbeit besser verstehen: " |
| /kontakt/ | „Hallo KALKU-Team, " |

**Implementierung:** Pro Seite ein `getWhatsappLink(context)`-Helper, der den Text URL-encoded an die Basis-URL anhängt.

### 5.3 Click-to-call (`tel:`) — Strategie

- **Sticky Mobile-Bar:** ja, prominent.
- **Header (Desktop):** Telefon als sekundäres Element, klickbar. Auf Desktop kein `tel:` direkt verlinken (Browser fragt User nach App), sondern `tel:` mit `data-clipboard`-Fallback (Klick → tel:-Versuch + parallel Toast „Nummer kopiert").
- **Footer:** Telefon, E-Mail, WhatsApp als gleichberechtigte Trio.
- **Auf Erfolgs-States** der Forms: prominent als Backup-Pfad (siehe 3.1).

---

## 6. Exit-Intent

### 6.1 Trigger-Logik (Desktop only)

Exit-Intent-Modal erscheint, wenn **alle** dieser Bedingungen erfüllt sind:

1. **Mausbewegung** verlässt Viewport am oberen Rand (`mouseleave` mit `clientY < 10`)
2. **Scroll-Tiefe** ≥ 25 % (Visitor war mindestens minimal engagiert, kein Bouncer)
3. **Verweildauer** ≥ 15 Sekunden
4. **Noch nicht gesehen** in den letzten 30 Tagen (localStorage `kalku_exit_intent_last_shown_at`)
5. **Keine Tool-/Form-Page** (auf `/tools/*` und `/kontakt/` deaktiviert — Visitor ist da schon im Funnel)

### 6.2 Mobile

Mobile **kein** Exit-Intent — `mouseleave` existiert nicht. Stattdessen:
- **Scroll-Back-Up Trigger:** Wenn Visitor 80 % nach unten gescrollt hat und dann schnell wieder >40 % nach oben scrollt (vermutlich auf der Suche nach „verließ ich was"), zeigen wir einen Inline-Banner („Bevor Sie gehen: …") oben in der nächsten Section. Kein Modal — Modals auf Mobile sind 2026 verbrannt.
- Frequency-Cap identisch (30 Tage via localStorage).

### 6.3 Modal-Inhalt

**Lead-Magnet: Whitepaper „7 Fehler in der VOB-Kalkulation, die Bauunternehmer Geld kosten"** (PDF, 8–12 Seiten, in Phase 4 zu erstellen).

```
┌─────────────────────────────────────────────────┐
│  Bevor Sie gehen:                               │
│                                                 │
│  Whitepaper kostenlos                           │
│  „7 Fehler in der VOB-Kalkulation"              │
│                                                 │
│  Die häufigsten Stolperfallen, die uns          │
│  bei eingereichten Kalkulationen am             │
│  meisten begegnen — als PDF zum Download.       │
│                                                 │
│  E-Mail: [_______________________]              │
│  □ Datenschutzhinweise akzeptieren              │
│                                                 │
│  [ PDF anfordern ]      [ Nein danke ]          │
└─────────────────────────────────────────────────┘
```

**Felder:**

| Feld | Typ | Validierung |
|---|---|---|
| E-Mail | email, required | gültig |
| DSGVO-Checkbox | required | Pflicht |
| Honeypot | hidden | leer |

**DSGVO-Text:**
> „Ich willige ein, dass mir das Whitepaper per E-Mail zugesandt wird und meine E-Mail-Adresse für eine eventuelle Nachfass-Mail (max. 1) gespeichert wird. Mehr in der [Datenschutzerklärung](/datenschutz)."

**Pipedrive-Push:**
- Lead, Source „Whitepaper Exit-Intent"
- Tag „Whitepaper VOB-Kalkulation"
- Pipeline „Sales", Stage „Lead Inbox"

**Plausible-Goal:** `exit_intent_lead_captured`. Außerdem `exit_intent_dismissed` (für Optimierung).

---

## 7. Tracking & Attribution

### 7.1 UTM-Parameter — Pflicht-Schema für Marketing-Channels

Jeder Marketing-Channel bekommt eine fixe UTM-Convention. Diese ist im Marketing-Briefing dokumentiert und muss eingehalten werden, sonst zerfällt die Attribution.

| Channel | utm_source | utm_medium | utm_campaign | Beispiel |
|---|---|---|---|---|
| Google Ads | `google` | `cpc` | `<kampagnen-name>` | `?utm_source=google&utm_medium=cpc&utm_campaign=galabau-kalkulation-saarland` |
| Bing Ads | `bing` | `cpc` | … | |
| Newsletter | `newsletter` | `email` | `<ausgabe>` | `?utm_source=newsletter&utm_medium=email&utm_campaign=2026-06-vergaberecht-update` |
| LinkedIn organisch | `linkedin` | `social` | `<post-thema>` | |
| LinkedIn Ads | `linkedin` | `paid_social` | … | |
| Direct (kein UTM) | (leer → fallback `(direct)`) | | | |
| Print/QR-Code | `print` | `qr` | `<medium>` | `?utm_source=print&utm_medium=qr&utm_campaign=visitenkarte-coksari` |

**Frontend speichert UTM-Params** beim ersten Visit in localStorage (`kalku_utm`) und packt sie an jeden Form-Submit. So funktioniert Attribution auch, wenn Visitor zwischen UTM-Visit und Submit mehrere Seiten besucht.

### 7.2 Was geht wohin?

| Datum | Pipedrive Custom Field | Plausible-Goal-Property | Eigene DB |
|---|---|---|---|
| UTM-Source/Medium/Campaign/Content/Term | Ja | Nein (Plausible hat eigenes UTM-Tracking) | Ja (form_submissions) |
| First-Page-Path | Ja | Nein | Ja |
| Referrer | Ja | (Plausible eigenständig) | Ja |
| Self-Check-Score | Ja | Ja (`score=4`) | Ja |
| Form-Variant (A/B) | Ja | Ja (`variant=a/b`) | Ja |
| Lead-Source (Form-Typ) | Ja | Ja (`lead_source=erstgespraech`) | Ja |
| DSGVO-Consent-Version | Ja | Nein | Ja |

### 7.3 Plausible-Goals (komplette Enumeration)

```
form_submit_erstgespraech       (Mehrstufen-Form Schritt 3 erfolgreich)
form_submit_kontakt             (Kurz-Kontakt-Form, Property: anliegen)
gaeb_upload_anonymous           (Tool Stufe 1)
gaeb_upload_premium             (Tool Stufe 2 mit E-Mail)
kalkulator_used                 (Kalkulator interagiert ≥1 Position)
kalkulator_lead_with_calc       (Kalkulator-Lead mit Berechnungs-Anhang)
calendar_booked                 (Cal.com-Webhook bestätigt, Property: event_type)
newsletter_signup_doi           (DOI-Bestätigung erfolgt)
exit_intent_lead_captured       (Whitepaper Lead)
exit_intent_dismissed           (Modal weggeklickt)
cta_mobile_call                 (Sticky-Bar Anrufen geklickt)
cta_mobile_whatsapp             (Sticky-Bar WhatsApp geklickt)
cta_mobile_termin               (Sticky-Bar Termin geklickt)
eligibility_check_completed     (Self-Check beantwortet, Property: score)
form_step_advance_erstgespraech (Property: from_step=1, to_step=2)
form_abandoned_erstgespraech    (heuristisch: localStorage-State älter 24h ohne Submit)
```

### 7.4 Cookie-Banner — Notwendigkeit

**Plausible** ist cookie-less → kein Banner.
**Cal.com selbst-gehostet, „No-Cookie"-Konfig** → kein Banner.
**Cloudflare Turnstile „Managed"-Mode** → kein Banner.
**WhatsApp-Click** ist nur eine `wa.me`-URL → kein Cookie auf unserer Seite.
**localStorage** ist technisch notwendig (Form-State-Persistence, Frequency-Caps) → kann unter „berechtigtes Interesse" / „Funktionalität" laufen, kein expliziter Consent nötig — **aber transparente Erwähnung** in der Datenschutzerklärung.

→ **Empfehlung: KEIN Cookie-Banner zum Launch.**
→ **Pflicht: Klaro!-Banner aktivieren**, falls einer dieser Punkte eintritt:
- Cal.com-Cloud statt Self-Host (setzt `cal-session`-Cookie)
- Turnstile mit `__cf_bm`-Cookie
- Google Maps Embed (z. B. auf Kontakt-Seite)
- YouTube-Embed (Tutorials/Cases)
- LinkedIn Insights Tag
- Hotjar / FullStory / Microsoft Clarity (jegliches Replay/Heatmap)

Wenn Klaro! aktiv: Default „nur essenzielle", Plausible immer geladen (cookie-less), Drittanbieter erst nach Opt-In.

---

## 8. Form-State-Persistence

**Frage:** Soll der Mehrstufen-Form Inhalt im localStorage zwischengespeichert werden?

**Empfehlung: Ja, aber konditional und mit Self-Cleanup.**

### 8.1 Mechanik

- Schritt 1 + 2 werden bei „Weiter" in localStorage geschrieben (`kalku_form_erstgespraech`).
- Beim Re-Visit derselben Seite: Wenn State < 24 h alt → Banner oben „Möchten Sie Ihre Anfrage von gestern weiterführen? [Ja] [Verwerfen]".
- Bei „Ja": Formdaten gehydrate, Visitor steht auf Schritt, wo er aufgehört hat.
- Bei erfolgreichem Submit oder „Verwerfen": localStorage geleert.
- Nach 24 h ohne Aktion: automatisch verfallen (TTL via Timestamp-Check beim Load).

### 8.2 Trade-off Privacy vs. Conversion

| Pro | Contra |
|---|---|
| Conversion-Rate steigt nachweislich (Visitor kommt mit halbgenommenem Form zurück, will nicht von vorne anfangen) | Sensible Daten (Telefonnummer, Kurze Anfrage) liegen 24 h im Browser-Storage |
| Funktioniert offline & ohne Server-Roundtrip | Bei Shared-Devices („Bauleiter leiht Tablet weiter") sehen andere die Daten |
| Kein Cookie, kein Server-Tracking | Re-Hydrate-Banner ist eine kognitive Last („was war das nochmal?") |

**Mitigation:** 
- Im Datenschutz-Hinweis transparent erwähnen: „Wir speichern Ihre Form-Eingaben für 24 Stunden lokal in Ihrem Browser, damit Sie eine begonnene Anfrage später fortsetzen können."
- Re-Hydrate-Banner zeigt nur: „Anfrage vom 13. Mai weiterführen? — Sie waren bei Schritt 2." (nicht den Inhalt selbst).
- Auf Tools-Forms (3.3 / 3.4): **kein** State-Persistence für E-Mail-Capture-Schritt — überflüssig, der Schritt ist klein.
- Auf Kontakt-Kurz-Form (3.6): **kein** State-Persistence — Form ist 1 Bildschirm, persist bringt nichts.

---

## 9. A/B-Test-Plan (Phase 5+)

Nach Launch hat es Sinn, datengetrieben zu optimieren. Vorher (zu wenig Traffic für Signifikanz) ist Bauchgefühl realistischer.

### 9.1 Tooling

**Empfehlung: GrowthBook (OSS, self-hosted)**
- Server-side Feature-Flags + Experimente, integriert sich nativ mit Plausible (custom event source)
- Kostenlos, EU-konform, läuft auf demselben Server wie Plausible/Listmonk
- Alternative: PostHog (umfangreicher, aber eher komplex und Cookie-lastig)

### 9.2 Top 5 A/B-Tests für Phase 5

| # | Was wird getestet | Hypothese | Metric | Mindest-Stichprobe |
|---|---|---|---|---|
| 1 | Hero-Headline „LV in 48 h bepreist" vs. „Submission morgen? Wir schaffen es." vs. „7 Gewerke, ein Kalkulationsteam" | Konkrete Zeit-Promise schlägt USP-Promise | `form_submit_erstgespraech` / Visitor | 3.000 Visits/Variant |
| 2 | Cal.com-Embed Inline vs. „Termin wählen"-Button → Modal | Inline = niedrigere Friction → mehr Bookings | `calendar_booked` / Visitor | 1.500 Visits/Variant |
| 3 | Mehrstufen-Form 3 Schritte vs. 1 Step (langes Form) | Kürzer = mehr Submits, Multi-Step = höhere Qualität | Submits + Lead-Quality (% qualifiziert) | 2.000 Visits/Variant |
| 4 | Self-Check „immer eingeblendet" vs. „nur per CTA" | Sichtbarer Self-Check filtert besser, weniger Müll | Lead-zu-Deal-Conversion-Rate | 4.000 Visits/Variant |
| 5 | Sticky-Mobile-Bar Inhalt: 3 Buttons gleichgewichtig vs. 1 dominanter „Termin" + 2 sekundäre | Klare Hierarchie = mehr Termin-Bookings | `cta_mobile_termin` / mobile Visitor | 2.500 mobile Visits/Variant |

### 9.3 Mindset

- Jeder Test braucht **definiertes Erfolgsziel** und **Stop-Criteria** (Stichprobe + max. Laufzeit 4 Wochen).
- Kein A/B-Test ohne Pre-Reg-Hypothese (sonst „p-hacking").
- Nicht mehr als 1 Test gleichzeitig auf demselben Funnel (Interaktionen verfälschen).

---

## 10. Summary — die 3 wichtigsten Decisions, Custom Fields & 1 Risiko

### Top-3 Conversion-Decisions

1. **Asynchroner Pipedrive-Push mit Job-Queue** — keine Form-Submit ist je vom Pipedrive-Status abhängig. Eigene DB-Tabelle `form_submissions` ist Source of Truth, Pipedrive ist Spiegel. Kosten: ein Worker-Service, ein Retry-Mechanismus. Nutzen: kein Lead geht verloren bei API-Outage und Form bleibt unter 200 ms responsive.
2. **Self-Check Eligibility als Vor-Filter** — vier Ja/Nein-Fragen vor dem Mehrstufen-Form. Trennt qualifizierte Visitor (4/4 → Deal in „Qualified Lead") von Tool-Usern (≤2 → Tools statt Form). Reduziert die Müll-Lead-Quote im Sales messbar und liefert ein Plausible-Goal-Signal für Funnel-Tuning.
3. **Cal.com self-hosted statt Cloud** — verhindert ein Cookie-Banner, hält Datenfluss bei uns, kostet nur eine zusätzliche Container-Instanz. Konsequenz: zum Launch ist die Seite mit hoher Wahrscheinlichkeit Cookie-Banner-frei, was die Conversion auf den ersten Bildschirmen merklich verbessert.

### Pipedrive Custom Fields — Phase 3 Anlege-Liste

**Person:** Position im Unternehmen.
**Organization:** Mitarbeiterzahl, Hauptgewerk, Weitere Gewerke (multi), Einzugsgebiet (PLZ-Region), Umkreis (km).
**Deal:** Lead-Source, Submission-Termin, LV-Anhang-Link, Bevorzugtes Modell, Self-Check-Ergebnis (multi), Kurze Anfrage, Wunsch-Termin (Cal.com), UTM-Source, UTM-Medium, UTM-Campaign, UTM-Content, UTM-Term, First-Page-Path, Referrer, Form-Variant, DSGVO-Consent-Timestamp, DSGVO-Consent-Text-Version.
**Lost-Reasons (Pipeline-Setting):** too_small, wrong_region, no_references, wrong_market_phase, pricing_too_high, competitor_chosen, inhouse_decision, no_response, bad_fit_other, wrong_intent.
**Pipelines:** Sales (6 Stages), Allgemein (Press/Partner), Recruiting (Phase 5+).

### Risiko für den Boss vor Phase 3

**WhatsApp-Business-API ist nicht dasselbe wie eine Tap-to-Chat-`wa.me/`-URL.** Die im Audit dokumentierte Nummer (+49 1516 7671877) funktioniert für Tap-to-Chat (Visitor öffnet WhatsApp mit vorausgefülltem Text), aber alle eingehenden WhatsApp-Nachrichten landen nur im persönlichen WhatsApp dieser Nummer und **erscheinen nicht im Pipedrive**. Wer eine echte WhatsApp-Pipedrive-Integration mit Lead-Logging will, braucht einen WhatsApp Business API-Provider (z. B. 360dialog, Twilio, MessageBird), der DSGVO-konform und kostenpflichtig ist (Setup-Aufwand inkl. Meta-Verifizierung typischerweise 2–4 Wochen, monatliche Kosten je nach Volumen). **Vor Phase 3 entscheiden:** Tap-to-Chat-only (gratis, kein CRM-Tracking) oder Business-API (Lead-Logging, aber Aufwand und Kosten) — sonst bauen wir die WhatsApp-Conversion blind und sehen sie später nicht in Pipedrive-Reports.
