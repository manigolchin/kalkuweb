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
              Analyse-Lösung. Plausible setzt keine Cookies, speichert keine
              personenbezogenen Daten und überträgt keine Daten in Drittländer außerhalb der
              EU. Verarbeitet werden nur aggregierte Statistiken (Seitenaufrufe,
              Verweildauer, Quelle). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
            </p>

            <h2>3. Empfänger / Auftragsverarbeiter</h2>
            <p>
              Wir geben Ihre Daten nur an folgende Auftragsverarbeiter weiter, mit denen
              jeweils ein DSGVO-konformer Auftragsverarbeitungsvertrag (AVV) besteht:
            </p>
            <ul>
              <li>Hosting-Provider (EU-Server)</li>
              <li>E-Mail-Provider für Versand der Tool-Auswertungen (EU-Server)</li>
              <li>CRM-Anbieter Pipedrive (Server in der EU)</li>
              <li>Plausible Insights OÜ (Estland) für aggregierte Reichweitenmessung</li>
            </ul>

            <h2>4. Übermittlung in Drittländer</h2>
            <p>
              Es findet keine Übermittlung Ihrer personenbezogenen Daten an Empfänger außerhalb
              der EU/EWR statt.
            </p>

            <h2>5. Ihre Rechte als betroffene Person</h2>
            <p>Sie haben jederzeit das Recht auf:</p>
            <ul>
              <li>Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>
                Beschwerde bei einer Aufsichtsbehörde — zuständig für KALKU ist das
                Unabhängige Datenschutzzentrum Saarland.
              </li>
            </ul>
            <p>
              Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an:{' '}
              <a href={`mailto:${NAP.email}`}>{NAP.email}</a>.
            </p>

            <h2>6. SSL-/TLS-Verschlüsselung</h2>
            <p>
              Diese Website nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Eine
              verschlüsselte Verbindung erkennen Sie an „https://" in der Adresszeile Ihres
              Browsers.
            </p>

            <h2>7. Aktualität dieser Erklärung</h2>
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
