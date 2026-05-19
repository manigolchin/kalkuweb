# Work Log — kalku-website

Append-only log of every autonomous work iteration. Most recent at top.
Format defined in `CLAUDE.md`.

---

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
