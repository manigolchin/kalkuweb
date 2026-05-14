import { Calculator, ShoppingCart, FileSignature, Search } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const TEAMS = [
  {
    icon: Calculator,
    name: 'Kalkulation',
    role: 'Handwerker & Bauingenieure',
    desc: '20+ Jahre Erfahrung im Team. Jede Position einzeln auf Zeit, Geräte und Material kalkuliert — keine Pauschalen.',
    accent: 'border-t-primary-500',
  },
  {
    icon: ShoppingCart,
    name: 'Einkauf',
    role: 'Materialpreise & Nachunternehmer',
    desc: 'Aktuelle Marktpreise und Entsorgungskosten. Auf Wunsch Nachunternehmer-Anfragen im regionalen Umfeld.',
    accent: 'border-t-emerald-600',
  },
  {
    icon: FileSignature,
    name: 'Vergabe',
    role: 'Spezialisiert auf Vergaberecht',
    desc: 'Reicht im Namen Ihres Unternehmens ein — fristgerecht und fehlerfrei. Minimiert Ausschlussrisiken.',
    accent: 'border-t-amber-600',
  },
  {
    icon: Search,
    name: 'Recherche',
    role: 'Wöchentliche Ausschreibungssuche',
    desc: 'Durchsucht alle relevanten Plattformen nach passenden Ausschreibungen. Im Monatspaket ohne Zusatzkosten.',
    accent: 'border-t-sky-600',
  },
] as const;

const ZUSATZ_LEISTUNG = {
  title: 'Zusätzlich: Mengenermittlung & Aufmaß',
  desc: 'Auf Wunsch übernehmen wir auch die digitale Mengenermittlung aus Plänen oder das Aufmaß vor Ort — direkt verzahnt mit der Kalkulation, ohne Übergabeverlust zwischen externen Dienstleistern.',
};

export default function VierTeams() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Vier Teams"
          title="Eine Kalkulationsabteilung — aus einer Hand."
          subtitle="Vier spezialisierte Teams arbeiten parallel an Ihrer Ausschreibung. Alle am finanziellen Erfolg beteiligt — deshalb halten wir auch Wochenend-Abgaben zuverlässig ein."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TEAMS.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className={`border-t-4 ${t.accent} bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow flex flex-col`}
              >
                <Icon className="w-6 h-6 text-gray-700 mb-4" strokeWidth={1.8} />
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t.name}</h3>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
                  {t.role}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-8 bg-primary-50/50 border border-primary-100 rounded-lg p-5 sm:p-6 flex items-start gap-4">
          <div className="w-9 h-9 rounded-md bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-extrabold text-sm">+</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">{ZUSATZ_LEISTUNG.title}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{ZUSATZ_LEISTUNG.desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
