import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { projects, shares, shareResponses, users, auditEvents } from '../schema.js';
import { clientIp } from '../lib/middleware.js';
import { buildLegacySnapshot, snapshotHash } from '../lib/snapshot.js';
import { recordAuditEvent } from '../lib/audit.js';
import { renderQuotePdf, renderCertificatePdf } from '../lib/pdf.js';
import { sendMail } from '../lib/mailer.js';

const approveSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().email().max(200).optional(),
  message: z.string().max(4000).optional(),
});

const changesSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().email().max(200).optional(),
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

export const publicRoute = new Hono()
  .get('/share/:token', async (c) => {
    const token = c.req.param('token');
    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);

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
      },
    });

    // For Nachtrag shares, surface parent metadata so the customer page can
    // render "Nachtrag N1 zum Angebot vom DD.MM.YYYY".
    let parentMeta: { createdAt: string; snapshotHash: string | null } | null = null;
    if (share.parentShareId) {
      const parent = await db.query.shares.findFirst({ where: eq(shares.id, share.parentShareId) });
      if (parent) {
        parentMeta = {
          createdAt: parent.createdAt.toISOString(),
          snapshotHash: parent.snapshotHash,
        };
      }
    }

    return c.json({
      shareId: share.id,
      token: share.token,
      settings: share.settings,
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
      positions: snapshot.positions,
      createdAt: share.createdAt,
    });
  })

  /** Public PDF download of the snapshotted Angebot. Token-gated — anyone with
   *  the link can fetch the PDF (matches the existing GET /share/:token model). */
  .get('/share/:token/pdf', async (c) => {
    const token = c.req.param('token');
    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);

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

    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);
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
          customerEmail: parsed.data.customerEmail,
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

        // Send to customer if they provided an email; CC owner contact for archive
        const recipients: string[] = [];
        if (parsed.data.customerEmail) recipients.push(parsed.data.customerEmail);
        const archive = owner.companyContactEmail || owner.email;
        if (recipients.length === 0 && archive) recipients.push(archive);
        if (recipients.length === 0) return;

        const safe = (snapshot.project.name || 'angebot').replace(/[^a-zA-Z0-9_-]+/g, '_');
        const result = await sendMail({
          to: recipients,
          bcc: parsed.data.customerEmail && archive && archive !== parsed.data.customerEmail ? archive : undefined,
          replyTo: owner.companyContactEmail || owner.email,
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

    const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
    if (!share) return c.json({ error: 'not_found' }, 404);
    if (share.revokedAt) return c.json({ error: 'revoked' }, 410);
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
      },
    });

    return c.json({ ok: true, respondedAt: now, snapshotHash: share.snapshotHash });
  });
