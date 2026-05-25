/**
 * Vorlagen-Bibliothek — first dedicated UI surface for the templates that
 * were until now manageable only inline from the position table popover.
 *
 * What this page adds over the popover:
 *   - One place to see ALL saved templates, sorted by useful-first
 *   - Edit-in-place for OZ, Kurztext, Einheit, default Material/NU-Kosten,
 *     Stundenansatz — uses the new PATCH /templates/:id endpoint
 *   - "Verwendet"-Indikator so the user can prune unused templates
 *   - Delete with confirmation
 *   - Empty state pointing back to the position table popover
 *
 * Deliberately no drift-against-market detection in v1; that requires
 * cross-project read of `data.materialCost`/`data.nuCost` per matching
 * (oz,unit) tuple, which means either a new endpoint or N project fetches.
 * Ship the library first, layer drift on top later.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Library,
  Loader2,
  AlertCircle,
  Trash2,
  Calculator,
  Search,
  ArrowRight,
  Save,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { api, ApiError } from '@/lib/api';
import { Breadcrumb } from './ui';
import { formatEUR, formatNum } from '@/features/kalkulation/calc';
import type { PositionTemplate } from '@/features/kalkulation/types';

export default function Vorlagen() {
  const [templates, setTemplates] = useState<PositionTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { templates } = await api.templates.list();
      setTemplates(templates);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Bitte melden Sie sich erneut an.'
          : 'Vorlagen konnten nicht geladen werden.',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!templates) return null;
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.shortText.toLowerCase().includes(q) ||
        t.oz.toLowerCase().includes(q) ||
        t.unit.toLowerCase().includes(q),
    );
  }, [templates, query]);

  const handleSave = useCallback(
    async (id: string, patch: Partial<PositionTemplate>) => {
      setSavingId(id);
      try {
        const updated = await api.templates.update(id, patch);
        setTemplates((prev) => (prev ? prev.map((t) => (t.id === id ? updated : t)) : prev));
        setEditing(null);
        toast.success('Vorlage gespeichert.');
      } catch {
        toast.error('Speichern fehlgeschlagen.');
      } finally {
        setSavingId(null);
      }
    },
    [],
  );

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Vorlage „${name}" wirklich löschen?`)) return;
    try {
      await api.templates.delete(id);
      setTemplates((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
      toast.success('Vorlage gelöscht.');
    } catch {
      toast.error('Löschen fehlgeschlagen.');
    }
  }, []);

  if (error) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
        <AlertCircle className="w-5 h-5 text-rose-500 mx-auto mb-3" />
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{error}</h2>
      </div>
    );
  }

  if (templates == null) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Vorlagen-Bibliothek — KALKU Panel</title>
      </Helmet>

      <Breadcrumb items={[{ label: 'Panel', to: '/panel' }, { label: 'Vorlagen' }]} />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Bibliothek
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Library className="w-5 h-5 text-primary-600 dark:text-primary-300" />
            Positions-Vorlagen
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {templates.length} gespeicherte Vorlagen — Standardpreise und Zeitansätze für wiederkehrende Positionen.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen (OZ, Kurztext, Einheit)…"
            className="w-72 pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </header>

      {templates.length === 0 ? (
        <EmptyState />
      ) : filtered && filtered.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400">
          Keine Vorlagen passen zu „{query}".
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold w-24">OZ</th>
                  <th className="px-3 py-2.5 text-left font-semibold min-w-[16rem]">Kurztext</th>
                  <th className="px-3 py-2.5 text-left font-semibold w-20">Einheit</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-28">Material €</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-28">NU €</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-20">Zeit (min)</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-20">Verwendet</th>
                  <th className="px-3 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(filtered ?? templates).map((t) =>
                  editing === t.id ? (
                    <EditRow
                      key={t.id}
                      template={t}
                      busy={savingId === t.id}
                      onSave={(patch) => handleSave(t.id, patch)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <ViewRow
                      key={t.id}
                      template={t}
                      onEdit={() => setEditing(t.id)}
                      onDelete={() => handleDelete(t.id, t.shortText)}
                    />
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tipp: Vorlagen entstehen, wenn Sie in einer Kalkulation auf „Als Vorlage speichern" klicken.
        Beim Anlegen neuer Positionen können Sie sie über die Lupe in der Tabelle einfügen.
      </p>
    </div>
  );
}

function ViewRow({
  template,
  onEdit,
  onDelete,
}: {
  template: PositionTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      onClick={onEdit}
      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{template.oz || '—'}</td>
      <td className="px-3 py-2 text-slate-800 dark:text-slate-100 truncate max-w-[24rem]">{template.shortText}</td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{template.unit || '—'}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatEUR(template.defaultMaterialCost)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatEUR(template.defaultNuCost)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{template.defaultTimeMinutes}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        <span
          className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
            template.useCount > 0
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
          )}
        >
          {template.useCount}×
        </span>
      </td>
      <td className="px-2 py-2 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          aria-label="Vorlage löschen"
          title="Vorlage löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

function EditRow({
  template,
  busy,
  onSave,
  onCancel,
}: {
  template: PositionTemplate;
  busy: boolean;
  onSave: (patch: Partial<PositionTemplate>) => void;
  onCancel: () => void;
}) {
  const [oz, setOz] = useState(template.oz);
  const [shortText, setShortText] = useState(template.shortText);
  const [unit, setUnit] = useState(template.unit);
  const [material, setMaterial] = useState(String(template.defaultMaterialCost));
  const [nu, setNu] = useState(String(template.defaultNuCost));
  const [minutes, setMinutes] = useState(String(template.defaultTimeMinutes));

  const handleSubmit = () => {
    const patch: Partial<PositionTemplate> = {};
    if (oz !== template.oz) patch.oz = oz;
    if (shortText !== template.shortText) patch.shortText = shortText;
    if (unit !== template.unit) patch.unit = unit;
    const mat = parseGermanNum(material);
    if (mat != null && mat !== template.defaultMaterialCost) patch.defaultMaterialCost = mat;
    const nuVal = parseGermanNum(nu);
    if (nuVal != null && nuVal !== template.defaultNuCost) patch.defaultNuCost = nuVal;
    const min = parseInt(minutes.replace(/[^\d-]/g, ''), 10);
    if (Number.isFinite(min) && min !== template.defaultTimeMinutes) patch.defaultTimeMinutes = min;
    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }
    if (!shortText.trim()) return;
    onSave(patch);
  };

  return (
    <tr className="bg-primary-50/30 dark:bg-primary-500/5">
      <td className="px-3 py-2">
        <Input value={oz} onChange={setOz} narrow />
      </td>
      <td className="px-3 py-2">
        <Input value={shortText} onChange={setShortText} required />
      </td>
      <td className="px-3 py-2">
        <Input value={unit} onChange={setUnit} narrow />
      </td>
      <td className="px-3 py-2">
        <Input value={material} onChange={setMaterial} numeric />
      </td>
      <td className="px-3 py-2">
        <Input value={nu} onChange={setNu} numeric />
      </td>
      <td className="px-3 py-2">
        <Input value={minutes} onChange={setMinutes} numeric />
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatNum(template.useCount, 0)}×</td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Abbrechen"
          title="Abbrechen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="p-1.5 rounded-md text-primary-600 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 disabled:opacity-40"
          aria-label="Speichern"
          title="Speichern"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </button>
      </td>
    </tr>
  );
}

function Input({
  value,
  onChange,
  narrow,
  numeric,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  narrow?: boolean;
  numeric?: boolean;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      inputMode={numeric ? 'decimal' : 'text'}
      className={clsx(
        'w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100',
        numeric && 'text-right tabular-nums',
        narrow && 'min-w-0',
      )}
    />
  );
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
      <Library className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Noch keine Vorlagen.</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
        Speichern Sie eine wiederkehrende Position in einer Kalkulation als Vorlage, dann erscheint sie hier.
      </p>
      <Link
        to="/panel/kalkulation"
        className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
      >
        <Calculator className="w-4 h-4" />
        Zu den Kalkulationen
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function parseGermanNum(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Disambiguate decimal separator:
  //  - "1.234,56"  → DE: dots are thousands, comma is decimal → 1234.56
  //  - "12,5"      → DE: comma is decimal → 12.5
  //  - "12.5"      → US/JS-native (e.g. `String(12.5)`): dot is decimal → 12.5
  //  - "1,234.56"  → US: comma is thousands, dot is decimal → 1234.56
  // Rule: if BOTH separators are present, the rightmost is the decimal.
  // If only one is present, treat it as the decimal point.
  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');
  let normalised: string;
  if (hasComma && hasDot) {
    const decimalIsComma = trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.');
    normalised = decimalIsComma
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.replace(/,/g, '');
  } else if (hasComma) {
    normalised = trimmed.replace(',', '.');
  } else {
    normalised = trimmed;
  }
  const n = parseFloat(normalised);
  return Number.isFinite(n) ? n : null;
}
