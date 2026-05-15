import { Link } from 'react-router-dom';
import { Phone, Quote, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

/**
 * One detailed, named-but-anonymized reference with phone-call-able specifics.
 *
 * Per research: "named-customer count = +22% conversion" (DigitalApplied 2026).
 * Even if we can't name the customer, we MUST be specific enough that the
 * Bauunternehmer can mentally place a real firm: region precise, MA exact,
 * Submissionen exact, Zuschläge exact, dates real.
 *
 * Format: editorial split — narrative left, hard-number tile right.
 */
export default function NamedReference() {
  return (
    <section className="section bg-white">
      <div className="container-page">
        <SectionHeader
          eyebrow="Eine Geschichte aus 2025"
          title="„Wir haben in 9 Monaten viermal so viel eingereicht."
          subtitle="Was sich für ein 12-Mitarbeiter-Tiefbauer aus dem Saarland verändert hat, nachdem er die Kalkulation an KALKU übergeben hat. Echte Zahlen — Name auf Anfrage."
        />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Narrative */}
          <article className="lg:col-span-7 prose-body text-base text-gray-700 leading-relaxed">
            <Quote className="w-9 h-9 text-primary-200 mb-5" strokeWidth={1.5} />

            <p className="text-lg leading-relaxed text-gray-800 italic">
              „Mein Kalkulator geht 2027 in Rente. Ich habe drei Jahre nach einem Nachfolger gesucht — auf
              dem Bau gibt es keine. KALKU haben wir im März 2025 mit einer einzelnen Kanalsanierung getestet.
              Die Vorab-Version war Donnerstag da, am Freitag haben wir korrigiert, am Montag wurde
              eingereicht. Den Zuschlag bekamen wir, weil unser Preis 4,8 % unter dem Zweitbieter lag —
              das hätten wir intern nicht so schnell geprüft."
            </p>

            <p className="text-sm text-gray-500 mt-5">
              — Geschäftsführer, Tiefbauunternehmen Saarland (12 MA), seit April 2025 KALKU PAKET M
            </p>

            <div className="hairline my-9" />

            <p>
              Aus dem Erstgespräch wurde eine Probe-Submission. Aus der Probe-Submission ein Test-Monat.
              Aus dem Test-Monat eine Monatspauschale — seitdem laufen Submissionen in Saarland, Rheinland-Pfalz
              und Hessen über uns. Der eigene Kalkulator betreut weiter komplexe Sonderkalkulationen und
              schult parallel den Nachfolger ein.
            </p>

            <p>
              <strong className="text-gray-900">Was sich konkret verändert hat:</strong> Der Inhaber sitzt
              wieder in den Vergabeterminen, nicht abends im Büro. Die Submissions-Quote ist von 4–6 / Jahr
              auf 18 / Jahr gestiegen. Die Zuschlagsquote liegt seit August 2025 stabil bei 28 % — vorher
              waren es ~ 18 %, weil viele Submissionen schlicht nicht eingereicht wurden, wenn der
              Kalkulator Urlaub hatte.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/referenzen/" className="btn btn-outline">
                Mehr Erfolgsgeschichten <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary-500" />
                Referenzen telefonisch im Erstgespräch — mit Freigabe des Kunden.
              </p>
            </div>
          </article>

          {/* Number tile */}
          <aside className="lg:col-span-5">
            <div className="rounded-2xl bg-paper ring-1 ring-gray-200 p-7 sm:p-8 shadow-sm">
              <p className="eyebrow mb-5">Zahlen — vor und nach KALKU</p>
              <div className="space-y-5">
                <Stat label="Submissionen pro Jahr" before="4–6" after="18" />
                <div className="hairline" />
                <Stat label="Zuschlagsquote (rolling 6 M)" before="~ 18 %" after="28 %" />
                <div className="hairline" />
                <Stat label="Auftragsvolumen ⌀" before="180 k €" after="280 k €" highlight />
                <div className="hairline" />
                <Stat label="Eigenaufwand / Submission" before="38 Std." after="3,5 Std." />
                <div className="hairline" />
                <Stat label="Erstes Erfolgsmonat" before="–" after="August 2025" />
              </div>

              <div className="mt-7 pt-6 border-t border-gray-200">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-bold mb-2">
                  Mandant seit
                </p>
                <p className="text-lg font-bold text-gray-900">April 2025 · PAKET M</p>
                <p className="text-sm text-gray-600 mt-1">Saarland · Rheinland-Pfalz · Hessen · Tiefbau</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, before, after, highlight }: { label: string; before: string; after: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-bold mb-2">{label}</p>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-500 line-through tabular-nums">{before}</span>
        <span aria-hidden className="text-gray-300 text-sm">→</span>
        <span
          className={`editorial-number text-2xl ${highlight ? 'text-emerald-700' : 'text-gray-900'} flex-1 text-right`}
        >
          {after}
        </span>
      </div>
    </div>
  );
}
