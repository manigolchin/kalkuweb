import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { verify as argon2Verify } from '@node-rs/argon2';
import { db } from '../db.js';
import {
  projects,
  shares,
  shareResponses,
  users,
  auditEvents,
  shareAccessLog,
  positionComments,
  changeRequests,
  CHANGE_REQUEST_FIELDS,
  type ChangeRequestField,
  type ChangeRequestScope,
  type ChangeRequestUnit,
  type ShareSnapshot,
  type ShareSettings,
} from '../schema.js';
import { clientIp, clientFingerprint } from '../lib/middleware.js';
import { buildLegacySnapshot, snapshotHash } from '../lib/snapshot.js';
import { recordAuditEvent } from '../lib/audit.js';
import { renderQuotePdf, renderCertificatePdf } from '../lib/pdf.js';
import { sendMail } from '../lib/mailer.js';
import { checkAndRecordFailure, resetFailureCounter } from '../lib/ratelimit.js';

// PART J: rate-limit window for failed unlock attempts. Spec: 5 per (token, ip)
// per 15 minutes → 429 with Retry-After.
const UNLOCK_RATELIMIT = { windowMs: 15 * 60 * 1000, max: 5 };

async function logAccess(
  shareId: string,
  ip: string | undefined,
  success: boolean,
  reason: string,
  userAgent: string | undefined,
): Promise<void> {
  try {
    await db.insert(shareAccessLog).values({
      id: nanoid(16),
      shareId,
      ip: ip ?? null,
      success,
      reason,
      userAgent: userAgent ?? null,
      ts: new Date(),
    });
  } catch (err) {
    // Don't fail the request if logging fails.
    console.warn(`[share-access-log] insert failed: ${(err as Error).message}`);
  }
}

/**
 * Shared gate helper used by both `GET /share/:token` and any
 * write endpoint that addresses a share via its token (PART K's
 * comment POST). Returns either:
 *   - { share }                       → allowed; caller proceeds
 *   - { response }                    → already-formed HTTP response; caller returns it
 *
 * Centralizes: not-found / revoked / expired / password / rate-limit /
 * access-log so the same audit chain covers reads AND writes.
 */
async function gateShare(
  c: Context,
  token: string,
  opts: { requirePassword: boolean } = { requirePassword: true },
): Promise<
  | { share: typeof shares.$inferSelect }
  | { response: Response }
> {
  // The opts are forward-looking — currently both reads + writes require
  // the password if one is set. The flag is here so a future read-only
  // metadata endpoint could be made public without a password if needed.
  void opts;
  const ip = clientIp(c);
  const ua = (c.req.header('user-agent') || '').slice(0, 500);
  const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
  if (!share) return { response: c.json({ error: 'not_found' }, 404) };
  if (share.revokedAt) {
    await logAccess(share.id, ip, false, 'revoked', ua);
    return { response: c.json({ error: 'revoked', reason: 'revoked' }, 410) };
  }
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    await logAccess(share.id, ip, false, 'expired', ua);
    return { response: c.json({ error: 'expired', reason: 'expired' }, 410) };
  }
  if (share.passwordHash) {
    const providedPwd = c.req.header('X-Share-Password') || c.req.header('x-share-password');
    if (!providedPwd) {
      await logAccess(share.id, ip, false, 'gate_hit', ua);
      return { response: c.json({ error: 'password_required', reason: 'password_required' }, 401) };
    }
    const limit = checkAndRecordFailure('share-unlock', token, ip || 'unknown', UNLOCK_RATELIMIT);
    if (!limit.allowed) {
      await logAccess(share.id, ip, false, 'rate_limited', ua);
      c.header('Retry-After', String(limit.retryAfter));
      return {
        response: c.json(
          {
            error: 'rate_limited',
            reason: 'rate_limited',
            retryAfter: limit.retryAfter,
            message: 'too_many_password_attempts',
          },
          429,
        ),
      };
    }
    // Round 6 PART Y: argon2id verify, with bcrypt fallback for shares
    // created in Round 3 ($2-prefixed hashes). Both libraries do their own
    // constant-time compare internally; argon2's `verify` returns boolean
    // (throws only on malformed hash — we treat that as a fail-closed).
    let ok = false;
    try {
      if (share.passwordHash.startsWith('$argon2')) {
        ok = await argon2Verify(share.passwordHash, providedPwd);
      } else {
        // Legacy bcrypt hash from Round 3. Verify with bcrypt; this branch
        // can be deleted once all old shares either expire or get
        // recreated by their owners.
        ok = await bcrypt.compare(providedPwd, share.passwordHash);
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      await logAccess(share.id, ip, false, 'wrong_password', ua);
      return { response: c.json({ error: 'password_required', reason: 'password_required' }, 401) };
    }
    resetFailureCounter('share-unlock', token, ip || 'unknown');
    await logAccess(share.id, ip, true, 'unlock_attempt', ua);
  } else {
    await logAccess(share.id, ip, true, 'ok', ua);
  }
  return { share };
}

