# panel-api — KALKU Inhaber-Panel-Backend

Hono + better-sqlite3 + Drizzle. Serves `/api/panel/*` behind Traefik with priority 400 (sits above the legacy form-api on 300).

## What it does

- **Auth** — bcrypt + JWT-Cookie session (30 d, httpOnly). Rate-limited login (10/15min/IP). Refuses to start in `NODE_ENV=production` without `JWT_SECRET`.
- **Projects** — owner CRUD for LV-style Kalkulationen. PUT recomputes ep/gp from cost inputs server-side (clients can't pin wrong totals) and enforces position-type default-deny (Wagnis/Reserve/NU-Marge/Lohn-Puffer → `visibleToCustomer:false` regardless of input). Optimistic locking via `expectedUpdatedAt` (409 on stale).
- **Aufmaß formulas** — REB-23.003-lite per-position formula. Safe expression evaluator (own tokenizer + shunting-yard, no eval/Function). Annotation/math split on ≥2 spaces or a tab. Lines starting with `-` subtract.
- **Customer share** — token-gated URL with frozen `snapshot_data` (SHA-256 hash bound on creation). Editing the project after sharing does NOT change what the customer sees. Snapshot version diff endpoint lets the owner re-share with an explicit changelog.
- **Audit trail** — append-only `audit_events` table, every row hash-chained: `row_hash = SHA-256(prev_hash || canonical_json(row))`. Verify endpoint detects tampering.
- **PDF export** — branded Angebot PDF (DIN 5008 + § 14 UStG layout, Bindefrist, signature line) at `GET /api/panel/share/:token/pdf`. Approve flow ships an Annahmebestätigung PDF with the event timeline to the customer's inbox.
- **Notifications** — owner-facing only. In-app unread badge polled on panel nav-change, plus a daily-digest email via cron entry-point `POST /api/panel/digest/run` (shared-secret-gated).
- **Nachträge** — chained shares (`parent_share_id` + `nachtrag_number`) for VOB §2 Nr.3/5/6 addenda.
- **Saved Kunden-Ansicht presets** — per-project named view shapes (visiblePositionIds + share-settings). One-click apply in the share dialog.

## Stack

- **Runtime** Node 22, ESM
- **HTTP** [Hono](https://hono.dev) + `@hono/node-server`
- **DB** SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team). Single-file `data/kalku.db` with WAL.
- **Auth** [jose](https://github.com/panva/jose) JWT, [bcryptjs](https://github.com/dcodeIO/bcrypt.js) password hash
- **Email** [nodemailer](https://nodemailer.com) — best-effort, returns `{ok,reason}` on failure
- **PDF** [pdfmake](https://github.com/bpampuch/pdfmake) — Roboto VFS lazy-registered
- **Validation** [zod](https://zod.dev) on every body input

## Routes (cheat-sheet)

```
POST   /api/panel/auth/login                     {email, password}             → {user}
POST   /api/panel/auth/logout                                                  → {ok}
GET    /api/panel/auth/me                                                      → {user}
POST   /api/panel/auth/change-password           {current, next>=12 chars}     → {ok}
PUT    /api/panel/auth/profile                   {name?, companyName?, ...}    → {user}

GET    /api/panel/projects                                                     → {projects[]}
POST   /api/panel/projects                       {name, client, ...}           → {project}
GET    /api/panel/projects/:id                                                 → {project, shares[]}
PUT    /api/panel/projects/:id                   {data, expectedUpdatedAt?}    → {project} (or 409 version_conflict)
DELETE /api/panel/projects/:id                                                 → {ok}

GET    /api/panel/projects/:id/presets                                         → {presets[]}
POST   /api/panel/projects/:id/presets           {name, visiblePositionIds, settings}
DELETE /api/panel/presets/:presetId

POST   /api/panel/projects/:id/shares            {visiblePositionIds, settings, parentShareId?}
GET    /api/panel/projects/:id/shares                                          → {shares[]}
DELETE /api/panel/shares/:shareId                                              → revoke (sets revoked_at)
GET    /api/panel/shares/:shareId/responses                                    → {responses[]}
GET    /api/panel/shares/:shareId/resnapshot-preview                           → {diff, currentVersion, proposedVersion, ...}
POST   /api/panel/shares/:shareId/resnapshot                                   → {snapshotVersion, snapshotHash}

GET    /api/panel/inbox                                                        → {entries[]} (joined projects+shares+responses)
GET    /api/panel/notifications/unread                                         → {count}
POST   /api/panel/notifications/mark-viewed                                    → {ok}
POST   /api/panel/digest/run        x-digest-secret: <DIGEST_SECRET>           → {ran:[...]}

# Public (token-gated, no auth):
GET    /api/panel/share/:token                                                 → customer view payload
GET    /api/panel/share/:token/pdf                                             → application/pdf
POST   /api/panel/share/:token/approve           {customerName, customerEmail?, message?}
POST   /api/panel/share/:token/changes           {customerName, changes[...]}
```

## Env vars

Copy `.env.example` → `.env` and fill in:

| Variable | Required | What |
|---|---|---|
| `JWT_SECRET` | **prod yes** | 64-char hex (`openssl rand -hex 32`). Server refuses to start in prod without it. |
| `SEED_EMAIL` | first-boot only | Initial owner login. Default `mani_golchin@kalku.de`. |
| `SEED_PASSWORD` | first-boot only | If unset, a random one is generated and printed (with `mustChangePassword: true`). |
| `SEED_COMPANY` | first-boot only | Optional. |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | no | If any unset, mailer silently logs `not_configured` (approval still succeeds, customer just doesn't get a receipt email). |
| `SMTP_FROM` | no | Default `KALKU Panel <noreply@kalku.de>`. |
| `DIGEST_SECRET` | no | Shared secret for cron-triggered digest. If unset, `/digest/run` returns 503. |
| `CORS_ORIGINS` | no | CSV. Default in dev: `http://localhost:5174,http://localhost:4173`. Prod: set explicitly to your domain(s). |
| `DB_PATH` | no | Default `./data/kalku.db`. |

## Cron / digest

Set `DIGEST_SECRET` then hit the endpoint from a host-side schedule:

```bash
# /etc/cron.d/kalku-panel-digest — weekday 07:00 CET
0 7 * * 1-5 admin curl -fsS -X POST -H "x-digest-secret: <SECRET>" -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/panel/digest/run
```

The endpoint is idempotent (`last_digest_sent_at` per user prevents repeats within 24 h) and only emails when there are events to report. On `not_configured` SMTP it returns 503 cleanly.

## Tests

```bash
npm test                    # node --test via tsx, 32 cases, 0 deps added
```

Covers the safe Aufmaß evaluator (17 cases including unbalanced-paren, /-by-0, German comma decimals), recomputePositions / buildShareSnapshot / diffSnapshots (10 cases including the prior-agent 50 × 140 = 7000 regression pin), and the audit chain (3 cases including direct-DB tamper detection).

## Position-type taxonomy

Each Position carries an optional `positionType`:

| Type | Default visible to customer | Use case |
|---|---|---|
| `standard` | ✓ | Normale Position |
| `wagnis` | ✗ (server-enforced) | Wagnis & Gewinn-Reserve |
| `reserve` | ✗ | Aufmaß-Puffer |
| `nu_marge` | ✗ | Subunternehmer-Aufschlag |
| `lohn_puffer` | ✗ | Stundenlohn-Reserve |

Server overwrites `visibleToCustomer` to `false` on every PUT for any internal type — clients cannot bypass.

## Aufmaß formula syntax

REB-23.003-lite. One measurement per line:

```
Wand 1     4.50 * 2.80
- Tür      2.10 * 1.00
Wand 2     3.20 * 2.80
```

Rules: annotation and math expression separated by **≥2 spaces or a tab**. A leading `-` on the line subtracts its absolute value. Decimals accept both `.` and `,`. Allowed operators: `+ - * / ( )`. Anything else is rejected by the tokenizer — no `eval`, no `Function`, no possibility of code execution.

The total is written to the position's `quantity` field on save. Manual quantity edits are blocked while a formula is active.
