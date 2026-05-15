import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, BookOpen } from 'lucide-react';
import { canonical } from '@/lib/seo';
import POSTS, { type BlogTopic } from '@/data/blog';

const TITLE = 'Blog — Wissen für Bauunternehmer | KALKU';
const DESC =
  'Pain-driven Wissen für Bauunternehmer: VOB/A, GAEB, EFB-Formblätter, Kalkulation, Submission. Aus 14 Jahren Praxis im KALKU-Kalkulationsbüro.';

const TOPIC_COLOR: Record<BlogTopic, string> = {
  Pain: 'bg-rose-50 text-rose-700',
  'VOB/A': 'bg-primary-50 text-primary-700',
  GAEB: 'bg-amber-50 text-amber-700',
  Kalkulation: 'bg-emerald-50 text-emerald-700',
  Praxis: 'bg-sky-50 text-sky-700',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BlogIndex() {
  // Sort newest first
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const [hero, ...rest] = sorted;

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/blog/')} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'KALKU Blog',
            description: DESC,
            url: canonical('/blog/'),
            inLanguage: 'de-DE',
            publisher: { '@type': 'Organization', name: 'KALKU Baukalkulationen', url: 'https://kalku.de' },
            blogPost: sorted.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              datePublished: p.date,
              author: { '@type': 'Person', name: p.author },
              url: canonical(`/blog/${p.slug}/`),
            })),
          })}
        </script>
      </Helmet>

      <section className="section bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-700 font-bold mb-3">Blog</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              Wissen für <span className="text-primary-500">Bauunternehmer.</span>
            </h1>
            <p className="text-lg text-gray-600">
              VOB/A, GAEB, EFB-Formblätter, Submissionen — was Sie wirklich wissen müssen, ohne
              Marketing-Geschwurbel. Aus 14 Jahren Praxis im KALKU-Kalkulationsbüro.
            </p>
          </div>
        </div>
      </section>

      {/* Hero post (most recent) */}
      <section className="section-tight">
        <div className="container-page">
          <Link to={`/blog/${hero.slug}/`} className="card card-hover group block max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${TOPIC_COLOR[hero.topic]}`}>
                    {hero.topic}
                  </span>
                  <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {hero.minutes} Min
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{fmtDate(hero.date)}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-3 group-hover:text-primary-700 transition-colors">
                  {hero.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">{hero.excerpt}</p>
              </div>
              <div className="lg:col-span-1 flex flex-col justify-center">
                <div className="bg-gradient-to-br from-primary-50 to-emerald-50 rounded-xl aspect-square sm:aspect-[4/3] lg:aspect-square flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-primary-300" strokeWidth={1.2} />
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 mt-5">
                  Artikel lesen <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Rest of posts in grid */}
      <section className="section-tight">
        <div className="container-page">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {rest.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}/`} className="card card-hover group flex flex-col">
                <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${TOPIC_COLOR[p.topic]}`}>
                    {p.topic}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" /> {p.minutes} Min
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors leading-snug">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-600 flex-1 mb-4 leading-relaxed">{p.excerpt}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-gray-400">{fmtDate(p.date)}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                    Lesen <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="card text-center max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-700 mb-3">Newsletter</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Einmal im Monat. Pain-driven.</h2>
            <p className="text-gray-600 mb-7">
              Ein Artikel pro Monat per E-Mail — kein Marketing, nur Substanz. Jederzeit kündbar.
            </p>
            <p className="text-xs text-gray-400">
              Anmeldung folgt mit dem Launch der nächsten Artikel-Reihe. Bis dahin gerne direkt unter{' '}
              <a href="mailto:info@kalku.de" className="text-primary-600 hover:underline">
                info@kalku.de
              </a>{' '}
              vormerken.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
