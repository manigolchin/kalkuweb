# Work Log — kalku-website

Append-only log of every autonomous work iteration. Most recent at top.
Format defined in `CLAUDE.md`.

---

## 2026-05-19 21:30 — Reconcile state with 5 human commits, mark resolved items
- Source: continuing the loop re-entry after research commit; noticed via `git log 7444a67..HEAD` that the human committed 5 fixes between my prior shift end and this iteration (6658d16, 37fd03d, 77a271c, 5cc13ed, 28daee5).
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; FEATURES.md and WORK_QUEUE.md updated to mark resolved items with their SHAs.
- Notes: Human fixed (1) Buergschaft div-by-zero, (2) Mittellohn export-drift, (3) GAEB-Konverter email no-op via new `src/lib/lead.ts` (mailto + localStorage backup), (4) Kalkulator email no-op via the same lead.ts, (5) dead useEffect + unused width + void workaround in GaebKonverter/export.ts. Three of the original 5 critical no-op lead forms remain: MultiStepForm (main contact, Phase 3.4 TODO), LeadMagnet (checklist, Phase 5 TODO), ExitIntent (whitepaper, Phase 5 TODO). All other tooling-blocker-gated items still gated. **Stopping the loop** — Phase 1 + 2 complete, Phase 3 still blocked on node/npm, and the queue's remaining items are either gated on tooling or are larger product decisions for the human (build the backend, route remaining 3 forms through lead.ts, kill the Phase-5 disclaimer in Impressum, etc.). No PushNotification — user is here.

## 2026-05-19 21:28 — Maintenance research: form-backend architecture (loop re-entry)
- Source: /loop re-entered with same prompt; Phase 1 + Phase 2 already complete, Phase 3 blocked on tooling. Switched to a Research maintenance task.
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; expanded the "Aggregate: build the endpoint" queue item with architecture findings.
- Notes: Investigated whether the missing `/api/forms/submit` backend exists anywhere. Findings: it doesn't — this repo is a pure Vite/React SPA, no server framework in package.json, no api/ or server/ directory, Dockerfile + docker-compose.prod.yml build a static bundle served via nginx behind Traefik (no Node runtime). However, the architecture IS specified in detail in [docs/06c-conversion-pipedrive.md](docs/06c-conversion-pipedrive.md): async-with-retry-queue, own DB `form_submissions` as source of truth, worker pushes to Pipedrive with backoff. Path naming is inconsistent: design says `/api/forms/erstgespraech`, code constant + TODOs say `/api/forms/submit`. Phase labels in TODOs (3.4, 5) match [docs/06-phase2-plan.md](docs/06-phase2-plan.md) so the stubs are deliberate. Practical mitigation queued: route highest-value forms to a 3rd-party forwarder while the real backend is built. Tooling blocker (node/npm) still active — stopping the loop after this iteration since nothing else moves without it.

## 2026-05-19 21:16 — Phase 2 sweep: remaining 50+ files (3 more critical no-op forms found)
- Source: user typed "continue till end"; batched the remaining queue
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; all remaining Phase 2 items marked. Phase 3 gated on tooling blocker.
- Notes: Delegated two parallel Explore agents — one on forms/overlays (13 files), one on static pages + sections (50+ files). Verified the two most consequential agent claims via direct read: **MultiStepForm.tsx:114-116 is intentionally stubbed (setTimeout(600ms) then setSent(true), TODO names Pipedrive backend); Impressum.tsx:57 contains public "Phase 5 Pre-Launch-QA" disclaimer.** Site-wide tally: **5 broken lead-capture forms** (GAEB-Konverter, Kalkulator, MultiStepForm/main contact, LeadMagnet checklist, ExitIntent whitepaper). All three new ones carry `// TODO Phase X backend` and were never wired. Filed a single combined fix item: build `POST /api/forms/submit` with a `type` discriminator and wire all 5 to it. Other items: Gewerk/Referenz lack slug validation, BlogPost has duplicate h1 across render branches, BlogIndex newsletter is mailto-only, hardcoded phone in 2 blog articles, Calendly script-dedup race, RoiBlock hardcodes pricing, several a11y items in MultiStepForm/Nav/StickyMobileCta/FaqItem/ExitIntent. **Phase 2 complete; Phase 3 (runtime) remains blocked on node/npm not being on PATH.**

## 2026-05-19 21:10 — Phase 2: static audit Mittellohn.tsx (export-drift bug)
- Source: WORK_QUEUE Phase 2 next item; user typed "continue till end"
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; Mittellohn marked "audited — flagged"
- Notes: Math correct (div-by-zero guarded with `|| 1`). No email-form no-op here. Real bug: exportCsv/Excel always use raw `lohnnebenkosten`, ignoring breakdown mode — display 82% but CSV/Excel record 78%. Same a11y / localStorage / CSV `\n` / exportExcel-no-catch pattern as Kalkulator. Reset doesn't clear breakdown state. Phase 2 push continuing — next: parallel-delegated batch scan of remaining forms + overlays + sections.

