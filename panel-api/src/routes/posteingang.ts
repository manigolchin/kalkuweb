/**
 * Posteingang API — the panel's cross-company "Mother-Inbox".
 *
 * A READ-ONLY window onto preisanfrage's incoming-email system. preisanfrage
 * owns the IMAP polling, the Haiku classification and the SharePoint filing;
 * the panel only READS, via the admin service token (which sees every
 * company's inbox). This is the one place that shows ALL firmen's mailboxes
 * at once — preisanfrage's own Posteingang is one-company-at-a-time. Write
 * actions (save-to-SharePoint, re-classify) are NOT duplicated here; the UI
 * links out to preisanfrage for those (see prefer-linking-to-preisanfrage).
 *
 * Auth: panel cookie (requireAuth). Gated in the UI behind the `firmen`
 * permission — same domain as the Firmen directory.
 *
 * See lib/preisanfrage.ts (listInboxEmails) + src/pages/panel/Posteingang.tsx.
 */
import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import {
  listCompanies,
  listInboxEmails,
  pollInbox,
  isPreisanfrageEnabled,
  isPreisanfrageMock,
  PreisanfrageError,
  type PreisanfrageInboxStats,
} from '../lib/preisanfrage.js';

/** Translate a PreisanfrageError into a clean panel HTTP response (mirrors the
 *  helper in firmen.ts — kept local so this route owns its own error mapping
 *  and doesn't couple to the Firmen module). */
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

/** Hard cap on the overview fan-out. Managed companies (the ones with
 *  mailboxes) are few, but never let an unexpectedly long list turn one
 *  page-load into hundreds of upstream calls. If we hit it, `capped: true`
 *  tells the UI (no silent truncation). */
const MAX_MAILBOXES = 60;

type MailboxRow = {
  id: number;
  name: string;
  tradeType: string;
  total: number;
  stats: PreisanfrageInboxStats;
  /** Items a human should look at: unsaved offers + open questions + unclear. */
  needsAttention: number;
};

function emptyTotals() {
  return { total: 0, angebot: 0, rueckfrage: 0, absage: 0, unklar: 0, nichtGespeichert: 0, needsAttention: 0 };
}

export const posteingangRoute = new Hono<{ Variables: AuthVariables }>()
  /** Left-rail data: every managed company that has inbox activity, with its
   *  tallies. Fans out one cheap stats call per company (cached 60 s upstream),
   *  skipping any with posteingang disabled (403) or that error. */
  .get('/posteingang/overview', requireAuth, async (c) => {
    if (!isPreisanfrageEnabled()) {
      return c.json({ enabled: false, mock: false, capped: false, companies: [], totals: emptyTotals() });
    }
    try {
      const companies = await listCompanies();
      const capped = companies.length > MAX_MAILBOXES;
      const slice = companies.slice(0, MAX_MAILBOXES);
      const settled = await Promise.allSettled(
        slice.map(async (co) => ({ co, page: await listInboxEmails(co.id, { limit: 1 }) })),
      );
      const rows: MailboxRow[] = [];
      for (const r of settled) {
        if (r.status !== 'fulfilled') continue; // posteingang disabled (403) / upstream error → skip
        const { co, page } = r.value;
        if (page.total <= 0) continue; // only surface mailboxes with activity
        const s = page.stats;
        rows.push({
          id: co.id,
          name: co.name,
          tradeType: co.tradeType,
          total: page.total,
          stats: s,
          needsAttention: s.nichtGespeichert + s.rueckfrage + s.unklar,
        });
      }
      rows.sort(
        (a, b) => b.needsAttention - a.needsAttention || b.total - a.total || a.name.localeCompare(b.name),
      );
      const totals = rows.reduce((acc, r) => {
        acc.total += r.total;
        acc.angebot += r.stats.angebot;
        acc.rueckfrage += r.stats.rueckfrage;
        acc.absage += r.stats.absage;
        acc.unklar += r.stats.unklar;
        acc.nichtGespeichert += r.stats.nichtGespeichert;
        acc.needsAttention += r.needsAttention;
        return acc;
      }, emptyTotals());
      return c.json({ enabled: true, mock: isPreisanfrageMock(), capped, companies: rows, totals });
    } catch (err) {
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  })
  /** Middle + right pane: one company's emails. preisanfrage's list endpoint
   *  already returns full records (body_text + attachments), so this single
   *  call feeds both the list and the reading pane. */
  .get('/posteingang/emails', requireAuth, async (c) => {
    const companyId = Number(c.req.query('company'));
    if (!Number.isInteger(companyId) || companyId <= 0) {
      return c.json({ error: 'invalid_company' }, 400);
    }
    if (!isPreisanfrageEnabled()) {
      return c.json({ error: 'integration_disabled' }, 503);
    }
    const classification = c.req.query('classification') || undefined;
    const status = c.req.query('status') || undefined;
    const limit = Number(c.req.query('limit')) || 100;
    try {
      const page = await listInboxEmails(companyId, { classification, status, limit });
      return c.json({ companyId, ...page });
    } catch (err) {
      if (err instanceof PreisanfrageError && err.status === 403) {
        // posteingang disabled for this company upstream → explicit, not a 5xx.
        return c.json({ error: 'posteingang_disabled', companyId }, 403);
      }
      const { status, body } = handleUpstreamError(err);
      return c.json(body, status);
    }
  })
  /** On-demand poll: trigger preisanfrage to IMAP-fetch + classify NOW, so a
   *  user doesn't wait for the hourly auto-poll. Slow (IMAP + AI) — preisanfrage
   *  client gives it a long timeout; this proxy just forwards + invalidates the
   *  read cache (done inside pollInbox). */
  .post('/posteingang/poll', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const companyId = Number((body as { company?: unknown }).company);
    if (!Number.isInteger(companyId) || companyId <= 0) {
      return c.json({ error: 'invalid_company' }, 400);
    }
    if (!isPreisanfrageEnabled()) {
      return c.json({ error: 'integration_disabled' }, 503);
    }
    try {
      const result = await pollInbox(companyId);
      return c.json({ companyId, ...result });
    } catch (err) {
      if (err instanceof PreisanfrageError && err.status === 403) {
        return c.json({ error: 'posteingang_disabled', companyId }, 403);
      }
      if (err instanceof PreisanfrageError && err.status === 400) {
        // preisanfrage: "IMAP/SMTP nicht konfiguriert" for this company.
        return c.json({ error: 'smtp_not_configured', companyId }, 400);
      }
      const { status, body: errBody } = handleUpstreamError(err);
      return c.json(errBody, status);
    }
  });
