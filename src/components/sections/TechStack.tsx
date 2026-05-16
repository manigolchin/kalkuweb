import {
  FileSpreadsheet,
  Calculator,
  FileText,
  Search,
  GitCompareArrows,
  Workflow,
  Cpu,
  ServerCog,
  Lock,
  Lightbulb,
} from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

type TechItem = {
  icon: typeof FileSpreadsheet;
  name: string;
  desc: string;
  visibility: 'public' | 'kunden' | 'intern';
};

const STACK: TechItem[] = [
  {
    icon: FileSpreadsheet,
    name: 'GAEB-Konverter',
    desc: 'GAEB DA XML 3.x + ASCII (X81–X89, D81–D84) im Browser öffnen, Positions-Vorschau, Excel-/CSV-Export.',
    visibility: 'public',
  },
  {
    icon: Calculator,
    name: 'Position-Kalkulator',
    desc: 'EP/GP-Kalkulator mit Trade-Vorlagen (GaLaBau/Tiefbau/Elektro/Hochbau), Auto-Save, Excel-Export.',
    visibility: 'public',
  },
  {
    icon: FileText,
    name: 'LV3-Konverter',
    desc: 'Excel-Leistungsverzeichnisse mit Positionsdaten in unsere personalisierte Kalkulationsvorlage transformieren.',
    visibility: 'kunden',
  },
  {
    icon: FileText,
    name: 'PDF-Tender-Tool',
    desc: 'PDF-LVs in strukturierte Daten überführen — für Submissionen, die nur als PDF bereitstehen.',
    visibility: 'kunden',
  },
  {
    icon: Search,
    name: 'Recherche-Tool v2',
    desc: 'Wöchentliche Ausschreibungs-Recherche über alle relevanten Vergabeplattformen, gewerk- und regionsspezifisch gefiltert.',
    visibility: 'intern',
  },
  {
    icon: GitCompareArrows,
    name: 'Angebots-Analyzer',
    desc: 'Eingegangene Subunternehmer-/Lieferanten-Angebote per PDF einlesen, Preisvergleich + Rangliste automatisch erstellen.',
    visibility: 'intern',
  },
  {
    icon: Workflow,
    name: 'Anfragetool (Procurement)',
    desc: 'Automatisierte Material- und NU-Anfragen an unsere Lieferanten-Datenbank, gruppiert nach Gewerk und Region.',
    visibility: 'intern',
  },
  {
    icon: Cpu,
    name: 'KI-Position-Klassifizierung',
    desc: 'Anthropic-Claude-basierte Auto-Klassifizierung von LV-Positionen nach Gewerk, Material, Hersteller — beschleunigt Premium-Auswertungen.',
    visibility: 'intern',
  },
  {
    icon: ServerCog,
    name: 'n8n Workflow-Engine',
    desc: 'Verkettete Automatisierungen: vom GAEB-Upload bis zur fertigen Excel-Auswertung in unter 2 Minuten.',
    visibility: 'intern',
  },
  {
    icon: Lock,
    name: 'Eigene Server-Infrastruktur',
    desc: 'Vollständig EU-gehostet (Hetzner, Falkenstein), Traefik + Docker, Backups verschlüsselt, kein US-Cloud-Lock-in.',
    visibility: 'intern',
  },
];

const VIS_LABEL: Record<TechItem['visibility'], string> = {
  public: 'Öffentlich nutzbar',
  kunden: 'Für Mandanten',
  intern: 'Intern',
};

const VIS_CLASS: Record<TechItem['visibility'], string> = {
  public: 'bg-emerald-50 text-emerald-700',
  kunden: 'bg-primary-50 text-primary-700',
  intern: 'bg-gray-100 text-gray-600',
};

export default function TechStack() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeader
          eyebrow="Unsere eigene Tool-Suite"
          title="Wir sind weniger Büro, mehr Software-Bude."
          subtitle="Zehn eigene Tools, mit denen wir Kalkulationen schneller, präziser und nachvollziehbarer machen als reine Excel-Bearbeiter — und zwei davon können Sie hier kostenlos mitnutzen."
        />

        <div className="grid gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200 max-w-6xl mx-auto sm:grid-cols-2">
          {STACK.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.name} className="bg-white p-5 sm:p-6 flex gap-4">
                <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-700" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="font-bold text-gray-900 text-sm">{t.name}</h3>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${VIS_CLASS[t.visibility]}`}>
                      {VIS_LABEL[t.visibility]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-8 bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Warum ist das relevant für Sie?</strong> Andere Kalkulationsbüros arbeiten mit
            Excel und der Software, die der Hersteller verkauft. Wir bauen seit Jahren eigene
            Tools, weil wir merken: 80 % der Standard-Aufgaben lassen sich automatisieren —
            wir kalkulieren das gleiche LV in 4 statt 14 Stunden. Diese Effizienz kommt direkt
            beim Festpreis bei Ihnen an.
          </p>
        </div>
      </div>
    </section>
  );
}
