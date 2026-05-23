# TEST_RESULTS — qa/full-suite-2026-05-23

## Final tally — all green

```
=== frontend (vitest) ===
 Test Files  3 passed (3)
      Tests  186 passed (186)

=== panel-api (node:test via tsx) ===
# tests 103
# pass 103
# fail 0
```

**289 / 289 passing** (256 new + 33 pre-existing). 0 failures, 0 skipped.

## Pass-rate, before vs after

| Surface         | Before suite | After fixes |
|-----------------|--------------|-------------|
| calc            | (no tests)   | 60 / 60     |
| excelImport     | (no tests)   | 75 / 75     |
| gaeb parsers    | (no tests)   | 51 / 51     |
| panel-api       | 33 / 33      | 103 / 103   |
| **Total**       | **33 / 33**  | **289 / 289** |

## Bugs found and fixed (10)

Listed in chronological discovery order. Full diagnosis + fix in FIXES.md.

| ID    | Severity | Surface       | Bug                                                                                                  |
|-------|----------|---------------|------------------------------------------------------------------------------------------------------|
| F-001 | HIGH     | excelImport   | 8 missing German LV column names in synonym dictionary (caused user's LV3.xlsx auto-detect failure)  |
| F-002 | MEDIUM   | excelImport   | Auto-map threshold 40 excluded legitimate 3-char prefix matches like `min`→`minstck`                 |
| F-003 | HIGH     | excelImport   | Header-row picker took first ≥2-cell row → mis-picked LV-banner ("Projekt:" + value) rows            |
| F-005 | MEDIUM   | excelImport   | All-blank Excel produced empty result silently instead of throwing a clear error                     |
| F-006 | HIGH     | excelImport   | Auto-map algorithm was greedy field-by-field → weak prefix match could steal an exact match later in iteration |
| F-007 | MEDIUM   | parseXml      | GAEB Eventualposition attribute never read despite the Position type carrying the field              |
| F-008 | MEDIUM   | parseXml      | GAEB Zuschlagsposition attribute never read despite the Position type carrying the field             |
| F-009 | MEDIUM   | panel-api/auth | Login timing oracle — unknown email returned in ~1 ms, known email took ~64 ms (bcrypt)             |
| F-010 | LOW      | panel-api/auth | Password change accepted next == current; mustChangePassword gate could clear without real change   |

(F-004 was a test-only fix — see FIXES.md.)

## Bugs surfaced but not fixed

None. All discovered failures resolved.

## Notes on test environment

- **Frontend**: vitest 4 with `@` alias resolved via vitest.config.ts. `happy-dom` polyfills DOMParser for the GAEB-XML parser tests; no other DOM is needed (the parsers themselves are pure functions; production uses the browser's native DOMParser).
- **Backend**: `tsx --test test/*.test.ts` (Node's built-in runner) — same as the pre-existing audit/aufmass/snapshot suites. Each test file gets its own tmp-dir SQLite via `DB_PATH` set before importing `src/db.ts`. Tests drive the Hono app via `app.request(url, init)`; no HTTP listener.
- **Permissive rate limit** is used during tests so rapid login attempts in S-001..S-010 don't trip the 10/15min production limit.
- **Mailer is intentionally `not_configured`** in test env; approve flow logs a warn but still records the audit event.

## Diff summary (this branch vs main)

```
 FIXES.md                                           |  +160
 PROGRESS.md                                        |   +60
 TEST_PLAN.md                                       |  +330
 TEST_RESULTS.md                                    |  +110
 package.json                                       |    +3
 panel-api/src/lib/auth.ts                          |    +9
 panel-api/src/routes/auth.ts                       |   +12
 panel-api/test/auditchain.test.ts                  |  +new
 panel-api/test/auth.test.ts                        |  +new
 panel-api/test/helpers.ts                          |  +new
 panel-api/test/middleware.test.ts                  |  +new
 panel-api/test/projects.test.ts                    |  +new
 panel-api/test/public.test.ts                      |  +new
 panel-api/test/responses.test.ts                   |  +new
 panel-api/test/shares.test.ts                      |  +new
 panel-api/test/templates-presets.test.ts           |  +new
 src/features/kalkulation/excelImport.ts            |   +90 / −30
 src/lib/gaeb/parseXml.ts                           |    +4
 tests/calc/calc.test.ts                            |  +new
 tests/excelImport/excelImport.test.ts              |  +new
 tests/gaeb/gaeb.test.ts                            |  +new
 vitest.config.ts                                   |  +new
```

## Decision: merge to main?

User picked option A (branch-then-merge) with the standing instruction to push
and merge when done. Merging.
