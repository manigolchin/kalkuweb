# Optional password protection on share links

## Acceptance criteria

- [ ] `ShareSettings` gains an optional `password?: string` field (set
      from the calculator, stored as bcrypt hash server-side, never
      returned on `ShareSummary`).
- [ ] `ShareDialog.tsx` exposes a "Passwortschutz (optional)" input in
      the "Was kann der Kunde tun?" section, with copy explaining when
      it's worth it (e.g. private customer who forwards links
      carelessly, B2B with sensitive Margen). Show a visual indicator
      ("geschützt") on existing-shares list when set.
- [ ] `CustomerViewPayload` is **not** returned by
      `api.public.getShare(token)` when the share is password-protected
      and no valid unlock cookie/header is presented. Instead, return a
      `{ requiresPassword: true; ownerCompanyName: string }` shape so
      ShareView can render the gate.
- [ ] New `api.public.unlockShare(token, password)` endpoint sets a
      short-lived HttpOnly cookie scoped to that token; subsequent
      `getShare` calls within the window pass through.
- [ ] `ShareView.tsx` renders a centered password form (using the
      existing brand header) when `requiresPassword === true`. Wrong
      password shows a rate-limited error (existing `ApiError` 401/429
      paths).
- [ ] Failed attempts are rate-limited at the same layer that already
      protects login (commit `ee7e483`).
- [ ] Password reset = revoke + recreate share. No "forgot password"
      flow for the customer.
- [ ] Audit log entry on successful unlock (IP + timestamp), same as
      first view.

## Suggested implementation

Add `password?: string` to `ShareSettings` in
`src/features/kalkulation/types.ts`. On the calculator side, surface a
masked input in `ShareDialog.tsx` near the existing `Toggle` grid (~line
492) with a "Passwort generieren" button that produces a memorable
6-word dice-style passphrase (so the calculator can dictate it on the
phone). On submit, send plaintext to the API once; never round-trip it
in subsequent `ShareSummary` reads — store a `hasPassword: boolean` flag
on `ShareSummary` instead so the calculator UI knows the share is
protected without ever exposing the secret.

On the customer side, change `getShare` to either return the full
payload or a `{ requiresPassword: true, ownerCompanyName }` shape; add a
discriminated union to the response type and branch in `ShareView.tsx`
before the existing `ready` render. The unlock form mirrors the brand
header so the customer doesn't mistake it for a phishing page. After
successful unlock the server sets `kalku_share_unlock_${shareId}` cookie
(HttpOnly, Secure, SameSite=Lax, expires same as session) and ShareView
re-fetches.

For the rate-limit, reuse the brute-force protection commit `ee7e483`
added for login — same module, scoped per `(token, ip)`.

## Touch points

- `src/features/kalkulation/types.ts` — `ShareSettings`, `ShareSummary`,
  new `LockedShareView` discriminated union for the public payload
- `src/features/kalkulation/ShareDialog.tsx` — password input (~line
  492 in the "3. Was kann der Kunde tun?" section), "geschützt" badge
  on existing-shares list (~line 532)
- `src/pages/ShareView.tsx` — branching on `requiresPassword`, new
  `<PasswordGate>` component sharing the header layout
- `src/lib/api.ts` — `public.unlockShare`, response-type widening on
  `public.getShare`
- Server-side (out of this repo): hashing, cookie issuance, rate-limit
  reuse, audit log
