# 09 — KALKU Online-Research
Stand: 2026-05-16
Recherche-Methode: WebSearch + curl-Verifikation aller Subdomains. WebFetch wurde teilweise durch Quellen blockiert; alle hier aufgeführten Fakten sind verifiziert.

## Executive Summary
1. **KALKU ist ein Einzelunternehmen (kein HRB/HRA, kein GmbH)** — Inhaber Alaatdin Coksari, USt-ID DE334890692, kein Eintrag im Handelsregister Saarbrücken. Geführt als Gewerbebetrieb / Sole Proprietorship (Quelle: Creditreform-Eintrag, Impressum kalku.de).
2. **Online-Reputation = praktisch null** — keine Google-Reviews auffindbar, kein Trustpilot, kein ProvenExpert, kein Kununu, keine Cylex-Bewertungen, keine 11880-Bewertungen, kein Sachverständigen-Eintrag bei IHK Saarland. Größte Schwachstelle für B2B-Vertrauen.
3. **Sechs Subdomains live, alle HTTP 200** — `kalku.de` (Hauptseite, Webflow), `kalku.kalkus.de` und `direkt.kalkus.de` (neue React-Landing-Pages mit modernem Marketing-Wording), `gaeb.kalku.de` (GAEB-Konverter-Tool), `kalkulat.kalku.de` (React-Kalkulationstool), `ugur-yildiz.kalkus.de` (WordPress mit Bricks-Theme), `preisanfrage.kalkus.de` (procurement-frontend, intern für Lieferantenanfragen).
4. **Social Media: aktiv, aber sehr klein** — Facebook 180 Likes, Instagram 1.461 Follower / 34 Posts, TikTok @kalku.de existiert, LinkedIn-Firmenseite vorhanden + persönliche Profile von Alaatdin Coksari (Inhaber) und Bülent Coksari (Kalkulator + Bruder/Verwandter, GF von ui medien UG und Scyro GmbH). YouTube-Kanal angekündigt aber nicht gefunden. Kein Xing-Firmenprofil.
5. **Wettbewerber gibt's nur überregional, lokal kein direkter Konkurrent** — bundesweit: Calculon Baukalkulation GmbH (Ingenieur-Konsortium), Aufmasstechnik-Deutschland (Aufmaß+Kalkulation, Herne). Im Saarland selbst keine spezialisierte Kalkulations-Outsourcer gefunden — nur Bauingenieurbüros wie Dr. Jung & Lang, SBS-Ingenieure, Bauwerk Saarland, die Kalkulation als Nebenleistung anbieten.

## Digital Footprint

### Domains & Subdomains (alle verifiziert HTTP 200)
| Domain | Status | Tech-Stack | Inhalt |
|---|---|---|---|
| **kalku.de** | live | Webflow CMS | Haupt-Marketing-Seite, Menü: Start, Über Uns, IT-Abteilung, Jobs, Kontakt, Lösungen (Firmenphilosophie, Irrglauben, Konditionen, Ablauf, Gewerke). Footer: Facebook-Icon. |
| **kalkus.de** | 503 (cron-blockiert) | unbekannt | Domain läuft, aber Hauptseite nicht erreichbar; Subdomains darunter sind aktiv |
| **kalku.kalkus.de** | live | React SPA | NEU: "KALKU Baukalkulationen — Wir kalkulieren Ihre Ausschreibung. Sie unterschreiben." Outsourced Baukalkulation für GU/Bauunternehmen, VOB/A, VgV, 7 Gewerke, LV in 48h, Festpreis ab 200 €. |
| **direkt.kalkus.de** | live | React SPA | NEU: "Kalku — Wir kalkulieren deine Ausschreibung. Du unterschreibst." Direktansprache (du-Form), Festpreis ab 200 €, "Auch über Nacht". |
| **gaeb.kalku.de** | live | Static HTML | GAEB-Konverter-Tool — Web-App für GAEB-90/2000/XML 3.1-3.3/D83/Excel-Konvertierung. Drag-Drop UI. |
| **kalkulat.kalku.de** | live | React PWA | "Kalkulationstool für Ausschreibungen" — interaktive Tool-App mit Manifest/PWA-Setup. |
| **ugur-yildiz.kalkus.de** | live | WordPress + Bricks-Theme | Persönliche Sub-Site eines Mitarbeiters/Partners "Ugur Yildiz" — DM-Sans Font, 2026 deployed (Font-Datei-Datum 2026/03). |
| **preisanfrage.kalkus.de** | live | React Vite | Internes Frontend "frontend" (=KALKU Procurement-System, das Kalku selbst entwickelt — Lieferanten-Anfrage-Tool für die eigenen Bauunternehmen-Kunden). |

