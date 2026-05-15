import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type BlogTopic = 'Pain' | 'VOB/A' | 'GAEB' | 'Kalkulation' | 'Praxis';

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  topic: BlogTopic;
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** Estimated reading time in minutes. */
  minutes: number;
  /** Author name (Inhaber). */
  author: string;
  /** Full article content as JSX. */
  content: ReactNode;
};

// ─── Shared content components ───────────────────────────────────────────────

function Para({ children }: { children: ReactNode }) {
  return <p className="text-gray-700 leading-relaxed mb-5">{children}</p>;
}

function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mt-12 mb-5 scroll-mt-24">
      {children}
    </h2>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{children}</h3>;
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 text-gray-700 leading-relaxed mb-5 space-y-2 marker:text-primary-500">{children}</ul>;
}

function Ol({ children }: { children: ReactNode }) {
  return <ol className="list-decimal pl-5 text-gray-700 leading-relaxed mb-5 space-y-2 marker:text-primary-700 marker:font-bold">{children}</ol>;
}

function Callout({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'tip'; children: ReactNode }) {
  const cls = {
    info: 'bg-primary-50 border-primary-200 text-primary-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    tip: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  }[kind];
  return (
    <aside className={`border rounded-lg p-5 my-6 ${cls}`}>
      <div className="text-sm leading-relaxed [&_strong]:font-bold">{children}</div>
    </aside>
  );
}

function ToolCta({ to, label }: { to: string; label: string }) {
  return (
    <p className="my-6 -mx-1">
      <Link to={to} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm font-semibold hover:bg-primary-100 transition-colors">
        <span aria-hidden>🔧</span> {label}
      </Link>
    </p>
  );
}

// ─── Posts ──────────────────────────────────────────────────────────────────

const POSTS: BlogPost[] = [
  {
    slug: 'wenn-der-eigene-kalkulator-fehlt',
    title: 'Wenn der eigene Kalkulator fehlt — was jetzt?',
    excerpt: 'Submissionstermin in drei Tagen, der Kalkulator ist krank, gekündigt oder überlastet — und das LV liegt seit vier Tagen unbearbeitet rum. Drei Optionen, die Sie haben, mit Kosten und Risiken pro Option.',
    topic: 'Pain',
    date: '2026-05-12',
    minutes: 7,
    author: 'Alaatdin Coksari',
    content: (
      <>
        <Para>
          Der Anruf kommt typischerweise donnerstags gegen 16 Uhr. „Herr Coksari, ich habe ein
          Problem. Submission ist am Dienstag, mein Kalkulator hat sich heute krankgemeldet —
          und das war nicht der erste Tag." Wir kennen die Situation. Diese Woche allein hatten
          wir vier solche Anrufe.
        </Para>

        <Para>
          Ein Kalkulator-Engpass ist im deutschen Mittelstand nicht die Ausnahme, sondern
          inzwischen die Regel. Der DIHK-Fachkräftereport 2025/26 nennt 59 % der Bauunternehmen
          mit Stellenbesetzungsproblemen, 391.000 fehlende Fachkräfte. In dieser Lücke entstehen
          regelmäßig Submissions-Notlagen. Was sind die realistischen Optionen, wenn Sie morgens
          ins Büro kommen und der Kalkulator fehlt?
        </Para>

        <H2 id="szenario">Drei Szenarien, eine Konsequenz</H2>

        <Para>
          Die Ursache spielt für die kurzfristige Lösung keine Rolle — der Kalender wartet
          nicht. Drei typische Auslöser, die wir 2025/26 fast wöchentlich sehen:
        </Para>

        <Ul>
          <li><strong>Krankheit / Ausfall:</strong> Klassisch — Magen-Darm, Bandscheibe, Burnout. Erstreckt sich oft über 2–6 Wochen, gerade in der Hochsaison.</li>
          <li><strong>Kündigung / Wechsel:</strong> Der Kalkulator geht zur Konkurrenz oder in Frührente. Kündigungsfrist 1–3 Monate, in der er innerlich schon raus ist.</li>
          <li><strong>Überlastung:</strong> Kein Ausfall, aber 14 LVs gleichzeitig auf dem Tisch. Was nicht durchgerechnet wird, wird einfach nicht abgegeben.</li>
        </Ul>

        <Para>
          Konsequenz in allen drei Fällen identisch: <strong>Submissions werden verpasst</strong>,
          und damit der Kern Ihres Geschäfts. Eine durchschnittliche mittelständische Bau-Firma
          verliert pro entgangener Submission im Tiefbau zwischen 80 k € und 350 k € Auftragsvolumen
          — mehr als ein Kalkulator-Jahresgehalt.
        </Para>

        <H2 id="optionen">Drei Optionen — mit echten Zahlen</H2>

        <H3>Option 1: Externer Festangestellter (Personalvermittlung)</H3>

        <Para>
          Schnell jemanden über eine Personalvermittlung holen. Klingt logisch, scheitert in der
          Praxis an drei Punkten: erstens dauert die Suche 6–12 Wochen, zweitens sind erfahrene
          Kalkulatoren extrem rar (1–2 Bewerbungen pro Stelle, oft keine), drittens bezahlt
          die Personalvermittlung 25–30 % des Jahresgehalts als Provision — bei einem
          Bruttogehalt von 75 k € sind das 19–22 k € einmalig, plus laufende Lohnkosten.
        </Para>

        <Para>
          <strong>Sinnvoll wenn:</strong> Sie ohnehin dauerhaft eine zweite Kalkulator-Stelle
          schaffen wollten und das Timing zufällig passt. <strong>Nicht sinnvoll wenn:</strong>{' '}
          Sie nur die nächsten 6–8 Wochen überbrücken müssen.
        </Para>

        <H3>Option 2: Freier Kalkulator (Tagessatz)</H3>

        <Para>
          Ein freiberuflicher Bau-Kalkulator kostet typisch 750–1.200 €/Tag in 2026. Verfügbarkeit
          ist das Hauptproblem: die guten sind monatelang ausgebucht, die schnell verfügbaren
          sind oft ohne Branchenspezialisierung. Hinzu kommt: er sitzt nicht in Ihrem Büro,
          kennt Ihre Mittellöhne nicht, Ihre Lieferantenkonditionen nicht, Ihre Personal-Praxis
          nicht. Das erste LV wird unbrauchbar, beim dritten ist es vielleicht passabel.
        </Para>

        <Para>
          <strong>Sinnvoll wenn:</strong> Sie eine konkrete Person empfohlen bekommen, die
          schon einmal für Sie gearbeitet hat. <strong>Nicht sinnvoll wenn:</strong> Sie einen
          Fremden ad-hoc finden müssen — das Risiko einer fehlerhaften Kalkulation steigt
          dramatisch.
        </Para>

        <H3>Option 3: Outsourced Kalkulationsbüro (KALKU-Modell)</H3>

        <Para>
          Hier sind wir naturgemäß nicht objektiv — aber die Zahlen sind simpel: 200–600 € pro
          LV als Festpreis (PAKET „Einzelbeauftragung"), oder 3.000–5.000 € im Monat
          (Monatspakete) für unbegrenzt viele LVs plus wöchentliche Ausschreibungsrecherche.
          Im Vergleich: ein eigener Kalkulator (Vollkosten inkl. Sozialversicherung,
          Berufsgenossenschaft, 13. ME, Urlaub, Lohnfortzahlung) kostet rund 95–110 k € pro Jahr.
        </Para>

        <Callout kind="tip">
          <strong>Rechenbeispiel</strong>: Ein Tiefbau-Mittelständler aus dem Saarland mit
          14 Submissionen pro Jahr (Branchenschnitt) zahlt im KALKU-Monatspaket M etwa 36 k €
          pro Jahr — gegenüber 95 k € interner Kalkulator-Vollkosten ein Delta von 59 k €. Bei
          Erfolgsquote 28 % und ⌀ Auftragsvolumen 220 k € sind das 4 Zuschläge × 220 k € =
          880 k € Umsatz pro Jahr aus Submissionen.
        </Callout>

        <H2 id="entscheidung">Wie Sie heute entscheiden, was Sie morgen brauchen</H2>

        <Para>
          Drei einfache Fragen entscheiden, welche Option für Sie passt:
        </Para>

        <Ol>
          <li>
            <strong>Wie viele Submissionen pro Jahr?</strong> Unter 6 → Einzelbeauftragung
            günstiger als Eigenpersonal. Über 12 → Monatspaket M. Über 25 → Monatspaket L.
          </li>
          <li>
            <strong>Wollen Sie das Wissen langfristig im Haus haben?</strong> Ja → eigener
            Kalkulator (mit Geduld). Nein → outsourced.
          </li>
          <li>
            <strong>Wie schnell brauchen Sie eine Lösung?</strong> Diese Woche → outsourced
            ist die einzige realistische Option. In 6 Monaten → eigener Kalkulator.
          </li>
        </Ol>

        <ToolCta to="/tools/mittellohn/" label="Mittellohn-Rechner: was kostet ein Kalkulator wirklich?" />

        <H2 id="kalku">Was wir konkret machen — kein Marketing</H2>

        <Para>
          Wenn der Anruf am Donnerstag um 16 Uhr kommt: Vorab-Sichtung des LVs noch am Donnerstag
          Abend, Kostenrahmen zurück bis Freitag Mittag, fertige Kalkulation bis Montag früh,
          Einreichung Dienstag fristgerecht. Nichts davon ist magisch — nur strukturierte
          Aufgabenteilung in vier Teams (Kalkulation, Einkauf, Vergabe, Recherche) plus
          Wochenend-Rufbereitschaft.
        </Para>

        <Para>
          Wenn Sie gerade in einer solchen Situation sind: rufen Sie an. <a href="tel:+496814109643" className="text-primary-700 font-semibold hover:underline">+49 681 41096430</a>. Schneller als das Formular auszufüllen.
        </Para>
      </>
    ),
  },

  {
    slug: 'efb-221-222-223-erklaert',
    title: 'EFB-Preise 221, 222, 223 — was steht eigentlich drin?',
    excerpt: 'Die drei Formblätter, die jeder VOB-Bieter ausfüllen muss. Was sie aussagen, wo häufig Fehler passieren, und warum sie wichtiger sind als die meisten denken — Ausschluss vom Verfahren droht.',
    topic: 'VOB/A',
    date: '2026-05-08',
    minutes: 9,
    author: 'Alaatdin Coksari',
    content: (
      <>
        <Para>
          Wer öffentliche Bauleistungen anbietet, kennt die Formblätter 221, 222 und 223 aus
          dem „Einheitlichen Formularsatz Bauleistungen" — kurz EFB-Preis. Wer sie nicht
          kennt, lernt sie spätestens beim ersten Vergabeverfahren kennen. Wer sie nicht
          richtig ausfüllt, wird ausgeschlossen.
        </Para>

        <Para>
          Dieser Artikel erklärt die drei Formblätter, was rein gehört, wo häufige Fehler
          passieren — und welche Konsequenzen drohen, wenn sie nicht plausibel sind.
        </Para>

        <H2 id="kontext">Wann sind EFB-Preise Pflicht?</H2>

        <Para>
          EFB-Preise sind bei öffentlichen Vergabeverfahren nach VOB/A Teil der Angebotsunterlagen,
          sobald der Auftraggeber sie konkret verlangt. Das ist bei den meisten Bundes-, Landes-
          und Kommunal-Ausschreibungen der Standardfall — die Formblätter werden Ihnen mit der
          Ausschreibung bekannt gemacht und müssen ausgefüllt mit dem Angebot abgegeben werden.
          Fehlt eines der angeforderten Formblätter oder ist es offensichtlich unplausibel, kann
          das Angebot vom Verfahren ausgeschlossen werden — § 16 VOB/A regelt das eindeutig.
        </Para>

        <Callout kind="warn">
          <strong>Wichtig:</strong> EFB-Formblätter sind keine reine Formalie. Wenn die
          Vergabestelle bei der Aufklärung gemäß § 15 VOB/A nachfragt und Ihre Aufgliederung
          nicht zur Hauptkalkulation passt, gibt es Probleme. „Auf Nachfrage richten" ist
          hochrisikoreich — viele Vergabestellen sehen darin einen Hinweis auf nachträgliche
          Anpassung.
        </Callout>

        <H2 id="221">Formblatt 221 — Preisermittlung bei Kalkulation mit vorbestimmten Zuschlägen</H2>

        <Para>
          Formblatt 221 ist das wichtigste der drei. Es zeigt, wie Sie aus den Einzelkosten
          der Teilleistungen über die Zuschläge für Wagnis und Gewinn (W&G), Allgemeine
          Geschäftskosten (AGK) und Baustellengemeinkosten (BGK) zum Angebotspreis kommen.
        </Para>

        <H3>Was steht drin</H3>

        <Ul>
          <li><strong>Mittellohn ASL</strong> — der durchschnittliche Stundensatz inkl. Lohnnebenkosten und Zulagen</li>
          <li><strong>Stoffkosten und Stoffzuschläge</strong> — Material plus AGK/BGK-Anteile</li>
          <li><strong>Geräte- und sonstige Kosten</strong> — analog</li>
          <li><strong>AGK in % auf Lohn / Stoff / Gerät</strong> — typisch 8–14 %, je nach Betriebsgröße</li>
          <li><strong>Wagnis und Gewinn in %</strong> — typisch 4–8 %</li>
          <li><strong>Umlage der Baustellengemeinkosten</strong> (Bauleitung, Container, Strom, Wasser etc.)</li>
        </Ul>

        <H3>Häufige Fehler</H3>

        <Ul>
          <li>Mittellohn zu niedrig angesetzt — typisch 35–40 €/h, real (mit ASL) bei 45–55 €/h</li>
          <li>AGK auf 5 % gesetzt, weil „die Konkurrenz das auch macht" — bei einem 12-MA-Betrieb sind 5 % AGK strukturell unmöglich, das Finanzamt prüft Plausibilität</li>
          <li>Wagnis und Gewinn 0 % oder negativ — formal zulässig, aber bei der Aufklärung nach § 15 VOB/A schwer zu erklären</li>
        </Ul>

        <ToolCta to="/tools/mittellohn/" label="Mittellohn-Rechner: AS und ASL korrekt berechnen" />

        <H2 id="222">Formblatt 222 — Aufgliederung der Einheitspreise</H2>

        <Para>
          Formblatt 222 wird oft nur für ausgewählte Schwerpunkt-Positionen verlangt. Es
          schlüsselt einzelne Einheitspreise auf in Lohn, Stoff, Gerät und sonstige Kosten —
          plus die jeweiligen Zuschläge.
        </Para>

        <H3>Wofür ist das gut?</H3>

        <Para>
          Die Vergabestelle prüft hiermit die Plausibilität. Wenn Sie bei Position
          „01.02.20 Schachtdeckel BGW Klasse D 400" einen EP von 385 € angeben, will sie
          sehen: 0,8 h Lohn × 48 € Mittellohn = 38 €, Material 280 €, Gerät 25 €, Sonstiges
          12 €, plus Zuschläge — Summe muss zum EP führen.
        </Para>

        <Callout kind="warn">
          <strong>Risiko:</strong> Wenn Ihre Aufgliederung nicht zum eingereichten EP führt
          (Differenz &gt; 1–2 %), wird das Angebot als „nicht aufgegliedert" gewertet — und kann
          ausgeschlossen werden. Das ist die häufigste Ursache für Ausschluss aus formalen
          Gründen, die wir im KALKU-Vergabeteam täglich sehen.
        </Callout>

        <H2 id="223">Formblatt 223 — Aufgliederung der Einheitspreise (Stoff/Lohn/Gerät getrennt)</H2>

        <Para>
          Formblatt 223 ist die Detailvariante von 222. Statt die Komponenten gewichtet
          aufzulisten, werden sie streng getrennt — pro Position, pro Komponente. Es wird
          typischerweise bei größeren Vergaben verlangt oder wenn der Auftraggeber später
          Nachträge auf Mehr-/Minder-Mengen plausibilisieren will.
        </Para>

        <H3>Praxis-Tipp</H3>

        <Para>
          Da 223 ein hohes Risiko für Inkonsistenzen birgt (jede Position einzeln aufgegliedert,
          und alle müssen zum EP zurückführen), arbeiten wir bei KALKU mit einer integrierten
          Kalkulationssoftware, die 221, 222 und 223 automatisch aus der zugrundeliegenden
          Stundenwert-Kalkulation ableitet. Manuelles Befüllen in Excel ist möglich, aber
          fehleranfällig.
        </Para>

        <H2 id="urkalkulation">Urkalkulation — der Kontext</H2>

        <Para>
          Zusätzlich zu 221, 222, 223 verlangt die Vergabestelle bei größeren Aufträgen
          regelmäßig die <strong>Urkalkulation</strong> in versiegelter Form — alle internen
          Kalkulationsunterlagen, die zum Angebot geführt haben. Diese werden bei der
          Vergabestelle hinterlegt und im Falle von Nachträgen oder Streit über Mehr-/Minder-Mengen
          herangezogen.
        </Para>

        <H2 id="zusammenfassung">Drei Praxis-Regeln</H2>

        <Ol>
          <li><strong>Konsistenz vor Schönheit.</strong> Alle drei Formblätter müssen zur Hauptkalkulation passen — und untereinander konsistent sein.</li>
          <li><strong>Realistische Zuschläge.</strong> Lieber 11 % AGK plausibel begründbar als 5 % unrealistisch — Vergabestellen prüfen.</li>
          <li><strong>Vier-Augen-Prinzip vor Einreichung.</strong> Eine zweite Person rechnet die Aufgliederungen rückwärts. Findet Inkonsistenzen, die das Auge des Erstellers nicht mehr sieht.</li>
        </Ol>

        <Para>
          Wir füllen für unsere Mandanten die Formblätter automatisch aus — sie sind in jeder
          KALKU-Lieferung Teil des Pakets, ohne Aufpreis. Wer einmal eine Submission durch
          inkonsistente EFB-Preise verloren hat, weiß warum.
        </Para>
      </>
    ),
  },

  {
    slug: 'gaeb-x83-vs-x84',
    title: 'GAEB X83 vs. X84 — was ist der Unterschied?',
    excerpt: 'Bieter bekommen X83, geben X84 zurück. Was technisch dahintersteckt, welche Tools das beherrschen, und warum manche LVs trotzdem als „X81 als ZIP" daherkommen.',
    topic: 'GAEB',
    date: '2026-05-05',
    minutes: 6,
    author: 'Alaatdin Coksari',
    content: (
      <>
        <Para>
          Wer im deutschen Bauwesen mit öffentlichen Vergaben zu tun hat, kommt am
          GAEB-Datenformat nicht vorbei. „GAEB" steht für „Gemeinsamer Ausschuss Elektronik
          im Bauwesen" — ein Standard-Format zur elektronischen Übergabe von
          Leistungsverzeichnissen zwischen Auftraggeber, Bieter, Auftragnehmer und
          Software-Tools.
        </Para>

        <Para>
          In der Praxis werden die meisten Datentypen GAEB DA XML 3.x verwendet. Die
          häufigsten Endungen sind X81, X83, X84, X85, X86 und X89 — sie unterscheiden sich
          in Inhalt und Zweck.
        </Para>

        <H2 id="phasen">Die fünf Phasen einer GAEB-Vergabe</H2>

        <Ol>
          <li><strong>X81 — LV-Anfrage:</strong> die ursprüngliche Leistungsbeschreibung mit Mengen, ohne Preise. Wird selten direkt ausgeschrieben — meist intern weiterverarbeitet.</li>
          <li><strong>X83 — LV-Daten Auftraggeber:</strong> die formale Ausschreibung mit allen Positionen + Mengen, die an Bieter rausgeht. <em>Das ist die Datei, die Sie als Bieter erhalten.</em></li>
          <li><strong>X84 — Angebot des Bieters:</strong> die zurückgehende Datei mit Ihren ausgefüllten Einheitspreisen. <em>Das ist die Datei, die Sie einreichen.</em></li>
          <li><strong>X85 — Nebenangebot:</strong> alternative Lösung des Bieters, technisch oder kommerziell.</li>
          <li><strong>X86 — Auftrag:</strong> der Vergabe-Beschluss vom Auftraggeber an den Zuschlagsempfänger.</li>
        </Ol>

        <Para>
          Ergänzend gibt es <strong>X89 — Spezifizierte Aufmaße</strong>, die in der Bauphase
          für Abrechnungs-Aufmaße genutzt werden. ASCII-Pendants (D81, D83, D84) sind die
          „GAEB 90 / 2000"-Vorgängerformate — werden noch häufig genutzt, langsam aber durch
          DA XML 3.x verdrängt.
        </Para>

        <H2 id="x83">X83 — was Sie als Bieter tatsächlich bekommen</H2>

        <Para>
          Eine X83-Datei enthält:
        </Para>

        <Ul>
          <li>Projekt-Header mit Auftraggeber, Maßnahmenbezeichnung, Vergabestelle</li>
          <li>Hierarchische Gliederung: Lose, Titel, Untertitel, Positionen</li>
          <li>Pro Position: Ordnungszahl (OZ), Kurztext, Langtext, Einheit, Menge</li>
          <li>Ggf. Hinweise auf Bedarfspositionen, Eventualpositionen, Zulagepositionen</li>
          <li>Vorgesehene Stoff-/Geräte-Hinweise oder Hersteller-Vorgaben</li>
        </Ul>

        <Para>
          Was eine X83-Datei <strong>nicht</strong> enthält: Preise. Die kommen erst rein,
          wenn Sie sie zurückgeben — als X84.
        </Para>

        <H2 id="x84">X84 — was Sie zurückgeben</H2>

        <Para>
          Eine X84-Datei ist im Prinzip die X83-Struktur, aber pro Position ergänzt um:
        </Para>

        <Ul>
          <li><strong>UP</strong> (Unit Price / Einheitspreis) — Ihr EP für die Position</li>
          <li><strong>IT</strong> (Item Total / Gesamtpreis) — UP × Menge, automatisch berechnet</li>
          <li>Optional: Zusatztexte (Hersteller-Angabe, Alternativ-Vorschlag)</li>
          <li>Bieter-Identifikation (Firmenname, Vertretungsberechtigter, Datum)</li>
        </Ul>

        <Callout kind="info">
          <strong>Wichtig:</strong> Manchmal werden X84 und X85 (Nebenangebot) zusammen
          eingereicht. Wenn Sie eine technische oder kommerzielle Alternative anbieten, gehört
          die in eine separate X85, nicht in die X84. Vergabestellen weisen das sonst zurück.
        </Callout>

        <H2 id="ascii">ASCII-Formate (D81, D83, D84) — der Vorgänger</H2>

        <Para>
          GAEB 90 und GAEB 2000 sind textbasierte Formate. Eine D83-Datei ist eine reine
          ASCII-Datei mit zeilenbasierter Struktur (jede Zeile beginnt mit einer Code-Nummer
          wie 02. für Projektname, 21. für Position, 23. für Mengen). Sie sind kleiner als
          XML, aber technisch fragiler — Encoding-Probleme (Latin-1 vs. UTF-8) sind
          dauerthemen.
        </Para>

        <Para>
          Wir empfehlen: wenn der Auftraggeber Ihnen die Wahl lässt, nehmen Sie GAEB DA XML
          3.x (X-Endungen). Wenn er nur ASCII anbietet, kein Problem — beide funktionieren.
        </Para>

        <ToolCta to="/tools/gaeb-konverter/" label="GAEB-Konverter: alle Formate im Browser öffnen" />

        <H2 id="praxis">Praktische Tipps</H2>

        <Ul>
          <li><strong>X83 erst kontrollieren, bevor Sie kalkulieren:</strong> manchmal sind Mengen offensichtlich falsch (z.B. 1 m² statt 100 m²). Bieterfrage stellen lieber als Vermutung kalkulieren.</li>
          <li><strong>Excel-Export sinnvoll:</strong> die X83 in Excel überführen, parallel kalkulieren, dann Ergebnisse zurückspielen — viele Software-Tools machen das automatisch.</li>
          <li><strong>X84 vor Einreichung gegenprüfen:</strong> öffnen Sie die exportierte X84 noch einmal in einem unabhängigen Tool. Inkonsistenzen zwischen UP und IT sind Ausschluss-Grund.</li>
          <li><strong>Originalformat behalten:</strong> niemals einfach die ursprüngliche X83 modifiziert zurückschicken. Format und OZ-Struktur müssen exakt erhalten bleiben.</li>
        </Ul>

        <H2 id="zusatz">Sonderfall: „X81 als ZIP" und andere Kuriositäten</H2>

        <Para>
          Manche Vergabestellen schicken statt einer reinen X83 ein ZIP-Archiv mit X81 + Plänen
          + Bedingungen + Pflichtenheften. Das ist nicht standardkonform, aber gängig — wir
          arbeiten regelmäßig mit solchen Paketen. Unser Tipp: erst die X81 mit einem
          GAEB-Konverter öffnen, prüfen, ob Mengen drin sind. Wenn nein: Bieterfrage an
          Vergabestelle, weil ohne Mengen keine Bepreisung möglich ist.
        </Para>

        <Para>
          GAEB klingt technisch, ist aber im Alltag schnell beherrschbar — wenn man die fünf
          Phasen einmal verstanden hat. Bei Fragen: einfach unseren GAEB-Konverter nutzen oder
          uns anrufen.
        </Para>
      </>
    ),
  },

  {
    slug: 'praequalifikation-mythos',
    title: 'Brauchen wir wirklich eine Präqualifikation?',
    excerpt: 'Der größte Mythos im VOB-Vergaberecht. Was die Eignungsprüfung tatsächlich verlangt — und warum auch junge Betriebe öffentliche Aufträge gewinnen können, ohne durch das PQ-Verzeichnis zu gehen.',
    topic: 'VOB/A',
    date: '2026-04-29',
    minutes: 7,
    author: 'Alaatdin Coksari',
    content: (
      <>
        <Para>
          „Brauche ich eine Präqualifikation, bevor ich mich an einer öffentlichen
          Ausschreibung beteiligen kann?" Diese Frage hören wir im Erstgespräch häufiger als
          jede andere. Die kurze Antwort: <strong>Nein</strong>. Die lange Antwort folgt jetzt.
        </Para>

        <H2 id="was-ist-pq">Was ist Präqualifikation überhaupt?</H2>

        <Para>
          Präqualifikation (PQ) ist ein vorgelagertes Eignungsprüfungs-Verfahren. Sie weisen
          einmal jährlich gegenüber einer zentralen Stelle (Verein für die Präqualifikation
          von Bauunternehmen e.V., kurz Verein) Ihre Eignung nach — fachlich, finanziell,
          technisch. Wenn die Stelle Ihre Unterlagen prüft und für gut befindet, werden Sie ins
          „Amtliche Verzeichnis präqualifizierter Unternehmen" (AVPQ) eingetragen. Bei
          öffentlichen Vergaben können Sie dann statt jedes Mal alle Eignungsnachweise einzeln
          einzureichen, einfach Ihre PQ-Nummer angeben.
        </Para>

        <H2 id="muss-ich">Brauche ich PQ wirklich?</H2>

        <Para>
          Nein. § 6 VOB/A regelt die Eignungsprüfung — und sieht ausdrücklich zwei
          gleichberechtigte Wege vor:
        </Para>

        <Ol>
          <li><strong>Präqualifikation</strong> über das AVPQ-Verzeichnis</li>
          <li><strong>Einzelnachweis</strong> mit den Angebotsunterlagen — Sie reichen die geforderten Dokumente direkt ein</li>
        </Ol>

        <Para>
          Wer sich für die zweite Variante entscheidet, ist <em>nicht</em> benachteiligt. Die
          Vergabestelle muss Ihren Einzelnachweis genauso werten wie eine PQ-Nummer.
        </Para>

        <Callout kind="warn">
          <strong>Achtung:</strong> Manche Vergabestellen schreiben in der Bekanntmachung
          „PQ erforderlich". Das ist <em>nicht</em> rechtskonform, sofern keine besonderen
          Gründe vorliegen — § 6a VOB/A verbietet diskriminierende Bedingungen.
          Im Zweifel Bieterfrage stellen oder bei der Vergabekammer einen Hinweis schicken.
        </Callout>

        <H2 id="welche-unterlagen">Welche Unterlagen werden im Einzelnachweis verlangt?</H2>

        <Para>
          Standard-Set, das Sie ohnehin einmal sauber zusammenstellen sollten:
        </Para>

        <Ul>
          <li><strong>Referenzliste:</strong> mindestens 3 vergleichbare Projekte mit Auftraggeber, Wert und Zeitraum</li>
          <li><strong>Bescheinigung Finanzamt:</strong> aktueller Nachweis, dass keine Steuerschulden bestehen (sog. „steuerliche Unbedenklichkeitsbescheinigung")</li>
          <li><strong>Bescheinigung der Sozialkassen:</strong> SOKA-BAU, BG, ggf. Krankenkassen — keine offenen Beiträge</li>
          <li><strong>Aktueller Handelsregister-Auszug</strong> oder Gewerbeschein</li>
          <li><strong>Gewerbliche Versicherung:</strong> Berufshaftpflicht-Nachweis</li>
          <li><strong>Umsatzzahlen + Mitarbeiterzahl</strong> der letzten 3 Jahre</li>
          <li><strong>Mitgliedschaften / Zertifikate</strong>, falls vorhanden</li>
        </Ul>

        <Para>
          Bei der ersten Submission ist das Aufwand. Ab der zweiten haben Sie das Set fertig.
          Aktualisierungen brauchen Sie nur jährlich (Steuer-/Sozialkassen-Bescheinigungen)
          oder bei neuen Referenzen.
        </Para>

        <H2 id="vorteile-pq">Wann lohnt sich PQ trotzdem?</H2>

        <Para>
          PQ macht Sinn, wenn Sie regelmäßig (10+ pro Jahr) an größeren öffentlichen Vergaben
          teilnehmen <em>und</em> die Vergabestellen häufig PQ-Nummer abfragen. Dann sparen
          Sie das wiederholte Beifügen der Standard-Bescheinigungen.
        </Para>

        <Para>
          PQ kostet einmalige Antragskosten (typisch 250–500 €), zzgl. Jahresgebühr für die
          Aufrechterhaltung (ca. 200–400 €/Jahr). Plus: Aufwand für die jährliche Erneuerung
          der Nachweise.
        </Para>

        <H2 id="junge-betriebe">Auch junge Betriebe können öffentlich anbieten</H2>

        <Para>
          Mythos Nr. 2 nach „PQ ist Pflicht" lautet „Mein Betrieb ist erst seit 1 Jahr am
          Markt — da geht das eh nicht." <strong>Doch.</strong> § 6a VOB/A erlaubt
          Eignungsnachweis durch <em>vergleichbare Referenzen</em>, nicht durch Unternehmensalter.
          Wenn Sie als 6-Monate-junger Betrieb 3 Referenzen aus der Branche vorweisen können
          (z.B. weil Sie als selbstständige Subunternehmer für andere gearbeitet haben), sind
          Sie eignungsfähig.
        </Para>

        <Para>
          Wir hatten 2025 mehrere KALKU-Mandanten, die innerhalb der ersten 12 Monate ihres
          Betriebs öffentliche Aufträge gewonnen haben. Der Schlüssel: ehrliche, dokumentierte
          Referenzen — und ein vollständiger Eignungsnachweis als „Erstnachweis", der danach
          wiederverwendbar ist.
        </Para>

        <H2 id="zusammenfassung">Was tun, wenn ich starten will?</H2>

        <Ol>
          <li>Standard-Eignungsunterlagen einmal sauber zusammenstellen (siehe Liste oben).</li>
          <li>Eine kleine, passende Vergabe als „Übungs-Submission" auswählen — gerne unter 100 k €.</li>
          <li>Mit der Submission alle Eignungsnachweise einreichen.</li>
          <li>PQ erst beantragen, wenn Sie merken: das wird ein dauerhaftes Geschäftsfeld.</li>
        </Ol>

        <Para>
          Bei KALKU prüfen wir die Eignungs-Frage immer im Erstgespräch. Wenn Sie die drei
          Mindestvoraussetzungen erfüllen (3 MA, 6 Monate am Markt, 3 Referenzen), passt das.
          Falls Unterlagen noch nicht vollständig sind: kein Problem, wir gehen das gemeinsam
          durch — das passiert nur einmal.
        </Para>
      </>
    ),
  },

  {
    slug: 'mittellohn-realistisch-ansetzen',
    title: 'Den Mittellohn realistisch ansetzen — ohne sich kaputtzukalkulieren',
    excerpt: 'Der Stundenverrechnungssatz ist die wichtigste Stellschraube jeder Kalkulation. Wir zeigen, wie wir ihn pro Gewerk und Region ansetzen — und warum 38 €/h fast nie ausreichen.',
    topic: 'Kalkulation',
    date: '2026-04-22',
    minutes: 10,
    author: 'Alaatdin Coksari',
    content: (
      <>
        <Para>
          Wenn ich nur eine einzige Stellschraube in der Kalkulation hätte, mit der ich den
          Erfolg eines Bauunternehmens beeinflussen könnte, wäre es der Mittellohn. Zu niedrig
          angesetzt, gewinnen Sie zwar Aufträge — aber Sie verbrennen Geld. Zu hoch angesetzt,
          bleiben Sie konkurrenzfähig nicht. Den richtigen Mittellohn zu setzen ist Kunst und
          Handwerk gleichzeitig.
        </Para>

        <Para>
          Dieser Artikel beschreibt, wie wir bei KALKU vorgehen, was die typischen Fehler
          sind — und welche Werte 2026 realistisch sind.
        </Para>

        <H2 id="grundlagen">Mittellohn AS und ASL</H2>

        <Para>
          Zwei Begriffe, die häufig verwechselt werden:
        </Para>

        <Ul>
          <li><strong>Mittellohn AS (Arbeitsstunden-Lohn):</strong> der durchschnittliche Tariflohn pro Stunde, gewichtet nach Personalmix Ihrer Baustelle.</li>
          <li><strong>Mittellohn ASL (Arbeitsstunden-Lohn mit Lohnzusatzkosten):</strong> AS + alle Lohnnebenkosten (Sozialvers., SOKA-BAU, BG, Urlaubsgeld, 13. ME, Lohnfortzahlung) + ggf. Zulagen.</li>
        </Ul>

        <Para>
          In die Position-Kalkulation geht der ASL-Wert ein, nicht der AS. Das ist häufiger
          Fehler Nr. 1: Bauunternehmer setzen den Tariflohn (AS) ein und vergessen die
          Lohnnebenkosten — am Ende fehlen 70–90 % auf jeder Position.
        </Para>

        <ToolCta to="/tools/mittellohn/" label="Mittellohn-Rechner: AS und ASL exakt berechnen" />

        <H2 id="komponenten">Die Komponenten von ASL — was kostet ein Bauarbeiter wirklich?</H2>

        <Para>
          Lohnzusatzkosten in der Bauwirtschaft 2026 (Tarifgebiet West, Standardwerte):
        </Para>

        <Ul>
          <li><strong>Sozialversicherung AG-Anteil:</strong> KV ~7,3 %, PV ~1,7 %, RV ~9,3 %, AV ~1,3 % → ~19,6 %</li>
          <li><strong>SOKA-BAU:</strong> Urlaubskasse ~14,5 %, Berufsbildung ~1,85 %, ZVK ~3,0 % → ~19,4 % (West)</li>
          <li><strong>Berufsgenossenschaft (BG Bau):</strong> je Risikoklasse 3–7 %, im Bauhauptgewerbe ~5 %</li>
          <li><strong>Urlaubsgeld + 13. Monatsentgelt:</strong> rechnerisch ~8–11 % (anteilig)</li>
          <li><strong>Lohnfortzahlung Krankheit + Feiertage:</strong> ~5–7 %</li>
          <li><strong>Sonstiges:</strong> Vermögensbildung, Werkzeuggeld, Fahrtkostenanteil — ~2–4 %</li>
        </Ul>

        <Para>
          Summe typisch <strong>70–90 % Lohnnebenkosten</strong> auf den AS-Tariflohn. Bei einem
          Tariflohn von 28 €/h (Geselle West) ergibt das einen ASL von 47–53 €/h. Setzen Sie
          den ASL bei 38 €/h an — wie es viele Bauunternehmer aus alter Gewohnheit tun — fehlen
          Ihnen 9–15 €/h.
        </Para>

        <Callout kind="tip">
          <strong>Faustformel</strong>: ASL = AS × 1,80. Für ein erstes Sanity-Check reicht das.
          Für die echte Kalkulation gehen Sie über die Detail-Komponenten.
        </Callout>

        <H2 id="regional">Tarifgebiet West vs. Ost</H2>

        <Para>
          Das alte Tarifgebiet West (alte Bundesländer + Berlin-West) und das Tarifgebiet Ost
          (neue Bundesländer + Berlin-Ost) haben unterschiedliche Tariflöhne und unterschiedliche
          SOKA-BAU-Beiträge. Der Unterschied ist über die Jahre kleiner geworden, aber 2026
          immer noch spürbar:
        </Para>

        <Ul>
          <li><strong>Tariflohn Geselle 2026:</strong> West ~28,40 €/h, Ost ~26,10 €/h</li>
          <li><strong>SOKA-BAU Gesamt:</strong> West ~19,4 %, Ost ~16,5 %</li>
        </Ul>

        <Para>
          Wichtig: maßgeblich ist das Tarifgebiet der Baustelle, nicht des Firmensitzes. Wenn
          Sie als Saarländer in Sachsen bauen, dürfen Sie zu Ost-Konditionen arbeiten. Wenn
          Sie als Sachse in Baden-Württemberg bauen, gilt West.
        </Para>

        <H2 id="personalmix">Personalmix — die Gewichtung</H2>

        <Para>
          Der Mittellohn berechnet sich gewichtet nach Personalmix auf der Baustelle. Beispiel
          für eine Tiefbau-Kolonne:
        </Para>

        <Ul>
          <li>1 Polier × 32,50 €/h = 32,50</li>
          <li>1 Vorarbeiter × 27,40 €/h = 27,40</li>
          <li>3 Gesellen × 24,80 €/h = 74,40</li>
          <li>1 Helfer × 20,10 €/h = 20,10</li>
          <li><strong>Σ Anzahl:</strong> 6 Personen, <strong>Σ Lohn:</strong> 154,40 €/h</li>
          <li><strong>Mittellohn AS:</strong> 154,40 / 6 = <strong>25,73 €/h</strong></li>
          <li><strong>Mittellohn ASL</strong> (mit 78 % LNK): 25,73 × 1,78 = <strong>45,80 €/h</strong></li>
        </Ul>

        <Para>
          Häufiger Fehler hier: Bauunternehmer rechnen nur mit Gesellenlohn (24,80 × 1,78 =
          44,14 €/h), vergessen aber, dass der Polier und der Vorarbeiter mitkalkuliert werden
          müssen. Bei 6 Personen macht das 1,66 €/h Differenz aus — auf 1.000 Stunden 1.660 €
          fehlende Marge.
        </Para>

        <H2 id="zulagen">Zulagen — oft unterschätzt</H2>

        <Para>
          Zulagen erhöhen den ASL zusätzlich. Wenn Sie z.B. Erschwerniszulagen für Baustellen
          ohne Bauwasser/-strom oder Schmutzzulagen für Kanalbau zahlen, gehören die in den
          ASL. Typische Werte:
        </Para>

        <Ul>
          <li><strong>Erschwerniszulage:</strong> 1,50–2,80 €/h</li>
          <li><strong>Schmutzzulage:</strong> 1,00–2,00 €/h</li>
          <li><strong>Bauzulage / Hochbaubereich:</strong> 0,80–1,50 €/h</li>
          <li><strong>Auswärtszulage / Verpflegungszuschuss:</strong> pauschal pro Tag</li>
        </Ul>

        <H2 id="fehler">Drei häufige Fehler — und wie Sie sie vermeiden</H2>

        <H3>Fehler 1: ASL gleich AS angesetzt</H3>
        <Para>
          Konsequenz: bei 1.000 Personalstunden auf einer Baustelle fehlen Ihnen 17.000–21.000 €.
          Die Kalkulation sieht günstig aus, der Auftrag wird gewonnen — und am Ende bleibt
          rote Zahl.
        </Para>

        <H3>Fehler 2: Pauschal-ASL „den nehmen wir immer"</H3>
        <Para>
          Mancher Bauunternehmer hat sich vor 5 Jahren einen ASL gesetzt (z.B. 42 €/h) und
          nutzt den seitdem. Tariflöhne und SOKA-BAU sind in der Zeit aber gestiegen. Heute
          wären realistische 47–50 €/h. Bei 1.000 Stunden 5.000 € Differenz.
        </Para>

        <H3>Fehler 3: Personalmix nicht angepasst</H3>
        <Para>
          Eine Tiefbau-Kolonne hat einen anderen Mix als eine GaLaBau-Kolonne — andere
          Lohnstufe-Verteilung. Ein einheitlicher Mittellohn für alle Gewerke ist eine
          gewollte Vereinfachung, die in komplexen LVs Geld kostet.
        </Para>

        <H2 id="praxis">Wie wir es bei KALKU machen</H2>

        <Para>
          Wir hinterlegen für jeden Mandanten gewerk-spezifische Mittellöhne (z.B.
          Tiefbau-ASL, Elektro-ASL, GaLaBau-ASL) und passen sie quartalsweise an die
          aktuellen Tariflöhne und SOKA-BAU-Beiträge an. Das ist Aufwand — aber es entscheidet
          den Unterschied zwischen rentabel und ruinös.
        </Para>

        <Para>
          Wenn Sie selbst kalkulieren: nutzen Sie unseren Mittellohn-Rechner und überprüfen Sie
          alle 6 Monate Ihre Werte. Tariflöhne ändern sich jährlich. Lohnnebenkosten auch.
        </Para>
      </>
    ),
  },

  {
    slug: 'submission-am-wochenende',
    title: 'Submission am Montag — geht das überhaupt am Wochenende?',
    excerpt: 'Was möglich ist, wenn die Frist zu eng wird, was es Sie kostet (Spoiler: bei uns nichts extra), und woran Sie eine seriöse Wochenend-Bearbeitung erkennen.',
    topic: 'Pain',
    date: '2026-04-18',
    minutes: 6,
    author: 'Alaatdin Coksari',
    content: (
      <>
        <Para>
          Donnerstag, 17 Uhr: das LV liegt seit drei Tagen auf dem Schreibtisch. Submission ist
          Montag um 11 Uhr. Werktage zwischen Donnerstag und Montag: zwei (Freitag + Montag
          früh). Die meisten Kalkulationsbüros sagen jetzt: „geht nicht". Wir sagen: „geht —
          und kostet keinen Aufpreis".
        </Para>

        <Para>
          Wochenend-Submissionen sind unser Brot-und-Butter-Geschäft. Was dahinter steht —
          und woran Sie erkennen, dass ein Anbieter das wirklich beherrscht.
        </Para>

        <H2 id="ablauf">Wie eine Wochenend-Submission konkret abläuft</H2>

        <Para>
          Ein realer Ablauf (Tiefbau-LV, 110 Positionen, 1,8 Mio € erwartetes Auftragsvolumen,
          Submission Montag 11 Uhr):
        </Para>

        <Ul>
          <li><strong>Donnerstag 17:30 Uhr:</strong> Mandant ruft an, schickt LV per E-Mail. Wir bestätigen Empfang innerhalb 30 Min, Vorab-Sichtung läuft.</li>
          <li><strong>Donnerstag 22:00 Uhr:</strong> Vorab-Mengenermittlung fertig, Materialpreis-Anfragen an 4 Lieferanten raus.</li>
          <li><strong>Freitag 9:00 Uhr:</strong> Materialpreise von 3 Lieferanten zurück, der vierte folgt 14:00 Uhr.</li>
          <li><strong>Freitag 18:00 Uhr:</strong> erste Roh-Kalkulation steht, geht zur Vier-Augen-Prüfung.</li>
          <li><strong>Samstag 10:00 Uhr:</strong> Vier-Augen-Prüfung, Korrekturen.</li>
          <li><strong>Samstag 14:00 Uhr:</strong> Mandant bekommt Vorab-Entwurf zur Einsicht.</li>
          <li><strong>Sonntag 16:00 Uhr:</strong> Mandant bestätigt mit Änderungswunsch zu 2 Positionen.</li>
          <li><strong>Sonntag 19:00 Uhr:</strong> finale Kalkulation, EFB-Formblätter, Urkalkulation.</li>
          <li><strong>Montag 8:30 Uhr:</strong> Bote bringt das versiegelte Angebot zur Vergabestelle. 11:00 Uhr Submission.</li>
        </Ul>

        <H2 id="organisation">Was es organisatorisch braucht</H2>

        <Para>
          Vier Dinge müssen stehen, damit Wochenend-Submissionen verlässlich funktionieren —
          nicht nur einmal, sondern reproduzierbar:
        </Para>

        <Ol>
          <li><strong>Wochenend-Rufbereitschaft im Team:</strong> mindestens zwei Kalkulatoren, die am Wochenende erreichbar sind und arbeiten dürfen. Bei uns rotierend organisiert.</li>
          <li><strong>Lieferanten-Netzwerk:</strong> Materialpreise auch am Wochenende abrufbar. Das funktioniert nur, wenn Sie die Lieferanten persönlich kennen — ein neuer Lieferant antwortet nicht freitags um 22 Uhr.</li>
          <li><strong>Eingespieltes Vier-Augen-Prinzip:</strong> wer kalkuliert, sieht die eigenen Fehler nicht. Eine zweite Person muss frisch drüberschauen — und das System muss das ohne Reibung erlauben.</li>
          <li><strong>Boten-Logistik:</strong> Submissionen sind oft persönlich oder per Boten einzureichen. Sie brauchen jemanden, der Montag früh los kann.</li>
        </Ol>

        <H2 id="kosten">Was kostet das?</H2>

        <Para>
          Bei KALKU: nichts extra. Wochenend-Bearbeitung ist im normalen Festpreis enthalten —
          200–600 € für die Einzelbeauftragung, oder im Monatspaket M / L bereits abgedeckt.
          Es gibt keine „Express-Aufschläge" oder „Wochenend-Tarife". Wir kalkulieren das in
          den durchschnittlichen Bearbeitungsaufwand ein.
        </Para>

        <Para>
          Andere Anbieter rechnen Wochenend-Bearbeitung mit 150–250 % Zuschlag ab. Das mag
          fair sein — aber für Sie als Mandant unkalkulierbar. Wir bevorzugen die einfache
          Lösung: Festpreis, was passiert passiert.
        </Para>

        <Callout kind="info">
          <strong>Warum geht das wirtschaftlich?</strong> Weil unsere Teams am
          finanziellen Erfolg beteiligt sind. Wer am Wochenende einen Zuschlag rettet,
          verdient mit. Das ist die Kern-Grundlage des Vier-Teams-Modells: alle haben ein
          gemeinsames Interesse daran, dass die Submission funktioniert.
        </Callout>

        <ToolCta to="/tools/frist-rechner/" label="Frist-Rechner: wie viel Zeit bleibt wirklich?" />

        <H2 id="grenzen">Wo sind die Grenzen?</H2>

        <Para>
          Auch wir haben Grenzen. Wir nehmen keine Wochenend-Submission an, wenn:
        </Para>

        <Ul>
          <li>Die Vergabeunterlagen unvollständig sind (Pläne fehlen, Vorbemerkungen unklar) und Bieterfragen nicht mehr möglich sind.</li>
          <li>Ein neuer Mandant uns zum ersten Mal kontaktiert und wir die Mittellöhne, Verrechnungssätze und Lieferantenkonditionen nicht kennen — eine Notfall-Kalkulation für einen Fremden ist verantwortungslos.</li>
          <li>Die Submission technisch unklar ist (z.B. Bedarfspositionen ohne Mengen-Angabe in Stoffpreis-relevanten Bereichen).</li>
        </Ul>

        <Para>
          In diesen Fällen sagen wir ehrlich „nicht machbar" — lieber als ein schlechtes
          Angebot abzugeben, das den Mandanten Geld kostet.
        </Para>

        <H2 id="empfehlung">Empfehlung an Sie</H2>

        <Para>
          Wenn Sie regelmäßig Submissions-Stress haben: legen Sie sich entweder einen
          internen Wochenend-Plan zurecht, oder arbeiten Sie mit einem Kalkulationsbüro, das
          Wochenend-Bearbeitung als Standard versteht — nicht als Premium-Aufschlag.
        </Para>

        <Para>
          Bei akutem Notfall: rufen Sie an. Auch sonntags. <a href="tel:+496814109643" className="text-primary-700 font-semibold hover:underline">+49 681 41096430</a>. Schneller als das Formular.
        </Para>
      </>
    ),
  },
];

export default POSTS;

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return POSTS.slice(0, limit);
  // Prefer same topic, then most recent
  const sameTopic = POSTS.filter((p) => p.slug !== currentSlug && p.topic === current.topic);
  const others = POSTS.filter((p) => p.slug !== currentSlug && p.topic !== current.topic);
  return [...sameTopic, ...others].slice(0, limit);
}
