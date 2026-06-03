/**
 * FormulaCell — Excel-/Nevaris-/Notion-style inline formula cell for the
 * per-position cost inputs (Material EK · Min/Einheit · NU €).
 *
 * Design rationale (after the v1 modal-popover approach was rejected as
 * non-professional):
 *
 *   ✅ Display mode looks identical to a plain numeric cell — same width,
 *      same alignment, same shortcut to start typing. Calculators who only
 *      want to enter raw numbers see no clutter.
 *   ✅ Type `=` as the first character → cell silently switches to FORMULA
 *      mode (multiline textarea + live preview pill + autocomplete dropdown).
 *      Same affordance as Excel — no buttons to discover.
 *   ✅ Live preview pill at the cell's top edge shows the running total in
 *      green (red on parse error). Updates per keystroke.
 *   ✅ Autocomplete: as the user types a word matching a factor name's
 *      prefix, a ghost-text completion appears. Tab to accept; Enter to
 *      commit; Esc to cancel.
 *   ✅ Q is a reserved token = the row's current Menge.
 *   ✅ On commit: numeric total goes to the cell, the formula string is
 *      stored on the position so future re-renders show the same fx badge
 *      and the formula re-evaluates if ZSCHLG / factor values change.
 *   ✅ Cell with stored formula renders a small fx badge in the corner +
 *      hover tooltip showing the formula text. Click the cell → drops
 *      straight back into formula mode (no re-typing `=`).
 *   ✅ Type a plain number (no `=`) → formula is cleared. Same as Excel.
 *
 *   ❌ NOT a modal. ❌ NOT chips-per-cell. ❌ NOT a floating popover.
 *      Inline only — matches the calculator's existing data-entry rhythm.
 *
 * Storage model: matches Excel's "stored formula + cached value" pattern.
 * The numeric value is the source of truth for math (calculatePosition);
 * the formula is the source of truth for re-display + re-evaluation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { evaluateAufmass } from './aufmass';
import { formatNum } from './calc';
import type { FaktorEntry } from './types';

const RESERVED_TOKENS = ['Q'];
const F_SLOT_NAMES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] as const;
export type FSlotName = (typeof F_SLOT_NAMES)[number];

/** Per-row scratch slots — the Excel F1..F7 columns. Each slot is a
 *  cached value (the formula string lives on the Position too, but
 *  preprocessing only needs the value). */
export type PreCalcs = Partial<Record<FSlotName, { value: number; formula?: string }>>;

export type FormulaCellProps = {
  /** Current cached numeric value. */
  value: number;
  /** Stored formula string (when present, the cell shows the fx badge). */
  formula?: string;
  /**
   * Commit handler — called when the user presses Enter / blurs an edited
   * cell. `value` is the evaluated total (rounded to 4dp); `formula` is
   * the formula string if the user used `=` mode, otherwise `undefined`
   * (the calculator typed a plain number, so any prior formula is cleared).
   */
  onCommit: (value: number, formula: string | undefined) => void;
  /** Optional Faktoren-Bibliothek for autocomplete + name substitution. */
  faktoren?: FaktorEntry[];
  /** Position-row context — `Q` token resolves to this value. */
  contextMenge?: number;
  /** Per-row F1..F7 scratch slots — when set, references to F1..F7 in the
   *  expression resolve to the corresponding slot's cached value. */
  preCalcs?: PreCalcs;
  /** Extra named numeric tokens usable in the formula (whole-word, case-
   *  insensitive). Used by the EP-Geräte / EP-Löhne cells to expose
   *  `Zeit`, `verrechnungslohn`, `mittellohn`, `geraetesatz`, etc. so a custom
   *  formula can rebuild the Vorlage's own EP formula. */
  extraTokens?: Record<string, number>;
  /** Human-readable label shown in the preview pill tooltip. */
  label?: string;
};

/**
 * Substitute named factor values + the special `Q` token into the
 * expression before handing to the evaluator. Whole-word match; longest
 * name wins so "kabelrinne" doesn't get rewritten as "2.5 + rinne".
 */
