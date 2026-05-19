// Honest "form submit" without a backend: opens the user's mail client
// pre-filled with a summary of what they were doing, and stores a
// localStorage copy so leads aren't silently lost if the mailto: handler
// is broken on the user's machine.
//
// To wire a real backend later (Formspree, Resend, custom API), this is
// the only file that needs to change.

const LEAD_EMAIL = 'it@kalku.de';
const LEAD_STORAGE_KEY = 'kalku.leads';

type LeadType = 'gaeb-premium' | 'kalkulator-review';

export type LeadSubmission = {
  type: LeadType;
  email: string;
  subject: string;
  bodyLines: string[];
};

export function submitLead({ type, email, subject, bodyLines }: LeadSubmission): void {
  const body = [
    ...bodyLines,
    '',
    '— Bitte diese E-Mail unverändert absenden. Wir antworten innerhalb von 1–2 Werktagen.',
  ].join('\n');

  try {
    const existing = JSON.parse(localStorage.getItem(LEAD_STORAGE_KEY) ?? '[]');
    const list: unknown[] = Array.isArray(existing) ? existing : [];
    list.push({ ts: new Date().toISOString(), type, email, subject, body });
    localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    // localStorage full or disabled — non-fatal
  }

  const mailto = `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

export const LEAD_FALLBACK_EMAIL = LEAD_EMAIL;
