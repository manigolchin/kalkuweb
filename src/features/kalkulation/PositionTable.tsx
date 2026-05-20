import { memo, useCallback, useMemo, type ChangeEvent, type ClipboardEvent } from 'react';
import { Eye, EyeOff, Plus, Trash2, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import type { CalcParams, Position } from './types';
import { calculatePosition, formatEUR, formatNum, makeBlankPosition } from './calc';
import { nanoid } from 'nanoid';

type Col = { key: keyof Position; label: string; width: string; align?: 'right' };

const COLS: Col[] = [
  { key: 'oz', label: 'OZ', width: 'w-24' },
  { key: 'shortText', label: 'Kurztext', width: 'flex-1 min-w-[12rem]' },
  { key: 'quantity', label: 'Menge', width: 'w-24', align: 'right' },
  { key: 'unit', label: 'EH', width: 'w-16' },
  { key: 'materialCost', label: 'Material €/EH', width: 'w-28', align: 'right' },
  { key: 'timeMinutes', label: 'Zeit min/EH', width: 'w-28', align: 'right' },
  { key: 'nuCost', label: 'NU €/EH', width: 'w-24', align: 'right' },
];

type Props = {
  positions: Position[];
  params: CalcParams;
  onChange: (positions: Position[]) => void;
};

export default function PositionTable({ positions, params, onChange }: Props) {
  const calculatedRows = useMemo(
    () =>
      positions.map((p) => ({
        position: p,
        calc: calculatePosition(p, params),
      })),
    [positions, params],
  );

  const updateRow = useCallback(
    (id: string, patch: Partial<Position>) => {
      onChange(positions.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [positions, onChange],
  );

  const updateNumber = useCallback(
    (id: string, key: keyof Position, raw: string) => {
      const n = parseDeNumber(raw);
      onChange(positions.map((p) => (p.id === id ? { ...p, [key]: n } : p)));
    },
    [positions, onChange],
  );

  const removeRow = useCallback(
    (id: string) => {
      onChange(positions.filter((p) => p.id !== id));
    },
    [positions, onChange],
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      onChange(
        positions.map((p) => (p.id === id ? { ...p, visibleToCustomer: !p.visibleToCustomer } : p)),
      );
    },
    [positions, onChange],
  );

  const toggleHeader = useCallback(
    (id: string) => {
      onChange(positions.map((p) => (p.id === id ? { ...p, isHeader: !p.isHeader } : p)));
    },
    [positions, onChange],
  );

  const addRow = useCallback(
    (afterId?: string) => {
      const id = nanoid(12);
      const insertAt = afterId
        ? positions.findIndex((p) => p.id === afterId) + 1
        : positions.length;
      const sortOrder =
        insertAt < positions.length
          ? (positions[insertAt - 1]?.sortOrder ?? 0) + 1
          : (positions[positions.length - 1]?.sortOrder ?? 0) + 1;
      const fresh = makeBlankPosition(id, sortOrder);
      const next = [...positions.slice(0, insertAt), fresh, ...positions.slice(insertAt)];
      onChange(reorder(next));
    },
    [positions, onChange],
  );

  const addHeader = useCallback(() => {
    const id = nanoid(12);
    const sortOrder = (positions[positions.length - 1]?.sortOrder ?? 0) + 1;
    const fresh: Position = {
      ...makeBlankPosition(id, sortOrder),
      isHeader: true,
      shortText: 'Neuer Titel',
    };
    onChange([...positions, fresh]);
  }, [positions, onChange]);

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTableElement>) => {
      const text = e.clipboardData.getData('text/plain');
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      if (lines.length === 0) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      const sep = lines[0].includes('\t') ? '\t' : ';';
      const rows: Position[] = lines.map((line, idx) => {
        const cells = line.split(sep);
        const id = nanoid(12);
        const sortOrder = (positions[positions.length - 1]?.sortOrder ?? 0) + 1 + idx;
        return {
          ...makeBlankPosition(id, sortOrder),
          oz: (cells[0] || '').trim(),
          shortText: (cells[1] || '').trim(),
          quantity: parseDeNumber(cells[2] || '0'),
          unit: (cells[3] || '').trim(),
          materialCost: parseDeNumber(cells[4] || '0'),
          timeMinutes: parseDeNumber(cells[5] || '0'),
          nuCost: parseDeNumber(cells[6] || '0'),
        };
      });
      onChange([...positions, ...rows]);
    },
    [positions, onChange],
  );

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto" onPasteCapture={handlePaste}>
        <table className="w-full text-sm" onPaste={handlePaste}>
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-8 px-2 py-2.5"></th>
              <th className="w-10 px-2 py-2.5">Anz.</th>
              {COLS.map((c) => (
                <th
                  key={c.key as string}
                  className={clsx('px-2 py-2.5 text-left font-semibold', c.align === 'right' && 'text-right')}
                >
                  {c.label}
                </th>
              ))}
              <th className="w-28 px-2 py-2.5 text-right font-semibold">EP €/EH</th>
              <th className="w-28 px-2 py-2.5 text-right font-semibold">GP €</th>
              <th className="w-8 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {calculatedRows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                  Keine Positionen. Klicken Sie auf <strong>Position hinzufügen</strong> oder kopieren Sie Zeilen aus Excel und fügen Sie sie ein (Strg+V).
                </td>
              </tr>
            )}
            {calculatedRows.map(({ position: p, calc }) => (
              <tr
                key={p.id}
                className={clsx(
                  'border-t border-slate-100 group',
                  p.isHeader && 'bg-primary-50/40',
                  !p.visibleToCustomer && 'opacity-60',
                )}
              >
                <td className="px-1 py-1 align-middle">
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                </td>
                <td className="px-1 py-1 align-middle">
                  <button
                    onClick={() => toggleVisibility(p.id)}
                    title={p.visibleToCustomer ? 'Für Kunden sichtbar' : 'Vor Kunden versteckt'}
                    aria-label="Sichtbarkeit umschalten"
                    className={clsx(
                      'p-1 rounded-md transition-colors',
                      p.visibleToCustomer
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-300 hover:bg-slate-100',
                    )}
                  >
                    {p.visibleToCustomer ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </td>

                {p.isHeader ? (
                  <td colSpan={COLS.length} className="px-2 py-1.5">
                    <input
                      value={p.shortText}
                      onChange={(e) => updateRow(p.id, { shortText: e.target.value })}
                      placeholder="Titel / Abschnittsüberschrift"
                      className="w-full bg-transparent font-semibold text-primary-700 px-1 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-primary-400 rounded"
                    />
                  </td>
                ) : (
                  <>
                    <Cell value={p.oz} onChange={(v) => updateRow(p.id, { oz: v })} />
                    <Cell value={p.shortText} onChange={(v) => updateRow(p.id, { shortText: v })} />
                    <NumCell value={p.quantity} onChange={(v) => updateNumber(p.id, 'quantity', v)} />
                    <Cell value={p.unit} onChange={(v) => updateRow(p.id, { unit: v })} small />
                    <NumCell value={p.materialCost} onChange={(v) => updateNumber(p.id, 'materialCost', v)} />
                    <NumCell value={p.timeMinutes} onChange={(v) => updateNumber(p.id, 'timeMinutes', v)} />
                    <NumCell value={p.nuCost} onChange={(v) => updateNumber(p.id, 'nuCost', v)} />
                  </>
                )}

                <td className="px-2 py-1 text-right tabular-nums text-slate-700">
                  {p.isHeader ? '' : formatNum(calc.ep, 2)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums font-medium text-slate-900">
                  {p.isHeader ? '' : formatEUR(calc.gp)}
                </td>
                <td className="px-1 py-1 text-right">
                  <button
                    onClick={() => removeRow(p.id)}
                    className="p-1 rounded-md text-slate-300 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Zeile löschen"
                    aria-label="Zeile löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-3 py-2 flex flex-wrap items-center gap-2 bg-slate-50/60">
        <button
          onClick={() => addRow()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Position
        </button>
        <button
          onClick={addHeader}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Titel
        </button>
        <button
          onClick={() => {
            const yes = positions.some((p) => !p.visibleToCustomer);
            onChange(positions.map((p) => ({ ...p, visibleToCustomer: yes })));
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-600 hover:border-slate-300"
          title="Alle Zeilen für Kunde an/aus"
        >
          <Eye className="w-3.5 h-3.5" />
          Sichtbarkeit umschalten
        </button>
        <span className="text-xs text-slate-400 ml-auto hidden sm:inline">
          Tipp: aus Excel kopieren und mit Strg+V einfügen.
        </span>
      </div>

      {/* Hidden helper for accessibility of header toggle */}
      <button
        type="button"
        onClick={() => positions[0] && toggleHeader(positions[0].id)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}

function parseDeNumber(s: string): number {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const cleaned = String(s).replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const Cell = memo(function Cell({
  value,
  onChange,
  small,
}: {
  value: string;
  onChange: (v: string) => void;
  small?: boolean;
}) {
  return (
    <td className="px-1 py-1">
      <input
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={clsx(
          'w-full px-1.5 py-1 rounded-md border border-transparent bg-transparent outline-none',
          'focus:bg-white focus:border-primary-300 focus:ring-1 focus:ring-primary-200',
          small && 'text-xs',
        )}
      />
    </td>
  );
});

const NumCell = memo(function NumCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <td className="px-1 py-1">
      <input
        value={formatNum(value, value % 1 === 0 ? 0 : 2)}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="w-full px-1.5 py-1 rounded-md border border-transparent bg-transparent text-right tabular-nums outline-none focus:bg-white focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
      />
    </td>
  );
});

function reorder(arr: Position[]): Position[] {
  return arr.map((p, i) => ({ ...p, sortOrder: i + 1 }));
}