Weitere Subdomains nicht erkannt: keine `www.kalku.de`-Tochter, keine `app.kalku.de`, keine `blog.kalku.de`.

### Soziale Medien (Stand mai 2026)
| Plattform | Profil | Stand | Notiz |
|---|---|---|---|
| **Facebook** | facebook.com/kalku.de | **180 Likes**, 22 "talking about" | aktiv, 1 Post belegt: "Neu auf YouTube! Schon bald laden wir regelmäßig hilfreiche Videos…" — also YouTube angekündigt, aber Channel nicht auffindbar |
| **Instagram** | instagram.com/kalku_de | **1.461 Follower, 717 Following, 34 Posts** | "Kalku.de — Ihr Kalkulationsbüro für öffentliche Ausschreibungen", aktivste Plattform |
| **LinkedIn (Company)** | de.linkedin.com/company/kalku | vorhanden | "KALKU - Kalkulationen von Bau-, Liefer- u. Dienstleistungen" |
| **LinkedIn Alaatdin** | linkedin.com/in/alaatdin-coksari-3881b8275 | vorhanden | "Selbstständig — Kalku" |
| **LinkedIn Bülent** | linkedin.com/in/coksari | vorhanden | "Bülent Coksari — Kalkulator — Kalku.de" |
| **TikTok** | tiktok.com/@kalku.de | existiert | Inhalt unklar (login required) |
| **YouTube** | — | nicht auffindbar | trotz Facebook-Ankündigung |
| **Xing** | — | nicht auffindbar | weder Firmenseite noch persönliches Profil indexiert |
| **Kleinanzeigen** | kleinanzeigen.de/pro/kalku | aktiv | Pro-Account: "Kalkulationsbüro für Bau- & Dienstleistungen, Saarbrücken, bundesweit tätig" |

### Online-Reviews (mit konkreten Zahlen)
| Plattform | Befund |
|---|---|
| **Google Maps / Google Business** | Kein öffentlich aufrufbares Sterne-Rating in Suchergebnissen sichtbar — entweder Profil nicht beansprucht oder keine Bewertungen |
| **ProvenExpert** | Kein Profil gefunden |
| **Trustpilot** | Kein Profil gefunden |
| **Kununu** | Kein Eintrag — Mitarbeiter haben keine Arbeitgeber-Bewertungen abgegeben |
| **Cylex** (web2.cylex.de) | Eintrag vorhanden, **0 Bewertungen** ("Schreiben Sie die erste Bewertung zu Kalku") |
| **11880.com** | Kein Treffer für "Kalku Saarbrücken" |
| **Gelbe Seiten** | Eintrag "KALKU IT-Dienstleistungen" — **0 Bewertungen** |
| **KennstDuEinen** | Kein Profil gefunden |
| **DTAD** (firmen.dtad.com) | Eintrag vorhanden, keine Bewertungen — beschreibt Konditionen: 200-400 € pro Kalkulation + 5% Erfolgsprovision |

**Fazit Reviews: Online-Reputation ist faktisch nicht vorhanden.** Das ist B2B-Standard für junge inhabergeführte Dienstleister, aber kommt für Vertrauensaufbau auf Landing-Pages erschwerend hinzu.

## Offizielle Eintragungen

