# Review 07c — B2B-Glaubwürdigkeit aus Sicht eines Bauunternehmer-CEO

> **Reviewer-Persona:** Geschäftsführer eines mittelständischen Tiefbau-Unternehmens im Saarland, 25 MA, ca. 6–8 Mio. € Jahresumsatz, klassische Mischung aus öffentlichen Auftraggebern (Kommunen, LBB, Stadtwerke) und privaten GU-Aufträgen. Eigener Kalkulator (1 Person, kurz vor Rente). Thema „Outsourcing" steht seit zwei Jahren auf dem Tisch.
> **Review-Datum:** 14. Mai 2026
> **Geprüfte Branch:** `claude/zealous-margulis-04ce6d`
> **Stand:** Phase 3.x — Cal.com-Embed, Datenschutz, AGB, Inhaber-Foto noch offen.

---

## 1. Executive Summary

**Glaubwürdigkeits-Score: 6,5 / 10.**

Würde ich als CEO ein Erstgespräch buchen? **Ja — aber wahrscheinlich erst nach einem Anruf bei der Sekretärin, nicht über das Formular.** Die Seite öffnet einen Vertrauensvorschuss, den sie an drei Stellen sofort wieder verspielt: AGB sind ein Phase-5-Stub, Datenschutz auch, der Inhaber existiert nur als „AC" in einem Pastell-Kasten. Diese drei Punkte sind in einem Vertragsverhältnis mit Vollmacht-Übertragung und Erfolgsprovision nicht verhandelbar.

**Top-3 Vertrauens-Stärken:**
1. **Pricing-Transparenz mit klarer Logik** (200–600 € + 5 % / 3.000 € + 3,9 % / 5.000 € + 2,9 %). In meiner Branche ist das ungewöhnlich und sofort glaubwürdig.
2. **Vier-Teams-Erzählung + Loyalität/Gebietsschutz.** Erklärt wirtschaftliche Architektur, nicht nur Features. Das verstehe ich als Unternehmer.
3. **Konsistenter Sie-Tonfall in den geprüften Pages** (alte Seite hatte du/Sie-Mix). Klingt nach Geschäftspartner, nicht nach Bauchladen-Verkäufer.

**Top-3 Killer:**
1. **Versprechungen, die das Produkt nicht halten kann.** „Marktvergleich aus 50.000+ Kalkulationen", „Premium-Auswertung GAEB innerhalb 24h", „Cal.com-Embed folgt", „Map-Embed folgt", „Foto folgt" — vier sichtbare Baustellen, die meine Sekretärin als „nicht fertig" markiert. UWG-Risiko bei der 50.000-Zahl.
2. **AGB- und Datenschutz-Placeholder.** Auf einer Seite, die Vollmachtsübertragung und Erfolgsprovision verkauft, sind das Pflicht-Dokumente, nicht Phase-5-Aufgaben. Würde ich nicht unterschreiben.
3. **Inhaber-Anonymität.** Coksari taucht im Hero einer ganzen Über-uns-Seite als Initialen-Avatar auf. Das schadet stärker als gar kein Über-uns-Bereich.

**Verdict:** Buchungs-bereit nach drei Korrekturen — siehe §5.

---

## 2. Findings nach Severity

### P0 — bricht Vertrauen, würde Bauunternehmer abschrecken

**P0-1: Datenschutzerklärung ist ein Stub.**
[`src/pages/Datenschutz.tsx:3-13`](../src/pages/Datenschutz.tsx) — komplettes `PagePlaceholder`-Konstrukt mit „Wird in Phase 5 juristisch geprüft". Auf einer Seite, die ein Multi-Step-Formular mit Pflicht-Consent-Checkbox betreibt ([`MultiStepForm.tsx:312-316`](../src/components/forms/MultiStepForm.tsx)), ist das ein offener DSGVO-Verstoß. Der Consent-Text verweist auf eine Datenschutzerklärung, die es nicht gibt — Art. 13 DSGVO (Informationspflichten) ist nicht erfüllt. Würde mein Anwalt auf der Stelle stoppen.

