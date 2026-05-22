/**
 * OWASP-baseline security headers applied to EVERY panel-api response.
 *
 * panel-api serves JSON only — the SPA's HTML + CSP are nginx's job. So this
 * middleware focuses on the headers that ALSO matter for JSON APIs:
 *
 *   - X-Content-Type-Options: nosniff
 *       Stops content-type sniffing on responses we explicitly mark application/json.
 *
 *   - X-Frame-Options: DENY
 *       Defense in depth for any future HTML preview endpoint.
 *
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *       Limits cross-origin leakage of share tokens via Referer.
 *
 *   - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *       No browser-API access from the API origin (panel-api never needs these).
 *
 *   - Strict-Transport-Security: only when we're confident we're behind HTTPS.
 *       Set when NODE_ENV=production OR the proxy reports x-forwarded-proto=https.
 *       Setting HSTS on a plain-HTTP dev box would pin localhost to https for a year.
 *
 * CSP is intentionally NOT set here. CSP for the API would gain us nothing
 * (no scripts execute on JSON), and CSP for the SPA is the nginx layer's job.
 */

import type { MiddlewareHandler } from 'hono';

const STATIC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

const HSTS_VALUE = 'max-age=31536000; includeSubDomains; preload';

function isOverHttps(c: Parameters<MiddlewareHandler>[0]): boolean {
  // Trust NODE_ENV first — production is always HTTPS in our deployment.
  if (process.env.NODE_ENV === 'production') return true;
  // Otherwise look for the proxy-injected forwarded-proto header.
  const proto = c.req.header('x-forwarded-proto');
  return typeof proto === 'string' && proto.split(',')[0].trim().toLowerCase() === 'https';
}

export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    // Apply after the handler so the values stick even on error responses.
    for (const [name, value] of Object.entries(STATIC_HEADERS)) {
      c.header(name, value);
    }
    if (isOverHttps(c)) {
      c.header('Strict-Transport-Security', HSTS_VALUE);
    }
  };
}
