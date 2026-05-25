/* SheetJS-backed Excel / CSV parsing for the panel's unified ImportDialog.
 *
 * Public surface:
 *   parseSheet(file)          → { headers, rows }      lazy-loads xlsx
 *   autoMapColumns(headers)   → MappingSelection       fuzzy + synonym match
 *   buildPreviewRows(...)     → PreviewRow[]           applies mapping + validates
 *
 * Keep this file framework-agnostic so the parser can be unit-tested.
 */

import type { Position } from './types';
import { makeBlankPosition } from './calc';
import { nanoid } from 'nanoid';

/** Fields the KALKU calc engine cares about. The mapping wizard lets the user
 * pick which of the uploaded columns feeds each field. */
export type KalkuField =
  | 'oz'
  | 'shortText'
  | 'longText'
  | 'quantity'
  | 'unit'
  | 'materialCost'
  | 'timeMinutes'
  | 'nuCost';

export const KALKU_FIELDS: { key: KalkuField; label: string; required: boolean }[] = [
  { key: 'oz', label: 'OZ / Position', required: false },
  { key: 'shortText', label: 'Kurztext', required: true },
  { key: 'longText', label: 'Langtext', required: false },
  { key: 'quantity', label: 'Menge', required: true },
  { key: 'unit', label: 'Einheit (EH)', required: false },
  { key: 'materialCost', label: 'Material €/EH', required: false },
  { key: 'timeMinutes', label: 'Zeit min/EH', required: false },
  { key: 'nuCost', label: 'NU €/EH', required: false },
];

/** German synonym dictionary. Header-matching is case-insensitive and ignores
 * spaces / punctuation / unit suffixes. Order doesn't matter; the auto-mapper
 * picks the best score, with exact match winning. */
const SYNONYMS: Record<KalkuField, string[]> = {
  oz: ['oz', 'pos', 'posnr', 'positionsnummer', 'position', 'nr', 'nummer', 'ordnungszahl'],
  shortText: ['kurztext', 'bezeichnung', 'text', 'leistung', 'beschreibung', 'titel', 'kt'],
  longText: ['langtext', 'detail', 'detailtext', 'beschreibunglang', 'lt'],
  quantity: ['menge', 'mng', 'anzahl', 'qty', 'quantity', 'mge', 'm'],
  unit: ['eh', 'einheit', 'me', 'mengeneinheit', 'unit', 'einh'],
  materialCost: ['material', 'materialeh', 'materialep', 'mat', 'mateh', 'materialkosten'],
  timeMinutes: ['zeit', 'zeiteh', 'zeitmin', 'mineh', 'min', 'arbeitszeit', 'minuten', 'dauer'],
  nuCost: ['nu', 'nueh', 'nachunternehmer', 'nachunternehmereh', 'fremdleistung', 'fremd'],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[\s./\-_,;:€%()\\[\]]/g, '');
}

export type SheetParse = {
  headers: string[];
  /** Each row is a string[] aligned to headers — even numeric cells stringified. */
  rows: string[][];
  /** Source filename for the success toast. */
  filename: string;
  /** Sheet name SheetJS resolved to. */
  sheetName: string;
};

