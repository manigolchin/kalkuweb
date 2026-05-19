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
- [ ] Phase 2: audit Kalkulator.tsx
- [ ] Phase 2: audit Mittellohn.tsx
- [ ] Phase 2: audit MultiStepForm.tsx
- [ ] Phase 2: audit Nav.tsx
- [ ] Phase 2: audit ExitIntent.tsx
- [ ] Phase 2: audit StickyMobileCta.tsx
- [ ] Phase 2: audit SelfCheck.tsx
- [ ] Phase 2: audit WhatsAppFab.tsx
- [ ] Phase 2: audit CalendlyEmbed.tsx
- [ ] Phase 2: audit LeadMagnet.tsx
- [ ] Phase 2: audit RoiBlock.tsx
- [ ] Phase 2: audit SubmissionTriage.tsx
- [ ] Phase 2: audit FaqItem.tsx
- [ ] Phase 2: audit remaining static pages (Home, NeuLanding, LeistungenIndex, Gewerk, Ablauf, Konditionen, UeberUns, ReferenzenIndex, Referenz, ToolsIndex, BlogIndex, BlogPost, Kontakt, Impressum, Datenschutz, AGB, NotFound) — one per iteration
- [ ] Phase 2: audit remaining section components (sweep — group several per iteration if trivial)
- [ ] Phase 3: runtime audit per FEATURES.md after Phase 2 completes

## Backlog

(longer-term ideas, lower priority)

## Done

(Claude moves completed items here at end of each day, oldest first)
