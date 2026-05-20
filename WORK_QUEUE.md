# Work Queue — kalku-website

Add tasks here for Claude to work on autonomously. One task per line.

**Format:**
- `- [ ]` = not started
- `- [~]` = in progress (Claude marks this)
- `- [x] <sha>` = done (Claude marks this with the commit SHA)

**Tips for writing good queue items:**
- Be specific: name files, components, or routes when possible.
- Keep each item small enough to finish in ~30 min of work.
- If a task is destructive (deletes files, drops features), say so explicitly.
- If a task should NOT be done autonomously, don't put it here — discuss with Claude live instead.

---

## Active

- [ ] (add your first task here)

## BLOCKER — autonomous shift cannot run verification

- [!] **node/npm not on PATH in autonomous shell** — `npm run lint`, `npm run build`, and `npx tsc --noEmit` all fail with "command not found". Phase 2 cannot commit code fixes because nothing can be verified. **Action needed (human):** install Node via Homebrew (`brew install node`) or nvm and confirm `npm --version` works in the same shell that launches `claude`. Until then, audit iterations stay docs-only and mark features as "audited — flagged" rather than "fixed".

## Active — Feature audit (auto-generated)

Phase 2 (static audit) — one feature per iteration, priority order:
- [~] Phase 2: audit FristRechner.tsx
- [ ] FristRechner.tsx — a11y: add `id` on each input and `htmlFor` on each `<label>` (date, time, Bundesland select, Versand-Tage range). Pure JSX wiring change. Needs lint+build verification (gated on node/npm blocker).
- [ ] FristRechner.tsx — ICS UID stability: derive `UID` from event title + ISO date (e.g. `submission-20260519T110000@kalku.de`) so calendar apps deduplicate re-imports. Verify ICS still validates.
- [ ] FristRechner.tsx — clean up dead `tomorrow.setHours(11,0,0,0)` at line 174 (value is consumed via `.toISOString().slice(0,10)` which discards time). Rename `tomorrow` → `defaultSubmission` (it's +14 days, not +1).
- [ ] FristRechner.tsx — replace `new Date(date).toISOString().slice(0,10)` initial state with a local-time date string builder to avoid the near-midnight DST edge that can produce yesterday's date.
- [ ] Refactor: extract `CrossCta` from `src/pages/Mittellohn.tsx:476` into `src/components/sections/CrossCta.tsx`. Currently imported page-to-page by `FristRechner.tsx`. Touches every page that imports it.
- [x] Phase 2: audit Buergschaft.tsx
- [x] 6658d16 — Buergschaft.tsx division-by-zero on `gesamtAvalProz`. **Resolved by human between iterations.**
- [ ] Buergschaft.tsx — a11y: add `id`/`htmlFor` pairs on Vertragssumme/Mon/Jahre inputs and inside the `Slider` and `ResultCard` helpers. Each `Slider` instance needs a unique id (consider a `useId` hook). Gated on tooling blocker.
- [ ] Buergschaft.tsx — change `parseInt(e.target.value) || 0` to `parseFloat` for `erfuellungsLaufzeitMonate` and `gewaehrleistungsLaufzeitJahre` (lines 189, 203) so half-month/half-year laufzeit inputs aren't silently truncated, OR add `step={1}` so the browser blocks decimals.
- [~] Phase 2: audit GaebKonverter.tsx (+ src/lib/gaeb/*)

### GaebKonverter — CRITICAL (customer-promise mismatch)

- [x] 77a271c — GaebKonverter.tsx:248-252 silent-drop email form. **Resolved by human between iterations** by wiring through `src/lib/lead.ts` (new file: mailto + localStorage backup, designed so swapping to a real backend touches only that file). Same approach applied to Kalkulator (5cc13ed).

### GaebKonverter — confirmed via direct read

- [x] 28daee5 — GaebKonverter.tsx:136-140 dead `useEffect`. **Resolved.** Same commit also removed `void w` workaround in export.ts.
- [ ] src/lib/gaeb/parse.ts:155 — encoding detection threshold (`> 5` replacement characters) is a magic number; small files with 1–5 mojibake characters silently stay UTF-8. Switch to ratio-based detection (e.g. ≥1 replacement character per 200 bytes, or try both encodings and pick the one with fewer `�`).
- [ ] src/lib/gaeb/parse.ts:165 — `reader.onerror = () => reject(reader.error)` — `reader.error` can be null per spec. Reject with `new Error(reader.error?.message ?? 'FileReader fehlgeschlagen')` so the page's `e.message` fallback shows something useful.

### GaebKonverter — reported by audit agent (line refs verified, semantics still need a re-check before fixing)

- [ ] src/lib/gaeb/parseP.ts:182, 249-254 — `parseGermanNumber` returns NaN on empty input but callers assign it directly to `currentPos.menge`. NaN then propagates through `menge * ep` into `gp` and through `estimatedValue` (parseP.ts:55). Guard the reduce: `sum + (Number.isFinite(p.gp) ? p.gp! : 0)`, and either coerce NaN → 0 at parse time or filter in the sum.
- [ ] src/lib/gaeb/parseAscii.ts:157, 259 — same NaN propagation pattern into `totalSum`. Same fix.
- [ ] src/lib/gaeb/parseXml.ts:233-283 — ÖNorm branch never populates `groups`; the page's TOC button (GaebKonverter.tsx:215 area) therefore never appears for ÖNorm files. Either populate groups from `<Lg>`/`<Lggr>` parents or document the limitation in the UI.
- [ ] src/lib/gaeb/export.ts:147 — CSV escape replaces `\n` with spaces inside quoted fields, losing langtext paragraph breaks. Quoted CSV fields are allowed to contain literal newlines — just keep them.
- [ ] src/lib/gaeb/export.ts:502 — GAEB-90 OZ writer does `pos.replace(/\./g, '').slice(0,9)`. Spec field is exactly 9 chars; positions with deeper hierarchies (e.g. `01.02.03.999`) silently lose digits. Either truncate-with-warning or document the constraint.
- [ ] src/lib/gaeb/export.ts:359, 405 — dead `const w = doc.internal.pageSize.getWidth()` + the `void w;` workaround on line 405 in `drawCover`. Remove both.

### GaebKonverter — A11y

- [ ] GaebKonverter.tsx:514-521 + 828-837 — radio inputs are `sr-only` but the wrapping `<label>` lacks `htmlFor` and inputs lack `id`. Screen readers can't associate them with their option labels. Add `useId`-derived ids.
- [ ] GaebKonverter.tsx:633-639 — search input has only a placeholder; add `aria-label="Nach Position suchen"`.
- [ ] GaebKonverter.tsx:715-725 + 708-712 — email input lacks `aria-required`/`aria-invalid`; the success div lacks `aria-live="polite"` so SR users get no announcement on submit.

### GaebKonverter — UX (low priority)

- [ ] GaebKonverter.tsx:654 — position preview is capped at `.slice(0, 200)` with no UI message. Add a banner "Vorschau auf 200 Positionen begrenzt — Export enthält alle {N} Positionen" when total > 200.
- [ ] GaebKonverter.tsx:568-586 — column picker keeps kurztext/langtext checkboxes rendered with the note that they're controlled elsewhere; either disable them or remove them entirely to avoid confusion.
- [~] Phase 2: audit Kalkulator.tsx

### Kalkulator — CRITICAL (sister of GaebKonverter email-form bug)

- [x] 5cc13ed — Kalkulator.tsx:324-328 silent-drop email form. **Resolved by human** by wiring through `src/lib/lead.ts` (same utility used for GAEB).

### Kalkulator — confirmed via direct read

- [ ] Kalkulator.tsx:137-141 — localStorage rehydration accepts any `Array.isArray` + non-empty JSON. No validation that rows have the right shape. Future schema change or hand-edited storage → undefined fields → `computeEp` returns NaN. Either validate each row's keys + types before accepting, or version the storage key (`kalku.kalkulator.rows.v2`) so old data is dropped cleanly.
- [ ] Kalkulator.tsx:428-457 — a11y: table input cells (Pos./Beschreibung/Einheit + 5 NumCell inputs per row) lack `aria-label`. Column `<th>` headers help SR table navigation but cells themselves are unlabeled. Add `aria-label={`Position ${i+1}: Lohn`}` etc. per cell, or wrap in visually-hidden `<label>`.
- [ ] Kalkulator.tsx:277 — CSV export joins lines with `\n`. Excel on Windows expects `\r\n`. Change to `lines.join('\r\n')` for cross-platform consistency.
- [ ] Kalkulator.tsx:286-322 — `exportExcel` has no `catch` for the `await import('xlsx')` chunk load or the subsequent `XLSX.writeFile` call. If the dynamic chunk fails or the browser blocks the download, the user sees no feedback (try/finally only resets the loading state). Wrap with try/catch and surface an inline error.
- [ ] Kalkulator.tsx:237-240 — `pasteFromClipboard` header detection: `headerLikely = firstLohn === 48 && (text.includes('beschr') || text.includes('lohn'))`. If a real first row genuinely has `lohn=48` AND description contains "lohn" (e.g. "Lohnstundennachweis Pflasterer"), it's silently dropped as a header. Either check for *all* numeric cells being NaN (strong header signal) or always prompt the user.
- [~] Phase 2: audit Mittellohn.tsx

### Mittellohn — confirmed via direct read

- [x] 37fd03d — Mittellohn.tsx:145+169 export/display drift bug. **Resolved by human** — exports now use `effectiveLnk` consistently with the tooltip.
- [ ] Mittellohn.tsx:64-70 — same localStorage rehydration without schema validation as Kalkulator. Use shared validator or version the key.
- [ ] Mittellohn.tsx:244-272 — a11y on team-table inputs (Rolle/Stundensatz/Anzahl); add `aria-label` per cell.
- [ ] Mittellohn.tsx:332, 398 + BreakdownRow (lines 459-467) — `<label className="label">` blocks lack `htmlFor`; inputs lack `id`. Use `useId` per input.
- [ ] Mittellohn.tsx:148 — CSV joins lines with `\n`; should be `\r\n`. Same as Kalkulator (shared CSV helper would be cleaner).
- [ ] Mittellohn.tsx:157-181 — `exportExcel` has no `catch` for the `await import('xlsx')` chunk failure. Same as Kalkulator.
- [ ] Mittellohn.tsx:131-136 — `reset()` clears team/lohnnebenkosten/zulagen but leaves `breakdownOpen` and all `bnk*` values. If user reset while in detail-view, they see default team with their old breakdown still applied. Reset all of `breakdownOpen`, `bnkSv/Soka/Bg/Monats13/Sonst`, and `tarifgebiet`.
- [x] Phase 2: audit MultiStepForm.tsx — sweep, see findings below
- [x] Phase 2: audit Nav.tsx — sweep
- [x] Phase 2: audit ExitIntent.tsx — sweep
- [x] Phase 2: audit StickyMobileCta.tsx — sweep
- [x] Phase 2: audit SelfCheck.tsx — sweep, clean
- [x] Phase 2: audit WhatsAppFab.tsx — sweep, mostly clean
- [x] Phase 2: audit CalendlyEmbed.tsx — sweep
- [x] Phase 2: audit LeadMagnet.tsx — sweep
- [x] Phase 2: audit RoiBlock.tsx — sweep, math clean
- [x] Phase 2: audit SubmissionTriage.tsx — sweep, clean (intentional local-only)
- [x] Phase 2: audit FaqItem.tsx — sweep
- [x] Phase 2: audit remaining static pages — sweep (95% clean per agent; 4 flagged: Gewerk, Referenz, BlogPost, BlogIndex, Impressum)
- [x] Phase 2: audit remaining section components — sweep (all clean per agent)
- [ ] Phase 3: runtime audit per FEATURES.md after Phase 2 completes — **gated on `node`/`npm` tooling blocker** (see top of file)

### Forms & overlays — sweep findings (delegated scan, verified MultiStepForm + Impressum)

- [x] **MultiStepForm / LeadMagnet / ExitIntent — all RESOLVED.** Verified live 2026-05-20: `POST https://kalku.kalkus.de/api/forms/submit` returns `{ok:true,id:"..."}`. `kalku-api` container is up and healthy. `src/lib/lead.ts` + per-form fetch chains wire through to it; all three forms have mailto fallbacks. Whitepaper PDF served at canonical URL (20 833 bytes). Note: human-mediated SLA promises ("Werktag", "Checkliste") remain — softened LeadMagnet success copy.
- [ ] **Aggregate: build the `POST /api/forms/submit` endpoint once with a `type` discriminator** (`contact`, `lead-magnet-checklist`, `whitepaper`, plus 2 from the tool pages). Wire all 5 forms to it. Until the endpoint exists, hide the success-state copy that promises delivery, or fall back to a `mailto:` so leads aren't lost.

  **Architecture context (research, 2026-05-19):** The backend endpoint **does not exist anywhere in this repo.**
  - `package.json` has no server framework (no express/fastify/hono/koa/next). It's a pure Vite/React SPA.
  - There is no `api/` or `server/` directory; `direkt/` is an unrelated sibling SPA.
  - `Dockerfile` + [docker-compose.prod.yml](docker-compose.prod.yml) build the static bundle and serve it via nginx behind Traefik — no Node runtime present in the container, so even adding `/api/*` routes here wouldn't be served.
  - The intended architecture IS documented in detail: **[docs/06c-conversion-pipedrive.md:234-256](docs/06c-conversion-pipedrive.md)** specifies async-with-retry-queue (Browser → POST → own DB as source of truth → Worker pushes to Pipedrive with exponential backoff). Own DB table `form_submissions` is mandatory for DSGVO. This is a multi-day backend project, not a frontend tweak.
  - **Path naming is inconsistent across the codebase:** the design doc says `POST /api/forms/erstgespraech` (line 248), but `src/lib/constants.ts:194` exports `pipedriveWebhookPath: '/api/forms/submit'`, and the 5 TODOs in code also use `/api/forms/submit`. Pick one before implementing.
  - **Phase labels in TODOs match the planning structure**: MultiStepForm says "Phase 3.4", LeadMagnet + ExitIntent say "Phase 5" — these correspond to phases in [docs/06-phase2-plan.md](docs/06-phase2-plan.md). So the stubs are deliberate, not oversights.
  - **Practical short-term mitigation while the real backend is being built:** route the 3 highest-value forms (MultiStepForm, GaebKonverter, Kalkulator) to a third-party form forwarder (Formspree / Getform / Resend.com) so leads are at least collected. Cost is ~10 EUR/month; the alternative is silent loss.
- [ ] ExitIntent.tsx:83 — `role="dialog"` set but no focus trap; tab order can leak to background page. Add focus-trap + `inert` body, restore focus to trigger on close.
- [ ] ExitIntent.tsx:93-99 — close button missing `aria-controls` pointing to the dialog id.
- [ ] MultiStepForm.tsx:160, 195, 260… — inputs are wrapped in a `Field` component that owns labels but doesn't propagate `htmlFor`. Threading `useId` through the Field wrapper fixes every input in one change.
- [ ] Nav.tsx:65 — mobile hamburger has `aria-label` + `aria-expanded` (good) but focus isn't moved into the menu on open. Add `useEffect` to move focus to first menu item when expanded.
- [ ] StickyMobileCta.tsx:29-30 — region has `aria-label="Schnell-Kontakt"` but the icon-only links inside lack `aria-label`. Add labels per link.
- [ ] WhatsAppFab.tsx:14-19 — `useState(true)` defaults to "dismissed", then localStorage override fires on first render; brief flicker possible. Initialize state from localStorage in the lazy initializer rather than via effect.
- [ ] FaqItem.tsx:31 — question text is in a `<span>` inside a button; screen reader announces it as button text only. Wrap question in semantic `<h3>` (or `<h4>` depending on outer headings) inside the button for proper outline.
- [ ] CalendlyEmbed.tsx:18-19 — Calendly's `widget.js` script-load dedupe uses a DOM query but doesn't track in-flight async loads. Two embeds mounting simultaneously can both inject the script. Track a module-level boolean. Also note: external `assets.calendly.com` script load — confirm consent handling per GDPR before launch.
- [ ] RoiBlock.tsx:29 — hardcoded pricing tiers (`subs <= 1 ? 400 : subs <= 5 ? 3000 : 5000`). When prices change on `/konditionen`, this drifts silently. Pull from a shared constant (`src/lib/constants.ts`).

### Static pages — sweep findings

- [ ] **Gewerk.tsx + Referenz.tsx — slug validation missing.** Routes `/leistungen/:slug` and `/referenzen/:slug` accept any string. Gewerk redirects to index on unknown slugs (silent, no 404 status); Referenz renders the `_PagePlaceholder` for any value. Either reject unknown slugs to `<NotFound />` (preferred — preserves 404 status for SEO) or add a `<Helmet>` `noindex` for the placeholder render.
- [!] **Impressum.tsx:57 — public legal page contains the line "Vollständig juristisch geprüfte Fassung folgt in Phase 5 (Pre-Launch-QA)."** Customers inspect this page before signing. Remove the line and ship the final legal text now, OR move the page behind a noindex/staging banner until ready.
- [ ] BlogIndex.tsx:145 — newsletter section copy implies a sign-up form but the only action is `mailto:info@kalku.de`. Either build the signup form or rewrite the copy to match (no UI promise of an email-based feature that isn't built).
- [ ] BlogPost.tsx:24-40 — 404-fallback render path and "found-post" render path both use `<h1>`. They're mutually exclusive at runtime so the page never has two h1s simultaneously — minor — but the duplicate is a maintenance hazard. Demote the 404 fallback to `<h2>` inside a section that already has an h1.
- [ ] src/data/blog.tsx:205, 873 — hardcoded phone numbers in two article bodies. Match the NAP constant currently but won't auto-update if NAP changes. Replace with `{NAP.phone}` expression or pull into a small `<PhoneLink />` helper.
- [ ] All legal pages (Impressum, Datenschutz, AGB) — agent reports no `og:title`/`og:description`. Add `<meta property="og:..."`> via Helmet for share-preview consistency. Verify before fixing — agent didn't enumerate which tags Helmet currently sets.

## Active — Kalkulation / Panel audit (2026-05-20)

End-to-end review of the Bülent-login → panel → share-link → approve/changes flow.
P0 + the cheapest P1s shipped same-day; the rest are queued here. Findings are
verified against `panel-api/src/routes/*.ts`, `src/features/kalkulation/*`, and
`src/pages/ShareView.tsx`.

### Shipped in this audit (reference)

- [x] P0 — PositionTable decimal input. `src/features/kalkulation/PositionTable.tsx` NumCell + Menge cell now use editing-mode local draft string; commits on blur/Enter, escape reverts.
- [x] P1 — `replyTo` no longer falls back to owner login email. `panel-api/src/routes/public.ts:326` drops the `|| owner.email` fallback.
- [x] P1 — `api.auth.updateProfile` type extended to `companyPhone | companyContactEmail`. `src/lib/api.ts:86`.
- [x] P1 — `ShareView` replaced `window.alert` with `react-hot-toast.error` and disables Approve when `positions.filter(!isHeader).length === 0`.
- [x] P1 — Snapshot-divergence banner in `SharesCard` (heuristic: `project.updatedAt > share.snapshottedAt`).
- [x] P1 — Archiv tab labeled "Bald" so the placeholder page is obvious before clicking.

### P1 — server, must do before opening shares to real customers

- [ ] **Approve / changes idempotency.** `panel-api/src/routes/public.ts:192-393` accept unlimited duplicate POSTs (N rows, N audit events, N confirmation emails). Add `requestId TEXT` column on `share_responses`, client generates a UUID once per submit, server `INSERT OR IGNORE` against `UNIQUE(share_id, request_id)`. Add equivalent on `ShareView.submitApprove` / `submitChanges`.
- [ ] **Email-abuse on `/share/:token/approve`.** Customer-supplied `customerEmail` is the primary recipient of an "Annahmebestätigung" email from KALKU's reputable SMTP. No rate limit on this endpoint. Either restrict to `settings.customerEmail` (set by owner at share creation) OR add per-token + per-IP rate limiting to all `/share/:token/*` POST routes (10/hour/token feels right).
- [ ] **Audit-chain fork on concurrent inserts.** `panel-api/src/lib/audit.ts:50-89` reads tip then inserts without a transaction. Two parallel `recordAuditEvent` calls can produce identical `prev_hash`, silently forking the chain. Fix: wrap SELECT+INSERT in `db.transaction()` using better-sqlite3's `IMMEDIATE` mode + add `UNIQUE(prev_hash)` constraint on `audit_events`. Add a test case (`panel-api/test/audit.test.ts`) that spawns 10 concurrent inserts and verifies linear chain.
- [ ] **`X-Forwarded-For` blindly trusted.** `panel-api/src/lib/middleware.ts:31-35`, `lib/ratelimit.ts:20-21`. If the API is ever reachable without nginx (port leak, alt vhost), attacker rotates XFF per-request to evade login rate-limit and poison audit IPs. Add `TRUSTED_PROXY_CIDRS` env var; only honor XFF when request source matches.
- [ ] **Inbox: render position context not opaque ID slice.** `src/features/kalkulation/FeedbackInbox.tsx:163-165` shows `c.positionId.slice(0,8)`. Server should include `snapshotData.positions.filter(p => referenced)` in the inbox list endpoint; client should resolve `positionId → oz + shortText + gp` so the owner sees what the customer was commenting on. Touches `panel-api/src/routes/inbox.ts` shape + UI.

### P2 — server

- [ ] **`mustChangePassword` not enforced server-side.** `panel-api/src/lib/middleware.ts:13-29` returns the flag but `requireAuth` doesn't block other routes. Attacker with the initial admin-set password retains full API access. Fix: in `requireAuth`, when `user.mustChangePassword` and path is not `/auth/change-password|me|logout`, return `403 password_change_required`.
- [ ] **Login email-enumeration timing.** `panel-api/src/routes/auth.ts:42-49` — unknown email ~1ms, valid email ~80ms bcrypt. Run a dummy `bcrypt.compare(password, DUMMY_HASH)` when user is null to equalize latency.
- [ ] **Approve / revoke race.** `routes/public.ts:198-223` reads share, checks `revokedAt`, then inserts outside a transaction. Revoke landing between SELECT and INSERT still records the approval. Wrap in `db.transaction` with re-SELECT inside.
- [ ] **Digest secret timing-safe compare.** `panel-api/src/routes/notifications.ts:75-78` uses `!==`. Switch to `crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))` with length-padding.

### P2 — client UX

- [ ] **Inbox loading-error silent.** `FeedbackInbox.tsx:20-34` — API failure renders the "Noch keine Aktivität" empty state. Add a toast on catch and an inline "Erneut laden" affordance.
- [ ] **Auto-save state-machine race.** `ProjectDetail.tsx:96-103` — `setSavingState('saved')` + setTimeout to `idle`. New edit landing in the window flips state back to `idle` prematurely. Track saves with a monotonic generation counter; only clear "saved" if the gen at clear-time matches the gen that set it.
- [ ] **Version conflict has no "Neu laden" action.** `ProjectDetail.tsx:109-111` toasts but doesn't offer re-fetch. Add a toast action.
- [ ] **`ShareDialog` revoke uses `existing!` non-null assertion.** `ShareDialog.tsx:218`. Defensive null-check + remove the assertion.
- [ ] **`ShareDialog` resnapshot success diverges from server.** `ShareDialog.tsx:594` `onCreated({ ...resnapTarget, snapshotHash, snapshottedAt })` drops the new `snapshotVersion` / `viewCount` / other server fields. Refetch the share instead of locally merging.
- [ ] **`ShareDialog` line label `v2026-05-19`.** `ShareDialog.tsx:543` — rephrase to e.g. `Snapshot 19.05.2026` (German date order) or drop the "v" prefix.
- [ ] **`PositionTable` decorative drag handle.** `GripVertical` icon rendered but no DnD wiring. Either implement (recommended: `@dnd-kit/core`) or remove the handle so users don't try.
- [ ] **`Login.tsx` swallows network errors as 401.** `src/lib/auth.tsx:43-48` — distinguish 401 from 5xx/network and surface a banner.
- [ ] **`ShareView` Bindefrist crosses-midnight bug.** `ShareView.tsx:67-75` — `mountedAtMs` captured once. Re-compute via state + interval, or just compute on every render (no perf concern).

### P2 — calc / semantics

- [ ] **`zeitabzug` naming vs sign.** `src/features/kalkulation/calc.ts:42` — formula is `timeMinutes + (timeMinutes/100)*zeitabzug`. Positive `zeitabzug` *increases* time, but the German word "Abzug" means deduction. Either rename to `zeitZuschlag` (semantically positive=more time, default 0) or invert the formula to `-` and document. Default 0 hides the issue but it's a footgun.
- [ ] **`geraeteZuschlagPct` declared but unused.** `calc.ts:8` and `panel-api/src/schema.ts:173`. Either wire it into the formula (likely intended as a markup on geräte-stundensatz) or remove the field across schema + DEFAULT_CALC_PARAMS + ProjectDetail SettingsPanel.

### Backlog — bigger refactors / features

- [ ] **Real snapshot-staleness check** (replaces the heuristic banner shipped in this audit). Server endpoint `/api/panel/projects/:id/shares/:shareId/staleness` returns `{ stale: boolean, addedCount, removedCount, changedCount, netDelta }` based on `diffSnapshots` against current project. Client renders a richer banner with the delta.
- [ ] **Customer self-service: download the snapshot PDF without approving.** Currently `/share/:token/pdf` works but isn't surfaced before approval. Add a "Als PDF speichern" link in `ShareView` so the customer can keep a copy before deciding.
- [ ] **PDF visual proofread.** `panel-api/src/lib/pdf.ts` (`renderQuotePdf` + `renderCertificatePdf`) — eyebrow/heading baseline overlap was a problem in the marketing whitepaper PDF generator; check that the same y-advance bug isn't lurking here on long LVs.
- [ ] **Math: position-level rounding vs sum-then-round.** Current approach rounds `gp` per line then sums. Standard for invoicing, but if a project has many low-value lines the cumulative rounding error can be visible to customers comparing the sum manually. Optionally add a tooltip or footnote on the totals card.

## Active — Pre-launch audit (2026-05-20)

Full-site readiness audit across legal, forms, SEO, tools, infra. Items
shipped same-day are marked `[x]`; remainder queued by priority.

### Shipped same-day (reference)

- [x] Removed `<meta robots="noindex">` from Impressum / Datenschutz / AGB. Legal-required transparency pages must be Google-discoverable.
- [x] `public/robots.txt` now also disallows `/login`, `/panel/`, `/share/` (auth/token-gated, no SEO value).
- [x] `LeadMagnet.tsx` + `ExitIntent.tsx` submissions now carry `consent: true` + `consentText` string so the JSONL row in `api/server.js` is a self-contained DSGVO audit-trail record.
- [x] LeadMagnet success copy softened: "wir melden uns kurz und schicken Ihnen die Checkliste" (was: "binnen Minuten" — promised automation that doesn't exist).
- [x] `ReferenzenIndex.tsx` description: aligned "Gewerken" count to 10 (matches `TRADES` constant + LeistungenIndex title; the 18-case pool stays in `CaseStudies.tsx` but the meta-description no longer contradicts the brand claim).
- [x] `LeistungenIndex.tsx` description tightened (233 → 168 chars; was being SERP-truncated).
- [x] `GaebKonverter.tsx`: removed dead `useEffect` no-op block (lines 140-144) and unused `useEffect` import.

### BLOCKERS — need user input

- [ ] **Impressum: Rechtsform + Handelsregister missing.** `src/pages/Impressum.tsx:27-49` lists only "KALKU Baukalkulationen" without UG / GmbH / GbR / e.K. suffix and no HRB/HRA + Registergericht. **§5 Abs. 1 Nr. 4 TMG requires the registry entry** for any registered company. If KALKU is a sole-proprietorship, the legal name in `src/lib/constants.ts:3` must include the owner's full name or `e.K.`. Abmahn-Anwalt risk at any moment until corrected. **Decide and fix.**
- [ ] **AGB §3 vs marketing copy contradiction.** `src/pages/AGB.tsx:62-66` says Erfolgsprovision "in Höhe von 5 % **zusätzlich** zur Pauschale"; `src/lib/constants.ts:25` bullet says the provision is "**erst bei Auftragserteilung fällig**" — implying it replaces the pauschale. §305c BGB: ambiguity in AGB resolves against the drafter (KALKU). **Pick the actual contractual model and unify both surfaces.**
- [ ] **`it@kalku.de` vs `info@kalku.de` inconsistency.** NAP email is `info@kalku.de` (`src/lib/constants.ts:11`) but mailto fallbacks in `MultiStepForm.tsx:258`, `LeadMagnet.tsx:36`, `ExitIntent.tsx:131`, `lead.ts` (`LEAD_FALLBACK_EMAIL = 'it@kalku.de'`) all use `it@`. **Decide which address is canonical for customer-facing surfaces and unify.**

### HIGH — server / infra

- [ ] **OpenStreetMap iframes not disclosed in Datenschutz.** `src/pages/Kontakt.tsx:93` and `src/pages/UeberUns.tsx:361` embed OSM tiles; visitor's IP leaves the EU on every page-load. Either add a `§ OpenStreetMap` section to `src/pages/Datenschutz.tsx` (similar to the existing Plausible/Calendly/WhatsApp/Pipedrive blocks) **or** convert the iframe to a click-to-load wrapper.
- [ ] **`kalku-nginx-1` container on prod is in restart loop.** `docker ps` shows "Restarting (1) 44 seconds ago". The `-1` suffix and 2-week-old creation date suggest an orphan from another project's compose file. Verify it's not serving anything KALKU-related, then remove the orphan service. Use `docker compose -f docker-compose.prod.yml up -d --remove-orphans` after confirming.
- [ ] **`api/.env` on prod: confirm `SMTP_*` and `PIPEDRIVE_API_TOKEN` set.** Without those, leads still persist to `api/data/submissions.jsonl` and the API returns 200, but no notification email lands in the inbox and no Pipedrive lead is created. **Manual SSH check before launch.**

### HIGH — SEO polish

- [ ] **Per-page OG/Twitter tags missing on most non-Home pages.** `LeistungenIndex`, `Gewerk` (×10), `Ablauf`, `Konditionen`, `UeberUns`, `ReferenzenIndex`, `ToolsIndex`, 5 tool pages, `Kontakt`, `Impressum`, `Datenschutz`, `AGB` all only emit `<title>`/description/canonical. Result: every LinkedIn / WhatsApp share of e.g. `/konditionen/` renders the same Home OG card. Sweep all `<Helmet>` blocks; add `og:title`, `og:description`, `og:url` (Home and BlogPost already do this — copy the pattern).
- [ ] **6 more meta descriptions over the 160-char SERP cap** (LeistungenIndex + ReferenzenIndex already fixed). Tighten: `GaebKonverter.tsx:48` (193), `Home.tsx:46` (181), `NeuLanding.tsx:40` (179 — noindex, low priority), `Kalkulator.tsx:42` (175), `Konditionen.tsx:12` (172), `ToolsIndex.tsx:15` (163).
- [ ] **`Home.tsx:44` title is 80 chars** — SERPs will truncate after "Sie unterschreiben." Shorten to ≤60 if the key phrase can be kept.
- [ ] **`sitemap.xml` has no `<lastmod>`** — cheap crawl-priority win for blog posts especially.
- [ ] **`sitemap.xml` is hand-edited.** When a new blog post lands in `src/data/blog.tsx` the sitemap will silently desync. Add a tiny build-time script that emits sitemap.xml from `POSTS` + a route table.

### MEDIUM — UX / a11y / tool polish

- [ ] **Kalkulator CSV uses LF, not CRLF.** `src/pages/Kalkulator.tsx:435` — Excel-Windows shows everything in one cell. One-line fix.
- [ ] **`exportExcel` chunk-load has no `catch`** in `Kalkulator.tsx:444-496` and `Buergschaft.tsx:130-181`. If the dynamic `xlsx` chunk 404s (CSP / offline / proxy), button silently snaps back to idle with no feedback. Wrap in try/catch + inline error.
- [ ] **GAEB-90 OZ-truncation only `console.warn`s.** `src/lib/gaeb/export.ts:531-535` warns when a deep position-id (e.g. `01.02.03.999`) is sliced to 9 chars. Surface in the UI when export runs.
- [ ] **FristRechner Bindefrist slider missing `id`/`htmlFor` pair.** `src/pages/FristRechner.tsx:494-508` (other 4 fields are correctly wired).
- [ ] **Buergschaft Bareinbehalt inputs missing `id`/`htmlFor` pair.** `src/pages/Buergschaft.tsx:547-575` (main 3 fields are correctly wired).
- [ ] **Mittellohn uses `window.confirm` for reset + preset load.** `src/pages/Mittellohn.tsx:221, 236`. Kalkulator already uses a modal; align Mittellohn for consistency.
- [ ] **Internal `HINWEIS (intern)` JS comments at the top of `Impressum.tsx`, `Datenschutz.tsx`, `AGB.tsx`.** Not rendered to users but should be deleted for hygiene before the final cut-over (and to avoid grep-leaks).
- [ ] **`pipedriveWebhookPath` constant** in `src/lib/constants.ts:194` is exported but never imported. Remove or wire up.

### Optional — bigger refactors

- [ ] **404 returns HTTP 200** because the SPA serves `index.html` for any unknown path. `<meta robots="noindex">` on the NotFound component already prevents Google indexing — so this is OK for SEO — but actual HTTP 404 would be cleaner. Requires nginx route map (allowlist of real routes) or moving to SSR. Not a launch blocker.

## Active — Mobile responsiveness audit (2026-05-20)

Full sweep of 25+ pages/components for 360–414px viewport behaviour.
0 blockers. The high-impact fixes shipped same-day; remainder queued.

### Shipped same-day (reference)

- [x] `StickyMobileCta.tsx`: outer div now carries `pb-[env(safe-area-inset-bottom)]` so the CTA strip doesn't hide behind the iOS home-bar gesture area.
- [x] `StickyMobileCta.tsx` close-X moved out of the CTA strip and grown to 44×44 (was 28×28 sitting on top of the WhatsApp tap zone — fat-finger risk). Now a floating pill `-top-3 right-1` with a thin border.
- [x] `ShareView.tsx` sticky bottom totals bar: same `pb-[env(safe-area-inset-bottom)]` so "Annehmen" doesn't get eaten by iOS home-bar. Customer-facing page, most likely opened on a phone.
- [x] `ShareView.tsx` PDF + Annehmen buttons: 44×44 minimum on mobile (was ~30 tall), enforced via `min-w-[44px] min-h-[44px]` that resets at `sm:`.
- [x] `Footer.tsx` social-icon links: 36×36 → 44×44 (`w-9 h-9` → `w-11 h-11`) to meet the WCAG touch-target floor.
- [x] `FristRechner.tsx:522` `text-[10px]` → `text-xs` (below readability threshold on small screens).

### MEDIUM — queued

- [ ] **`Footer.tsx:50` columns jump from 1 to 2 (at `md:`) and 2 to 5 (at `lg:`).** At iPad portrait the brand column claims `lg:col-span-2` worth of width because lg-only spans are ignored, but the link columns still render under brand as 1-col. Either change to `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5` for smoother reflow, or accept the current behaviour as acceptable (it works; just not elegant).
- [ ] **`Home.tsx:74` hero padding `py-16` (=128 px) eats too much viewport on 360×640 phones.** Consider `py-10 sm:py-16 lg:py-24`. Same applies to other landing-style sections with `section` utility (likely `py-16` baseline in `index.css`).
- [ ] **`MultiStepForm.tsx:738` step-progress columns are tight at 360 px.** `w-20 sm:w-28` + label `max-w-[110px]` with 3 columns + 2 connector lines on a ~312 px content width. Works but the label "Bestätigung & Terminbuchung" wraps to 3 lines. Either shorten the label on mobile, or render only the current step's label.
- [ ] **`Footer.tsx:74-95` NAP-block icons (MapPin/Phone/Mail) lack `aria-hidden="true"`.** Screen reader announces them as decorative-image noise alongside the visible label. Minor a11y polish.
- [ ] **`PositionTable` in `src/features/kalkulation/PositionTable.tsx`** — already inside `overflow-x-auto`, so horizontal scroll is the intended behaviour on phones. Adding a small "← Wischen für mehr →" hint would improve discoverability for first-time users on a phone. Not a bug.

### Tested and OK

- Viewport meta tag set correctly (`width=device-width, initial-scale=1.0`).
- 161 `sm:`, 30 `md:`, 79 `lg:` Tailwind responsive utilities in use; H1s are uniformly `text-4xl sm:text-5xl lg:text-6xl` — no oversized hero text on phones.
- Tables in tool pages all sit inside `overflow-x-auto`; phone users scroll horizontally rather than hitting a broken layout.
- `Nav.tsx` hamburger: 44×44 hit area, focus moves into the menu on open (prior WORK_QUEUE concern resolved at `Nav.tsx:46-56`).
- `ExitIntent.tsx` dialog: `max-w-lg w-full` inside a `px-4` backdrop = always has edge padding on phones.
- `StickyMobileCta.tsx` CTA links all have visible text + `aria-hidden` on icons — accessible without needing `aria-label`.

## Backlog

(longer-term ideas, lower priority)

## Done

(Claude moves completed items here at end of each day, oldest first)
