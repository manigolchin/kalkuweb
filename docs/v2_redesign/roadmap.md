# Competitor Benchmark & Product Roadmap

**Date:** 2026-05-22
**Author:** Research pass (Claude autonomous)
**Scope:** Nine bid/AVA/construction-calc products vs. Kalku positioning ("Bieter-Kalkulationsbüro" — humans + lean SaaS, not a self-service AVA tool).

This is a competitive scan, not an exhaustive RFP. We focus on the four things that matter for Kalku's roadmap:

1. **Calculation depth** — can they actually produce a defensible EP/GP with EFB-style Zuschläge?
2. **Customer-sharing flow** — what does the *bid-recipient* see? PDF email? Portal link? Approval click?
3. **Excel/GAEB import quality** — the daily friction of every Kalkulator we know.
4. **Pricing band** — to anchor where our €200–600 single-LV / €3k Paket-M / €5k Paket-L sits.

---

## 1. Nevaris (Nemetschek) — https://www.nevaris.com

- **Calculation features:** Full EKT-Kalkulation (Einzelkosten der Teilleistungen), Zuschlagskalkulation, EFB-Formblätter integriert, VOB-Ausgleich nach §2 Nr. 3; ABC-Analyse und Varianten je Projekt.
- **Customer-sharing flow:** Subunternehmer-Workflow ist eingebaut (Anfrage → Angebot → Auftrag), aber **kein dediziertes Kunden-Annahme-Portal sichtbar** — Output bleibt PDF/GAEB-DA84 per Mail.
- **Excel-import quality:** Zertifizierter GAEB XML 3.1/3.2 + REB 23.003 Import/Export, Drag-and-drop aus Vorlagen; Excel-Austausch nur über Umwege (Export, kein nativer Import-Editor).
- **Pricing band:** Modular; öffentlich nicht ausgewiesen. Aggregator nennt 35 €/User/Jahr (zweifelhaft, vermutlich nur Add-on). De facto Enterprise (contact).

## 2. BRZ Bausoftware — https://www.brz.eu

- **Calculation features:** BRZ 365 Bautechnik bietet Kalkulation, freie/REB-Mengenermittlung, Arbeitskalkulation, Regieabrechnung — neu mit KI-Kalkulationsassistent.
- **Customer-sharing flow:** Fokus auf E-Rechnung (ZUGFeRD, XRechnung, Peppol) als Output-Kanal an Auftraggeber. Kein erkennbares Kunden-Annahme-Portal für Angebote, eher Mail+PDF.
- **Excel-import quality:** Bidirektionaler GAEB-Workflow (Einlesen → Kalkulation → Rückspielen DA84) vollständig intern; Excel-Tauglichkeit nicht prominent kommuniziert.
- **Pricing band:** Pakete Starter/Profi/Premium, Preise erst nach Login im Shop; E-Rechnung 0,42 € pro Transaktion zusätzlich. Indikator: Enterprise-Cloud, vierstellig p. a.

## 3. California.pro (G&W) — https://www.gw-software.de

- **Calculation features:** Klassische AVA (Ausschreibung/Vergabe/Abrechnung) inkl. Kostenberechnung, Angebot, Auftrag, Nachtrag; SIRADOS-Baudaten als Add-on (Lohn-Mittel + Stundenwerte).
- **Customer-sharing flow:** Output ist primär GAEB DA84 + PDF — gedacht für Bieter, die an öffentliche Vergabestellen liefern, **kein Endkunden-Portal**.
- **Excel-import quality:** Zertifiziert für GAEB 90, 2000, XML 3.1/3.2/3.3, Datenarten 81–86 + X31; Excel-Export ja, Excel-Import als Erstklasse-Workflow nicht beworben.
- **Pricing band:** Ab ca. **800 € netto** für 1–2 Nutzer (Einstiegsausbau), one-time + Wartung. Mittelklasse-Kauflizenz.

## 4. Sirados (DBD) — https://www.sirados.de