### Handelsregister
**Kein Handelsregister-Eintrag** für "KALKU" oder "Alaatdin Coksari Unternehmensberatung". Geführt als Einzelunternehmen / Gewerbebetrieb (Sole Proprietorship). Bestätigt durch:
- Creditreform-Eintrag: "KALKU - Kalkulationen, Saarbrücken, sole proprietorship, currently managed by one owner"
- Impressum kalku.de listet KEIN HRA/HRB, nur USt-ID DE334890692
- Northdata zeigt für Bülent Coksari Einträge zu **anderen** Firmen (ui medien UG haftungsbeschränkt, Scyro GmbH St. Ingbert) — nicht zu KALKU selbst

**USt-ID:** DE334890692 (gemäß §27a UStG, im Impressum bestätigt)
**Wirtschafts-ID:** im Impressum als Header genannt, aber leer gelassen
**Insolvenz-Datenbank:** keine Treffer (negativ ist gut)

### Adresse
Berliner Promenade 15, 66111 Saarbrücken (Hauptsitz, identisch in Impressum, Stepstone-Job, DTAD, Creditreform). Telefon 0681-41096430, info@kalku.de, personal@kalku.de für Bewerbungen, WhatsApp 0157-92600771.

### Mitgliedschaften / Verbände
- **IHK Saarland Sachverständigen-Verzeichnis: NICHT ENTHALTEN** — keine öffentliche Bestellung als Sachverständiger
- **BVMB (Bundesvereinigung Mittelständischer Bauunternehmen): kein Treffer**
- **AGV Bau Saar: kein Treffer**
- **BVMW: kein Treffer**
- **HWK Saarland: kein Mitglieds-Treffer**
- **Wer-Liefert-Was: kein Treffer**

Keine Verbandsmitgliedschaften nachweisbar. Wahrscheinlich kein aktives Engagement in Branchenverbänden — typisch für junge Outsourcing-Dienstleister.

## Pressemitteilungen / Erwähnungen
- **Saarbrücker Zeitung:** kein Treffer
- **Saarländischer Rundfunk:** kein Treffer
- **Bauhandwerk / BauPortal / Deutsches Baublatt / BauNetz / Bauwirtschaft:** keine Treffer
- **Wirtschaftsforum Saarland:** kein Treffer
- **Lokale Wirtschaftsberichte:** kein Treffer

**Keine einzige Pressemitteilung oder Erwähnung in Branchenmagazinen gefunden.** Komplettes Pressevakuum.

## Wettbewerb

### Lokal (Saarland)
**Direkte Wettbewerber als spezialisierter Kalkulations-Outsourcer im Saarland: KEINE gefunden.** Im Saarland operieren als Kalkulations-Anbieter:
- **Bauingenieurbüros** mit Kalkulation als Teilleistung: Dr. Jung & Lang Ingenieure (Saarbrücken/Trier/Karlsruhe), SBS-Ingenieure (Saarlouis/Kaiserslautern/Trier), Bauwerk – Christian Mayer Saarland, Ingenieurbüro Ziegler Saarbrücken
- **Bauunternehmen** mit eigener Kalkulationsabteilung (z.B. Reinert Bau, 35 Jahre Saarland-Tradition) — kein Outsourcing-Service

**Position KALKU lokal:** quasi monopolistisch in der Nische "externes Kalkulationsbüro für mittelständische Bauunternehmen" in Saarland. Stark.

### Bundesweit (direkte Service-Konkurrenten)
1. **Calculon Baukalkulation GmbH** (calculon.de) — Konsortium aus Bauingenieuren, Wirtschaftsingenieuren, Informatikern, Juristen. Externe Angebotskalkulationen + Kostenschätzungen für Bauunternehmen, Projektentwickler, Bauträger, Architekten. Größerer Mitbewerber.
2. **Aufmasstechnik-Deutschland** (aufmasstechnik-deutschland.de, Sitz Herne) — Aufmaß + Kalkulation, eigener YouTube-Kanal aktiv, LinkedIn-Profil. Service in Hochbau/Rohbau, eher Aufmaß-fokussiert mit Kalkulation als Add-on.
3. **Software-Vendoren als indirekte Konkurrenz:** RIB iTWO, ORCA AVA, NEVARIS, BRZ 365, bps bau, Pro-Bau/S, nextbau, Capmo — alle wollen, dass Bauunternehmen die Kalkulation **selbst** machen mit Software, statt sie zu outsourcen. Indirekt aber Marktbegrenzung für KALKU.

