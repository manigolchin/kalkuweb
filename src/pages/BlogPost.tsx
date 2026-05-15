import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, User, Calendar, Mail } from 'lucide-react';
import { canonical } from '@/lib/seo';
import { getPostBySlug, getRelatedPosts, type BlogTopic } from '@/data/blog';
import { NAP } from '@/lib/constants';

const TOPIC_COLOR: Record<BlogTopic, string> = {
  Pain: 'bg-rose-50 text-rose-700 border-rose-200',
  'VOB/A': 'bg-primary-50 text-primary-700 border-primary-200',
  GAEB: 'bg-amber-50 text-amber-700 border-amber-200',
  Kalkulation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Praxis: 'bg-sky-50 text-sky-700 border-sky-200',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <section className="section">
        <div className="container-prose text-center">
          <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">Blog</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-5">
            Artikel nicht gefunden
          </h1>
          <p className="text-gray-600 mb-10">
            Die angefragte URL existiert nicht oder wurde verschoben.
          </p>
          <Link to="/blog/" className="btn btn-success btn-lg">
            <ArrowLeft className="w-4 h-4" /> Zur Blog-Übersicht
          </Link>
        </div>
      </section>
    );
  }

  const url = canonical(`/blog/${post.slug}/`);
  const related = getRelatedPosts(post.slug, 3);

  return (
    <>
      <Helmet>
        <title>{post.title} | KALKU Blog</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.topic} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            dateModified: post.date,
            author: { '@type': 'Person', name: post.author },
            publisher: {
              '@type': 'Organization',
              name: NAP.legalName,
              url: NAP.url,
              logo: { '@type': 'ImageObject', url: `${NAP.url}/favicon.svg` },
            },
            mainEntityOfPage: { '@type': 'WebPage', '@id': url },
            inLanguage: 'de-DE',
            articleSection: post.topic,
            wordCount: post.minutes * 200,
          })}
        </script>
      </Helmet>

      {/* HERO */}
      <article>
        <header className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
          <div className="container-prose pt-12 pb-10">
            <Link to="/blog/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 mb-7">
              <ArrowLeft className="w-4 h-4" /> Zur Blog-Übersicht
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-5 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${TOPIC_COLOR[post.topic]}`}>
                {post.topic}
              </span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Clock className="w-3 h-3" /> {post.minutes} Min Lesezeit
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" /> {fmtDate(post.date)}
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <User className="w-3 h-3" /> {post.author}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6">
              {post.title}
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed">{post.excerpt}</p>
          </div>
        </header>

        {/* CONTENT */}
        <div className="container-prose pt-12 pb-20">
          <div className="prose prose-gray max-w-none article-content">
            {post.content}
          </div>

          {/* Author bio */}
          <div className="mt-16 pt-10 border-t border-gray-200">
            <div className="flex items-start gap-5 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">AC</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-1">Autor</p>
                <p className="font-bold text-gray-900 mb-1">{post.author}</p>
                <p className="text-sm text-gray-600">
                  Inhaber & Geschäftsführer · KALKU Baukalkulationen, Saarbrücken. Schreibt über
                  VOB/A, Kalkulation, GAEB und alles, was Bauunternehmer im Submissionsalltag
                  beschäftigt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* RELATED POSTS */}
      {related.length > 0 && (
        <section className="section-tight bg-gray-50 border-t border-gray-200">
          <div className="container-page">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-gray-500 mb-2 text-center">
              Verwandte Artikel
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-8">
              Auch interessant.
            </h2>
            <div className="grid gap-5 md:grid-cols-3 max-w-5xl mx-auto">
              {related.map((r) => (
                <Link key={r.slug} to={`/blog/${r.slug}/`} className="card card-hover group flex flex-col">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${TOPIC_COLOR[r.topic]}`}>
                      {r.topic}
                    </span>
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Clock className="w-3 h-3" /> {r.minutes} Min
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors leading-snug">
                    {r.title}
                  </h3>
                  <p className="text-xs text-gray-600 flex-1 line-clamp-3">{r.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 mt-4">
                    Lesen <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="section">
        <div className="container-page">
          <div className="card text-center max-w-2xl mx-auto">
            <Mail className="w-8 h-8 text-primary-600 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-700 mb-3">
              Lust auf konkrete Hilfe?
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Wir kalkulieren Ihre nächste Submission.
            </h2>
            <p className="text-gray-600 mb-6">
              Festpreis ab 200 € pro LV. Auch über Nacht oder am Wochenende. Ohne Verkaufsgespräch.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/kontakt/" className="btn btn-success">
                Erstgespräch vereinbaren <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/konditionen/" className="btn btn-outline">
                Konditionen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
