// HINWEIS (intern): Diese AGB sind eine Vorlage und MUSS vor dem Produktiv-Cutover
// (kalku.de) von einem Anwalt (Fachgebiet Bau-/Vergaberecht) final geprüft werden.
// Insbesondere: §14-BGB-Eingrenzung B2B-only, Haftungsklauseln nach §307 BGB
// (AGB-Inhaltskontrolle), Erfolgsprovisionsregelung, Loyalitätsversprechen und
// Vollmacht-Klausel.
import { Helmet } from 'react-helmet-async';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';

const TITLE = 'Allgemeine Geschäftsbedingungen | KALKU';
const DESC = 'AGB für Kalkulationsdienstleistungen von KALKU Baukalkulationen.';

export default function AGB() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={canonical('/agb/')} />
      </Helmet>

      <section className="section">
        <div className="container-prose">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Allgemeine Geschäftsbedingungen</h1>
          <p className="text-sm text-gray-500 mb-10">Stand: Mai 2026.</p>

          <div className="prose prose-gray max-w-none">
            <h2>§1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen{' '}
              <strong>{NAP.legalName}</strong>, {NAP.street}, {NAP.postalCode} {NAP.city}{' '}
              („KALKU") und Unternehmen im Sinne des §14 BGB („Auftraggeber") über die Erbringung
              von Baukalkulationsdienstleistungen, einschließlich Mengenermittlung,
              EFB-Formblatt-Erstellung, Materialpreisrecherche und fristgerechter Einreichung von
              Angeboten im Vergabeverfahren.
            </p>
            <p>
              <strong>Unternehmer i.S.d. §14 BGB</strong>: Der Auftraggeber handelt
              ausschließlich als Unternehmer im Sinne des §14 BGB. Ein Verbrauchergeschäft
              kommt nicht zustande. Ein Widerrufsrecht gemäß §§312g, 355 BGB besteht nicht.
              Abweichende Geschäftsbedingungen des Auftraggebers werden nicht Vertragsbestandteil,
              es sei denn, KALKU stimmt ihrer Geltung ausdrücklich in Textform zu.
            </p>

            <h2>§2 Vertragsgegenstand</h2>
            <p>
              KALKU erbringt für den Auftraggeber Kalkulations- und Vergabeleistungen. Der
              konkrete Leistungsumfang ergibt sich aus dem jeweiligen Angebot bzw. der
              Auftragsbestätigung. KALKU schuldet eine fachgerechte Bearbeitung nach den anerkannten
              Regeln der Bauwirtschaftslehre, jedoch keinen Erfolg im Sinne eines erteilten
              Zuschlags durch den öffentlichen oder privaten Auftraggeber.
            </p>

            <h2>§3 Vergütung — Einzelbeauftragung</h2>
            <p>
              Bei Einzelbeauftragung beträgt die Pauschale je Ausschreibung zwischen 200 € und
              600 € netto, abhängig vom Umfang des Leistungsverzeichnisses (Anzahl Positionen).
              Die Pauschale ist mit Lieferung der fertigen Kalkulation zur Einsicht des
              Auftraggebers fällig.
            </p>
            <p>
              Bei erteiltem Zuschlag wird zusätzlich eine Erfolgsprovision in Höhe von 5 % der
              Auftragssumme (netto) fällig. Die Erfolgsprovision wird mit Bestandskraft des
              Zuschlags fällig.
            </p>
            <p>
              Rechnungen sind innerhalb von <strong>14 Tagen ab Rechnungsdatum</strong> ohne
              Abzug zur Zahlung fällig. Bei Zahlungsverzug gelten die gesetzlichen
              Verzugszinsen gemäß §288 Abs. 2 BGB (Basiszinssatz zzgl. 9 Prozentpunkte) sowie
              die Pauschale gemäß §288 Abs. 5 BGB in Höhe von 40 €. Sämtliche genannten Preise
              verstehen sich netto zuzüglich der jeweils gesetzlichen Umsatzsteuer.
            </p>

            <h2>§4 Vergütung — Monatspauschale (PAKET M / PAKET L)</h2>
            <p>
              Bei Beauftragung der Monatspauschale beträgt die Vergütung 3.000 € netto/Monat
              (PAKET M) bzw. 5.000 € netto/Monat (PAKET L). Die Pauschale ist jeweils zum
              Monatsersten im Voraus fällig. Die Pakete enthalten unbegrenzt viele
              Baukalkulationen sowie wöchentliche Ausschreibungsrecherche im Rahmen des
              vereinbarten Einzugsgebiets.
            </p>
            <p>
              Bei erteiltem Zuschlag wird eine reduzierte Erfolgsprovision fällig: 3,9 % bei
              PAKET M, 2,9 % bei PAKET L (jeweils netto vom Auftragsvolumen).
            </p>
            <p>
              Rechnungen sind innerhalb von <strong>14 Tagen ab Rechnungsdatum</strong> ohne
              Abzug zur Zahlung fällig. Bei Zahlungsverzug gelten die gesetzlichen
              Verzugszinsen gemäß §288 Abs. 2 BGB (Basiszinssatz zzgl. 9 Prozentpunkte) sowie
              die Pauschale gemäß §288 Abs. 5 BGB in Höhe von 40 €. Sämtliche genannten Preise
              verstehen sich netto zuzüglich der jeweils gesetzlichen Umsatzsteuer.
            </p>

            <h2>§5 Laufzeit und Kündigung</h2>
            <p>
              Einzelbeauftragungen enden mit Erbringung der vereinbarten Leistung. Monatspakete
              haben keine Mindestlaufzeit und können von beiden Seiten mit einer Frist von einem
              (1) Monat zum Monatsende in Textform gekündigt werden.
            </p>

            <h2>§6 Mitwirkungspflichten des Auftraggebers</h2>
            <p>
              Der Auftraggeber stellt KALKU rechtzeitig alle für die Bearbeitung notwendigen
              Unterlagen zur Verfügung, insbesondere Leistungsverzeichnisse, Pläne, Vorgaben zu
              Mittellohn und Verrechnungssätzen sowie Eignungsnachweise (Referenzen,
              Bescheinigungen). Verzögerungen aufgrund unvollständiger Unterlagen gehen nicht zu
              Lasten von KALKU.
            </p>

            <h2>§7 Vollmacht und Außenwirkung</h2>
            <p>
              Soweit vereinbart, wird KALKU vom Auftraggeber bevollmächtigt, im Namen des
              Auftraggebers Materialpreisanfragen zu stellen und Angebote bei öffentlichen
              Auftraggebern einzureichen. KALKU tritt dabei nach außen ausschließlich als interne
              Kalkulationsabteilung des Auftraggebers auf. Die Vollmacht wird in Textform erteilt.
            </p>

            <h2>§8 Loyalitäts- und Gebietsschutz-Versprechen</h2>
            <p>
              KALKU verpflichtet sich, je Ausschreibung ausschließlich für ein Bieter-Unternehmen
              tätig zu werden. Im Rahmen einer aktiven Monatspauschale verpflichtet sich KALKU
              darüber hinaus, in dem im Auftrag konkret benannten Einzugsgebiet und Gewerk keine
              weiteren Bieter-Mandate anzunehmen, solange das Mandat des Auftraggebers fortbesteht.
            </p>

            <h2>§9 Vertraulichkeit</h2>
            <p>
              KALKU verpflichtet sich, alle vom Auftraggeber zur Verfügung gestellten Informationen
              — insbesondere Mittellohn, Verrechnungssätze, Margen, Lieferantenkonditionen,
              Referenzen — vertraulich zu behandeln und nicht an Dritte weiterzugeben. Die
              Verpflichtung gilt zeitlich unbegrenzt fort. Mitarbeiter von KALKU sind entsprechend
              schriftlich verpflichtet.
            </p>

            <h2>§10 Haftung</h2>
            <p>
              KALKU haftet für Vorsatz und grobe Fahrlässigkeit unbeschränkt. Für leichte
              Fahrlässigkeit haftet KALKU nur bei Verletzung wesentlicher Vertragspflichten
              (Kardinalpflichten) und der Höhe nach begrenzt auf den vertragstypischen,
              vorhersehbaren Schaden.
            </p>
            <p>
              KALKU haftet nicht für die Erteilung des Zuschlags durch den Auftraggeber des
              Bieters. Eine Haftung für entgangenen Gewinn aus nicht erteilten Zuschlägen ist
              ausgeschlossen.
            </p>

            <h2>§11 Schriftform und Vertragsänderungen</h2>
            <p>
              Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform. Dies gilt auch für
              die Aufhebung des Textformerfordernisses selbst.
            </p>

            <h2>§12 Salvatorische Klausel</h2>
            <p>
              Sollte eine Bestimmung dieser AGB unwirksam sein oder werden, so bleibt die
              Wirksamkeit der übrigen Bestimmungen unberührt. Anstelle der unwirksamen Bestimmung
              gilt eine wirksame Bestimmung, die dem wirtschaftlichen Zweck der unwirksamen
              Bestimmung am nächsten kommt.
            </p>

            <h2>§13 Erfüllungsort und Gerichtsstand</h2>
            <p>
              Erfüllungsort und Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist —
              soweit gesetzlich zulässig — der Sitz von KALKU in {NAP.city}. Es gilt
              ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des
              UN-Kaufrechts.
            </p>

            <h2>§14 Datenschutz</h2>
            <p>
              Die Verarbeitung personenbezogener Daten im Rahmen der Geschäftsanbahnung und
              Vertragsdurchführung erfolgt ausschließlich auf Grundlage der DSGVO und des
              BDSG. Es gilt unsere Datenschutzerklärung unter{' '}
              <a href="/datenschutz/">/datenschutz/</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
