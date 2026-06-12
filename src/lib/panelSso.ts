/**
 * Build a same-origin panel SSO-handoff URL that drops the logged-in panel user
 * onto the given preisanfrage path, already authenticated.
 *
 * `path` is an absolute preisanfrage path, query string included, e.g.
 * "/statistik?company=5". The panel route (GET /api/panel/sso/preisanfrage)
 * mints a one-time ticket and 302-redirects to preisanfrage; if SSO isn't
 * configured it falls back to the plain page (normal login).
 */
export function preisanfrageSsoHref(path: string): string {
  return `/api/panel/sso/preisanfrage?next=${encodeURIComponent(path)}`;
}
