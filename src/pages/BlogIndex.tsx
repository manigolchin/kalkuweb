import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { canonical } from '@/lib/seo';

const TITLE = 'Blog — Wissen für Bauunternehmer | KALKU';
const DESC =
  'Pain-driven Wissen für Bauunternehmer: VOB/A, GAEB, EFB, Kalkulation, Submission. Wenn der eigene Kalkulator fehlt.';

// Placeholder posts — Phase 5 wird echte Posts liefern
const POSTS = [
  {
    slug: 'wenn-der-eigene-kalkulator-fehlt',
    title: 'Wenn der eigene Kalkulator fehlt — was jetzt?',
    excerpt:
      'Submissionstermin in 3 Tagen, der Kalkulator ist krank oder bereits gekündigt — und das LV liegt seit 4 Tagen unbearbeitet rum. Drei Optionen, die Sie haben.',
    topic: 'Pain',
    minutes: 4,
    date: '2026-05-12',
  },
  {
    slug: 'efb-221-222-223-erklaert',
    title: 'EFB-Preise 221, 222, 223 — was steht eigentlich drin?',
    excerpt:
      'Die drei Formblätter, die jeder VOB-Bieter ausfüllen muss. Was sie aussagen, wo häufig Fehler passieren, und warum sie wichtiger sind als die meisten denken.',
    topic: 'VOB/A',
    minutes: 8,
    date: '2026-05-08',
  },
  {
    slug: 'gaeb-x83-vs-x84',
    title: 'GAEB X83 vs. X84 — was ist der Unterschied?',
    excerpt:
      'Bieter bekommen X83, geben X84 zurück. Was technisch dahintersteckt, welche Tools das beherrschen, und warum manche LVs mit „X81 als ZIP" daherkommen.',
    topic: 'GAEB',
    minutes: 5,
    date: '2026-05-05',
  },
  {
    slug: 'praequalifikation-mythos',
    title: 'Brauchen wir wirklich eine Präqualifikation?',
    excerpt:
      'Der größte Mythos im VOB-Vergaberecht. Was die Eignungsprüfung tatsächlich verlangt — und warum auch junge Betriebe öffentliche Aufträge gewinnen können.',
    topic: 'VOB/A',
    minutes: 6,
    date: '2026-04-29',
  },
  {
    slug: 'mittellohn-realistisch-ansetzen',
    title: 'Den Mittellohn realistisch ansetzen — ohne sich kaputtzukalkulieren',
    excerpt:
      'Der Stundenverrechnungssatz ist der wichtigste Stellschraube jeder Kalkulation. Wir zeigen, wie wir ihn pro Gewerk und Region ansetzen — und warum 38 €/h selten ausreichen.',
    topic: 'Kalkulation',
    minutes: 10,
    date: '2026-04-22',
  },
  {
    slug: 'submission-am-wochenende',
    title: 'Submission am Montag — geht das überhaupt am Wochenende?',
    excerpt:
      'Was möglich ist, wenn die Frist zu eng wird, was es Sie kostet (Spoiler: bei uns nichts extra), und woran Sie eine seriöse Wochenend-Bearbeitung erkennen.',
    topic: 'Pain',
    minutes: 5,
    date: '2026-04-18',
  },
];

const TOPIC_COLOR: Record<string, string> = {
  Pain: 'bg-rose-50 text-rose-700',
  'VOB/A': 'bg-primary-50 text-primary-700',
  GAEB: 'bg-amber-50 text-amber-700',
  Kalkulation: 'bg-emerald-50 text-emerald-700',
};

export default function BlogIndex() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/blog/')} />
      </Helmet>

      <section className="section bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="eyebrow mb-3">Blog</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              Wissen für <span className="text-primary-500">Bauunternehmer.</span>
            </h1>
            <p className="text-lg text-gray-600">
              VOB/A, GAEB, EFB-Formblätter, Submissionen — was Sie wirklich wissen müssen, ohne
              Marketing-Geschwurbel.
            </p>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container-page">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}/`} className="card card-hover group flex flex-col">
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      TOPIC_COLOR[p.topic] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {p.topic}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" /> {p.minutes} Min
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {p.title}
                </h2>
                <p className="text-sm text-gray-600 flex-1 mb-4">{p.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 mt-auto">
                  Weiterlesen <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-10">
            Vollständige Artikel-Inhalte folgen in Phase 5. Aktuell sind dies Themen-Stubs.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="card text-center max-w-xl mx-auto">
            <p className="eyebrow mb-3">Newsletter</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Einmal im Monat. Pain-driven.</h2>
            <p className="text-gray-600 mb-7">
              Ein Artikel pro Monat per E-Mail — kein Marketing, nur Substanz. Jederzeit kündbar.
            </p>
            <p className="text-xs text-gray-400">
              Anmeldung folgt mit dem Launch der ersten Artikel. Bis dahin gerne direkt unter{' '}
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