function preprocessExpression(
  expr: string,
  faktoren: FaktorEntry[] | undefined,
  q: number | undefined,
  preCalcs: PreCalcs | undefined,
  extraTokens?: Record<string, number>,
): string {
  let out = expr;
  if (q !== undefined && Number.isFinite(q)) {
    out = out.replace(/\bQ\b/g, String(q));
  }
  // Named numeric tokens (Zeit, verrechnungslohn, …). Longest name first so a
  // short token can't shadow a longer one that contains it.
  if (extraTokens) {
    const entries = Object.entries(extraTokens)
      .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
      .sort((a, b) => b[0].length - a[0].length);
    for (const [name, v] of entries) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), String(v));
    }
  }
  // F1-F7 substitution — case-sensitive (the Excel convention uses
  // uppercase F1..F7 and a calculator typing 'f1' likely means something
  // else, possibly a variable name).
  if (preCalcs) {
    for (const slot of F_SLOT_NAMES) {
      const v = preCalcs[slot]?.value;
      if (typeof v === 'number' && Number.isFinite(v)) {
        const re = new RegExp(`\\b${slot}\\b`, 'g');
        out = out.replace(re, String(v));
      }
    }
  }
  if (faktoren && faktoren.length > 0) {
    const sorted = [...faktoren]
      .filter((f) => typeof f.ep === 'number' && f.name.trim().length > 0)
      .sort((a, b) => b.name.length - a.name.length);
    for (const f of sorted) {
      const escaped = f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'gi');
      out = out.replace(re, String(f.ep));
    }
  }
  return out;
}

/** Get the partial word at the cursor for autocomplete matching. */
function getWordAtCursor(text: string, cursor: number): { word: string; start: number } {
  const before = text.slice(0, cursor);
  const match = before.match(/[a-zA-ZäöüÄÖÜß][a-zA-ZäöüÄÖÜß0-9_]*$/);
  if (!match) return { word: '', start: cursor };
  return { word: match[0], start: cursor - match[0].length };
}

