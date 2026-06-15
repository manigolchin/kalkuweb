import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { db } from '../db.js';
import { users, type UserRole } from '../schema.js';
import { eq } from 'drizzle-orm';
import { COOKIE_NAME, verifyToken } from './auth.js';

export type AuthVariables = {
  userId: string;
  userEmail: string;
  userRole: UserRole;
};

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!user) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  // Soft-deactivated accounts keep a valid session cookie until it expires —
  // reject them here so deactivation takes effect immediately on the next call.
  if (!user.isActive) {
    return c.json({ error: 'account_disabled' }, 403);
  }
  c.set('userId', user.id);
  c.set('userEmail', user.email);
  c.set('userRole', user.role);
  await next();
};

/**
 * Gate for admin-only endpoints. MUST run after requireAuth (it reads the
 * userRole set there). Returns 403 for non-admins.
 */
export const requireAdmin: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  if (c.get('userRole') !== 'admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
};

export function clientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return c.req.header('x-real-ip') || 'unknown';
}

/**
 * Stable non-PII fingerprint hash of the request's browser context.
 * SHA-256 of (UA + Accept-Language + Accept) — doesn't reveal the raw values
 * but lets the audit log distinguish "same browser, different network" from
 * "different person entirely". Audit-trail research D8.
 */
import { createHash } from 'node:crypto';
export function clientFingerprint(c: Context): string {
  const ua = c.req.header('user-agent') || '';
  const al = c.req.header('accept-language') || '';
  const ac = c.req.header('accept') || '';
  return createHash('sha256').update(`${ua}\n${al}\n${ac}`).digest('hex').slice(0, 16);
}
