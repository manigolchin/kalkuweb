/* Feature #3 — Snapshot Diff dialog.
 *
 * Compares two share snapshots of the same project side-by-side. Picks the
 * two newest active shares by default; user can switch either side.
 *
 * UI:
 *   - Header: project name + close
 *   - Picker strip: [from ▾] →  [to ▾]  Vertauschen   Netto-Delta: +1.234,56 €
 *   - Summary tiles: added | removed | changed | unchanged + totals
 *   - Table: one row per affected position, colour-coded
 */
import { useEffect, useMemo, useState } from 'react';
import {
  GitCompareArrows,
  X,
  ArrowLeftRight,
  Plus,
  Minus,
  Pencil,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { formatEUR } from './calc';
import type { ShareSummary } from './types';

type DiffResult = Awaited<ReturnType<typeof api.shares.diffSnapshots>>;

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  /** Active shares to choose from. Only those with snapshotData populated. */
  shares: ShareSummary[];
};

function shareLabel(s: ShareSummary): string {
  const date = s.snapshottedAt
    ? new Date(s.snapshottedAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(s.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
  const tag = s.nachtragNumber && s.nachtragNumber > 0 ? `N${s.nachtragNumber}` : 'v';
  const tokenTail = s.token ? `/${s.token.slice(0, 6)}…` : '';
  return `${tag} · ${date}${tokenTail}`;
}

export default function SnapshotDiffDialog({ open, onClose, projectId, projectName, shares }: Props) {
  // Default: oldest = first share (chronologically earliest), newest = last.
  // Filter to shares that actually have snapshots.
  const candidates = useMemo(() => {
    return [...shares]
      .filter((s) => !!s.snapshottedAt || !!s.snapshotHash)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }, [shares]);

  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection when opened.
  useEffect(() => {
    if (!open) return;
    if (candidates.length >= 2) {
      setFromId(candidates[0].id);
      setToId(candidates[candidates.length - 1].id);
    } else {
      setFromId('');
      setToId('');
    }
    setDiff(null);
    setError(null);
  }, [open, candidates]);

  // Body scroll-lock + ESC close.
  useEffect(() => {
    if (!open) return;
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

  // Fetch on selection change.
  useEffect(() => {
    if (!open) return;
    if (!fromId || !toId) return;
    if (fromId === toId) {
      setDiff(null);
      setError('Bitte zwei unterschiedliche Snapshots auswählen.');
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    api.shares
      .diffSnapshots(projectId, fromId, toId)
      .then((res) => {
        if (alive) {
          setDiff(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Diff konnte nicht geladen werden.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [open, projectId, fromId, toId]);

  if (!open) return null;

  const insufficient = candidates.length < 2;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Snapshot-Diff"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center gap-3 h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <GitCompareArrows className="w-4 h-4 text-primary-600 dark:text-primary-300" />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Versionen vergleichen
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {projectName}
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

        {/* Picker strip */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Von
            </label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              disabled={insufficient}
              className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50"
            >
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {shareLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              const tmp = fromId;
              setFromId(toId);
              setToId(tmp);
            }}
            disabled={insufficient || !fromId || !toId}
            title="Reihenfolge vertauschen"
            aria-label="Reihenfolge vertauschen"
            className="self-end h-9 px-2 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nach
            </label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              disabled={insufficient}
              className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50"
            >
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {shareLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto self-end text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Netto-Delta
            </p>
            <p
              className={clsx(
                'text-base font-bold tabular-nums',
                diff && diff.diff.delta > 0 && 'text-emerald-700 dark:text-emerald-300',
                diff && diff.diff.delta < 0 && 'text-rose-700 dark:text-rose-300',
                (!diff || diff.diff.delta === 0) && 'text-slate-500 dark:text-slate-400',
              )}
            >
              {diff
                ? `${diff.diff.delta >= 0 ? '+' : ''}${formatEUR(diff.diff.delta)}`
                : '—'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {insufficient && (
            <div className="px-5 py-12 text-center">
              <GitCompareArrows className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Mindestens 2 Snapshots benötigt.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                Teilen Sie das Projekt mit einem Kunden, dann erstellen Sie einen neuen Snapshot
                (über „Schnappschuss aktualisieren" oder einen weiteren Link). Sobald zwei Snapshots
                existieren, können Sie sie hier vergleichen.
              </p>
            </div>
          )}

          {!insufficient && loading && (
            <div className="px-5 py-16 grid place-items-center text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500 mb-2" />
              <p className="text-sm">Vergleich wird berechnet…</p>
            </div>
          )}

          {!insufficient && error && (
            <div className="px-5 py-4 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
            </div>
          )}

          {!insufficient && diff && !loading && !error && (
            <DiffBody diff={diff.diff} />
          )}
        </div>
      </div>
    </div>
  );
}

function DiffBody({ diff }: { diff: DiffResult['diff'] }) {
  const noChanges =
    diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0;
  return (
    <>
      {/* Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <Tile label="Hinzugefügt" value={diff.added.length} tone="emerald" />
        <Tile label="Entfernt" value={diff.removed.length} tone="rose" />
        <Tile label="Geändert" value={diff.changed.length} tone="amber" />
        <Tile label="Unverändert" value={diff.unchanged.length} tone="slate" />
      </div>

      {noChanges ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Keine Unterschiede.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
            Die beiden Snapshots enthalten identische Positionen, Mengen und Preise.
          </p>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 z-10">
            <tr>
              <th className="px-3 py-2 text-center w-10"></th>
              <th className="px-2 py-2 text-left font-semibold">OZ</th>
              <th className="px-2 py-2 text-left font-semibold">Kurztext</th>
              <th className="px-2 py-2 text-right font-semibold">Menge</th>
              <th className="px-2 py-2 text-left font-semibold">EH</th>
              <th className="px-2 py-2 text-right font-semibold">EP</th>
              <th className="px-2 py-2 text-right font-semibold">GP</th>
              <th className="px-2 py-2 text-left font-semibold">Änderung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {diff.removed.map((p) => (
              <RemovedRow key={`r-${p.id}`} row={p} />
            ))}
            {diff.added.map((p) => (
              <AddedRow key={`a-${p.id}`} row={p} />
            ))}
            {diff.changed.map((c) => (
              <ChangedPair key={`c-${c.before.id}`} before={c.before} after={c.after} fields={c.fields} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'rose' | 'amber' | 'slate';
}) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    rose: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    slate: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }[tone];
  return (
    <div className={clsx('rounded-lg border p-3', cls)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}

function AddedRow({ row }: { row: DiffResult['diff']['added'][number] }) {
  return (
    <tr className="bg-emerald-50/50 dark:bg-emerald-950/15 text-slate-800 dark:text-slate-100">
      <td className="px-3 py-1.5 text-center">
        <Plus className="w-3.5 h-3.5 inline-block text-emerald-600 dark:text-emerald-400" aria-label="Hinzugefügt" />
      </td>
      <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">{row.oz || '—'}</td>
      <td className="px-2 py-1.5 truncate max-w-[18rem]">{row.shortText || '—'}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{row.quantity || '—'}</td>
      <td className="px-2 py-1.5">{row.unit || '—'}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatEUR(row.ep)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatEUR(row.gp)}</td>
      <td className="px-2 py-1.5 text-emerald-700 dark:text-emerald-300 font-medium">+ {formatEUR(row.gp)} netto</td>
    </tr>
  );
}

function RemovedRow({ row }: { row: DiffResult['diff']['removed'][number] }) {
  return (
    <tr className="bg-rose-50/50 dark:bg-rose-950/15 text-slate-600 dark:text-slate-400">
      <td className="px-3 py-1.5 text-center">
        <Minus className="w-3.5 h-3.5 inline-block text-rose-600 dark:text-rose-400" aria-label="Entfernt" />
      </td>
      <td className="px-2 py-1.5 font-mono text-[11px] line-through">{row.oz || '—'}</td>
      <td className="px-2 py-1.5 truncate max-w-[18rem] line-through">{row.shortText || '—'}</td>
      <td className="px-2 py-1.5 text-right tabular-nums line-through">{row.quantity || '—'}</td>
      <td className="px-2 py-1.5 line-through">{row.unit || '—'}</td>
      <td className="px-2 py-1.5 text-right tabular-nums line-through">{formatEUR(row.ep)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums line-through">{formatEUR(row.gp)}</td>
      <td className="px-2 py-1.5 text-rose-700 dark:text-rose-300 font-medium">− {formatEUR(row.gp)} netto</td>
    </tr>
  );
}

function ChangedPair({
  before,
  after,
  fields,
}: {
  before: DiffResult['diff']['changed'][number]['before'];
  after: DiffResult['diff']['changed'][number]['after'];
  fields: string[];
}) {
  function cellClass(field: string) {
    return fields.includes(field) ? 'bg-amber-100/40 dark:bg-amber-900/20' : '';
  }
  const gpDelta = after.gp - before.gp;
  return (
    <tr className="text-slate-800 dark:text-slate-100">
      <td className="px-3 py-1.5 text-center align-top">
        <Pencil className="w-3.5 h-3.5 inline-block text-amber-600 dark:text-amber-400" aria-label="Geändert" />
      </td>
      <td className={clsx('px-2 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300 align-top', cellClass('oz'))}>
        {after.oz || before.oz || '—'}
      </td>
      <td className={clsx('px-2 py-1.5 max-w-[18rem] align-top', cellClass('shortText'))}>
        {fields.includes('shortText') ? (
          <div className="space-y-0.5">
            <div className="line-through text-slate-500 dark:text-slate-400">{before.shortText || '—'}</div>
            <div>{after.shortText || '—'}</div>
          </div>
        ) : (
          <span className="truncate inline-block max-w-full">{after.shortText || '—'}</span>
        )}
      </td>
      <td className={clsx('px-2 py-1.5 text-right tabular-nums align-top', cellClass('quantity'))}>
        {fields.includes('quantity') ? (
          <div className="space-y-0.5">
            <div className="line-through text-slate-500 dark:text-slate-400">{before.quantity}</div>
            <div>{after.quantity}</div>
          </div>
        ) : (
          after.quantity
        )}
      </td>
      <td className={clsx('px-2 py-1.5 align-top', cellClass('unit'))}>
        {fields.includes('unit') ? (
          <div className="space-y-0.5">
            <div className="line-through text-slate-500 dark:text-slate-400">{before.unit}</div>
            <div>{after.unit}</div>
          </div>
        ) : (
          after.unit
        )}
      </td>
      <td className={clsx('px-2 py-1.5 text-right tabular-nums align-top', cellClass('ep'))}>
        {fields.includes('ep') ? (
          <div className="space-y-0.5">
            <div className="line-through text-slate-500 dark:text-slate-400">{formatEUR(before.ep)}</div>
            <div>{formatEUR(after.ep)}</div>
          </div>
        ) : (
          formatEUR(after.ep)
        )}
      </td>
      <td className={clsx('px-2 py-1.5 text-right tabular-nums align-top', cellClass('gp'))}>
        {fields.includes('gp') ? (
          <div className="space-y-0.5">
            <div className="line-through text-slate-500 dark:text-slate-400">{formatEUR(before.gp)}</div>
            <div>{formatEUR(after.gp)}</div>
          </div>
        ) : (
          formatEUR(after.gp)
        )}
      </td>
      <td className="px-2 py-1.5 align-top">
        <span
          className={clsx(
            'inline-flex items-center font-medium',
            gpDelta > 0 && 'text-emerald-700 dark:text-emerald-300',
            gpDelta < 0 && 'text-rose-700 dark:text-rose-300',
            gpDelta === 0 && 'text-slate-500 dark:text-slate-400',
          )}
        >
          {gpDelta >= 0 ? '+' : ''}
          {formatEUR(gpDelta)}
        </span>
        <span className="text-slate-400 dark:text-slate-500 ml-1.5">· {fields.join(', ')}</span>
      </td>
    </tr>
  );
}
