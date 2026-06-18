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
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import { db } from '../db.js';
import { posteingangState, posteingangSent, posteingangDraft } from '../schema.js';
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

/** Best-effort log of an email the panel just sent (for the "Gesendet" folder).
 *  A failure here must NEVER fail the actual send, so it swallows errors. */
async function recordSent(opts: {
  companyId: number;
  kind: 'reply' | 'compose' | 'forward';
  to: string;
  subject: string;
  body: string;
  inReplyToEmailId?: number | null;
  messageId?: string | null;
  sentBy?: string | null;
}): Promise<void> {
  if (!Number.isInteger(opts.companyId) || opts.companyId <= 0 || !opts.to) return;
  try {
    await db.insert(posteingangSent).values({
      id: nanoid(),
      companyId: opts.companyId,
      kind: opts.kind,
      toAddr: opts.to,
      subject: opts.subject || '',
      body: opts.body || '',
      inReplyToEmailId: opts.inReplyToEmailId ?? null,
      messageId: opts.messageId ?? null,
      sentBy: opts.sentBy ?? null,
      sentByName: '',
      sentAt: new Date(),
    });
  } catch (e) {
    console.warn('[posteingang] failed to record sent email:', e);
  }
}

/** Parse the labels JSON column → string[] (defensive against bad data). */
function parseLabels(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Sanitise an incoming labels array (trim, dedupe, cap). */
function cleanLabels(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const t = x.trim().slice(0, 40);
    if (t) seen.add(t);
  }
  return Array.from(seen).slice(0, 20);
}

