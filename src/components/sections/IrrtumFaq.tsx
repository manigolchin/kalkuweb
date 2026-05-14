import FaqItem from '@/components/ui/FaqItem';

const IRRTUEMER = [
  {
    question: 'Wir brauchen eine Präqualifikation.',
    answer:
      'Nein. Eine Präqualifikation ist keine Voraussetzung. Ihre Eignung wird über die eingereichten Unterlagen — Referenzen, Bescheinigungen vom Finanzamt und der Sozialkassen, Umsatzzahlen — nachgewiesen.',
  },
  {
    question: 'Unser Betrieb besteht erst seit einem Jahr — das ist zu kurz.',
    answer:
      'Nicht zwingend. Entscheidend sind vergleichbare Referenzen, nicht das Unternehmensalter. Auch jüngere Unternehmen erhalten Zuschläge — teils nach unter 6 Monaten.',
  },
  {
    question: 'Öffentliche Auftraggeber zahlen schlecht.',
    answer:
      'Nein. Gemäß VOB werden Abschlagsrechnungen spätestens nach 3 Wochen beglichen — schneller und planbarer als die meisten privaten Auftraggeber.',
  },
  {
    question: 'Man muss eine GmbH oder AG sein.',
    answer:
      'Nein. Auch Einzelunternehmer dürfen teilnehmen, sofern vergleichbare Referenzen vorliegen. Die Rechtsform ist für die Vergabe nicht ausschlaggebend.',
  },
];

export default function IrrtumFaq() {
  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="eyebrow mb-3">Häufige Irrtümer</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-5">
              Was viele Bauunternehmer fälschlich glauben.
            </h2>
            <p className="text-lg text-gray-600">
              Vier Irrtümer, die uns im Erstgespräch täglich begegnen — und warum sie Sie nicht
              davon abhalten sollten, an öffentlichen Ausschreibungen teilzunehmen.
            </p>
          </div>
          <div className="space-y-3">
            {IRRTUEMER.map((q) => (
              <FaqItem key={q.question} question={q.question} answer={q.answer} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
