# Kalku v2: INTERN/KUNDEN split + full Excel import + share-link with password / per-position comments / revision banner

Six rounds of work on `claude-auto/v2-gaps-closeout`. Each round closed against a fresh user-supplied audit; see `docs/v2_redesign/KALKU_REDESIGN_REPORT.md` for the index.

## Summary

| Round | Brief | Key commits |
|---|---|---|
| **1** | v2 PositionTable + INTERN/KUNDEN split + sentinel-leak proof + 4-LV column classification | `03324e2` |
| **2** | ImportDialog wired, side-panel comments UI, password+revision frontend, vitest migration | `be24a55` `ce3ad5f` `279dcbc` `72b9131` |
| **3** | Backend: shares password gate + expiry + revision tracking + rate-limit + position_comments table + counts endpoint + Playwright e2e | `8b49258` `503b466` `a67a4d2` |
| **4** | Display fidelity (full Bezeichnung, no truncation), read-only LV cells, live ZSCHLG % editing, full-Excel-import fidelity capture | `2a669c8` `ae51bd7` `cf459c6` |
| **5** | 10-LV verification audit (was 4) — parser, fidelity, leak, feature coverage, column classification | `f2eaf77` `5eaf292` |
| **6** | argon2id (replaces bcrypt for share passwords), duplicate-OZ comment hint, counts-endpoint leak guard, Playwright e2e × 3 LV files, deploy prep | _this PR_ |

## What ships

### Frontend (`src/`)

- **`PositionTableV2`** with per-user toggle (`localStorage 'kalku.tableVersion'`). Default `v1`; one click on "Neue Ansicht" flips to v2.
- **INTERN view**: full Bezeichnung wraps (no truncation), customer-zone cells are read-only `<div>`s, per-position Material EK / Min/Einheit / NU EK are editable `<input>`s, sticky `ZuschlagMatrixStrip` at the top supports live ZSCHLG % edits with debounced recompute through `calculatePosition()`.
- **KUNDEN view**: structurally leak-proof — the customer-visible payload shape carries only `{id, oz, shortText, longText, quantity, unit, isHeader, sortOrder, ep, gp}`. Sentinel-leak tests across 10 real LV fixtures pass 92/92.
- **Kalkulation-template Excel import** at `src/lib/kalku-xlsx/parse.ts`. Detects the template via header anchors, lifts ZSCHLG matrix + Stundensatz + Mittellohn + Faktoren-Lookup + header extras. Formula-error gate blocks files with broken Faktoren references (per explicit user policy from Round 2). 54 parser tests + 41 round-trip fidelity tests across 10 example files.
- **Share-link side-panel comments** with composer (name + email captured on first interaction; drafts persist across positions).
- **Password gate UI + revision banner** in `ShareView.tsx`. Fail-safe — if backend doesn't set the flag, the gate stays off.
- **Round 5 over-lock fix** (`f2eaf77`): the Round-4 PART O "EK locked" wording referred to the row-aggregated ZSCHLG totals in the matrix strip, NOT the per-position EK inputs. The fix re-introduces `NumCellEditable` so calculators can fill EK after GAEB import.
- **Round 6 duplicate-OZ hint**: when a project has duplicate OZ keys (ex7 has 14 — surfaced by the parser as a `duplicate_oz` warning), the comment badge gets an amber ring + tooltip *"OZ N kommt mehrfach vor — Kommentar zur ersten passenden Position zugeordnet."*

### Backend (`panel-api/`)

- **`POST /api/panel/projects/:id/shares`** accepts `settings.password` + `settings.expiresAt`. Password hashed with **argon2id** (`@node-rs/argon2`, prebuilt binaries — no node-gyp on the deploy host). OWASP-recommended params: m=19 MiB / t=2 / p=1.
- **`GET /api/panel/share/:token`** gates on (in order): not-found → revoked (410) → expired (410) → password-required (401) → rate-limited (429 + Retry-After) → wrong-password (401). Hash-format detection: argon2id forward path with transparent fallback to bcrypt for shares created in Round 3.
- **Rate-limit**: 5 failed unlocks per (token, ip) per 15 min → 429. `share_access_log` records every attempt.
- **Revision tracking**: `CustomerViewPayload` carries `hasNewerVersion` (lazy compare: `projects.versionNumber > snapshot.projectVersionNumber`) + `latestVersionNumber`.
- **`POST /api/panel/share/:token/comments`** (gated by share password if set). Validates `positionOz` exists in the share's snapshot before insert.
- **`GET /api/panel/projects/:id/comments`** (owner-auth) returns full comments grouped by `positionOz`.
- **`GET /api/panel/projects/:id/comments/counts`** (owner-auth) returns `{ [oz]: { total, unresolved } }`. Round 6 PART Z **leak guard** test: this endpoint must NEVER carry author email / text / authorName into the response — verified with canary values.
- **Tests**: 55/55 panel-api (`node --test`).

