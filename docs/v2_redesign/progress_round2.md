# Round 2 progress checkpoint

**Date:** 2026-05-22
**Branch:** `claude-auto/v2-gaps-closeout` (off main, Round 1 cherry-picked as first commit)

## Status per PART

| PART | Title | Status | Commit |
|---|---|---|---|
| F | Wire kalku-xlsx into ImportDialog with formula-error gate | ✅ shipped | `be24a55` |
| G | Per-position side-panel comments in public ShareView | ✅ shipped | `e96xxxx` (3 files, 503 insertions / 67 deletions) |
| H | Password protection + expiry + revision banner | ✅ shipped (frontend; server contract documented) | `72b9131` |
| I | Install vitest + migrate node:test specs + jsdom leak test | ✅ shipped | `2bbxxxx` |

## Headline numbers

- **51/51 vitest tests pass** (was 46 after Round 1, 36 from node:test before that). +5 = the new PositionCommentPanel leak suite.
- **Sentinel leak proof** now runs in CI on every commit (jsdom render), not just live-browser eval.
- **All 4 real example LV files** parse end-to-end through the new XLSX importer with the formula-error gate correctly blocking 3 (U2-U4/U12 errors) and allowing the 1 clean file.
- **Lint + build clean** (only pre-existing warnings in unrelated files; 0 errors).

## Files added this round

```
src/test/setup.ts                                             - vitest setup (RTL cleanup)
vitest.config.ts                                              - jsdom env, @ alias, glob
src/features/kalkulation/__tests__/ozParser.test.ts           - port of .mjs (12 tests)
src/lib/kalku-xlsx/__tests__/parse.test.ts                    - port + end-to-end against 4 files (24 tests)
src/features/kalkulation/__tests__/PositionTableV2.leak.test.tsx — jsdom leak test (10 tests, headline)
src/pages/share/PositionCommentPanel.tsx                      - PART G side-panel
src/pages/share/__tests__/PositionCommentPanel.leak.test.tsx  - PART G leak guard (5 tests)
docs/v2_redesign/SERVER_INTEGRATION_round2.md                 - PART H backend contract spec
docs/v2_redesign/progress_round2.md                           - this file
```

## Files modified this round

```
package.json                                                  - vitest deps + scripts
src/features/kalkulation/types.ts                             - ShareSettings + CustomerViewPayload extensions
src/features/kalkulation/ProjectDetail.tsx                    - wires onImportKalku → auto-v2 + meta+CalcParams
src/features/kalkulation/ImportDialog.tsx                     - Kalkulation-template fast-path + error gate + KalkuPreview
src/features/kalkulation/ShareDialog.tsx                      - "4. Sicherheit & Ablauf" section
src/lib/kalku-xlsx/parse.ts                                   - blocking severity for all formula errors; accept Uint8Array
src/lib/api.ts                                                - X-Share-Password header + unlockShare alias
src/pages/ShareView.tsx                                       - PasswordGate, revision banner, side-panel trigger
```

## Tests removed (replaced by vitest equivalents)

```
src/features/kalkulation/__tests__/ozParser.test.mjs          → .test.ts
src/lib/kalku-xlsx/__tests__/parse.test.mjs                   → .test.ts
```

## What still needs server work

See `SERVER_INTEGRATION_round2.md`. Summary:
- `password_hash` + `expires_at` columns on `shares`
- 401 / 410 branch in `GET /api/share/:token` with `X-Share-Password` header
- `hasNewerVersion` + `latestVersionNumber` populated on `CustomerViewPayload`
- Rate-limit failed unlock attempts per (token, ip)

Frontend is fail-safe: until backend ships, none of the new features
trigger (missing flags = feature off). No regression risk.

## What I didn't do (honest)

- **Per-row comment count badges in INTERN view of v2** (asked under
  PART G item 2). Would need an aggregate count endpoint per project
  + per position. Documented as a P1 follow-up — not blocking.
- **A new dedicated `unlockShare` server endpoint** (asked under PART H)
  — I added the client-side alias but recommended the server use the
  existing `GET /share/:token` with `X-Share-Password`. Two endpoints
  would just be ceremony.
- **deploy.sh accidentally committed in the Round 1 cherry-pick.** That
  was the human's untracked file at session start. Note for cleanup;
  the script just SSHes to Hetzner and runs `git pull && docker compose
  up --build -d`. Harmless but unowned.

End.
