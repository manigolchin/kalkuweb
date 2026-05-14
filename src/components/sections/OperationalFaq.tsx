import SectionHeader from '@/components/ui/SectionHeader';
import FaqItem from '@/components/ui/FaqItem';

const FAQ = [
  {
    q: 'Wie schnell können Sie eine Kalkulation liefern?',
    a: 'Reguläre Bearbeitung: 24–48 Stunden für ein durchschnittliches LV mit 80–150 Positionen. Bei komplexeren Submissionen (300+ Positionen, mehrere Lose) bis zu 5 Werktage. Bei knappen Submissionsfristen arbeiten wir auch über Nacht oder am Wochenende — ohne Aufpreis.',
  },
  {
    q: 'Wie läuft die Beauftragung ab — muss ich viel vorbereiten?',
    a: 'Nein. Ein 5-Minuten-Telefonat genügt für die Klärung der Eckdaten (Gewerk, Region, Mittellohn). Die Vollmacht für Materialanfragen und Einreichung schicken wir Ihnen vorab — Sie unterschreiben, wir legen los. Eignungsunterlagen werden einmalig zusammengestellt; danach laufen alle weiteren Submissionen weitgehend automatisch.',
  },
  {
    q: 'Was kostet die Zusammenarbeit?',
    a: 'Bei Einzelbeauftragung: 200–600 € Pauschale je Ausschreibung (abhängig vom LV-Umfang) + 5 % Erfolgsprovision bei Zuschlag. Bei Monatspaketen: 3.000 € (PAKET M) oder 5.000 € (PAKET L) mit reduzierter Erfolgsprovision (3,9 % bzw. 2,9 %). Alle Preise netto, monatlich kündbar.',
  },
  {
    q: 'Woher weiß ich, dass die Kalkulation realistisch ist?',
    a: 'Wir zeigen Ihnen die fertige Kalkulation vor der Einreichung — Sie sehen jede Position, jeden Zeitwert, jeden Materialpreis. Im Vier-Augen-Prinzip prüft eine zweite Person jede Kalkulation. Änderungen werden eingearbeitet. Erst nach Ihrem Go geht das Angebot raus.',
  },
  {
    q: 'Was passiert nach der Angebotseinreichung?',
    a: 'Wir verfolgen das Vergabeergebnis aktiv nach. Sobald die Vergabestelle entscheidet, leiten wir Ihnen das Ergebnis sofort weiter — bei öffentlichen Vergaben oft mit Submissions-Niederschrift, sodass Sie sehen, wer wie kalkuliert hat. Bei Zuschlag unterstützen wir bei Nachforderungen, Aufklärungsersuchen und Vergabegesprächen.',
  },
  {
    q: 'Können Sie auch für unsere Wettbewerber kalkulieren?',
    a: 'Nein. Pro Ausschreibung arbeiten wir ausschließlich für ein Bieter-Unternehmen. Im Rahmen einer aktiven Monatspauschale gilt darüber hinaus Gebietsschutz: In Ihrem Einzugsgebiet und Gewerk nehmen wir keine konkurrierenden Mandate an, solange Sie aktiver Mandant sind.',
  },
];

export default function OperationalFaq() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Häufige Fragen"
          title="Was Bauunternehmer am häufigsten fragen."
          subtitle="Sechs Fragen, die im Erstgespräch fast immer kommen — beantwortet, bevor Sie sie stellen müssen."
        />
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ.map((q) => (
            <FaqItem key={q.q} question={q.q} answer={q.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