## 2026-05-19 21:04 — Phase 2: static audit Kalkulator.tsx (sister CRITICAL find)
- Source: WORK_QUEUE Phase 2 next item; user typed "continue"
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; Kalkulator marked "audited — flagged"
- Notes: EP/GP math is verified correct (lohnTotal + materialTotal = total because both carry zuschlag uplift). Email input on this page DOES have proper htmlFor/useId (better than FristRechner). But the same critical no-op submitEmail pattern exists — second silent-drop lead form on the site. Other items: localStorage rehydration accepts any JSON shape; table input cells lack aria-label; CSV uses \n instead of \r\n (Excel/Win compatibility); exportExcel has no catch for dynamic-import failure; pasteFromClipboard header heuristic is brittle.

## 2026-05-19 21:00 — Phase 2: static audit GaebKonverter.tsx + src/lib/gaeb/* (CRITICAL find)
- Source: WORK_QUEUE Phase 2 next item; user typed "continue"
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; GaebKonverter marked "audited — flagged"
- Notes: Delegated initial scan to an Explore agent (2.5k LoC across page + lib), then verified the top 4 claims via direct read. **Critical: submitEmail (page line 248-252) is a no-op while the UI promises 1-2-day email delivery (line 711) and "Datei nach 30 Tagen gelöscht" (line 729). Every lead since this shipped has been silently dropped.** Filed prominently in WORK_QUEUE under "CRITICAL". Other confirmed issues: dead useEffect at 136-140, magic-number encoding threshold in parse.ts:155, FileReader null-error reject at parse.ts:165. Agent also flagged ~10 more items (NaN propagation in parsers, CSV newline stripping, GAEB-90 OZ truncation, ÖNorm groups not populated, a11y on radios/search/email) — line refs filed verbatim for next-pass verification. Tooling blocker still gates all fixes.

## 2026-05-19 20:57 — Phase 2: static audit Buergschaft.tsx (BLOCKED on tooling for fixes)
- Source: WORK_QUEUE Phase 2 next item; user typed "claude --auto --remote-control" which I treated as "keep going" (not a recognized CLI invocation; already in auto mode)
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; Buergschaft marked "audited — flagged"
- Notes: Math is correct (bond face × annual avalrate × months/12 or × years). Found 3 issues: division-by-zero on gesamtAvalProz when vertragssumme=0 (real bug — affects 3 render sites); same a11y label/id pattern as FristRechner; integer truncation on Mon/Jahre inputs. CrossCta cross-import already queued. Tooling blocker still in force.

## 2026-05-19 20:58 — Phase 2: static audit FristRechner.tsx (BLOCKED on tooling for fixes)
- Source: WORK_QUEUE Phase 2 top item
- Branch: claude-auto/2026-05-19-feature-audit-phase1 (continued)
- Result: docs-only commit; FristRechner marked "audited — flagged"
- Notes: BLOCKED — `node`/`npm` not on PATH in this shell, so `npm run lint`, `npm run build`, and `npx tsc --noEmit` cannot run. Per CLAUDE.md "never commit broken code", I won't ship unverified code changes. Did a static read instead: found 6 issues (a11y label/id pairing on date/time/select/range inputs; unstable ICS UID; off-by-one near midnight on toISOString().slice(0,10); dead setHours on initial state; misleading `tomorrow` name; page-to-page import of CrossCta from Mittellohn). All filed in WORK_QUEUE for the next shift once tooling is restored. Real commit SHA (Phase 1) for prior log entry was 3b9906f after amend.

## 2026-05-19 20:50 — Feature audit Phase 1: inventory
- Source: user-directed audit shift (feature-audit kickoff)
- Branch: claude-auto/2026-05-19-feature-audit-phase1
- Result: committed 25a6407 — created FEATURES.md
- Notes: Inventoried 22 routes, 5 interactive tool pages, 3 layout components, 5 global overlays, 31 section components, 1 multi-step form, and 4 UI primitives. All marked `untested`. Next iteration begins Phase 2 (static audit) starting with interactive tool pages.

## 2026-05-19 — Autonomous mode initialized
- Source: setup
- Branch: main (setup only, no code changes)
- Result: created CLAUDE.md, WORK_QUEUE.md, WORK_LOG.md
- Notes: Project is now configured for autonomous operation. Human should add tasks to WORK_QUEUE.md and start a `claude` session with `/loop` to begin the shift.