**P0-2: AGB ist ein Stub — bei Erfolgsprovision-Modell ein No-Go.**
[`src/pages/AGB.tsx:3-13`](../src/pages/AGB.tsx). Sie verkaufen mir einen Vertrag mit:
- Vollmachtsübertragung („wir treten nach außen als interne Kalkulationsabteilung auf")
- Erfolgsprovision (5 % / 3,9 % / 2,9 %)
- Gebietsschutz-Klausel
- Loyalitätsklausel
- Monatlicher Abrechnung im Voraus
- Kündigungsfrist „monatlich"

Ohne AGB ist nicht einmal klar, **wann** die 5 % Erfolgsprovision fällig sind (bei Zuschlag? Bei Bauauftrag? Bei Eingang der ersten Abschlagszahlung?), wie lange der Gebietsschutz gilt nach Vertragsende, was bei Insolvenz des öffentlichen Auftraggebers passiert, und wer haftet, wenn die fristgerechte Einreichung wegen technischem Fehler ausgesetzt wird. Als CEO unterschreibe ich so etwas nicht.

**P0-3: „Marktvergleich aus 50.000+ Kalkulationen" — nicht belegbar.**
[`src/pages/Kalkulator.tsx:229-231`](../src/pages/Kalkulator.tsx): „Marktvergleich basierend auf realen Kalkulationen aus 7 Gewerken" ohne Zahlennennung — ok. Aber `docs/00-phase1-dossier.md` und der Hero-Text reden von „50.000+". Wenn diese Datenbasis im Tool nicht existiert, ist jede Werbung damit eine **wettbewerbswidrige Spitzenstellungsbehauptung (UWG §5 Abs. 1)**. Selbst wenn die Zahl auf der Live-Seite nicht (mehr) steht, dem Phase-1-Dossier folgend wird sie noch eingebaut werden. Stoppen, bis Datenbasis dokumentiert ist (Quelle: Procurement-System? Welche Aggregation? Welche Repräsentativität?).

**P0-4: Premium-Auswertung GAEB-Konverter „innerhalb 24h" — keine Backend-Pipeline.**
[`src/pages/GaebKonverter.tsx:138-143`](../src/pages/GaebKonverter.tsx): `// TODO Phase 3.4 backend: POST /api/forms/submit type=gaeb-premium`. Der Submit setzt `setSubmitted(true)`, ohne dass irgendwo eine Datei rausgeht. Der Bestätigungstext „wir senden Ihnen die Auswertung an X innerhalb von 24 Stunden" ist eine **Service-Zusage ohne Backend**. Wenn ich morgen mein LV hochlade und nichts kommt, bin ich verärgert genug, das per Google-Bewertung zu thematisieren. UWG §5a (irreführende Unterlassung) — und schlimmer, Reputationsschaden in einer Branche, die per Mundpropaganda funktioniert.

**P0-5: „Cal.com-Embed folgt" auf der Kontakt-Seite ist sichtbar.**
[`src/pages/Kontakt.tsx:62-66`](../src/pages/Kontakt.tsx): Eine Kachel mit „Termin online · Cal.com-Embed folgt" steht zwischen drei funktionierenden Kontaktwegen. Das ist nicht „Coming Soon" als Marketing-Tease, das ist „bei uns ist die Tür zur Empfangsdame ausgehängt". Wenn die Kachel nicht heute funktioniert: **rausnehmen, nicht mit Hinweis stehen lassen.**

**P0-6: Inhaber-Foto „folgt" — auf zwei Seiten.**
[`src/components/sections/FounderTrust.tsx:13-21`](../src/components/sections/FounderTrust.tsx) und [`src/pages/UeberUns.tsx:51-58`](../src/pages/UeberUns.tsx). „Foto folgt · Inhaber-Portrait wird ergänzt" mit AC-Initialen in einem Pastell-Kasten. Auf einer Über-uns-Seite, die genau das verkauft (das Gesicht hinter der Marke), ist diese sichtbare Lücke vertrauenszerstörender als gar kein Foto. Wenn das Foto noch nicht da ist: Section bis dahin auf Text + Zitat reduzieren, ohne Phantom-Avatar.

### P1 — wirkt unprofessionell oder weckt Zweifel

**P1-1: „Wir spielen mit offenen Karten — das ist in unserer Branche selten."**
[`src/pages/Konditionen.tsx:60-62`](../src/pages/Konditionen.tsx). Das ist Marketing-Selbstlob. Streichen oder durch konkrete Aussage ersetzen („Die Erfolgsprovision-Logik haben wir Anwalts-geprüft."). Die Branche merkt selbst, dass der Wettbewerb intransparent ist — wir müssen es nicht aussprechen.

**P1-2: „Wir sprechen Bauer-Sprache, nicht Berater-Sprache."**
[`src/pages/UeberUns.tsx:33`](../src/pages/UeberUns.tsx). „Bauer-Sprache" ist umgangssprachlich für Landwirte, nicht für Bauunternehmer. Das stört. Besser: „Wir sprechen Baustellen-Sprache, nicht Berater-Sprache." Außerdem: ein Wertpunkt, der mir verspricht, dass Sie keine Berater-Sprache benutzen, und dann von „Augenhöhe" als Wert spricht — das ist Berater-Sprache.

**P1-3: „Kanalsanierung Bahnhofsvorplatz" als Hero-Mockup ohne Abgrenzung.**
[`src/components/sections/HeroMockup.tsx:35-37`](../src/components/sections/HeroMockup.tsx). Wenn es einen realen Bahnhofsvorplatz mit Kanalsanierung in Saarbrücken oder Umgebung gibt (es gibt ihn — Hauptbahnhof Saarbrücken hat eine Kanalsanierung 2025), könnte das als irreführende Suggestion gelesen werden. Kennzeichnen mit „Beispieldarstellung" oder Projektname klar fiktiv halten („Kanalsanierung Musterstraße 42").

**P1-4: Sekundäre CTA-Struktur konkurriert.**
Auf der Startseite ([`Home.tsx:51-58`](../src/pages/Home.tsx)) zwei Buttons gleichberechtigt: „Erstgespräch vereinbaren" + „Konditionen ansehen". In einer Branche, in der die Preisfrage entscheidend ist, ist das ok. Aber die Trade-Tile-Wall direkt darunter und dann nochmal CTA-Karten in jeder Section führen dazu, dass keine eindeutige Conversion-Hierarchie besteht. Im Tagesgeschäft fragt mein Polier mich: „Was soll ich da klicken?" — und das ist eine Frage, die nie kommen sollte.

**P1-5: „Unserer Branche selten" doppelt formuliert.**
„Wir spielen mit offenen Karten" + „transparente Preise" + „Fairness und Rückmeldung zur eigenen Kalkulation" — drei Mal erzählen Sie mir, dass Sie transparent sind. Einmal reicht. Mehr wirkt, als ob Sie sich selbst überzeugen müssen.

**P1-6: „LV in 48 h bepreist" ist die Hero-Stat — aber die Konditionen-FAQ sagt 48–72 h.**
[`Home.tsx:62-64`](../src/pages/Home.tsx) verspricht „LV in 48 h bepreist". [`Konditionen.tsx:24-26`](../src/pages/Konditionen.tsx) FAQ: „Reguläre Bearbeitung in 48–72 h." Beide Aussagen können stimmen, aber wenn ich mir merke „48 h" und dann lese „bis 72", entsteht ein Vertrauensbruch. Eine Zahl wählen und durchhalten.

**P1-7: „bundesweit tätig" + „Gebietsschutz" ist nicht widerspruchsfrei.**
Bundesweit aktiv UND Gebietsschutz pro Kunde — das funktioniert nur, wenn der Gebietsschutz scharf definiert ist (Postleitzahlenbereich? 100 km Umkreis? Bundesland?). Aktuell ([`Konditionen.tsx:100-107`](../src/pages/Konditionen.tsx)): „in einem klaren Einzugsgebiet und Gewerk" — aber „klar" ist hier nicht klar. Als CEO will ich vor Vertragsunterschrift eine Karte sehen.

**P1-8: „Keine Marketingversprechen" / „kein Geschwurbel" — und dann Phrasen wie „Beratung vereinbaren".**
„Beratung vereinbaren" ist genau die Beratersprache, von der Sie sich abheben wollen. Konsistenter wäre: „Erstgespräch vereinbaren" durchgehend ([`PricingTiles.tsx:67`](../src/components/sections/PricingTiles.tsx) und [`Konditionen.tsx:64-65`](../src/pages/Konditionen.tsx) ändern).

**P1-9: GAEB-Konverter Premium-Auswertung „kostenlos" + „einmalig" — wann gilt das einmalig?**
[`GaebKonverter.tsx:283-286`](../src/pages/GaebKonverter.tsx). Pro Datei? Pro IP? Pro E-Mail? Pro Unternehmen? Wenn Konkurrenten meine Mitarbeiter zum Hochladen ihrer GAEB-Dateien einsetzen, geht das durch die Decke. Klare Limitierung formulieren und im Code durchsetzen (Rate Limit fehlt aktuell in `submitEmail`).

**P1-10: „Wagnis & Gewinn" im Hero-Mockup mit 7,5 % — als CEO weiß ich, dass das niedrig ist.**
[`HeroMockup.tsx:69-72`](../src/components/sections/HeroMockup.tsx). 7,5 % W&G für Tiefbau ist im Mittelfeld bis untere Bandbreite. Suggeriert, KALKU rechnet defensiv. Das kann Absicht sein, dann aber kommunizieren („wir kalkulieren nach Ihrem Wunsch-W&G, im Beispiel hier 7,5 %"). Oder Wert auf 12–15 % anheben (üblicher).

**P1-11: Inhaber-Statement leer von Substanz.**
[`UeberUns.tsx:69-74`](../src/pages/UeberUns.tsx) und [`FounderTrust.tsx:30-34`](../src/components/sections/FounderTrust.tsx): Coksari sagt „Unsere Kunden sind GF und Inhaber, die keine Zeit haben". Das beschreibt **die Kunden**, nicht ihn. Was bringt Coksari mit? Wo kommt er her? Wieso traut man ihm zu, mein LV zu kalkulieren? **Vita = 0**. Auf einer Über-uns-Seite ist das die größte verpasste Chance.

**P1-12: „Anonymisierte Cases" sind zu generisch.**
[`CaseStudies.tsx:14-42`](../src/components/sections/CaseStudies.tsx). „12 MA Saarland → 14 Submissions, 4 Zuschläge, ⌀ 280 k €" ist schön, aber so allgemein, dass ich es selbst hätte erfinden können. Was fehlt: Zeitraum (über welches Jahr?), Submission-Quote vorher (wie viele Submissions hat der Betrieb vorher gewinnen können?), Region-Detail („Saarland" ist groß), Investitionsentscheidung („nach 3 Monaten Test umgestiegen auf Paket M"). Aktuell kann ich die Zahlen nicht von einer ChatGPT-Halluzination unterscheiden.

**P1-13: „Ihre Bauleitung" — falsche Annahme über Mittelstands-Strukturen.**
[`Ablauf.tsx:55-57`](../src/pages/Ablauf.tsx): „exakt so, wie Sie es für Ihre Bauleitung brauchen". In einem 25-MA-Betrieb ist „Bauleitung" oft der Inhaber selbst plus ein Polier. Klingt zu groß-firmig, weckt das Gefühl, KALKU sei für Konzerne gedacht.

**P1-14: Fast keine Logos / Zertifikate / Mitgliedschaften.**
Keine BRZ, kein Bauindustrieverband, keine HWK, keine Zertifizierung (ISO, PQ-Bau, BGRCI), keine Software-Partnerschaften (z. B. Nevaris, RIB, Capmo). In der B2B-Bauwelt sind Logos der **Verbände und Werkzeuge** wichtiger als Kundenlogos. Footer + Über uns wären die Plätze.

**P1-15: Footer hat WhatsApp nicht — obwohl Hauptkontaktweg.**
[`Footer.tsx:55-77`](../src/components/layout/Footer.tsx). NAP-Block hat Adresse, Telefon, E-Mail. Kein WhatsApp, das aber laut Kontaktseite und Urgency-CTA der dritte Hauptkanal ist. Inkonsistent.

### P2 — Detail-Polishing

**P2-1: „Sieben Gewerke. Ein Kalkulationsteam." — auf zwei Pages identisch.**
[`Home.tsx:85-88`](../src/pages/Home.tsx) und [`LeistungenIndex.tsx:27-29`](../src/pages/LeistungenIndex.tsx). Identische H1/H2 als gemeinsame Tagline ist ok als Wiedererkennung, aber die Leistungen-Übersichtsseite verdient einen eigenen Hook („Welches Gewerk haben Sie?" statt nochmal „Sieben Gewerke").

**P2-2: „Mac-style chrome" Hero-Mockup.**
[`HeroMockup.tsx:18-26`](../src/components/sections/HeroMockup.tsx). Drei rote/gelbe/grüne Punkte = macOS-Fenster-Stil. Ihre Zielgruppe (mittelständische Tiefbau-Unternehmer) sind tendenziell Windows-User mit eher konservativem Tech-Geschmack. Mac-Aesthetic suggeriert „Berater-Tool", nicht „Praxis-Tool". Browser-Chrome neutralisieren oder weglassen.

**P2-3: „Rohbau- und Fertigbau-Kalkulation nach VOB" für Hochbau.**
[`constants.ts:97-98`](../src/lib/constants.ts). „Fertigbau" ist Fertighaus-Branche, nicht Hochbau. Korrektur: „Stahlbeton, Mauerwerk, Schalung — Rohbau-Kalkulation nach VOB."

**P2-4: „BMA, EMA, KNX/DALI" für Elektro — ohne Erklärung.**
[`constants.ts:106`](../src/lib/constants.ts). Brandmeldeanlage, Einbruchmeldeanlage, KNX (Bus-System), DALI (Lichtsteuerung). Für Bauunternehmer aus dem Elektro-Bereich ok, für GU-Inhaber nicht. Für die Trade-Card erste Erwähnung Hover/Tooltip mit Auflösung.

**P2-5: „TGA / HLS" für Haustechnik.**
[`constants.ts:111`](../src/lib/constants.ts). „HLS" = Heizung/Lüftung/Sanitär ist ältere Bezeichnung. „TGA" = Technische Gebäudeausrüstung ist moderner und üblicher. Doppelnennung ok, aber nicht beide als Kurzform — verwirrt.

**P2-6: „Schadstoff" als Trade-Slug.**
[`constants.ts:127`](../src/lib/constants.ts). Branche heißt offiziell „Schadstoffsanierung". „Schadstoff" allein klingt seltsam. URL `/leistungen/schadstoffsanierung/` wäre auch SEO-besser.

**P2-7: Berliner Promenade 15 — gibt's diese Adresse?**
NAP-Konstante. Berliner Promenade ist die Promenade in Saarbrücken-Mitte direkt am Hauptbahnhof. Ist die Hausnummer 15 dort wirklich KALKU's Sitz? (Würde im Impressums-Check bei Google Maps geprüft werden.) Falls ja: ok. Falls Coworking-Space oder Office-Service: Vermerken („Im Coworking X").

**P2-8: „Premium-Auswertung kostenlos" — Preis nicht kommuniziert.**
[`Kalkulator.tsx:225-231`](../src/pages/Kalkulator.tsx). Wenn das Premium-Tool später Geld kostet, brauche ich heute schon den Preis-Hinweis („einmalig kostenlos, Folgenutzung mit Paket M/L"). Sonst wirkt es wie Bait & Switch.

**P2-9: Blog-Posts sind alle ohne echten Inhalt.**
[`BlogIndex.tsx:127-129`](../src/pages/BlogIndex.tsx) — „Vollständige Artikel-Inhalte folgen in Phase 5. Aktuell sind dies Themen-Stubs." Wenn die Posts auf Klick zu 404 führen, schadet das. Solange `BlogPost.tsx` ein Stub ist, **noindex** auf BlogIndex setzen oder Blog komplett aus Nav nehmen.

**P2-10: „MapPin" auf Über-uns-Seite zeigt nur einen leeren Kasten.**
[`UeberUns.tsx:160-162`](../src/pages/UeberUns.tsx) — „Map-Embed folgt". Bis Embed da ist: durch statisches Bild von Google Maps ersetzen oder rausnehmen. Leere Kästen mit „folgt" sind die schlechteste Option.

**P2-11: „Made with care in Saarbrücken" Footer-Sentiment.**
[`Footer.tsx:92`](../src/components/layout/Footer.tsx). Tech-Branchen-Phrase, nicht Bau-Branche. „Aus Saarbrücken." reicht.

**P2-12: Newsletter-Section auf BlogIndex ohne Form.**
[`BlogIndex.tsx:135-143`](../src/pages/BlogIndex.tsx). „Newsletter-Form folgt in Phase 3.4." — derselbe „folgt"-Pattern wie Cal.com und Foto. Bis Form steht: Section ausblenden.

---

## 3. Versprechen-Audit-Tabelle

| Versprechen | Quelle | Hält das KALKU heute? | Risiko |
|---|---|---|---|
| „LV in 48 h bepreist" | Hero, mehrfach | Vermutlich ja (Procurement-System existiert) | Niedrig — wenn Service realistisch in 48 h läuft. Konditionen-FAQ widerspricht aber mit „48–72 h". **Inkonsistenz beheben.** |
| „Festpreis ab 200 €" | Hero, mehrfach | Ja (Pricing definiert) | Niedrig |
| „Über Nacht / am Wochenende — kein Aufpreis" | UrgencyCta, mehrfach | Operative Frage. Wenn KALKU nur 5 Personen ist und einer krank wird, kann das brechen. Aber strukturell adressierbar. | Mittel — sollte mit AGB geregelt sein („Schadensbegrenzung bei höherer Gewalt"). |
| „Premium-Auswertung GAEB innerhalb 24h" | GaebKonverter | **Nein.** Backend ist `// TODO Phase 3.4`. | **HOCH (P0).** UWG §5a, Rufschaden, evtl. Abmahnungen. |
| „Marktvergleich aus realen Kalkulationen aus 7 Gewerken" | Kalkulator | Datenbasis ungeklärt. „50.000+" laut Phase-1-Dossier geplant. | **HOCH (P0).** Spitzenstellungsbehauptung ohne Beleg = UWG §5. |
| „EFB-Formblätter 221, 222, 223 + Urkalkulation" | Mehrfach | Ja, dafür ist KALKU gebaut. | Niedrig |
| „Cal.com-Embed folgt" | Kontakt | **Nein.** | Mittel — als „folgt" sichtbar = unprofessionell, aber nicht UWG. |
| „Map-Embed folgt" | Über uns | **Nein.** | Niedrig — kosmetisch. |
| „Foto folgt — Inhaber-Portrait wird ergänzt" | Über uns + FounderTrust | **Nein.** | Mittel — schadet Trust deutlich. |
| „Wir treten nach außen als interne Kalkulationsabteilung auf" | Mehrfach | Operativ machbar (Vollmacht, Briefkopf). | Niedrig — aber AGB-Klausel zwingend („haftet KALKU oder Auftragnehmer im Außenverhältnis?"). |
| „Pro Ausschreibung nur ein Kunde + Gebietsschutz" | Konditionen | Operativ ja, aber Definition fehlt | Mittel — ohne PLZ/Radius-Definition rechtlich brüchig. |
| „Kalkulation auf Basis von 20+ Jahren Erfahrung im Team" | FounderTrust | Vermutlich ja | Niedrig (Pauschalaussage zulässig). |
| „GAEB DA XML 3.1, 3.2, 3.3 + ASCII + ÖNORM A2063" | GaebKonverter FAQ | Browser-Parser im Code ist DOMParser-basiert, sehr lückenhaft (siehe `handleFile` lines 84-114). | Mittel — Versprechen geht über das, was die Live-Implementierung leistet. Klarstellen: „Vorab-Anzeige im Browser, präzise Auswertung im Backend." |
| „Datei verlässt Ihren Computer nicht" (außer Premium) | GaebKonverter | Aktuell stimmt das, weil noch kein Backend dahinter | Niedrig solange das Premium-Backend dies einhält. |
| „Bundesweit tätig" | Über uns, Footer-Beschreibung | Vermutlich ja, wenn Kunden außerhalb Saarland geliefert werden | Niedrig |
| „SOKA-BAU, Finanzamtsbescheinigungen — wir helfen bei Zusammenstellung" | (im Konditionen-Kontext nicht direkt, aber Phase-1-Audit erwähnt) | Vermutlich ja | Niedrig |
| „Newsletter — einmal im Monat" | BlogIndex | **Nein** (Form fehlt) | Niedrig (kein UWG, aber schluderig). |

**Fazit Versprechen-Audit:** Drei P0-Lücken, vier Mittel-Risiken. Vor Live-Schaltung müssen die P0-Versprechen entweder erfüllt oder die Texte angepasst werden.

---

## 4. Sprach-Audit

### 4.1 Du / Sie — Konsistenz

**Konsequent „Sie" in allen geprüften Pages.** Das ist eine deutliche Verbesserung gegenüber der alten Seite (du/Sie-Mix). **Lob.**

Einzige potenzielle Stolperstelle: [`PricingTiles.tsx:67`](../src/components/sections/PricingTiles.tsx) und [`Konditionen.tsx:64-65`](../src/pages/Konditionen.tsx) verwenden „Beratung vereinbaren" — der Rest der Seite konsequent „Erstgespräch vereinbaren". Vereinheitlichen.

### 4.2 Insider-Jargon — wo wird Erklärung benötigt?

Korrekt benannt und Bauunternehmer-konform:
- VOB/A — ok, branchenüblich
- VgV — ok, aber selten verwendet (nur Hero)
- LV — ok
- Submission — ok
- Mittellohn / Verrechnungssätze / Zuschläge — ok
- EFB-Formblätter 221, 222, 223 — ok, korrekt benannt
- Urkalkulation — ok
- GAEB X81/X83/X84 — branchenintern ok, für GU-CEOs außerhalb Sub-Beauftragung erklärungsbedürftig

Erklärungsbedürftig ohne Erklärung:
- **BMA / EMA / KNX / DALI** ([`constants.ts:106`](../src/lib/constants.ts)): nur Insider verstehen das.
- **TGA / HLS** ([`constants.ts:111`](../src/lib/constants.ts)): doppelt benannt, einer reicht.
- **SOKA-BAU**: in der alten Seite erwähnt, in der neuen nicht prominent — aber falls in AGB/FAQ wieder auftaucht: kurz erklären („Sozialkasse der Bauwirtschaft").
- **Wagnis & Gewinn (W&G)**: im Hero-Mockup mit „7,5 %" — nicht erklärt. Für Tiefbau-Praktiker bekannt, für GU-Generalisten weniger.
- **„Ortbeton, Stützwände, Schalung, Bewehrung, Fundamente, Sauberkeitsschicht, Magerbeton"** (in claude.md erwähnt für Stahlbetonarbeiten): nicht auf der Website, aber falls in Gewerk-Page Hochbau auftauchen: alle ok bis auf „Sauberkeitsschicht" und „Magerbeton" — die zwei kennen GU-Generalisten nicht.

Fehlbenennungen:
- **„Fertigbau" in Hochbau-Tagline** (P2-3): falsch.
- **„HLS" als Hauptbezeichnung** (P2-5): veraltet. „TGA" reicht.

### 4.3 Marketing-Phrasen-Risiko

Zu vermeidende Phrasen, die im Live-Code stehen:

| Phrase | Quelle | Problem |
|---|---|---|
| „Wir spielen mit offenen Karten" | Konditionen.tsx:60-62 | Selbstlob, in Branche unüblich |
| „Bauer-Sprache" | UeberUns.tsx:33 | Falsche Branche (Landwirte, nicht Bau) |
| „Augenhöhe" | UeberUns.tsx:32-33 | Berater-Floskel |
| „Made with care" | Footer.tsx:92 | Tech-/Designer-Floskel |
| „Loyalität schlägt Marketing" | ReferenzenIndex.tsx:50-51 | Marketingt sich selbst |
| „kein Marketing, nur Substanz" | BlogIndex.tsx:139 | Marketingt damit, kein Marketing zu sein |
| „pain-driven" | BlogIndex.tsx:134, Phase-1-Dossier | englisches Tech-Buzzword, in deutscher Bau-Branche fremd |

Empfehlung: Für jede dieser Phrasen entweder konkrete Aussage statt Selbst-Etikettierung („Erfolgsprovision wird im Vertrag mit drei Beispielfällen exemplifiziert") oder ersatzlos streichen.

### 4.4 „Über Nacht / Wochenende" — glaubhaft?

Aus CEO-Sicht: **glaubhaft, aber mit zwei Bauchschmerzen.**
1. **Wer ist verfügbar?** Wenn KALKU im Inhaber-Bereich nur 1 Person plus 4 Teams (vermutlich klein besetzt) ist: kann der Inhaber tatsächlich Sonntag um 22 Uhr ein Tiefbau-LV mit 200 Positionen bepreisen? **Antwort fehlt.**
2. **Was kostet es real?** „Kein Aufpreis" ist eine starke Aussage. Sie schreit nach Klärung in den AGB: Was, wenn KALKU am Wochenende sagt: „Schaffen wir nicht"? Welche Garantie gilt?

Wenn KALKU diese Service-Zusage hält: Killer-Argument. Wenn nicht: Selbstmord-Versprechen.

---

## 5. Empfehlung als CEO

**Würde ich ein Erstgespräch buchen? Ja — aber mit Bauchschmerzen.** Ich würde wahrscheinlich anrufen statt das Formular nutzen, weil ich vor Vollmachts-Übergabe drei Dinge sehen müsste, die heute nicht da sind:

### Was muss sich ändern, damit ich unterschreibe?

**Vor Live-Gang (Pflicht):**
1. **AGB veröffentlichen.** Ohne AGB kein Vertrag mit Vollmacht + Erfolgsprovision. Mindestens: Vertragsumfang, Vertragslaufzeit, Erfolgsprovision-Definition (Auslöser, Bemessungsgrundlage, Fälligkeit), Kündigung, Gebietsschutz-Definition (PLZ-Liste oder Radius), Vertraulichkeit, Haftung im Außenverhältnis (KALKU als Vollmacht-Träger), Gerichtsstand, Salvatorische Klausel.
2. **Datenschutzerklärung veröffentlichen** mit konkreter Auflistung aller eingesetzten Tools (Hosting, Form-Backend, Pipedrive, Plausible, Cal.com falls verwendet).
3. **„Premium-Auswertung 24h"-Versprechen entfernen oder Backend live haben.** Ich kann keine UWG-Risiken bei einem Dienstleister tolerieren.
4. **„Marktvergleich aus 50.000+ Kalkulationen" — Datenbasis schriftlich dokumentieren** oder die Zahl streichen.

**Vor Vertragsunterschrift (mein Wunsch als CEO):**
5. **Inhaber-Foto** — keine Initialen, kein Pastellkasten. Ein professionelles Portrait kostet ein paar hundert Euro.
6. **Inhaber-Vita** — 200 Wörter. Wo gelernt, wo gearbeitet, was gebaut. Welche LVs persönlich kalkuliert.
7. **Drei echte Referenzen** mit Freigabe — auf Anfrage im Erstgespräch genannt, nicht öffentlich. Dann kann ich diese drei anrufen.
8. **Nachweis SOKA-BAU + Finanzamt + Berufshaftpflicht KALKU**: Ihr Service basiert darauf, dass ich Ihnen meine Mittellohn-Daten gebe. Ich brauche im Gegenzug die Sicherheit, dass Sie nicht morgen insolvent sind.
9. **Cal.com-Embed live**, alternativ Telefon-Sekretariat-Bestätigung, wann mein Erstgespräch ist.
10. **Map-Embed Saarbrücken** — physische Adresse sichtbar machen.

**Wäre ich bereit, einen Zwei-Stufen-Vertrag (Pauschale + Erfolgsprovision) ohne AGB zu unterschreiben?**

**Nein.** Auf keinen Fall. Auch nicht für ein einzelnes LV. Wenn ein Anbieter mir sagt „AGB folgt in Phase 5", ist das ein Show-Stopper. Mein Rechtsschutz braucht eine Vertragsgrundlage, mein Steuerberater braucht eine, mein Compliance-Officer braucht eine. Die Vollmachts-Übergabe für die Einreichung im Namen meines Unternehmens erfordert eine schriftliche Geschäftsbedingung.

**Hätte ich nach dem Hero-Eindruck Lust, die Telefonnummer im Header anzurufen?**

Ja. Der Hero ist klar, die Stat „LV in 48 h" ist konkret, die Pricing-Range ist sichtbar. Aber ich rufe an, **um Fragen zu stellen, die die Seite offen lässt**:
1. Wer ist der Inhaber wirklich? (Foto fehlt)
2. Wann kommen die AGB?
3. Wie sieht der Gebietsschutz konkret in PLZ aus?
4. Habe ich mit einer Person zu tun oder rotierenden Ansprechpartnern?
5. Was passiert bei Insolvenz von KALKU mit meinen Vollmachten?

**Wäre meine Sekretärin in der Lage, einen Vorab-Vergleich zur Inhouse-Lösung zu rechnen?**

Ja, weil die Pricing-Kondition transparent ist. Sie kann rechnen:
- Inhouse-Kalkulator (1 Person, ca. 65–75 k € Bruttogehalt + Lohnnebenkosten = 95–105 k € p. a. = ca. 8–8,5 k €/Monat) vs. Paket M (3.000 €/Monat + 3,9 % Erfolgsprovision auf Zuschläge)
- Bei 6–8 Submissionen/Monat = Inhouse 1.000–1.300 €/Submission + Folgekosten Schulungen, Software, Urlaub vs. KALKU Paket M = 350–500 €/Submission im Schnitt

Sie kann ihren Rechen-Vergleich dem Chef in 15 Minuten vorlegen. **Das ist eine Stärke der Pricing-Transparenz.**

**Welche Frage hätte ich nach dem ersten Browse, die unbeantwortet ist?**

Drei Fragen:
1. **„Was passiert, wenn ich den Zuschlag bekomme, der öffentliche Auftraggeber später aber zurücktritt (z. B. wegen Vergabe-Rüge eines Mitbewerbers)?"** — Wird die 5 % Erfolgsprovision dann zurückerstattet? Antwort fehlt.
2. **„Werden meine Mittellohn-Daten und Margen sicher gespeichert?"** — Verschlüsselung? Server-Standort? Zugriffskontrolle? Hilft die Datenschutzerklärung — die heute leer ist.
3. **„Was, wenn KALKU bei der Einreichung einen Fehler macht und ich ausgeschlossen werde?"** — Haftung? Versicherung? Antwort gehört in AGB + Über-uns („KALKU ist berufshaftpflichtversichert bei XYZ mit Deckungssumme XYZ €").

---

## Zusammenfassung als CEO-Verdikt

Die Seite hat das Zeug, mich zu überzeugen — sie ist klar strukturiert, der Sie-Tonfall passt, die Vier-Teams-Erzählung erklärt mir wirtschaftlich, was ich kaufe, und die Preistransparenz ist in der Branche selten. Drei Killer halten mich aktuell vom Vertrag ab: **AGB-Stub, Datenschutz-Stub, sichtbare „folgt"-Versprechen** (Cal.com, Foto, Premium-Tools, 50.000-Kalkulationen). Das sind keine Inhalts-Probleme, das sind Existenz-Probleme.

Wenn diese drei Punkte erledigt sind und das Inhaber-Portrait + Vita stehen, würde ich auf eine 8/10 hochgehen und das Erstgespräch über das Formular buchen.

So wie heute: anrufen, ja. Buchen, nein.
