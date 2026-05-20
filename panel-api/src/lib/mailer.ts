import nodemailer, { type Transporter } from 'nodemailer';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

let cached: Transporter | false | null = null;

function buildTransport(): Transporter | false {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return false;
  try {
    const port = Number.parseInt(SMTP_PORT, 10);
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } catch (err) {
    console.error('[mailer] transport build failed:', err);
    return false;
  }
}

function getTransport(): Transporter | false {
  if (cached === null) cached = buildTransport();
  return cached;
}

export type Attachment = { filename: string; content: Buffer; contentType?: string };

export type SendInput = {
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: Attachment[];
};

/**
 * Best-effort outbound email. Returns `{ ok: true }` on send, `{ ok: false,
 * reason: 'not_configured' | 'invalid_recipient' | string }` otherwise. Never
 * throws — callers (approve/changes endpoints, digest cron) should not fail
 * the user-facing operation just because SMTP is down.
 */
export async function sendMail(input: SendInput): Promise<{ ok: boolean; reason?: string }> {
  const transport = getTransport();
  if (!transport) return { ok: false, reason: 'not_configured' };

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  for (const r of recipients) {
    if (!EMAIL_RE.test(r)) return { ok: false, reason: 'invalid_recipient' };
  }

  const from = process.env.SMTP_FROM || 'KALKU Panel <noreply@kalku.de>';
  try {
    await transport.sendMail({
      from,
      to: input.to,
      bcc: input.bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || 'application/octet-stream',
      })),
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[mailer] sendMail failed:', msg);
    return { ok: false, reason: msg };
  }
}

export function mailerStatus(): 'configured' | 'not_configured' {
  return getTransport() ? 'configured' : 'not_configured';
}
