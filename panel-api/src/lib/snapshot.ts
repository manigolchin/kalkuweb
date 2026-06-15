import { createHash } from 'node:crypto';
import type {
  CalcParams,
  Position,
  ProjectData,
  ShareSnapshot,
  ShareSnapshotSummary,
} from '../schema.js';

// Half-away-from-zero rounding that matches Excel's "Präzision wie angezeigt"
// + the client calc.ts. Plain Math.round(n * 100) rounds the wrong way at the
// X.XX5 boundary (binary FP leaves an exact half a few ULP low, e.g. 1.275 →
// 1.27499…), so the customer share would drift a cent from the calculator.
// The nudge is a FIXED absolute epsilon in cent-space (1e-6 ≪ the 0.5 grid),
// NOT magnitude-relative: a relative `x · 1e-9` reaches half a cent once
// x = n·100 ≥ 5e8, so it silently pushed every total ≥ 5,000,000 € up a cent
// (49.999.999,99 € → 50.000.000,04 €). Keep in sync with src calc.ts.
const round = (n: number, d = 2): number => {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** d;
  const x = n * f;
  return Math.round(x + Math.sign(x) * 1e-6) / f;
};

/** German Arbeitstage-pro-Monat divisor (≈ 261 Werktage / 12). Matches the
 *  calculator's Vorlage so the customer's "Monate" reads the same. */
const ARBEITSTAGE_PRO_MONAT = 21.5;

/** Per-position GESAMTPREIS split into the four cost types, plus the matching
 *  EINKAUF (raw cost) per type. Each value is `round(quantity × per-unit)`,
 *  mirroring calc.ts's gp rounding — so the split reconciles with the line's
 *  own gp and the per-position values the customer view shows are stable. */
export type PositionCostSplit = {
  gpLohn: number;
  gpMaterial: number;
  gpGeraet: number;
  gpNu: number;
  ekLohn: number;
  ekMaterial: number;
  ekGeraet: number;
  ekNu: number;
};

export function positionCostSplit(p: Position, params: CalcParams): PositionCostSplit {
  if (p.isHeader || p.bedarfsposition) {
    // Bedarfs-/Eventualpositionen carry no GP in the offer (Vorlage leaves col F
    // blank) — contribute nothing to the cost split / totals.
    return { gpLohn: 0, gpMaterial: 0, gpGeraet: 0, gpNu: 0, ekLohn: 0, ekMaterial: 0, ekGeraet: 0, ekNu: 0 };
  }
  const zf = 1 + (params.zielAufschlag ?? 0);
  // Round the adjusted time (col AC) to the cent — "Präzision wie angezeigt",
  // matching recomputePosition + the client calc + the Excel.
  const adj = round(p.timeMinutes + (p.timeMinutes / 100) * params.zeitabzug);
  const hpu = adj / 60; // Stunden je Einheit
  const geraeteSatz = p.geraeteSatz ?? params.geraeteStundensatz; // per-position rate override
  // Per-unit VERKAUF components, each rounded to the cent — these ARE the
  // Vorlage's cols AA/AB/AJ/AK, so Σ(Menge × component) reconciles with the
  // line's gp (= Menge × EP) exactly the way the Excel's GP split does.
  // Geräte: a hard-coded lump sum ("EP Geräte", col AA) wins flat; else rate ×
  // Stunden-je-Einheit. Lohn: a per-position override ("EP Löhne", col AB —
  // specialist rate / custom formula) wins flat; else Stunden × Verrechnungslohn.
  const geraeteVkUnit = round(p.geraeteEp != null ? p.geraeteEp * zf : hpu * geraeteSatz * zf);
  // Lohn-Faktor "W" (col AB = Zeit/60 × Verrechnungslohn × W) scales BOTH the
  // VERKAUF (× Verrechnungslohn) and the EINKAUF (× Mittellohn) labor, so the
  // EK/VK ratio — and the Lohn-Zuschlag — stay exactly as the Vorlage. Default 1.
  const lohnFaktor = p.lohnFaktor ?? 1;
  const lohnVkUnit = round(p.lohnEp != null ? p.lohnEp * zf : hpu * params.verrechnungslohn * lohnFaktor * zf);
  const materialVkUnit = round(p.materialEp != null ? p.materialEp * zf : p.materialCost * (1 + params.materialZuschlag) * zf);
  const nuVkUnit = round(p.nuEp != null ? p.nuEp * zf : p.nuCost * (1 + params.nuZuschlag) * zf);
  // EINKAUF (raw cost): Lohn at Mittellohn (keeps the EK/VK ratio), Material/NU
  // before Zuschlag, Geräte before Ziel-Aufschlag — so Geräte reconciles to 0 %
  // Zuschlag when there's no markup (no phantom rounding spread).
  const lohnRatio = params.verrechnungslohn > 0 ? params.mittellohn / params.verrechnungslohn : 1;
  const lohnEkUnit = p.lohnEp != null ? p.lohnEp * lohnRatio : hpu * params.mittellohn * lohnFaktor;
  const geraeteEkUnit = p.geraeteEp != null ? p.geraeteEp : hpu * geraeteSatz;
  return {
    gpLohn: round(p.quantity * lohnVkUnit),
    gpMaterial: round(p.quantity * materialVkUnit),
    gpGeraet: round(p.quantity * geraeteVkUnit),
    gpNu: round(p.quantity * nuVkUnit),
    ekLohn: round(p.quantity * lohnEkUnit),
    ekMaterial: round(p.quantity * p.materialCost),
    ekGeraet: round(p.quantity * geraeteEkUnit),
    ekNu: round(p.quantity * p.nuCost),
  };
}