// Basic shape check used ONLY to decide whether we attempt to *send* mail to a
// customer-supplied address — never to gate input acceptance.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isLikelyEmail(v: string | null | undefined): v is string {
  return typeof v === 'string' && EMAIL_RE.test(v.trim());
}

// Optional, purely informational customer e-mail ("für Notizen"). A typo must
// NEVER 400 the whole acceptance/feedback — that was the canonical share-bug
// class on the legally-binding §145-BGB Annahme flow (a hard z.string().email()
// rejected anything like "name@firma" without a TLD, hidden behind a generic
// "bitte später erneut versuchen" toast). We coerce blank/whitespace → undefined
// and accept any short string; the post-approve mail guards the address with
// isLikelyEmail() before sending, so a malformed value is harmless.
const optionalCustomerEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().max(200).optional(),
);

const commentSchema = z.object({
  positionOz: z.string().trim().min(1).max(200),
  intent: z.enum(['accept', 'change_menge', 'change_fabrikat', 'negotiate_ep', 'other']),
  text: z.string().trim().min(1).max(4000),
  authorName: z.string().trim().min(1).max(200).optional(),
  authorEmail: optionalCustomerEmail,
});

const approveSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: optionalCustomerEmail,
  message: z.string().max(4000).optional(),
});

const changesSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: optionalCustomerEmail,
  message: z.string().max(4000).optional(),
  changes: z
    .array(
      z.object({
        positionId: z.string().max(64),
        type: z.enum(['modify', 'remove', 'comment']),
        text: z.string().max(2000),
      }),
    )
    .min(1)
    .max(100),
});

const changeRequestsSchema = z.object({
  customerName: z.string().trim().min(1).max(200).optional(),
  customerEmail: optionalCustomerEmail,
  items: z
    .array(
      z.object({
        scope: z.enum(['global', 'position']),
        positionOz: z.string().trim().max(200).optional(),
        field: z.enum(CHANGE_REQUEST_FIELDS),
        /** The value the customer wants. Null/omitted = only a direction + note. */
        requestedValue: z.number().finite().min(-1e12).max(1e12).nullable().optional(),
        direction: z.enum(['lower', 'higher', 'exact', 'unspecified']).optional(),
        note: z.string().trim().max(2000).optional(),
      }),
    )
    .min(1)
    .max(200),
});

/** Which (scope, field) combinations are valid, and how each maps onto the
 *  frozen snapshot. Returns the display unit + the value the customer was
 *  shown (lifted server-side so a malicious client can't fake the "Ist"
 *  side of the diff). `currentValue` is null when the snapshot doesn't carry
 *  that number (legacy snapshot, or a field the share didn't display — e.g.
 *  per-position Arbeitszeit). Returns null when the combo is not allowed. */
