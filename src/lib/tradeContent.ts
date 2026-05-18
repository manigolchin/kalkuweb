/**
 * Per-Gewerk content: Normen, typische Positionen, Kalkulations-Fallstricke,
 * Tool-Empfehlungen und FAQ.
 *
 * Content gepflegt nach VOB/C Stand 2024/2025 + branchenüblicher Praxis.
 * Wird auf /leistungen/{slug}/ ausgespielt durch Gewerk.tsx.
 */

export type Norm = {
  /** Kurzcode wie "DIN 18331" oder "VOB/C DIN 18331" */
  code: string;
  /** Vollständiger Titel der Norm */
  titel: string;
  /** Kurz-Erklärung in 1 Satz */
  desc: string;
};

export type PositionGroup = {
  kategorie: string;
  /** 3-6 konkrete Beispiel-Positionen mit Einheit */
  beispiele: { text: string; einheit: string }[];
};

export type Fallstrick = {
  titel: string;
  desc: string;
};

export type ToolHighlight = {
  /** Slug wie 'gaeb-konverter', 'kalkulator', 'mittellohn', 'frist-rechner', 'buergschaft' */
  slug: string;
  /** Sichtbarer Tool-Name */
  name: string;
  /** Warum dieses Tool für DIESES Gewerk besonders wertvoll ist (1 Satz) */
  warum: string;
};

export type Deliverable = {
  titel: string;
  desc: string;
};

export type TradeContent = {
  /** SEO-/Hero-spezifischer Untertitel — etwas länger als tagline */
  heroSubtitle: string;
  /** 2-3 Sätze zur fachlichen Einordnung des Gewerks (was umfasst es) */
  einordnung: string;
  /** Relevante Normen + Regelwerke */
  normen: Norm[];
  /** Typische LV-Positionen, gruppiert nach Sub-Kategorie */
  typPositionen: PositionGroup[];
  /** Typische Kalkulations-Fallstricke, die wir besonders prüfen */
  fallstricke: Fallstrick[];
  /** Konkrete Tool-Empfehlungen für dieses Gewerk */
  toolHighlights: ToolHighlight[];
  /** Was wir liefern (kann gewerk-spezifisch angepasst sein) */
  deliverables: Deliverable[];
  /** Trade-spezifische FAQ (3-5 Einträge) */
  faq: { q: string; a: string }[];
};

const TOOL_NAMES: Record<string, string> = {
  'gaeb-konverter': 'GAEB-Konverter',
  kalkulator: 'Position-Kalkulator',
  mittellohn: 'Mittellohn-Rechner',
  'frist-rechner': 'Submissions-Frist-Rechner',
  buergschaft: 'Bürgschafts-Rechner',
};

export function tradeContentToolName(slug: string): string {
  return TOOL_NAMES[slug] ?? slug;
}

