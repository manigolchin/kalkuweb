/**
 * Shared helpers for the customer "Änderungswunsch" (change request) feature.
 *
 * One source of truth for field labels, units, value formatting, and the
 * current ("Ist") value lifting — used by the customer share composer
 * (ShareView + PositionCommentPanel) AND the owner's Kunden-Feedback inbox so
 * both sides label and format every wish identically.
 */
import type {
  ChangeRequestDirection,
  ChangeRequestField,
  ChangeRequestInput,
  ChangeRequestScope,
  ChangeRequestUnit,
  CustomerViewPayload,
  InboxChangeRequest,
  ShareCalcSummary,
  ShareSettings,
} from './types';
import { formatEUR, formatNum } from './calc';

type CustomerPosition = CustomerViewPayload['positions'][number];

/** Per-field working draft the composer holds (raw, unparsed). */
export type FieldDraft = {
  /** Raw input string — German decimals ("1.234,56") accepted. */
  requestedValue: string;
  /** Explicit "günstiger/höher" choice when no exact value is given. */
  direction?: 'lower' | 'higher';
  note: string;
};
export type ChangeRequestDraftMap = Partial<Record<ChangeRequestField, FieldDraft>>;

/** Parse a German-formatted number. "1.234,56" → 1234.56, "" → null. */
export function parseDeNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Turn a draft map into the wire payload, dropping empty fields. The server
 *  re-lifts the "Ist" value + infers the direction when a target value is set
 *  but no explicit günstiger/höher was chosen. */
export function assembleChangeRequests(
  scope: ChangeRequestScope,
  positionOz: string | undefined,
  drafts: ChangeRequestDraftMap,
): ChangeRequestInput[] {
  const items: ChangeRequestInput[] = [];
  for (const field of Object.keys(drafts) as ChangeRequestField[]) {
    const d = drafts[field];
    if (!d) continue;
    const requestedValue = parseDeNumber(d.requestedValue);
    const note = d.note.trim();
    if (requestedValue == null && !d.direction && note.length === 0) continue; // empty
    items.push({
      scope,
      positionOz: scope === 'position' ? positionOz : undefined,
      field,
      requestedValue: requestedValue ?? null,
      direction: d.direction,
      note: note || undefined,
    });
  }
  return items;
}

export const FIELD_LABEL: Record<ChangeRequestField, string> = {
  endbetrag: 'Endbetrag',
  gesamtpreis: 'Gesamtpreis',
  menge: 'Menge',
  material: 'Materialkosten',
  geraete: 'Maschinen-/Gerätekosten',
  zeit: 'Arbeitszeit',
  lohn: 'Lohnkosten',
  sonstiges: 'Sonstiges',
};

/** Short label for tight chips/badges. */
export const FIELD_SHORT: Record<ChangeRequestField, string> = {
  endbetrag: 'Endbetrag',
  gesamtpreis: 'Gesamtpreis',
  menge: 'Menge',
  material: 'Material',
  geraete: 'Gerät',
  zeit: 'Zeit',
  lohn: 'Lohn',
  sonstiges: 'Sonstiges',
};

export const DIRECTION_LABEL: Record<ChangeRequestDirection, string> = {
  lower: 'günstiger',
  higher: 'höher',
  exact: 'genau',
  unspecified: 'Wunsch',
};

/** The unit a (scope, field) pair is expressed in — mirrors the server's
 *  `changeRequestContext`. */
export function unitFor(scope: ChangeRequestScope, field: ChangeRequestField): ChangeRequestUnit {
  if (field === 'menge') return 'qty';
  if (field === 'zeit') return scope === 'global' ? 'std' : 'min';
  return 'eur';
}

/** Format a value for display given its unit. `null`/`undefined` → "—". */
export function formatChangeValue(
  value: number | null | undefined,
  unit: ChangeRequestUnit,
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  switch (unit) {
    case 'eur':
      return formatEUR(value);
    case 'min':
      return `${formatNum(value, 0)} min`;
    case 'std':
      return `${formatNum(value, 1)} Std.`;
    case 'qty':
      return formatNum(value, 2);
    case 'pct':
      return `${formatNum(value, 1)} %`;
    default:
      return formatNum(value, 2);
  }
}

/** The value the customer is shown for a GLOBAL field (from the summary). */
export function globalCurrentValue(
  field: ChangeRequestField,
  summary: ShareCalcSummary | null | undefined,
): number | null {
  if (!summary) return null;
  switch (field) {
    case 'endbetrag':
      return summary.netto;
    case 'lohn':
      return summary.costTypes.lohn.vk;
    case 'material':
      return summary.costTypes.material.vk;
    case 'geraete':
      return summary.costTypes.geraete.vk;
    case 'zeit':
      return summary.totalHours;
    default:
      return null;
  }
}

