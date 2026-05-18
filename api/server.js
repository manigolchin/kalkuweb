// KALKU API — Form-Submission backend
// Express server behind Traefik. Persists JSONL, optional SMTP + Pipedrive.

import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import nodemailer from 'nodemailer';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const CORS_ORIGINS = (
  process.env.CORS_ORIGINS ||
  'https://kalku.kalkus.de,https://kalku.de,https://www.kalku.de'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DATA_DIR = path.join(__dirname, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.jsonl');

const LEAD_EMAIL_TO = process.env.LEAD_EMAIL_TO || 'it@kalku.de';
const SMTP_FROM = process.env.SMTP_FROM || 'KALKU Web <noreply@kalku.de>';

const EMAIL_RE = /\S+@\S+\.\S+/;
const MAX_BODY_BYTES = 50 * 1024; // 50 KB

// Ensure data dir exists (fs.mkdirSync is idempotent with { recursive: true })
fs.mkdirSync(DATA_DIR, { recursive: true });

// -----------------------------------------------------------------------------
// SMTP transport — lazy, only created if env config is complete
// -----------------------------------------------------------------------------
let mailer = null;
function getMailer() {
  if (mailer !== null) return mailer; // memo (could be transport or false)
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    mailer = false;
    return mailer;
  }
  try {
    mailer = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number.parseInt(SMTP_PORT, 10),
      secure: Number.parseInt(SMTP_PORT, 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return mailer;
  } catch (err) {
    console.error('[smtp] createTransport failed:', err);
    mailer = false;
    return mailer;
  }
}

// -----------------------------------------------------------------------------
// App
// -----------------------------------------------------------------------------
const app = express();

// Behind Traefik → trust X-Forwarded-* so req.ip reflects the real client IP.
app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / curl / server-to-server (no Origin header)
      if (!origin) return cb(null, true);
      if (CORS_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS: origin not allowed'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
  }),
);

app.use(express.json({ limit: '64kb' }));

// Rate limit on /api/forms/*: 10 req/h per IP
const formsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limited' },
});
app.use('/api/forms', formsLimiter);

// ---- Routes ------------------------------------------------------------------

app.get('/api/healthz', (_req, res) => {
  res.type('text/plain').status(200).send('ok');
});

app.post('/api/forms/submit', async (req, res, next) => {
  try {
    const body = req.body || {};

    // Body-size guard (defence-in-depth — express.json also limits to 64kb).
    const size = Buffer.byteLength(JSON.stringify(body), 'utf8');
    if (size > MAX_BODY_BYTES) {
      return res.status(413).json({ ok: false, error: 'payload_too_large' });
    }

    // Honeypot — silent OK for bots (no logging, no persistence)
    if (typeof body.website === 'string' && body.website.length > 0) {
      return res.status(200).json({ ok: true });
    }

    // Email validation
    if (!body.email || typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }

    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    const ip = req.ip || req.socket?.remoteAddress || '';
    const ua = req.get('user-agent') || '';

    // Strip honeypot from persisted row
    const { website: _hp, ...clean } = body;
    void _hp;

    const row = { id, ts, ip, ua, ...clean };

    // Persist JSONL (append). Throws → caught by error handler → 500.
    fs.appendFileSync(SUBMISSIONS_FILE, JSON.stringify(row) + '\n', 'utf8');

    // Best-effort notifications (do NOT block 200 / do NOT 500 on failure)
    sendNotificationEmail(row).catch((err) =>
      console.error('[notify-mail] failed:', err?.message || err),
    );
    pushToPipedrive(row).catch((err) =>
      console.error('[pipedrive] failed:', err?.message || err),
    );

    return res.status(200).json({ ok: true, id });
  } catch (err) {
    return next(err);
  }
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatBody(row) {
  const lines = [];
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'ua' || k === 'ip') continue; // shown separately at bottom
    const value = typeof v === 'object' ? JSON.stringify(v) : String(v);
    lines.push(`${k}: ${value}`);
  }
  lines.push('');
  lines.push('---');
  lines.push(`IP: ${row.ip || '-'}`);
  lines.push(`UA: ${row.ua || '-'}`);
  return lines.join('\n');
}

async function sendNotificationEmail(row) {
  const transport = getMailer();
  if (!transport) return; // SMTP not configured → skip silently

  const type = row.type || 'submission';
  const subjectKey = row.firma || row.email || 'KALKU-Kontakt';
  const subject = `[KALKU Lead] ${type}: ${subjectKey}`;

  await transport.sendMail({
    from: SMTP_FROM,
    to: LEAD_EMAIL_TO,
    replyTo: row.email,
    subject,
    text: formatBody(row),
  });
}

async function pushToPipedrive(row) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return; // not configured

  const ownerId = process.env.PIPEDRIVE_OWNER_ID
    ? Number.parseInt(process.env.PIPEDRIVE_OWNER_ID, 10)
    : undefined;

  const title = `KALKU Lead — ${row.firma || row.email}`;
  const payload = {
    title,
    ...(ownerId ? { owner_id: ownerId } : {}),
    note: formatBody(row),
  };

  const url = `https://api.pipedrive.com/v1/leads?api_token=${encodeURIComponent(token)}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 5000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`pipedrive ${resp.status}: ${txt.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

// -----------------------------------------------------------------------------
// Error handler — JSON shape consistent with route responses
// -----------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[error]', err?.stack || err);

  // CORS rejection comes through here too
  if (err && err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ ok: false, error: 'cors_denied' });
  }

  // express.json() oversized body
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'payload_too_large' });
  }

  return res.status(500).json({ ok: false });
});

// -----------------------------------------------------------------------------
// Start + graceful shutdown
// -----------------------------------------------------------------------------
const server = app.listen(PORT, HOST, () => {
  console.log(`[kalku-api] listening on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`[kalku-api] ${signal} received — shutting down`);
  server.close((err) => {
    if (err) {
      console.error('[kalku-api] close error:', err);
      process.exit(1);
    }
    process.exit(0);
  });
  // Hard exit after 10s if close hangs
  setTimeout(() => {
    console.warn('[kalku-api] forced exit after 10s');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export for tests; harmless in prod.
export default app;
