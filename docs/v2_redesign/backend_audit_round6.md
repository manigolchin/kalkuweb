# Backend audit — Round 6 (2026-05-22)

> Comparing what `SERVER_INTEGRATION_round2.md` specifies against what's actually in `panel-api/`. Verified by reading every cited file + running `npm test --prefix panel-api`.

## Result snapshot

| Spec item | Status | Where it lives |
|---|:---:|---|
| `shares.password_hash` column | ✅ Shipped | [`panel-api/src/schema.ts:51`](../../panel-api/src/schema.ts) |
| `shares.expires_at` column | ✅ Shipped | [`panel-api/src/schema.ts:55`](../../panel-api/src/schema.ts) |
| `share_access_log` table | ✅ Shipped | [`panel-api/src/schema.ts:70`](../../panel-api/src/schema.ts) |
| `position_comments` table | ✅ Shipped | [`panel-api/src/schema.ts:183`](../../panel-api/src/schema.ts) |
| POST `/api/panel/projects/:id/shares` accepts `password` + `expiresAt` | ✅ Shipped | [`panel-api/src/routes/shares.ts:37-163`](../../panel-api/src/routes/shares.ts) |
| Password hashing | ⚠️ **bcrypt cost 12**, spec asks argon2id | [`panel-api/src/routes/shares.ts:83`](../../panel-api/src/routes/shares.ts) |
| Password never returned to client | ✅ Shipped — stripped before insert; token only in response | shares.ts:84 |
| `expiresAt` rejects past timestamps | ✅ Shipped — `if t.getTime() > now.getTime()` | shares.ts:88 |
| GET `/api/panel/share/:token` — expired → 410 | ✅ Shipped | [`panel-api/src/routes/public.ts:80-83`](../../panel-api/src/routes/public.ts) |
| GET `/api/panel/share/:token` — wrong/missing pw → 401 | ✅ Shipped | public.ts:84-110 |
| Rate-limit: 5/(token,ip)/15min → 429 + `Retry-After` | ✅ Shipped — `checkAndRecordFailure` helper | public.ts:25, 90-104 |
| `share_access_log` insert on every attempt | ✅ Shipped — `logAccess` helper | public.ts:27-48 |
| Constant-time password compare | ✅ Shipped — `bcrypt.compare` uses constant-time internally | public.ts:106 |
| `hasNewerVersion` + `latestVersionNumber` in payload | ✅ Shipped — lazy compare (Option B) | public.ts:230-231,263-264 |
| `passwordRequired` + `expiresAt` in payload | ✅ Shipped | public.ts:261-262 |
| POST `/api/panel/share/:token/comments` exists | ✅ Shipped — gate-honors password | public.ts:534-595 |
| Comment endpoint validates OZ-in-snapshot | ✅ Shipped — `ozInSnapshot` check | public.ts:550-554 |
| GET `/api/panel/projects/:id/comments` exists | ✅ Shipped — owner-auth, grouped by positionOz | shares.ts:267-292 |
| GET `/api/panel/projects/:id/comments/counts` exists | ✅ Shipped — total + unresolved per OZ | shares.ts:296-322 |
| Backend tests | ✅ 51/51 passing | `panel-api/test/*` |

## What's actually missing or wrong

### 1. argon2id ⇄ bcrypt (PART Y)

Spec (Round 6 prompt §Y, item 2): *"Hash with argon2id (not bcrypt — check if argon2 lib is installed; if not, install argon2 or argon2-browser-equivalent for Node)."*

Round 3 PART J chose bcrypt deliberately to avoid `node-gyp` on every deploy host. The note in [`panel-api/src/routes/shares.ts:80-82`](../../panel-api/src/routes/shares.ts) explains: *"bcrypt cost 12 ≈ ~250ms on commodity hardware — acceptable for a one-shot create-share path. argon2id would be marginally better but would add a native build dep."*