- **Calculation features:** Eigentlich kein Kalkulator, sondern eine **Datenbank**: Baupreise (von-mittel-bis), Kalkulationsansätze (Lohn/Material/Geräte), STLB-konforme Texte. Plug-in für AVA-Tools.
- **Customer-sharing flow:** N/A — Sirados teilt Daten *an* Kalkulationssoftware, nicht an Endkunden. Output sind Texte + Preisspannen.
- **Excel-import quality:** Schnittstellen zu allen großen AVA-Tools (Orca, California, Nevaris); Daten als Online- oder Offline-Lizenz.
- **Pricing band:** Jahreslizenz nach Modul; Preise nicht öffentlich. Schätzung 500–2.000 €/Jahr je nach Modul-Umfang.

## 5. ORCA AVA — https://www.orca-software.com

- **Calculation features:** Kostenberechnung nach DIN 276, Angebot/Auftrag/Abrechnung; eher AVA-Tool für Architekten als Bieter-Kalkulator (kein klassisches EKT-Schema). Kein eingebautes Lohn-Mittel.
- **Customer-sharing flow:** Excel- und GAEB-Export für Preisspiegel und Aufträge; Übergabe per Mail/Datei. Kein Kunden-Annahme-Portal.
- **Excel-import quality:** Zertifizierter GAEB-Import (P40, CPL, KTB, XML 3.1/3.2); Excel-Export gut, Preis-Import per GAEB DA84 dokumentiert.
- **Pricing band:** **Starter 1.798 € + 348 €/Jahr Service**, Professional 4.278 € + 828 €/Jahr, Enterprise 6.138 € + 1.188 €/Jahr — alles netto. Auch Abo-Modell (Mindestlaufzeit 12 Monate).

## 6. Bauwise — https://bauwise.com

- **Calculation features:** Fokus auf **Cost-Management/Budget-Tracking** (Forecast-to-Complete, Estimate-at-Completion, Cashflow), nicht auf Bieter-EKT. Kein deutsches Zuschlagsschema.
- **Customer-sharing flow:** **Dedicated Subcontractor Portal** mit Applications-for-Payment-Workflow und automatischen Benachrichtigungen — relevantestes Kundenportal-Beispiel im Set.
- **Excel-import quality:** Excel/CSV-Upload für Budgets, flexible Coding-Systeme — kein GAEB.
- **Pricing band:** **Essential 297 €/Monat + 19 €/User**, Advanced 597 €, Professional 897 €, Enterprise custom. 14-Tage-Trial.

## 7. BuildingConnected (Autodesk) — https://www.autodesk.com/products/buildingconnected

- **Calculation features:** Keine Kalkulation im EKT-Sinn; das Produkt ist **GC-zu-Subunternehmer-Bid-Matching** (Marketplace mit 1,5 Mio. Builders), Bid-Leveling-Tabellen, TradeTapp-Risk-Scoring.
- **Customer-sharing flow:** Bid-Invites + Bid-Submission über zentralisiertes Portal; Subunternehmer reicht Angebot strukturiert ein, GC vergleicht side-by-side. **Sehr starkes Portal-Pattern.**
- **Excel-import quality:** US-Markt, kein GAEB. PDF + strukturierte Webformulare; Bid-Comparison-Tabellen exportierbar.
- **Pricing band:** **3.600–5.000 $/Jahr** Einstieg, häufig revenue-abhängig; bis 60.000 $ für Enterprise — Sales-quote-only.

## 8. PlanRadar — https://www.planradar.com

- **Calculation features:** Keine — PlanRadar ist Bau-Doku, Mängelmanagement, Site-Diary, BIM-Viewer. Kein Kalkulator.
- **Customer-sharing flow:** **„Unlimited free subcontractors and watchers"** — sehr starkes Lizenzmodell für Stakeholder-Sharing ohne Mehrkosten. Vorbild für die Frage „wie machen wir den Kunden zum Gast, nicht zum bezahlten User?".
- **Excel-import quality:** N/A für LV-Workflow; 200+ Integrationen, kein GAEB.
- **Pricing band:** Basic **35 $/User/Monat** (Solo), Starter 119 $, Pro 179 $, Enterprise custom. 30-Tage-Trial. Jahresabo −10 %.

## 9. Procore Bid Management — https://www.procore.com