/**
 * Aggregate calculation summary over the VISIBLE non-header positions. The
 * headline `netto` is Σ gp (so it matches the line items + footer exactly); the
 * VERKAUF cost-type split is reconciled to that netto (any sub-cent rounding
 * residual is folded into the largest part) so the composition always adds up.
 * EINKAUF is the raw cost per type → Zuschlag-% folds in the global
 * Ziel-Aufschlag, exactly like the calculator's Zuschlag-Matrix.
 */
export function computeShareSummary(positions: Position[], params: CalcParams): ShareSnapshotSummary {
  let totalHours = 0;
  let netto = 0;
  let vkLohn = 0;
  let vkMaterial = 0;
  let vkGeraet = 0;
  let vkNu = 0;
  let ekLohn = 0;
  let ekMaterial = 0;
  let ekGeraet = 0;
  let ekNu = 0;

  for (const p of positions) {
    // Bedarfs-/Eventualpositionen are priced but excluded from the Angebotssumme.
    if (p.isHeader || p.bedarfsposition) continue;
    const adj = round(p.timeMinutes + (p.timeMinutes / 100) * params.zeitabzug);
    totalHours += (adj / 60) * p.quantity;
    netto += p.gp;
    const s = positionCostSplit(p, params);
    vkLohn += s.gpLohn;
    vkMaterial += s.gpMaterial;
    vkGeraet += s.gpGeraet;
    vkNu += s.gpNu;
    ekLohn += s.ekLohn;
    ekMaterial += s.ekMaterial;
    ekGeraet += s.ekGeraet;
    ekNu += s.ekNu;
  }
  netto = round(netto);

  // Reconcile the VERKAUF split to the authoritative netto so the composition
  // bar + Kalkulation table always sum to the headline (folds the ≤few-cent
  // rounding residual into the largest cost type — invisible on its value).
  const vk = [round(vkLohn), round(vkMaterial), round(vkGeraet), round(vkNu)];
  const resid = round(netto - (vk[0] + vk[1] + vk[2] + vk[3]));
  if (resid !== 0) {
    let maxI = 0;
    for (let i = 1; i < 4; i++) if (vk[i] > vk[maxI]) maxI = i;
    vk[maxI] = round(vk[maxI] + resid);
  }

  // Geräte: EINKAUF = VERKAUF / (1 + Geräte-Zuschlag), mirroring the Excel
  // Vorlage (J6 = gerätekosten/(1+gaereteprznt), default 10 %). The per-position
  // Geräte rate already sits in VERKAUF — the Zuschlag only splits that into
  // cost vs. margin, so it surfaces in the Geräte-Zuschlag-% and the Überschuss,
  // never in the customer price (which stays Σ Min/60 × Geräte-Satz).
  const gPct = params.geraeteZuschlagPct ?? 0;
  // Guard the divisor: a malformed import (col K6) can yield a Geräte-Zuschlag of
  // -100 % or worse, making (1 + gPct) ≤ 0 → Infinity → a broken customer share
  // (Überschuss = -Infinity, JSON-serialised as null). When the split is
  // undefined, fall back to EK = VK Geräte (no margin) — the same degrade the
  // Lohn ratio uses above.
  // EINKAUF per type, derived from the reconciled VERKAUF exactly like the
  // Vorlage header (J4 = VK_Stoffe/(1+matZ), J6 = VK_Geräte/(1+gPct),
  // J7 = Mittellohn × Ges.Std with Ges.Std = VK_Lohn/Verrechnungslohn) — so the
  // EINKAUF column + Überschuss match the Excel (and the panel's captured matrix)
  // to the cent instead of drifting from summed per-position raw costs. A
  // non-positive divisor degrades to EK = VK (no margin) rather than Infinity.
  const div = (vkv: number, factor: number) => (factor > 0 ? vkv / factor : vkv);
  const vl = params.verrechnungslohn;
  const ek = [
    round(vl > 0 ? params.mittellohn * (vk[0] / vl) : vk[0]),
    round(div(vk[1], 1 + (params.materialZuschlag ?? 0))),
    round(div(vk[2], 1 + gPct)),
    round(div(vk[3], 1 + (params.nuZuschlag ?? 0))),
  ];
  const costType = (ekv: number, vkv: number) => ({
    ek: ekv,
    vk: vkv,
    zuschlagPct: ekv > 0 ? round(vkv / ekv - 1, 4) : 0,
    differnz: round(vkv - ekv),
  });
  const ekTotal = round(ek[0] + ek[1] + ek[2] + ek[3]);
  const mwst = round(netto * params.mwst);
  const arbeitstage =
    params.personaleinsatz > 0 && params.tagesstunden > 0
      ? totalHours / (params.personaleinsatz * params.tagesstunden)
      : 0;

  return {
    netto,
    mwst,
    brutto: round(netto + mwst),
    totalHours: round(totalHours, 1),
    ekTotal,
    ueberschuss: round(netto - ekTotal),
    costTypes: {
      lohn: costType(ek[0], vk[0]),
      material: costType(ek[1], vk[1]),
      geraete: costType(ek[2], vk[2]),
      nu: costType(ek[3], vk[3]),
    },
    mitarbeiter: params.personaleinsatz,
    arbeitstage: round(arbeitstage, 1),
    monate: round(arbeitstage / ARBEITSTAGE_PRO_MONAT, 2),
  };
}

