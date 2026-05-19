import { Calculator, ShoppingCart, FileSignature, Search, Ruler, FilePlus2, BarChart3, Receipt } from 'lucide-react';
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

const ZUSATZ_LEISTUNGEN = [
  {
    icon: Ruler,
    title: 'Mengenermittlung & Aufmaß',
    desc:
      'Digitale Mengenermittlung aus Plänen oder Aufmaß vor Ort — direkt verzahnt mit der Kalkulation, ohne Übergabeverlust zwischen externen Dienstleistern.',
  },
  {
    icon: FilePlus2,
    title: 'Nachtragsmanagement (Bauphase)',
    desc:
      'Wenn auf der Baustelle Mehrleistungen entstehen — Bodenklassen-Wechsel, Schadstoff-Funde, geänderte Massen — kalkulieren wir Nachträge nach VOB/B § 2 und bereiten sie prüfbar zur Vorlage auf.',
  },
  {
    icon: BarChart3,
    title: 'Submissionsergebnis-Analyse',
    desc:
      'Nach Eröffnung spiegeln wir Ihren Preis gegen die Wettbewerber, arbeiten Erfolgsmuster und Verlustursachen heraus — strukturierte Lessons Learned für die nächste Vergabe.',
  },
  {
    icon: Receipt,
    title: 'Schlussrechnung-Support',
    desc:
      'Bei Auftragsabschluss begleiten wir die prüfbare Schlussrechnung nach VOB/B § 14 — vom Aufmaß über Stundenlohnabrechnung bis zur Position-für-Position-Argumentation gegenüber dem Auftraggeber.',
  },
] as const;

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

        <div className="max-w-5xl mx-auto mt-10">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-gray-500 inline-flex items-center gap-2">
              <span className="inline-flex w-5 h-5 rounded-md bg-primary-100 items-center justify-center text-primary-700 font-extrabold text-xs">+</span>
              Erweiterte Leistungen — über die Submission hinaus
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ZUSATZ_LEISTUNGEN.map((z) => {
              const Icon = z.icon;
              return (
                <div
                  key={z.title}
                  className="bg-primary-50/40 border border-primary-100 rounded-lg p-5 hover:bg-primary-50/70 transition-colors"
                >
                  <Icon className="w-5 h-5 text-primary-700 mb-3" strokeWidth={1.8} aria-hidden="true" />
                  <h3 className="font-bold text-gray-900 mb-2 text-sm leading-snug">{z.title}</h3>
                  <p className="text-xs text-gray-700 leading-relaxed">{z.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
