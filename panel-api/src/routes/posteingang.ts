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
import { eq } from 'drizzle-orm';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import { db } from '../db.js';
import { posteingangState } from '../schema.js';
import {
  listCompanies,
  listInboxEmails,
  pollInbox,
  replyToEmail,
  composeEmail,
  forwardEmail,
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
  })
  /** Send a plain-text reply to an incoming email, THROUGH preisanfrage (which
   *  holds the SMTP credentials — the panel never does). Needs the preisanfrage
   *  reply endpoint deployed; until then upstream 404s → surfaced as 502. */
  .post('/posteingang/reply', requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const emailId = Number((raw as { emailId?: unknown }).emailId);
    const text = typeof (raw as { body?: unknown }).body === 'string' ? ((raw as { body: string }).body) : '';
    const subjRaw = (raw as { subject?: unknown }).subject;
    const subject = typeof subjRaw === 'string' && subjRaw.trim() ? subjRaw.trim() : undefined;
    if (!Number.isInteger(emailId) || emailId <= 0) {
      return c.json({ error: 'invalid_email' }, 400);
    }
    if (!text.trim()) {
      return c.json({ error: 'empty_body' }, 400);
    }
    if (!isPreisanfrageEnabled()) {
      return c.json({ error: 'integration_disabled' }, 503);
    }
    try {
      const res = await replyToEmail(emailId, text, subject);
      if (!res.success) {
        return c.json({ error: 'send_failed', detail: res.error }, 502);
      }
      return c.json({ ok: true, to: res.to, subject: res.subject, messageId: res.messageId });
    } catch (err) {
      if (err instanceof PreisanfrageError && err.status === 403) {
        return c.json({ error: 'posteingang_disabled' }, 403);
      }
      if (err instanceof PreisanfrageError && err.status === 400) {
        return c.json({ error: 'cannot_reply' }, 400);
      }
      if (err instanceof PreisanfrageError && err.status === 404) {
        // reply endpoint not deployed on preisanfrage yet
        return c.json({ error: 'reply_unavailable' }, 502);
      }
      const { status, body: errBody } = handleUpstreamError(err);
      return c.json(errBody, status);
    }
  })
  /** Compose + send a brand-new email from a company address (via preisanfrage). */
  .post('/posteingang/compose', requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const companyId = Number((raw as { company?: unknown }).company);
    const to = typeof (raw as { to?: unknown }).to === 'string' ? (raw as { to: string }).to.trim() : '';
    const subject = typeof (raw as { subject?: unknown }).subject === 'string' ? (raw as { subject: string }).subject : '';
    const text = typeof (raw as { body?: unknown }).body === 'string' ? (raw as { body: string }).body : '';
    if (!Number.isInteger(companyId) || companyId <= 0) return c.json({ error: 'invalid_company' }, 400);
    if (!to) return c.json({ error: 'missing_recipient' }, 400);
    if (!text.trim()) return c.json({ error: 'empty_body' }, 400);
    if (!isPreisanfrageEnabled()) return c.json({ error: 'integration_disabled' }, 503);
    try {
      const res = await composeEmail(companyId, to, subject, text);
      if (!res.success) return c.json({ error: 'send_failed', detail: res.error }, 502);
      return c.json({ ok: true, to: res.to, subject: res.subject, messageId: res.messageId });
    } catch (err) {
      if (err instanceof PreisanfrageError && err.status === 403) return c.json({ error: 'posteingang_disabled' }, 403);
      if (err instanceof PreisanfrageError && err.status === 400) return c.json({ error: 'cannot_send' }, 400);
      if (err instanceof PreisanfrageError && err.status === 404) return c.json({ error: 'compose_unavailable' }, 502);
      const { status, body: errBody } = handleUpstreamError(err);
      return c.json(errBody, status);
    }
  })
  /** Forward an incoming email (quoted + attachments) to a new recipient. */
  .post('/posteingang/forward', requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const emailId = Number((raw as { emailId?: unknown }).emailId);
    const to = typeof (raw as { to?: unknown }).to === 'string' ? (raw as { to: string }).to.trim() : '';
    const note = typeof (raw as { note?: unknown }).note === 'string' ? (raw as { note: string }).note : undefined;
    if (!Number.isInteger(emailId) || emailId <= 0) return c.json({ error: 'invalid_email' }, 400);
    if (!to) return c.json({ error: 'missing_recipient' }, 400);
    if (!isPreisanfrageEnabled()) return c.json({ error: 'integration_disabled' }, 503);
    try {
      const res = await forwardEmail(emailId, to, note);
      if (!res.success) return c.json({ error: 'send_failed', detail: res.error }, 502);
      return c.json({ ok: true, to: res.to, subject: res.subject, messageId: res.messageId });
    } catch (err) {
      if (err instanceof PreisanfrageError && err.status === 403) return c.json({ error: 'posteingang_disabled' }, 403);
      if (err instanceof PreisanfrageError && err.status === 404) return c.json({ error: 'forward_unavailable' }, 502);
      const { status, body: errBody } = handleUpstreamError(err);
      return c.json(errBody, status);
    }
  })
  /** Triage state (read/starred/archived) for a company's emails — panel-local,
   *  SHARED across the team. The mailbox is NEVER touched, so preisanfrage's
   *  classification/polling is unaffected. */
  .get('/posteingang/state', requireAuth, async (c) => {
    const companyId = Number(c.req.query('company'));
    if (!Number.isInteger(companyId) || companyId <= 0) return c.json({ error: 'invalid_company' }, 400);
    const rows = await db.select().from(posteingangState).where(eq(posteingangState.companyId, companyId));
    const state: Record<number, { read: boolean; starred: boolean; archived: boolean }> = {};
    for (const r of rows) state[r.emailId] = { read: r.read, starred: r.starred, archived: r.archived };
    return c.json({ companyId, state });
  })
  /** Toggle read/starred/archived for ONE email (upsert). */
  .post('/posteingang/state/:emailId', requireAuth, async (c) => {
    const emailId = Number(c.req.param('emailId'));
    if (!Number.isInteger(emailId) || emailId <= 0) return c.json({ error: 'invalid_email' }, 400);
    const raw = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const companyId = Number((raw as { company?: unknown }).company);
    if (!Number.isInteger(companyId) || companyId <= 0) return c.json({ error: 'invalid_company' }, 400);
    const bool = (k: string): boolean | undefined =>
      typeof (raw as Record<string, unknown>)[k] === 'boolean' ? ((raw as Record<string, boolean>)[k]) : undefined;
    const read = bool('read');
    const starred = bool('starred');
    const archived = bool('archived');
    if (read === undefined && starred === undefined && archived === undefined) {
      return c.json({ error: 'no_change' }, 400);
    }
    const userId = c.get('userId');
    const now = new Date();
    await db
      .insert(posteingangState)
      .values({
        emailId,
        companyId,
        read: read ?? false,
        starred: starred ?? false,
        archived: archived ?? false,
        updatedBy: userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: posteingangState.emailId,
        set: {
          ...(read !== undefined ? { read } : {}),
          ...(starred !== undefined ? { starred } : {}),
          ...(archived !== undefined ? { archived } : {}),
          updatedBy: userId,
          updatedAt: now,
        },
      });
    const row = await db.query.posteingangState.findFirst({ where: eq(posteingangState.emailId, emailId) });
    return c.json({ ok: true, emailId, read: !!row?.read, starred: !!row?.starred, archived: !!row?.archived });
  })
  /** Bulk-set one flag on many emails (e.g. "alle als gelesen markieren"). */
  .post('/posteingang/state-bulk', requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const companyId = Number((raw as { company?: unknown }).company);
    if (!Number.isInteger(companyId) || companyId <= 0) return c.json({ error: 'invalid_company' }, 400);
    const idsRaw = (raw as { emailIds?: unknown }).emailIds;
    const ids = Array.isArray(idsRaw)
      ? idsRaw.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 1000)
      : [];
    const bool = (k: string): boolean | undefined =>
      typeof (raw as Record<string, unknown>)[k] === 'boolean' ? ((raw as Record<string, boolean>)[k]) : undefined;
    const read = bool('read');
    const archived = bool('archived');
    const starred = bool('starred');
    if (!ids.length || (read === undefined && archived === undefined && starred === undefined)) {
      return c.json({ ok: true, updated: 0 });
    }
    const userId = c.get('userId');
    const now = new Date();
    for (const emailId of ids) {
      await db
        .insert(posteingangState)
        .values({
          emailId,
          companyId,
          read: read ?? false,
          starred: starred ?? false,
          archived: archived ?? false,
          updatedBy: userId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: posteingangState.emailId,
          set: {
            ...(read !== undefined ? { read } : {}),
            ...(starred !== undefined ? { starred } : {}),
            ...(archived !== undefined ? { archived } : {}),
            updatedBy: userId,
            updatedAt: now,
          },
        });
    }
    return c.json({ ok: true, updated: ids.length });
  });
