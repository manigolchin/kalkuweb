import { useParams, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Layers,
  AlertTriangle,
  Wrench,
  FileSpreadsheet,
  Calculator,
  Users,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { canonical, faqPageSchema, breadcrumbSchema } from '@/lib/seo';
import { TRADES } from '@/lib/constants';
import { TRADE_CONTENT } from '@/lib/tradeContent';
import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';
import UrgencyCta from '@/components/sections/UrgencyCta';
import MultiStepForm from '@/components/forms/MultiStepForm';

const PILL_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  stone: 'bg-stone-100 text-stone-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
};

const HERO_BG: Record<string, string> = {
  emerald: 'from-emerald-50/50 to-white',
  sky: 'from-sky-50/50 to-white',
  stone: 'from-stone-50/50 to-white',
  yellow: 'from-yellow-50/50 to-white',
  orange: 'from-orange-50/50 to-white',
  blue: 'from-blue-50/50 to-white',
  red: 'from-red-50/50 to-white',
  slate: 'from-slate-50/50 to-white',
  amber: 'from-amber-50/50 to-white',
  rose: 'from-rose-50/50 to-white',
};

const ACCENT_TEXT: Record<string, string> = {
  emerald: 'text-emerald-700',
  sky: 'text-sky-700',
  stone: 'text-stone-700',
  yellow: 'text-yellow-700',
  orange: 'text-orange-700',
  blue: 'text-blue-700',
  red: 'text-red-700',
  slate: 'text-slate-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
};

const ACCENT_ICON_BG: Record<string, string> = {
  emerald: 'bg-emerald-50',
  sky: 'bg-sky-50',
  stone: 'bg-stone-50',
  yellow: 'bg-yellow-50',
  orange: 'bg-orange-50',
  blue: 'bg-blue-50',
  red: 'bg-red-50',
  slate: 'bg-slate-50',
  amber: 'bg-amber-50',
  rose: 'bg-rose-50',
};

const TOOL_ICONS: Record<string, typeof FileSpreadsheet> = {
  'gaeb-konverter': FileSpreadsheet,
  kalkulator: Calculator,
  mittellohn: Users,
  'frist-rechner': Calendar,
  buergschaft: ShieldCheck,
};

