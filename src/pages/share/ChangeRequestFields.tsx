/**
 * Reusable "Änderungswunsch" composer block. Renders one toggle chip per
 * available field; an active chip expands to an Ist → Wunsch editor (a desired
 * value and/or a günstiger/höher direction, plus an optional reason).
 *
 * Controlled: the parent owns the `drafts` map and gets every change via
 * `onChange`. Used by BOTH the global "Gesamtangebot anpassen" panel
 * (ShareView) and the per-position panel (PositionCommentPanel), so the
 * customer sees the same editor everywhere.
 */
import { Plus, X } from 'lucide-react';
import clsx from 'clsx';
import type { ChangeRequestField, ChangeRequestScope } from '@/features/kalkulation/types';
import {
  FIELD_LABEL,
  formatChangeValue,
  unitFor,
  type ChangeRequestDraftMap,
  type FieldDraft,
} from '@/features/kalkulation/changeRequest';

const EMPTY: FieldDraft = { requestedValue: '', note: '' };

const UNIT_SYMBOL: Record<string, string> = { eur: '€', min: 'min', std: 'Std.', pct: '%', qty: '' };

type Props = {
  scope: ChangeRequestScope;
  fields: ChangeRequestField[];
  currentValueFor: (field: ChangeRequestField) => number | null;
  drafts: ChangeRequestDraftMap;
  onChange: (next: ChangeRequestDraftMap) => void;
};

export default function ChangeRequestFields({ scope, fields, currentValueFor, drafts, onChange }: Props) {
  function toggle(field: ChangeRequestField) {
    const next = { ...drafts };
    if (next[field]) delete next[field];
    else next[field] = { ...EMPTY };
    onChange(next);
  }
  function patch(field: ChangeRequestField, p: Partial<FieldDraft>) {
    onChange({ ...drafts, [field]: { ...(drafts[field] ?? EMPTY), ...p } });
  }

  const activeFields = fields.filter((f) => drafts[f]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {fields.map((field) => {
          const active = !!drafts[field];
          return (
            <button
              key={field}
              type="button"
              data-testid={`cr-chip-${scope}-${field}`}
              aria-pressed={active}
              onClick={() => toggle(field)}
              className={clsx(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary-300 bg-primary-50 text-primary-800'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800',
              )}
            >
              {active ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {FIELD_LABEL[field]}
            </button>
          );
        })}
      </div>

      {activeFields.map((field) => {
        const unit = unitFor(scope, field);
        const current = currentValueFor(field);
        const d = drafts[field] ?? EMPTY;
        const isSonstiges = field === 'sonstiges';
        return (
          <div
            key={field}
            data-testid={`cr-editor-${scope}-${field}`}
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">{FIELD_LABEL[field]}</span>
              {!isSonstiges && current != null && (
                <span className="text-[11px] text-slate-500">
                  Aktuell:{' '}
                  <span className="tabular-nums font-medium text-slate-700">
                    {formatChangeValue(current, unit)}
                  </span>
                </span>
              )}
            </div>

            {!isSonstiges && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-white">
                  {(['lower', 'higher'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      data-testid={`cr-dir-${scope}-${field}-${dir}`}
                      onClick={() => patch(field, { direction: d.direction === dir ? undefined : dir })}
                      className={clsx(
                        'px-2.5 py-1 text-[11px] font-medium transition-colors',
                        d.direction === dir
                          ? dir === 'lower'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                          : 'text-slate-500 hover:bg-slate-100',
                      )}
                    >
                      {dir === 'lower' ? 'günstiger' : 'höher'}
                    </button>
                  ))}
                </div>
                <label className="flex-1 min-w-[8rem] flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">Wunschwert:</span>
                  <span className="flex-1 inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 focus-within:border-primary-400">
                    <input
                      type="text"
                      inputMode="decimal"
                      data-testid={`cr-value-${scope}-${field}`}
                      value={d.requestedValue}
                      onChange={(e) => patch(field, { requestedValue: e.target.value })}
                      placeholder="z. B. 950"
                      className="w-full min-w-0 text-sm bg-transparent outline-none tabular-nums"
                    />
                    {UNIT_SYMBOL[unit] && (
                      <span className="text-[11px] text-slate-400">{UNIT_SYMBOL[unit]}</span>
                    )}
                  </span>
                </label>
              </div>
            )}

            <input
              type="text"
              data-testid={`cr-note-${scope}-${field}`}
              value={d.note}
              onChange={(e) => patch(field, { note: e.target.value })}
              placeholder={isSonstiges ? 'Was möchten Sie anpassen?' : 'Begründung (optional)'}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-primary-400"
            />
          </div>
        );
      })}
    </div>
  );
}
