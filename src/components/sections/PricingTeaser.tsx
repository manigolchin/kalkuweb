import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { PRICING } from '@/lib/constants';
import SectionHeader from '@/components/ui/SectionHeader';

const ROWS = [
  { label: 'Einzelne Ausschreibung bepreisen', einzel: '✓', m: '✓', l: '✓' },
  { label: 'Unbegrenzte Submissionen / Monat', einzel: '–', m: '✓', l: '✓' },
  { label: 'Wöchentliche Ausschreibungs-Recherche', einzel: '–', m: '✓', l: '✓' },
  { label: 'Priorisierte Eil-Bearbeitung', einzel: '–', m: '–', l: '✓' },
  { label: 'Gebietsschutz im Einzugsgebiet', einzel: '–', m: '✓', l: '✓' },
];

/**
 * Pricing teaser — clean compact table, one row per package, with anchor link
 * to the full Konditionen page for everyone who wants more detail.
 */
export default function PricingTeaser() {
  return (
    <section className="section bg-paper-soft">
      <div className="container-page">
        <SectionHeader
          eyebrow="Transparente Konditionen"
          title="Festpreise, sichtbar. Erfolgsprovision erst bei Zuschlag."
          subtitle="Zwei Modelle für unterschiedlichen Bedarf — keine Setup-Gebühren, keine Mindestlaufzeit, monatlich kündbar."
        />

        <div className="max-w-5xl mx-auto bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
          {/* Header row with prices */}
          <div className="grid grid-cols-1 sm:grid-cols-4 border-b border-gray-200">
            <div className="hidden sm:block p-6 bg-gray-50" />
            <PriceCol
              name={PRICING.einzel.name}
              price={PRICING.einzel.price}
              fee={PRICING.einzel.successFee}
              note="pro LV · keine Grundgebühr"
            />
            <PriceCol
              featured
              name={PRICING.paketM.name}
              price={PRICING.paketM.price}
              fee={PRICING.paketM.successFee}
              note="für Stamm-Submittenten"
            />
            <PriceCol
              name={PRICING.paketL.name}
              price={PRICING.paketL.price}
              fee={PRICING.paketL.successFee}
              note="für aktive Submittenten"
            />
          </div>

          {/* Feature rows */}
          <ul className="divide-y divide-gray-100">
            {ROWS.map((r, i) => (
              <li key={i} className="grid grid-cols-2 sm:grid-cols-4 px-4 sm:px-0">
                <span className="sm:col-span-1 sm:p-5 py-3 sm:py-5 text-sm font-semibold text-gray-700 sm:pl-6">
                  {r.label}
                </span>
                <Cell value={r.einzel} hideLabelOnDesktop label="Einzel" />
                <Cell value={r.m} hideLabelOnDesktop label="PAKET M" featured />
                <Cell value={r.l} hideLabelOnDesktop label="PAKET L" />
              </li>
            ))}
          </ul>

          <div className="bg-gray-50 px-6 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-600">
              Alle Preise netto, zzgl. USt. Monatlich kündbar.
            </p>
            <Link to="/konditionen/" className="btn btn-outline">
              Vollständige Konditionen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PriceCol({
  name,
  price,
  fee,
  note,
  featured,
}: {
  name: string;
  price: string;
  fee: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`p-6 ${featured ? 'bg-primary-50/50 ring-1 ring-primary-200 sm:ring-0 relative' : ''}`}
    >
      {featured && (
        <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-primary-700 text-white text-[10px] font-bold uppercase tracking-wider">
          Beliebt
        </span>
      )}
      <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-gray-500 mb-1.5">
        {name}
      </p>
      <p className="editorial-number text-2xl sm:text-3xl text-primary-700 mb-1 leading-none">{price}</p>
      <p className="text-xs text-gray-500 mb-2">+ {fee} Erfolgsprovision</p>
      <p className="text-[11px] text-gray-400 italic">{note}</p>
    </div>
  );
}

function Cell({ value, label, featured, hideLabelOnDesktop }: { value: string; label: string; featured?: boolean; hideLabelOnDesktop?: boolean }) {
  const isYes = value === '✓';
  return (
    <span
      className={`flex items-center justify-between gap-2 px-2 py-3 sm:py-5 sm:justify-center text-sm ${
        featured ? 'bg-primary-50/30' : ''
      }`}
    >
      <span className={`sm:hidden text-xs uppercase tracking-wider font-bold ${hideLabelOnDesktop ? '' : ''} text-gray-500`}>{label}</span>
      {isYes ? (
        <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
      ) : (
        <span className="text-gray-300" aria-hidden>–</span>
      )}
    </span>
  );
}
