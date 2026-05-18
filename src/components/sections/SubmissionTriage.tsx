import { useMemo, useState } from 'react';
import { Calendar, ArrowRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TRADES, NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';

type Verdict = 'easy' | 'tight' | 'critical' | null;

function calcVerdict(daysAway: number): Verdict {
  if (Number.isNaN(daysAway)) return null;
  if (daysAway >= 5) return 'easy';
  if (daysAway >= 2) return 'tight';
  return 'critical';
}

/**
 * Submission triage — the "qualifier widget" that signals operational competence
 * without requiring sales contact. Asks 2 questions, returns a routed answer.
 *
 * Pattern inspired by Cosuno's hero-search-field. For a service that promises
 * "wir schaffen das auch über Nacht", letting the user TEST that claim against
 * a real date is a stronger trust-builder than any testimonial.
 */
export default function SubmissionTriage() {
  const [date, setDate] = useState('');
  const [trade, setTrade] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const verdict: Verdict = useMemo(() => {
    if (!submitted || !date || !trade) return null;
    const d = new Date(date);
    const days = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return calcVerdict(days);
  }, [submitted, date, trade, today]);

  const daysAway = date
    ? Math.floor((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !trade) return;
    setSubmitted(true);
  }

  return (
    <section className="section bg-paper-soft">
      <div className="container-page">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow-pill mb-4">
              <Clock className="w-3 h-3" /> Submissions-Check
            </p>
            <h2 className="display-h2 mb-4">
              Wie viel Zeit haben Sie noch?
            </h2>
            <p className="prose-body mx-auto text-lg">
              Submissionstermin und Gewerk eingeben — wir sagen Ihnen sofort, ob wir Ihr LV in der
              Zeit bepreisen können. Keine Anmeldung, keine E-Mail. Nur Klarheit.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 p-6 sm:p-8"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block">
                <span className="label flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  Submissionstermin
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  min={todayIso}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSubmitted(false);
                  }}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="label">Gewerk</span>
                <select
                  required
                  value={trade}
                  onChange={(e) => {
                    setTrade(e.target.value);
                    setSubmitted(false);
                  }}
                  className="input"
                >
                  <option value="">Bitte wählen</option>
                  {TRADES.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" className="btn btn-success btn-lg cta-magnetic">
                Schaffen wir das?
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Result panel */}
          {verdict && (
            <div className="mt-5">
              <ResultCard verdict={verdict} daysAway={daysAway} trade={trade} />
            </div>
          )}

          <p className="text-center text-xs text-gray-500 mt-6">
            Auch kurzfristige Submissionen sind unser Tagesgeschäft. Wenn die Zeit knapp ist,{' '}
            <a href={telHref(NAP.phone)} className="text-primary-700 font-medium hover:underline">
              rufen Sie an
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function ResultCard({ verdict, daysAway, trade }: { verdict: Verdict; daysAway: number; trade: string }) {
  const tradeLabel = TRADES.find((t) => t.slug === trade)?.name ?? trade;

  if (verdict === 'easy') {
    return (
      <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-6 sm:p-7 flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-700" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider font-bold text-emerald-700 mb-1">
            Schaffen wir komfortabel
          </p>
          <p className="text-lg font-bold text-emerald-900 mb-1">
            {daysAway} Tage — reichlich Zeit für ein {tradeLabel}-LV.
          </p>
          <p className="text-sm text-emerald-900/80 mb-4 leading-relaxed">
            Reguläre Bearbeitung in 24–48 h. Vorab-Entwurf zur Einsicht 1 Werktag vor Submission.
            Erstgespräch heute oder morgen genügt.
          </p>
          <Link to="/kontakt/" className="btn btn-success">
            Erstgespräch vereinbaren <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (verdict === 'tight') {
    return (
      <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-6 sm:p-7 flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock className="w-6 h-6 text-amber-700" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider font-bold text-amber-700 mb-1">
            Knapp — aber machbar
          </p>
          <p className="text-lg font-bold text-amber-900 mb-1">
            {daysAway} Tage. {tradeLabel}-LV mit Priorisierung.
          </p>
          <p className="text-sm text-amber-900/80 mb-4 leading-relaxed">
            Wir können es schaffen — Bearbeitung läuft vorgezogen, ggf. mit Nacht-Schicht. Sie sollten
            uns aber{' '}
            <strong>heute noch</strong> anrufen, damit wir den Slot freihalten.
          </p>
          <a href={telHref(NAP.phone)} className="btn btn-success">
            Jetzt anrufen — {NAP.phone}
          </a>
        </div>
      </div>
    );
  }

  // critical
  return (
    <div className="rounded-2xl bg-red-50 ring-1 ring-red-200 p-6 sm:p-7 flex items-start gap-4">
      <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-6 h-6 text-red-700" strokeWidth={2.5} />
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wider font-bold text-red-700 mb-1">
          Höchste Eile
        </p>
        <p className="text-lg font-bold text-red-900 mb-1">
          {daysAway <= 0 ? 'Heute oder morgen' : `Nur ${daysAway} Tage`} — wir greifen direkt zum Hörer.
        </p>
        <p className="text-sm text-red-900/80 mb-4 leading-relaxed">
          So kurzfristig laufen Submissionen über die Wochenend- und Nachtschicht. Rufen Sie uns{' '}
          <strong>jetzt</strong> an — wir entscheiden in 10 Minuten, ob wir es schaffen.
        </p>
        <a href={telHref(NAP.phone)} className="btn btn-success btn-lg cta-magnetic">
          Sofort anrufen — {NAP.phone}
        </a>
      </div>
    </div>
  );
}
