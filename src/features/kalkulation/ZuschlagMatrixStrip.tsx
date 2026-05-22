/**
 * Round 4 PART O + Q — sticky Zuschlag matrix at the top of INTERN view.
 *
 * Renders the canonical Excel matrix from the imported Vorlage:
 *   rows: Stoffe / Nachuntern / Gerätekosten / Lohn
 *   cols: EK · ZSCHLG · VK · DIFFERNZ
 *
 * Read-only EK / VK / DIFFERNZ (sourced from the captured ZuschlagMatrix).
 * Editable ZSCHLG % per cost type (PART O) — number input, debounced
 * onChange that fires after 300ms of no typing.
 *
 * Plus a tail strip with Stundensatz, Mitarbeiter, Ges. Std, Überschuss,
 * Zeitwert — all read-only display.
 *
 * The "Aktuell vs Original" indicator + "Zurücksetzen" link appears next
 * to any ZSCHLG cell where the calculator has overridden the imported
 * value.
 */

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type {
  CalcParams,
  HeaderExtras,
  ZuschlagMatrix,
} from './types';
import { formatEUR, formatNum } from './calc';

type CostType = 'stoffe' | 'nu' | 'geraete' | 'lohn';

type Props = {
  /** Frozen-at-import matrix — never mutates. */
  original?: ZuschlagMatrix;
  /** Live overrides per cost type (decimal: 0.23 means 23%). */
  aktuell?: Partial<Record<CostType, number>>;
  /** Header-block extras (Mitarbeiter / Stunden / etc.). */
  extras?: HeaderExtras;
  /** Calc params — Stundensatz, Mittellohn, MwSt come from here. */
  params: CalcParams;
  /** Fired when a ZSCHLG % is edited. Debounced 300ms. */
  onZschlgChange: (cost: CostType, decimal: number) => void;
  /** Fired when the user clicks "Zurücksetzen" for a cost type. */
  onZschlgReset: (cost: CostType) => void;
};

const ROW_DEFS: Array<{ key: CostType; label: string }> = [
  { key: 'stoffe', label: 'Stoffe' },
  { key: 'nu', label: 'Nachuntern.' },
  { key: 'geraete', label: 'Gerätekosten' },
  { key: 'lohn', label: 'Lohn' },
];

