import type { Row, Aufschlaege } from './types';

/**
 * EP = (Lohn × Zeit + Material) × (1 + Positions-Zuschlag/100) × (1 + NU-Zuschlag/100, falls NU).
 * Der Positions-Zuschlag bildet den klassischen "Mittellohn-Aufschlag" (Lohnnebenkosten + Gerätevorhalt)
 * je Position ab. BGK/AGK/W&G werden global auf die Netto-Summe gerechnet, nicht je Position.
 */
export function computeEp(r: Row, a?: Pick<Aufschlaege, 'nuZuschlag'>): number {
  const base = r.lohn * r.zeit + r.material;
  const ep = base * (1 + r.zuschlag / 100);
  if (r.nu && a) return ep * (1 + a.nuZuschlag / 100);
  return ep;
}

export function computeGp(r: Row, a?: Pick<Aufschlaege, 'nuZuschlag'>): number {
  return computeEp(r, a) * r.menge;
}

export type Totals = {
  /** Summen je Zeile, in Reihenfolge der Rows. */
  eps: number[];
  gps: number[];
  /** Σ aller GPs = Netto-Bauleistung vor Gemeinkosten-Aufschlag. */
  netto: number;
  /** Lohn-Anteil (× Menge × Pos-Zuschlag × ggf. NU-Zuschlag). */
  lohnTotal: number;
  /** Material-Anteil (analog). */
  materialTotal: number;
  /** Σ Arbeitsstunden (Zeit × Menge). */
  stundenTotal: number;
  /** Σ NU-Anteil — alle Positionen, bei denen nu === true, addiert sich der NU-Aufschlag. */
  nuTotal: number;
  /** Anteil BGK (Σ × bgk/100). */
  bgk: number;
  /** Anteil AGK (Σ × agk/100, nach BGK). */
  agk: number;
  /** Anteil W&G (Σ × wug/100, nach BGK+AGK). */
  wug: number;
  /** Netto-Auftragssumme = netto + BGK + AGK + W&G. */
  nettoMitZuschlaegen: number;
  /** MwSt-Betrag. */
  mwst: number;
  /** Brutto = Netto mit Zuschlägen + MwSt. */
  brutto: number;
};

export function computeTotals(rows: Row[], a: Aufschlaege): Totals {
  const eps = rows.map((r) => computeEp(r, a));
  const gps = rows.map((r, i) => eps[i] * r.menge);
  const netto = gps.reduce((s, v) => s + v, 0);

  let lohnTotal = 0;
  let materialTotal = 0;
  let stundenTotal = 0;
  let nuTotal = 0;
  for (const r of rows) {
    const nuFactor = r.nu ? 1 + a.nuZuschlag / 100 : 1;
    const lohnAnteil = r.lohn * r.zeit * r.menge * (1 + r.zuschlag / 100) * nuFactor;
    const materialAnteil = r.material * r.menge * (1 + r.zuschlag / 100) * nuFactor;
    lohnTotal += lohnAnteil;
    materialTotal += materialAnteil;
    stundenTotal += r.zeit * r.menge;
    if (r.nu) {
      const epOhneNu = (r.lohn * r.zeit + r.material) * (1 + r.zuschlag / 100) * r.menge;
      nuTotal += epOhneNu * (a.nuZuschlag / 100);
    }
  }

  const bgk = netto * (a.bgk / 100);
  const nachBgk = netto + bgk;
  const agk = nachBgk * (a.agk / 100);
  const nachAgk = nachBgk + agk;
  const wug = nachAgk * (a.wug / 100);
  const nettoMitZuschlaegen = nachAgk + wug;
  const mwst = nettoMitZuschlaegen * (a.mwst / 100);
  const brutto = nettoMitZuschlaegen + mwst;

  return {
    eps,
    gps,
    netto,
    lohnTotal,
    materialTotal,
    stundenTotal,
    nuTotal,
    bgk,
    agk,
    wug,
    nettoMitZuschlaegen,
    mwst,
    brutto,
  };
}

/** Parse "12,50" oder "12.50" oder "1.234,56" → 12.50 / 1234.56. */
export function parseGermanNumber(s: string | undefined): number {
  if (!s) return NaN;
  const cleaned = s
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}

export function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtCurrency(n: number): string {
  return n.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

export function fmtPct(n: number): string {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} %`;
}
