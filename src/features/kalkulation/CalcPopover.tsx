/**
 * Per-cell scratch calculator — matches the Excel pattern where calculators
 * write a formula like `schlitz + Q*querschnitt + 5` next to a position
 * and the result lands in Material EK / Min/Einheit / NU EK.
 *
 * Reuses the existing `evaluateAufmass` evaluator (REB-23.003-lite — supports
 * multi-line, free-text annotations, subtraction with leading `-`). The
 * total of all lines is what gets committed to the cell.
 *
 * Optional Faktoren-Bibliothek: when the project carries imported faktoren
 * (PART P captured the N-W × 2-12 grid as structured entries), each named
 * factor renders as a clickable chip — click inserts `name` into the
 * expression. Pre-populated factor values resolve at evaluation time via
 * a token substitution pass before handing off to evaluateAufmass.
 *
 * UX:
 *   - Σ icon next to a cell input opens the popover (anchored to the cell)
 *   - Multi-line textarea; live preview of each line + total
 *   - Faktoren chips at the bottom (collapsible if > 6)
 *   - "Übernehmen" commits the rounded total back to the cell
 *   - Esc / backdrop click cancels (cell unchanged)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sigma, X, ChevronDown, AlertCircle, Bookmark } from 'lucide-react';
import clsx from 'clsx';
import { evaluateAufmass } from './aufmass';
import { formatNum } from './calc';
import type { FaktorEntry } from './types';

export type CalcPopoverProps = {
  /** Current cell value (used as the starting expression if the user has nothing). */
  initialValue: number;
  /** Optional Faktoren-Bibliothek to surface as clickable chips. */
  faktoren?: FaktorEntry[];
  /** Optional position-level context: when set, a `Q` token in the
   *  expression resolves to the position's Menge. Mirrors the Excel pattern
   *  where Q is the row's quantity. */
  contextMenge?: number;
  /** Fired with the rounded numeric total when the calculator clicks Übernehmen. */
  onApply: (value: number) => void;
  /** Optional label shown in the popover header (e.g. "Material EK"). */
  label?: string;
};

/**
 * Substitute named factor values + the special `Q` token into the
 * expression before evaluation. Factors are matched WHOLE-WORD so a factor
 * named "kabel" doesn't accidentally rewrite "kabelrinne".
 */
function preprocessExpression(
  expr: string,
  faktoren: FaktorEntry[] | undefined,
  q: number | undefined,
): string {
  let out = expr;
  // Q first (single-letter, always whole-word — surrounded by non-word chars
  // or start/end of string).
  if (q !== undefined && Number.isFinite(q)) {
    out = out.replace(/\bQ\b/g, String(q));
  }
  if (faktoren && faktoren.length > 0) {
    // Sort by name length descending so longer names match before shorter
    // prefixes (e.g. "kabelrinne" before "kabel").
    const sorted = [...faktoren].sort((a, b) => b.name.length - a.name.length);
    for (const f of sorted) {
      if (typeof f.ep !== 'number') continue;
      // Escape regex special chars in the name.
      const escaped = f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'gi');
      out = out.replace(re, String(f.ep));
    }
  }
  return out;
}

