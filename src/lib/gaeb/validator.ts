/**
 * Cross-validator for X84 ↔ original X83.
 *
 * Pre-flight check before submission: every position the Vergabestelle defined
 * in the X83 must be answered with the SAME OZ, the SAME Menge, and the SAME
 * Einheit in the X84. Mismatches → BGH-supported Angebotsausschluss.
 *
 * We compare KALKU's current project positions against a re-uploaded X83 so
 * the validator can run any time, not just immediately after import.
 */
import type { ParsedGaeb, Position as GaebPosition } from './types';

/** Minimal shape the validator needs from KALKU's project positions. */
export type ProjectPositionLite = {
  oz: string;
  shortText: string;
  quantity: number;
  unit: string;
  isHeader: boolean;
};

export type ValidationIssue =
  | { kind: 'missing-in-bid'; oz: string; tenderText: string; tenderQuantity?: number; tenderUnit: string }
  | { kind: 'extra-in-bid'; oz: string; bidText: string; bidQuantity: number; bidUnit: string }
  | { kind: 'quantity-mismatch'; oz: string; tender: number; bid: number; tenderText: string }
  | { kind: 'unit-mismatch'; oz: string; tender: string; bid: string; tenderText: string }
  | { kind: 'tender-qty-tbd'; oz: string; tenderText: string } // Vergabestelle marked TBD
  | { kind: 'tender-empty' }; // Uploaded file contained 0 Item-Positionen at all

export type ValidationResult = {
  tenderCount: number;
  bidCount: number;
  matched: number;
  /** Sorted by severity desc then OZ asc. */
  issues: ValidationIssue[];
  /** True when there are zero `missing-in-bid` / `quantity-mismatch` / `unit-mismatch`
   *  issues — i.e. the bid would not be rejected for these reasons. */
  ok: boolean;
};

const QTY_TOLERANCE = 1e-6;

function normalizeOz(s: string): string {
  return (s || '').trim().replace(/\s+/g, '');
}

function normalizeUnit(s: string): string {
  // "m²" / "m2", "m³" / "m3", "MFL" / "mfl" — all considered equal.
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/²/g, '2')
    .replace(/³/g, '3');
}

/**
 * Compare the project's bid positions against the tender's positions.
 * Headers/groups in either side are ignored — only Items count.
 */
export function validateBidAgainstTender(
  tender: ParsedGaeb,
  bidPositions: ProjectPositionLite[],
): ValidationResult {
  // Tender items only (skip groups + remarks).
  const tenderItems = tender.positions.filter((p) => p.type === 'item');
  const tenderByOz = new Map<string, GaebPosition>();
  for (const t of tenderItems) {
    const oz = normalizeOz(t.oz);
    if (oz) tenderByOz.set(oz, t);
  }

  // Bid items (skip headers).
  const bidItems = bidPositions.filter((p) => !p.isHeader && normalizeOz(p.oz));
  const bidByOz = new Map<string, ProjectPositionLite>();
  for (const b of bidItems) {
    bidByOz.set(normalizeOz(b.oz), b);
  }

  const issues: ValidationIssue[] = [];
  let matched = 0;

  // Empty-tender guard — the uploaded file parsed but contained 0 Items. Without
  // this every bid row becomes `extra-in-bid` and the banner falsely says "OK".
  if (tenderItems.length === 0) {
    issues.push({ kind: 'tender-empty' });
    return {
      tenderCount: 0,
      bidCount: bidItems.length,
      matched: 0,
      issues,
      ok: false,
    };
  }

  // Tender-driven pass: find missing or mismatched.
  for (const [oz, t] of tenderByOz) {
    const b = bidByOz.get(oz);
    if (!b) {
      issues.push({
        kind: 'missing-in-bid',
        oz,
        tenderText: t.kurztext || '',
        tenderQuantity: t.menge,
        tenderUnit: t.einheit || '',
      });
      continue;
    }
    let cleanRow = true;
    // Quantity TBD on tender — flag as info, but do NOT poison the match count:
    // the position IS correctly answered (OZ + unit), we just can't verify the
    // Menge because the Vergabestelle left it open.
    if (t.qtyTBD) {
      issues.push({ kind: 'tender-qty-tbd', oz, tenderText: t.kurztext || '' });
    } else if (typeof t.menge === 'number' && Math.abs((b.quantity ?? 0) - t.menge) > QTY_TOLERANCE) {
      issues.push({
        kind: 'quantity-mismatch',
        oz,
        tender: t.menge,
        bid: b.quantity ?? 0,
        tenderText: t.kurztext || '',
      });
      cleanRow = false;
    }
    if (
      t.einheit &&
      b.unit &&
      normalizeUnit(t.einheit) !== normalizeUnit(b.unit)
    ) {
      issues.push({
        kind: 'unit-mismatch',
        oz,
        tender: t.einheit,
        bid: b.unit,
        tenderText: t.kurztext || '',
      });
      cleanRow = false;
    }
    if (cleanRow) matched += 1;
  }

  // Bid-driven pass: find positions in bid that tender didn't ask for.
  for (const [oz, b] of bidByOz) {
    if (!tenderByOz.has(oz)) {
      issues.push({
        kind: 'extra-in-bid',
        oz,
        bidText: b.shortText || '',
        bidQuantity: b.quantity ?? 0,
        bidUnit: b.unit || '',
      });
    }
  }

  // Severity ordering for the UI.
  const severityRank: Record<ValidationIssue['kind'], number> = {
    'tender-empty': -1,
    'missing-in-bid': 0,
    'quantity-mismatch': 1,
    'unit-mismatch': 2,
    'extra-in-bid': 3,
    'tender-qty-tbd': 4,
  };
  issues.sort((a, b) => {
    const s = severityRank[a.kind] - severityRank[b.kind];
    if (s !== 0) return s;
    const aOz = 'oz' in a ? a.oz : '';
    const bOz = 'oz' in b ? b.oz : '';
    return normalizeOz(aOz).localeCompare(normalizeOz(bOz));
  });

  const blocking = issues.some(
    (i) =>
      i.kind === 'missing-in-bid' ||
      i.kind === 'quantity-mismatch' ||
      i.kind === 'unit-mismatch',
  );

  return {
    tenderCount: tenderItems.length,
    bidCount: bidItems.length,
    matched,
    issues,
    ok: !blocking,
  };
}
