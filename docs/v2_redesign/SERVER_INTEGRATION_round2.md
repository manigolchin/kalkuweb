# Server integration required for Round 2 frontend changes

The Round 2 changes (PARTS F · G · H) extend the **client-side** UI and
type contracts. Three server-side endpoints / behaviors must catch up
before the features are end-to-end functional. None of them block the
build, lint, or tests — but the customer-facing behaviors won't work
until the backend implements the contracts below.

The frontend changes are deliberately graceful — until the backend
catches up, the client behaves as if the feature is "off":

- No password → no gate appears.
- No `hasNewerVersion` flag → no banner.
- No `passwordRequired` flag → assumes public read.
- No `expiresAt` enforcement → link works normally.

So shipping the frontend changes early is safe.

---

## 1. PART H · Password-protected shares

### Storage
`shares` table gets two new nullable columns:
- `password_hash` (`bytea` or `text` for bcrypt/argon2 — your call) — null when no password
- `expires_at` (`timestamptz`) — null when no expiry

### Create endpoint (`POST /api/panel/projects/:id/shares`)
Now accepts:
```json
{
  "visiblePositionIds": ["..."],
  "settings": {
    "...existing...": "...",
    "password": "plaintext from form",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
}
```
Server hashes the password (argon2id or bcrypt, cost 12+) before insert.
The plaintext NEVER persists, NEVER logs.

### Public read endpoint (`GET /api/share/:token`)
New behavior:
- If `expires_at < NOW()` → return **`410 Gone`** with body `{ "reason": "expired" }`
- If `revoked_at IS NOT NULL` → return **`410 Gone`** with body `{ "reason": "revoked" }` (existing behavior; keep)
- If `password_hash IS NOT NULL`:
  - Check `X-Share-Password` header
  - If missing OR doesn't match → **`401 Unauthorized`** with body `{ "reason": "password_required" }`
  - If matches → return the normal `CustomerViewPayload`
- **Always** populate the new optional fields on `CustomerViewPayload`:
  - `passwordRequired: boolean` (mirror of `password_hash IS NOT NULL`)
  - `expiresAt: string | null` (mirror)
  - `hasNewerVersion: boolean` — true when `projects.version_number > shares.snapshot_version`
  - `latestVersionNumber: number` — `projects.version_number`

### Rate limiting
Failed password attempts on `GET /api/share/:token` should be rate-limited
per `(token, ip)` pair:
- 5 attempts per 15 minutes → 429 with `Retry-After`
- After 20 failed attempts in 1 hour, lock the share for 1 hour (still 429)

Why per-token: locking the IP entirely would let a single bad actor lock
out a legitimate customer who happens to share the same NAT.

### Audit trail
Every successful unlock logs `(token, ip, user_agent, timestamp)` to the
existing `share_events` table (or equivalent). Calculator can see this
in the inbox.

---

## 2. PART H · Revision banner

The banner already renders client-side when `payload.hasNewerVersion === true`.
The server needs to populate that flag.

Two implementation options:

**Option A — eager re-snapshot** (simpler)
On every `PUT /api/panel/projects/:id`, after the update commits, walk
all non-revoked shares for that project and set
`shares.has_pending_resnapshot = true`. The public GET checks that
column and surfaces `hasNewerVersion: true`.

**Option B — lazy compare** (less DB churn)
On the public GET, compare `projects.updated_at > shares.snapshotted_at`.
No additional column needed; the compare is a single join.

Option B is simpler and avoids the cost of "every project edit fans out
to every share". Use it unless we observe meaningful query latency.

Comment preservation across versions:
- Existing `share_responses` table already has `share_id` + `position_id`.
- When the calculator clicks **Resnapshot** on a share (existing
  `POST /shares/:id/resnapshot`), the new snapshot reuses the same
  `share_id` — so responses stay attached automatically.
- Caveat: if a position is **renamed or removed** in the new snapshot,
  its responses now point at a stale `position_id`. The frontend already
  handles missing positions gracefully (renders "(diese Position wurde
  vom Anbieter entfernt)" — see `FeedbackInbox.tsx`).

---

## 3. PART G · Per-position comments

**No new endpoints needed.** The side-panel UI batches per-row comments
into the existing `POST /api/share/:token/changes` payload (the
`changes[]` array already exists with `positionId / type / text` shape).
The only behavioral change is UX (side-panel vs inline) — server-side
ingestion stays identical.

**Inbox display** (existing `FeedbackInbox.tsx`) already shows the
`ShareResponse.payload.changes[]` array, so per-row comments appear with
attribution. No server work.

---

## 4. PART F · Kalkulation-template import — `versionNumber` bump

When the user does "Replace" with a Kalkulation-template import, the
client calls `setData(...)` which triggers the normal `PUT
/api/panel/projects/:id` flow. Server should:

- Treat the `PUT` as a regular update (no special path needed).
- Existing optimistic-locking via `expectedUpdatedAt` keeps two tabs from
  clobbering each other.
- The `If-Match`-style `expectedUpdatedAt` check on the server is the
  load-bearing piece — don't allow a stale tab to silently overwrite a
  fresh import.

No server work; document for the reviewer.

---

## Rollout order

The four items above can ship in any order — frontend is fail-safe.
Recommended order matches user-visible impact:

1. **Revision banner (PART H lazy compare)** — least code, biggest UX win.
   ~1 hour server work.
2. **Expiry enforcement (PART H expires_at)** — 1 column, 1 GET branch.
   ~2 hours.
3. **Per-position comment routing through existing endpoint** — confirm
   no server changes needed; smoke-test against the new UI. ~30 min QA.
4. **Password protection (PART H password_hash + rate-limit)** — ~4 hours
   incl. rate-limiter wiring.

End.