- **Calculation features:** Kein klassischer Kalkulator. Bid-Templates, Bid-Forms, Bid-Leveling, Performance-/Financial-Historie der Bieter.
- **Customer-sharing flow:** **Planroom + Subcontractor-Portal**: Bieter laden Bid-Pakete runter, geben Angebot direkt zurück ins System; alle Stakeholder kostenlos eingeladen. Wieder das „unlimited collaborators"-Prinzip.
- **Excel-import quality:** US/EN-fokussiert, kein GAEB. Custom-Form-Builder, integriert mit Procore Construction Network.
- **Pricing band:** Bid-Management-Add-on **ab 500 $/Monat**, Gesamt-Procore 4.500–60.000 $/Jahr ACV-basiert. Enterprise-only de facto.

---

## Features worth adapting for Kalku

Sortiert nach „passt zur lean-SaaS + Bieter-Kalkulationsbüro-Positionierung":

1. **Bauwise/Procore/PlanRadar — „unlimited collaborators" Lizenzmodell.** Der *Kunde* (Bauunternehmer-Inhaber) bezahlt; der Auftraggeber, der die Kalkulation sieht, ist Read-only-Gast ohne Lizenzkosten. Direkt übertragbar auf unser „Quote-Link teilen"-Pattern. **Hebel:** löst die Reibung „muss ich mich registrieren?" beim Endkunden komplett auf.

2. **BuildingConnected/Procore — strukturiertes Bid-Submission-Portal mit Approval-Klick.** Aktuell schicken unsere Kalkulatoren PDF + GAEB DA84 per Mail; der Kunde antwortet „Auftrag" per Mail. Ein **Annahme-Klick im Browser-Link** mit Zeitstempel und (optional) DocuSign-light wäre eine Vertrauensanker und Conversion-Steigerer.

3. **GAEB-Online-Style „Excel-Editor im Browser für DA84-Erstellung".** Statt nativer GAEB-Editor: Bieter trägt EP in vertrauter Excel-UI ein, System macht daraus eine GAEB-DA84-Datei. Spart 80 % der Komplexität gegenüber Nevaris/California und entspricht dem Real-World-Workflow vieler Mittelständler.

4. **Nevaris — EFB-Formblätter als Output-Standard.** Wenn Kunde öffentliche Vergabe macht: EFB 221 / 222 / 223 automatisch aus unseren Zuschlägen generieren. Heute manueller Schritt für unsere Kalkulatoren — Automatisierung wäre direkter Effizienzhebel auf der *internen* Seite.

5. **Sirados-Style „Preis-Referenz von-mittel-bis"-Hint im Editor.** Beim manuellen EP-Eintrag eine kleine kontextuelle Anzeige „Marktpreis-Spanne für diese STLB-Position: 8,40 / 12,10 / 17,30 €". Macht Plausibilitätskontrolle sichtbar für den Kunden — Trust-Anker, der heute komplett im Kopf des Kalkulators bleibt. (Datenbezug zunächst manuell kuratiert; später Sirados-Lizenz oder eigener Erfahrungsschatz aus den ersten 50 LVs.)

---

## Roadmap

