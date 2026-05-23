# FIXES — qa/full-suite-2026-05-23

Every production-code change made in response to a failing test. One block per fix.

---

## F-001 · excelImport.ts synonym dictionary — 7 missing German LV column names

**Failing tests:** E-029 (Posten), E-033 (Vordersatz), E-034 (Vord.-Menge),
E-036 (Aufmaß), E-048 (Stunden), E-049 (Std/EH), E-053 (Fremdleistung),
E-054 (Sub-Unternehmer)

**File:** `src/features/kalkulation/excelImport.ts:36-46` — `SYNONYMS` Record

**Cause:** dictionary built from generic LV references missed several real-world
German Bau-LV column names. The user's LV3.xlsx hit this directly — auto-detect
returned all-nulls in the dialog.

**Change:** added `posten` to shortText; `vordersatz`, `vordmenge`, `aufmass`,
`aufmaß` to quantity; `stunden`, `std`, `stdeh`, `stde` to timeMinutes;
`fremdleistung`, `fremd`, `subunternehmer`, `sub` to nuCost. Also dropped
single-letter `'m'` from quantity (was eating "ME" headers).

## F-002 · excelImport.ts auto-map threshold + scoring

**Failing tests:** E-050 (Min/Stck — was scoring 38.6, below threshold 40)

**File:** `src/features/kalkulation/excelImport.ts:122-149` — `autoMapColumns`

**Cause:** Threshold of 40 excluded legitimate 3-char prefix matches like
`min`→`minstck`. Combined with the single-letter `m` removal, lowering to 35 is
safe.

**Change:** threshold 40 → 35.

## F-003 · excelImport.ts header-row detection — banner-row false-positive

**Failing test:** E-004 (LV3-style "Projekt:" + value banner above real headers)

**File:** `src/features/kalkulation/excelImport.ts:80-91` — header row scan

**Cause:** picked the FIRST row with ≥2 non-empty cells. A 2-cell banner row
("Projekt:" + project name, "Stand:" + date, etc.) trips this — exactly the
LV3.xlsx pattern the user reported. The result was empty mapping + empty
preview.

**Change:** replaced first-row heuristic with a score-based picker that prefers
rows whose cells match known synonyms. Scoring: synonym hits × 5 + non-empty
count − row index × 0.5. Scans first 15 rows.

## F-004 · TEST FIX (not production) — E-013 empty-workbook expectation

**Failing test:** E-013 (file with no sheets throws)

**File:** `tests/excelImport/excelImport.test.ts`

**Cause:** SheetJS's `xlsx.write` on a workbook with `book_new()` refuses to
write. Test rewritten to "workbook with only blank cells" — which surfaced a
SEPARATE bug (#F-005).

## F-005 · excelImport.ts — silent success on blank-only workbook

**Failing test:** E-013

**File:** `src/features/kalkulation/excelImport.ts:104-110` — `parseSheet` tail

**Cause:** A workbook with cells but all blank produced
`{ headers: [], rows: [] }` silently. User would see "no positions imported"
with no error message.

**Change:** added `if (headers.length === 0 && rows.length === 0) throw …`
with a clear German message.

## F-006 · excelImport.ts — auto-map algorithm rewrite (global best-first)

**Failing tests:** E-029 (Posten), E-030 (Langtext), E-039 (ME),
E-053 (Fremdleistung), E-054 (Sub-Unternehmer)

**File:** `src/features/kalkulation/excelImport.ts:118-180` — `autoMapColumns`

**Cause:** The original algorithm iterated FIELDS in declaration order, and
each field greedily claimed the best-matching header from the pool. This let
an earlier field claim a header with a weak prefix match (e.g. `oz`'s `pos`
matching "Posten" with score 45) before a later field with an exact match
(e.g. `shortText`'s `posten` matching score 100) ever got a chance.

**Change:** rewrote to compute every (header, field) pair score globally,
sort by score descending, then assign greedy — each header and field claimed
at most once. Exact matches now always beat prefix matches across fields.

## F-007 · parseXml.ts — Eventualposition flag never read

**Failing test:** G-007 X83 Eventualposition

**File:** `src/lib/gaeb/parseXml.ts:174-193` — position-flag block

**Cause:** The `Position` type already declared `eventualposition?: boolean`
but the X83 attribute parser only checked `Bedarfsposition` and `Wahlposition`.
Eventual positions imported as plain items, so the panel had no way to flag
them in the UI / pricing logic.

**Change:** added `item.getAttribute('Eventualposition') === 'Yes'` capture
and surface `eventualposition` in the emitted Position.

## F-008 · parseXml.ts — Zuschlagsposition flag never read

**Failing test:** G-008 X83 Zuschlagsposition

**File:** `src/lib/gaeb/parseXml.ts:174-193`

**Cause:** Same root as F-007 — `zuschlagsposition?: boolean` declared but the
attribute was never read.

**Change:** added `item.getAttribute('Zuschlagsposition') === 'Yes'` capture
and surface in the emitted Position.

## F-009 · panel-api auth.ts — login timing oracle

**Test warning:** S-004 (login known-user-wrong-password takes ~64 ms via
bcrypt, unknown-email takes ~0.7 ms with no compare — leaks user existence)

**Files:** `panel-api/src/lib/auth.ts:24-37`, `panel-api/src/routes/auth.ts:42-51`

**Cause:** Login route returned early on unknown email without running bcrypt,
so an attacker could distinguish "email exists" from "email doesn't exist" by
measuring response time.

**Change:** added an exported `DUMMY_PASSWORD_HASH` (bcrypt of a random
password). Login route now calls `verifyPassword(password, DUMMY_PASSWORD_HASH)`
in the unknown-email branch before returning 401, so latency matches the
valid-email-wrong-password branch.

## F-010 · panel-api auth.ts — password reuse on change

**Test warning:** S-008 (server accepted next == current password)

**File:** `panel-api/src/routes/auth.ts:110-118` — `change-password` handler

**Cause:** No reuse check. A user could "change" to the same password and the
mustChangePassword gate would clear.

**Change:** added `if (parsed.data.current === parsed.data.next) return 400
{error:'password_unchanged'}` before computing the new hash.

---
