/**
 * Tests for the X84 ↔ X83 cross-validator.
 * Uses synthetic ParsedGaeb fixtures (no XML parsing) so the suite is fast
 * and isolated from happy-dom DOMParser quirks.
 */
import { describe, it, expect } from 'vitest';
import { validateBidAgainstTender, type ProjectPositionLite } from '@/lib/gaeb/validator';
import type { ParsedGaeb, Position as GaebPos } from '@/lib/gaeb';

function tender(positions: GaebPos[]): ParsedGaeb {
  return {
    filename: 't.x83',
    size: 0,
    format: 'gaeb-xml-3.2',
    formatLabel: 'GAEB DA XML 3.2',
    currency: 'EUR',
    positionCount: positions.filter((p) => p.type === 'item').length,
    positions,
    groups: [],
    hasLongtext: false,
  };
}

const ti = (over: Partial<GaebPos> & { oz: string }): GaebPos => ({
  oz: over.oz,
  pos: over.pos ?? over.oz,
  kurztext: over.kurztext ?? '',
  langtext: over.langtext ?? '',
  einheit: over.einheit ?? '',
  menge: over.menge,
  level: over.level ?? 1,
  type: over.type ?? 'item',
});

const bi = (over: Partial<ProjectPositionLite> & { oz: string }): ProjectPositionLite => ({
  oz: over.oz,
  shortText: over.shortText ?? '',
  quantity: over.quantity ?? 0,
  unit: over.unit ?? '',
  isHeader: over.isHeader ?? false,
});

describe('validateBidAgainstTender', () => {
  it('clean match → ok=true, no issues', () => {
    const t = tender([
      ti({ oz: '1.1', kurztext: 'Erdaushub', menge: 10, einheit: 'm³' }),
      ti({ oz: '1.2', kurztext: 'Pflaster', menge: 50, einheit: 'm²' }),
    ]);
    const b = [
      bi({ oz: '1.1', quantity: 10, unit: 'm³', shortText: 'Erdaushub' }),
      bi({ oz: '1.2', quantity: 50, unit: 'm²', shortText: 'Pflaster' }),
    ];
    const r = validateBidAgainstTender(t, b);
    expect(r.ok).toBe(true);
    expect(r.matched).toBe(2);
    expect(r.issues).toEqual([]);
  });

  it('missing OZ in bid → blocking', () => {
    const t = tender([ti({ oz: '1.1', menge: 10, einheit: 'm³' })]);
    const r = validateBidAgainstTender(t, []);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.kind === 'missing-in-bid')).toBe(true);
  });

  it('quantity mismatch → blocking', () => {
    const t = tender([ti({ oz: '1.1', menge: 10, einheit: 'm³' })]);
    const b = [bi({ oz: '1.1', quantity: 12, unit: 'm³' })];
    const r = validateBidAgainstTender(t, b);
    expect(r.ok).toBe(false);
    const issue = r.issues.find((i) => i.kind === 'quantity-mismatch');
    expect(issue).toBeDefined();
    expect((issue as { tender: number }).tender).toBe(10);
    expect((issue as { bid: number }).bid).toBe(12);
  });

  it('unit mismatch → blocking', () => {
    const t = tender([ti({ oz: '1.1', menge: 10, einheit: 'm³' })]);
    const b = [bi({ oz: '1.1', quantity: 10, unit: 'm²' })];
    const r = validateBidAgainstTender(t, b);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.kind === 'unit-mismatch')).toBe(true);
  });

  it('unit-mismatch comparison is case + whitespace insensitive', () => {
    const t = tender([ti({ oz: '1.1', menge: 10, einheit: ' M³ ' })]);
    const b = [bi({ oz: '1.1', quantity: 10, unit: 'm³' })];
    expect(validateBidAgainstTender(t, b).ok).toBe(true);
  });

  it('extra-in-bid is non-blocking warning', () => {
    const t = tender([ti({ oz: '1.1', menge: 1, einheit: 'St' })]);
    const b = [
      bi({ oz: '1.1', quantity: 1, unit: 'St' }),
      bi({ oz: '2.1', quantity: 5, unit: 'm', shortText: 'extra' }),
    ];
    const r = validateBidAgainstTender(t, b);
    expect(r.ok).toBe(true); // warnings only
    expect(r.issues.some((i) => i.kind === 'extra-in-bid')).toBe(true);
  });

  it('headers in bid + groups in tender are ignored', () => {
    const t = tender([
      ti({ oz: '1', type: 'group', kurztext: 'Bauwerk', level: 1 }),
      ti({ oz: '1.1', menge: 10, einheit: 'm³', level: 2 }),
    ]);
    const b = [
      bi({ oz: '1', isHeader: true }),
      bi({ oz: '1.1', quantity: 10, unit: 'm³' }),
    ];
    const r = validateBidAgainstTender(t, b);
    expect(r.tenderCount).toBe(1);
    expect(r.bidCount).toBe(1);
    expect(r.ok).toBe(true);
  });

  it('qtyTBD tender position → info, not blocking', () => {
    const t = tender([{ ...ti({ oz: '1.1', einheit: 'm³' }), qtyTBD: true }]);
    const b = [bi({ oz: '1.1', quantity: 5, unit: 'm³' })];
    const r = validateBidAgainstTender(t, b);
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.kind === 'tender-qty-tbd')).toBe(true);
  });

  it('issues sorted by severity (missing → qty → unit → extra → tbd)', () => {
    const t = tender([
      ti({ oz: 'A', menge: 1, einheit: 'St' }),
      ti({ oz: 'B', menge: 2, einheit: 'St' }),
      ti({ oz: 'C', menge: 3, einheit: 'St' }),
    ]);
    const b = [
      bi({ oz: 'B', quantity: 99, unit: 'St' }),    // qty mismatch
      bi({ oz: 'C', quantity: 3, unit: 'kg' }),     // unit mismatch
      bi({ oz: 'Z', quantity: 1, unit: 'St' }),     // extra
    ];
    const r = validateBidAgainstTender(t, b);
    const kinds = r.issues.map((i) => i.kind);
    // missing A first, then qty B, then unit C, then extra Z
    expect(kinds[0]).toBe('missing-in-bid');
    expect(kinds[1]).toBe('quantity-mismatch');
    expect(kinds[2]).toBe('unit-mismatch');
    expect(kinds[3]).toBe('extra-in-bid');
  });
});