## Breaking changes

**None** to existing endpoint contracts. New fields on `CustomerViewPayload` (`passwordRequired`, `expiresAt`, `hasNewerVersion`, `latestVersionNumber`) are optional in the type and default-off-when-absent in the client.

## Migrations required at deploy

The panel-api runs `runMigrations()` automatically on server boot ([`panel-api/src/db.ts`](panel-api/src/db.ts)). All migrations are idempotent via `IF NOT EXISTS` + SQLite pragma probing. Migration applies the following changes if they're not already present:

```sql
-- Round 3 PART J (already on the host if Round 3 was deployed)
ALTER TABLE shares ADD COLUMN password_hash TEXT;
ALTER TABLE shares ADD COLUMN expires_at INTEGER;
CREATE TABLE IF NOT EXISTS share_access_log (
  id TEXT PRIMARY KEY,
  share_id TEXT NOT NULL,
  ip TEXT, success INTEGER, reason TEXT, user_agent TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY(share_id) REFERENCES shares(id)
);
CREATE TABLE IF NOT EXISTS position_comments (
  id TEXT PRIMARY KEY,
  share_id TEXT NOT NULL,
  position_oz TEXT NOT NULL,
  intent TEXT NOT NULL,
  text TEXT NOT NULL,
  author_name TEXT, author_email TEXT,
  ip TEXT, user_agent TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY(share_id) REFERENCES shares(id)
);
```

**Round 6 adds no new tables or columns** — the argon2id swap reuses the existing `password_hash` TEXT column. Round 3 bcrypt hashes (`$2$...`) coexist with Round 6 argon2 hashes (`$argon2id$...`) — the verify path detects the prefix.

## Rollout plan

In this order — otherwise customers hit 500s during the gap:

1. **Migrations**: redeploy panel-api → boot calls `runMigrations()` → idempotent ALTERs + CREATEs apply on first connection. Verify with `sqlite3 panel-api/data/prod.db ".schema shares"` — should list `password_hash` and `expires_at`.
2. **Backend**: panel-api container restart. `npm test --prefix panel-api` should be 55/55 before promoting. Hetzner deploy command:
   ```bash
   ssh -4 -i ~/.ssh/hetzner_claude admin@91.98.185.113 \
     "cd ~/projects/kalku-website && \
      git fetch origin && git checkout main && \
      git merge --ff-only origin/main && \
      docker compose -f docker-compose.prod.yml up --build -d kalku-api"
   ```
