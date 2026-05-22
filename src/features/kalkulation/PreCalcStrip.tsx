/**
 * Per-row Vorrechnung strip — the 7 F1..F7 scratch slots that mirror the
 * Excel template's right-side factor columns. Each slot is a FormulaCell;
 * the calculator stashes intermediate values here, then references them
 * by name (F1, F2, ..., F7) in the row's Material EK / Min/Einheit / NU
 * formulas.
 *
 * Layout: horizontal strip rendered as a single <tr> spanning the full
 * table width, below the position row. Hidden by default; toggled per-row
 * via the calculator-icon button in the row.
 *
 * Visual cue: tinted background matching the Excel green/blue scheme so
 * the calculator instantly recognises the Vorrechnung area. Each cell is
 * labeled F1..F7 above the input.
 */

import FormulaCell, { type FSlotName, type PreCalcs } from './FormulaCell';
import type { FaktorEntry } from './types';

const F_SLOTS: ReadonlyArray<FSlotName> = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'];

export type PreCalcStripProps = {
  preCalcs?: PreCalcs;
  /** Commit handler for a single slot — only that slot is patched. */
  onSlotCommit: (slot: FSlotName, value: number, formula: string | undefined) => void;
  /** Faktoren passed through to each F-cell's autocomplete. */
  faktoren?: FaktorEntry[];
  /** Position's Menge — so F-cell formulas can use the Q token. */
  contextMenge?: number;
  /** Column-span of the parent <table> — used to make the strip span the
   *  whole table. PositionTableV2 has 14 columns. */
  colSpan: number;
  /** Human-readable position label (OZ + Bezeichnung) shown at the top of
   *  the strip so the calculator knows which row these F1..F7 belong to —
   *  important when the strip is open + the parent row scrolled away. */
  positionLabel?: string;
};

export default function PreCalcStrip({
  preCalcs,
  onSlotCommit,
  faktoren,
  contextMenge,
  colSpan,
  positionLabel,
}: PreCalcStripProps) {
  return (
    <tr data-testid="precalc-strip">
      <td colSpan={colSpan} className="bg-emerald-50/30 border-y-2 border-emerald-400 px-4 py-3">
        {positionLabel && (
          <div className="text-xs text-emerald-900 font-semibold mb-2 flex items-center gap-2">
            <span className="inline-block w-1 h-3 bg-emerald-500 rounded-sm" />
            Vorrechnung für: <span className="font-normal text-emerald-800/80">{positionLabel}</span>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold pt-2 shrink-0 leading-tight w-[80px]">
            F1..F7
            <div className="font-normal lowercase tracking-normal text-emerald-700/60 mt-0.5">
              In den Formeln links per Name nutzbar
            </div>
          </div>
          <div className="flex-1 grid grid-cols-7 gap-2">
            {F_SLOTS.map((slot) => {
              const cell = preCalcs?.[slot];
              return (
                <div key={slot} className="flex flex-col">
                  <label className="text-[10px] font-mono font-semibold text-emerald-800 mb-0.5 pl-1">
                    {slot}
                  </label>
                  {/* Render a mini-table so the FormulaCell's <td> root has
                      a valid <tr> parent. The flex column above just sits
                      inside the outer grid cell. */}
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <FormulaCell
                          value={cell?.value ?? 0}
                          formula={cell?.formula}
                          onCommit={(v, f) => onSlotCommit(slot, v, f)}
                          faktoren={faktoren}
                          contextMenge={contextMenge}
                          // F-cells can use the OTHER slots — pass the same
                          // preCalcs so a Tab in F4 can reference F1/F2/F3.
                          // (Cycles aren't detected — calculators don't write
                          // them in practice; matches Excel behaviour.)
                          preCalcs={preCalcs}
                          label={slot}
                        />
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
}
