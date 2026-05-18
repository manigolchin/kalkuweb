/**
 * Cross-tool handoff: when a user parses an LV in /tools/gaeb-konverter/,
 * they can push the positions to /tools/kalkulator/ to price them.
 *
 * Data lives in localStorage under a single key so the receiving tool can
 * pick it up on mount. The handoff is one-shot — the receiving tool consumes
 * the payload and clears it, so a normal reload does not re-import.
 */

const HANDOFF_KEY = 'kalku.handoff.kalkulator';

export type KalkulatorHandoffRow = {
  pos: string;
  text: string;
  einheit: string;
  menge: number;
  /** Optional pre-filled prices from the GAEB source (rare, e.g. priced X84 round-trip). */
  lohn?: number;
  zeit?: number;
  material?: number;
  zuschlag?: number;
};

export type KalkulatorHandoff = {
  source: 'gaeb-konverter';
  filename?: string;
  projectName?: string;
  positionCount: number;
  rows: KalkulatorHandoffRow[];
  /** Set when the handoff was written so receiver can ignore stale data (>5 min). */
  ts: number;
};

export function writeKalkulatorHandoff(payload: Omit<KalkulatorHandoff, 'ts'>): void {
  if (typeof window === 'undefined') return;
  try {
    const data: KalkulatorHandoff = { ...payload, ts: Date.now() };
    localStorage.setItem(HANDOFF_KEY, JSON.stringify(data));
  } catch {
    // quota / privacy mode — ignore
  }
}

export function readKalkulatorHandoff(): KalkulatorHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as KalkulatorHandoff;
    if (!data || !Array.isArray(data.rows) || data.rows.length === 0) return null;
    // Drop if older than 5 minutes — handoff should be immediate
    if (typeof data.ts === 'number' && Date.now() - data.ts > 5 * 60 * 1000) {
      localStorage.removeItem(HANDOFF_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearKalkulatorHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HANDOFF_KEY);
  } catch {
    // ignore
  }
}