/** Parse an incoming Cc/Bcc address array (trim, drop blanks, cap). */
function parseAddrs(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  return out.length ? out : undefined;
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
    const companyId = Number((raw as { company?: unknown }).company);
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
      const res = await replyToEmail(emailId, text, subject, parseAddrs((raw as { cc?: unknown }).cc), parseAddrs((raw as { bcc?: unknown }).bcc));
      if (!res.success) {
        return c.json({ error: 'send_failed', detail: res.error }, 502);
      }
      await recordSent({ companyId, kind: 'reply', to: res.to ?? '', subject: res.subject ?? '', body: text, inReplyToEmailId: emailId, messageId: res.messageId, sentBy: c.get('userId') });
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
      const res = await composeEmail(companyId, to, subject, text, parseAddrs((raw as { cc?: unknown }).cc), parseAddrs((raw as { bcc?: unknown }).bcc));
      if (!res.success) return c.json({ error: 'send_failed', detail: res.error }, 502);
      await recordSent({ companyId, kind: 'compose', to: res.to ?? to, subject: res.subject ?? subject, body: text, messageId: res.messageId, sentBy: c.get('userId') });
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
    const companyId = Number((raw as { company?: unknown }).company);
    const to = typeof (raw as { to?: unknown }).to === 'string' ? (raw as { to: string }).to.trim() : '';
    const note = typeof (raw as { note?: unknown }).note === 'string' ? (raw as { note: string }).note : undefined;
    if (!Number.isInteger(emailId) || emailId <= 0) return c.json({ error: 'invalid_email' }, 400);
    if (!to) return c.json({ error: 'missing_recipient' }, 400);
    if (!isPreisanfrageEnabled()) return c.json({ error: 'integration_disabled' }, 503);
    try {
      const res = await forwardEmail(emailId, to, note, parseAddrs((raw as { cc?: unknown }).cc), parseAddrs((raw as { bcc?: unknown }).bcc));
      if (!res.success) return c.json({ error: 'send_failed', detail: res.error }, 502);
      await recordSent({ companyId, kind: 'forward', to: res.to ?? to, subject: res.subject ?? '', body: note ?? '', inReplyToEmailId: emailId, messageId: res.messageId, sentBy: c.get('userId') });
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
    const state: Record<number, { read: boolean; starred: boolean; archived: boolean; deleted: boolean; labels: string[] }> = {};
    for (const r of rows) state[r.emailId] = { read: r.read, starred: r.starred, archived: r.archived, deleted: r.deleted, labels: parseLabels(r.labels) };
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
    const deleted = bool('deleted');
    const labels = cleanLabels((raw as { labels?: unknown }).labels);
    if (read === undefined && starred === undefined && archived === undefined && deleted === undefined && labels === undefined) {
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
        deleted: deleted ?? false,
        labels: labels !== undefined ? JSON.stringify(labels) : '[]',
        updatedBy: userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: posteingangState.emailId,
        set: {
          ...(read !== undefined ? { read } : {}),
          ...(starred !== undefined ? { starred } : {}),
          ...(archived !== undefined ? { archived } : {}),
          ...(deleted !== undefined ? { deleted } : {}),
          ...(labels !== undefined ? { labels: JSON.stringify(labels) } : {}),
          updatedBy: userId,
          updatedAt: now,
        },
      });
    const row = await db.query.posteingangState.findFirst({ where: eq(posteingangState.emailId, emailId) });
    return c.json({ ok: true, emailId, read: !!row?.read, starred: !!row?.starred, archived: !!row?.archived, deleted: !!row?.deleted, labels: parseLabels(row?.labels) });
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
    const deleted = bool('deleted');
    if (!ids.length || (read === undefined && archived === undefined && starred === undefined && deleted === undefined)) {
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
          deleted: deleted ?? false,
          updatedBy: userId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: posteingangState.emailId,
          set: {
            ...(read !== undefined ? { read } : {}),
            ...(starred !== undefined ? { starred } : {}),
            ...(archived !== undefined ? { archived } : {}),
            ...(deleted !== undefined ? { deleted } : {}),
            updatedBy: userId,
            updatedAt: now,
          },
        });
    }
    return c.json({ ok: true, updated: ids.length });
  })
  /** "Gesendet" folder — emails the panel sent for this company (newest first). */
  .get('/posteingang/sent', requireAuth, async (c) => {
    const companyId = Number(c.req.query('company'));
    if (!Number.isInteger(companyId) || companyId <= 0) return c.json({ error: 'invalid_company' }, 400);
    const rows = await db
      .select()
      .from(posteingangSent)
      .where(eq(posteingangSent.companyId, companyId))
      .orderBy(desc(posteingangSent.sentAt))
      .limit(200);
    const sent = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      to: r.toAddr,
      subject: r.subject,
      body: r.body,
      inReplyToEmailId: r.inReplyToEmailId,
      sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : new Date(r.sentAt as unknown as number).toISOString(),
    }));
    return c.json({ companyId, sent });
  })
  /** "Entwürfe" — list a company's drafts (newest first). */
  .get('/posteingang/drafts', requireAuth, async (c) => {
    const companyId = Number(c.req.query('company'));
    if (!Number.isInteger(companyId) || companyId <= 0) return c.json({ error: 'invalid_company' }, 400);
    const rows = await db
      .select()
      .from(posteingangDraft)
      .where(eq(posteingangDraft.companyId, companyId))
      .orderBy(desc(posteingangDraft.updatedAt))
      .limit(100);
    const drafts = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      to: r.toAddr,
      subject: r.subject,
      body: r.body,
      inReplyToEmailId: r.inReplyToEmailId,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : new Date(r.updatedAt as unknown as number).toISOString(),
    }));
    return c.json({ companyId, drafts });
  })
  /** Create or update a draft (upsert by id). */
  .post('/posteingang/drafts', requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const companyId = Number((raw as { company?: unknown }).company);
    if (!Number.isInteger(companyId) || companyId <= 0) return c.json({ error: 'invalid_company' }, 400);
    const kindRaw = (raw as { kind?: unknown }).kind;
    const kind: 'reply' | 'compose' | 'forward' = kindRaw === 'reply' || kindRaw === 'forward' ? kindRaw : 'compose';
    const str = (k: string) => (typeof (raw as Record<string, unknown>)[k] === 'string' ? ((raw as Record<string, string>)[k]) : '');
    const idRaw = (raw as { id?: unknown }).id;
    const id = typeof idRaw === 'string' && idRaw ? idRaw : nanoid();
    const irt = Number((raw as { inReplyToEmailId?: unknown }).inReplyToEmailId);
    const inReplyToEmailId = Number.isInteger(irt) && irt > 0 ? irt : null;
    if (!str('to').trim() && !str('subject').trim() && !str('body').trim()) {
      return c.json({ error: 'empty_draft' }, 400);
    }
    const userId = c.get('userId');
    const now = new Date();
    const values = { kind, toAddr: str('to'), subject: str('subject'), body: str('body'), inReplyToEmailId, updatedBy: userId, updatedAt: now };
    await db
      .insert(posteingangDraft)
      .values({ id, companyId, ...values })
      .onConflictDoUpdate({ target: posteingangDraft.id, set: values });
    return c.json({ ok: true, id });
  })
  /** Discard a draft. */
  .delete('/posteingang/drafts/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'invalid_id' }, 400);
    await db.delete(posteingangDraft).where(eq(posteingangDraft.id, id));
    return c.json({ ok: true });
  });