export default function Gewerk() {
  const { slug } = useParams<{ slug: string }>();
  const trade = TRADES.find((t) => t.slug === slug);

  if (!trade) return <Navigate to="/leistungen/" replace />;

  const content = TRADE_CONTENT[trade.slug];
  const title = `${trade.name}-Kalkulation als Dienstleister | KALKU`;
  const description = `Outsourced ${trade.name}-Kalkulation für Bauunternehmen. ${trade.tagline} VOB/A-konform, in 48 h, ab 200 € Festpreis. Saarbrücken, bundesweit.`;
  const otherTrades = TRADES.filter((t) => t.slug !== trade.slug).slice(0, 3);
  const pillClass = PILL_CLASSES[trade.color] ?? PILL_CLASSES.stone;
  const heroBg = HERO_BG[trade.color] ?? HERO_BG.stone;
  const accentText = ACCENT_TEXT[trade.color] ?? ACCENT_TEXT.stone;
  const accentIconBg = ACCENT_ICON_BG[trade.color] ?? ACCENT_ICON_BG.stone;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical(`/leistungen/${trade.slug}/`)} />
        {content?.faq && content.faq.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(faqPageSchema(content.faq))}</script>
        )}
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbSchema([
              { name: 'Start', path: '/' },
              { name: 'Leistungen', path: '/leistungen/' },
              { name: trade.name, path: `/leistungen/${trade.slug}/` },
            ]),
          )}
        </script>
      </Helmet>

      {/* HERO */}
      <section className={`section bg-gradient-to-br ${heroBg}`}>
        <div className="container-page">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 ${pillClass}`}
            >
              {trade.name}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              {trade.name}-Kalkulation. Wir bepreisen — Sie unterschreiben.
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {content?.heroSubtitle ?? trade.tagline}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="#anfrage-formular" className="btn btn-success btn-lg">
                {trade.name}-Submission anfragen
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/konditionen/" className="btn btn-outline btn-lg">
                Konditionen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* EINORDNUNG */}
      {content?.einordnung && (
        <section className="section-tight">
          <div className="container-page">
            <div className="max-w-3xl mx-auto card-flat">
              <p className={`text-xs uppercase tracking-[0.18em] font-bold ${accentText} mb-3 inline-flex items-center gap-1.5`}>
                <BookOpen className="w-3.5 h-3.5" /> Was umfasst {trade.name}?
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">{content.einordnung}</p>
            </div>
          </div>
        </section>
      )}

      {/* NORMEN + REGELWERKE */}
      {content?.normen && content.normen.length > 0 && (
        <section className="section bg-gray-50">
          <div className="container-page">
            <SectionHeader
              eyebrow="Normen + Regelwerke"
              title={`${trade.name} nach VOB/C und DIN.`}
              subtitle={`Wir bepreisen normkonform — diese Regelwerke sind für ${trade.name} maßgeblich.`}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {content.normen.map((n) => (
                <div key={n.code} className="card flex gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${accentIconBg}`}
                  >
                    <BookOpen className={`w-5 h-5 ${accentText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs uppercase tracking-wider font-bold ${accentText} mb-1`}>
                      {n.code}
                    </p>
                    <p className="font-semibold text-gray-900 mb-1.5 text-sm">{n.titel}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TYPISCHE POSITIONEN */}
      {content?.typPositionen && content.typPositionen.length > 0 && (
        <section className="section">
          <div className="container-page">
            <SectionHeader
              eyebrow="Typische LV-Positionen"
              title={`Diese Positionen kalkulieren wir täglich im ${trade.name}.`}
              subtitle="Aus tausenden Submissionen — typische Position-Cluster pro Sub-Gewerk."
            />
            <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto">
              {content.typPositionen.map((g) => (
                <div key={g.kategorie} className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className={`w-5 h-5 ${accentText}`} />
                    <h3 className="font-bold text-gray-900">{g.kategorie}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {g.beispiele.map((b) => (
                      <li key={b.text} className="flex items-baseline gap-3 text-sm">
                        <span className="flex-1 text-gray-700">{b.text}</span>
                        <span
                          className={`flex-shrink-0 text-xs font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded ${pillClass}`}
                        >
                          {b.einheit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* KALKULATIONS-FALLSTRICKE */}
      {content?.fallstricke && content.fallstricke.length > 0 && (
        <section className="section bg-gray-50">
          <div className="container-page">
            <SectionHeader
              eyebrow="Was wir besonders prüfen"
              title={`Typische Kalkulations-Fallstricke im ${trade.name}.`}
              subtitle="Hier verschenken Bauunternehmer Marge oder geraten in Nachträge — wir kennen die Klassiker."
            />
            <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto">
              {content.fallstricke.map((f) => (
                <div key={f.titel} className="card flex gap-4">
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-amber-50">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2">{f.titel}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TOOLS FÜR DIESES GEWERK */}
      {content?.toolHighlights && content.toolHighlights.length > 0 && (
        <section className="section">
          <div className="container-page">
            <SectionHeader
              eyebrow="Tools für Sie"
              title={`Kostenlose Tools für die ${trade.name}-Kalkulation.`}
              subtitle="Auch wenn Sie selbst kalkulieren — unsere kostenlosen Browser-Tools helfen direkt."
            />
            <div className="grid gap-5 md:grid-cols-3 max-w-5xl mx-auto">
              {content.toolHighlights.map((t) => {
                const Icon = TOOL_ICONS[t.slug] ?? Wrench;
                return (
                  <Link
                    key={t.slug}
                    to={`/tools/${t.slug}/`}
                    className="card card-hover group flex flex-col"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${accentIconBg}`}
                    >
                      <Icon className={`w-6 h-6 ${accentText}`} strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-4">{t.warum}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 group-hover:text-primary-800">
                      Tool öffnen <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* LEISTUNGEN / DELIVERABLES */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Was wir liefern"
            title={`Komplette ${trade.name}-Kalkulation aus einer Hand.`}
            subtitle="Konkret für dieses Gewerk — keine Pauschal-Versprechen."
          />
          <div className="grid gap-4 sm:grid-cols-2 max-w-5xl mx-auto">
            {(content?.deliverables ?? [
              { titel: 'LV-Bepreisung Position für Position', desc: 'Jede Position einzeln kalkuliert nach VOB/C.' },
              { titel: 'EFB 221/222/223', desc: 'Preisermittlungs-Formblätter bei öffentlichen Vergaben.' },
              { titel: 'Urkalkulation', desc: 'Lückenlos für Vergabe-Gespräche.' },
              { titel: 'Materialpreis-Recherche', desc: 'Aktuell, regional, dokumentiert.' },
            ]).map((d) => (
              <div key={d.titel} className="card-flat flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-kalku-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{d.titel}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {content?.faq && content.faq.length > 0 && (
        <section className="section">
          <div className="container-page">
            <SectionHeader eyebrow="Häufige Fragen" title={`Zur ${trade.name}-Kalkulation.`} />
            <div className="max-w-3xl mx-auto space-y-3">
              {content.faq.map((q) => (
                <FaqItem key={q.q} question={q.q} answer={q.a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CROSS-LINKS */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader eyebrow="Auch interessant" title="Andere Gewerke aus unserem Portfolio." />
          <div className="grid gap-5 md:grid-cols-3 max-w-4xl mx-auto">
            {otherTrades.map((t) => (
              <Link
                key={t.slug}
                to={`/leistungen/${t.slug}/`}
                className="card card-hover group flex flex-col"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {t.name}
                </h3>
                <p className="text-sm text-gray-600 flex-1 mb-4">{t.tagline}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                  Mehr erfahren <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* IN-PAGE FORM with prefilled gewerk */}
      <section id="anfrage-formular" className="section scroll-mt-24">
        <div className="container-page">
          <SectionHeader
            eyebrow="Anfrage-Formular"
            title={`${trade.name}-Submission anfragen`}
            subtitle="In drei Schritten — wir melden uns innerhalb eines Werktages."
          />
          <MultiStepForm defaultGewerk={trade.name} />
        </div>
      </section>

      {/* URGENCY CTA */}
      <UrgencyCta />
    </>
  );
}
