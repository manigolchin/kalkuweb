import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { canonical } from '@/lib/seo';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const url = canonical(`/blog/${slug ?? ''}/`);
  return (
    <>
      <Helmet>
        <title>Artikel in Vorbereitung | KALKU Blog</title>
        <meta name="description" content="Dieser Blog-Artikel wird derzeit erstellt." />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={url} />
      </Helmet>
      <section className="section">
        <div className="container-prose text-center">
          <p className="eyebrow mb-3">Blog</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5">
            Dieser Artikel ist noch in Vorbereitung.
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Wir arbeiten am vollständigen Inhalt. Sobald er fertig ist, finden Sie ihn unter
            dieser URL.
          </p>
          <div className="card text-left max-w-md mx-auto mb-10">
            <p className="text-sm text-gray-600 mb-4">
              Möchten Sie informiert werden, sobald dieser Artikel veröffentlicht wird? Schreiben
              Sie uns eine kurze Nachricht — wir melden uns mit dem Link.
            </p>
            <a
              href="mailto:info@kalku.de?subject=Blog-Artikel-Vormerker"
              className="btn btn-outline w-full justify-center"
            >
              <Mail className="w-4 h-4" /> Vormerken
            </a>
          </div>
          <Link to="/blog/" className="btn btn-ghost">
            <ArrowLeft className="w-4 h-4" /> Zur Blog-Übersicht
          </Link>
        </div>
      </section>
    </>
  );
}