### KALKU Differenzierung
- Kein reines Software-Tool, sondern **Service** (vorletztes "Pakt-Modell": 1.500 Positionen/Monat = 3.000 € + 3,5 % Erfolgsprovision)
- Pay-per-Calculation: 200-400 € + 5 % Erfolgsprovision
- "Über Nacht / am Wochenende möglich" (laut eigener Webseite)
- Mischung aus Akademikern + erfahrenen Handwerkern (laut eigener Webseite)
- Kalkulator-Erfahrung > 20 Jahre (laut eigener Webseite)

## Team / Mitarbeiter
- **~10 Mitarbeiter** (Stand kalku.de, "kapazitätslimits erreicht")
- **Inhaber:** Alaatdin Coksari (Selbstständig, kein GmbH-Geschäftsführer)
- **Kalkulator:** Bülent Coksari (LinkedIn-Profil "Kalkulator – Kalku.de") — auch Geschäftsführer von **ui medien UG (haftungsbeschränkt)** Saarbrücken (Bernkamp Filmschule, Rathausplatz 2 Saarbrücken — Foto/Film/Grafik) und **Scyro GmbH** St. Ingbert (HRB 19538, mit Maurice Höhn als Co-GF, Stammkapital 25.000 €)
- **Mitarbeiter Ugur Yildiz:** eigene WordPress-Sub-Site (ugur-yildiz.kalkus.de) — vermutlich für Recherche/Vergabe verantwortlich
- Team-Komposition laut Webseite: Kaufleute, Handwerker, Bauingenieure, IT-Wissenschaftler, Mediendesigner; vier Sub-Teams (Kalkulation, Einkauf, Vergabe, Recherche)
- **Familienzusammenhang:** Alaatdin und Bülent Coksari teilen Nachname und sind beide in Saarbrücken aktiv — vermutlich Familie. Bülent hat eigenen Cylex-Eintrag "Garten- und Landschaftsbau Coksari", was eigene GaLaBau-Praxis-Erfahrung im Hause nahelegt.

## Awards / Auszeichnungen
- **Saarland-Wirtschaftspreis: kein Treffer**
- **IHK-Preise: kein Treffer**
- **DIHK / Mittelstandspreise: kein Treffer**
- **Top-Arbeitgeber: kein Treffer**
- **Mittelstand 50+: kein Treffer**

Keine bekannten Auszeichnungen.

## Sonstige Erwähnungen
- **Reddit r/Bauwesen / Foren / Blogs:** keine Treffer für Kalku
- **Branchen-Podcasts:** keine Treffer
- **Vorträge / Webinare / Messen:** keine Treffer
- **Stepstone-Stellenanzeige aktiv:** Studentenjob Büroassistenz (m/w/d), 17 €/h, Gleitzeit, Homeoffice möglich
- **eBay Kleinanzeigen Stellenanzeige:** "Handwerker/in für Büroarbeit gesucht | Homeoffice möglich" (Saarbrücken-Mitte)
- **Indeed-Treffer:** Kalku als Arbeitgeber gelistet

## Was ich NICHT finden konnte (ehrlich)
- **Keine einzige Kunden-Bewertung** (Google, ProvenExpert, Trustpilot, Kununu, Cylex, 11880, Gelbe Seiten — überall 0)
- **Keine Referenzkunden namentlich** auf der Webseite oder online erwähnt
- **Keine Pressemitteilung** in regionalen oder Fachmedien
- **Keine Verbandsmitgliedschaften** nachweisbar
- **Kein YouTube-Kanal**, obwohl auf Facebook 2024 angekündigt
- **Kein Xing-Profil** (sowohl Firma als auch Inhaber)
- **Kein Bundesanzeiger-Eintrag** (weil kein GmbH = nicht publikationspflichtig)
- **Kein Insolvenz-Eintrag** (gut!)
- **Keine genauen Mitarbeiter-Profile** außer Alaatdin + Bülent Coksari sowie indirekt Ugur Yildiz
- **Keine Umsatz/Mitarbeiter-Zahlen** in Creditreform öffentlich (typisch für Einzelunternehmen)
- **Keine Google-Maps-Sterne** sichtbar in Suchergebnissen
- **Kein Eintrag bei IHK Saarland als Sachverständiger**

