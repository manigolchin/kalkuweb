/**
 * Request-ID correlation middleware.
 *
 * Reads the inbound `x-request-id` header (if present + sane), otherwise
 * mints a fresh nanoid(16). Stashes it on the Hono context under the
 * `requestId` key so handlers can include it in logs, and echoes it back
 * in the response header so clients + load balancers can correlate.
 *
 * Defensive sanitation:
 *   - Trims whitespace
 *   - Caps at 64 chars so clients can't blow up our log lines
 *   - Falls back to a generated id if the inbound value is empty/oversize
 *
 * This middleware should run BEFORE the route handlers (so handlers can
 * read `c.get('requestId')`) and BEFORE the logger (so the log line
 * includes the id). Wiring is in src/index.ts.
 */

import type { MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';

export type RequestIdVariables = { requestId: string };

const HEADER = 'x-request-id';
const MAX_LEN = 64;

function sanitize(raw: string | undefined | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_LEN) return null;
  // Restrict to a safe printable subset to keep log lines well-formed.
  // RFC 7230 token chars are wide; we go conservative: alphanumerics, dash,
  // underscore, dot. Anything else is treated as "client misbehaved" and
  // we generate a fresh id instead.
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function requestId(): MiddlewareHandler<{ Variables: RequestIdVariables }> {
  return async (c, next) => {
    const incoming = sanitize(c.req.header(HEADER));
    const id = incoming ?? nanoid(16);
    c.set('requestId', id);
    // Echo on the response so the client can correlate.
    c.header(HEADER, id);
    await next();
  };
}