function changeRequestContext(
  snapshot: ShareSnapshot | null,
  settings: ShareSettings,
  scope: ChangeRequestScope,
  positionOz: string | undefined,
  field: ChangeRequestField,
): { unit: ChangeRequestUnit; currentValue: number | null } | null {
  // Visibility gate — mirror the client's `availableFields` so a crafted POST
  // can't lodge a wish against a figure the share never revealed to this
  // customer (defense-in-depth; the UI already only offers visible fields).
  const breakdown = settings.showCostBreakdown !== false;
  const calc = settings.showCalculation !== false;
  const fieldVisible =
    field === 'sonstiges' || field === 'menge' || field === 'gesamtpreis'
      ? true
      : field === 'endbetrag'
        ? !!settings.showTotals
        : field === 'zeit'
          ? scope === 'global'
            ? calc
            : true
          : /* lohn | material | geraete */ breakdown;
  if (!fieldVisible) return null;

  const summary = snapshot?.summary ?? null;
  if (scope === 'global') {
    switch (field) {
      case 'endbetrag': return { unit: 'eur', currentValue: summary?.netto ?? null };
      case 'lohn': return { unit: 'eur', currentValue: summary?.costTypes.lohn.vk ?? null };
      case 'material': return { unit: 'eur', currentValue: summary?.costTypes.material.vk ?? null };
      case 'geraete': return { unit: 'eur', currentValue: summary?.costTypes.geraete.vk ?? null };
      case 'zeit': return { unit: 'std', currentValue: summary?.totalHours ?? null };
      case 'sonstiges': return { unit: 'eur', currentValue: null };
      default: return null; // gesamtpreis / menge are position-only
    }
  }
  // scope === 'position' — locate the snapshot line by its OZ.
  const pos = (snapshot?.positions ?? []).find((p) => p.oz === positionOz);
  if (!pos) return null;
  switch (field) {
    case 'menge': return { unit: 'qty', currentValue: pos.quantity ?? null };
    case 'gesamtpreis': return { unit: 'eur', currentValue: pos.gp ?? null };
    case 'material': return { unit: 'eur', currentValue: pos.gpMaterial ?? null };
    case 'geraete': return { unit: 'eur', currentValue: pos.gpGeraet ?? null };
    case 'lohn': return { unit: 'eur', currentValue: pos.gpLohn ?? null };
    case 'zeit': return { unit: 'min', currentValue: null }; // minutes not in the customer snapshot
    case 'sonstiges': return { unit: 'eur', currentValue: null };
    default: return null; // endbetrag is global-only
  }
}