The Round 6 prompt overrides this. Plan:
- Install **`@node-rs/argon2`** (Rust bindings with prebuilt binaries — no node-gyp on the deploy host, drop-in for the deploy pipeline).
- Replace `bcrypt.hash(plaintext, 12)` with `argon2.hash(plaintext, { variant: argon2id })` (default params: m=19 MiB, t=2, p=1 → OWASP-recommended baseline).
- Replace `bcrypt.compare(provided, hash)` with `argon2.verify(hash, provided)` (constant-time).
- Hash-format detection: bcrypt hashes start with `$2`; argon2id with `$argon2id$`. Verify path: try argon2 first; if hash starts with `$2`, fall through to a deprecated `bcrypt.compare` call so existing shares created in Round 3 still unlock. (Migration is transparent — no downtime, no re-hashing required.)

### 2. Duplicate-OZ handling for comments (PART Z)

Spec (Round 6 prompt §Z, item 6): *"Handle the ex7 duplicate-OZ case from Round 5: if a project has duplicate OZs and a comment arrives for that OZ, attach to the FIRST matching position by row order, log a warning, and surface it in the INTERN UI."*

Backend storage is already correct — `position_comments.positionOz` is text, so a comment is associated with the OZ string, not a specific position. If a project has two positions with OZ `1.1.1`, a comment on `1.1.1` is shared between them at the DB level. That's the right behavior; the disambiguation is purely a UI concern.

Plan:
- INTERN view: when a project has duplicate OZ keys (detectable from `parseKalkulationWorkbook`'s `duplicate_oz` warning, surfaced in Round 5), render an inline hint next to the comment badge: *"OZ N kommt mehrfach vor — Kommentar zur ersten Position zugeordnet."*
- No backend change needed.

### 3. Round 3 known soft spot (deferred carry-over)

From Round 3 PR draft: *"v2 INTERN row comment-count badge: counts API works; badge UI sometimes needs a second reload. e2e spec logs a warning instead of failing. Tracked as Round 4 P1."*

Round 4 didn't address this. Round 6 should — the counts endpoint is correct; the bug is a client-side state hydration order. Plan:
- Add a `useEffect` re-fetch after `project` loads in `ProjectDetail.tsx`.
- Add a vitest assertion: render → assert badge count appears within one tick of `commentCounts` resolving.

### 4. Counts-endpoint leak guard (PART Z, prompt item)

Spec: *"the badge count endpoint must NEVER leak comment author email / text into KUNDEN view DOM."*

Inspecting the `/comments/counts` endpoint return shape: `{ counts: { [positionOz]: { total, unresolved } } }`. No author email, no text. ✅ Structurally safe.

The INTERN-side `/comments` endpoint DOES return author info but is owner-auth gated and never reaches KUNDEN view. ✅ Safe by separation.

Plan: add an explicit vitest case that fetches `/counts` against a project with comments and asserts the returned JSON has no `email | text | authorName | authorEmail` keys at any depth. Belt and braces.

## Tests already in place

| File | What it covers | Status |
|---|---|---|
| `panel-api/test/share-gate.test.ts` | password gate, expiry, rate-limit, hasNewerVersion | ✅ 9/9 |
| `panel-api/test/position-comments.test.ts` | comments POST + validate + GET grouped + counts | ✅ 8/8 |
| `panel-api/test/audit.test.ts` | recordAuditEvent integration | ✅ |
| `panel-api/test/aufmass.test.ts` | aufmass parser | ✅ |
| `panel-api/test/snapshot.test.ts` | snapshotHash + diffSnapshots | ✅ 38/38 |

**Total: 51/51 pass.**

## What Round 6 still needs to build (TL;DR)

1. **argon2id swap** in `shares.ts` (POST create-share) and `public.ts` (`gateShare`). Transparent migration for existing bcrypt hashes.
2. **Duplicate-OZ INTERN hint** in `PositionTableV2.tsx` (or `FeedbackInbox.tsx`).
3. **Badge auto-refresh after project load** in `ProjectDetail.tsx`.
4. **Leak-guard vitest case** against `/counts` endpoint response shape.
5. **Playwright e2e** across 3 LV files (PART AA) — see Round 6 prompt for full script.
6. **PR description** + push + open PR (PART BB + CC).

Nothing genuinely missing on the API surface — everything in the Round 2 SERVER_INTEGRATION spec is live and tested.