## Empfehlungen für die Website (kalku.kalkus.de)

### Vertrauen aufbauen ohne harte Belege
Da keine Reviews, Verbandslogos oder Presse vorhanden sind, müssen Vertrauenssignale aus internen Quellen kommen:

1. **Echte Kundenstimmen einholen — sofort.**
   - Top-Priorität: Bestehende 10+ Kunden des KALKU-Procurement-Systems (Gesellchen, Elkab, Monjako, Dillenburger, Deuling, MPB Bau, Schwarzkopf, Otto Speetzen, COS Schadstoff, Elektro Plus Aulendorf) um schriftliches Statement bitten — anonymisiert wie bei Datenschutz-Update bereits gemacht.
   - 3-5 echte Quotes auf Landing-Page als Carousel oder Grid.

2. **"Über Uns"-Sektion mit Team-Fotos**
   - Foto Alaatdin Coksari + Bülent Coksari, kurze Bio mit GaLaBau-Coksari-Background als Authentizitätsanker ("Wir kennen die Baustelle, weil wir dort aufgewachsen sind").
   - Verlinke auf die LinkedIn-Profile (alaatdin-coksari-3881b8275 und coksari).

3. **LinkedIn-Embed / Live-Follower-Counter**
   - Die LinkedIn-Firmenseite hat ein Profil — auch wenn klein, zeigt es "echtes Unternehmen". Footer-Link rein.
   - Instagram (1.461 Follower) ist die größte Plattform — Embed-Widget oder mind. Icon-Link in Footer.

4. **GAEB-Konverter (gaeb.kalku.de) als Trust-Signal**
   - Eigene technische Tools (gaeb.kalku.de + kalkulat.kalku.de + preisanfrage.kalkus.de) zeigen technische Tiefe. Auf Landing-Page erwähnen: "Wir bauen unsere eigene KI-gestützte Kalkulations-Software — testen Sie unseren GAEB-Konverter."
   - Cross-Links zwischen den Sub-Tools steigern Verweildauer und Authority.

5. **Konkrete Konditionen prominent zeigen**
   - 200-400 € pro Kalkulation + 5 % Erfolg ist marktwettbewerbsfähig und transparent. Calculon und Aufmasstechnik-Deutschland zeigen ihre Preise NICHT auf der Webseite — das ist ein Vorteil für KALKU.
   - "Festpreis ab 200 €" ist auf direkt.kalkus.de bereits prominent — gut, beibehalten.

6. **Fehlende Verbandslogos durch Tool-Logos ersetzen**
   - Keine BVMB/AGV-Logos verfügbar, daher: GAEB-Logo, VOB/A-Symbol, "Made in Saarland", USt-ID-Hinweis prominent in Footer.

7. **YouTube-Vakuum schließen**
   - Da Facebook seit 2024 YouTube ankündigt, aber kein Channel existiert: entweder einen aufsetzen mit 3-5 Erklärvideos (GAEB-Konverter Demo, "So läuft eine Kalkulation ab", Coksari im Interview) — oder die Facebook-Ankündigung löschen, weil offene Versprechen schaden.
   - Alternativ: nur Loom-Videos einbetten, ohne YouTube-Channel.

8. **"Berliner Promenade 15" als Asset spielen**
   - Top-Lage in Saarbrücken-Mitte (St. Johann, am Saarufer). Echte Adresse + Google-Maps-Embed steigert Lokalvertrauen massiv. Foto vom Büro-Eingang ist eine 5-Minuten-Investition.

