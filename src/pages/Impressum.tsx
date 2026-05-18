// HINWEIS (intern): Dieses Impressum ist eine Vorlage. Vor dem Produktiv-Cutover
// (kalku.de) bitte von einem Anwalt prüfen lassen — insbesondere §18 MStV-Pflicht
// (sobald journalistisch-redaktionelle Inhalte unter /blog/ veröffentlicht werden),
// Handelsregister-/Berufshaftpflicht-Angaben (sofern zutreffend) und
// Streitschlichtungs-Klausel.
import { Helmet } from 'react-helmet-async';
import { canonical } from '@/lib/seo';
import { NAP } from '@/lib/constants';

const TITLE = 'Impressum | KALKU';
const DESC = 'Impressum nach §5 TMG für KALKU Baukalkulationen, Saarbrücken.';

export default function Impressum() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={canonical('/impressum/')} />
      </Helmet>

      <section className="section">
        <div className="container-prose">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Impressum</h1>
          <div className="prose prose-gray max-w-none">
            <h2>Angaben gemäß §5 TMG</h2>
            <p>
              {NAP.legalName}
              <br />
              {NAP.street}
              <br />
              {NAP.postalCode} {NAP.city}
              <br />
              Deutschland
            </p>

            <h2>Vertreten durch</h2>
            <p>Alaatdin Coksari</p>

            <h2>Kontakt</h2>
            <p>
              Telefon: {NAP.phone}
              <br />
              E-Mail: <a href={`mailto:${NAP.email}`}>{NAP.email}</a>
            </p>

            <h2>Umsatzsteuer-ID</h2>
            <p>USt-ID nach §27a UStG: {NAP.vatId}</p>

            <h2>Verantwortlich für den Inhalt nach §18 Abs. 2 MStV</h2>
            <p>
              Alaatdin Coksari
              <br />
              {NAP.street}
              <br />
              {NAP.postalCode} {NAP.city}
            </p>

            <h2>EU-Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                https://ec.europa.eu/consumers/odr
              </a>
              .
            </p>

            <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
            <p>
              Hinweis nach §36 VSBG: Wir sind zur Teilnahme an einem Streitbeilegungsverfahren
              vor einer Verbraucherschlichtungsstelle weder bereit noch verpflichtet. KALKU
              richtet sich ausschließlich an Unternehmer im Sinne des §14 BGB; ein
              Verbrauchergeschäft kommt nicht zustande.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
