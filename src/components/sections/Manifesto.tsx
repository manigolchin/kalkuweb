import { Phone, Mail } from 'lucide-react';
import { NAP } from '@/lib/constants';
import { telHref } from '@/lib/utils';

/**
 * The Manifesto — the founder's first-person argument, written like a letter.
 *
 * This is the section that separates a generic Kalku-site from a
 * Saarbrücken-Inhaber's site. Conservative Mittelstand buyers respond to
 * named, accountable, direct human voice — not "We are passionate about
 * helping construction companies succeed." (Source: Basecamp pattern,
 * Edelman 2024, conversion psychology research.)
 *
 * Visual: editorial paper, monogram, signed at the bottom.
 */
export default function Manifesto() {
  return (
    <section className="section bg-paper">
      <div className="container-page">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div
              className="monogram w-14 h-14 rounded-2xl bg-primary-700 text-white text-xl shadow-md"
              aria-hidden
            >
              AC
            </div>
            <div>
              <p className="eyebrow mb-0.5">Vom Inhaber</p>
              <p className="text-sm text-gray-600">
                Alaatdin Coksari · Gründer, KALKU Baukalkulationen
              </p>
            </div>
          </div>

          <div className="space-y-5 text-gray-800 leading-relaxed text-lg">
            <p>
              Vielleicht haben Sie heute Morgen einen Submissionstermin geschafft. Vielleicht haben Sie
              gestern Nacht um 23 Uhr noch ein LV bepreist, weil Ihr Kalkulator in Rente geht und der
              Nachfolger noch nicht eingearbeitet ist.
            </p>
            <p>
              <strong className="text-gray-900">
                Das ist der Punkt, an dem wir ins Spiel kommen.
              </strong>{' '}
              Wir sind kein SaaS-Tool. Keine KI-Plattform. Sondern{' '}
              <span className="underline decoration-primary-300 decoration-2 underline-offset-4">
                vier Kalkulatoren in Saarbrücken
              </span>
              , die Ihr LV bepreisen, die Formblätter 221 / 222 / 223 ausfüllen und im Namen Ihres
              Unternehmens fristgerecht einreichen. Auch über Nacht. Auch am Wochenende.
            </p>
            <p>
              Wir sind keine Software, weil Software bei der zwölften Position aufgibt, wo Erfahrung
              eingeht. Wir sind keine Berater, weil Berater nicht selbst eine Schalung kalkulieren können.
              Wir sind <em>Kalkulatoren</em> — Handwerker und Bauingenieure, die seit über 20 Jahren in
              VOB/A-Submissionen denken.
            </p>
            <p className="text-gray-900 font-semibold">
              Wenn Sie sich mit der Frage befassen, ob Sie outsourcen sollen, ist die kürzeste Antwort
              ein Telefonat. Fünf bis zehn Minuten. Sie erreichen mich persönlich.
            </p>
          </div>

          {/* Signature */}
          <div className="mt-10 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <p
                  className="text-2xl text-primary-800"
                  style={{
                    fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
                    fontStyle: 'italic',
                  }}
                >
                  Alaatdin Coksari
                </p>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-1">
                  Gründer · KALKU Baukalkulationen, Saarbrücken
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <a
                  href={telHref(NAP.phone)}
                  className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 font-semibold"
                >
                  <Phone className="w-4 h-4" />
                  {NAP.phone}
                </a>
                <span className="text-gray-300" aria-hidden>·</span>
                <a
                  href={`mailto:${NAP.email}`}
                  className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 font-semibold"
                >
                  <Mail className="w-4 h-4" />
                  {NAP.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