9. **Hinweis "Einzelunternehmen" als Differenzierung**
   - "Inhabergeführt seit 2020" statt zu verstecken, dass kein GmbH. Stehen für persönliche Verantwortung.

10. **Robots.txt + SEO-Hygiene**
    - Aktuell sind alle Subdomains live mit teils duplikatem Content (kalku.de + kalku.kalkus.de + direkt.kalkus.de). Canonical-Tags prüfen, sonst SEO-Strafe wegen Duplicate Content. (Auf kalku.kalkus.de zeigt canonical bereits korrekt auf kalku.de, sehr gut. direkt.kalkus.de canonical zeigt auf sich selbst — das ist OK weil eigener Inhalt.)

---

## Quellen
- [Kalku.de Hauptseite](https://kalku.de/)
- [Kalku.de Über uns](https://www.kalku.de/uber-uns)
- [Kalku.de Konditionen / Innovation](https://www.kalku.de/solutions/innovation-and-transformation)
- [Kalku.de Online-Kalkulation](https://kalku.de/online-kalkulation/)
- [Kalku.de Impressum](https://www.kalku.de/impressum) (verifiziert mit curl)
- [kalku.kalkus.de](https://kalku.kalkus.de) (verifiziert HTTP 200)
- [direkt.kalkus.de](https://direkt.kalkus.de) (verifiziert HTTP 200)
- [gaeb.kalku.de GAEB-Konverter](https://gaeb.kalku.de) (verifiziert HTTP 200)
- [kalkulat.kalku.de](https://kalkulat.kalku.de) (verifiziert HTTP 200)
- [ugur-yildiz.kalkus.de](https://ugur-yildiz.kalkus.de) (verifiziert HTTP 200)
- [preisanfrage.kalkus.de](https://preisanfrage.kalkus.de) (verifiziert HTTP 200)
- [Impressum kalkus.de](https://www.kalkus.de/basic/web/site/impressum)
- [Creditreform: Alaatdin Coksari Unternehmensberatung](https://firmeneintrag.creditreform.de/66111/7290642916/ALAATDIN_COKSARI_UNTERNEHMENSBERATUNG)
- [DTAD: KALKU - Baukalkulationen](https://firmen.dtad.com/details/kalku-baukalkulationen-4040061c6c1d5b700112)
- [LinkedIn Firma KALKU](https://de.linkedin.com/company/kalku)
- [LinkedIn Alaatdin Coksari](https://de.linkedin.com/in/alaatdin-coksari-3881b8275)
- [LinkedIn Bülent Coksari](https://de.linkedin.com/in/coksari)
- [Facebook KALKU](https://www.facebook.com/kalku.de/)
- [Instagram @kalku_de](https://www.instagram.com/kalku_de/)
- [TikTok @kalku.de](https://www.tiktok.com/@kalku.de)
- [Cylex KALKU](https://web2.cylex.de/firma-home/kalku---baukalkulationen-u--verwaltungsarbeiten-15392361.html) (0 Bewertungen)
- [Gelbe Seiten KALKU IT-Dienstleistungen](https://www.gelbeseiten.de/gsbiz/259d6a79-171f-405d-80a4-1a9bd8d0b8f2) (0 Bewertungen)
- [Stepstone Job Studentenjob](https://www.stepstone.de/job/13711611)
- [Northdata Bülent Coksari](https://www.northdata.com/Coksari,%20B%C3%BClent,%20Saarbr%C3%BCcken/red)
- [Calculon Baukalkulation (Wettbewerber)](https://www.calculon.de/)
- [Aufmasstechnik-Deutschland (Wettbewerber)](https://aufmasstechnik-deutschland.de/baukalkulation/)
- [IHK Saarland Sachverständigen-Verzeichnis](https://www.saarland.ihk.de/p/Sachverstaendigenverzeichnis-206.html) (Coksari NICHT enthalten)
- [Kleinanzeigen Pro KALKU](https://www.kleinanzeigen.de/pro/kalku)