/** Parse XLSX/XLS/CSV from a File. Lazy-loads SheetJS. Throws on read errors. */
export async function parseSheet(file: File): Promise<SheetParse> {
  const xlsx = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = xlsx.read(buf, { type: 'array', cellDates: false, raw: true });
  // Prefer first non-empty sheet, falling back to the first.
  const sheetName =
    wb.SheetNames.find((n) => {
      const s = wb.Sheets[n];
      const ref = s['!ref'];
      return !!ref && ref !== 'A1';
    }) || wb.SheetNames[0];
  if (!sheetName) throw new Error('Datei enthält keine Tabellen.');
  const ws = wb.Sheets[sheetName];
  const aoa = xlsx.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    raw: false, // strings — preserves German formatting like "1,5"
    defval: '',
    blankrows: false,
  });
  if (aoa.length === 0) throw new Error('Datei ist leer.');

  // Find the actual header row — skip leading blank rows or rows that look
  // like a title (single non-empty cell). The header row is the first row
  // with ≥ 2 non-empty cells.
  let headerIdx = 0;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const nonEmpty = aoa[i].filter((c) => String(c).trim() !== '').length;
    if (nonEmpty >= 2) {
      headerIdx = i;
      break;
    }
  }
  const rawHeaders = aoa[headerIdx].map((c) => String(c ?? '').trim());
  // Trim trailing empty columns.
  let lastFilled = -1;
  for (let i = 0; i < rawHeaders.length; i++) if (rawHeaders[i]) lastFilled = i;
  const headers = rawHeaders.slice(0, lastFilled + 1);
  const rows = aoa
    .slice(headerIdx + 1)
    .map((r) => Array.from({ length: headers.length }, (_, i) => String(r[i] ?? '').trim()))
    .filter((r) => r.some((c) => c.length > 0));

  return { headers, rows, filename: file.name, sheetName };
}

/** Selection of which source column feeds each KALKU field. `null` = skip. */
export type MappingSelection = Record<KalkuField, number | null>;

/** Heuristic auto-map: for each KALKU field, pick the best-scoring header.
 *  Exact normalised match → 100; one contains the other → length ratio × 80. */
