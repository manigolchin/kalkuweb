import { ShieldCheck, Lock, Eye, FileSearch, ClipboardCheck, Banknote } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

const BADGES = [
  {
    icon: ShieldCheck,
    title: 'VOB/A & VgV',
    desc: 'Spezialisierung auf öffentliche Vergabe nach VOB/A und VgV. Fortbildungen vierteljährlich.',
  },
  {
    icon: Lock,
    title: 'Vertraulichkeit',
    desc: 'NDA standardmäßig. Mittellohn, Margen, Lieferantenkonditionen bleiben in unserem Team — zeitlich unbegrenzt.',
  },
  {
    icon: Eye,
    title: '4-Augen-Prinzip',
    desc: 'Jede Kalkulation wird von einer zweiten Person geprüft, bevor sie an Sie geht.',
  },
  {
    icon: FileSearch,
    title: 'Loyalität & Gebietsschutz',
    desc: 'Pro Ausschreibung ein Bieter. In Ihrem Einzugsgebiet keine konkurrierenden Mandate.',
  },
  {
    icon: ClipboardCheck,
    title: 'DSGVO & EU-Hosting',
    desc: 'Alle Daten auf EU-Servern. AVV mit jedem Auftragsverarbeiter. Plausible cookieless Analytics.',
  },
  {
    icon: Banknote,
    title: 'Erfolgsbasiert',
    desc: 'Erfolgsprovision wird erst nach Auftragserteilung an Sie fällig — kein Vorkasse-Risiko.',
  },
];

export default function TrustBadges() {
  return (
    <section className="section bg-gray-50">
      <div className="container-page">
        <SectionHeader
          eyebrow="Compliance & Vertrauen"
          title="Sechs Versprechen, die wir nie brechen."
          subtitle="Was uns von Wettbewerbern unterscheidet — und warum Bauunternehmer uns ihre Submissionen anvertrauen."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200">
          {BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="bg-white p-6 sm:p-7 flex flex-col">
                <Icon className="w-6 h-6 text-primary-600 mb-4" strokeWidth={2} />
                <h3 className="text-base font-bold text-primary-700 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