/** The value the customer is shown for a POSITION field. */
export function positionCurrentValue(
  field: ChangeRequestField,
  pos: CustomerPosition,
): number | null {
  switch (field) {
    case 'menge':
      return pos.quantity;
    case 'gesamtpreis':
      return pos.gp;
    case 'material':
      return pos.gpMaterial ?? null;
    case 'geraete':
      return pos.gpGeraet ?? null;
    case 'lohn':
      return pos.gpLohn ?? null;
    default:
      return null; // zeit (minutes not shown) / sonstiges
  }
}

/**
 * Owner-side negotiation roll-up over an offer's change requests. Gives the
 * Inhaber an at-a-glance "what does the customer want financially":
 *
 *  - `endbetragDelta` / `endbetragRequested` — the global Endbetrag wish, if any.
 *  - `positionsDelta` — the NET €-change of all per-position wishes, deduped per
 *    position so a line is never double-counted: a `gesamtpreis` wish (the line
 *    total) WINS over the cost-type sub-components (Material/Gerät/Lohn) of the
 *    same position; otherwise the cost-type deltas are summed. A Richtwert.
 *
 * Only EUR wishes with BOTH a current and a requested value contribute — a
 * direction-only "günstiger" or a Menge/Zeit wish carries no € figure and is
 * left out of the sums (still counted in `count`/`open`).
 */
export type ChangeRequestRollup = {
  count: number;
  open: number;
  endbetragDelta: number | null;
  endbetragRequested: number | null;
  positionsDelta: number | null;
};

export function rollupChangeRequests(crs: InboxChangeRequest[]): ChangeRequestRollup {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const count = crs.length;
  const open = crs.filter((c) => !c.resolvedAt).length;

  const endbetrag = crs.find(
    (c) => c.scope === 'global' && c.field === 'endbetrag' && c.requestedValue != null && c.currentValue != null,
  );
  const endbetragDelta = endbetrag ? round2(endbetrag.requestedValue! - endbetrag.currentValue!) : null;
  const endbetragRequested = endbetrag ? endbetrag.requestedValue! : null;

  // Per-position EUR deltas. gesamtpreis (line total) overrides the cost-type
  // parts of the same position to avoid double counting.
  const byPos = new Map<string, { gesamt: number | null; parts: number; hasParts: boolean }>();
  for (const c of crs) {
    if (c.scope !== 'position' || c.unit !== 'eur') continue;
    if (c.requestedValue == null || c.currentValue == null) continue;
    const key = c.positionOz ?? '';
    const entry = byPos.get(key) ?? { gesamt: null, parts: 0, hasParts: false };
    const delta = c.requestedValue - c.currentValue;
    if (c.field === 'gesamtpreis') entry.gesamt = delta;
    else if (c.field === 'material' || c.field === 'geraete' || c.field === 'lohn') {
      entry.parts += delta;
      entry.hasParts = true;
    }
    byPos.set(key, entry);
  }
  let positionsDelta: number | null = null;
  let any = false;
  let sum = 0;
  for (const v of byPos.values()) {
    if (v.gesamt != null) { sum += v.gesamt; any = true; }
    else if (v.hasParts) { sum += v.parts; any = true; }
  }
  if (any) positionsDelta = round2(sum);

  return { count, open, endbetragDelta, endbetragRequested, positionsDelta };
}

/** Signed EUR for a delta display: "−50,00 €" / "+120,00 €". */
export function formatSignedEUR(delta: number): string {
  const sign = delta < 0 ? '−' : '+';
  return `${sign}${formatEUR(Math.abs(delta))}`;
}

/**
 * Which fields the customer may request a change on, given what the share
 * actually reveals. Cost-type fields (Lohn/Material/Gerät/Zeit) are only
 * offered when their numbers are visible — otherwise the customer would be
 * adjusting a figure they were never shown. `sonstiges` is always offered as
 * a free-form catch-all.
 */
export function availableFields(
  scope: ChangeRequestScope,
  settings: Pick<ShareSettings, 'showCostBreakdown' | 'showCalculation' | 'showTotals'>,
): ChangeRequestField[] {
  const breakdown = settings.showCostBreakdown !== false;
  const calc = settings.showCalculation !== false;
  if (scope === 'global') {
    const out: ChangeRequestField[] = [];
    if (settings.showTotals) out.push('endbetrag');
    if (breakdown) out.push('lohn', 'material', 'geraete');
    if (calc) out.push('zeit');
    out.push('sonstiges');
    return out;
  }
  // position
  const out: ChangeRequestField[] = ['menge', 'gesamtpreis'];
  if (breakdown) out.push('lohn', 'material', 'geraete');
  out.push('sonstiges');
  return out;
}
