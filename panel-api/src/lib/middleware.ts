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
  // Forced password change must be enforced on the SERVER, not just by the
  // React modal — otherwise a holder of a temporary, admin-issued (and
  // log-printed) password can drive every authenticated MUTATION via the API
  // without ever changing it (create/revoke customer share links, send real
  // supplier mail, etc.). Block all state-changing methods until the password
  // is changed; allow reads (so the forced-change screen + its data still load)
  // and the change-password/logout endpoints themselves.
  if (user.mustChangePassword) {
    const method = c.req.method.toUpperCase();
    const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    const path = c.req.path;
    // The SSO handoff (GET /api/panel/sso/...) is a side-effecting GET: it mints
    // a single-use cross-app login ticket and redirects into the linked
    // preisanfrage app already authenticated. A force-change user must NOT be
    // able to escalate out of the locked-down panel without changing their
    // temporary password, so treat it like a mutation. (Segment match so the
    // mount prefix is irrelevant.)
    const isSsoHandoff = path.includes('/sso/');
    // change-password is the one mutation a force-change user MUST reach to
    // recover. (logout never runs requireAuth, so it doesn't reach here.)
    const allowed = path.endsWith('/auth/change-password');
    if ((isMutation || isSsoHandoff) && !allowed) {
      return c.json({ error: 'password_change_required' }, 403);
    }
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
