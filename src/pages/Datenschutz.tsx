// HINWEIS (intern): Diese Datenschutzerklärung ist eine Vorlage und MUSS vor dem
// Produktiv-Cutover (kalku.de) von einem Anwalt (Fachgebiet IT-/Datenschutzrecht)
// final geprüft werden. Insbesondere: SCC-/DPF-Belastbarkeit für Calendly + WhatsApp,
// Vollständigkeit der Auftragsverarbeiter-Liste (Hosting-Provider, E-Mail-Provider
// namentlich nennen, sobald gewählt), Speicherdauern, sowie Inhaber-Foto/Cookie-Banner
// im Zusammenspiel mit ggf. später ergänzten Drittanbietern.
import { Helmet } from 'react-helmet-async';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';

const TITLE = 'Datenschutzerklärung | KALKU';
const DESC = 'Datenschutzerklärung nach DSGVO für KALKU Baukalkulationen, Saarbrücken.';

export default function Datenschutz() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={canonical('/datenschutz/')} />
      </Helmet>

      <section className="section">
        <div className="container-prose">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Datenschutzerklärung</h1>
          <p className="text-sm text-gray-500 mb-10">Stand: Mai 2026.</p>

          <div className="prose prose-gray max-w-none">
            <h2>1. Verantwortlicher</h2>
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der DSGVO ist:
              <br />
              {NAP.legalName}, vertreten durch Alaatdin Coksari
              <br />
              {NAP.street}, {NAP.postalCode} {NAP.city}
              <br />
              Telefon: {NAP.phone}
              <br />
              E-Mail: <a href={`mailto:${NAP.email}`}>{NAP.email}</a>
            </p>

            <h2>2. Erhobene Daten und Verarbeitungszwecke</h2>

            <h3>2.1 Server-Logfiles (technisch notwendig)</h3>
            <p>
              Beim Aufruf dieser Website werden vom Hosting-Anbieter automatisch Daten
              gespeichert: anonymisierte IP-Adresse, Datum und Uhrzeit des Zugriffs,
              aufgerufene Seite, Referrer-URL, User-Agent. Rechtsgrundlage:
              Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an stabilem Betrieb und
              Sicherheit). Speicherdauer: 14 Tage.
            </p>

            <h3>2.2 Kontaktformular „Erstgespräch vereinbaren"</h3>
            <p>
              Wenn Sie das mehrstufige Kontaktformular ausfüllen, übermitteln Sie:
              Firma, Branche/Gewerk, Einzugsgebiet, Mitarbeiterzahl, Vor- und Nachname,
              E-Mail, Telefon, Anfrage-Inhalt. Diese Daten werden ausschließlich zur Bearbeitung
              Ihrer Anfrage verwendet und in unserem internen CRM (Pipedrive, EU-Server)
              gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche
              Maßnahmen). Speicherdauer: bis zur Beendigung der Geschäftsanbahnung bzw.
              Auftragsbeziehung, längstens 36 Monate, sofern keine gesetzliche
              Aufbewahrungspflicht entgegensteht.
            </p>

            <h3>2.3 Tool-Nutzung (GAEB-Konverter, Position-Kalkulator)</h3>
            <p>
              Die kostenlosen Tools auf <code>/tools/gaeb-konverter/</code> und{' '}
              <code>/tools/kalkulator/</code> verarbeiten alle Eingaben{' '}
              <strong>ausschließlich lokal in Ihrem Browser</strong>. Es findet keine
              Übertragung an unsere Server statt.
            </p>
            <p>
              Wenn Sie die optionale „Premium-Auswertung per E-Mail" aktiv anfordern,
              übertragen wir die hochgeladene GAEB-Datei bzw. Ihre Berechnung verschlüsselt
              (TLS 1.3) an unseren Server, verarbeiten sie und löschen sie spätestens 30 Tage
              nach Auslieferung der Auswertung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            <h3>2.4 Reichweitenmessung (Plausible Analytics)</h3>
            <p>
              Wir nutzen{' '}
              <a href="https://plausible.io/data-policy" target="_blank" rel="noopener noreferrer">
                Plausible Analytics
              </a>{' '}
              (Plausible Insights OÜ, Estland), eine cookielose, DSGVO-konforme
              Analyse-Lösung. Plausible setzt keine Cookies, IP-Adressen werden anonymisiert
              und nicht gespeichert. Die Verarbeitung findet auf EU-Servern statt. Verarbeitet
              werden ausschließlich aggregierte Statistiken (Seitenaufrufe, Verweildauer,
              Quelle). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
              datensparsamer Reichweitenanalyse).
            </p>

            <h3>2.5 Terminbuchung (Calendly)</h3>
            <p>
              Für die Vereinbarung eines Erstgesprächs nutzen wir das Buchungs-Tool{' '}
              <a href="https://calendly.com" target="_blank" rel="noopener noreferrer">
                Calendly
              </a>{' '}
              der Calendly Inc., 271 17th St NW, Atlanta, GA 30363, USA. Bei Nutzung des
              Buchungs-Tools werden Ihre Eingaben (Name, E-Mail, gewählter Termin, ggf.
              Telefon) an Calendly übermittelt und in den USA verarbeitet. Rechtsgrundlage:
              Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen). Speicherdauer bei
              Calendly: maximal 12 Monate nach Termindurchführung. Weitere Informationen
              finden Sie in der{' '}
              <a
                href="https://calendly.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Datenschutzerklärung von Calendly
              </a>{' '}
              sowie im{' '}
              <a
                href="https://calendly.com/dpa"
                target="_blank"
                rel="noopener noreferrer"
              >
                Calendly Data Processing Addendum (DPA)
              </a>
              .
            </p>

            <h3>2.6 WhatsApp-Kontakt</h3>
            <p>
              Auf der Website finden Sie einen WhatsApp-Kontakt-Link. Wenn Sie diesen nutzen,
              erfolgt eine Übermittlung Ihrer Telefonnummer sowie der von Ihnen versendeten
              Nachrichteninhalte an die Meta Platforms Ireland Ltd., 4 Grand Canal Square,
              Dublin 2, Irland, sowie ggf. an die US-Konzernmutter Meta Platforms Inc. Die
              Verarbeitung durch Meta liegt außerhalb unseres Einflussbereichs.
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
              niedrigschwelligen Kontaktkanal für gewerbliche Auftraggeber). Wenn Sie die
              Übermittlung an Meta vermeiden möchten, kontaktieren Sie uns bitte per
              Telefon oder E-Mail. Details zur Datenverarbeitung durch Meta entnehmen Sie der{' '}
              <a
                href="https://www.whatsapp.com/legal/privacy-policy-eea"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp-Datenschutzerklärung (EWR)
              </a>
              .
            </p>

            <h2>3. Empfänger / Auftragsverarbeiter</h2>
            <p>
              Wir geben Ihre Daten nur an folgende Empfänger / Auftragsverarbeiter weiter,
              mit denen jeweils ein DSGVO-konformer Auftragsverarbeitungsvertrag (AVV) bzw.
              Standardvertragsklauseln (SCC) bestehen:
            </p>
            <ul>
              <li>Hosting-Provider (EU-Server)</li>
              <li>E-Mail-Provider für Versand der Tool-Auswertungen (EU-Server)</li>
              <li>CRM-Anbieter Pipedrive (Server in der EU)</li>
              <li>Plausible Insights OÜ, Estland — aggregierte Reichweitenmessung (EU)</li>
              <li>
                Calendly Inc., 271 17th St NW, Atlanta, GA 30363, USA — Buchungs-Tool für
                Erstgespräche. Drittland-Übermittlung auf Basis der EU-Standard­vertrags­klauseln
                (Art. 46 Abs. 2 lit. c DSGVO) sowie des EU-US Data Privacy Framework (DPF);
                Calendly ist DPF-zertifiziert.
              </li>
              <li>
                Meta Platforms Ireland Ltd., Dublin, Irland (bei Nutzung des WhatsApp-CTAs)
                — Drittland-Übermittlung an die US-Konzernmutter auf Basis der
                EU-Standard­vertrags­klauseln.
              </li>
            </ul>

            <h2>4. Übermittlung in Drittländer</h2>
            <p>
              Eine Übermittlung personenbezogener Daten in Drittländer außerhalb der EU/des
              EWR findet ausschließlich in den unter Ziffer 3 genannten Fällen statt
              (insbesondere Calendly sowie ggf. WhatsApp/Meta). Die Übermittlung erfolgt auf
              Basis der EU-Standard­vertrags­klauseln gemäß Art. 46 Abs. 2 lit. c DSGVO sowie
              — soweit der jeweilige Anbieter zertifiziert ist — auf Grundlage des EU-US
              Data Privacy Framework (Angemessenheitsbeschluss der EU-Kommission vom
              10.07.2023). Im Übrigen werden Ihre Daten nicht in Drittländer übermittelt.
            </p>

            <h2>5. Cookies und Tracking</h2>
            <p>
              Wir setzen ausschließlich technisch notwendige Cookies ein (z. B. Session-
              und Sicherheits-Token, sofern für den Betrieb der Website erforderlich).
              Tracking-Cookies, Marketing-Cookies oder Cookies zum geräteübergreifenden
              Wiedererkennen werden <strong>nicht</strong> eingesetzt. Eine Einwilligung
              nach §25 Abs. 1 TDDDG ist daher nicht erforderlich.
            </p>

            <h2>6. Keine automatisierte Entscheidungsfindung</h2>
            <p>
              Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne des
              Art. 22 DSGVO findet nicht statt. Alle vertragsrelevanten Entscheidungen
              treffen wir auf Basis menschlicher Bewertung durch unsere Kalkulatoren.
            </p>

            <h2>7. Ihre Rechte als betroffene Person</h2>
            <p>Sie haben jederzeit das Recht auf:</p>
            <ul>
              <li>Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>
                Beschwerde bei einer Aufsichtsbehörde. Zuständig für KALKU ist das
                Unabhängige Datenschutzzentrum Saarland (UDS), Fritz-Dobisch-Straße 12,
                66111 Saarbrücken, Telefon: +49 681 94781-0, E-Mail:{' '}
                <a href="mailto:poststelle@datenschutz.saarland.de">
                  poststelle@datenschutz.saarland.de
                </a>
                , Web:{' '}
                <a
                  href="https://www.datenschutz.saarland.de"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.datenschutz.saarland.de
                </a>
                .
              </li>
            </ul>
            <p>
              Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an:{' '}
              <a href={`mailto:${NAP.email}`}>{NAP.email}</a>.
            </p>

            <h2>8. SSL-/TLS-Verschlüsselung</h2>
            <p>
              Diese Website nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Eine
              verschlüsselte Verbindung erkennen Sie an „https://" in der Adresszeile Ihres
              Browsers.
            </p>

            <h2>9. Aktualität dieser Erklärung</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen, etwa wenn
              wir neue Funktionen einführen oder rechtliche Vorgaben sich ändern. Die jeweils
              aktuelle Fassung ist unter <code>/datenschutz/</code> abrufbar.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
