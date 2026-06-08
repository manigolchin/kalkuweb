import type { CalcParams, Position } from './types';

export const DEFAULT_CALC_PARAMS: CalcParams = {
  mittellohn: 30.0,
  verrechnungslohn: 49.9,
  materialZuschlag: 0.12,
  nuZuschlag: 0.12,
  geraeteZuschlagPct: 0.1,
  geraeteStundensatz: 0.5,
  zeitabzug: 0,
  tagesstunden: 8,
  personaleinsatz: 3,
  mwst: 0.19,
  zielAufschlag: 0,
};

// Half-away-from-zero rounding that matches Excel's "Präzision wie angezeigt".
// A plain Math.round(n * 100) is wrong at the X.XX5 boundary: the Vorlage's
// chained arithmetic (Y → AC → AA/AB) leaves an exact half a few ULP low in
// binary FP (e.g. 1.275 → 1.27499…), so Math.round drops it DOWN while Excel
// rounds it UP (1.275 → 1.28). Nudge toward away-from-zero before rounding; the
// nudge is ≤1e-9 relative — far below the 2-dp grid, so it only ever rescues a
// true half and never disturbs a genuine non-boundary value.
const round = (n: number, d = 2): number => {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** d;
  const x = n * f;
  return Math.round(x + Math.sign(x) * Math.abs(x) * 1e-9) / f;
};

export type PositionCalcResult = {
  epLohn: number;
  epMaterial: number;
  epGeraet: number;
  epNu: number;
  ep: number;
  gp: number;
  gpLohn: number;
  gpMaterial: number;
  gpGeraet: number;
  gpNu: number;
  hoursTotal: number;
};

export function calculatePosition(
  pos: Pick<Position, 'quantity' | 'materialCost' | 'timeMinutes' | 'nuCost' | 'isHeader' | 'geraeteSatz' | 'geraeteEp' | 'lohnEp'>,
  params: CalcParams,
): PositionCalcResult {
  if (pos.isHeader) {
    return {
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      gpLohn: 0, gpMaterial: 0, gpGeraet: 0, gpNu: 0, hoursTotal: 0,
    };
  }
  // Global Ziel-Aufschlag — scales every cost component so the bid hits a
  // chosen Angebotssumme. Default 0 → factor 1 → no-op. Applied per-component
  // (before rounding) so the EFB/Nachkalkulation breakdown stays consistent
  // (gpLohn + gpMaterial + gpGeraet + gpNu == gp).
  const zielFactor = 1 + (params.zielAufschlag ?? 0);
  // The Vorlage is stored with "Präzision wie angezeigt", so the adjusted time
  // (col AC) AND each cost component (Geräte/Lohn/Material/NU = cols AA/AB/AJ/AK)
  // are rounded to the cent, EP (col E) is the SUM of those rounded cents, and
  // GP (col F) = Menge × EP. Reproducing that exact rounding chain is what makes
  // an imported position show the Excel's money to the cent (sum-then-round drifts
  // ±0.01 per line and amplifies into euros on large quantities).
  const adjustedTime = round(pos.timeMinutes + (pos.timeMinutes / 100) * params.zeitabzug);
  // Per-position Geräte. A hard-coded lump sum (Vorlage "EP Geräte" col AA)
  // wins as a flat per-unit amount; otherwise the rate model applies — the
  // per-position "Zulage Geräte" (col Z) rate, falling back to the global.
  const geraeteSatz = pos.geraeteSatz ?? params.geraeteStundensatz;
  const epGeraet = round(
    pos.geraeteEp != null
      ? pos.geraeteEp * zielFactor
      : (adjustedTime / 60) * geraeteSatz * zielFactor,
  );
  // Per-position EP Löhne (Vorlage "EP Löhne" col AB) wins flat when set
  // (hard-coded specialist rate or custom formula); else time × Verrechnungslohn.
  const epLohn = round(
    pos.lohnEp != null
      ? pos.lohnEp * zielFactor
      : (adjustedTime / 60) * params.verrechnungslohn * zielFactor,
  );
  const epMaterial = round(pos.materialCost * (1 + params.materialZuschlag) * zielFactor);
  const epNu = round(pos.nuCost * (1 + params.nuZuschlag) * zielFactor);
  const ep = round(epGeraet + epLohn + epMaterial + epNu);
  const gp = round(pos.quantity * ep);
  return {
    epLohn,
    epMaterial,
    epGeraet,
    epNu,
    ep,
    gp,
    gpLohn: round(pos.quantity * epLohn),
    gpMaterial: round(pos.quantity * epMaterial),
    gpGeraet: round(pos.quantity * epGeraet),
    gpNu: round(pos.quantity * epNu),
    hoursTotal: round((adjustedTime * pos.quantity) / 60),
  };
}

