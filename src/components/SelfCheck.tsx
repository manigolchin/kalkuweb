import { useState } from 'react';
import { CheckCircle2, XCircle, Calendar, Calculator, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Answer = 'yes' | 'no' | null;

const QUESTIONS = [
  {
    id: 'mitarbeiter',
    text: 'Hat Ihr Unternehmen mindestens 3 Mitarbeiter?',
    why: 'Unter 3 MA passen unsere Strukturen meist nicht.',
  },
  {
    id: 'alter',
    text: 'Besteht Ihr Unternehmen seit mindestens 6 Monaten?',
    why: 'Eignungsnachweise brauchen erste Vergleichswerte.',
  },
  {
    id: 'referenzen',
    text: 'Haben Sie 3 oder mehr vergleichbare Referenzprojekte?',
    why: 'Öffentliche Auftraggeber prüfen Eignung über Referenzen.',
  },
  {
    id: 'gewerk',
    text: 'Arbeiten Sie in einem unserer 7 Gewerke (GaLaBau, Tiefbau, Hochbau, Elektro, Haustechnik, Fenster, Schadstoff)?',
    why: 'Wir haben pro Gewerk dedizierte Kalkulatoren.',
  },
] as const;

type QuestionId = (typeof QUESTIONS)[number]['id'];

export default function SelfCheck() {
  const [answers, setAnswers] = useState<Record<QuestionId, Answer>>({
    mitarbeiter: null,
    alter: null,
    referenzen: null,
    gewerk: null,
  });

  function answer(id: QuestionId, val: Answer) {
    setAnswers((a) => ({ ...a, [id]: val }));
  }

  const allAnswered = Object.values(answers).every((v) => v !== null);
  const allYes = Object.values(answers).every((v) => v === 'yes');
  const noCount = Object.values(answers).filter((v) => v === 'no').length;

  return (
    <div className="card max-w-2xl mx-auto">
      <p className="eyebrow mb-3">Self-Check</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Sind wir der richtige Partner?</h2>
      <p className="text-gray-600 mb-7 text-sm">
        Vier Fragen, eine Minute — und Sie wissen, ob KALKU für Ihr Unternehmen passt. Ohne
        Verkaufsgespräch.
      </p>

      <div className="space-y-4">
        {QUESTIONS.map((q, i) => (
          <div key={q.id} className="border-l-2 border-gray-200 pl-4">
            <p className="font-medium text-gray-900 mb-2">
              <span className="text-gray-400 mr-2 font-mono text-sm">0{i + 1}</span>
              {q.text}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => answer(q.id, 'yes')}
                className={cn(
                  'btn btn-sm',
                  answers[q.id] === 'yes' ? 'btn-success' : 'btn-outline',
                )}
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => answer(q.id, 'no')}
                className={cn(
                  'btn btn-sm',
                  answers[q.id] === 'no' ? 'bg-gray-200 text-gray-700' : 'btn-outline',
                )}
              >
                Nein
              </button>
            </div>
            {answers[q.id] === 'no' && (
              <p className="text-xs text-gray-500 mt-2 italic">{q.why}</p>
            )}
          </div>
        ))}
      </div>

      {allAnswered && (
        <div
          className={cn(
            'mt-7 pt-7 border-t',
            allYes ? 'border-emerald-100' : 'border-gray-100',
          )}
        >
          {allYes ? (
            <div className="bg-emerald-50 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-emerald-900 mb-2">Wir passen zusammen.</h3>
              <p className="text-sm text-emerald-700 mb-5">
                Alle Voraussetzungen erfüllt. Vereinbaren Sie ein 5-Minuten-Erstgespräch — wir
                besprechen Ihren konkreten Bedarf.
              </p>
              <Link to="/kontakt/" className="btn btn-success">
                Erstgespräch vereinbaren <Calendar className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-6">
              <XCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                {noCount === 1
                  ? 'Eine Voraussetzung fehlt.'
                  : `${noCount} Voraussetzungen fehlen.`}
              </h3>
              <p className="text-sm text-gray-600 mb-5 text-center">
                Eine Zusammenarbeit lohnt sich für beide Seiten erst ab einer gewissen
                Betriebsgröße. Diese kostenlosen Tools helfen Ihnen trotzdem weiter:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  to="/tools/kalkulator/"
                  className="card-flat card-hover flex items-center gap-3"
                >
                  <Calculator className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Position-Kalkulator</p>
                    <p className="text-xs text-gray-500">EP/GP berechnen</p>
                  </div>
                </Link>
                <Link
                  to="/tools/gaeb-konverter/"
                  className="card-flat card-hover flex items-center gap-3"
                >
                  <FileSpreadsheet className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">GAEB-Konverter</p>
                    <p className="text-xs text-gray-500">Datei öffnen</p>
                  </div>
                </Link>
              </div>
              <p className="text-xs text-gray-500 mt-5 text-center">
                Wenn Ihr Betrieb in 6–12 Monaten gewachsen ist — kommen Sie gerne zurück.
              </p>
            </div>
          )}
        </div>
      )}

      {!allAnswered && (
        <p className="text-xs text-gray-400 text-center mt-7 pt-7 border-t border-gray-100">
          {Object.values(answers).filter((v) => v !== null).length} von 4 beantwortet
        </p>
      )}
    </div>
  );
}
