import type { Row, Aufschlaege } from './types';

type Snapshot = {
  v: 1;
  rows: Row[];
  a: Aufschlaege;
};

/** Base64URL-Encoding ohne externe Lib — funktioniert auch in Server-Side-Rendering. */
function toBase64Url(s: string): string {
  const b64 = typeof window === 'undefined'
    ? Buffer.from(s, 'utf-8').toString('base64')
    : window.btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (s.length % 4)) % 4);
  if (typeof window === 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(window.atob(b64)));
}

export function encodeShare(rows: Row[], a: Aufschlaege): string {
  const snap: Snapshot = { v: 1, rows, a };
  return toBase64Url(JSON.stringify(snap));
}

export function decodeShare(hash: string): Snapshot | undefined {
  try {
    const raw = fromBase64Url(hash);
    const parsed = JSON.parse(raw);
    if (parsed?.v === 1 && Array.isArray(parsed.rows) && parsed.a) {
      return parsed as Snapshot;
    }
  } catch {
    /* invalid hash */
  }
  return undefined;
}

export function buildShareUrl(rows: Row[], a: Aufschlaege): string {
  const hash = encodeShare(rows, a);
  if (typeof window === 'undefined') return `#k=${hash}`;
  const u = new URL(window.location.href);
  u.hash = `k=${hash}`;
  return u.toString();
}

/** Liest beim Mount einen evtl. vorhandenen Hash-Snapshot aus der URL. */
export function readHashSnapshot(): Snapshot | undefined {
  if (typeof window === 'undefined') return undefined;
  const m = window.location.hash.match(/^#k=(.+)$/);
  if (!m) return undefined;
  return decodeShare(m[1]);
}
