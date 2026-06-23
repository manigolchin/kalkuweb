import type { Position, ProjectData } from './types';

/**
 * Three-way merge for Live-Zusammenarbeit — lets two people edit one calc at
 * once without the "please reload" wall that loses work (boss request
 * 2026-06-23, "kein Datenverlust").
 *
 * Inputs:
 *   - `base`   — the server state this tab last saw (its last successful save).
 *   - `mine`   — this tab's current local data (its unsaved edits).
 *   - `theirs` — the latest server data (a coworker saved in the meantime).
 *
 * Resolution rules (deliberately simple + predictable, NOT char-level CRDT):
 *   - Positions merge at ROW granularity, keyed by `id`. If a coworker and I
 *     edit DIFFERENT rows, both survive. If we edit the SAME row, the tab that
 *     saves last wins that row (last-write-wins) — never a silent total loss.
 *   - A row I deleted stays deleted UNLESS the coworker concurrently edited it
 *     (then their edit is kept — losing an edit is worse than keeping a row).
 *   - Rows I newly added are appended; rows the coworker added are kept.
 *   - Every other field (incl. `calcParams` and nested objects) is whole-value
 *     last-write-wins: if I changed it from base, mine wins; else theirs.
 *
 * The server re-derives EP/GP on save, so the merge never has to be numerically
 * exact — it only has to preserve each editor's intent.
 */

function canon(v: unknown): string {
  return JSON.stringify(v ?? null);
}

function changed(a: unknown, b: unknown): boolean {
  return canon(a) !== canon(b);
}

function indexById(positions: Position[]): Map<string, Position> {
  const m = new Map<string, Position>();
  for (const p of positions) m.set(p.id, p);
  return m;
}

/** Row-level three-way merge of the positions array. Server order is canonical. */
export function mergePositions(
  base: Position[],
  mine: Position[],
  theirs: Position[],
): Position[] {
  const baseById = indexById(base);
  const mineById = indexById(mine);
  const result: Position[] = [];
  const placed = new Set<string>();

  // Walk the server's positions (canonical order). For each, decide who wins.
  for (const tp of theirs) {
    placed.add(tp.id);
    const mp = mineById.get(tp.id);
    const bp = baseById.get(tp.id);
    if (mp) {
      // In both versions → my edit wins if I touched it, else take theirs.
      result.push(changed(mp, bp) ? mp : tp);
    } else if (bp) {
      // I deleted it. Keep the server copy only if they concurrently edited it.
      if (changed(tp, bp)) result.push(tp);
      // else: drop — my delete wins.
    } else {
      // Brand-new row from the coworker.
      result.push(tp);
    }
  }

  // Append my rows the server doesn't have.
  for (const mp of mine) {
    if (placed.has(mp.id)) continue;
    const bp = baseById.get(mp.id);
    if (!bp) {
      // A row I created → keep it.
      result.push(mp);
    } else if (changed(mp, bp)) {
      // Existed in base, deleted on the server, but I edited it → resurrect my
      // edit rather than lose the work.
      result.push(mp);
    }
    // else: existed in base, server deleted it, I didn't touch it → respect delete.
  }

  return result;
}

/** Field-level three-way merge of a flat record (the global Stellschrauben).
 *  Same rule as rows: my field wins if I changed it, else theirs. Lets two
 *  estimators tweak DIFFERENT calcParams (e.g. Mittellohn vs Material-Zuschlag)
 *  at once without one silently reverting the other. */
function mergeRecord<T extends Record<string, unknown>>(
  base: T | undefined,
  mine: T | undefined,
  theirs: T | undefined,
): T {
  const b = base ?? ({} as T);
  const m = mine ?? ({} as T);
  const t = theirs ?? ({} as T);
  const out: Record<string, unknown> = {};
  const keys = new Set<string>([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]);
  for (const k of keys) {
    out[k] = changed(m[k], b[k]) ? m[k] : t[k];
  }
  return out as T;
}

/** Three-way merge of a whole ProjectData. See module doc for the rules. */
export function mergeProjectData(
  base: ProjectData,
  mine: ProjectData,
  theirs: ProjectData,
): ProjectData {
  const result: Record<string, unknown> = {};
  const keys = new Set<string>([
    ...Object.keys(base),
    ...Object.keys(mine),
    ...Object.keys(theirs),
  ]);
  for (const key of keys) {
    // positions (row-level) and calcParams (field-level) are merged below.
    if (key === 'positions' || key === 'calcParams') continue;
    const b = (base as Record<string, unknown>)[key];
    const m = (mine as Record<string, unknown>)[key];
    const t = (theirs as Record<string, unknown>)[key];
    // Whole-value last-write-wins: my change wins if I made one, else theirs.
    result[key] = changed(m, b) ? m : t;
  }
  result.positions = mergePositions(
    base.positions ?? [],
    mine.positions ?? [],
    theirs.positions ?? [],
  );
  // calcParams drives EP/GP for every position — merge it field-by-field so a
  // coworker's concurrent Stellschraube change isn't silently dropped.
  result.calcParams = mergeRecord(
    base.calcParams as unknown as Record<string, unknown>,
    mine.calcParams as unknown as Record<string, unknown>,
    theirs.calcParams as unknown as Record<string, unknown>,
  );
  return result as unknown as ProjectData;
}
