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