function recomputePosition(p: Position, params: CalcParams): Position {
  if (p.isHeader) {
    return { ...p, epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0 };
  }
  // Mirror of client calc (src/features/kalkulation/calc.ts): global
  // Ziel-Aufschlag scales every cost component so the share snapshot matches
  // the calculator's chosen Angebotssumme. Default 0 → factor 1 → no-op.
  const zielFactor = 1 + (params.zielAufschlag ?? 0);
  // "Präzision wie angezeigt": the Vorlage rounds the adjusted time (col AC) and
  // each cost component (cols AA/AB/AJ/AK) to the cent, EP (col E) = the SUM of
  // those rounded cents, GP (col F) = Menge × EP. Mirror that exactly so the
  // customer share shows the same per-position money as the calculator + Excel.
  const adj = round(p.timeMinutes + (p.timeMinutes / 100) * params.zeitabzug);
  const geraeteSatz = p.geraeteSatz ?? params.geraeteStundensatz;
  // Hard-coded "EP Geräte" (col AA) lump sum wins flat; else rate × time.
  const epGeraet = round(
    p.geraeteEp != null ? p.geraeteEp * zielFactor : (adj / 60) * geraeteSatz * zielFactor,
  );
  // Per-position EP Löhne override (col AB) wins flat; else time × Verrechnungslohn.
  const epLohn = round(
    p.lohnEp != null
      ? p.lohnEp * zielFactor
      : (adj / 60) * params.verrechnungslohn * (p.lohnFaktor ?? 1) * zielFactor,
  );
  const epMaterial = round(p.materialEp != null ? p.materialEp * zielFactor : p.materialCost * (1 + params.materialZuschlag) * zielFactor);
  const epNu = round(p.nuEp != null ? p.nuEp * zielFactor : p.nuCost * (1 + params.nuZuschlag) * zielFactor);
  // Captured GP override (col F) wins as the GESAMTPREIS; EP = GP/Menge. The
  // split stays component-derived and is reconciled to netto in computeShareSummary.
  const componentEp = round(epGeraet + epLohn + epMaterial + epNu);
  const gp = p.gpOverride != null ? round(p.gpOverride * zielFactor) : round(p.quantity * componentEp);
  const ep = p.gpOverride != null && p.quantity ? round(gp / p.quantity) : componentEp;
  return {
    ...p,
    epLohn,
    epMaterial,
    epGeraet,
    epNu,
    ep,
    // Bedarfsposition shows GP = 0 like the Vorlage cell (excluded from offer).
    gp: p.bedarfsposition ? 0 : gp,
  };
}

export function recomputePositions(positions: Position[], params: CalcParams): Position[] {
  return positions.map((p) => recomputePosition(p, params));
}

/**
 * Build a frozen snapshot of the share's customer-visible data at share creation
 * (or re-share) time. The customer view reads from this snapshot only — so the
 * owner editing the project after sharing does NOT change what the customer sees.
 */