export function recalcAll(positions: Position[], params: CalcParams): Position[] {
  return positions.map((p) => {
    const calc = calculatePosition(p, params);
    return {
      ...p,
      epLohn: calc.epLohn,
      epMaterial: calc.epMaterial,
      epGeraet: calc.epGeraet,
      epNu: calc.epNu,
      ep: calc.ep,
      gp: calc.gp,
    };
  });
}

export type ProjectTotals = {
  totalNetto: number;
  totalLohn: number;
  totalMaterial: number;
  totalGeraet: number;
  totalNu: number;
  totalHours: number;
  totalMwst: number;
  totalBrutto: number;
  visibleNetto: number;
  visibleMwst: number;
  visibleBrutto: number;
};

export function calcTotals(
  positions: Position[],
  params: CalcParams,
  visibleIds?: Set<string>,
): ProjectTotals {
  let totalNetto = 0;
  let totalLohn = 0;
  let totalMaterial = 0;
  let totalGeraet = 0;
  let totalNu = 0;
  let totalHours = 0;
  let visibleNetto = 0;

  for (const p of positions) {
    if (p.isHeader) continue;
    const calc = calculatePosition(p, params);
    totalNetto += calc.gp;
    totalLohn += calc.gpLohn;
    totalMaterial += calc.gpMaterial;
    totalGeraet += calc.gpGeraet;
    totalNu += calc.gpNu;
    totalHours += calc.hoursTotal;
    if (!visibleIds || visibleIds.has(p.id)) {
      visibleNetto += calc.gp;
    }
  }

  const totalMwst = totalNetto * params.mwst;
  const visibleMwst = visibleNetto * params.mwst;

  return {
    totalNetto: round(totalNetto),
    totalLohn: round(totalLohn),
    totalMaterial: round(totalMaterial),
    totalGeraet: round(totalGeraet),
    totalNu: round(totalNu),
    totalHours: round(totalHours, 1),
    totalMwst: round(totalMwst),
    totalBrutto: round(totalNetto + totalMwst),
    visibleNetto: round(visibleNetto),
    visibleMwst: round(visibleMwst),
    visibleBrutto: round(visibleNetto + visibleMwst),
  };
}

/**
 * Net total (Σ GP over all non-header positions) evaluated at
 * zielAufschlag = 0 — the "raw" Angebotssumme before any global
 * target-markup. This is the basis the target-pricing solver scales.
 */
export function baseNetto(positions: Position[], params: CalcParams): number {
  const base: CalcParams = { ...params, zielAufschlag: 0 };
  let sum = 0;
  for (const p of positions) {
    if (p.isHeader) continue;
    sum += calculatePosition(p, base).gp;
  }
  return round(sum);
}

/**
 * Back-solve the global `zielAufschlag` that makes the net total
 * (Angebotssumme) equal `targetNetto`. Every GP scales linearly by
 * `(1 + zielAufschlag)`, so this is closed-form: `z = target / base - 1`.
 *
 * - Returns the current zielAufschlag unchanged if `targetNetto` isn't a
 *   finite positive number (invalid input → no-op).
 * - Returns 0 when the base total is 0 (nothing to scale against).
 * - Clamps the factor to ≥ 0 (`z ≥ -1`) so prices never go negative; the
 *   upper bound is generous to allow large markups.
 *
 * Per-position rounding means the realised total can differ from
 * `targetNetto` by a few cents — expected and acceptable for a bid.
 */
export function solveZielAufschlag(
  positions: Position[],
  params: CalcParams,
  targetNetto: number,
): number {
  if (!Number.isFinite(targetNetto) || targetNetto <= 0) {
    return params.zielAufschlag ?? 0;
  }
  const base = baseNetto(positions, params);
  if (base <= 0) return 0;
  const z = targetNetto / base - 1;
  const clamped = Math.min(Math.max(z, -1), 100);
  return round(clamped, 8);
}

export const formatEUR = (n: number, digits = 2) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0);

export const formatNum = (n: number, digits = 2) =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0);

export function makeBlankPosition(id: string, sortOrder: number): Position {
  return {
    id,
    oz: '',
    shortText: '',
    longText: '',
    hinweisText: '',
    quantity: 0,
    unit: '',
    materialCost: 0,
    timeMinutes: 0,
    nuCost: 0,
    isHeader: false,
    sortOrder,
    sectionPath: '',
    epLohn: 0,
    epMaterial: 0,
    epGeraet: 0,
    epNu: 0,
    ep: 0,
    gp: 0,
    visibleToCustomer: true,
    positionType: 'standard',
  };
}
