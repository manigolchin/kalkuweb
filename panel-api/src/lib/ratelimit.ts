import type { MiddlewareHandler } from 'hono';
import { clientIp } from './middleware.js';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60_000).unref();

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}): MiddlewareHandler {
  return async (c, next) => {
    const ip = clientIp(c);
    const key = `${opts.keyPrefix}:${ip}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else {
      b.count += 1;
      if (b.count > opts.max) {
        const retryAfter = Math.ceil((b.resetAt - now) / 1000);
        c.header('Retry-After', String(retryAfter));
        return c.json(
          { error: 'rate_limited', message: opts.message || 'too_many_requests', retryAfter },
          429,
        );
      }
    }
    await next();
  };
}

/**
 * PART J: hand-rolled rate limit for the share-password gate. The middleware
 * version above is keyed by IP-only and runs BEFORE route logic — we need
 * the key to include the share token (which is a path param) AND only count
 * FAILED unlock attempts, not successful ones. So we expose a primitive that
 * the route handler calls explicitly after computing success/failure.
 *
 * Returns { allowed, count, resetAt, retryAfter }. The route uses this to
 * decide between 401 (still in window, under limit), 429 (over limit), and
 * just incrementing the counter on a fresh failure.
 */
export function checkAndRecordFailure(
  scope: 'share-unlock',
  token: string,
  ip: string,
  opts: { windowMs: number; max: number },
): { allowed: boolean; count: number; resetAt: number; retryAfter: number } {
  const key = `${scope}:${token}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, count: 1, resetAt: now + opts.windowMs, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > opts.max) {
    return {
      allowed: false,
      count: b.count,
      resetAt: b.resetAt,
      retryAfter: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  return { allowed: true, count: b.count, resetAt: b.resetAt, retryAfter: 0 };
}

/** Resets the failure counter for a (scope, token, ip) tuple — call this on
 *  a successful unlock so a customer who eventually got the password right
 *  doesn't get locked out the next time they reload the page. */
export function resetFailureCounter(scope: 'share-unlock', token: string, ip: string): void {
  buckets.delete(`${scope}:${token}:${ip}`);
}