export default function FormulaCell({
  value,
  formula,
  onCommit,
  faktoren,
  contextMenge,
  preCalcs,
  extraTokens,
  label,
}: FormulaCellProps) {
  const d = value % 1 === 0 ? 0 : 2;
  const formatted = value === 0 ? '' : formatNum(value, d);
  const hasFormula = !!formula && formula.trim().length > 0;

  // Two edit modes: 'number' (single-line input) and 'formula' (multiline).
  // The initial mode when entering edit is derived from whether the cell
  // already has a stored formula.
  type Mode = 'display' | 'number' | 'formula';
  const [mode, setMode] = useState<Mode>('display');
  const [draft, setDraft] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus + auto-size when switching to formula mode.
  useEffect(() => {
    if (mode === 'formula' && textareaRef.current) {
      textareaRef.current.focus();
      // Resize to fit content (basic auto-grow).
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(Math.max(el.scrollHeight, 36), 200) + 'px';
    } else if (mode === 'number' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  // Live evaluation for formula mode.
  const evaluation = useMemo(() => {
    if (mode !== 'formula') return null;
    const processed = preprocessExpression(draft, faktoren, contextMenge, preCalcs, extraTokens);
    return evaluateAufmass(processed);
  }, [mode, draft, faktoren, contextMenge, preCalcs, extraTokens]);

  // Autocomplete: find the partial word at the cursor, suggest the first
  // factor name whose start matches case-insensitively. Tab to accept.
  const suggestion = useMemo(() => {
    if (mode !== 'formula' || !faktoren || faktoren.length === 0) return null;
    const { word } = getWordAtCursor(draft, cursor);
    if (word.length < 1) return null;
    const wl = word.toLowerCase();
    // Exclude already-exact matches so Tab doesn't replace a full name with itself.
    // F-slot names appear in autocomplete only if the row has any preCalcs
    // populated (otherwise referencing them yields 0 — confusing).
    const fSlotTokens: FaktorEntry[] = preCalcs
      ? F_SLOT_NAMES
          .filter((s) => preCalcs[s]?.value !== undefined)
          .map((s) => ({ name: s, ep: 0, sourceCol: '', sourceRow: 0, raw: {} } as FaktorEntry))
      : [];
    const reservedTokens: FaktorEntry[] = RESERVED_TOKENS.map(
      (t) => ({ name: t, ep: 0, sourceCol: '', sourceRow: 0, raw: {} } as FaktorEntry),
    );
    const extraTokenEntries: FaktorEntry[] = extraTokens
      ? Object.keys(extraTokens).map(
          (t) => ({ name: t, ep: 0, sourceCol: '', sourceRow: 0, raw: {} } as FaktorEntry),
        )
      : [];
    const candidates = [...faktoren, ...fSlotTokens, ...reservedTokens, ...extraTokenEntries]
      .filter((f) =>
        f.name.toLowerCase().startsWith(wl) && f.name.toLowerCase() !== wl,
      )
      .sort((a, b) => a.name.length - b.name.length);
    if (candidates.length === 0) return null;
    return { partial: word, completion: candidates[0].name.slice(word.length), full: candidates[0].name };
  }, [mode, draft, cursor, faktoren, preCalcs, extraTokens]);

  const acceptSuggestion = useCallback(() => {
    if (!suggestion || !textareaRef.current) return;
    const { word, start } = getWordAtCursor(draft, cursor);
    void word;
    const newText = draft.slice(0, start) + suggestion.full + draft.slice(cursor);
    const newCursor = start + suggestion.full.length;
    setDraft(newText);
    // Restore cursor after React updates.
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.value = newText;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
        setCursor(newCursor);
      }
    });
  }, [suggestion, draft, cursor]);

  function startEdit() {
    if (hasFormula) {
      setDraft(formula || '');
      setMode('formula');
    } else {
      setDraft(formatted);
      setMode('number');
    }
  }

  function commitFromNumber(raw: string) {
    if (raw === formatted) {
      // No change — preserve any existing formula.
      setMode('display');
      return;
    }
    // Plain-number input — clear any prior formula.
    if (raw.trim().startsWith('=')) {
      // The user switched to formula by editing in place — handle as formula.
      const f = raw.trim().replace(/^=\s*/, '');
      const processed = preprocessExpression(f, faktoren, contextMenge, preCalcs, extraTokens);
      const r = evaluateAufmass(processed);
      const rounded = Math.round(r.total * 10000) / 10000;
      onCommit(rounded, f);
    } else {
      const n = parseDeNumber(raw);
      onCommit(n, undefined);
    }
    setMode('display');
  }

  function commitFromFormula() {
    if (!evaluation) {
      setMode('display');
      return;
    }
    if (evaluation.hasErrors) {
      // Don't commit a broken formula; stay in formula mode + flash.
      return;
    }
    const rounded = Math.round(evaluation.total * 10000) / 10000;
    const cleaned = draft.trim();
    onCommit(rounded, cleaned.length > 0 ? cleaned : undefined);
    setMode('display');
  }

  function cancelEdit() {
    setDraft('');
    setMode('display');
  }

  // ───── render ─────

  if (mode === 'display') {
    return (
      <td
        className="bg-slate-50/70 border-t border-slate-100 px-1 py-[10px] align-top relative"
        onClick={startEdit}
      >
        <div className="relative">
          <input
            readOnly
            value={formatted}
            placeholder="0"
            data-testid={hasFormula ? 'formula-cell-with-fx' : 'formula-cell-plain'}
            title={hasFormula ? `Formel: ${formula}` : undefined}
            className={clsx(
              'w-full px-1.5 py-1 rounded text-right tabular-nums outline-none cursor-text border border-transparent',
              'placeholder:text-slate-300',
              value === 0 ? 'text-slate-500' : 'text-slate-900',
              hasFormula && 'bg-emerald-50/40 pr-5',
            )}
          />
          {hasFormula && (
            <span
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold text-emerald-700 bg-emerald-100 rounded px-0.5 leading-none py-0.5 pointer-events-none"
              aria-label="Formel hinterlegt"
            >
              fx
            </span>
          )}
        </div>
      </td>
    );
  }

  if (mode === 'number') {
    return (
      <td className="bg-white border-t border-slate-100 px-1 py-[10px] align-top">
        <input
          ref={inputRef}
          value={draft}
          placeholder="0  ·  = für Formel"
          inputMode="decimal"
          data-testid="formula-cell-number-input"
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            // Live promotion: typing `=` as first char flips to formula mode.
            if (v.trimStart().startsWith('=')) {
              const stripped = v.trimStart().replace(/^=\s?/, '');
              setDraft(stripped);
              setMode('formula');
            }
          }}
          onBlur={() => commitFromNumber(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (e.key === 'Escape') {
              e.preventDefault();
              cancelEdit();
            }
          }}
          className={clsx(
            'w-full px-1.5 py-1 rounded text-right tabular-nums outline-none border',
            'border-primary-400 ring-1 ring-primary-200 bg-white text-slate-900',
            'placeholder:text-slate-300',
          )}
        />
      </td>
    );
  }

  // ───── formula mode ─────
  return (
    <td
      className="bg-emerald-50/40 border-t border-emerald-200 px-1 py-[10px] align-top relative"
      data-testid="formula-cell-formula-mode"
    >
      {/* Preview pill — anchored to the top of the cell, hangs below the
          column header. Shows live total with a leading "fx =" so it reads
          as a formula. */}
      <div
        className={clsx(
          'absolute -top-3 right-1 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums font-mono font-bold border shadow-sm',
          evaluation && evaluation.hasErrors
            ? 'bg-rose-100 text-rose-800 border-rose-300'
            : 'bg-emerald-600 text-white border-emerald-700',
        )}
        title={label}
      >
        fx ={' '}
        {evaluation && !evaluation.hasErrors
          ? formatNum(evaluation.total, evaluation.total % 1 === 0 ? 0 : 2)
          : 'Fehler'}
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={draft}
          rows={Math.min(Math.max(2, draft.split(/\r?\n/).length), 8)}
          spellCheck={false}
          data-testid="formula-cell-formula-input"
          onSelect={(e) => setCursor((e.target as HTMLTextAreaElement).selectionStart)}
          onChange={(e) => {
            setDraft(e.target.value);
            setCursor(e.target.selectionStart);
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(Math.max(el.scrollHeight, 36), 200) + 'px';
          }}
          onKeyDown={(e) => {
            // Tab to accept autocomplete suggestion.
            if (e.key === 'Tab' && suggestion) {
              e.preventDefault();
              acceptSuggestion();
              return;
            }
            // Plain Enter commits; Shift+Enter inserts a newline.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitFromFormula();
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelEdit();
              return;
            }
          }}
          onBlur={(e) => {
            // Don't commit on blur if the user is clicking inside our own
            // cell (e.g. clicking the suggestion). Heuristic: relatedTarget
            // null = lost focus to the document → commit. Otherwise stay.
            if (e.relatedTarget && (e.currentTarget.parentElement?.contains(e.relatedTarget as Node))) {
              return;
            }
            commitFromFormula();
          }}
          placeholder={`= schlitz + Q * querschnitt${contextMenge !== undefined ? `   (Q = ${contextMenge})` : ''}`}
          className="w-full font-mono text-[12px] px-1.5 py-1 rounded outline-none resize-none border border-emerald-400 ring-1 ring-emerald-200 bg-white text-slate-900 leading-[1.4]"
        />
        {/* Ghost-text autocomplete hint */}
        {suggestion && (
          <div
            aria-hidden
            className="absolute top-1 left-1.5 pointer-events-none text-[12px] font-mono text-emerald-600/60 whitespace-pre"
          >
            <span className="invisible">{draft.slice(0, cursor)}</span>
            {suggestion.completion}
            <span className="text-[9px] font-sans not-italic text-emerald-700 bg-emerald-100 rounded px-1 ml-1 align-middle">
              ⇥
            </span>
          </div>
        )}
      </div>

      {/* Tiny hint strip below the textarea — Enter commits, Esc cancels. */}
      <div className="mt-1 text-[9px] text-emerald-700/70 leading-tight flex items-center justify-between">
        <span>
          <kbd className="font-mono">Enter</kbd> übern. ·{' '}
          <kbd className="font-mono">Esc</kbd> abbr.{' '}
          {suggestion && <>· <kbd className="font-mono">Tab</kbd> = {suggestion.full}</>}
        </span>
        {evaluation && evaluation.hasErrors && (
          <span className="text-rose-700 font-semibold">⚠ Formel-Fehler</span>
        )}
      </div>
    </td>
  );
}

function parseDeNumber(s: string): number {
  if (!s) return 0;
  const cleaned = String(s).replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
