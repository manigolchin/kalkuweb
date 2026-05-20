import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import {
  Eye, EyeOff, Plus, Trash2, GripVertical, Lock, Sigma, X, AlertCircle,
  Bookmark, BookmarkPlus, Search, FileUp, Loader2, ChevronRight, ChevronDown, FileText,
} from 'lucide-react';
import { parseGaebFile, type Position as GaebPosition, type ParsedGaeb } from '@/lib/gaeb';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  POSITION_TYPES,
  INTERNAL_POSITION_TYPES,
  POSITION_TYPE_LABELS,
  type CalcParams,
  type Position,
  type PositionType,
  type PositionTemplate,
} from './types';
import { calculatePosition, formatEUR, formatNum, makeBlankPosition } from './calc';
import { evaluateAufmass } from './aufmass';
import { api } from '@/lib/api';
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
  const [aufmassOpen, setAufmassOpen] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PositionTemplate[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFilter, setPickerFilter] = useState('');
  const [gaebImporting, setGaebImporting] = useState(false);
  const gaebFileInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedLong, setExpandedLong] = useState<Set<string>>(new Set());

  const toggleLongText = useCallback((id: string) => {
    setExpandedLong((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allLongIds = useMemo(
    () => positions.filter((p) => !p.isHeader && p.longText && p.longText.trim().length > 0).map((p) => p.id),
    [positions],
  );
  const allExpanded = allLongIds.length > 0 && allLongIds.every((id) => expandedLong.has(id));
  const expandAll = useCallback(() => setExpandedLong(new Set(allLongIds)), [allLongIds]);
  const collapseAll = useCallback(() => setExpandedLong(new Set()), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { templates } = await api.templates.list();
        if (alive) setTemplates(templates);
      } catch {
        // silent — templates are an optional helper
      }
    })();
    return () => { alive = false; };
  }, []);

  const saveAsTemplate = useCallback(async (p: Position) => {
    if (!p.shortText.trim()) {
      toast.error('Position braucht mindestens einen Kurztext zum Speichern.');
      return;
    }
    try {
      const t = await api.templates.create({
        oz: p.oz,
        shortText: p.shortText,
        longText: p.longText,
        unit: p.unit,
        defaultMaterialCost: p.materialCost,
        defaultTimeMinutes: p.timeMinutes,
        defaultNuCost: p.nuCost,
      });
      setTemplates((arr) => [t, ...arr]);
      toast.success(`„${t.shortText.slice(0, 32)}…" als Vorlage gespeichert.`);
    } catch {
      toast.error('Konnte nicht als Vorlage speichern.');
    }
  }, []);

  const insertFromTemplate = useCallback(
    async (t: PositionTemplate) => {
      const id = nanoid(12);
      const sortOrder = (positions[positions.length - 1]?.sortOrder ?? 0) + 1;
      const fresh: Position = {
        ...makeBlankPosition(id, sortOrder),
        oz: t.oz,
        shortText: t.shortText,
        longText: t.longText,
        unit: t.unit,
        materialCost: t.defaultMaterialCost,
        timeMinutes: t.defaultTimeMinutes,
        nuCost: t.defaultNuCost,
      };
      onChange([...positions, fresh]);
      setPickerOpen(false);
      setPickerFilter('');
      // Fire-and-forget use-count bump
      api.templates.use(t.id).then(() => {
        setTemplates((arr) =>
          arr.map((x) => (x.id === t.id ? { ...x, useCount: x.useCount + 1, lastUsedAt: new Date().toISOString() } : x)),
        );
      }).catch(() => {});
    },
    [positions, onChange],
  );

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await api.templates.delete(id);
      setTemplates((arr) => arr.filter((t) => t.id !== id));
    } catch {
      toast.error('Löschen fehlgeschlagen.');
    }
  }, []);

  /** Suggest a price from the user's Vorlagen library for a freshly-imported
   *  GAEB position. Strategy: exact OZ match first (most reliable), then
   *  case-insensitive prefix match on shortText. Returns the matched template
   *  or null. */
  const matchTemplate = useCallback((oz: string, shortText: string): PositionTemplate | null => {
    if (templates.length === 0) return null;
    if (oz) {
      const exact = templates.find((t) => t.oz && t.oz === oz);
      if (exact) return exact;
      // OZ prefix (e.g. template "01.01.10" matches imported "01.01.10.0001")
      const prefix = templates.find((t) => t.oz && oz.startsWith(t.oz));
      if (prefix) return prefix;
    }
    if (shortText) {
      const q = shortText.toLowerCase();
      // Prefer templates whose shortText is contained in the imported text
      const match = templates.find((t) => q.includes(t.shortText.toLowerCase()) || t.shortText.toLowerCase().includes(q));
      if (match) return match;
    }
    return null;
  }, [templates]);

  const onGaebFileSelected = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so re-uploading the same file fires onChange
    if (!file) return;
    setGaebImporting(true);
    try {
      const parsed: ParsedGaeb = await parseGaebFile(file);
      if (parsed.positions.length === 0) {
        toast.error(`Keine Positionen in ${file.name} gefunden (${parsed.formatLabel}).`);
        return;
      }
      const startSort = (positions[positions.length - 1]?.sortOrder ?? 0) + 1;
      let matched = 0;
      const imported: Position[] = parsed.positions.map((g: GaebPosition, idx) => {
        const id = nanoid(12);
        const isHeader = g.type === 'group';
        if (isHeader) {
          return {
            ...makeBlankPosition(id, startSort + idx),
            oz: g.oz,
            shortText: g.kurztext || `Gruppe ${g.oz}`,
            longText: g.langtext || '',
            isHeader: true,
            sectionPath: g.oz,
          };
        }
        const t = matchTemplate(g.oz, g.kurztext);
        if (t) matched += 1;
        return {
          ...makeBlankPosition(id, startSort + idx),
          oz: g.oz,
          shortText: g.kurztext || '(ohne Kurztext)',
          longText: g.langtext || '',
          unit: g.einheit || '',
          quantity: g.menge ?? 0,
          // Price-suggest from Vorlagen library; if GAEB had an EP we'd
          // ignore it (D83 typically has none, D84 has the bidder's prior
          // price which we don't want to anchor on).
          materialCost: t?.defaultMaterialCost ?? 0,
          timeMinutes: t?.defaultTimeMinutes ?? 0,
          nuCost: t?.defaultNuCost ?? 0,
          sectionPath: g.oz,
        };
      });
      onChange([...positions, ...imported]);
      const summary = matched > 0
        ? `${imported.length} Positionen aus ${parsed.formatLabel} importiert — davon ${matched} mit Preis-Vorschlag aus Ihrer Bibliothek.`
        : `${imported.length} Positionen aus ${parsed.formatLabel} importiert. Preise per Hand oder über die Vorlagen-Bibliothek setzen.`;
      toast.success(summary, { duration: 6000 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`GAEB-Import fehlgeschlagen: ${msg}`);
    } finally {
      setGaebImporting(false);
    }
  }, [positions, onChange, matchTemplate]);

  const filteredTemplates = useMemo(() => {
    const q = pickerFilter.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.shortText.toLowerCase().includes(q) || t.oz.toLowerCase().includes(q) || t.longText.toLowerCase().includes(q),
    );
  }, [templates, pickerFilter]);

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

  const setAufmassFormula = useCallback(
    (id: string, formula: string) => {
      const r = evaluateAufmass(formula);
      const newQty =
        formula.trim() === '' || r.hasErrors || !Number.isFinite(r.total)
          ? undefined
          : r.total;
      onChange(
        positions.map((p) =>
          p.id === id
            ? {
                ...p,
                aufmassFormula: formula,
                ...(newQty !== undefined ? { quantity: newQty } : {}),
              }
            : p,
        ),
      );
    },
    [positions, onChange],
  );

  const clearAufmassFormula = useCallback(
    (id: string) => {
      onChange(
        positions.map((p) => (p.id === id ? { ...p, aufmassFormula: '' } : p)),
      );
    },
    [positions, onChange],
  );

  const setPositionType = useCallback(
    (id: string, positionType: PositionType) => {
      onChange(
        positions.map((p) =>
          p.id === id
            ? {
                ...p,
                positionType,
                // Default-deny: internal types automatically hide from customer.
                // (Server enforces this too, but reflect it in the UI immediately.)
                visibleToCustomer: INTERNAL_POSITION_TYPES.has(positionType)
                  ? false
                  : p.visibleToCustomer,
              }
            : p,
        ),
      );
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
              <FragmentRow key={p.id}>
              <tr
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
                  {(() => {
                    const pt = (p.positionType || 'standard') as PositionType;
                    const internal = INTERNAL_POSITION_TYPES.has(pt);
                    return (
                      <button
                        onClick={() => internal ? setPositionType(p.id, 'standard') : toggleVisibility(p.id)}
                        title={
                          internal
                            ? `${POSITION_TYPE_LABELS[pt]} — intern (immer versteckt). Klicken: zurück auf Standard.`
                            : p.visibleToCustomer
                            ? 'Für Kunden sichtbar'
                            : 'Vor Kunden versteckt'
                        }
                        aria-label="Sichtbarkeit umschalten"
                        className={clsx(
                          'p-1 rounded-md transition-colors',
                          internal
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                            : p.visibleToCustomer
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-300 hover:bg-slate-100',
                        )}
                      >
                        {internal ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : p.visibleToCustomer ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    );
                  })()}
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
                    <td className="px-1 py-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        {p.longText && p.longText.trim().length > 0 ? (
                          <button
                            onClick={() => toggleLongText(p.id)}
                            className={clsx(
                              'p-1 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50/60 shrink-0',
                              expandedLong.has(p.id) && 'text-primary-700 bg-primary-50',
                            )}
                            title={expandedLong.has(p.id) ? 'Langtext einklappen' : 'Langtext anzeigen'}
                            aria-label="Langtext umschalten"
                          >
                            {expandedLong.has(p.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <span className="w-5 shrink-0" aria-hidden />
                        )}
                        <input
                          value={p.shortText}
                          onChange={(e) => updateRow(p.id, { shortText: e.target.value })}
                          title={p.shortText}
                          className="flex-1 min-w-0 px-1.5 py-1 rounded-md border border-transparent bg-transparent outline-none focus:bg-white focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
                        />
                        {(() => {
                          const pt = (p.positionType || 'standard') as PositionType;
                          const isInternal = INTERNAL_POSITION_TYPES.has(pt);
                          // Internal types: always visible (so the warning pill never
                          // hides). Standard rows: dropdown only renders on row-hover so
                          // it doesn't eat the Kurztext column the other 95% of the time.
                          return (
                            <div className={isInternal ? 'inline-flex shrink-0' : 'hidden group-hover:inline-flex shrink-0'}>
                              <PositionTypeSelect
                                value={pt}
                                onChange={(t) => setPositionType(p.id, t)}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-1">
                        <input
                          value={formatNum(p.quantity, p.quantity % 1 === 0 ? 0 : 2)}
                          onChange={(e) => updateNumber(p.id, 'quantity', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          readOnly={!!p.aufmassFormula?.trim()}
                          title={p.aufmassFormula?.trim() ? 'Menge ergibt sich aus dem Aufmaß. Klicken Sie das Σ-Symbol zum Bearbeiten.' : undefined}
                          className={clsx(
                            'flex-1 px-1.5 py-1 rounded-md border border-transparent bg-transparent text-right tabular-nums outline-none focus:bg-white focus:border-primary-300 focus:ring-1 focus:ring-primary-200',
                            p.aufmassFormula?.trim() && 'bg-emerald-50/40 text-emerald-900 cursor-default',
                          )}
                        />
                        <button
                          onClick={() => setAufmassOpen(aufmassOpen === p.id ? null : p.id)}
                          title={p.aufmassFormula?.trim() ? 'Aufmaß bearbeiten' : 'Aufmaß-Formel hinzufügen'}
                          className={clsx(
                            'p-1 rounded transition-colors',
                            p.aufmassFormula?.trim()
                              ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100',
                          )}
                        >
                          <Sigma className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
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
                  <div className="inline-flex items-center gap-0.5">
                    {!p.isHeader && (
                      <button
                        onClick={() => saveAsTemplate(p)}
                        className="p-1 rounded-md text-slate-300 hover:bg-primary-50 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Als Vorlage speichern"
                        aria-label="Als Vorlage speichern"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => removeRow(p.id)}
                      className="p-1 rounded-md text-slate-300 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Zeile löschen"
                      aria-label="Zeile löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              {aufmassOpen === p.id && !p.isHeader && (
                <tr className="bg-emerald-50/30 border-t border-emerald-100">
                  <td colSpan={12} className="px-4 py-3">
                    <AufmassEditor
                      formula={p.aufmassFormula || ''}
                      unit={p.unit}
                      onChange={(v) => setAufmassFormula(p.id, v)}
                      onClear={() => {
                        clearAufmassFormula(p.id);
                        setAufmassOpen(null);
                      }}
                      onClose={() => setAufmassOpen(null)}
                    />
                  </td>
                </tr>
              )}
              {expandedLong.has(p.id) && !p.isHeader && (
                <tr className="bg-slate-50/40 border-t border-slate-100">
                  <td colSpan={12} className="px-12 py-2.5">
                    <div className="flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Langtext
                          {p.longText && (
                            <span className="ml-2 font-normal lowercase tracking-normal text-slate-400">
                              ({p.longText.length} Zeichen)
                            </span>
                          )}
                        </div>
                        <textarea
                          value={p.longText}
                          onChange={(e) => updateRow(p.id, { longText: e.target.value })}
                          rows={Math.min(Math.max(3, (p.longText || '').split(/\r?\n/).length), 12)}
                          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 whitespace-pre-wrap font-sans leading-relaxed"
                          placeholder="Detaillierte Beschreibung der Position…"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </FragmentRow>
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
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700"
          title="Position aus Ihrer Vorlage-Bibliothek einfügen"
        >
          <Bookmark className="w-3.5 h-3.5" />
          Aus Vorlage
          {templates.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-primary-50 text-primary-700 text-[10px] font-bold tabular-nums">
              {templates.length}
            </span>
          )}
        </button>
        <button
          onClick={() => gaebFileInputRef.current?.click()}
          disabled={gaebImporting}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-200 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
          title="GAEB-Datei (D81/D83/XML/ÖNorm) hochladen — Positionen + Mengen werden automatisch übernommen, Preise schlagen wir aus Ihrer Vorlagen-Bibliothek vor"
        >
          {gaebImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
          GAEB hochladen
        </button>
        <input
          ref={gaebFileInputRef}
          type="file"
          accept=".x81,.x82,.x83,.x84,.x85,.x86,.x87,.x89,.d81,.d82,.d83,.d84,.d85,.d86,.d87,.d89,.p81,.p82,.p83,.p84,.p85,.p86,.p87,.p89,.xml,.X83,.X84"
          onChange={onGaebFileSelected}
          className="hidden"
          aria-hidden
        />
        <button
          onClick={() => {
            // Smart-default: set timeMinutes=60 on rows whose unit is a
            // time/hour unit AND timeMinutes is still 0. Covers the
            // "Mittlerer Stundensatz / Bagger 0.4-1.0 / Radlader 15 to"
            // pattern that's common in GAEB-imported Baustelleneinrichtung
            // positions where the EH is "h" and the customer expects to
            // see a labor portion. Material/NU we don't touch — too
            // varied to guess.
            const TIME_UNITS = new Set(['h', 'std', 'std.', 'stunde', 'stunden', 'h.', 'astd', 'astd.', 'akh']);
            const isTimeUnit = (u: string) => TIME_UNITS.has(u.trim().toLowerCase());
            let bumped = 0;
            const next = positions.map((p) => {
              if (p.isHeader) return p;
              if (!isTimeUnit(p.unit)) return p;
              if (p.timeMinutes > 0) return p;
              bumped += 1;
              return { ...p, timeMinutes: 60 };
            });
            if (bumped === 0) {
              toast('Keine offenen Stundenlohn-Positionen gefunden.', { icon: 'ℹ️' });
              return;
            }
            onChange(next);
            toast.success(`${bumped} Stundenlohn-Position${bumped === 1 ? '' : 'en'}: 60 min/EH gesetzt (Verrechnungslohn × 1 h).`);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-600 hover:border-slate-300"
          title="Stundenlohn-Positionen (EH h/Std) automatisch auf 60 min/EH setzen — Material/NU müssen Sie weiter selbst eintragen"
        >
          <Sigma className="w-3.5 h-3.5" />
          Stundensatz-Vorbelegung
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
        {allLongIds.length > 0 && (
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-600 hover:border-slate-300"
            title={allExpanded ? 'Alle Langtexte einklappen' : `Alle ${allLongIds.length} Langtexte ausklappen`}
          >
            {allExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {allExpanded ? 'Langtexte einklappen' : `Langtexte (${allLongIds.length})`}
          </button>
        )}
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

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-50 text-primary-600"><Bookmark className="w-4 h-4" /></div>
                <div>
                  <h3 className="font-semibold text-slate-900">Aus Vorlage einfügen</h3>
                  <p className="text-xs text-slate-500">
                    Ihre eigene Bibliothek wiederverwendbarer Positionen.
                  </p>
                </div>
              </div>
              <button onClick={() => setPickerOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="px-6 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={pickerFilter}
                  onChange={(e) => setPickerFilter(e.target.value)}
                  placeholder="OZ, Kurztext oder Langtext durchsuchen…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {filteredTemplates.length === 0 ? (
                <p className="p-6 text-sm text-slate-500 text-center">
                  {templates.length === 0
                    ? 'Noch keine Vorlagen. Klicken Sie das Lesezeichen-Symbol an einer Position, um sie zu speichern.'
                    : 'Keine Vorlage passt zur Suche.'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {filteredTemplates.map((t) => (
                    <li key={t.id} className="group flex items-stretch gap-1">
                      <button
                        onClick={() => insertFromTemplate(t)}
                        className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-primary-50/60"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-slate-500 min-w-[3rem]">{t.oz || '—'}</span>
                          <span className="font-medium text-slate-900 truncate flex-1">{t.shortText}</span>
                          {t.useCount > 0 && (
                            <span className="text-xs text-slate-400">{t.useCount}×</span>
                          )}
                        </div>
                        {t.longText && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 ml-[3.5rem]">{t.longText}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1 ml-[3.5rem] tabular-nums">
                          {t.unit && <>EH: {t.unit} · </>}
                          {t.defaultMaterialCost > 0 && <>Material: {formatEUR(t.defaultMaterialCost)} · </>}
                          {t.defaultTimeMinutes > 0 && <>Zeit: {t.defaultTimeMinutes} min · </>}
                          {t.defaultNuCost > 0 && <>NU: {formatEUR(t.defaultNuCost)}</>}
                        </p>
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="self-start mt-2 p-1.5 rounded text-slate-300 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Vorlage löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <footer className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/40">
              {templates.length === 0 ? (
                <>Tipp: Position erstellen → Lesezeichen-Symbol rechts klicken → ab dann hier verfügbar.</>
              ) : (
                <>Sortiert nach Häufigkeit der Verwendung. Klick fügt am Ende der Liste ein.</>
              )}
            </footer>
          </div>
        </div>
      )}
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

function FragmentRow({ children }: { children: React.ReactNode }) {
  // <></> would be cleaner but we need a stable key on the wrapper above,
  // and React.Fragment doesn't accept keyed children patterns that play well
  // with our render structure. A `display:contents`-equivalent is what we want:
  // since this lives inside <tbody>, returning the fragment is correct.
  return <>{children}</>;
}

function AufmassEditor({
  formula,
  unit,
  onChange,
  onClear,
  onClose,
}: {
  formula: string;
  unit: string;
  onChange: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const result = useMemo(() => evaluateAufmass(formula), [formula]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider inline-flex items-center gap-1">
            <Sigma className="w-3 h-3" />
            Aufmaß-Formel (REB-23.003-lite)
          </label>
          <div className="flex items-center gap-1">
            {formula.trim() && (
              <button
                onClick={onClear}
                className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Verwerfen
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 px-2"
              title="Schließen"
            >
              Schließen
            </button>
          </div>
        </div>
        <textarea
          autoFocus
          value={formula}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder={`Wand 1  4.50 * 2.80\n- Tür   2.10 * 1.00\nWand 2  3.20 * 2.80`}
          className="w-full font-mono text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Eine Messung pro Zeile. Annotation (Wand, Bauteil…) optional, gefolgt vom Ausdruck. Ein vorangestelltes "-" am Zeilenanfang subtrahiert (z. B. <code className="font-mono">- Tür 2.10 * 1.00</code>).
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
        <p className="font-semibold text-slate-700 uppercase tracking-wider mb-2">Vorschau</p>
        {result.lines.length === 0 ? (
          <p className="text-slate-400">Noch keine Zeilen.</p>
        ) : (
          <ul className="space-y-1">
            {result.lines.map((l, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="flex-1 truncate text-slate-500">{l.annotation || '—'}</span>
                {l.error ? (
                  <span className="text-red-600 inline-flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {l.error}
                  </span>
                ) : l.value === null ? (
                  <span className="text-slate-300">—</span>
                ) : (
                  <span className={clsx('tabular-nums', l.signedValue < 0 ? 'text-red-700' : 'text-slate-700')}>
                    {l.signedValue < 0 ? '−' : ''}
                    {formatNum(Math.abs(l.signedValue), Math.abs(l.signedValue) % 1 === 0 ? 0 : 2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-slate-200 mt-2 pt-2 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Summe</span>
          <span className={clsx('tabular-nums font-bold text-base', result.hasErrors ? 'text-red-700' : 'text-emerald-700')}>
            {formatNum(result.total, result.total % 1 === 0 ? 0 : 2)} {unit}
          </span>
        </div>
        {result.hasErrors && (
          <p className="text-red-600 mt-1 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Eine Zeile konnte nicht ausgewertet werden — Menge wird nicht aktualisiert.
          </p>
        )}
      </div>
    </div>
  );
}

function PositionTypeSelect({
  value,
  onChange,
}: {
  value: PositionType;
  onChange: (t: PositionType) => void;
}) {
  const internal = INTERNAL_POSITION_TYPES.has(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PositionType)}
      title={internal ? 'Intern — wird Kunden nie gezeigt' : 'Position-Typ'}
      className={clsx(
        'text-[10px] uppercase tracking-wider rounded px-1 py-0.5 border border-transparent bg-transparent outline-none',
        'focus:bg-white focus:border-slate-300 cursor-pointer max-w-[7rem]',
        internal
          ? 'text-amber-700 bg-amber-50/60 border-amber-200/60 font-semibold'
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
      )}
    >
      {POSITION_TYPES.map((t) => (
        <option key={t} value={t}>
          {POSITION_TYPE_LABELS[t]}
        </option>
      ))}
    </select>
  );
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
  const isZero = value === 0;
  return (
    <td className="px-1 py-1">
      <input
        value={isZero ? '' : formatNum(value, value % 1 === 0 ? 0 : 2)}
        placeholder="0"
        inputMode="decimal"
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className={clsx(
          'w-full px-1.5 py-1 rounded-md border text-right tabular-nums outline-none transition-colors',
          'placeholder:text-slate-300 cursor-text',
          isZero
            ? 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-slate-700'
            : 'border-slate-200 bg-white text-slate-900',
          'focus:bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-200',
        )}
      />
    </td>
  );
});

function reorder(arr: Position[]): Position[] {
  return arr.map((p, i) => ({ ...p, sortOrder: i + 1 }));
}
