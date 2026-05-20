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
};

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

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
  pos: Pick<Position, 'quantity' | 'materialCost' | 'timeMinutes' | 'nuCost' | 'isHeader'>,
  params: CalcParams,
): PositionCalcResult {
  if (pos.isHeader) {
    return {
      epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0,
      gpLohn: 0, gpMaterial: 0, gpGeraet: 0, gpNu: 0, hoursTotal: 0,
    };
  }
  const adjustedTime = pos.timeMinutes + (pos.timeMinutes / 100) * params.zeitabzug;
  const epGeraet = (adjustedTime / 60) * params.geraeteStundensatz;
  const epLohn = (adjustedTime / 60) * params.verrechnungslohn;
  const epMaterial = pos.materialCost * (1 + params.materialZuschlag);
  const epNu = pos.nuCost * (1 + params.nuZuschlag);
  const ep = epLohn + epMaterial + epGeraet + epNu;
  const gp = pos.quantity * ep;
  return {
    epLohn: round(epLohn),
    epMaterial: round(epMaterial),
    epGeraet: round(epGeraet),
    epNu: round(epNu),
    ep: round(ep),
    gp: round(gp),
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
  };
}
