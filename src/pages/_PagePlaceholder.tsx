import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Construction, ArrowRight } from 'lucide-react';
import { canonical } from '@/lib/seo';

type Props = {
  /** Page title for browser + OG */
  title: string;
  /** Page meta description */
  description: string;
  /** Canonical path (e.g. "/konditionen/") */
  path: string;
  /** H1 shown on the page */
  h1: string;
  /** One-line eyebrow above the H1 */
  eyebrow?: string;
  /** Short description shown under H1 */
  intro?: string;
  /** Phase the page lands in (3.3 = main pages, 3.4 = tools) */
  phase?: '3.2' | '3.3' | '3.4';
};

/**
 * Placeholder used while pages are scaffolded but not yet built.
 * Will be replaced 1:1 by real implementations in Phase 3.3.
 */
export default function PagePlaceholder({
  title,
  description,
  path,
  h1,
  eyebrow,
  intro,
  phase = '3.3',
}: Props) {
  const url = canonical(path);
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className="section">
        <div className="container-narrow text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Construction className="w-3.5 h-3.5" />
            In Bauphase · Phase {phase}
          </div>
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">{h1}</h1>
          {intro && <p className="text-lg text-gray-600 mb-10">{intro}</p>}
          <div className="card-flat text-left max-w-xl mx-auto">
            <p className="text-sm text-gray-600 mb-3 font-medium">Placeholder-Status</p>
            <p className="text-sm text-gray-500">
              Diese Seite ist Teil des kalku.de-Rewrites. Sie ist als Route registriert und SEO-prepariert, der
              fertige Inhalt folgt in Phase 3.3 / 3.4 des Build-Plans.
            </p>
          </div>
          <div className="mt-10">
            <Link to="/" className="btn btn-outline btn-lg">
              <ArrowRight className="w-4 h-4 rotate-180" />
              Zur Startseite
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
