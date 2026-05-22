# Round 6 progress — backend completion + deploy prep (2026-05-22)

> Branch: `claude-auto/v2-gaps-closeout` · Audience: PR reviewer + future deployer · Master index: [`KALKU_REDESIGN_REPORT.md`](KALKU_REDESIGN_REPORT.md).

## What Round 6 closed

Rounds 1–5 shipped the frontend, the parser, the full backend (PART J + K in Round 3), and the 10-LV regression audit. Round 6 closes:

1. The argon2id swap requested by the Round 6 prompt — Round 3 had chosen bcrypt to avoid `node-gyp`; Round 6 swaps to `@node-rs/argon2` (Rust prebuilt binaries, no native build).
2. The duplicate-OZ UI hint — Round 5 PART R surfaced the ex7 case (14 duplicate keys); Round 6 makes the calculator notice via an amber ring on the comment badge.
3. The counts-endpoint **leak guard** — explicit canary test verifying the badge-count endpoint never carries author text/email.
4. Playwright e2e × 3 LV files (ex4, ex9, ex10) covering the full customer-facing workflow including the asymmetric-ZSCHLG case.
5. PR description + deploy prep.

## Audit findings (PART X)

[`backend_audit_round6.md`](backend_audit_round6.md) is the full audit. TL;DR:

| Spec item | Status before Round 6 | Status after Round 6 |
|---|:---:|:---:|
| Migrations (`shares.password_hash` + `shares.expires_at` + `share_access_log` + `position_comments`) | ✅ Round 3 | ✅ Same |
| POST `/shares` accepts password + expiresAt | ✅ Round 3 | ✅ Same + argon2 |
| GET `/share/:token` password gate + rate-limit + expiry | ✅ Round 3 | ✅ Same + argon2 verify |
| `hasNewerVersion` + `latestVersionNumber` | ✅ Round 3 | ✅ Same |
| POST `/share/:token/comments` | ✅ Round 3 | ✅ Same |
| GET `/projects/:id/comments(+counts)` | ✅ Round 3 | ✅ Same + leak guard test |
| argon2id (vs bcrypt) | ❌ | ✅ Round 6 PART Y |
| Duplicate-OZ UI hint | ❌ | ✅ Round 6 PART Z |
| Counts-endpoint leak canary test | ❌ | ✅ Round 6 PART Z |

Conclusion: **Round 3 PART J + PART K shipped 95 % of the spec.** Round 6 closed the remaining items + ran the cross-LV Playwright e2e (PART AA).

## Commits

| Commit | PART | What it ships |
|---|---|---|
| _round6 squash_ | **X + Y + Z + AA + BB** | argon2 swap (3 files in panel-api/), duplicate-OZ UI hint (PositionTableV2.tsx), counts-endpoint leak guard test (position-comments.test.ts +1 case), 3 new argon2 forward/fallback tests (share-gate.test.ts +3 cases), Playwright round6_full_flow.spec.ts, backend_audit_round6.md, progress_round6.md, PR_DESCRIPTION.md, master report Round 6 section. |

## Tests added

| Test | Coverage |
|---|---|
| `panel-api/test/share-gate.test.ts` `argon2id forward path` | seed an argon2id-prefixed hash → verify unlock works |
| `panel-api/test/share-gate.test.ts` `legacy bcrypt fallback` | seedShare uses bcrypt → confirm Round 3 hashes still unlock |
| `panel-api/test/share-gate.test.ts` `malformed hash → 401` | corrupted hash returns 401 without throwing |
| `panel-api/test/position-comments.test.ts` `counts leak guard` | submit a comment with `__LEAK_GUARD_CANARY_TEXT__` / `__LEAK_GUARD_AUTHOR__` / `leak-guard@example.com` → counts endpoint response is checked byte-for-byte; canaries must NOT appear |
| `tests/e2e/round6_full_flow.spec.ts` | 3 LV files × full customer workflow (Playwright) |

## Headline numbers — Round 5 → Round 6

| | After Round 5 | After Round 6 |
|---|---:|---:|
| Frontend tests (vitest+jsdom) | 331 | **331** (unchanged) |
| Backend tests (`node --test --prefix panel-api`) | 51 | **55** (+4) |
| Playwright e2e | 1 spec | **2 specs** |
| LV files in regression corpus | 10 | **10** (unchanged) |
| Total automated assertions | 383 | **386 + Playwright runs** |

## Files added / changed

### Backend (`panel-api/`)
- `package.json` + `package-lock.json` — `@node-rs/argon2` ^2.0.2 added
- `src/routes/shares.ts` — argon2id hash on create (POST /shares)
- `src/routes/public.ts` — argon2id verify + bcrypt fallback in `gateShare`
- `test/share-gate.test.ts` — +3 argon2 tests
- `test/position-comments.test.ts` — +1 leak guard test

### Frontend (`src/`)
- `src/features/kalkulation/PositionTableV2.tsx` — `duplicateOzKeys` Set + threaded down through GroupRows + PositionRow; badge gets `data-duplicate-oz` attribute + amber ring + tooltip when OZ is non-unique

### Tests
- `tests/e2e/round6_full_flow.spec.ts` — Playwright × 3 LV files (added by PART AA agent)

### Docs
- `docs/v2_redesign/backend_audit_round6.md` (NEW)
- `docs/v2_redesign/progress_round6.md` (THIS FILE)
- `docs/v2_redesign/PR_DESCRIPTION.md` (NEW — pasteable as the PR body)
- `docs/v2_redesign/KALKU_REDESIGN_REPORT.md` — Round 6 section appended

## Closing posture

The full Round 1–6 stack is **ready to merge**:
- Frontend, backend, e2e all green
- Migrations are idempotent + auto-applied at server boot
- Rollback is a `git revert` (no destructive migrations)
- 3-step smoke test documented in `PR_DESCRIPTION.md` for post-deploy verification

End.
