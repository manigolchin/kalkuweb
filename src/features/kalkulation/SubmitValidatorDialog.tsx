/* Feature #4 — Pre-flight validator before Angebot submission.
 *
 * Flow: owner clicks "Validieren", picks the original X83 from disk, we parse
 * it and run validateBidAgainstTender against the project's current positions.
 * Result: green "kein Ausschlussrisiko" or a list of blocking issues + warnings.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck2,
  FileQuestion,
  FileWarning,
} from 'lucide-react';
import clsx from 'clsx';
import { ACCEPTED_EXTENSIONS, parseGaebFile, type ParsedGaeb } from '@/lib/gaeb';
import {
  validateBidAgainstTender,
  type ValidationResult,
  type ValidationIssue,
  type ProjectPositionLite,
} from '@/lib/gaeb/validator';

type Props = {
  open: boolean;
  onClose: () => void;
  /** The project's current (post-recalc) positions used as "the bid". */
  positions: ProjectPositionLite[];
  projectName: string;
};

export default function SubmitValidatorDialog({ open, onClose, positions, projectName }: Props) {
  const [phase, setPhase] = useState<'drop' | 'parsing' | 'result'>('drop');
  const [tender, setTender] = useState<ParsedGaeb | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('drop');
    setTender(null);
    setResult(null);
    setError(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  async function handleFile(file: File) {
    setError(null);
    setPhase('parsing');
    try {
      const parsed = await parseGaebFile(file);
      setTender(parsed);
      setResult(validateBidAgainstTender(parsed, positions));
      setPhase('result');
    } catch (err) {
      setError((err as Error)?.message || 'GAEB-Datei konnte nicht gelesen werden.');
      setPhase('drop');
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Submit-Validator"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary-600 dark:text-primary-300" />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Submit-Validator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {projectName} · Prüft Ihre Kalkulation gegen das Original-LV
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
            </div>
          )}

          {phase === 'drop' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Laden Sie das <strong>Original-LV</strong> der Vergabestelle hoch
                (X81, X83 oder X84). Wir gleichen alle Ordnungszahlen, Mengen und
                Einheiten gegen Ihre aktuelle Kalkulation ab und melden Abweichungen,
                die zu einem <strong>Angebotsausschluss</strong> führen könnten.
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={clsx(
                  'rounded-xl border-2 border-dashed transition-colors px-6 py-12 text-center cursor-pointer',
                  dragOver
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-slate-300 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-500/50 bg-slate-50 dark:bg-slate-800/50',
                )}
              >
                <div className="inline-flex w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Original-LV hier ablegen oder klicken
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  GAEB X81 / X83 / X84 / D81–D89 / P81–P94 / ÖNorm
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={onPick}
                className="hidden"
              />
            </div>
          )}

          {phase === 'parsing' && (
            <div className="py-12 grid place-items-center text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500 mb-2" />
              <p className="text-sm">LV wird geprüft…</p>
            </div>
          )}

          {phase === 'result' && result && tender && (
            <ResultView result={result} tenderFilename={tender.filename} />
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 px-5 h-14 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {phase === 'drop' && 'Vergabestelle-Datei erforderlich.'}
            {phase === 'parsing' && 'Bitte warten…'}
            {phase === 'result' && tender && (
              <>
                Geprüft gegen <span className="font-mono">{tender.filename}</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            {phase === 'result' && (
              <button
                type="button"
                onClick={() => setPhase('drop')}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
              >
                Andere Datei
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
            >
              Schließen
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ResultView({ result, tenderFilename }: { result: ValidationResult; tenderFilename: string }) {
  const blocking = result.issues.filter((i) => isBlocking(i));
  const warnings = result.issues.filter((i) => !isBlocking(i));

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div
        className={clsx(
          'rounded-xl border p-4 flex items-start gap-3',
          result.ok
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
        )}
      >
        {result.ok ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
        )}
        <div>
          <p
            className={clsx(
              'font-semibold',
              result.ok
                ? 'text-emerald-800 dark:text-emerald-200'
                : 'text-rose-800 dark:text-rose-200',
            )}
          >
            {result.ok
              ? 'Kein Ausschlussrisiko erkannt.'
              : `${blocking.length} formal blockierende Abweichung${blocking.length === 1 ? '' : 'en'} gefunden.`}
          </p>
          <p
            className={clsx(
              'text-xs mt-1',
              result.ok
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300',
            )}
          >
            {result.matched} von {result.tenderCount} Tender-Positionen sauber zugeordnet · {result.bidCount} Positionen im Angebot · Quelle: <span className="font-mono">{tenderFilename}</span>
          </p>
        </div>
      </div>

      {/* Bucket tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Fehlend" count={blocking.filter((i) => i.kind === 'missing-in-bid').length} tone="rose" />
        <Tile label="Menge ≠" count={blocking.filter((i) => i.kind === 'quantity-mismatch').length} tone="rose" />
        <Tile label="Einheit ≠" count={blocking.filter((i) => i.kind === 'unit-mismatch').length} tone="rose" />
        <Tile label="Hinweise" count={warnings.length} tone="amber" />
      </div>

      {/* Issues list */}
      {result.issues.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2 text-center w-10"></th>
                <th className="px-2 py-2 text-left font-semibold">OZ</th>
                <th className="px-2 py-2 text-left font-semibold">Position</th>
                <th className="px-2 py-2 text-left font-semibold">Problem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.issues.map((i, idx) => (
                <IssueRow key={idx} issue={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function isBlocking(i: ValidationIssue): boolean {
  return i.kind === 'missing-in-bid' || i.kind === 'quantity-mismatch' || i.kind === 'unit-mismatch';
}

function Tile({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: 'rose' | 'amber';
}) {
  const cls =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
      : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
  return (
    <div className={clsx('rounded-lg border p-3', cls)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1">{count}</p>
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const tone = isBlocking(issue) ? 'rose' : 'amber';
  const Icon =
    issue.kind === 'missing-in-bid'
      ? FileQuestion
      : issue.kind === 'extra-in-bid'
        ? FileCheck2
        : issue.kind === 'tender-qty-tbd'
          ? AlertTriangle
          : FileWarning;
  const text =
    issue.kind === 'missing-in-bid' ? issue.tenderText :
    issue.kind === 'extra-in-bid' ? issue.bidText :
    issue.tenderText;
  const message =
    issue.kind === 'missing-in-bid'
      ? `Im Angebot nicht enthalten (Vergabestelle erwartet${issue.tenderQuantity != null ? ` ${issue.tenderQuantity} ${issue.tenderUnit}` : ''}).`
      : issue.kind === 'extra-in-bid'
        ? `Im Original-LV nicht vorhanden — wird vermutlich ignoriert oder führt zu Aufklärungsbedarf.`
        : issue.kind === 'quantity-mismatch'
          ? `Vergabestelle: ${issue.tender} · Angebot: ${issue.bid} — Mengen müssen identisch sein.`
          : issue.kind === 'unit-mismatch'
            ? `Vergabestelle: "${issue.tender}" · Angebot: "${issue.bid}" — Einheiten müssen identisch sein.`
            : `Vergabestelle hat die Menge offen gelassen — Eventualposition prüfen.`;
  return (
    <tr className={clsx(
      tone === 'rose' && 'bg-rose-50/40 dark:bg-rose-950/15',
      tone === 'amber' && 'bg-amber-50/40 dark:bg-amber-950/15',
    )}>
      <td className="px-2 py-1.5 text-center align-top">
        <Icon className={clsx('w-3.5 h-3.5 inline-block', tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')} />
      </td>
      <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300 align-top whitespace-nowrap">
        {issue.oz}
      </td>
      <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200 align-top truncate max-w-[14rem]">
        {text || '—'}
      </td>
      <td className="px-2 py-1.5 align-top text-slate-700 dark:text-slate-200">{message}</td>
    </tr>
  );
}