| Item | Effort | Priority | User story (1 line) | Dependencies |
|---|---|---|---|---|
| **P0 — Launch-blocker** | | | | |
| Form-Backend `/api/forms/submit` produktiv | M | P0 | Als Bauunternehmer schicke ich das Lead-Formular ab und KALKU bekommt es ins Postfach + Pipedrive. | Pipedrive-API-Key, Mail-Provider (Postmark o. ä.) |
| AGB-Seite (Vollmacht + Erfolgsprovision-Klauseln) | S | P0 | Als Kunde lese ich vor Beauftragung die rechtlichen Bedingungen. | Anwalt-Review |
| Datenschutzerklärung (DSGVO Art. 13) | S | P0 | Als Besucher kann ich nachvollziehen, welche Daten KALKU verarbeitet. | Anwalt-Review, Plausible-Klausel |
| Quote-Sharing-Link (read-only PDF + LV-Snapshot) | M | P0 | Als Kalkulator teile ich dem Kunden ein „kalku.de/q/abc123"-Link statt PDF-Mail. | Auth-light (Slug + Expiry), nginx-Route |
| **P1 — Ship this quarter** | | | | |
| Annahme-Klick im Quote-Link (Zeitstempel, IP, optional DocuSign-light) | M | P1 | Als Kunde klicke ich „Angebot annehmen" und es ist rechtsverbindlich dokumentiert. | Quote-Sharing-Link, Audit-Log, evtl. eIDAS-Validierung |
| GAEB-Online-Style Excel-Editor für DA84-Erstellung | L | P1 | Als Kalkulator trage ich EPs in einer Excel-ähnlichen Web-UI ein, KALKU baut die DA84. | GAEB-Parser-Lib (z. B. eigener X81/X83-Reader), CSV/XLSX-Bridge |
| EFB-Formblätter (221/222/223) automatisch aus Zuschlägen | M | P1 | Als Kalkulator generiere ich die EFB-Pflichtformulare per Klick statt manuell. | Zuschlagskalkulation-Datenmodell |
| Read-only Gast-Zugang für Endkunde (kein Login) | S | P1 | Als Endkunde öffne ich den Link und sehe LV + EP + Summen ohne mich anzumelden. | Quote-Sharing-Link |
| **P2 — Backlog** | | | | |
| Preis-Referenz „Marktspanne" pro Position (von-mittel-bis) | L | P2 | Als Kunde sehe ich neben jedem EP eine kleine Markt-Plausibilität-Anzeige. | Eigener Preisdaten-Pool (erste 50 LVs) oder Sirados-Lizenz |
| Subunternehmer-Anfrage-Workflow (Pos. an Sub schicken, Rückläufer einsammeln) | L | P2 | Als Kalkulator schicke ich definierte LV-Pakete an Subs und ziehe ihre Preise zurück. | Quote-Sharing-Link, Subunternehmer-Tracking |
| ZUGFeRD-Output für Rechnung an Endkunde nach Auftrag | M | P2 | Als KALKU stelle ich die Rechnung an den Kunden im E-Rechnungs-Format. | Buchhaltungs-API (lexoffice o. ä.) |
| Bid-Leveling-Tabelle (mehrere Sub-Angebote nebeneinander) | M | P2 | Als Kalkulator vergleiche ich drei Sub-Angebote in einer Tabelle. | Subunternehmer-Workflow |

---

## Sources

- [Nevaris — Baukalkulation Lösung](https://www.nevaris.com/loesungen/baukalkulation/)
- [Nevaris Build — Capterra Profile](https://www.capterra.com/p/10004026/NEVARIS-Build/)
- [BRZ 365 Bautechnik](https://www.brz.eu/de/loesungen/brz365bautechnik)
- [BRZ 365 Bautechnik Premium Shop-Seite](https://shop.brz.eu/BRZ-365-Bautechnik-Premium-Paket/debpd3652200)
- [California.pro / CaliforniaX — Wikipedia](https://de.wikipedia.org/wiki/California.pro)
- [G&W California GAEB-Zertifizierung](https://gw-software.de/california/gaeb-zertifizierung)
- [Sirados Baudaten](https://www.sirados.de/)
- [Sirados Kalkulationsansätze](https://www.sirados.de/produkte/angebotskalkulation/kalkulationsansaetze)
- [ORCA AVA Preisliste](https://www.orca-ava.de/preise/)
- [ORCA AVA Funktionsmatrix (Krekeler)](https://www.krekeler.de/ava/ava-funktionsmatrix.html)
- [Bauwise Homepage](https://bauwise.com)
- [Bauwise Pricing](https://bauwise.com/pricing)
- [BuildingConnected Pricing (Autodesk)](https://construction.autodesk.com/pricing/buildingconnected/)
- [BuildingConnected Pricing Guide (downtobid.com)](https://downtobid.com/blog/how-much-is-building-connected)
- [PlanRadar Homepage](https://www.planradar.com)
- [PlanRadar Pricing — G2](https://www.g2.com/products/planradar/pricing)
- [Procore Bid Management](https://www.procore.com/bid-management)
- [Procore Pricing](https://www.procore.com/pricing)
- [GAEB-Online Blog — DA84 elektronische Angebotsabgabe](https://blog.gaeb-online.de/die-elektronische-angebotsabgabe-da84/)
- [GAEB-Online Blog — GAEB-Dateien und Excel](https://blog.gaeb-online.de/gaeb-dateien-und-excel/)
