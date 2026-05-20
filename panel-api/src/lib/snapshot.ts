import { createHash } from 'node:crypto';
import type { CalcParams, Position, ProjectData, ShareSnapshot } from '../schema.js';

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function recomputePosition(p: Position, params: CalcParams): Position {
  if (p.isHeader) {
    return { ...p, epLohn: 0, epMaterial: 0, epGeraet: 0, epNu: 0, ep: 0, gp: 0 };
  }
  const adj = p.timeMinutes + (p.timeMinutes / 100) * params.zeitabzug;
  const epGeraet = (adj / 60) * params.geraeteStundensatz;
  const epLohn = (adj / 60) * params.verrechnungslohn;
  const epMaterial = p.materialCost * (1 + params.materialZuschlag);
  const epNu = p.nuCost * (1 + params.nuZuschlag);
  const ep = epLohn + epMaterial + epGeraet + epNu;
  const gp = p.quantity * ep;
  return {
    ...p,
    epLohn: round(epLohn),
    epMaterial: round(epMaterial),
    epGeraet: round(epGeraet),
    epNu: round(epNu),
    ep: round(ep),
    gp: round(gp),
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
  const recomputed = recomputePositions(positions, project.calcParams);
  const visible = recomputed
    .filter((p) => ids.has(p.id))
    .map((p) => ({
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
    }));
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
