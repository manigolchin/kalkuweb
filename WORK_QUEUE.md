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
- [ ] Phase 2: audit GaebKonverter.tsx (+ src/lib/gaeb/*)
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
