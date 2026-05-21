import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileCode2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { ACCEPTED_EXTENSIONS, parseGaebFile, type ParsedGaeb } from '@/lib/gaeb';
import { makeBlankPosition } from './calc';
import type { Position } from './types';
import {
  KALKU_FIELDS,
  autoMapColumns,
  buildPreviewRows,
  detectFileKind,
  parseSheet,
  previewToPositions,
  type KalkuField,
  type MappingSelection,
  type PreviewRow,
  type SheetParse,
} from './excelImport';

const SHEET_EXTS = ['.xlsx', '.xls', '.csv', '.ods'];

type Step = 'drop' | 'parsing' | 'map' | 'preview' | 'done';

type Mode = 'append' | 'replace';

type Props = {
  open: boolean;
  onClose: () => void;
  onImport: (positions: Position[], mode: Mode) => void;
  existingCount: number;
};

export default function ImportDialog({ open, onClose, onImport, existingCount }: Props) {
  const [step, setStep] = useState<Step>('drop');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filename, setFilename] = useState<string>('');

  // GAEB path
  const [gaeb, setGaeb] = useState<ParsedGaeb | null>(null);
  // Sheet path
  const [sheet, setSheet] = useState<SheetParse | null>(null);
  const [mapping, setMapping] = useState<MappingSelection | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [mode, setMode] = useState<Mode>('append');
  const [skipErrors, setSkipErrors] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);

  // Reset on open. Body scroll-lock while open.
  useEffect(() => {
    if (!open) return;
    setStep('drop');
    setError(null);
    setGaeb(null);
    setSheet(null);
    setMapping(null);
    setPreview([]);
    setFilename('');
    setMode('append');
    setSkipErrors(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Recompute preview when mapping changes
  useEffect(() => {
    if (!sheet || !mapping) return;
    setPreview(buildPreviewRows(sheet.rows, mapping));
  }, [sheet, mapping]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFilename(file.name);
    setStep('parsing');
    const kind = detectFileKind(file.name);
    if (kind === 'gaeb') {
      try {
        const result = await parseGaebFile(file);
        setGaeb(result);
        setStep('preview');
      } catch (err) {
        setError((err as Error)?.message || 'GAEB-Datei konnte nicht gelesen werden.');
        setStep('drop');
      }
      return;
    }
    if (kind === 'spreadsheet') {
      try {
        const result = await parseSheet(file);
        setSheet(result);
        setMapping(autoMapColumns(result.headers));
        setStep('map');
      } catch (err) {
        setError((err as Error)?.message || 'Excel-Datei konnte nicht gelesen werden.');
        setStep('drop');
      }
      return;
    }
    setError('Dateityp wird nicht unterstützt. Erlaubt: GAEB (X81–X86, D81–D89, P81–P94), Excel (.xlsx, .xls, .ods) und CSV.');
    setStep('drop');
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  const okCount = preview.filter((p) => p.status === 'ok').length;
  const warnCount = preview.filter((p) => p.status === 'warn').length;
  const errorCount = preview.filter((p) => p.status === 'error').length;

  function doImport() {
    let positions: Position[];
    const startSort = mode === 'append' ? existingCount + 1 : 1;
    if (gaeb) {
      positions = gaebToPositions(gaeb, startSort, skipErrors);
    } else {
      positions = previewToPositions(preview, startSort, { skipErrors });
    }
    if (positions.length === 0) {
      setError('Keine importierbaren Zeilen gefunden.');
      return;
    }
    onImport(positions, mode);
    setStep('done');
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center gap-3 h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <Upload className="w-4 h-4 text-primary-600 dark:text-primary-300" />
          <h2 id="import-title" className="font-semibold text-slate-900 dark:text-slate-100">
            Datei importieren
          </h2>
          <Steps step={step} />
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {step === 'drop' && (
            <DropZone
              dragOver={dragOver}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            />
          )}

          {step === 'parsing' && (
            <div className="py-16 grid place-items-center text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500 mb-3" />
              <p className="text-sm">Lese „{filename}"…</p>
            </div>
          )}

          {step === 'map' && sheet && mapping && (
            <Mapper
              sheet={sheet}
              mapping={mapping}
              onChange={setMapping}
              preview={preview}
            />
          )}

          {step === 'preview' && (gaeb || sheet) && (
            <Preview
              sourceLabel={gaeb ? `GAEB · ${gaeb.formatLabel} · ${gaeb.positionCount} Pos.` : `${sheet?.filename} · Tabelle "${sheet?.sheetName}"`}
              gaeb={gaeb}
              sheetPreview={preview}
              okCount={okCount}
              warnCount={warnCount}
              errorCount={errorCount}
            />
          )}

          {step === 'done' && (
            <div className="py-16 grid place-items-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8 mb-2" />
              <p className="font-semibold text-slate-900 dark:text-slate-100">Import erfolgreich.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Die Positionen sind im Projekt verfügbar.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 px-5 h-14 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          {step === 'preview' || step === 'map' ? (
            <ModeSwitch mode={mode} onChange={setMode} existingCount={existingCount} />
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {step === 'drop' && 'Drag & Drop oder klicken zum Auswählen.'}
              {step === 'parsing' && 'Bitte warten…'}
              {step === 'done' && 'Fertig.'}
            </span>
          )}

          <div className="flex items-center gap-2">
            {(step === 'map' || step === 'preview') && (
              <button
                type="button"
                onClick={() => {
                  setStep('drop');
                  setGaeb(null);
                  setSheet(null);
                  setMapping(null);
                  setPreview([]);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Andere Datei
              </button>
            )}

            {step === 'map' && (
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
              >
                Weiter zur Vorschau
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <>
                <label className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mr-2">
                  <input
                    type="checkbox"
                    checked={skipErrors}
                    onChange={(e) => setSkipErrors(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  Fehlerhafte Zeilen überspringen
                </label>
                <button
                  type="button"
                  onClick={doImport}
                  disabled={okCount + warnCount + (skipErrors ? 0 : errorCount) === 0}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {mode === 'append' ? 'Anhängen' : 'Ersetzen'}
                </button>
              </>
            )}

            {step === 'done' && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
              >
                Schließen
              </button>
            )}
          </div>
        </footer>

        <input
          ref={fileRef}
          type="file"
          accept={[...ACCEPTED_EXTENSIONS, ...SHEET_EXTS].join(',')}
          onChange={onPick}
          className="hidden"
        />
      </div>
    </div>
  );
}

/* ─── Substeps ──────────────────────────────────────────────────────────── */

function Steps({ step }: { step: Step }) {
  const items: { key: Step; label: string }[] = [
    { key: 'drop', label: 'Datei' },
    { key: 'map', label: 'Spalten' },
    { key: 'preview', label: 'Vorschau' },
  ];
  const idx = items.findIndex((i) => i.key === step);
  return (
    <ol className="hidden md:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 ml-4">
      {items.map((it, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <li key={it.key} className="inline-flex items-center gap-2">
            <span
              className={clsx(
                'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ring-1 ring-inset',
                active && 'bg-primary-100 text-primary-700 ring-primary-200 dark:bg-primary-500/20 dark:text-primary-200 dark:ring-primary-500/30',
                done && 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30',
                !active && !done && 'bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700',
              )}
            >
              {i + 1}
            </span>
            <span className={clsx(active && 'text-slate-700 dark:text-slate-200 font-medium')}>
              {it.label}
            </span>
            {i < items.length - 1 && <span className="text-slate-300 dark:text-slate-700">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

function DropZone({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: {
  dragOver: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
}) {
  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={clsx(
          'rounded-xl border-2 border-dashed transition-colors px-6 py-12 sm:py-16 text-center cursor-pointer',
          dragOver
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-500/10'
            : 'border-slate-300 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-500/50 bg-slate-50 dark:bg-slate-800/50',
        )}
      >
        <div className="inline-flex w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 items-center justify-center mb-3">
          <Upload className="w-5 h-5 text-primary-600 dark:text-primary-300" />
        </div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          Datei hier ablegen oder klicken zum Auswählen
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          GAEB X81–X86, D81–D89, P81–P94 · Excel (.xlsx, .xls, .ods) · CSV
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
        <FormatHint icon={FileCode2} title="GAEB" body="Direkt-Import mit Gruppen, Positionen, Langtext. Preisanteile aus Ihrer Vorlagen-Bibliothek werden automatisch ergänzt." />
        <FormatHint icon={FileSpreadsheet} title="Excel / CSV" body="Spalten werden automatisch erkannt (Pos, OZ, Bezeichnung, Menge, EH, Material, Zeit, NU). Sie können vor dem Import alles übersteuern." />
      </div>
    </div>
  );
}

function FormatHint({ icon: Icon, title, body }: { icon: typeof FileCode2; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
      <Icon className="w-4 h-4 mt-0.5 text-primary-600 dark:text-primary-300 flex-shrink-0" />
      <div>
        <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <p className="leading-relaxed mt-0.5">{body}</p>
      </div>
    </div>
  );
}

/* ─── Mapper ────────────────────────────────────────────────────────────── */

function Mapper({
  sheet,
  mapping,
  onChange,
  preview,
}: {
  sheet: SheetParse;
  mapping: MappingSelection;
  onChange: (m: MappingSelection) => void;
  preview: PreviewRow[];
}) {
  function setField(field: KalkuField, idx: number | null) {
    onChange({ ...mapping, [field]: idx });
  }
  const sampleRows = useMemo(() => preview.slice(0, 4), [preview]);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Spalten zuordnen
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Datei: <span className="font-mono">{sheet.filename}</span> · Tabelle "{sheet.sheetName}" · {sheet.rows.length} Zeilen
          </p>
        </div>
        <button
          onClick={() => onChange(autoMapColumns(sheet.headers))}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300"
        >
          <RotateCcw className="w-3 h-3" /> Auto-Erkennung wiederholen
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {KALKU_FIELDS.map(({ key, label, required }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label} {required && <span className="text-rose-500">*</span>}
            </span>
            <select
              value={mapping[key] ?? ''}
              onChange={(e) => setField(key, e.target.value === '' ? null : Number(e.target.value))}
              className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="">— nicht übernehmen —</option>
              {sheet.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `Spalte ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Live preview of the first 4 rows after mapping */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Live-Vorschau (erste 4 Zeilen)
        </p>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">OZ</th>
                <th className="px-2 py-1.5 text-left font-semibold">Kurztext</th>
                <th className="px-2 py-1.5 text-right font-semibold">Menge</th>
                <th className="px-2 py-1.5 text-left font-semibold">EH</th>
                <th className="px-2 py-1.5 text-right font-semibold">Material</th>
                <th className="px-2 py-1.5 text-right font-semibold">Zeit</th>
                <th className="px-2 py-1.5 text-right font-semibold">NU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sampleRows.map((p, i) => (
                <tr key={i} className="text-slate-700 dark:text-slate-200">
                  <td className="px-2 py-1.5 font-mono">{p.values.oz || '—'}</td>
                  <td className="px-2 py-1.5 truncate max-w-[12rem]">{p.values.shortText || '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.values.quantity || '—'}</td>
                  <td className="px-2 py-1.5">{p.values.unit || '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.values.materialCost || '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.values.timeMinutes || '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{p.values.nuCost || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Preview ───────────────────────────────────────────────────────────── */

function Preview({
  sourceLabel,
  gaeb,
  sheetPreview,
  okCount,
  warnCount,
  errorCount,
}: {
  sourceLabel: string;
  gaeb: ParsedGaeb | null;
  sheetPreview: PreviewRow[];
  okCount: number;
  warnCount: number;
  errorCount: number;
}) {
  // For GAEB, render its positions directly. For sheets, render PreviewRow.
  const rows = useMemo(() => {
    if (gaeb) {
      return gaeb.positions
        .filter((p) => p.type !== 'remark')
        .map((p) => ({
          oz: p.oz,
          shortText: p.kurztext,
          isHeader: p.type === 'group',
          quantity: p.menge ?? 0,
          unit: p.einheit || '',
          status: 'ok' as PreviewRow['status'],
          issues: [] as string[],
        }));
    }
    return sheetPreview.map((p) => ({
      oz: p.values.oz,
      shortText: p.values.shortText,
      isHeader: false,
      quantity: p.values.quantity,
      unit: p.values.unit,
      status: p.status,
      issues: p.issues,
    }));
  }, [gaeb, sheetPreview]);

  const importableCount = gaeb ? rows.filter((r) => !r.isHeader).length : okCount + warnCount;
  const gaebGroupCount = gaeb ? rows.filter((r) => r.isHeader).length : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">{sourceLabel}</p>
        <div className="flex items-center gap-2 text-xs">
          {gaeb ? (
            <>
              <Counter kind="ok" count={importableCount}>importierbar</Counter>
              {gaebGroupCount > 0 && (
                <Counter kind="info" count={gaebGroupCount}>Titel</Counter>
              )}
            </>
          ) : (
            <>
              <Counter kind="ok" count={okCount}>OK</Counter>
              {warnCount > 0 && <Counter kind="warn" count={warnCount}>Warnungen</Counter>}
              {errorCount > 0 && <Counter kind="error" count={errorCount}>Fehler</Counter>}
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-[42vh] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 z-10">
            <tr>
              <th className="px-2 py-2 text-center w-8"></th>
              <th className="px-2 py-2 text-left font-semibold">OZ</th>
              <th className="px-2 py-2 text-left font-semibold">Kurztext</th>
              <th className="px-2 py-2 text-right font-semibold">Menge</th>
              <th className="px-2 py-2 text-left font-semibold">EH</th>
              <th className="px-2 py-2 text-left font-semibold">Hinweise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r, i) => (
              <tr
                key={i}
                className={clsx(
                  'text-slate-700 dark:text-slate-200',
                  r.isHeader && 'bg-primary-50/60 dark:bg-primary-500/10 font-semibold',
                  r.status === 'error' && 'bg-rose-50/60 dark:bg-rose-950/20',
                  r.status === 'warn' && 'bg-amber-50/60 dark:bg-amber-950/20',
                )}
              >
                <td className="px-2 py-1.5 text-center">
                  <StatusDot status={r.status} isHeader={r.isHeader} />
                </td>
                <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-300">{r.oz || '—'}</td>
                <td className="px-2 py-1.5 truncate max-w-[18rem]">{r.shortText || '—'}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {r.isHeader ? '' : r.quantity !== 0 ? formatNum(r.quantity) : '—'}
                </td>
                <td className="px-2 py-1.5">{r.unit || (r.isHeader ? '' : '—')}</td>
                <td className="px-2 py-1.5 text-rose-600 dark:text-rose-300">{r.issues.join(' · ')}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                  Keine Zeilen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusDot({ status, isHeader }: { status: PreviewRow['status']; isHeader: boolean }) {
  if (isHeader) return <span className="inline-block w-2 h-2 rounded-full bg-sky-500" aria-label="Titel" />;
  if (status === 'ok') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline-block" aria-label="OK" />;
  if (status === 'warn') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline-block" aria-label="Warnung" />;
  return <AlertCircle className="w-3.5 h-3.5 text-rose-500 inline-block" aria-label="Fehler" />;
}

function Counter({
  kind,
  count,
  children,
}: {
  kind: 'ok' | 'warn' | 'error' | 'info';
  count: number;
  children: React.ReactNode;
}) {
  const cls = {
    ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    warn: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  }[kind];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold', cls)}>
      <span className="tabular-nums">{count}</span> {children}
    </span>
  );
}

/* ─── Mode switch ───────────────────────────────────────────────────────── */

function ModeSwitch({
  mode,
  onChange,
  existingCount,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  existingCount: number;
}) {
  return (
    <fieldset className="flex items-center gap-1.5 text-xs">
      <legend className="sr-only">Import-Modus</legend>
      <ModeButton active={mode === 'append'} onClick={() => onChange('append')}>
        Anhängen <span className="text-slate-400 dark:text-slate-500">({existingCount})</span>
      </ModeButton>
      <ModeButton active={mode === 'replace'} onClick={() => onChange('replace')}>
        Ersetzen
      </ModeButton>
    </fieldset>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-primary-100 text-primary-800 dark:bg-primary-500/20 dark:text-primary-100'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}

/* ─── GAEB → Position bridge ────────────────────────────────────────────── */

function gaebToPositions(gaeb: ParsedGaeb, startSortOrder: number, _skipErrors: boolean): Position[] {
  // Headers + items, in source order. Remarks are skipped.
  const out: Position[] = [];
  let order = startSortOrder;
  for (const p of gaeb.positions) {
    if (p.type === 'remark') continue;
    out.push({
      ...makeBlankPosition(nanoid(12), order),
      oz: p.oz || '',
      shortText: p.kurztext || '',
      longText: p.langtext || '',
      quantity: p.menge ?? 0,
      unit: p.einheit || '',
      isHeader: p.type === 'group',
      sectionPath: p.type === 'group' ? p.oz : '',
    });
    order += 1;
  }
  return out;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n);
}