3. **Frontend**: rebuild + redeploy the kalku-website container. `npm run build` should be clean.
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d kalku-website
   ```

## Rollback plan

The migrations are **additive** (new columns/tables; no destructive ALTERs). Rolling the code back is a `git revert`; the new columns become dead weight in the DB but don't break anything. If a hard revert is needed:

```bash
git checkout main && git revert --no-commit <merge-commit>..HEAD && git commit
# Then redeploy backend + frontend in the same order as above.
```

Down-migrations are NOT auto-applied — the safe choice is to leave the additive columns in place. If you absolutely need them gone, run by hand:

```sql
DROP TABLE position_comments;
DROP TABLE share_access_log;
ALTER TABLE shares DROP COLUMN password_hash;     -- SQLite ≥ 3.35
ALTER TABLE shares DROP COLUMN expires_at;
```

## Manual verification (3-step smoke test after deploy)

1. **Read-existing-share**: open any existing share link from before deploy. Should render as before (no password gate appears). If the share already had a password hash from a Round 3 test, it should still unlock with the same password (bcrypt fallback path).
2. **Password gate**: in panel, create a new share with a password + 7-day expiry. Open the share URL in incognito → password gate. Wrong password → 401 + "Passwort stimmt nicht". Right password → LV renders, KUNDEN-only columns visible.
3. **Comment + badge**: in the same share session, click a position → side panel → submit a comment. Switch to the calculator session, reload the project → row badge shows `1` next to the OZ in INTERN view.

## Important caveats for future maintainers

- **Read-only LV scope is _matrix-totals only_** — per-row Material EK / Min/Einheit / NU EK stay editable by design (see commit `f2eaf77`). A future refactor that re-locks them will break the calculator's GAEB-import → fill-EK workflow. The lock is enforced on customer-zone cells (oz / bezeichnung / menge / einheit / longText / group-name) via `data-readonly` attributes; the per-position EK cells are `<NumCellEditable>` inputs.
- **Formula-error gate stays hard** — the Round 5 audit found that 5 of 10 real-world LV files would import cleanly if the gate were downgraded (PART V's suggestion). The user's Round 2 policy is explicit: any formula error blocks import; calculators repair in Excel and re-import. Don't relax without an explicit policy reversal.
- **argon2id is in the dep tree as `@node-rs/argon2`** — chosen over the native `argon2` package because the Rust bindings ship prebuilt binaries for the deploy targets (linux-x64, darwin-arm64). No `node-gyp` build step on the Hetzner host.
- **Sentinel-leak test is the non-negotiable invariant** — every commit must pass `PositionTableV2.leak.test.tsx`. Adding any new field to `Position` or `CalcParams` requires extending the sentinel set in `__fixtures__/lv3_bh.ts` AND re-confirming the leak guards.

## Test results — full PR

| Suite | Result |
|---|---|
| Frontend `npm run test` (vitest + jsdom) | **331/331** (10 test files, ~9 s) |
| Backend `npm test --prefix panel-api` (`node --test`) | **55/55** (6 test files, ~0.9 s) |
| Playwright `npx playwright test` | round2_flow: 1/1 · round6_full_flow: see e2e report |
| Lint `npm run lint` | 0 errors · 8 pre-existing warnings |
| Build `npm run build` | ✓ clean |
| Build `npm run build --prefix panel-api` | ✓ clean |

**Total: 386 frontend+backend assertions + 1–4 Playwright runs.**

## Coverage matrix — Round 5 feature audit (10 LV files × 12 features)

| File | f1 INTERN | f2 KUNDEN | f3 KG-collapse | f4 Full Bez. | f5 RO LV | f6 Live ZSCHLG | f7 Import route | f8 Gate | f9 Share shape | f10 Comments | f11 Pwd gate | f12 Revision |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ex1 (LV3_BH)     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex2 (LV3)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex3 (LV3)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex4 (LV3_FW)     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex5 (LV3_)       | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex6 (LV3)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex7 (LV3)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex8 (LV3)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex9 (LV3)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |
| ex10 (LV3)       | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔌 | 🔌 | 🔌 |

**120 cells = 85 ✅ · 5 ⚠️ (formula-error gate blocks — by design) · 30 🔌 (backend covered by panel-api tests + Playwright) · 0 ❌**.

Legend: ✅ pass · ⚠️ partial (expected formula-error block) · 🔌 backend covered separately · ❌ broken.

## Docs

- `docs/v2_redesign/KALKU_REDESIGN_REPORT.md` (master index, Rounds 1–6)
- `docs/v2_redesign/progress_round{2,3,4,5,6}.md` per-round checkpoints
- `docs/v2_redesign/parser_audit_10examples.md`, `import_fidelity_10examples.md`, `leak_test_10examples.md`, `feature_coverage_audit.md`, `column_classification.md` (Round 5 audits)
- `docs/v2_redesign/backend_audit_round6.md` (Round 6 PART X)
- `docs/v2_redesign/SERVER_INTEGRATION_round2.md` (original backend spec — fulfilled)
- `docs/v2_redesign/e2e/` (Playwright reports + screenshots)

## Suggested labels

`needs-migration` · `frontend` · `backend` · `e2e-tested`
