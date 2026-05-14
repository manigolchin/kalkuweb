import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { canonical } from '@/lib/seo';
import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';

const TITLE = 'So läuft eine KALKU-Zusammenarbeit ab | KALKU';
const DESC =
  'In 5 Schritten von der Anfrage bis zum Vergabeergebnis. Erstgespräch, Vollmacht, Kalkulation, Einreichung, Nachverfolgung — was Sie tun, was wir tun.';

const STEPS = [
  {
    n: '01',
    title: 'Erstgespräch & Eignungsprüfung',
    you: 'Sie geben uns Branche, Mitarbeiterzahl und Einzugsgebiet — telefonisch oder per Formular.',
    we: 'Wir prüfen kostenlos, ob die Voraussetzungen passen, und besprechen Mittellohn, Verrechnungssätze und Zuschläge.',
  },
  {
    n: '02',
    title: 'Beauftragung & Vollmacht',
    you: 'Sie unterschreiben die Vollmacht für Materialpreisanfragen und Einreichung im Namen Ihres Unternehmens.',
    we: 'Wir treten ab sofort nach außen als Ihre interne Kalkulationsabteilung auf — niemand sieht, dass wir extern sind.',
  },
  {
    n: '03',
    title: 'Kalkulation & Einsicht',
    you: 'Sie schicken das LV (GAEB, PDF, Papier — egal). Sie erhalten die fertige Kalkulation zur Einsicht und können Änderungen anstoßen.',
    we: 'Wir kalkulieren jede Position einzeln auf Zeit, Geräte und Material. Wir füllen alle Formblätter (221, 222, 223 + Urkalkulation) lückenlos aus.',
  },
  {
    n: '04',
    title: 'Fristgerechte Einreichung',
    you: 'Sie geben uns nach Einsicht das Go — oder bei Vertrauen direkt die Vollmacht zur Einreichung.',
    we: 'Wir reichen das Angebot fristgerecht ein. Auch über Nacht oder am Wochenende, wenn die Submission morgen ist.',
  },
  {
    n: '05',
    title: 'Ergebnis & Nachbereitung',
    you: 'Sie erhalten das Vergabeergebnis direkt von uns — und wenn Sie den Zuschlag haben, gehts ab auf die Baustelle.',
    we: 'Wir leiten das Ergebnis weiter. Bei Zuschlag: Unterstützung bei Nachforderungen und Vergabegesprächen. Bei Verlust: Analyse, was wir besser machen können.',
  },
];

const FAQ = [
  {
    q: 'Was passiert, wenn das LV nicht als GAEB-Datei vorliegt?',
    a: 'Kein Problem. Wir akzeptieren GAEB (X81/X83/X84/D83/D84/P83), PDF und sogar gescannte Papier-LVs. Bei Papier oder PDF rechnen wir intern mit etwas mehr Bearbeitungszeit, aber an der Pauschale ändert sich nichts.',
  },
  {
    q: 'Wer kommuniziert mit dem Auftraggeber?',
    a: 'Wir — im Namen Ihres Unternehmens. Bieterfragen, Aufklärungsersuchen, Termin-Bestätigungen: alles läuft über uns. Sie sehen jeden Vorgang als CC-Empfänger und können jederzeit eingreifen.',
  },
  {
    q: 'Bekommen wir die Kalkulation in unserem internen Format zurück?',
    a: 'Ja. Wir liefern parallel zur eingereichten GAEB-Datei eine Excel-Übersicht mit allen Positionen, Zeitwerten und Materialkosten — exakt so, wie Sie es für Ihre Bauleitung brauchen.',
  },
  {
    q: 'Können wir auch nur die Formblätter ausfüllen lassen, wenn wir selbst kalkuliert haben?',
    a: 'Ja, das ist ein Sonderfall der Einzelbeauftragung. Pauschale liegt dann am unteren Ende des Bandes (200–300 €), je nach LV-Umfang.',
  },
  {
    q: 'Wie schnell bekommen wir bei kurzfristigen Submissionen eine Rückmeldung?',
    a: 'In der Regel innerhalb von 60 Minuten — auch nachts und am Wochenende. Schicken Sie uns das LV einfach per E-Mail, WhatsApp oder Telefon, wir melden uns sofort, ob wir es schaffen.',
  },
];

export default function Ablauf() {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={canonical('/ablauf/')} />
      </Helmet>

      {/* HERO */}
      <section className="section bg-gradient-to-br from-gray-50 to-white">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto">
            <p className="eyebrow mb-3">Ablauf</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5 leading-tight">
              In fünf Schritten zum Zuschlag.
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Vom Erstgespräch bis zur Nachbereitung — was passiert, wer macht was, und was Sie
              dazu beitragen müssen.
            </p>
          </div>
        </div>
      </section>

      {/* DETAILED STEPS */}
      <section className="section-tight">
        <div className="container-page">
          <div className="space-y-6 max-w-5xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.n} className="card">
                <div className="grid lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-2">
                    <p className="text-5xl font-bold text-primary-100 leading-none">{s.n}</p>
                    <h3 className="font-bold text-gray-900 mt-3">{s.title}</h3>
                  </div>
                  <div className="lg:col-span-5">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                      Was Sie tun
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{s.you}</p>
                  </div>
                  <div className="lg:col-span-5">
                    <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold mb-2">
                      Was wir tun
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{s.we}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-gray-50">
        <div className="container-page">
          <SectionHeader eyebrow="Häufige Fragen zum Ablauf" title="Was Sie noch wissen sollten." />
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
              Bereit für Schritt 1?
            </h2>
            <p className="text-gray-600 mb-6">
              Erstgespräch in 5 Minuten — kostenlos, unverbindlich.
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
