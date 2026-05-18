import { useId } from 'react';
import type { Aufschlaege } from '@/lib/kalkulator/types';
import type { Totals } from '@/lib/kalkulator/calc';
import { fmtCurrency, fmt } from '@/lib/kalkulator/calc';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  value: Aufschlaege;
  onChange: (next: Aufschlaege) => void;
  totals: Totals;
  open: boolean;
  onToggle: () => void;
};

export default function AufschlagPanel({ value, onChange, totals, open, onToggle }: Props) {
  const id = useId();
  return (
    <div className="card-flat mt-4" data-noprint>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="w-full flex items-center justify-between text-left -m-1 p-1 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-gray-500">Aufschläge & Brutto</p>
            <p className="text-sm text-gray-700">
              Netto {fmtCurrency(totals.netto)} → Brutto{' '}
              <span className="font-bold text-primary-700 tabular-nums">{fmtCurrency(totals.brutto)}</span>
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {open && (
        <div id={`${id}-panel`} className="mt-5 pt-5 border-t border-gray-100">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <PctField
              label="BGK"
              hint="Baustellengemeinkosten"
              value={value.bgk}
              onChange={(v) => onChange({ ...value, bgk: v })}
              suggested="3–8"
            />
            <PctField
              label="AGK"
              hint="Allg. Geschäftskosten"
              value={value.agk}
              onChange={(v) => onChange({ ...value, agk: v })}
              suggested="6–12"
            />
            <PctField
              label="W&G"
              hint="Wagnis & Gewinn"
              value={value.wug}
              onChange={(v) => onChange({ ...value, wug: v })}
              suggested="5–10"
            />
            <PctField
              label="NU-Zuschlag"
              hint="auf NU-Positionen"
              value={value.nuZuschlag}
              onChange={(v) => onChange({ ...value, nuZuschlag: v })}
              suggested="5–10"
            />
            <PctField
              label="MwSt"
              hint="Umsatzsteuer"
              value={value.mwst}
              onChange={(v) => onChange({ ...value, mwst: v })}
              suggested="19"
            />
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 overflow-hidden text-sm">
            <Row label="Netto-Bauleistung (Σ GP)" value={fmtCurrency(totals.netto)} />
            <Row label={`BGK (${fmt(value.bgk)} %)`} value={fmtCurrency(totals.bgk)} dimmed />
            <Row label={`AGK (${fmt(value.agk)} %)`} value={fmtCurrency(totals.agk)} dimmed />
            <Row label={`W&G (${fmt(value.wug)} %)`} value={fmtCurrency(totals.wug)} dimmed />
            <Row label="Netto-Auftragssumme" value={fmtCurrency(totals.nettoMitZuschlaegen)} bold />
            <Row label={`MwSt (${fmt(value.mwst)} %)`} value={fmtCurrency(totals.mwst)} dimmed />
            <Row label="Brutto-Endsumme" value={fmtCurrency(totals.brutto)} highlight />
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Berechnung: Netto → +BGK → +AGK auf (Netto+BGK) → +W&G auf (Netto+BGK+AGK) → +MwSt auf Netto-Auftragssumme.
            VOB-konform parametrisierbar.
          </p>
        </div>
      )}
    </div>
  );
}

function PctField({
  label,
  hint,
  value,
  onChange,
  suggested,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  suggested?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <span className="block text-[11px] text-gray-400 mb-1">{hint}</span>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-right tabular-nums focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
      </div>
      {suggested && <span className="text-[10px] text-gray-400 mt-0.5 block">Üblich: {suggested} %</span>}
    </label>
  );
}

function Row({
  label,
  value,
  dimmed,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  dimmed?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'flex items-center justify-between px-4 py-2 border-b last:border-b-0 border-gray-100 ' +
        (highlight ? 'bg-primary-700 text-white border-primary-700' : 'bg-white')
      }
    >
      <span
        className={
          (dimmed ? 'text-gray-500 ' : '') +
          (bold ? 'font-bold text-gray-900 ' : '') +
          (highlight ? 'font-bold text-primary-100 ' : '')
        }
      >
        {label}
      </span>
      <span
        className={
          'tabular-nums ' +
          (dimmed ? 'text-gray-500 ' : 'text-gray-900 ') +
          (bold ? 'font-bold ' : '') +
          (highlight ? 'text-white font-extrabold text-base' : '')
        }
      >
        {value}
      </span>
    </div>
  );
}
