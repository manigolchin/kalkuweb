import { ShieldCheck, Banknote, Lock, Clock, UserCheck, FileSignature } from 'lucide-react';

const GUARANTEES = [
  {
    icon: Clock,
    title: '4-Stunden-Antwort, schriftlich',
    body:
      'Werktags zwischen 8 und 18 Uhr erhalten Sie binnen 4 Stunden eine schriftliche Rückmeldung — Auftragsannahme, Rückfrage oder begründete Absage. Wir versprechen kein Bauchgefühl.',
  },
  {
    icon: Banknote,
    title: 'Sie zahlen, wenn wir liefern',
    body:
      'Pauschale wird erst nach Lieferung der fertigen Kalkulation in Rechnung gestellt. Erfolgsprovision erst nach Auftragserteilung an Sie — kein Vorkasse-Risiko, keine versteckten Setup-Gebühren.',
  },
  {
    icon: Lock,
    title: 'NDA · namentlich zugeordnet',
    body:
      'Verschwiegenheitserklärung Standard. Ihre Mittellohn-Daten, Margen und Lieferantenkonditionen sehen ausschließlich die zwei namentlich zugewiesenen Kalkulatoren — schriftlich im Vertrag fixiert.',
  },
  {
    icon: ShieldCheck,
    title: 'Loyalität & Gebietsschutz',
    body:
      'Pro Ausschreibung arbeiten wir ausschließlich für ein Unternehmen. Im aktiven Monatspaket gilt zusätzlich Gebietsschutz — in Ihrem Einzugsgebiet und Gewerk nehmen wir keine konkurrierenden Mandate an.',
  },
  {
    icon: FileSignature,
    title: 'Monatlich kündbar — erstes Quartal',
    body:
      'Monatspakete laufen ohne Mindestlaufzeit. In den ersten 3 Monaten reicht eine formlose E-Mail zur Beendigung — Test als echter Test, nicht als Lock-in.',
  },
  {
    icon: UserCheck,
    title: '4-Augen-Prinzip · vor Einreichung',
    body:
      'Jede Kalkulation wird von einer zweiten Person geprüft, bevor sie zu Ihnen geht. Sie sehen die Vorab-Version, korrigieren — erst dann reichen wir ein. Keine Black Box.',
  },
];

export default function RiskReversal() {
  return (
    <section className="section relative isolate overflow-hidden bg-editorial-dark text-white">
      {/* Atmospheric layers */}
      <span aria-hidden className="aurora-orb aurora-emerald w-[44rem] h-[44rem] -top-72 -left-40 opacity-40" />
      <span aria-hidden className="aurora-orb aurora-petrol w-[40rem] h-[40rem] -bottom-72 -right-40 opacity-40" />
      <div aria-hidden className="absolute inset-0 bg-grid-fade" />
      <div aria-hidden className="absolute inset-0 bg-noise" />

      <div className="relative container-page">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="eyebrow-pill-dark mb-5 backdrop-blur-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Was wir Ihnen schriftlich geben
          </p>
          <h2 className="display-h2 text-white mb-5">
            Sechs Versprechen — <span className="bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">schriftlich im Vertrag.</span>
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed">
            Was uns von Software, KI-Plattformen und beratenden Stundenverkäufern unterscheidet — und warum
            Bauunternehmer uns ihre Submissionen anvertrauen.
          </p>
        </div>

        <div className="grid gap-px bg-white/10 rounded-2xl overflow-hidden ring-1 ring-white/10 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-3 shadow-2xl shadow-primary-900/40 backdrop-blur-sm">
          {GUARANTEES.map((g, i) => {
            const Icon = g.icon;
            return (
              <div
                key={g.title}
                className="relative bg-[#0a1828]/85 backdrop-blur-sm p-7 sm:p-8 flex flex-col group transition-colors hover:bg-[#0d2138]/85"
              >
                <div className="flex items-center gap-4 mb-5">
                  <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/20 group-hover:bg-emerald-500/15 transition-colors">
                    <Icon className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-gray-500 font-bold tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2.5">{g.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{g.body}</p>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-500 mt-10">
          Alle sechs Versprechen sind Bestandteil unserer{' '}
          <a href="/agb/" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
            Auftragsbedingungen
          </a>{' '}
          — keine kleingedruckten Klauseln.
        </p>
      </div>
    </section>
  );
}
