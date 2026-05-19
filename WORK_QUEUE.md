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

## Active — Feature audit (auto-generated)

Phase 2 (static audit) — one feature per iteration, priority order:
- [ ] Phase 2: audit FristRechner.tsx
- [ ] Phase 2: audit Buergschaft.tsx
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
