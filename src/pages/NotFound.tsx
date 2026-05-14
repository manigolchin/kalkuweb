import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Seite nicht gefunden — 404 | KALKU</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className="section">
        <div className="container-narrow text-center">
          <p className="eyebrow mb-3">Fehler 404</p>
          <h1 className="text-5xl font-bold text-gray-900 mb-5">Seite nicht gefunden</h1>
          <p className="text-lg text-gray-600 mb-10">
            Die angefragte Seite existiert nicht oder wurde verschoben.
          </p>
          <Link to="/" className="btn btn-success btn-lg">
            Zur Startseite <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