export default function ZuschlagMatrixStrip({
  original,
  aktuell,
  extras,
  params,
  onZschlgChange,
  onZschlgReset,
}: Props) {
  if (!original) {
    // Pre-Round-4 project: no captured matrix. Render nothing (the basic
    // CalcParams fields in the SettingsPanel still work).
    return null;
  }

  return (
    <div
      data-testid="zuschlag-matrix-strip"
      className="sticky top-0 z-20 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm"
    >
      <header className="flex items-baseline justify-between gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-500" />
          Zuschlag-Matrix
        </h3>
        <div className="text-[10px] text-slate-400">
          EK & VK aus Excel · ZSCHLG % live editierbar
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50/40">
              <th className="px-3 py-1.5 text-left font-semibold w-[120px]"></th>
              <th className="px-3 py-1.5 text-right font-semibold w-[110px]">EINKAUF</th>
              <th className="px-3 py-1.5 text-right font-semibold w-[110px]">ZSCHLG %</th>
              <th className="px-3 py-1.5 text-right font-semibold w-[110px]">VERKAUF</th>
              <th className="px-3 py-1.5 text-right font-semibold w-[110px]">DIFFERNZ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ROW_DEFS.map(({ key, label }) => {
              const row = original[key];
              const originalPct = row.zschlgPct;
              const aktuellPct = aktuell?.[key];
              const effectivePct = aktuellPct ?? originalPct;
              // Recompute VK/diff live from the effective ZSCHLG.
              const liveVk = row.ekTotal * (1 + effectivePct);
              const liveDiff = liveVk - row.ekTotal;
              const isOverridden = aktuellPct !== undefined && aktuellPct !== originalPct;
              return (
                <tr key={key} className="border-t border-slate-100">
                  <td className="px-3 py-2 align-top font-medium text-slate-700">{label}</td>
                  <td data-readonly={`ek-${key}`} className="px-3 py-2 align-top text-right tabular-nums text-slate-700">
                    {formatEUR(row.ekTotal)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <ZschlgInput
                      cost={key}
                      valueDecimal={effectivePct}
                      onChange={(d) => onZschlgChange(key, d)}
                    />
                  </td>
                  <td data-readonly={`vk-${key}`} className="px-3 py-2 align-top text-right tabular-nums text-slate-900 font-medium">
                    {formatEUR(liveVk)}
                  </td>
                  <td data-readonly={`diff-${key}`} className="px-3 py-2 align-top text-right tabular-nums text-slate-700">
                    {formatEUR(liveDiff)}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {isOverridden && (
                      <button
                        type="button"
                        onClick={() => onZschlgReset(key)}
                        title={`Original: ${(originalPct * 100).toFixed(2)}%`}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-700 hover:text-amber-900"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {(originalPct * 100).toFixed(1)}%
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tail strip — Stundensatz, Mitarbeiter, Std, Überschuss, Zeitwert.
          All read-only (PART O — these are LV-source values). */}
      {extras && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-4 py-2.5 border-t border-slate-100 bg-slate-50/30 text-xs">
          <Stat label="Mittellohn / Std" value={`${formatNum(params.mittellohn, 2)} €`} readOnly />
          <Stat label="Stundensatz" value={`${formatNum(params.verrechnungslohn, 2)} €`} readOnly />
          <Stat label="Mitarbeiter" value={formatNum(extras.mitarbeiter, 0)} readOnly />
          <Stat label="Gesamt Std." value={formatNum(extras.gesStunden, 1)} readOnly />
          <Stat
            label="Überschuss"
            value={formatEUR(extras.ueberschuss)}
            readOnly
            emphasis
          />
        </div>
      )}
    </div>
  );
}

/**
 * Numeric input for a ZSCHLG % cell. Holds local state during typing
 * (so partial inputs like "23." don't trigger a recompute), debounces
 * commit by 300ms after the last keystroke OR fires immediately on blur.
 *
 * Value comes in as a decimal (0.23 = 23%), displayed and edited as a
 * percent (23.00).
 */
function ZschlgInput({
  cost,
  valueDecimal,
  onChange,
}: {
  cost: CostType;
  valueDecimal: number;
  onChange: (decimal: number) => void;
}) {
  const formatted = (valueDecimal * 100).toFixed(2);
  const [draft, setDraft] = useState(formatted);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from prop when not actively editing (handles external resets).
  useEffect(() => {
    if (!focused) setDraft(formatted);
  }, [formatted, focused]);

  function commitNow(raw: string) {
    const cleaned = raw.replace(',', '.').trim();
    const pct = parseFloat(cleaned);
    if (Number.isFinite(pct) && pct >= 0 && pct <= 500) {
      const decimal = pct / 100;
      // Round to 4 decimals to avoid float noise.
      const rounded = Math.round(decimal * 10000) / 10000;
      onChange(rounded);
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      data-testid={`zschlg-input-${cost}`}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setDraft(e.target.value);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => commitNow(e.target.value), 300);
      }}
      onBlur={() => {
        setFocused(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        commitNow(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        else if (e.key === 'Escape') {
          setDraft(formatted);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={clsx(
        'w-full text-right tabular-nums font-medium px-2 py-1 rounded border',
        'border-slate-300 bg-white outline-none',
        'focus:border-primary-400 focus:ring-1 focus:ring-primary-200',
      )}
    />
  );
}

function Stat({
  label,
  value,
  readOnly,
  emphasis,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div data-readonly={readOnly ? 'extra-stat' : undefined}>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={clsx(
          'tabular-nums mt-0.5',
          emphasis ? 'font-bold text-emerald-700' : 'text-slate-900',
        )}
      >
        {value}
      </div>
    </div>
  );
}