export function buildShareSnapshot(
  project: { name: string; client: string; service: string; tenderNumber: string; deadline: string; notes?: string; calcParams: CalcParams },
  positions: Position[],
  visibleIds: string[],
  projectVersionNumber: number,
): ShareSnapshot {
  const ids = new Set(visibleIds);
  // Internal cost-padding position types (Wagnis / Reserve / NU-Marge / Lohn-
  // Puffer) must NEVER reach the customer, even if their id is mistakenly in
  // visibleIds (a crafted request or a stale preset). Hard server-side exclusion
  // — defense-in-depth on top of the UI's visibleToCustomer flag.
  const INTERNAL_TYPES = new Set(['wagnis', 'reserve', 'nu_marge', 'lohn_puffer']);
  const recomputed = recomputePositions(positions, project.calcParams);
  const visibleFull = recomputed.filter(
    (p) => ids.has(p.id) && !INTERNAL_TYPES.has(p.positionType ?? 'standard'),
  );
  const visible = visibleFull.map((p) => {
    const split = positionCostSplit(p, project.calcParams);
    return {
      id: p.id,
      oz: p.oz,
      shortText: p.shortText,
      longText: p.longText,
      quantity: p.quantity,
      unit: p.unit,
      isHeader: !!p.isHeader,
      sortOrder: p.sortOrder,
      ep: p.ep,
      gp: p.gp,
      // GESAMTPREIS split (Lohn/Material/Gerät/NU) — sums to gp per line.
      gpLohn: split.gpLohn,
      gpMaterial: split.gpMaterial,
      gpGeraet: split.gpGeraet,
      gpNu: split.gpNu,
    };
  });
  return {
    snapshottedAt: new Date().toISOString(),
    projectVersionNumber,
    project: {
      name: project.name,
      client: project.client,
      service: project.service,
      tenderNumber: project.tenderNumber,
      deadline: project.deadline,
      notes: project.notes,
      mwst: project.calcParams.mwst,
    },
    positions: visible,
    summary: computeShareSummary(visibleFull, project.calcParams),
  };
}

export function snapshotHash(snapshot: ShareSnapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export type SnapshotDiff = {
  added: ShareSnapshot['positions'];
  removed: ShareSnapshot['positions'];
  changed: Array<{
    before: ShareSnapshot['positions'][number];
    after: ShareSnapshot['positions'][number];
    fields: string[];
  }>;
  unchanged: ShareSnapshot['positions'];
  oldTotalNetto: number;
  newTotalNetto: number;
  delta: number;
};

function totalNetto(s: ShareSnapshot): number {
  return s.positions.filter((p) => !p.isHeader).reduce((t, p) => t + p.gp, 0);
}

/** Compare two snapshots — used both before re-share (preview) and after
 *  (audit-log payload of snapshot.regenerated). Identity is by position.id. */
export function diffSnapshots(before: ShareSnapshot, after: ShareSnapshot): SnapshotDiff {
  const beforeById = new Map(before.positions.map((p) => [p.id, p]));
  const afterById = new Map(after.positions.map((p) => [p.id, p]));

  const added: ShareSnapshot['positions'] = [];
  const removed: ShareSnapshot['positions'] = [];
  const changed: SnapshotDiff['changed'] = [];
  const unchanged: ShareSnapshot['positions'] = [];

  for (const a of after.positions) {
    const b = beforeById.get(a.id);
    if (!b) {
      added.push(a);
      continue;
    }
    const diffFields: string[] = [];
    if (b.shortText !== a.shortText) diffFields.push('shortText');
    if (b.longText !== a.longText) diffFields.push('longText');
    if (b.quantity !== a.quantity) diffFields.push('quantity');
    if (b.unit !== a.unit) diffFields.push('unit');
    if (Math.abs(b.ep - a.ep) > 1e-6) diffFields.push('ep');
    if (Math.abs(b.gp - a.gp) > 1e-6) diffFields.push('gp');
    if (b.isHeader !== a.isHeader) diffFields.push('isHeader');
    if (diffFields.length > 0) changed.push({ before: b, after: a, fields: diffFields });
    else unchanged.push(a);
  }
  for (const b of before.positions) {
    if (!afterById.has(b.id)) removed.push(b);
  }

  const oldTotalNetto = totalNetto(before);
  const newTotalNetto = totalNetto(after);
  return {
    added,
    removed,
    changed,
    unchanged,
    oldTotalNetto,
    newTotalNetto,
    delta: newTotalNetto - oldTotalNetto,
  };
}

/**
 * Legacy fallback for share rows created before the snapshot column existed.
 * Builds a snapshot on-the-fly from the live project. Logs a warning so the
 * owner can re-share to lock prices. New shares always store a real snapshot.
 */
export function buildLegacySnapshot(
  project: { data: ProjectData; versionNumber: number },
  visibleIds: string[],
): ShareSnapshot {
  return buildShareSnapshot(
    {
      name: project.data.name,
      client: project.data.client,
      service: project.data.service,
      tenderNumber: project.data.tenderNumber,
      deadline: project.data.deadline,
      notes: project.data.notes,
      calcParams: project.data.calcParams,
    },
    project.data.positions || [],
    visibleIds,
    project.versionNumber,
  );
}