export default function CalcPopover({
  initialValue,
  faktoren,
  contextMenge,
  onApply,
  label,
}: CalcPopoverProps) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [showAllFaktoren, setShowAllFaktoren] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset the expression when the popover opens — start with the current value
  // as a single line, so the user can edit / replace it.
  useEffect(() => {
    if (!open) return;
    setExpr(initialValue > 0 ? formatNum(initialValue, initialValue % 1 === 0 ? 0 : 2) : '');
    const t = setTimeout(() => textareaRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, initialValue]);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Live evaluation: pre-process tokens, then run through evaluateAufmass.
  const result = useMemo(() => {
    const processed = preprocessExpression(expr, faktoren, contextMenge);
    return evaluateAufmass(processed);
  }, [expr, faktoren, contextMenge]);

  const visibleFaktoren = useMemo(() => {
    if (!faktoren) return [];
    const usable = faktoren.filter((f) => typeof f.ep === 'number' && f.name.trim().length > 0);
    return showAllFaktoren ? usable : usable.slice(0, 6);
  }, [faktoren, showAllFaktoren]);
  const totalFaktoren = faktoren?.filter((f) => typeof f.ep === 'number').length ?? 0;

  function insertToken(name: string) {
    setExpr((prev) => {
      const sep = prev.length === 0 ? '' : (prev.endsWith('\n') || prev.endsWith(' ') ? '' : ' ');
      return prev + sep + name;
    });
    textareaRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        title="Formel / Faktoren rechnen"
        aria-label="Formel eingeben"
        data-testid="calc-trigger"
        className={clsx(
          'inline-flex items-center justify-center w-5 h-5 rounded text-slate-400 shrink-0',
          'hover:text-primary-600 hover:bg-primary-50/60',
          open && 'text-primary-700 bg-primary-100',
        )}
      >
        <Sigma className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Scratch-Rechner"
          data-testid="calc-popover"
        >
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] cursor-default"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <header className="flex items-center gap-2 px-4 h-12 border-b border-slate-100 bg-slate-50/60">
              <Sigma className="w-4 h-4 text-primary-600" />
              <div className="font-semibold text-sm text-slate-900">
                Rechenfeld {label && <span className="text-slate-500 font-normal">· {label}</span>}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="ml-auto p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-4 space-y-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Formel (eine Zeile = ein Summand; <code className="font-mono">-</code> am Anfang subtrahiert)
                </span>
                <textarea
                  ref={textareaRef}
                  value={expr}
                  onChange={(e) => setExpr(e.target.value)}
                  rows={Math.min(Math.max(3, expr.split(/\r?\n/).length), 8)}
                  spellCheck={false}
                  placeholder={`Wand 1   3.50 * 2.80\n- Tür    2.10 * 1.00\nZuschnitt 5\n${contextMenge !== undefined ? '\n(Q = ' + contextMenge + ')' : ''}`}
                  className="mt-1 w-full text-sm font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200 leading-relaxed"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Token: <code className="font-mono bg-slate-100 px-1 rounded">Q</code> = Menge der Position
                  {totalFaktoren > 0 && (
                    <> · Faktoren-Namen werden ersetzt (siehe unten).</>
                  )}
                </p>
              </label>

              {/* Live preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 text-xs">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  Vorschau
                </div>
                {result.lines.length === 0 ? (
                  <p className="text-slate-400 italic">— noch nichts —</p>
                ) : (
                  <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                    {result.lines.map((l, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="flex-1 truncate text-slate-500">{l.annotation || `Zeile ${i + 1}`}</span>
                        {l.error ? (
                          <span className="inline-flex items-center gap-1 text-rose-600">
                            <AlertCircle className="w-3 h-3" />
                            {l.error}
                          </span>
                        ) : l.value === null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span
                            className={clsx(
                              'tabular-nums font-mono',
                              l.signedValue < 0 ? 'text-rose-700' : 'text-slate-700',
                            )}
                          >
                            {l.signedValue < 0 ? '−' : ''}
                            {formatNum(Math.abs(l.signedValue), Math.abs(l.signedValue) % 1 === 0 ? 0 : 2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 mt-2 pt-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Summe</span>
                  <span
                    className={clsx(
                      'tabular-nums font-bold text-base',
                      result.hasErrors ? 'text-rose-700' : 'text-emerald-700',
                    )}
                  >
                    {formatNum(result.total, result.total % 1 === 0 ? 0 : 2)}
                  </span>
                </div>
              </div>

              {/* Faktoren-Bibliothek chips */}
              {totalFaktoren > 0 && (
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold inline-flex items-center gap-1">
                      <Bookmark className="w-3 h-3" />
                      Faktoren ({totalFaktoren})
                    </span>
                    {totalFaktoren > 6 && (
                      <button
                        type="button"
                        onClick={() => setShowAllFaktoren((s) => !s)}
                        className="text-[10px] text-primary-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        {showAllFaktoren ? 'weniger' : 'alle zeigen'}
                        <ChevronDown className={clsx('w-3 h-3 transition-transform', showAllFaktoren && 'rotate-180')} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {visibleFaktoren.map((f) => (
                      <button
                        key={`${f.sourceCol}${f.sourceRow}`}
                        type="button"
                        onClick={() => insertToken(f.name)}
                        title={`${f.name}${f.einheit ? ' (' + f.einheit + ')' : ''} = ${f.ep}`}
                        data-testid={`faktor-chip-${f.name}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 hover:bg-primary-100 text-slate-700 hover:text-primary-700"
                      >
                        {f.name}
                        <span className="text-slate-400">{typeof f.ep === 'number' ? formatNum(f.ep, 2) : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 px-4 h-12 border-t border-slate-100 bg-slate-50/40">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  // Round to 4 decimals — matches the Aufmaß behaviour and avoids
                  // float noise when the result feeds calculatePosition.
                  const rounded = Math.round(result.total * 10000) / 10000;
                  onApply(rounded);
                  setOpen(false);
                }}
                disabled={result.hasErrors || !Number.isFinite(result.total)}
                data-testid="calc-apply"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Übernehmen ({formatNum(result.total, result.total % 1 === 0 ? 0 : 2)})
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
