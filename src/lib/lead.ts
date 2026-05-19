// Frontend client for the KALKU form-submission backend (api/server.js).
// Used by every "leave-your-email" form on the site. The backend persists
// to JSONL, optionally emails it@kalku.de via SMTP, and optionally pushes
// to Pipedrive — see api/server.js POST /api/forms/submit.

const API_URL = '/api/forms/submit';
const LEAD_EMAIL = 'it@kalku.de';

export type LeadPayload = {
  type: string;
  email: string;
  // honeypot — must be empty (or absent). Bots that auto-fill all fields trip it.
  website?: string;
  [key: string]: unknown;
};

export type LeadResult = { ok: true; id?: string } | { ok: false; error: string };

export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website: '', ...payload }),
    });
    let data: { ok?: boolean; id?: string; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      // non-JSON response (e.g. a proxy returning HTML) — leave data empty
    }
    if (!res.ok || data.ok === false) {
      return { ok: false, error: data.error || `http_${res.status}` };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network_error' };
  }
}

export const LEAD_FALLBACK_EMAIL = LEAD_EMAIL;
