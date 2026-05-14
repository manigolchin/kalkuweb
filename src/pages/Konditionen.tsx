import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { canonical } from '@/lib/seo';
import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';
import PricingTiles from '@/components/sections/PricingTiles';
import SelfCheck from '@/components/SelfCheck';
import { MINDESTVORAUSSETZUNGEN } from '@/lib/constants';

const TITLE = 'Konditionen — Festpreis ab 200 € | KALKU';
const DESC =
  'Transparente Preise: Einzelbeauftragung 200–600 € + 5 % Erfolgsprovision. PAKET M 3.000 €/Mon · PAKET L 5.000 €/Mon. Monatlich kündbar. Loyalität & Gebietsschutz inklusive.';

const FAQ = [
  {
    q: 'Wann wird die Pauschale fällig?',
    a: 'Die Pauschale wird mit Lieferung der fertigen Kalkulation fällig — also nach Ihrer Einsicht und vor der Einreichung. Bei der Monatspauschale (M oder L) erfolgt die Abrechnung jeweils zum Monatsersten im Voraus.',
  },
  {
    q: 'Was passiert bei der Erfolgsprovision, wenn der Auftraggeber nicht zahlt?',
    a: 'Die Erfolgsprovision wird erst nach erfolgreicher Auftragserteilung an Sie fällig. Sollte ein öffentlicher Auftraggeber wider Erwarten nicht oder nur teilweise zahlen, sprechen wir die Aufteilung individuell ab — VOB-Regelfall ist Zahlung innerhalb von 3 Wochen.',
  },
  {
    q: 'Wie schnell können Sie eine Kalkulation liefern?',
    a: 'Das hängt vom Umfang des Leistungsverzeichnisses ab. Reguläre Bearbeitung in 48–72 h. Bei knappen Submissionsfristen arbeiten wir auch über Nacht oder am Wochenende — ohne Aufpreis.',
  },
  {
    q: 'Können Sie auch für unsere Wettbewerber kalkulieren?',
    a: 'Nein. Pro Ausschreibung arbeiten wir ausschließlich für einen Kunden. Mehr noch: Im Rahmen des Gebietsschutzes nehmen wir in Ihrem Einzugsgebiet und Gewerk keine weiteren Kunden an.',
  },
  {
    q: 'Welche Kündigungsfrist hat die Monatspauschale?',
    a: 'Beide Monatspakete (M und L) sind monatlich zum Monatsende kündbar — keine Mindestlaufzeit, kein Kleingedrucktes.',
  },
  {
    q: 'Was ist im PAKET M nicht enthalten, was PAKET L abdeckt?',
    a: 'PAKET L bietet eine niedrigere Erfolgsprovision (2,9 % statt 3,9 %) und priorisierte Bearbeitung kurzfristiger Submissionen. Die Recherche-Leistung ist in beiden Paketen identisch.',
  },
];

export default function Konditionen() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/konditionen/')} />
      </Helmet>

      {/* HERO */}
      <section className="section bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="eyebrow mb-3">Konditionen</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              Faire Konditionen.{' '}
              <span className="text-primary-500">Sie zahlen, wenn wir liefern.</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Zwei Modelle — passend zu Ihrem Bedarf. Kein Setup, keine Mindestlaufzeit, monatlich
              kündbar. Wir spielen mit offenen Karten — das ist in unserer Branche selten.
            </p>
            <Link to="/kontakt/" className="btn btn-success btn-lg">
              Beratung vereinbaren <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING TILES — bare so it merges seamlessly */}
      <section className="section-tight">
        <div className="container-page">
          <PricingTiles bare />
        </div>
      </section>

      {/* LOYALITÄT & GEBIETSSCHUTZ */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Garantie"
            title="Loyalität & Gebietsschutz."
            subtitle="Zwei Versprechen, die uns vom restlichen Markt unterscheiden."
          />
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            <div className="card">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Loyalität</h3>
              <p className="text-gray-600 leading-relaxed">
                Pro Ausschreibung arbeiten wir ausschließlich für ein Unternehmen. Kein Bieter
                erfährt jemals, was ein anderer Bieter kalkuliert hat — auch nicht in Andeutungen.
                Vertraulichkeit ist nicht verhandelbar.
              </p>
            </div>
            <div className="card">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5">
                <Lock className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gebietsschutz</h3>
              <p className="text-gray-600 leading-relaxed">
                Wenn Sie mit uns zusammenarbeiten und in einem klaren Einzugsgebiet und Gewerk aktiv
                sind, nehmen wir dort keine weiteren Kunden an. Der Schutz gilt ab dem ersten
                erfolgreichen Auftrag und solange Sie aktiv mit uns arbeiten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MINDESTVORAUSSETZUNGEN */}
      <section className="section">
        <div className="container-page">
          <SectionHeader
            eyebrow="Voraussetzungen"
            title="Für wen wir arbeiten."
            subtitle="Damit eine Zusammenarbeit für beide Seiten Sinn ergibt — diese drei Punkte sollten Sie mitbringen."
          />
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {MINDESTVORAUSSETZUNGEN.map((m, i) => (
              <div key={m.short} className="card-flat text-center">
                <p className="text-3xl font-bold text-primary-600 mb-2">0{i + 1}</p>
                <p className="font-semibold text-gray-900">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SELF-CHECK */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SelfCheck />
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader
            eyebrow="Häufige Fragen"
            title="Was Bauunternehmer am häufigsten fragen."
          />
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((q) => (
              <FaqItem key={q.q} question={q.q} answer={q.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-page">
          <div className="card text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Bereit, Ihre nächste Submission abzugeben?
            </h2>
            <p className="text-gray-600 mb-6">
              Erstgespräch in 5 Minuten. Kostenlos, unverbindlich, ohne Verkaufsgespräch.
            </p>
            <Link to="/kontakt/" className="btn btn-success btn-lg">
              Erstgespräch vereinbaren <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
