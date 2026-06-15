import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import { signSsoTicket, ssoEnabled } from '../lib/auth.js';

const PREISANFRAGE_BASE = 'https://preisanfrage.kalkus.de';

/** Only allow same-site absolute paths as the post-login target — never a
 *  protocol-relative ("//evil") or scheme'd URL. Prevents an open-redirect. */
function safeNext(raw: string | null): string {
  if (!raw) return '/';
  let n = raw;
  try {
    n = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  if (!n.startsWith('/') || n.startsWith('//') || n.includes('\\')) return '/';
  return n;
}

/**
 * Single-sign-on handoff to the sister app at preisanfrage.kalkus.de.
 *
 * A logged-in panel user hitting GET /api/panel/sso/preisanfrage?next=<path>
 * gets a freshly-minted, 60-second, single-use ticket and is 302-redirected to
 * preisanfrage's /sso page (ticket in the URL fragment, so it never lands in an
 * access log). preisanfrage verifies the ticket and logs them into their linked
 * account. If SSO isn't configured (or the user has no email), we degrade
 * gracefully to the plain preisanfrage URL — i.e. its normal manual login.
 */
export const ssoRoute = new Hono<{ Variables: AuthVariables }>().get(
  '/preisanfrage',
  requireAuth,
  async (c) => {
    const next = safeNext(c.req.query('next') ?? null);
    const email = c.get('userEmail');

    if (!email || !ssoEnabled()) {
      return c.redirect(`${PREISANFRAGE_BASE}${next}`, 302);
    }

    const ticket = await signSsoTicket(email);
    const fragment = `t=${encodeURIComponent(ticket)}&next=${encodeURIComponent(next)}`;
    return c.redirect(`${PREISANFRAGE_BASE}/sso#${fragment}`, 302);
  },
);
