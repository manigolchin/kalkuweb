/**
 * Submissionskarte API — the cross-company geo-map of tenders for the panel.
 *
 * Wraps preisanfrage's `/api/submissionskarte/combined` (every project with a
 * geo-location across all firmas the service account can see). We use the
 * combined endpoint, not the per-company one, because it is NOT gated on the
 * per-company `submissionskarte_enabled` flag and the panel's admin service
 * account already sees every company — so new firmas show up without a flag flip.
 *
 * See:
 *   - lib/preisanfrage.ts (getSubmissionskarte — the upstream client)
 *   - routes/firmen.ts (per-project Submissionsergebnis drill-down)
 */

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import {
  getSubmissionskarte,
  isPreisanfrageEnabled,
  isPreisanfrageMock,
  PreisanfrageError,
} from '../lib/preisanfrage.js';

/** Translate PreisanfrageError into a clean panel HTTP response — upstream
 *  502/503 collapse to our 503 ("preisanfrage unreachable"), everything else
 *  to 502, non-Preisanfrage errors to 500. Mirrors firmen.ts. */
function handleUpstreamError(err: unknown): {
  status: 500 | 502 | 503;
  body: { error: string; upstreamStatus?: number; detail?: unknown };
} {
  if (err instanceof PreisanfrageError) {
    const status: 502 | 503 = err.status === 502 || err.status === 503 ? 503 : 502;
    return { status, body: { error: 'upstream_error', upstreamStatus: err.status, detail: err.body } };
  }
  return { status: 500, body: { error: 'internal', detail: String(err) } };
}

export const submissionskarteRoute = new Hono<{ Variables: AuthVariables }>()
  /** All pins for the tender-result map across every firma. */
  .get('/submissionskarte', requireAuth, async (c) => {
    if (!isPreisanfrageEnabled()) {
      return c.json({ error: 'integration_disabled' }, 503);
    }
    try {
      const data = await getSubmissionskarte();
      return c.json({
        ...data,
        isMock: isPreisanfrageMock(),
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  });