export const publicRoute = new Hono()
  .get('/share/:token', async (c) => {
    const token = c.req.param('token');
    const gate = await gateShare(c, token);
    if ('response' in gate) return gate.response;
    const share = gate.share;
    const project = await db.query.projects.findFirst({ where: eq(projects.id, share.projectId) });
    if (!project) return c.json({ error: 'not_found' }, 404);

    // Lazy snapshot for legacy share rows that predate the snapshot column.
    // New shares always have snapshotData populated at creation.
    let snapshot = share.snapshotData;
    if (!snapshot) {
      snapshot = buildLegacySnapshot(
        { data: project.data, versionNumber: project.versionNumber },
        share.visiblePositionIds,
      );
      const hash = snapshotHash(snapshot);
      await db
        .update(shares)
        .set({ snapshotData: snapshot, snapshotHash: hash })
        .where(eq(shares.id, share.id));
      share.snapshotHash = hash;
      console.warn(`[share] backfilled snapshot for legacy share ${share.id}`);
    }

    const owner = await db.query.users.findFirst({ where: eq(users.id, project.ownerId) });

    const isFirstView = !share.lastViewedAt;
    await db
      .update(shares)
      .set({
        viewCount: (share.viewCount || 0) + 1,
        lastViewedAt: new Date(),
      })
      .where(eq(shares.id, share.id));

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'link.viewed',
      actorKind: 'customer',
      actorRef: null,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        isFirstView,
        viewCount: (share.viewCount || 0) + 1,
        browserFingerprint: clientFingerprint(c),
      },
    });

    // For Nachtrag shares, surface parent metadata so the customer page can
    // render "Nachtrag N1 zum Angebot vom DD.MM.YYYY" plus the running total
    // of the original + this addendum.
    let parentMeta: {
      createdAt: string;
      snapshotHash: string | null;
      netto: number;
      brutto: number;
    } | null = null;
    if (share.parentShareId) {
      const parent = await db.query.shares.findFirst({ where: eq(shares.id, share.parentShareId) });
      if (parent && parent.snapshotData) {
        const parentNetto = parent.snapshotData.positions
          .filter((p) => !p.isHeader)
          .reduce((t, p) => t + p.gp, 0);
        const parentMwst = parent.settings.showMwst ? parentNetto * parent.snapshotData.project.mwst : 0;
        parentMeta = {
          createdAt: parent.createdAt.toISOString(),
          snapshotHash: parent.snapshotHash,
          netto: Math.round(parentNetto * 100) / 100,
          brutto: Math.round((parentNetto + parentMwst) * 100) / 100,
        };
      }
    }

    // PART J: revision tracking. The snapshot the customer is viewing was
    // taken at project versionNumber `snapshot.projectVersionNumber`. If the
    // calculator has bumped the project's version since (via PUT /projects/:id
    // with bumpVersion or via the resnapshot flow), surface a banner.
    const latestVersionNumber = project.versionNumber;
    const hasNewerVersion = latestVersionNumber > snapshot.projectVersionNumber;

    // Gate the payload by the share's display toggles — NOT just the UI. The
    // calculator's choice to hide the cost breakdown / calculation must mean
    // the data never reaches the customer (raw JSON included), so a hidden
    // toggle can't be bypassed by reading the network response.
    const st = share.settings;
    const hideBreakdown = st.showCostBreakdown === false;
    // showLongText=false (the „Kurzfassung") must strip the Langtext from the
    // PAYLOAD, not just hide it in the React UI / PDF — otherwise the customer
    // can still read the suppressed detailed LV spec straight from the network
    // response. Same payload-gating contract as showCostBreakdown above.
    const hideLongText = st.showLongText === false;
    const outPositions = snapshot.positions.map((p) => {
      let out: typeof p = p;
      if (hideBreakdown) {
        const { gpLohn, gpMaterial, gpGeraet, gpNu, ...rest } = p;
        void gpLohn; void gpMaterial; void gpGeraet; void gpNu;
        out = rest as typeof p;
      }
      if (hideLongText && out.longText) {
        out = { ...out, longText: '' };
      }
      return out;
    });
    let outSummary = snapshot.summary ?? null;
    if (outSummary && st.showTotals === false) {
      outSummary = null; // no totals at all → no aggregate block
    } else if (outSummary && st.showCalculation === false) {
      // Redact EINKAUF / Zuschlag / Überschuss / KPIs (the cost+margin detail).
      // Keep the VERKAUF composition (vk) for the Kostenzusammensetzung bar —
      // UNLESS the cost breakdown is ALSO hidden, in which case neither the
      // composition bar nor the Kalkulation table renders vk, so it must not ship
      // at all (a customer could otherwise read the per-cost-type VERKAUF split
      // from the raw JSON). netto/mwst/brutto stay (gated only by showTotals).
      const hideVk = st.showCostBreakdown === false;
      const redact = (ct: { ek: number; vk: number; zuschlagPct: number; differnz: number }) => ({ ek: 0, vk: hideVk ? 0 : ct.vk, zuschlagPct: 0, differnz: 0 });
      outSummary = {
        ...outSummary,
        ekTotal: 0,
        ueberschuss: 0,
        mitarbeiter: 0,
        arbeitstage: 0,
        monate: 0,
        totalHours: 0,
        costTypes: {
          lohn: redact(outSummary.costTypes.lohn),
          material: redact(outSummary.costTypes.material),
          geraete: redact(outSummary.costTypes.geraete),
          nu: redact(outSummary.costTypes.nu),
        },
      };
    }

    // Gate the „04_Angebote" link the same way as the cost data above: the
    // button only reaches the customer when the calculator turned it on AND the
    // stored value is a real http(s) URL. When off, strip the URL entirely — it
    // points at the firm's internal SharePoint and must never ship to a customer
    // who shouldn't see it. `showAngebote` is normalised to the gated result so
    // the client can trust the flag without re-deriving it.
    const angeboteUrl = typeof st.angeboteFolderUrl === 'string' ? st.angeboteFolderUrl : '';
    const showAngebote = st.showAngebote === true && /^https?:\/\//i.test(angeboteUrl);
    const outSettings: typeof st = { ...st, showAngebote };
    if (!showAngebote) delete outSettings.angeboteFolderUrl;

    return c.json({
      shareId: share.id,
      token: share.token,
      settings: outSettings,
      snapshotHash: share.snapshotHash,
      snapshottedAt: snapshot.snapshottedAt,
      nachtragNumber: share.nachtragNumber,
      parent: parentMeta,
      pdfDownloadUrl: `/api/panel/share/${share.token}/pdf`,
      project: {
        ...snapshot.project,
        versionNumber: snapshot.projectVersionNumber,
      },
      owner: {
        name: owner?.name || '',
        companyName: owner?.companyName || '',
        companyLogoUrl: owner?.companyLogoUrl || '',
        companyPhone: owner?.companyPhone || '',
        // Public contact email — explicitly different from login email
        // (which stays private; see P0-2).
        contactEmail: owner?.companyContactEmail || '',
      },
      positions: outPositions,
      summary: outSummary,
      createdAt: share.createdAt,
      // PART J: gate metadata for the frontend. `passwordRequired` is
      // intentionally `false` here — if it were `true` the request would
      // have been rejected at the gate above. The flag is kept in the type
      // so re-fetching with a stored password doesn't have to special-case.
      passwordRequired: false,
      expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
      hasNewerVersion,
      latestVersionNumber,
    });
  })

  /** Public PDF download of the snapshotted Angebot. Token-gated — anyone with
   *  the link can fetch the PDF (matches the existing GET /share/:token model). */
  .get('/share/:token/pdf', async (c) => {
    const token = c.req.param('token');
    // Route through the same gate the HTML view uses so a password-protected
    // share's PDF can't be pulled with only the token (revoked/expired/password
    // /rate-limit/audit-log all handled centrally).
    const gate = await gateShare(c, token);
    if ('response' in gate) return gate.response;
    const share = gate.share;

    const project = await db.query.projects.findFirst({ where: eq(projects.id, share.projectId) });
    if (!project) return c.json({ error: 'not_found' }, 404);
    let snapshot = share.snapshotData;
    if (!snapshot) {
      snapshot = buildLegacySnapshot({ data: project.data, versionNumber: project.versionNumber }, share.visiblePositionIds);
    }
    const owner = await db.query.users.findFirst({ where: eq(users.id, project.ownerId) });

    let parentCreatedAt: Date | null = null;
    if (share.parentShareId) {
      const parent = await db.query.shares.findFirst({ where: eq(shares.id, share.parentShareId) });
      if (parent) parentCreatedAt = parent.createdAt;
    }

    const pdf = await renderQuotePdf({
      snapshot,
      settings: share.settings,
      owner: {
        name: owner?.name || '',
        companyName: owner?.companyName || '',
        companyPhone: owner?.companyPhone || '',
        companyContactEmail: owner?.companyContactEmail || '',
      },
      shareToken: share.token,
      snapshotHash: share.snapshotHash || '',
      createdAt: share.createdAt,
      nachtragNumber: share.nachtragNumber,
      parentCreatedAt,
    });

    const safeName = (snapshot.project.name || 'angebot').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const filename = share.nachtragNumber > 0
      ? `Nachtrag-N${share.nachtragNumber}_${safeName}.pdf`
      : `Angebot_${safeName}.pdf`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  })

  .post('/share/:token/approve', async (c) => {
    const token = c.req.param('token');
    const body = await c.req.json().catch(() => null);
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);

    const gate = await gateShare(c, token);
    if ('response' in gate) return gate.response;
    const share = gate.share;
    if (!share.settings.allowApproval) return c.json({ error: 'not_allowed' }, 403);

    const now = new Date();
    const responseId = nanoid(16);
    await db.insert(shareResponses).values({
      id: responseId,
      shareId: share.id,
      responseType: 'approve',
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        message: parsed.data.message,
        signature: {
          name: parsed.data.customerName,
          timestamp: now.getTime(),
          ip: clientIp(c),
        },
        snapshotHash: share.snapshotHash || undefined,
      },
      respondedAt: now,
    });

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'response.submitted',
      actorKind: 'customer',
      actorRef: parsed.data.customerEmail || parsed.data.customerName,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        responseId,
        responseType: 'approve',
        snapshotHash: share.snapshotHash,
        customerName: parsed.data.customerName,
        browserFingerprint: clientFingerprint(c),
      },
    });

    // Best-effort post-approve mailing: certificate PDF to customer + owner.
    // Audit-trail research recommends this so the customer's own inbox holds
    // independent evidence of which version was approved. Failure here must
    // NOT break the approval — we recorded the audit event already.
    (async () => {
      try {
        const project = await db.query.projects.findFirst({ where: eq(projects.id, share.projectId) });
        if (!project) return;
        let snapshot = share.snapshotData;
        if (!snapshot) {
          snapshot = buildLegacySnapshot({ data: project.data, versionNumber: project.versionNumber }, share.visiblePositionIds);
        }
        const owner = await db.query.users.findFirst({ where: eq(users.id, project.ownerId) });
        if (!owner) return;

        // Pull event timeline for this share (oldest → newest) for the certificate
        const eventRows = await db
          .select({
            eventType: auditEvents.eventType,
            createdAt: auditEvents.createdAt,
            ip: auditEvents.ip,
            actorRef: auditEvents.actorRef,
          })
          .from(auditEvents)
          .where(eq(auditEvents.shareId, share.id))
          .orderBy(auditEvents.createdAt);

        const certificate = await renderCertificatePdf({
          snapshot,
          settings: share.settings,
          owner: { name: owner.name, companyName: owner.companyName },
          customerName: parsed.data.customerName,
          // Only render a well-formed address on the legally-binding
          // Annahmebestätigung — the lenient schema now accepts typos (so the
          // acceptance can't be blocked), but a garbage value must not land on
          // the evidence document. Falls back to just the name.
          customerEmail: isLikelyEmail(parsed.data.customerEmail) ? parsed.data.customerEmail : undefined,
          approvedAt: now,
          ip: clientIp(c),
          userAgent: (c.req.header('user-agent') || ''),
          snapshotHash: share.snapshotHash || '',
          events: eventRows.map((e) => ({ ...e })),
        });
        const quote = await renderQuotePdf({
          snapshot,
          settings: share.settings,
          owner: {
            name: owner.name,
            companyName: owner.companyName,
            companyPhone: owner.companyPhone,
            companyContactEmail: owner.companyContactEmail,
          },
          shareToken: share.token,
          snapshotHash: share.snapshotHash || '',
          createdAt: share.createdAt,
          nachtragNumber: share.nachtragNumber,
          parentCreatedAt: null,
        });

        const projectName = snapshot.project.name || 'Bauleistung';
        const subject = `Annahmebestätigung: ${projectName}`;
        const text = [
          `Sehr geehrte${parsed.data.customerName.includes('Frau') ? '' : 'r'} ${parsed.data.customerName},`,
          '',
          `vielen Dank für die Annahme des Angebots „${projectName}".`,
          '',
          'Im Anhang finden Sie:',
          '  • Annahmebestätigung mit Zeitstempel und Dokument-Hash',
          '  • das angenommene Angebot als PDF',
          '',
          `Wir melden uns in Kürze mit den nächsten Schritten.`,
          '',
          `${owner.companyName || owner.name}`,
          owner.companyPhone ? `Tel: ${owner.companyPhone}` : '',
          owner.companyContactEmail ? `E-Mail: ${owner.companyContactEmail}` : '',
        ].filter(Boolean).join('\n');

        // Send to customer ONLY if they supplied a well-formed address (the
        // field is optional/informational and now accepts typos without 400ing
        // the approval); otherwise fall back to the owner archive copy so a
        // malformed value never costs the owner their record.
        const customerEmail = isLikelyEmail(parsed.data.customerEmail)
          ? parsed.data.customerEmail.trim()
          : undefined;
        const recipients: string[] = [];
        if (customerEmail) recipients.push(customerEmail);
        const archive = owner.companyContactEmail || owner.email;
        if (recipients.length === 0 && archive) recipients.push(archive);
        if (recipients.length === 0) return;

        const safe = (snapshot.project.name || 'angebot').replace(/[^a-zA-Z0-9_-]+/g, '_');
        const result = await sendMail({
          to: recipients,
          bcc: customerEmail && archive && archive !== customerEmail ? archive : undefined,
          // Don't fall back to owner.email — that's the *login* address and is
          // deliberately not customer-facing (see public-endpoint contract).
          replyTo: owner.companyContactEmail || undefined,
          subject,
          text,
          attachments: [
            { filename: `Annahmebestaetigung_${safe}.pdf`, content: certificate, contentType: 'application/pdf' },
            { filename: `Angebot_${safe}.pdf`, content: quote, contentType: 'application/pdf' },
          ],
        });
        if (!result.ok) {
          console.warn('[approve] email send failed:', result.reason);
        }
      } catch (err) {
        console.error('[approve] post-mail pipeline error:', err);
      }
    })();

    return c.json({ ok: true, respondedAt: now, snapshotHash: share.snapshotHash, pdfDownloadUrl: `/api/panel/share/${share.token}/pdf` });
  })

  .post('/share/:token/changes', async (c) => {
    const token = c.req.param('token');
    const body = await c.req.json().catch(() => null);
    const parsed = changesSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);

    const gate = await gateShare(c, token);
    if ('response' in gate) return gate.response;
    const share = gate.share;
    if (!share.settings.allowChangeRequests) return c.json({ error: 'not_allowed' }, 403);

    const now = new Date();
    const responseId = nanoid(16);
    await db.insert(shareResponses).values({
      id: responseId,
      shareId: share.id,
      responseType: 'changes',
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        message: parsed.data.message,
        changes: parsed.data.changes,
        snapshotHash: share.snapshotHash || undefined,
      },
      respondedAt: now,
    });

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'response.submitted',
      actorKind: 'customer',
      actorRef: parsed.data.customerEmail || parsed.data.customerName,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        responseId,
        responseType: 'changes',
        changesCount: parsed.data.changes.length,
        snapshotHash: share.snapshotHash,
        customerName: parsed.data.customerName,
        browserFingerprint: clientFingerprint(c),
      },
    });

    return c.json({ ok: true, respondedAt: now, snapshotHash: share.snapshotHash });
  })

  /**
   * PART K: per-position comment. Routed through the share token (the link
   * IS the credential — no panel auth). Honors the share's password gate
   * (gateShare reuses the exact same logic the GET uses).
   *
   * Validates that positionOz exists in the snapshot the customer is
   * looking at — prevents a malicious caller from posting comments
   * against OZ values that aren't in this share.
   */
  .post('/share/:token/comments', async (c) => {
    const token = c.req.param('token');
    const gate = await gateShare(c, token);
    if ('response' in gate) return gate.response;
    const share = gate.share;

    const body = await c.req.json().catch(() => null);
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }

    // Validate that the positionOz appears in the snapshot's visible
    // positions. This blocks "post a comment against OZ 9.9.9 even though
    // the share doesn't include that position" — keeps the comment table
    // tightly aligned with what the customer was actually shown.
    const snapshotPositions = share.snapshotData?.positions ?? [];
    const ozInSnapshot = snapshotPositions.some((p) => p.oz === parsed.data.positionOz);
    if (!ozInSnapshot) {
      return c.json({ error: 'oz_not_in_share', positionOz: parsed.data.positionOz }, 400);
    }

    const id = nanoid(16);
    const now = new Date();
    await db.insert(positionComments).values({
      id,
      shareId: share.id,
      positionOz: parsed.data.positionOz,
      intent: parsed.data.intent,
      text: parsed.data.text,
      authorName: parsed.data.authorName ?? null,
      authorEmail: parsed.data.authorEmail ?? null,
      ip: clientIp(c) ?? null,
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      createdAt: now,
    });

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'response.submitted',
      actorKind: 'customer',
      actorRef: parsed.data.authorEmail ?? null,
      ip: clientIp(c),
      userAgent: (c.req.header('user-agent') || '').slice(0, 500),
      payload: {
        kind: 'position_comment',
        positionOz: parsed.data.positionOz,
        intent: parsed.data.intent,
        textLength: parsed.data.text.length,
        browserFingerprint: clientFingerprint(c),
      },
    });

    return c.json({
      ok: true,
      id,
      createdAt: now.toISOString(),
      positionOz: parsed.data.positionOz,
      intent: parsed.data.intent,
    });
  })

  /**
   * Round 12: structured change requests ("Änderungswünsche"). Batch POST of
   * price/quantity wishes — per-position OR global (Endbetrag / Lohn-Σ / …).
   * Honors the password gate + allowChangeRequests. The "Ist" value of each
   * wish is lifted SERVER-SIDE from the frozen snapshot (never trusted from the
   * client), so the owner's inbox diff is authentic.
   */
  .post('/share/:token/change-requests', async (c) => {
    const token = c.req.param('token');
    const gate = await gateShare(c, token);
    if ('response' in gate) return gate.response;
    const share = gate.share;
    if (!share.settings.allowChangeRequests) return c.json({ error: 'not_allowed' }, 403);

    const body = await c.req.json().catch(() => null);
    const parsed = changeRequestsSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);

    const snapshot = (share.snapshotData ?? null) as ShareSnapshot | null;
    const now = new Date();
    const ip = clientIp(c) ?? null;
    const ua = (c.req.header('user-agent') || '').slice(0, 500);

    const rows: Array<typeof changeRequests.$inferInsert> = [];
    for (const item of parsed.data.items) {
      const ctx = changeRequestContext(snapshot, share.settings, item.scope, item.positionOz, item.field);
      // Reject the whole batch on a structurally-invalid item (bad scope/field
      // combo, or a position OZ that isn't in this share's snapshot) so the
      // customer gets a clear error rather than silently-dropped wishes.
      if (!ctx) {
        return c.json(
          { error: 'invalid_change_request', scope: item.scope, field: item.field, positionOz: item.positionOz ?? null },
          400,
        );
      }
      const requested = item.requestedValue ?? null;
      let direction = item.direction ?? 'unspecified';
      // Infer the direction from an exact target vs. the shown value.
      if (requested != null && direction === 'unspecified') {
        direction =
          ctx.currentValue == null
            ? 'exact'
            : requested < ctx.currentValue
              ? 'lower'
              : requested > ctx.currentValue
                ? 'higher'
                : 'exact';
      }
      const note = (item.note ?? '').trim();
      // Drop entirely-empty wishes (no value, no direction, no note).
      if (requested == null && direction === 'unspecified' && note.length === 0) continue;
      rows.push({
        id: nanoid(16),
        shareId: share.id,
        scope: item.scope,
        positionOz: item.scope === 'position' ? (item.positionOz ?? null) : null,
        field: item.field,
        unit: ctx.unit,
        currentValue: ctx.currentValue,
        requestedValue: requested,
        direction,
        note,
        authorName: parsed.data.customerName ?? null,
        authorEmail: parsed.data.customerEmail ?? null,
        ip,
        userAgent: ua,
        createdAt: now,
      });
    }
    if (rows.length === 0) return c.json({ error: 'empty', message: 'no_actionable_items' }, 400);

    await db.insert(changeRequests).values(rows);

    await recordAuditEvent({
      shareId: share.id,
      projectId: share.projectId,
      eventType: 'response.submitted',
      actorKind: 'customer',
      actorRef: parsed.data.customerEmail ?? parsed.data.customerName ?? null,
      ip: clientIp(c),
      userAgent: ua,
      payload: {
        kind: 'change_requests',
        count: rows.length,
        fields: rows.map((r) => `${r.scope}:${r.field}`),
        snapshotHash: share.snapshotHash,
        customerName: parsed.data.customerName,
        browserFingerprint: clientFingerprint(c),
      },
    });

    return c.json({ ok: true, count: rows.length, createdAt: now.toISOString() });
  });