export function autoMapColumns(headers: string[]): MappingSelection {
  const normHeaders = headers.map(normalize);
  const out: MappingSelection = {
    oz: null,
    shortText: null,
    longText: null,
    quantity: null,
    unit: null,
    materialCost: null,
    timeMinutes: null,
    nuCost: null,
  };
  const taken = new Set<number>();

  for (const field of Object.keys(SYNONYMS) as KalkuField[]) {
    const syns = SYNONYMS[field].map(normalize);
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < normHeaders.length; i++) {
      if (taken.has(i)) continue;
      const h = normHeaders[i];
      if (!h) continue;
      for (const s of syns) {
        let score = 0;
        if (h === s) score = 100;
        else if (h.startsWith(s) || s.startsWith(h)) {
          score = (Math.min(h.length, s.length) / Math.max(h.length, s.length)) * 90;
        } else if (h.includes(s) || s.includes(h)) {
          score = (Math.min(h.length, s.length) / Math.max(h.length, s.length)) * 70;
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }
    if (bestIdx >= 0 && bestScore >= 40) {
      out[field] = bestIdx;
      taken.add(bestIdx);
    }
  }
  return out;
}

/** Parse a German number string. "1.234,56" → 1234.56, "" → 0. */
function parseDeNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export type PreviewRow = {
  raw: string[];
  values: {
    oz: string;
    shortText: string;
    longText: string;
    quantity: number;
    unit: string;
    materialCost: number;
    timeMinutes: number;
    nuCost: number;
  };
  status: 'ok' | 'warn' | 'error';
  issues: string[];
};

/** Apply a mapping to the raw rows and validate each. Returns one PreviewRow
 *  per input row, ready to render in the wizard's preview table. */
export function buildPreviewRows(rows: string[][], mapping: MappingSelection): PreviewRow[] {
  const get = (row: string[], idx: number | null) =>
    idx == null || idx < 0 || idx >= row.length ? '' : row[idx] ?? '';
  const seenOz = new Map<string, number>();

  // First pass — collect oz occurrences so we can flag duplicates.
  for (const r of rows) {
    const oz = get(r, mapping.oz).trim();
    if (oz) seenOz.set(oz, (seenOz.get(oz) || 0) + 1);
  }

  return rows.map((row) => {
    const issues: string[] = [];
    const oz = get(row, mapping.oz).trim();
    const shortText = get(row, mapping.shortText).trim();
    const longText = get(row, mapping.longText).trim();
    const unit = get(row, mapping.unit).trim();
    const quantityStr = get(row, mapping.quantity).trim();
    const materialStr = get(row, mapping.materialCost).trim();
    const timeStr = get(row, mapping.timeMinutes).trim();
    const nuStr = get(row, mapping.nuCost).trim();

    const quantity = quantityStr ? parseDeNumber(quantityStr) : 0;
    const materialCost = materialStr ? parseDeNumber(materialStr) : 0;
    const timeMinutes = timeStr ? parseDeNumber(timeStr) : 0;
    const nuCost = nuStr ? parseDeNumber(nuStr) : 0;

    let status: PreviewRow['status'] = 'ok';
    if (!shortText) {
      issues.push('Kurztext fehlt.');
      status = 'error';
    }
    if (mapping.quantity != null && !Number.isFinite(quantity)) {
      issues.push(`Menge "${quantityStr}" ist keine Zahl.`);
      status = 'error';
    } else if (mapping.quantity != null && quantity < 0) {
      issues.push('Menge ist negativ.');
      status = status === 'error' ? 'error' : 'warn';
    }
    if (mapping.materialCost != null && !Number.isFinite(materialCost)) {
      issues.push(`Material "${materialStr}" ist keine Zahl.`);
      status = status === 'error' ? 'error' : 'warn';
    }
    if (mapping.timeMinutes != null && !Number.isFinite(timeMinutes)) {
      issues.push(`Zeit "${timeStr}" ist keine Zahl.`);
      status = status === 'error' ? 'error' : 'warn';
    }
    if (mapping.nuCost != null && !Number.isFinite(nuCost)) {
      issues.push(`NU "${nuStr}" ist keine Zahl.`);
      status = status === 'error' ? 'error' : 'warn';
    }
    if (oz && (seenOz.get(oz) || 0) > 1) {
      issues.push('OZ kommt mehrfach vor.');
      status = status === 'error' ? 'error' : 'warn';
    }

    return {
      raw: row,
      values: {
        oz,
        shortText,
        longText,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unit,
        materialCost: Number.isFinite(materialCost) ? materialCost : 0,
        timeMinutes: Number.isFinite(timeMinutes) ? timeMinutes : 0,
        nuCost: Number.isFinite(nuCost) ? nuCost : 0,
      },
      status,
      issues,
    };
  });
}

/** Convert preview rows into the Position[] shape the table holds. Optionally
 *  skips rows the validator marked as `error`.
 *
 *  Sets `importedFrom: 'excel'` on each row → these can't be deleted from
 *  the table (they're part of the imported LV; deleting would silently
 *  desync from the source workbook). See Position type comment. */
export function previewToPositions(
  preview: PreviewRow[],
  startSortOrder: number,
  opts: { skipErrors: boolean } = { skipErrors: true },
): Position[] {
  const filtered = opts.skipErrors ? preview.filter((p) => p.status !== 'error') : preview;
  return filtered.map((p, i) => ({
    ...makeBlankPosition(nanoid(12), startSortOrder + i),
    oz: p.values.oz,
    shortText: p.values.shortText,
    longText: p.values.longText,
    quantity: p.values.quantity,
    unit: p.values.unit,
    materialCost: p.values.materialCost,
    timeMinutes: p.values.timeMinutes,
    nuCost: p.values.nuCost,
    importedFrom: 'excel',
  }));
}

/** File-type sniffer used by ImportDialog to route to the right parser. */
export type FileKind = 'gaeb' | 'spreadsheet' | 'unknown';

const GAEB_EXT = /\.(x8\d|d8\d|d9\d|p8\d|p9\d|xml|gaeb)$/i;
const SHEET_EXT = /\.(xlsx|xls|csv|ods)$/i;

export function detectFileKind(filename: string): FileKind {
  if (GAEB_EXT.test(filename)) return 'gaeb';
  if (SHEET_EXT.test(filename)) return 'spreadsheet';
  return 'unknown';
}
