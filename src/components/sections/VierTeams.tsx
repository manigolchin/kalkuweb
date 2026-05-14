import { Calculator, ShoppingCart, FileSignature, Search } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const TEAMS = [
  {
    icon: Calculator,
    name: 'Kalkulationsteam',
    desc: 'Handwerker und Bauingenieure mit über 20 Jahren Erfahrung. Jede Position einzeln auf Zeit, Geräte und Material kalkuliert — keine Pauschalen, keine Schätzungen.',
    color: 'primary',
  },
  {
    icon: ShoppingCart,
    name: 'Einkaufsteam',
    desc: 'Ermittelt aktuelle Materialpreise und Entsorgungskosten. Stellt auf Wunsch Nachunternehmer-Anfragen im regionalen Umfeld. Keine Preislücken in der Kalkulation.',
    color: 'emerald',
  },
  {
    icon: FileSignature,
    name: 'Vergabeteam',
    desc: 'Spezialisiert auf Vergaberecht. Reicht im Namen Ihres Unternehmens ein — fristgerecht und fehlerfrei. Minimiert Ausschlussrisiken durch rechtssichere Betreuung.',
    color: 'amber',
  },
  {
    icon: Search,
    name: 'Rechercheteam',
    desc: 'Durchsucht wöchentlich alle relevanten Plattformen nach passenden Ausschreibungen. Im Rahmen der Monatspauschale ohne Zusatzkosten.',
    color: 'sky',
  },
] as const;

const COLOR_CLASSES = {
  primary: 'bg-primary-50 text-primary-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
} as const;

export default function VierTeams() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Vier Teams"
          title="Eine Kalkulationsabteilung. Aus einer Hand."
          subtitle="Vier Teams arbeiten parallel an Ihrer Ausschreibung — alle am finanziellen Erfolg beteiligt. Deshalb halten wir auch kurzfristige Abgaben über Nacht oder am Wochenende ein."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TEAMS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.name} className="card card-hover h-full flex flex-col">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${COLOR_CLASSES[t.color]}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
