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
- [~] Phase 2: audit Buergschaft.tsx
- [ ] Buergschaft.tsx — **bug**: division-by-zero on `gesamtAvalProz` (line 76) when `vertragssumme === 0`. Guard with `vertragssumme > 0 ? (gesamtAvalKosten / vertragssumme) * 100 : 0`, OR raise `min={0}` to `min={1}` on the input (line 142). Gated on tooling blocker.
- [ ] Buergschaft.tsx — a11y: add `id`/`htmlFor` pairs on Vertragssumme/Mon/Jahre inputs and inside the `Slider` and `ResultCard` helpers. Each `Slider` instance needs a unique id (consider a `useId` hook). Gated on tooling blocker.
- [ ] Buergschaft.tsx — change `parseInt(e.target.value) || 0` to `parseFloat` for `erfuellungsLaufzeitMonate` and `gewaehrleistungsLaufzeitJahre` (lines 189, 203) so half-month/half-year laufzeit inputs aren't silently truncated, OR add `step={1}` so the browser blocks decimals.
- [~] Phase 2: audit GaebKonverter.tsx (+ src/lib/gaeb/*)

### GaebKonverter — CRITICAL (customer-promise mismatch)

- [!] **GaebKonverter.tsx:248-252 — `submitEmail` is a no-op but UI promises an email.** The form's success state (line 711) tells the user "wir senden Ihnen die Auswertung an {email} innerhalb von 1–2 Werktagen" and the small print at line 729 claims "Datei wird nach 30 Tagen automatisch gelöscht" (implying upload). The code only does `setSubmitted(true)`. There is no fetch/upload/email send anywhere. **Every lead since this shipped has been silently dropped.** Either wire it to a real endpoint (per CLAUDE.md I won't pick one autonomously — needs human direction on which form backend / Calendly / Notion / custom API), or change the success copy to match reality (e.g. "wir melden uns" → only works if the email is stored client-side somewhere and used later; right now it isn't even logged).

### GaebKonverter — confirmed via direct read

- [ ] GaebKonverter.tsx:136-140 — dead `useEffect` with a no-op body (only a `// No-op` comment). Remove it. Trivial fix; gated on tooling blocker only because of the "verify before commit" rule.
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

- [!] **Kalkulator.tsx:324-328 — `submitEmail` is a no-op but UI promises a reply.** Success state at line 554 says "Sie erhalten unsere Einschätzung innerhalb von 1–2 Werktagen." The function only does `setEmailSent(true)`. **Second silent-drop lead form on the site** (GAEB Konverter has the same bug). Fix together: one shared form-submit utility wired to the same backend.

### Kalkulator — confirmed via direct read

- [ ] Kalkulator.tsx:137-141 — localStorage rehydration accepts any `Array.isArray` + non-empty JSON. No validation that rows have the right shape. Future schema change or hand-edited storage → undefined fields → `computeEp` returns NaN. Either validate each row's keys + types before accepting, or version the storage key (`kalku.kalkulator.rows.v2`) so old data is dropped cleanly.
- [ ] Kalkulator.tsx:428-457 — a11y: table input cells (Pos./Beschreibung/Einheit + 5 NumCell inputs per row) lack `aria-label`. Column `<th>` headers help SR table navigation but cells themselves are unlabeled. Add `aria-label={`Position ${i+1}: Lohn`}` etc. per cell, or wrap in visually-hidden `<label>`.
- [ ] Kalkulator.tsx:277 — CSV export joins lines with `\n`. Excel on Windows expects `\r\n`. Change to `lines.join('\r\n')` for cross-platform consistency.
- [ ] Kalkulator.tsx:286-322 — `exportExcel` has no `catch` for the `await import('xlsx')` chunk load or the subsequent `XLSX.writeFile` call. If the dynamic chunk fails or the browser blocks the download, the user sees no feedback (try/finally only resets the loading state). Wrap with try/catch and surface an inline error.
- [ ] Kalkulator.tsx:237-240 — `pasteFromClipboard` header detection: `headerLikely = firstLohn === 48 && (text.includes('beschr') || text.includes('lohn'))`. If a real first row genuinely has `lohn=48` AND description contains "lohn" (e.g. "Lohnstundennachweis Pflasterer"), it's silently dropped as a header. Either check for *all* numeric cells being NaN (strong header signal) or always prompt the user.
- [~] Phase 2: audit Mittellohn.tsx

### Mittellohn — confirmed via direct read

- [ ] **Mittellohn.tsx:145 + 169 — export/display drift bug.** `exportCsv` and `exportExcel` use the raw `lohnnebenkosten` slider value, but the on-screen "Mittellohn ASL" uses `effectiveLnk = breakdownOpen ? breakdownTotal : lohnnebenkosten` (line 103). Effect: user in detail-view (breakdown total 82%) sees ASL based on 82% but the CSV/Excel record 78% (the stale slider value). Fix: replace both `lohnnebenkosten` references in the exports with `effectiveLnk`, and add an explicit row for the breakdown components when `breakdownOpen`.
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

- [!] **MultiStepForm.tsx:114-116 — main contact form is intentionally stubbed.** The submit handler is `await new Promise((r) => setTimeout(r, 600))` followed by `setSent(true)`. The success screen (line 130) tells the customer "Wir haben deine Anfrage erhalten und melden uns innerhalb eines Werktags telefonisch unter {data.telefon}." The TODO at line 114 names the intended destination: `// TODO Phase 3.4 backend: POST /api/forms/submit (Pipedrive async push + retry queue)`. **This is the site's primary contact form. Every submission since launch has been silently dropped.** Combined with GAEB-Konverter (a8212a7) and Kalkulator (aa507db), that's **3 product-defining lead forms broken at the time of audit**.
- [!] **LeadMagnet.tsx:12 — "Checkliste per Mail" form is stubbed.** TODO names `POST /api/forms/submit type=lead-magnet-checklist`. Success copy at line 71 promises "Wir senden die Checkliste binnen weniger Minuten" but no fetch exists.
- [!] **ExitIntent.tsx:74 — Exit-intent whitepaper form is stubbed.** TODO names `POST /api/forms/submit type=whitepaper`. Success copy at line 109 promises "Wir senden Ihnen das Whitepaper an {email} innerhalb der nächsten Minuten" but no fetch exists.
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

## Backlog

(longer-term ideas, lower priority)

## Done

(Claude moves completed items here at end of each day, oldest first)
