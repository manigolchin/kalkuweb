import { Hono } from 'hono';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { auditEvents, projects, shares, users, type AuditEvent } from '../schema.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';
import { sendMail, mailerStatus } from '../lib/mailer.js';

/**
 * Owner-facing notifications:
 *  - GET /api/panel/notifications/unread  → count of customer-side events the
 *    owner hasn't seen yet (drives the nav badge)
 *  - POST /api/panel/notifications/mark-viewed → bumps users.lastFeedbackViewedAt
 *  - POST /api/panel/digest/run → cron entry point (token-gated). Computes
 *    yesterday's events per owner, sends a summary email via nodemailer.
 *
 * No customer-side data is ever emailed FROM here — owner-only, Art 6(1)(f).
 */

const CUSTOMER_EVENT_TYPES: AuditEvent['eventType'][] = ['link.viewed', 'response.submitted'];

async function countUnread(userId: string): Promise<number> {
  // Owner-scoped events: join via shares/projects to filter to this owner's
  // events only, then filter by event_type ∈ customer-side events and timestamp.
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return 0;
  const since = user.lastFeedbackViewedAt?.getTime() ?? 0;
  const ownerProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, userId));
  if (ownerProjects.length === 0) return 0;
  const projectIds = ownerProjects.map((p) => p.id);
  const ownerShares = await db
    .select({ id: shares.id })
    .from(shares)
    .where(inArray(shares.projectId, projectIds));
  if (ownerShares.length === 0) return 0;
  const shareIds = ownerShares.map((s) => s.id);

  const rows = await db
    .select({ c: sql<number>`count(*)`.as('c') })
    .from(auditEvents)
    .where(
      and(
        inArray(auditEvents.shareId, shareIds),
        inArray(auditEvents.eventType, CUSTOMER_EVENT_TYPES),
        gte(auditEvents.createdAt, new Date(since)),
      ),
    );
  return rows[0]?.c || 0;
}

export const notificationsRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/notifications/unread', requireAuth, async (c) => {
    const userId = c.get('userId');
    const count = await countUnread(userId);
    return c.json({ count });
  })

  .post('/notifications/mark-viewed', requireAuth, async (c) => {
    const userId = c.get('userId');
    await db.update(users).set({ lastFeedbackViewedAt: new Date() }).where(eq(users.id, userId));
    return c.json({ ok: true });
  });

/**
 * Cron-style digest. Protected by a shared secret in the body or header so
 * external schedulers (host cron, systemd timer, GitHub Actions) can trigger
 * it without a session cookie.
 *
 * For each user with events in the last 24h that they haven't been digested
 * for yet, sends a summary email and bumps lastDigestSentAt.
 */
export const digestRoute = new Hono().post('/digest/run', async (c) => {
  const expected = process.env.DIGEST_SECRET;
  const provided = c.req.header('x-digest-secret') || (await c.req.json().catch(() => ({})))?.secret;
  if (!expected) return c.json({ error: 'digest_not_configured' }, 503);
  if (provided !== expected) return c.json({ error: 'forbidden' }, 403);

  const status = mailerStatus();
  if (status === 'not_configured') {
    return c.json({ error: 'smtp_not_configured', skipped: true }, 503);
  }

  const allUsers = await db.select().from(users);
  const results: Array<{ userId: string; email: string; events: number; sent: boolean; reason?: string }> = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const user of allUsers) {
    const ownerProjects = await db
      .select({ id: projects.id, data: projects.data })
      .from(projects)
      .where(eq(projects.ownerId, user.id));
    if (ownerProjects.length === 0) {
      results.push({ userId: user.id, email: user.email, events: 0, sent: false, reason: 'no_projects' });
      continue;
    }

    const projectIds = ownerProjects.map((p) => p.id);
    const ownerShares = await db
      .select({ id: shares.id, token: shares.token, projectId: shares.projectId, settings: shares.settings })
      .from(shares)
      .where(inArray(shares.projectId, projectIds));
    if (ownerShares.length === 0) {
      results.push({ userId: user.id, email: user.email, events: 0, sent: false, reason: 'no_shares' });
      continue;
    }
    const shareIds = ownerShares.map((s) => s.id);

    const since = user.lastDigestSentAt && user.lastDigestSentAt.getTime() > oneDayAgo.getTime()
      ? user.lastDigestSentAt
      : oneDayAgo;

    const events = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          inArray(auditEvents.shareId, shareIds),
          inArray(auditEvents.eventType, CUSTOMER_EVENT_TYPES),
          gte(auditEvents.createdAt, since),
        ),
      )
      .orderBy(desc(auditEvents.createdAt));

    if (events.length === 0) {
      results.push({ userId: user.id, email: user.email, events: 0, sent: false, reason: 'no_events' });
      continue;
    }

    const projectById = new Map(ownerProjects.map((p) => [p.id, p]));
    const shareById = new Map(ownerShares.map((s) => [s.id, s]));

    // Group events by share for readable lines
    const byShare = new Map<string, typeof events>();
    for (const e of events) {
      if (!e.shareId) continue;
      const arr = byShare.get(e.shareId) || [];
      arr.push(e);
      byShare.set(e.shareId, arr);
    }

    const lines: string[] = [
      `Guten Morgen ${user.name || user.email.split('@')[0]},`,
      '',
      `seit ${since.toLocaleString('de-DE')} gab es ${events.length} Kundenaktivitäten in Ihren geteilten Angeboten:`,
      '',
    ];
    for (const [shareId, evs] of byShare) {
      const sh = shareById.get(shareId);
      const proj = sh ? projectById.get(sh.projectId) : undefined;
      const name = proj?.data?.name || 'Unbenanntes Projekt';
      const views = evs.filter((e) => e.eventType === 'link.viewed').length;
      const approves = evs.filter((e) => e.eventType === 'response.submitted' && (e.payload as { responseType?: string })?.responseType === 'approve').length;
      const changes = evs.filter((e) => e.eventType === 'response.submitted' && (e.payload as { responseType?: string })?.responseType === 'changes').length;
      const partsBits: string[] = [];
      if (approves > 0) partsBits.push(`${approves}× Annahme`);
      if (changes > 0) partsBits.push(`${changes}× Änderungswunsch`);
      if (views > 0) partsBits.push(`${views}× geöffnet`);
      lines.push(`• ${name} — ${partsBits.join(', ')}`);
      if (sh) lines.push(`    https://kalku.de/share/${sh.token}`);
    }
    lines.push('');
    lines.push('Details und Antworten im Panel: https://kalku.de/panel/feedback');

    const to = user.companyContactEmail || user.email;
    const result = await sendMail({
      to,
      subject: `KALKU Tagesübersicht — ${events.length} neue Aktivität${events.length === 1 ? '' : 'en'}`,
      text: lines.join('\n'),
    });

    if (result.ok) {
      await db.update(users).set({ lastDigestSentAt: new Date() }).where(eq(users.id, user.id));
      results.push({ userId: user.id, email: to, events: events.length, sent: true });
    } else {
      results.push({ userId: user.id, email: to, events: events.length, sent: false, reason: result.reason });
    }
  }

  return c.json({ ok: true, ran: results });
});