export const TRADE_CONTENT: Record<string, TradeContent> = {
  hochbau: {
    heroSubtitle:
      'Stahlbeton, Mauerwerk, Schalung — Rohbau und schlüsselfertige Hochbau-LVs nach VOB/C. Aus 25 Jahren Bauleiter-Erfahrung mit Sichtbeton bis Klasse SB4.',
    einordnung:
      'Hochbau umfasst alle tragenden und nicht-tragenden Konstruktionen oberhalb der Bodenplatte — Stahlbeton- und Mauerwerksarbeiten, Schalung und Bewehrung, Dach- und Treppenbau. In jeder Submission stecken DIN 18331 (Beton), DIN 18330 (Mauerwerk), DIN 18334 (Zimmerei) und DIN 18335 (Stahlbau) parallel — wir bepreisen alle gemeinsam.',
    normen: [
      { code: 'VOB/C DIN 18331', titel: 'Betonarbeiten', desc: 'Festigkeitsklassen C12/15 bis C100/115, Expositionsklassen XC1–XS3, Sichtbeton SB1–SB4.' },
      { code: 'VOB/C DIN 18330', titel: 'Mauerwerksarbeiten', desc: 'Kalksandstein, Ziegel, Porenbeton — Druckfestigkeitsklassen 4–28, Rohdichte 0,5–2,2.' },
      { code: 'VOB/C DIN 18334', titel: 'Zimmer- und Holzbauarbeiten', desc: 'Konstruktionsvollholz KVH, Brettschichtholz BSH, Dachstühle, Holzrahmenbau.' },
      { code: 'VOB/C DIN 18335', titel: 'Stahlbauarbeiten', desc: 'Stahlträger HEB/HEA/IPE, Verbindungen, Korrosionsschutz nach DIN EN ISO 12944.' },
      { code: 'DIN EN 1992 (Eurocode 2)', titel: 'Bemessung Stahlbeton', desc: 'Statische Bemessung, Bewehrungsgehalt, Mindestbewehrung.' },
      { code: 'DIN 18202', titel: 'Toleranzen im Hochbau', desc: 'Maßabweichungen, Ebenheit von Flächen, Lotgenauigkeit.' },
    ],
    typPositionen: [
      {
        kategorie: 'Beton + Bewehrung',
        beispiele: [
          { text: 'Stahlbeton C25/30, Wand, geliefert + eingebaut', einheit: 'm³' },
          { text: 'Stahlbeton C30/37, Decke, geliefert + eingebaut', einheit: 'm³' },
          { text: 'Bewehrungsstahl BSt 500 S, geliefert + verlegt', einheit: 't' },
          { text: 'Mattenbewehrung, Q-Matten, geliefert + verlegt', einheit: 'kg' },
        ],
      },
      {
        kategorie: 'Schalung',
        beispiele: [
          { text: 'Schalung Wand, beidseitig, Sichtbetonklasse SB1', einheit: 'm²' },
          { text: 'Schalung Decke, glatt, mit Stütztürmen', einheit: 'm²' },
          { text: 'Sichtbeton SB3-Schalung mit Fugenraster', einheit: 'm²' },
          { text: 'Schalung Stützen, glatt rund Ø 30 cm', einheit: 'm' },
        ],
      },
      {
        kategorie: 'Mauerwerk',
        beispiele: [
          { text: 'KS-Mauerwerk d=24 cm, RDK 1,8, DM Mörtelgruppe IIa', einheit: 'm²' },
          { text: 'Ziegel-Mauerwerk d=36,5 cm Außenwand, RDK 0,9', einheit: 'm²' },
          { text: 'Porenbeton-Mauerwerk d=24 cm, RDK 0,5', einheit: 'm²' },
          { text: 'Brüstung KS d=11,5 cm bis OK Fenster', einheit: 'm' },
        ],
      },
      {
        kategorie: 'Sonderpositionen',
        beispiele: [
          { text: 'Wärmedämmung WLS 035, d=18 cm, Klebe + Dübel', einheit: 'm²' },
          { text: 'Estrich CT-C25-F4, d=6 cm, mit Trennlage', einheit: 'm²' },
          { text: 'Treppe gewendelt, Sichtbeton SB2, fertig montiert', einheit: 'St' },
          { text: 'Dachstuhl KVH C24, Sparren 8/18, vorgefertigt', einheit: 'm²' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'Sichtbeton-Klasse korrekt einpreisen',
        desc: 'SB1 bis SB4 unterscheiden sich um Faktor 2–3 im Schalungsaufwand. SB3/SB4 brauchen geprüfte Schalhaut, Fugenraster, Probeflächen — oft als „glatt geschalt" verharmlost.',
      },
      {
        titel: 'Bewehrungsgehalt realistisch ansetzen',
        desc: 'Wände 80–120 kg/m³, Decken 120–180 kg/m³, Stützen 180–250 kg/m³. Bei „nach Erfordernis" planen wir mit projektspezifischen Statik-Annahmen statt Pauschalen.',
      },
      {
        titel: 'Mauerwerks-Festigkeitsklasse nicht mit Rohdichte verwechseln',
        desc: 'Druckfestigkeit (12–20) und Rohdichteklasse (0,5–2,2) sind zwei verschiedene Achsen. Falsche Zuordnung führt zu 15–30 % Materialpreisabweichung.',
      },
      {
        titel: 'Schalung-Wiederverwendung kalkulatorisch berücksichtigen',
        desc: 'Schalungseinsätze über 6–12 Einsätze amortisiert. Bei Einzel-Wänden oder Sonderschalungen separat ausweisen — sonst über- oder unterkalkuliert.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Hochbau-Preset mit typischen Sichtbeton- und Mauerwerks-Positionen vorbefüllt.',
      },
      {
        slug: 'mittellohn',
        name: 'Mittellohn-Rechner',
        warum: 'BRTV-Bau LG 3–6 (Polier/Vorarbeiter) — Standard-Mittellohn für Rohbau-Kolonnen West/Ost.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'X81/X83 von öffentlichen Auftraggebern → Excel → Direkt-Übergabe an Kalkulator.',
      },
    ],
    deliverables: [
      { titel: 'Urkalkulation lückenlos', desc: 'Jede Position mit Mengenermittlung, Material-, Lohn- und Zuschlagsanteil — VOB/A § 13 kompatibel.' },
      { titel: 'Sichtbeton-Klassifizierung geprüft', desc: 'SB1–SB4 nach Vorgabe — wir markieren Diskrepanzen zwischen LV-Text und Plan.' },
      { titel: 'EFB 221/222/223 ausgefüllt', desc: 'Für öffentliche Vergaben nach VHB Bund — Preisermittlungs-Formblätter komplett.' },
      { titel: 'Nachunternehmer-Anfragen', desc: 'Bewehrung, Estrich, Stahlbau — regional bei eingespielten Partnern.' },
    ],
    faq: [
      {
        q: 'Bepreisen Sie auch Sondervorschläge / Nebenangebote nach VOB/A § 16d?',
        a: 'Ja. Wir prüfen Ihre Sondervorschläge zusätzlich zur Hauptkalkulation — z. B. Halbfertigteile statt Ortbeton, alternative Mauerwerksdicken. Mehrpreis-Berechnung mit Stundenersparnis und Materialvergleich.',
      },
      {
        q: 'Wie behandeln Sie Bedarfs- und Wahlpositionen?',
        a: 'Bedarfspositionen kennzeichnen wir mit BP in der EP-Spalte, Eventualpositionen mit EVp. Im Schlussblatt werden sie nur einbezogen, wenn vom Auftraggeber abgerufen — das verhindert Doppelzählung in der Endsumme.',
      },
      {
        q: 'Was kostet die Hochbau-Kalkulation für ein typisches Bauvorhaben?',
        a: 'Reines Rohbau-LV (80–150 Positionen): 200–400 € Festpreis, 24–48 h. Schlüsselfertig (250–500 Positionen): 400–600 €. Bei Monatspaket M (3.000 €) bis zu 4 LVs pro Monat inklusive.',
      },
      {
        q: 'Kommen Sie auch zur Vergabegespräch-Erläuterung?',
        a: 'Ja, im Saarland und angrenzenden Regionen persönlich (Frankreich/Lothringen, RLP, BW). Bundesweit per Video — wir bereiten Sie auf typische Nachfragen zur Urkalkulation vor und liefern auf Wunsch Backup-Statements.',
      },
    ],
  },

  tiefbau: {
    heroSubtitle:
      'Erdbewegung, Pfahlgründung, Kanal, Wasserhaltung — komplette Tiefbau-LVs in 48 h bepreist. ATV DIN 18300 Homogenbereiche statt veralteter Bodenklassen.',
    einordnung:
      'Tiefbau bündelt Erdarbeiten, Spezialtiefbau, Entwässerungskanalbau und Wasserhaltung unterhalb der Bodenplatte. Mit der Novellierung 2023 ist DIN 18300 von Bodenklassen 1–7 auf Homogenbereiche umgestellt — wir kennen beide Systeme und kalkulieren konform zum jeweiligen LV-Stand.',
    normen: [
      { code: 'ATV DIN 18300', titel: 'Erdarbeiten', desc: 'Homogenbereiche (seit 2016), Aushub, Verfüllung, Bodenklassifikation nach DIN 18196.' },
      { code: 'ATV DIN 18301', titel: 'Bohrarbeiten', desc: 'Erkundungsbohrungen, Brunnenbohrungen, Pfahlbohrungen.' },
      { code: 'ATV DIN 18303', titel: 'Verbauarbeiten', desc: 'Trägerbohlwand, Spundwand, rückverankerte Verbauten.' },
      { code: 'ATV DIN 18305', titel: 'Wasserhaltungsarbeiten', desc: 'Offene Wasserhaltung, Pumpensumpfe, Grundwasserabsenkung.' },
      { code: 'ATV DIN 18306', titel: 'Entwässerungskanalarbeiten', desc: 'Kanal Steinzeug/Beton/PE-HD, Schachtbau, Druckprobe, Kamera-Befahrung.' },
      { code: 'ZTV E-StB', titel: 'Erdbau Straßenbau', desc: 'Zusätzl. Techn. Vertragsbedingungen — Verdichtungsgrad, Wassergehalt, Frostsicherheit.' },
    ],
    typPositionen: [
      {
        kategorie: 'Erdarbeiten',
        beispiele: [
          { text: 'Aushub Homogenbereich H2, lösen + transportieren bis 5 km', einheit: 'm³' },
          { text: 'Aushub Fels (HB H7), reißen + abfahren', einheit: 'm³' },
          { text: 'Lagerfläche andecken, Mutterboden zwischenlagern', einheit: 'm³' },
          { text: 'Verfüllung lagenweise, Verdichtungsgrad DPr ≥ 100 %', einheit: 'm³' },
        ],
      },
      {
        kategorie: 'Spezialtiefbau',
        beispiele: [
          { text: 'Spundwand Larssen 605, einrütteln + ziehen, L = 8 m', einheit: 'm²' },
          { text: 'Bohrpfahl Ø 60 cm, L = 12 m, Bewehrungskorb', einheit: 'm' },
          { text: 'Rüttelstopfsäulen Ø 60 cm, L = 6 m', einheit: 'm' },
          { text: 'Geotextil Schutzlage 200 g/m², verlegt', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Kanalbau',
        beispiele: [
          { text: 'PE-HD-Rohr DN 250 SDR 17, geliefert + verlegt', einheit: 'm' },
          { text: 'Steinzeugrohr DN 300, Klasse 95, eingebaut', einheit: 'm' },
          { text: 'Schacht DN 1000, Tiefe 3,0 m, mit Auftriebssicherung', einheit: 'St' },
          { text: 'Druckprobe nach DIN EN 1610, mit Protokoll', einheit: 'm' },
        ],
      },
      {
        kategorie: 'Wasserhaltung',
        beispiele: [
          { text: 'Offene Wasserhaltung mit Pumpensumpf, Pumpe Q = 30 m³/h', einheit: 'Tag' },
          { text: 'Grundwasserabsenkung mit Filterbrunnen DN 200', einheit: 'St' },
          { text: 'Spundwand-Dichtung mit Schlitzwandverbindung', einheit: 'm²' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'Homogenbereiche vs. alte Bodenklassen unterscheiden',
        desc: 'Seit 2016 (DIN 18300) sind nicht mehr die Bodenklassen 1–7 maßgeblich, sondern Homogenbereiche aus dem Baugrundgutachten. Auf alten LV-Vorlagen findet sich oft noch BK 3/BK 5 — wir mappen das auf den aktuellen Stand.',
      },
      {
        titel: 'Wasserhaltung als zeitabhängige Position',
        desc: 'Wasserhaltung wird oft pauschal angesetzt, aber realistisch über Aushubdauer × Pumpenleistung × Stromkosten zu kalkulieren. 30–60 % Unterkalkulationsrisiko bei Trockenheits-Schwankungen.',
      },
      {
        titel: 'Aushub-Wiederverwertung vs. Entsorgung trennen',
        desc: 'Aushub auf Baustelle wieder einbauen ist 5–15 €/m³, Entsorgung als Z0/Z1/Z2/A-Material 15–80 €/m³. Bei „seitwärts lagern + wieder einbauen" ist Verdichtbarkeit nach LAGA zu prüfen.',
      },
      {
        titel: 'Spundwand-Kalkulation: Stahlmiete vs. Kauf',
        desc: 'Bei kurzen Bauzeiten (<6 Monate) ist Spundbohlen-Miete günstiger als Kauf. Bei langen Verbau-Zeiten (>12 Monate) kippt das Verhältnis. Wir kalkulieren beide Varianten.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Tiefbau-Preset mit Asphalt, Schotter, Rohrleitungen vorbefüllt — typische Stundenansätze.',
      },
      {
        slug: 'buergschaft',
        name: 'Bürgschafts-Rechner',
        warum: 'Tiefbau-Großprojekte mit langen Gewährleistungsfristen (5+ Jahre Kanal/Brücke) — Avalkosten signifikant.',
      },
      {
        slug: 'frist-rechner',
        name: 'Submissions-Frist-Rechner',
        warum: 'VOB/A § 12a Mindestfristen-Check — Tiefbau-Vergaben oft öffentlich mit strengen Fristen.',
      },
    ],
    deliverables: [
      { titel: 'Homogenbereich-Mengenermittlung', desc: 'Aushubmengen je HB aus Baugrundgutachten + Geländemodell — keine Pauschalen.' },
      { titel: 'Kanal-Druckprobenkalkulation', desc: 'DN-spezifische Stundensätze inkl. Protokollerstellung nach DIN EN 1610.' },
      { titel: 'Entsorgungs-Mengenermittlung', desc: 'AVV-Schlüssel-Zuordnung (170504, 170503) — Deponieklassen Z0/Z1/Z2.' },
      { titel: 'NEP / Nachtragsangebot-Prüfung', desc: 'Bei Bodenklassen-Wechsel oder Schadstofffunden — Mehrkosten dokumentiert.' },
    ],
    faq: [
      {
        q: 'Wie gehen Sie mit unklaren Baugrundverhältnissen um?',
        a: 'Wir kalkulieren auf Basis des vorliegenden Baugrundgutachtens. Sind keine ausreichenden Bohrungen ausgewertet, weisen wir das als Risikoposition aus und empfehlen einen Bauvertrags-Bedarfsvorhalt von 5–10 % auf Erdarbeiten.',
      },
      {
        q: 'Berücksichtigen Sie die ZTV E-StB für Verdichtungsnachweise?',
        a: 'Ja. Verdichtungsgrad DPr und Wassergehalt werden mengenmäßig berücksichtigt — inklusive Probeverdichtungen, Plattendruckversuchen Ev2, ggf. Bodenaustausch bei Nicht-Bestehen.',
      },
      {
        q: 'Welche Tiefbau-Software-Formate akzeptieren Sie?',
        a: 'GAEB DA XML aus ARRIBA, RIB iTWO, Nevaris, ORCA — und PDF/Excel als Fallback. Bei DIN-Norm-Diskrepanzen (alte BK vs. neue HB) klären wir per Mail oder Anruf vor der Bepreisung.',
      },
      {
        q: 'Kalkulieren Sie auch Erd-/Bohrarbeiten als Nachunternehmer-Leistung?',
        a: 'Ja. Wir haben Standardpreis-Anfragen bei drei regionalen Spezialtiefbau-Unternehmen im Saarland und SW-Deutschland — Vor-Angebote i. d. R. innerhalb 48 h.',
      },
    ],
  },

  strassenbau: {
    heroSubtitle:
      'Asphalt, Pflaster, Markierung — Straßen-, Wege- und Platzbau nach ZTV Asphalt-StB 07 und RStO 12. Frostschutz bis Deckschicht.',
    einordnung:
      'Straßenbau umfasst alle befestigten Verkehrsflächen — Asphalt, Pflaster, Beton, Markierungen. Maßgeblich sind ZTV Asphalt-StB, RStO 12 für den Aufbau nach Bauklassen SV/I–VI und DIN 18316 Asphaltbauweisen. Saisonale Witterungsfenster (Asphalt-Einbau ≥ 5 °C) sind kalkulatorisch zwingend.',
    normen: [
      { code: 'ZTV Asphalt-StB 07', titel: 'Asphaltschichten', desc: 'Trag-, Binder- und Deckschicht — Mischgutarten AC, SMA, PA, Splittmastix.' },
      { code: 'RStO 12', titel: 'Standardisierung Oberbau', desc: 'Aufbaudicken Bauklassen SV/I–VI, Frostschutzschicht 30–60 cm.' },
      { code: 'TL Asphalt-StB 07', titel: 'Technische Lieferbedingungen', desc: 'Mischgutspezifikationen, Bitumen B 70/100 / PmB 25-55.' },
      { code: 'ZTV BEB-StB 09', titel: 'Betonbauweisen', desc: 'Betondecken, Fugenraster, Dübellage.' },
      { code: 'ZTV Pflaster-StB 06', titel: 'Pflasterbauweisen', desc: 'Pflasterbettung 3–5 cm Splitt, Fugenmaterial.' },
      { code: 'RMS 1', titel: 'Markierungsstoffe Straßen', desc: 'Kaltspritzplastik, Thermoplastik, Folien — Verschleiß-Klassen.' },
    ],
    typPositionen: [
      {
        kategorie: 'Unter- und Tragschichten',
        beispiele: [
          { text: 'Frostschutzschicht 0/45 mm, Dicke 40 cm, verdichtet', einheit: 'm²' },
          { text: 'Schottertragschicht 0/45, Dicke 20 cm, Ev2 ≥ 150 MN/m²', einheit: 'm²' },
          { text: 'Verfestigte Schottertragschicht mit Bindemittel HGT', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Asphalt',
        beispiele: [
          { text: 'Asphalttragschicht AC 22 TS, Dicke 14 cm, eingebaut', einheit: 'm²' },
          { text: 'Asphaltbinder AC 16 BS, Dicke 5 cm, eingebaut', einheit: 'm²' },
          { text: 'Asphaltdeckschicht AC 11 DS, Dicke 4 cm, eingebaut', einheit: 'm²' },
          { text: 'Splittmastixasphalt SMA 8 LA, Dicke 3 cm', einheit: 'm²' },
          { text: 'Asphaltfräsen, Dicke 4 cm, Entsorgung', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Pflaster + Bordstein',
        beispiele: [
          { text: 'Betonsteinpflaster 10/20/8, grau, geliefert + verlegt', einheit: 'm²' },
          { text: 'Granitpflaster 12/14/12, Reihen verlegt', einheit: 'm²' },
          { text: 'Hochbordstein 15/30/100, gerade, einbetoniert', einheit: 'm' },
          { text: 'Tiefbordstein 25/15/100, Granit, einbetoniert', einheit: 'm' },
        ],
      },
      {
        kategorie: 'Markierung',
        beispiele: [
          { text: 'Markierungsstreifen Kaltspritzplastik, Breite 12 cm, weiß', einheit: 'm' },
          { text: 'Sinnbild Pfeil Thermoplastik, weiß, aufgeschmolzen', einheit: 'St' },
          { text: 'Demarkierung Fräsen + Reinigung', einheit: 'm' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'Aufbaudicken nach RStO-Bauklasse korrekt zuordnen',
        desc: 'SV (Schwerlast Autobahn) braucht 56 cm Gesamtaufbau, Bauklasse VI (Wege) nur 35 cm. LV-Texte „nach Erfordernis" oft unterspezifiziert — wir prüfen Verkehrslast-Annahmen und kalkulieren konkret.',
      },
      {
        titel: 'Asphalt-Witterungsfenster einplanen',
        desc: 'Asphaltdeckschicht ≥ 5 °C Untergrund-Temperatur (ZTV Asphalt 4.3.1.1). Wintereinbauten brauchen Schutzmaßnahmen oder Verschiebung in Frühjahr — terminkritisch.',
      },
      {
        titel: 'Pflasterunterbau vollständig erfassen',
        desc: 'Pflaster ohne Bettung 3–5 cm und Tragschicht ist nicht standsicher. Bei „Pflastern auf vorh. Tragschicht" prüfen wir Restdicke und Tragfähigkeit — sonst Mehrkosten beim Einbau.',
      },
      {
        titel: 'Markierungsstoff nach Verschleiß-Klasse',
        desc: 'Folie hält 4–6 Jahre, Thermoplastik 6–10 Jahre, Kaltplastik 3–5 Jahre. Lebenszyklus-Kalkulation oft sinnvoller als nur Erstkosten — wir weisen das auf Wunsch aus.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Asphalt-/Pflaster-typische Positionen mit Stundenansätzen für Maschinen + Kolonne.',
      },
      {
        slug: 'frist-rechner',
        name: 'Submissions-Frist-Rechner',
        warum: 'Saisonale Witterungsfenster — Asphalt-Einbau nicht im Winter. Submissionsabgabe muss Einbau-Zeitraum berücksichtigen.',
      },
      {
        slug: 'mittellohn',
        name: 'Mittellohn-Rechner',
        warum: 'BRTV-Bau LG 3–5 (Geselle/Vorarbeiter/Werkpolier) — typische Asphalt-Einbau-Kolonne.',
      },
    ],
    deliverables: [
      { titel: 'RStO-konformer Aufbau', desc: 'Bauklasse-Zuordnung mit Schichtdicken-Nachweis je RStO 12 Tafel 1.' },
      { titel: 'Asphalt-Mischgut-Spezifikation', desc: 'AC / SMA / PA-Mischgüter zugeordnet — Lieferanten-Angebote auf Wunsch.' },
      { titel: 'Witterungsbedingt-Klausel', desc: 'Asphalt-Einbau ≥ 5 °C explizit dokumentiert — terminliche Pufferzeit ausgewiesen.' },
      { titel: 'EFB 221/222/223', desc: 'Bei öffentlichen Vergaben Preisermittlungs-Formblätter komplett ausgefüllt.' },
    ],
    faq: [
      {
        q: 'Wie kalkulieren Sie Markierungs-Erneuerungen?',
        a: 'Erst Demarkierung (Fräsen oder Strahlen) mengenmäßig erfassen, dann neue Markierung — keine reine Übermalung. Für öffentliche Auftraggeber (Bund, Land) oft mit Materialwechsel von Folie auf Thermoplastik.',
      },
      {
        q: 'Berücksichtigen Sie Verkehrssicherungs-Pauschalen?',
        a: 'Ja. Verkehrssicherung mit Beschilderung, ggf. Ampelanlage, Absperrungen nach RSA 21 — getrennt von Bauleistung, oft als Z-Position oder als Tagespauschale.',
      },
      {
        q: 'Kalkulieren Sie auch Pflaster für historische Innenstädte?',
        a: 'Ja. Naturstein-Pflaster (Granit, Basalt, Porphyr) mit Reihenverband oder Bogensegment — Aufmaß per Plan inkl. Schnittstücken (Verschnitt 10–15 %).',
      },
      {
        q: 'Was machen Sie bei Bestands-Asphalt mit Schadstoffverdacht?',
        a: 'Pech-haltige Schichten (PAK > 25 mg/kg) müssen separat als Sondermüll AVV 170301* entsorgt werden. Wir empfehlen vor Bepreisung eine Probennahme — Mehrkosten 4–8 €/m² möglich.',
      },
    ],
  },

  galabau: {
    heroSubtitle:
      'Garten- und Landschaftsbau — von Pflasterflächen über Bepflanzung bis Sportplatz und Spielplatz. FLL-konform, Anwachsgarantie inklusive Kalkulation.',
    einordnung:
      'GaLaBau umfasst alle Außenanlagen: Vegetations- und Bodenarbeiten, Pflaster- und Wegebau, Bepflanzung, Rasen, Spielplätze und Sportflächen. Die FLL (Forschungsgesellschaft Landschaftsentwicklung Landschaftsbau) liefert verbindliche Empfehlungen, ergänzt um VOB/C-Normen DIN 18915–18920.',
    normen: [
      { code: 'VOB/C DIN 18915', titel: 'Bodenarbeiten', desc: 'Mutterboden-Andecken, Bodenverbesserung, pH-Wert, Filterung.' },
      { code: 'VOB/C DIN 18916', titel: 'Pflanzen und Pflanzarbeiten', desc: 'Pflanzenqualitäten, Containergrößen, Ballenware.' },
      { code: 'VOB/C DIN 18917', titel: 'Rasen und Saatarbeiten', desc: 'Rasensaat, Rollrasen, Wildblumen-Mischungen.' },
      { code: 'VOB/C DIN 18918', titel: 'Ingenieurbiologische Sicherungen', desc: 'Böschungssicherung, Lebendverbau, Faschinen.' },
      { code: 'VOB/C DIN 18920', titel: 'Schutz Bäume', desc: 'Baumschutz auf Baustellen, Wurzelraum, Stammschutz.' },
      { code: 'FLL Spielplätze', titel: 'Spielplatz-Empfehlungen', desc: 'Fallschutz, Sicherheitsabstände, DIN EN 1176 Spielgeräte.' },
    ],
    typPositionen: [
      {
        kategorie: 'Erdbau + Mutterboden',
        beispiele: [
          { text: 'Mutterboden andecken, h = 25 cm, planieren', einheit: 'm³' },
          { text: 'Bodenverbesserung mit Kompost 10 vol-%', einheit: 'm³' },
          { text: 'Drainage Kiespackung 16/32, Tiefe 30 cm', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Wege + Pflaster',
        beispiele: [
          { text: 'Granitpflaster 9/11/9, Reihenverband, verlegt', einheit: 'm²' },
          { text: 'Wegeplatten Beton 40×40×6, grau, gerade', einheit: 'm²' },
          { text: 'Schotterrasen / Splittfuge, Pflaster ungebunden', einheit: 'm²' },
          { text: 'Rasenkantenstein, Beton, 5×25×100, gesetzt', einheit: 'm' },
        ],
      },
      {
        kategorie: 'Bepflanzung',
        beispiele: [
          { text: 'Sträucher Container 5L, verschiedene Sorten, gepflanzt', einheit: 'St' },
          { text: 'Hochstamm-Baum 18/20, mit Verankerung 3 Pfähle', einheit: 'St' },
          { text: 'Heckenpflanze Liguster, 80/100, im Topf', einheit: 'St' },
          { text: 'Rosen wurzelnackt, gepflanzt mit Anwachshilfe', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Rasen + Sportflächen',
        beispiele: [
          { text: 'Rasensaat Sport-Rasen RSM 3.1, 40 g/m²', einheit: 'm²' },
          { text: 'Rollrasen, Sportrasen, mit Walzen + Wässerung', einheit: 'm²' },
          { text: 'Kunstrasen mit Sandfüllung, inkl. Unterbau', einheit: 'm²' },
          { text: 'Fallschutz EPDM 30 mm, monolitisch', einheit: 'm²' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'Anwachsgarantie 24 Monate nach FLL einkalkulieren',
        desc: 'FLL-Empfehlung fordert 2 Jahre Anwachsgarantie mit Ersatzpflicht. Realistisch 5–15 % Ausfallquote → in Material-Zuschlag berücksichtigen, sonst Verlust bei Nachpflanzung.',
      },
      {
        titel: 'Mutterboden-Mengen nach DIN 19731 korrigieren',
        desc: 'Aushub-Volumen ≠ Einbau-Volumen. Auflockerungsfaktor 1,15–1,25 (sandig) bzw. 1,25–1,40 (bindig) — sonst Liefer- und Andeck-Mengen falsch.',
      },
      {
        titel: 'Pflaster-Aufbau für Befahrbarkeit prüfen',
        desc: 'Wege für PKW brauchen 15–20 cm Tragschicht, für LKW (z. B. Müllwagen) 30–40 cm. „Wege Pflaster" ohne Last-Angabe ist offene Spezifikation — wir hinterfragen.',
      },
      {
        titel: 'Spielplatz-Fallschutz nach EN 1176/1177',
        desc: 'Fallhöhe 1–3 m verlangt verschiedene Fallschutz-Materialien: Rindenmulch 30 cm = bis 3 m, Sand 30 cm = bis 2 m, EPDM = nach HIC-Test. Falsche Zuordnung = TÜV-Mängel.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'GaLaBau-Preset mit lohnintensiven Positionen (0,3–1,2 h/m² Pflaster) vorbefüllt.',
      },
      {
        slug: 'mittellohn',
        name: 'Mittellohn-Rechner',
        warum: 'GaLaBau-Mittellohn ist niedriger als Hochbau — eigener Tarifvertrag, durchschnittlich 22–28 €/h.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'Öffentliche GaLaBau-Vergaben (Schulhof, Kita-Außenanlage) als X83 — direkt im Browser öffnen.',
      },
    ],
    deliverables: [
      { titel: 'FLL-konforme Mengenermittlung', desc: 'Pflanz-, Rasen-, Wege-Mengen nach DIN 18915–18920 — Anwachsgarantie eingerechnet.' },
      { titel: 'Pflanz-Listen mit Sortenwahl', desc: 'Baumschulen-übliche Container-/Ballengrößen, Heimisch vs. Exoten klargestellt.' },
      { titel: 'Spielplatz-Sicherheits-Check', desc: 'Fallschutz nach EN 1177, Sicherheitsabstände nach EN 1176 dokumentiert.' },
      { titel: 'Pflege-Kalkulation optional', desc: 'Anwachspflege Jahr 1–2 als Optionsposition — auf Wunsch separat ausgewiesen.' },
    ],
    faq: [
      {
        q: 'Beziehen Sie Pflanzen-Preise aus Baumschulen?',
        a: 'Ja, von 3 saarländischen und SW-deutschen Baumschulen (Saarpfalz, Rheinpfalz, Lothringen) — Standardpreise für Container-/Ballenware. Bei Sonderbestellungen (Solitärbäume, Heckenelemente) Einzelanfrage.',
      },
      {
        q: 'Wie behandeln Sie die Pflanz-Saisonalität?',
        a: 'Container-Ware ganzjährig pflanzbar. Wurzelnackt nur Oktober–März (Heckenpflanzung). Bei Termindruck weisen wir Saisonal-Risiko als Bedarfsvorhalt aus.',
      },
      {
        q: 'Was kostet eine typische Schul- oder Kita-Außenanlage?',
        a: 'Pauschal-Kalkulation für ein 1.500 m² Schulhof mit Pflaster, Pflanzung und Spielfläche: 400–500 € Festpreis, 48–72 h. Wir liefern auch Variantenrechnung (Pflaster vs. Natursteinbelag).',
      },
      {
        q: 'Übernehmen Sie Pflege-Verträge?',
        a: 'Wir kalkulieren die Pflegekosten 1. und 2. Standjahr nach FLL — Schnitt, Wässerung, Nachpflanzung. Die operative Pflege übernimmt der Kunde oder ein lokaler GaLaBau-Betrieb; wir liefern nur die Kalkulation.',
      },
    ],
  },

  haustechnik: {
    heroSubtitle:
      'Sanitär, Heizung, Lüftung, Klima, Kälte — TGA-Pakete schlüsselfertig bepreist. GEG-konform, Wärmepumpen-Pflicht und 65 %-EE-Regel kalkulatorisch berücksichtigt.',
    einordnung:
      'HLS / Haustechnik (TGA) umfasst Heizungsbau, Sanitär, Lüftung, Klima- und Kältetechnik. Seit GEG 2024 müssen neue Heizungen 65 % erneuerbare Energien nutzen — Wärmepumpen, Hybrid-Systeme, Fernwärme. Wir kalkulieren konform zu DIN EN 12831 Heizlast, DIN EN 12056 Entwässerung und VDI 6023 Trinkwasserhygiene.',
    normen: [
      { code: 'VOB/C DIN 18380', titel: 'Heizanlagen + zentr. Wassererwärm.', desc: 'Kessel, Wärmepumpen, Pufferspeicher, hydraulischer Abgleich.' },
      { code: 'VOB/C DIN 18381', titel: 'Gas-, Wasser-, Abwasserleitungen', desc: 'Trinkwasser-Installation, Schmutz- und Regenwasser.' },
      { code: 'VOB/C DIN 18421', titel: 'Wärmedämmarbeiten', desc: 'Dämmung Rohrleitungen, Armaturen — EnEV/GEG-Anforderungen.' },
      { code: 'GEG 2024', titel: 'Gebäudeenergiegesetz', desc: '65 %-EE-Regel ab 2024 für Neubau, 2026/2028 für Bestand.' },
      { code: 'DIN EN 12831', titel: 'Heizlast-Berechnung', desc: 'Normaußentemperatur, U-Wert, Luftwechsel — Grundlage Kessel-Dimensionierung.' },
      { code: 'VDI 6023', titel: 'Trinkwasserhygiene', desc: 'Spülung, Beprobung, Maßnahmen gegen Legionellen.' },
    ],
    typPositionen: [
      {
        kategorie: 'Wärmeerzeuger',
        beispiele: [
          { text: 'Luft/Wasser-Wärmepumpe 12 kW, Außengerät + Innengerät', einheit: 'St' },
          { text: 'Brennwert-Gaskessel 24 kW, wandhängend, Abgasanlage', einheit: 'St' },
          { text: 'Pufferspeicher 800 l, mit Anschlussverrohrung', einheit: 'St' },
          { text: 'Solar-Thermie 6 m² Indach, mit Speicher 300 l', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Heizflächen + Verteilung',
        beispiele: [
          { text: 'Fußbodenheizung, Verlegeabstand 10 cm, Tackerplatten', einheit: 'm²' },
          { text: 'Stahlplatten-Heizkörper Typ 22, 600 × 1000, montiert', einheit: 'St' },
          { text: 'Heizungsleitung PE-X 16×2, Verbundrohr im Estrich', einheit: 'm' },
          { text: 'Hydraulischer Abgleich nach Verfahren B', einheit: 'pauschal' },
        ],
      },
      {
        kategorie: 'Sanitär',
        beispiele: [
          { text: 'WC bodenstehend Tiefspül, mit Drücker und Spülkasten', einheit: 'St' },
          { text: 'Waschbecken 60 cm, mit Unterschrank weiß, Einhebel-Misch.', einheit: 'St' },
          { text: 'Trinkwasserleitung PE-X 16×2, im Schacht verlegt', einheit: 'm' },
          { text: 'Abwasserleitung HT-PP DN 110, Bogen + Reduzierung', einheit: 'm' },
        ],
      },
      {
        kategorie: 'Lüftung + Klima',
        beispiele: [
          { text: 'Lüftungsgerät zentr. mit Wärmerückgewinnung 80 %, 250 m³/h', einheit: 'St' },
          { text: 'Luftleitung DN 160 gedämmt, im DG verlegt', einheit: 'm' },
          { text: 'Tellerventil weiß, 100 m³/h, mit Schnellverschluss', einheit: 'St' },
          { text: 'Split-Klimagerät 3,5 kW Innen/Außen, Kältemittel R32', einheit: 'St' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'GEG 65 %-EE-Regel beachten',
        desc: 'Seit 2024 müssen neue Heizungen im Neubau 65 % erneuerbare Energien decken (Wärmepumpe, Fernwärme, Solar-Thermie, Bio-Hybrid). Reiner Gaskessel-Einbau nur in Bestand bis 2028 zulässig — falsche Kalkulation = Vertragsrisiko.',
      },
      {
        titel: 'Hydraulischer Abgleich Verfahren A vs. B',
        desc: 'Verfahren A (rechnerisch) reicht für Bestand < 1.000 m². Verfahren B (raumweise Heizlast) ist bei Neubau und Förderung BEG zwingend. Aufwandsunterschied Faktor 2–3.',
      },
      {
        titel: 'Trinkwasserhygiene VDI 6023 nicht vergessen',
        desc: 'Spülplan, Beprobung, Hygiene-Inspektion. Bei Krankenhaus/Pflegeheim TrinkwV § 14 mit jährlicher Legionellen-Beprobung — laufende Kosten in Wartungsvertrag, nicht in Bauleistung.',
      },
      {
        titel: 'Wärmepumpe Schallpegel beachten',
        desc: 'Luft/Wasser-WP-Außengeräte: nachts Grenzwert TA Lärm 35 dB(A) in WA, 30 dB(A) in WR. Bei Reihenhäusern oft kritisch — Schallschutz-Haube ggf. einzukalkulieren.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'HLS-Materialpreise unterliegen großer Volatilität (Wärmepumpen +30 % 2022/23) — Preis-Updates aktuell.',
      },
      {
        slug: 'buergschaft',
        name: 'Bürgschafts-Rechner',
        warum: 'HLS-Gewährleistung 5 Jahre — Avalprovision über volle Laufzeit kalkulationsrelevant.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'TGA-Vergaben oft als getrennte Lose (Heizung, Sanitär, Lüftung) — pro Los eigenes LV bepreisen.',
      },
    ],
    deliverables: [
      { titel: 'GEG-Compliance-Check', desc: '65 %-EE-Regel und Effizienz-Anforderungen je nach Bestand/Neubau geprüft.' },
      { titel: 'Heizlast-Plausibilisierung', desc: 'DIN EN 12831 — Heizlast vs. Kessel-/WP-Dimensionierung abgeglichen.' },
      { titel: 'Hersteller-Detection', desc: 'Vaillant, Viessmann, Buderus, Wolf, Stiebel-Eltron, Daikin — Fabrikat-konform bepreist.' },
      { titel: 'Wartungsvertrag-Option', desc: 'Auf Wunsch jährliche Wartungskosten 2.–5. Jahr als Optionsposition.' },
    ],
    faq: [
      {
        q: 'Berücksichtigen Sie BEG-Förderung in der Kalkulation?',
        a: 'Ja. Bei Wärmepumpen-Einbau im Bestand kann der Auftraggeber bis zu 70 % BEG-Förderung erhalten. Wir weisen den förderfähigen Anteil aus und schlagen ggf. zusätzliche förderfähige Maßnahmen vor (Pufferspeicher, hydraulischer Abgleich).',
      },
      {
        q: 'Können Sie auch Sanitär-Sondergewerke (z. B. Pflegebad) kalkulieren?',
        a: 'Ja. Barrierefreies Bad nach DIN 18040-2, bodengleiche Duschen mit Linienentwässerung, Stützgriffe, höhenverstellbare Armaturen. Materialkosten i. d. R. 30–50 % höher als Standard.',
      },
      {
        q: 'Wie behandeln Sie Lüftungsanlagen-Auslegung?',
        a: 'Wir prüfen Volumenstrom nach DIN 1946-6 bzw. DIN EN 16798. Bei Wohnungen 30 m³/h pro Person Frischluft, in Schulen 30 m³/h pro Schüler. Wenn nicht ausreichend ausgelegt — Bedenken vor Bepreisung.',
      },
      {
        q: 'Kommt der Wärmepumpen-Hersteller-Wechsel zur Sprache?',
        a: 'Bei Hersteller-Vorgaben im LV prüfen wir Verfügbarkeit (Lieferzeiten Sept. 2022 → März 2024 waren 6–12 Monate). Wenn Engpass: Alternativ-Hersteller mit gleicher Leistungsklasse als Sondervorschlag.',
      },
    ],
  },

  innenausbau: {
    heroSubtitle:
      'Trockenbau, Bodenbelag, Maler, Fliesen — Innenausbau-LVs schlüsselfertig bepreist. Q1-Q4-Qualitätsstufen Trockenbau korrekt zugeordnet.',
    einordnung:
      'Innenausbau bündelt alle Gewerke zwischen Rohbau und Endübergabe: Trockenbau, Estrich, Putz, Fliesen, Parkett, Maler, Tapezierer. Maßgeblich sind die VOB/C-Normen DIN 18340 (Trockenbau) bis DIN 18365 (Bodenbelag) sowie Merkblätter des Bundesverband Ausbau und Fassade (BAF).',
    normen: [
      { code: 'VOB/C DIN 18340', titel: 'Trockenbauarbeiten', desc: 'GK-Bauplatten, Q1–Q4-Qualitätsstufen, Brandschutz F30/F60/F90.' },
      { code: 'VOB/C DIN 18350', titel: 'Putz- und Stuckarbeiten', desc: 'Innenputz Q1–Q3, Außenputz, Stuck.' },
      { code: 'VOB/C DIN 18352', titel: 'Fliesen- und Plattenarbeiten', desc: 'Fliesen Dünnbett, Dickbett, Naturstein.' },
      { code: 'VOB/C DIN 18353', titel: 'Estricharbeiten', desc: 'CT (Zementestrich), CA (Calciumsulfat), MA (Magnesia).' },
      { code: 'VOB/C DIN 18356', titel: 'Parkettarbeiten', desc: 'Massiv-, Mehrschicht-, Klick-Parkett, Schichtholzboden.' },
      { code: 'VOB/C DIN 18365', titel: 'Bodenbelagarbeiten', desc: 'Linoleum, Vinyl, Teppich, Designboden.' },
      { code: 'VOB/C DIN 18363', titel: 'Maler- und Lackierarbeiten', desc: 'Wandanstriche, Tapeten, Holzlackierung.' },
    ],
    typPositionen: [
      {
        kategorie: 'Trockenbau',
        beispiele: [
          { text: 'GK-Wand CW 75, einfach beplankt 12,5 mm GKB, Q2', einheit: 'm²' },
          { text: 'GK-Wand CW 100, doppelt beplankt 12,5 mm GKB+GKF, Q3', einheit: 'm²' },
          { text: 'GK-Decke abgehängt, Unterkonstruktion CD, beplankt Q2', einheit: 'm²' },
          { text: 'Brandschutzwand F90, doppelt GKF, mit Dämmkern', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Estrich + Putz',
        beispiele: [
          { text: 'Zementestrich CT-C25-F4, d=6 cm, schwimmend', einheit: 'm²' },
          { text: 'Calciumsulfatestrich CA-C30-F5, d=4 cm, Fließestrich', einheit: 'm²' },
          { text: 'Innenputz Gipsputz, Q2, einlagig, 10 mm', einheit: 'm²' },
          { text: 'Außenputz Mineral, dreischichtig, 25 mm, mit Armierung', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Fliesen + Bodenbelag',
        beispiele: [
          { text: 'Bodenfliese Feinsteinzeug 60×60, im Dünnbett verlegt', einheit: 'm²' },
          { text: 'Wandfliese 30×60 Mosaik, im Bad', einheit: 'm²' },
          { text: 'Mehrschichtparkett Eiche 14 mm, schwimmend verlegt', einheit: 'm²' },
          { text: 'Linoleum Marmoleum 2,5 mm, vollflächig geklebt', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Maler + Tapezierer',
        beispiele: [
          { text: 'Innenanstrich Latexfarbe weiß, zweimal gerollt', einheit: 'm²' },
          { text: 'Vliestapete, einfarbig, mit Voranstrich', einheit: 'm²' },
          { text: 'Holzlackierung Tür, dreischichtig, weißlackiert', einheit: 'St' },
          { text: 'Glättputz Q4-Spachtelung, lackier-fähig', einheit: 'm²' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'Q-Stufen Trockenbau exakt zuordnen',
        desc: 'Q1 = nur Verspachtelung, Q2 = Standard, Q3 = Sonderverspachtelung, Q4 = Glättputz für streifende Beleuchtung. Lohn-Faktor Q1→Q4 = ×3. „Verspachtelt" ohne Q-Stufe ist offen — wir hinterfragen vor Bepreisung.',
      },
      {
        titel: 'Estrich-Trocknungszeit terminkritisch',
        desc: 'CT-Estrich braucht 28 Tage Trockenzeit auf 75 % rF. Bei termingebundenem Innenausbau Heizen + Lüften kalkulieren oder Schnellestrich verwenden (1,5–2× teurer im Material).',
      },
      {
        titel: 'Untergrund-Vorbehandlung bei Fliesen + Parkett',
        desc: 'CM-Wert ≤ 2,0 für CT-Estrich vor Parkett-Verlegung; ≤ 0,5 für CA-Estrich. Bei Nicht-Einhalten Trocknungs-Heizen oder Verzögerung — Aufwand 200–400 € pro Wohnung.',
      },
      {
        titel: 'Schallschutz DIN 4109 in Mehrfamilien-Häusern',
        desc: 'Trittschalldämmung Estrich für L\'n,w ≤ 53 dB. Bei „Standard"-Estrich ist das nicht automatisch gegeben — Trennstreifen, Randdämmung, Auswahl Trittschallplatte korrekt einkalkulieren.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Innenausbau-Stundenansätze (Trockenbau 0,3 h/m² Wand, Maler 0,12 h/m² Anstrich) typisiert.',
      },
      {
        slug: 'mittellohn',
        name: 'Mittellohn-Rechner',
        warum: 'Innenausbau-Tarif (Trockenbau, Maler, Fliesen) — eigene Tarifverträge, Mittellohn 25–30 €/h.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'Schlüsselfertige Innenausbau-Vergaben oft als Sammelpaket — viele Subgewerke in einem X83.',
      },
    ],
    deliverables: [
      { titel: 'Q-Stufen-Mapping Trockenbau', desc: 'Jede Trockenbau-Position mit zugeordneter Q1–Q4-Stufe — keine Pauschalen.' },
      { titel: 'Estrich-Trocknung berücksichtigt', desc: 'Bauzeitenplan mit realistischen Trocknungszeiten — Vorlauf für nachfolgende Gewerke.' },
      { titel: 'Schallschutz-Nachweis', desc: 'DIN 4109 — Trittschalldämmung, Wandaufbau gegen Schallübertragung.' },
      { titel: 'Brandschutz-Klassifizierung', desc: 'F30/F60/F90 Trockenbauwände mit Bauteil-Klassifikation nach DIN 4102.' },
    ],
    faq: [
      {
        q: 'Kalkulieren Sie auch schlüsselfertige Wohnungs-Ausbauten?',
        a: 'Ja. Komplettpakete von Estrich über Innentüren bis Fliesen + Maler — typisch 30–80 Positionen pro Wohnung. Mengenermittlung per Wohnungsplan.',
      },
      {
        q: 'Wie behandeln Sie Sanierungs-Bestandsaufnahme?',
        a: 'Bei Bestandsanierungen empfehlen wir vorab Pre-Test (Asbest, KMF, PCB-Fugen). Nicht-erkannte Schadstoffe = Baustopp + TRGS 519 / 521 Sanierung. Wir verweisen ggf. an Schadstoff-Spezialisten und kalkulieren auf gemessenes Risiko.',
      },
      {
        q: 'Übernehmen Sie auch Subunternehmer-Anfragen?',
        a: 'Ja. Regional eingespielte Trockenbau-, Maler- und Fliesen-Partner — Anfragen i. d. R. innerhalb 48 h. Vergleichsangebote (3 NU) auf Wunsch.',
      },
      {
        q: 'Was kostet eine Innenausbau-Kalkulation für 1.000 m² Bürogebäude?',
        a: '300–500 € Festpreis, 48–72 h. Bei mehreren Geschossen mit gleichem Ausbau-Standard rabattierbar. Im Monatspaket M (3.000 €) bis zu 3 vergleichbare Projekte inklusive.',
      },
    ],
  },

  'erdbau-abbruch': {
    heroSubtitle:
      'Erdaushub, Rückbau, Entsorgung — AVV-konforme Schlüsselzuordnung Kapitel 17, Schadstoff-Vorsondierung, Recyclingfähigkeit kalkuliert.',
    einordnung:
      'Erd- und Abbrucharbeiten sind das erste und das letzte Gewerk an einem Bauwerk — Aushub für Neubau, selektiver Rückbau bei Bestand. Maßgeblich sind DIN 18299 (Allgemeine Regelungen), DIN 18459 (Abbrucharbeiten), AVV (Abfallverzeichnis-Verordnung) und ein Schadstoffkataster vor Rückbau.',
    normen: [
      { code: 'VOB/C DIN 18299', titel: 'Allgemeine Regelungen', desc: 'Vertragliche Grundlagen für alle Gewerke — Aufmaß, Vergütung, Stundenlohn.' },
      { code: 'VOB/C DIN 18459', titel: 'Abbruch- und Rückbauarbeiten', desc: 'Selektiver Rückbau, kontrollierte Sprengung, manuelles vs. maschinelles Abbrechen.' },
      { code: 'AVV', titel: 'Abfallverzeichnis-Verordnung', desc: 'Kapitel 17 Bau-/Abbruchabfälle — Schlüssel 170101–170904.' },
      { code: 'GewAbfV', titel: 'Gewerbeabfallverordnung', desc: 'Trennpflicht, Vorbehandlung, Verwertungsquote.' },
      { code: 'LAGA M20', titel: 'Bauabfall-Verwertung', desc: 'Z0–Z2 / A-Material, Boden-Klassifizierung für Wiederverwertung.' },
      { code: 'NachwV', titel: 'Nachweisverordnung', desc: 'Begleitscheine, Übernahme-/Entsorgungs-Nachweise für gefährliche Abfälle.' },
    ],
    typPositionen: [
      {
        kategorie: 'Aushub',
        beispiele: [
          { text: 'Aushub Baugrube Homogenbereich H2, lösen + verladen', einheit: 'm³' },
          { text: 'Mutterboden abtragen, separat lagern, h = 25 cm', einheit: 'm³' },
          { text: 'Aushub Fels (HB H7), reißen + abtransportieren', einheit: 'm³' },
          { text: 'Verbau Baugrube, Trägerbohlwand, L=8 m', einheit: 'm²' },
        ],
      },
      {
        kategorie: 'Abbruch + Rückbau',
        beispiele: [
          { text: 'Selektiver Rückbau Mauerwerk, Trennung KS/Ziegel', einheit: 'm³' },
          { text: 'Stahlbeton-Rückbau, Bewehrung trennen + abfahren', einheit: 'm³' },
          { text: 'Dach-Rückbau, Eindeckung Beton-Dachpfanne, manuell', einheit: 'm²' },
          { text: 'Sägeschnitt Stahlbeton d=25 cm, Wand-Öffnung', einheit: 'm' },
        ],
      },
      {
        kategorie: 'Entsorgung nach AVV',
        beispiele: [
          { text: 'Bauschutt Beton, AVV 170101, Container 7 m³, Deponie', einheit: 't' },
          { text: 'Boden unbelastet, AVV 170504, Z0, Recycling', einheit: 't' },
          { text: 'Boden Z1 belastet, AVV 170504, Deponie DK0', einheit: 't' },
          { text: 'Holz behandelt A IV, AVV 170204*, Sondermüll', einheit: 't' },
        ],
      },
      {
        kategorie: 'Recycling + Wiederverwertung',
        beispiele: [
          { text: 'RC-Material 0/45, aus Beton, geliefert + eingebaut', einheit: 'm³' },
          { text: 'Mutterboden wiedereinbauen, h = 25 cm, andecken', einheit: 'm³' },
          { text: 'Recycling-Schotter aus Mauerwerk, Frostschutz', einheit: 'm³' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'AVV-Schlüssel korrekt zuordnen',
        desc: 'Bauschutt mit Verunreinigungen (Putz, Tapeten) ist nicht AVV 170101 (reiner Beton) sondern 170904 (gemischter Bauabfall). Wert-Unterschied bei Entsorgung Faktor 3–5 — falsche Zuordnung = massive Kostenfalle.',
      },
      {
        titel: 'Schadstoff-Vorsondierung vor Rückbau zwingend',
        desc: 'Asbest, KMF, PCB, PAK, HBCD — bei Gebäuden vor 1995 hoch wahrscheinlich. Ohne Schadstoffkataster Risiko TRGS-519-Anordnung mit 5–10× Mehrkosten. Wir empfehlen Probennahme vor Bepreisung.',
      },
      {
        titel: 'Boden-Z-Klasse vor Entsorgungspreis prüfen',
        desc: 'Z0 (unbelastet): 5–15 €/t. Z1.1 (gering belastet): 20–40 €/t. Z2 (belastet): 50–100 €/t. A-Material (Deponie DK1+): 100–300 €/t. Bei „unbekanntem" Boden Probe vor Bepreisung — sonst Risiko 80 %.',
      },
      {
        titel: 'Recycling-Quote nach KrWG einplanen',
        desc: 'KrWG fordert 70 % Verwertungsquote für Bau-/Abbruchabfälle. Bei reinen Mauerwerks-/Beton-Rückbauten erreichbar; bei gemischtem Müll oft <50 %. Anrechenbarkeit der Recycling-Erlöse i. d. R. 5–15 €/t.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Erdbau/Abbruch lohn-intensiv (0,5–2 h/m³) + Container-Pauschalen — typisierte Stundenansätze.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'AVV-Schlüssel sind im LV-Langtext kodiert — wir extrahieren sie automatisch beim Parsen.',
      },
      {
        slug: 'frist-rechner',
        name: 'Submissions-Frist-Rechner',
        warum: 'Witterungsabhängige Erdarbeiten — Bauzeitenplanung mit Submissionstermin abgleichen.',
      },
    ],
    deliverables: [
      { titel: 'AVV-Schlüssel-Zuordnung pro Position', desc: 'Jede Entsorgungs-Position mit korrektem 6-stelligen AVV-Code aus Kapitel 17.' },
      { titel: 'Schadstoff-Vorsondierung empfohlen', desc: 'Bei Bestandsgebäuden < 1995: Probennahme-Empfehlung mit Beauftragungsvorschlag.' },
      { titel: 'Boden-Verwertungs-Konzept', desc: 'Z0/Z1/Z2/A-Klassifizierung, Wiederverwertung auf Baustelle vs. Deponie.' },
      { titel: 'Recycling-Erlös-Optimierung', desc: 'Stahl-Schrottwerte, RC-Beton, RC-Mauerwerk — Erlöse gegen Entsorgungskosten gerechnet.' },
    ],
    faq: [
      {
        q: 'Kalkulieren Sie auch die Schadstoff-Vorsondierung?',
        a: 'Wir empfehlen sie und kalkulieren auf Wunsch das Probennahme-Programm. Für die Probennahme selbst arbeiten wir mit zertifizierten Gutachter-Büros — Kosten 800–2.500 € je nach Gebäudegröße. Ohne Schadstoffkataster keine sichere Rückbau-Kalkulation.',
      },
      {
        q: 'Wie behandeln Sie unbekannte Bodenbelastungen?',
        a: 'Wir kalkulieren auf Basis der vorliegenden Bodenanalysen. Liegen keine vor, weisen wir das als Risikoposition aus und empfehlen vor Auftragserteilung eine Mischprobe (200–400 € je Probefeld) — günstiger als Mehrkosten bei Bauausführung.',
      },
      {
        q: 'Übernehmen Sie die NachwV-Begleitscheine?',
        a: 'Wir erstellen die Kalkulation inkl. Nachweisaufwand. Die operative Nachweisführung (Übergabe-Begleitscheine, eANV-Übermittlung) übernimmt das ausführende Entsorgungsunternehmen — i. d. R. im Container-Preis enthalten.',
      },
      {
        q: 'Bepreisen Sie auch kontrollierte Sprengungen?',
        a: 'Selten — Sprengsachverständige sind eigenes Spezialgewerbe. Wir vermitteln an Kontakt-Sprengmeister und kalkulieren das Drumherum (Verbau, Wasserhaltung, Räumung, Entsorgung).',
      },
    ],
  },

  elektro: {
    heroSubtitle:
      'Installation, BMA, EMA, KNX/DALI — komplexe Elektro-Gewerke korrekt bepreist. Fabrikat-Detection (Hager/ABB/Gira/Siemens) und System-Kompatibilität geprüft.',
    einordnung:
      'Elektrotechnik umfasst Stark- und Schwachstrom: Allgemeine Installation, Brandmelde- und Einbruchmelde-Anlagen, Gebäudesystemtechnik (KNX, DALI), Sicherheitsbeleuchtung. Maßgeblich sind VOB/C DIN 18382/18383, VDE-Bestimmungen 0100/0833 und für öffentliche Vergaben oft Fabrikats-Vorgaben mit Bietervorschlag-Möglichkeit.',
    normen: [
      { code: 'VOB/C DIN 18382', titel: 'Elektrische Kabel-/Leitungsanlagen', desc: 'Leitungsführung, Schutz, Schaltgeräte.' },
      { code: 'VOB/C DIN 18383', titel: 'Elektroanlagen Gebäudeautomation', desc: 'KNX, DALI, Gebäudesystemtechnik.' },
      { code: 'DIN VDE 0100', titel: 'Errichten von Niederspannungsanlagen', desc: 'Personenschutz, Erdung, Schutzleiter, FI-Schalter.' },
      { code: 'DIN VDE 0833', titel: 'Gefahrenmeldeanlagen', desc: 'BMA, EMA — Auslegung, Installation, Wartung.' },
      { code: 'DIN 14675', titel: 'Brandmeldeanlagen Aufbau + Betrieb', desc: 'Linien-/Adressmelder, Steuerung, Konzeptioneller Aufbau.' },
      { code: 'DIN EN 50172', titel: 'Sicherheitsbeleuchtung', desc: 'CPS, Antipanik-, Fluchtweg-Beleuchtung, Notwegkennzeichnung.' },
      { code: 'DIN EN 50173', titel: 'Strukturierte Verkabelung', desc: 'Kat-6/Kat-7/Kat-8 IT-Verkabelung, Patchfeld, LWL.' },
    ],
    typPositionen: [
      {
        kategorie: 'Allgemeine Installation',
        beispiele: [
          { text: 'Mantelleitung NYM-J 3×1,5 mm², geliefert + verlegt UP', einheit: 'm' },
          { text: 'Mantelleitung NYM-J 5×2,5 mm², für Drehstrom', einheit: 'm' },
          { text: 'Steckdose UP 1-fach SCHUKO, weiß, mit Rahmen', einheit: 'St' },
          { text: 'Schalter Wechselsch. UP, weiß, im Bestand', einheit: 'St' },
          { text: 'Verteilerkasten UP, 3-reihig, mit Bestückung', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Beleuchtung + Sicherheit',
        beispiele: [
          { text: 'LED-Pendelleuchte 60×60, DALI-fähig, gel. + montiert', einheit: 'St' },
          { text: 'Sicherheitsleuchte LED-Notausgang, CPS-Anschluss', einheit: 'St' },
          { text: 'CPS-Zentrale 200 Ah, Batterieanlage mit 90 Min Autarkie', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Brand- + Einbruchmelde',
        beispiele: [
          { text: 'BMA-Linienmelder Rauch automatisch, mit Sockel', einheit: 'St' },
          { text: 'BMA-Zentrale Kompaktanlage, 4 Linien, Akku', einheit: 'St' },
          { text: 'EMA-Glasbruchmelder akustisch, mit Anschluss', einheit: 'St' },
          { text: 'Druckknopfmelder rot, Putz, mit Schutzscheibe', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Gebäudeautomation',
        beispiele: [
          { text: 'KNX-Bus-Leitung J-Y(St)Y 2×2×0,8, verlegt UP', einheit: 'm' },
          { text: 'KNX-Schaltaktor 4-fach REG, Hager TXA604', einheit: 'St' },
          { text: 'DALI-Vorschaltgerät, dimmbar 1–10 V', einheit: 'St' },
          { text: 'KNX-Tastsensor 4-fach mit Raumtemperatur, weiß', einheit: 'St' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'Fabrikats-Vorgabe vs. Bietervorschlag prüfen',
        desc: 'Öffentliche Vergaben schreiben oft „Fabrikat: Hager oder gleichwertig" vor. Was „gleichwertig" bedeutet, ist umstritten. Wir prüfen Datenblätter parallel und schlagen rechtssichere Alternativen vor (KALKU-Skill: lv-fabrikat-pruefung).',
      },
      {
        titel: 'System-Kompatibilität KNX, DALI, BUS-2',
        desc: 'KNX-Geräte verschiedener Hersteller sind grundsätzlich kompatibel — aber DALI-Treiber + KNX-Aktoren müssen vom selben Hersteller-Ökosystem stammen oder explizit gateway-verbunden sein. Im Zweifel: Mehrkosten Gateway 200–500 € einplanen.',
      },
      {
        titel: 'BMA-Linienmelder-Anzahl je Schutzziel',
        desc: 'DIN 14675 Vollschutz: 1 Melder je 60 m² (Standard); Teilschutz: nur ausgewählte Räume. Bei „BMA nach DIN 14675" ohne Schutzziel-Angabe oft 30–50 % Mehrmelder als kalkuliert — wir hinterfragen.',
      },
      {
        titel: 'Sicherheitsbeleuchtung CPS vs. EIN-Anlagen',
        desc: 'CPS (Zentralbatterieanlage) ist Pflicht bei Versammlungsstätten > 200 Personen, Schulen, Krankenhäusern. Bei kleineren Objekten reichen EIN-Anlagen (Einzelbatterie pro Leuchte). Wechsel-Kosten 100–300 €/Leuchte.',
        },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Elektro-Preset mit typischen Stundenansätzen (NYM-J 0,08 h/m, Steckdose 0,25 h/St) vorbefüllt.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'Elektro-LVs sind groß (oft 300–600 Positionen) — Excel-Export für strukturierte Anfragen an Großhändler (Sonepar, Rexel, Zajadacz).',
      },
      {
        slug: 'mittellohn',
        name: 'Mittellohn-Rechner',
        warum: 'Elektro hat eigenen Tarifvertrag (TV-Elektro), Mittellohn 28–32 €/h — höher als Bauhauptgewerbe.',
      },
    ],
    deliverables: [
      { titel: 'Fabrikat-2-fach-Prüfung', desc: 'Jedes vorgegebene Fabrikat gegen Datenblatt geprüft, Alternativ-Vorschläge bei Nicht-Erfüllung.' },
      { titel: 'System-Kompatibilitäts-Matrix', desc: 'KNX, DALI, BUS-2, CPS, EMA, BMA — Hersteller-Mix auf Inkompatibilitäten geprüft.' },
      { titel: 'Großhändler-Anfragen', desc: 'Sonepar, Rexel, Zajadacz, Eldis, TSM — Material-Angebote in 48–72 h.' },
      { titel: 'EFB 221/222/223', desc: 'Bei öffentlicher Vergabe Preisermittlungs-Formblätter komplett ausgefüllt.' },
    ],
    faq: [
      {
        q: 'Wie behandeln Sie Bietervorschlag-Möglichkeiten („oder gleichwertig")?',
        a: 'Wir liefern auf Wunsch zwei Kalkulationen: Variante A mit Original-Fabrikat, Variante B mit funktionsgleicher Alternative (z. B. ABB statt Hager). Differenz oft 8–18 % — gibt Verhandlungsspielraum, ohne Ausschluss-Risiko.',
      },
      {
        q: 'Übernehmen Sie auch die Datenblatt-Recherche?',
        a: 'Ja. Für jedes Fabrikat im LV prüfen wir Hersteller-Datenblatt gegen LV-Anforderungen — IP-Schutzart, Bemessungsstrom, Schaltleistung etc. Diskrepanzen markieren wir vor Bepreisung.',
      },
      {
        q: 'Kalkulieren Sie auch Photovoltaik + Speicher?',
        a: 'Ja. PV-Anlagen 5–50 kWp mit Batteriespeicher LFP, Wechselrichter Hybrid (Fronius, SMA, Kostal). Auch BAFA/KfW-Förderung in der Kalkulation berücksichtigt.',
      },
      {
        q: 'Wie gehen Sie mit BMA-Konzepterstellung um?',
        a: 'BMA-Konzept ist Ingenieurleistung nach DIN 14675 — wir bepreisen nur die Installation auf Basis eines vorliegenden Konzepts. Bei reinem LV ohne Plan empfehlen wir Konzepterstellung durch zertifizierten Fachplaner (Kosten 1.500–4.000 €).',
      },
    ],
  },

  fenster: {
    heroSubtitle:
      'Fenster, Türen, Pfosten-Riegel-Fassaden — Hersteller-Detection (Veka, Schüco, Kömmerling), U-Wert + g-Wert geprüft, RAL-Montage-konform kalkuliert.',
    einordnung:
      'Fenster- und Fassadenbau umfasst Außenfenster (Kunststoff, Holz, Alu), Außentüren, Pfosten-Riegel-Fassaden und Wintergärten. Energetisch maßgeblich sind U-Wert (Wärmedurchgang) und g-Wert (Solarer Energiegewinn) — Anforderungen ergeben sich aus GEG / KfW-Effizienzhäusern.',
    normen: [
      { code: 'VOB/C DIN 18355', titel: 'Tischlerarbeiten', desc: 'Holzfenster, Holztüren, Schreiner-Leistungen.' },
      { code: 'VOB/C DIN 18360', titel: 'Metallbauarbeiten', desc: 'Alu-Fenster, Stahlrahmen, Metall-Türen.' },
      { code: 'DIN EN 14351-1', titel: 'Fenster + Außentüren', desc: 'Produktnorm mit U-, g-, Schalldämmwert, Luftdurchlässigkeit.' },
      { code: 'ift-Richtlinie MO-01/1', titel: 'Fenster-Montage', desc: 'Lastabtrag, Dichtebene, RAL-Montage 3-Ebenen-Prinzip.' },
      { code: 'GEG 2024', titel: 'Gebäudeenergiegesetz', desc: 'U-Wert Fenster Neubau ≤ 1,3 W/(m²·K), Sanierung Bestand 1,3.' },
      { code: 'DIN EN 1627', titel: 'Einbruchhemmung RC-Klassen', desc: 'RC1N–RC6 Widerstandsklassen, gefordert RC2/RC3 oft im EG.' },
    ],
    typPositionen: [
      {
        kategorie: 'Kunststoff-Fenster',
        beispiele: [
          { text: 'Kunststoff-Fenster 120×140, weiß, U=0,8, 2-flügelig', einheit: 'St' },
          { text: 'Kunststoff-Fenster Dreh-Kipp, 100×120, mit Rolladen', einheit: 'St' },
          { text: 'Festverglasung Kunststoff, 150×220, Sicherheitsglas', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Holz- + Alu-Fenster',
        beispiele: [
          { text: 'Holzfenster Lärche, gestrichen, 100×140, 2-flügelig', einheit: 'St' },
          { text: 'Alu-Fenster, thermisch getrennt, 120×150, RC-2', einheit: 'St' },
          { text: 'Holz-Alu-Fenster, Innen Eiche, Außen Alu, 100×140', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Türen + Fassade',
        beispiele: [
          { text: 'Haustür Alu, U=1,1, RC-3, 100×210, Sicherheitsschloss', einheit: 'St' },
          { text: 'Brandschutztür T30 RS, 90×210, mit Selbstschließer', einheit: 'St' },
          { text: 'Pfosten-Riegel-Fassade Alu, U=0,8, pro m²', einheit: 'm²' },
          { text: 'Außentür Kunststoff, weiß, einflügelig, 100×210', einheit: 'St' },
        ],
      },
      {
        kategorie: 'Montage + Sonderpositionen',
        beispiele: [
          { text: 'RAL-Montage 3-Ebenen, Innendichtung dampfbremsend', einheit: 'm' },
          { text: 'Rolladenkasten Aufsatz, mit Rolladen + Motor', einheit: 'St' },
          { text: 'Insektenschutz-Rollo, integriert in Rahmen', einheit: 'St' },
          { text: 'Sonnenschutz außenliegend, Raffstore Alu', einheit: 'St' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'Hersteller-Detection Veka/Schüco/Kömmerling',
        desc: 'Bei „Kunststoff-Fenster" ohne Profil-Vorgabe Auswahl frei (Veka/Schüco/Kömmerling/Gealan etc.). Bei Vorgabe wird Profil-Wert, Kammerzahl, U-Wert verglichen — Mehrpreis Schüco vs. Standard-Profil 15–25 %.',
      },
      {
        titel: 'U-Wert + g-Wert energetisch ausbalancieren',
        desc: 'Niedriger U-Wert (0,7–0,9) reduziert Heizenergie, niedriger g-Wert (0,3–0,5) reduziert sommerlichen Wärmegewinn. Süd-Fenster: hoher g-Wert erwünscht (passive Solar), West/Ost: g-Wert mittel, Nord: niedrig egal. Pauschal-Spezifikation oft sub-optimal.',
      },
      {
        titel: 'RAL-Montage 3-Ebenen-Prinzip einhalten',
        desc: 'Innendichtung dampfbremsend (sd ≥ 1.500), Mitteldämmung (PU-Schaum), Außendichtung diffusionsoffen (sd ≤ 1). Standard-Montage „mit Bauschaum" ist ungenügend — bauphysikalisch problematisch.',
      },
      {
        titel: 'RC-Klassen im EG-Bereich beachten',
        desc: 'Polizeiliche Empfehlung: EG-Fenster + Türen mind. RC-2 (Schraubendreher-/Zangenangriff-resistent). RC-2 = ca. +180 €/m² zur Standard-Ausführung. Bei privaten Bauherren oft nicht gefordert, dann optional.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Fenster sind oft Pauschal-Positionen (Material 60–80 %, Lohn 20–40 %) — gut zerlegbar.',
      },
      {
        slug: 'buergschaft',
        name: 'Bürgschafts-Rechner',
        warum: 'Fenster haben 5 Jahre Gewährleistung — Avalprovision signifikant über die Laufzeit.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'Fenster-Vergaben oft als reine Hersteller-Anfrage (kein eigenes LV) — Excel-Export für Vergleichs-Angebote.',
      },
    ],
    deliverables: [
      { titel: 'Fabrikat-2-fach-Prüfung', desc: 'Veka / Schüco / Kömmerling / Gealan etc. — Datenblatt gegen LV-Anforderung verglichen.' },
      { titel: 'U-/g-/Schalldämmwert-Tabelle', desc: 'Pro Fenster-Position physikalische Werte ausgewiesen — GEG-Konformität geprüft.' },
      { titel: 'RAL-Montage-Konformität', desc: '3-Ebenen-Prinzip dokumentiert, Dichtprodukte spezifiziert.' },
      { titel: 'Hersteller-Vergleichs-Angebot', desc: '2–3 Hersteller (z. B. Veka, Schüco, Kömmerling) — Preisspanne dokumentiert.' },
    ],
    faq: [
      {
        q: 'Welche Fenster-Hersteller sind in Ihrem Anfrage-Pool?',
        a: 'Standard-Pool: Veka, Schüco, Kömmerling, Gealan, Internorm, Kneer-Süd, Schwesig (regional Saarland/RLP/Lothringen). Für Holz- und Alu-Fenster zusätzlich: Gaulhofer, Gutmann, Sehring. Sonderlösungen auf Anfrage.',
      },
      {
        q: 'Wie kalkulieren Sie Sondermaße + Sonderformen?',
        a: 'Standard-Fenstermaße bis 150×150 sind 100 % Preis-Basis. Sondermaße + 15–25 % Aufschlag, Sonderformen (Rundbogen, Schräge) + 30–50 %. Bei komplexen Geometrien Hersteller-Anfrage vor Bepreisung.',
      },
      {
        q: 'Berücksichtigen Sie KfW-Förderung?',
        a: 'Ja. KfW-Effizienzhaus 40/55/70 oder Einzelmaßnahmen-Förderung (Fenster + Rollladen + Sonnenschutz) — wir markieren förderfähige Positionen und liefern auf Wunsch eine separate Förder-Kalkulation.',
      },
      {
        q: 'Was kostet eine Fenster-Kalkulation für ein typisches Einfamilienhaus?',
        a: '20–40 Fensterpositionen (EFH): 200–300 € Festpreis, 24–48 h. Mehrfamilienhaus 60–120 Fenster: 400–600 €, 48–72 h. Inkl. 2 Hersteller-Vergleichs-Angebote.',
      },
    ],
  },

  schadstoff: {
    heroSubtitle:
      'Asbest, KMF, HBCD, PCB, PAK — TRGS-konforme Sanierungs-Kalkulation. Schwarz-Weiß-Schleuse, Personenschutzausrüstung, AVV-Entsorgung als Sondermüll.',
    einordnung:
      'Schadstoffsanierung ist die anspruchsvollste Disziplin im Baugewerbe — falsch ausgeführt drohen Gesundheitsgefahren und Haftungsrisiken. Maßgeblich sind die Technischen Regeln für Gefahrstoffe (TRGS 519 Asbest, 521 KMF, 524 Schadstoff allgemein) sowie die GefStoffV. Sachkundenachweis nach TRGS 519 Anlage 4 ist Pflicht.',
    normen: [
      { code: 'TRGS 519', titel: 'Asbest — Abbruch-/Sanierungsarbeiten', desc: 'Sachkundepflicht, Schwarz-Weiß-Schleuse, PSA Kat. 3, Freimessung.' },
      { code: 'TRGS 521', titel: 'KMF (Künstl. Mineralfasern)', desc: 'Alte Mineralwolle vor 2000 — krebsverdächtig, Demontage als Asbest-ähnlich.' },
      { code: 'TRGS 524', titel: 'Schadstoff-Sanierung allgemein', desc: 'Übergreifende Regelung, Gefahrstoffinventur, Schutzmaßnahmen.' },
      { code: 'GefStoffV', titel: 'Gefahrstoffverordnung', desc: 'Gesetzliche Grundlage für Umgang mit Gefahrstoffen am Arbeitsplatz.' },
      { code: 'AGS-BK 1101', titel: 'Asbest in vorhandenen Bauten', desc: 'Bekanntmachung des AGS, Sanierungsdringlichkeit-Klassifizierung.' },
      { code: 'POPAbfV', titel: 'POP-Abfälle (HBCD u. a.)', desc: 'Persistent organic pollutants — Polystyrol-Dämmung vor 2015.' },
    ],
    typPositionen: [
      {
        kategorie: 'Asbest-Sanierung',
        beispiele: [
          { text: 'Asbest-Plattenrückbau Fassade, TRGS 519, mit PSA Kat. 3', einheit: 'm²' },
          { text: 'Asbest-Bodenbelag Cushion-Vinyl, BT/SBT-Verfahren', einheit: 'm²' },
          { text: 'Asbest-Wellplatten Dach, Demontage mit Sicherheitsnetz', einheit: 'm²' },
          { text: 'Asbest-Rohrisolierung Spritzasbest entfernen, BST', einheit: 'm' },
        ],
      },
      {
        kategorie: 'KMF / Mineralfaser',
        beispiele: [
          { text: 'KMF-Demontage Dämmplatte vor 2000, TRGS 521', einheit: 'm²' },
          { text: 'KMF-Rohrschalen entfernen, im Heizungskeller', einheit: 'm' },
          { text: 'KMF-Entsorgung als verfestigter Sondermüll', einheit: 't' },
        ],
      },
      {
        kategorie: 'HBCD / POP-Stoffe',
        beispiele: [
          { text: 'HBCD-Polystyrol-Dämmung entfernen, vor 2015', einheit: 'm³' },
          { text: 'HBCD-Entsorgung als POP-Abfall, Hochtemperatur-Verbrennung', einheit: 't' },
        ],
      },
      {
        kategorie: 'PCB + PAK',
        beispiele: [
          { text: 'PCB-Fugen Fassade ausstemmen, mit Absaugung', einheit: 'm' },
          { text: 'PCB-Anstrich entfernen, Strahlen + Beschichtung neu', einheit: 'm²' },
          { text: 'PAK-Klebstoff unter Parkett entfernen, Schälen', einheit: 'm²' },
          { text: 'PAK-Estrich Pech-haltig, Aufbruch + Sondermüll', einheit: 'm²' },
        ],
      },
    ],
    fallstricke: [
      {
        titel: 'TRGS 519 Sachkundenachweis zwingend',
        desc: 'Asbest-Sanierungen dürfen nur Firmen mit Sachkundenachweis nach Anlage 4 (Bauleitung) und Anlage 4A (Mitarbeiter) ausführen. Bei „normalem" Bauunternehmen ohne TRGS-519-Zertifikat = Ordnungswidrigkeit. Wir kalkulieren entweder mit Subunternehmer-Aufpreis oder warnen.',
      },
      {
        titel: 'Schwarz-Weiß-Schleuse + Freimessung einplanen',
        desc: 'Bei Asbest-Sanierung Innenbereich: Schwarz-Weiß-Schleuse ca. 2.500–5.000 €, Freimessung nach VDI 3492 ca. 800–2.000 €. Bei „normalem" Asbest-Rückbau (Festgebundene Platten außen) keine Schleuse, aber PSA Kat. 3.',
      },
      {
        titel: 'Entsorgung über zertifizierte Anlagen',
        desc: 'Asbest-Müll nur in Deponien DK-II/III mit Sonderzulassung. KMF in geschlossenen Sammelfahrzeugen, separate Deponieabschnitte. AVV-Schlüssel: Asbest 170605*, KMF 170603*, HBCD 170604*.',
      },
      {
        titel: 'Sanierungsdringlichkeit nach AGS-BK 1101',
        desc: 'Klassifizierung I (akute Gefahr, sofortige Sanierung), II (mittel), III (gering). Bei Klasse I darf nicht „später" saniert werden — Bestandsgebäude mit Klasse I = Sanierungspflicht innerhalb der Restnutzungszeit.',
      },
    ],
    toolHighlights: [
      {
        slug: 'kalkulator',
        name: 'Position-Kalkulator',
        warum: 'Schadstoff-Sanierung lohn-intensiv (PSA-Aufwand, Schleuse) — eigene Kalkulations-Logik vs. normaler Abbruch.',
      },
      {
        slug: 'frist-rechner',
        name: 'Submissions-Frist-Rechner',
        warum: 'Schadstoff-Sanierungen brauchen Vorlaufzeit (TRGS-519-Anzeige Behörde min. 14 Tage) — Terminplan kritisch.',
      },
      {
        slug: 'gaeb-konverter',
        name: 'GAEB-Konverter',
        warum: 'Schadstoff-LVs als reines Sanierungs-LV oder als Teil-Los in Generalsanierung — beides parsebar.',
      },
    ],
    deliverables: [
      { titel: 'TRGS-konforme Schutzmaßnahmen', desc: 'PSA Kat. 3, Schwarz-Weiß-Schleuse, Unterdruck-Halten, Freimessung — alles kalkulationsrelevant.' },
      { titel: 'AVV-Sondermüll-Klassifizierung', desc: 'Asbest 170605*, KMF 170603*, HBCD 170604* — Begleitscheine inkl.' },
      { titel: 'Behörden-Anzeige TRGS 519', desc: 'Vor Baubeginn Anzeige beim zuständigen Gewerbeaufsichtsamt — Aufwand mitkalkuliert.' },
      { titel: 'Subunternehmer-Recherche', desc: 'Wenn Bauunternehmer selbst keinen Sachkundenachweis hat — wir vermitteln Spezial-Sanierer.' },
    ],
    faq: [
      {
        q: 'Wir haben keinen TRGS-519-Sachkundenachweis. Können Sie trotzdem kalkulieren?',
        a: 'Ja. Wir kalkulieren das Sanierungs-LV vollständig — die Ausführung übernimmt dann ein zertifizierter Subunternehmer (NU). Wir schlagen 2–3 regionale NU-Optionen vor und holen Vorabangebote ein. Sanierungs-NU rechnen typischerweise 80–120 €/m² Asbest, 30–50 €/m² KMF.',
      },
      {
        q: 'Wie lange dauert eine Schadstoff-Sanierungs-Kalkulation?',
        a: 'Reine Sanierung (z. B. nur Asbest-Bodenbelag): 48–72 h Festpreis 300–500 €. Komplex-Sanierung (Asbest + KMF + PCB): 5–7 Werktage, Pauschalpreis 600–1.200 € — wegen NU-Anfragen + Behörden-Recherche.',
      },
      {
        q: 'Übernehmen Sie auch die Schadstoffkataster-Erstellung?',
        a: 'Nein — das ist Gutachterleistung nach VDI 3492 und braucht Ortstermin + Laboruntersuchung. Wir vermitteln an zertifizierte Schadstoffgutachter (1.500–4.500 € je Gebäude) und kalkulieren auf Basis des fertigen Katasters.',
      },
      {
        q: 'Bepreisen Sie auch Spritzasbest + Asbest-Innenbeschichtung?',
        a: 'Ja, mit besonderem Hinweis. Spritzasbest und festgebundene Asbest-Beschichtungen brauchen BST-Verfahren (Schwarz-Weiß-Schleuse, vollständige Einhausung) — Sanierungskosten 200–400 €/m². Klare Trennung gegen einfache Demontage festgebundener Platten (60–120 €/m²).',
      },
    ],
  },
};
