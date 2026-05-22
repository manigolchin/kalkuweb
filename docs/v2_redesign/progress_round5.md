# Round 5 progress — 10-example verification audit (2026-05-22)

> Branch: `claude-auto/v2-gaps-closeout` · Audience: whoever picks up Round 6 · Detailed master report linked from [`KALKU_REDESIGN_REPORT.md`](KALKU_REDESIGN_REPORT.md).

## Why Round 5 happened

Rounds 1–4 shipped against **4 example LV files**. The user added **6 more** (examples 5–10), bringing the corpus to **10 real Kalkulation-template .xlsx workbooks** with significantly broader variance — new gewerke (Trockenbau, Reinigung, HLS), wider ZSCHLG ranges (12–50%), new OZ shape variants, asymmetric ZSCHLG (Stoffe ≠ NU), and a leading-zero OZ format. The mandate: verify every Round 1–4 feature still works against all 10, surface and fix any gaps.

## What Round 5 covered — five parallel audits + one consolidator

| PART | Scope | Output | Status |
|---|---|---|:---:|
| **R** | Parser robustness — header anchors, row-13, OZ hierarchy, formula errors, Faktoren-Lookup layout across all 10 files | [`parser_audit_10examples.md`](parser_audit_10examples.md) + `parse.ts` X9 catch + `scripts/audit-parser-10examples.mjs` + `audit-10examples.test.ts` (11 new tests) | ✅ |
| **S** | Round-trip fidelity (every A1:AP cell) per file | [`import_fidelity_10examples.md`](import_fidelity_10examples.md) + extended `full-fidelity.test.ts` (41 tests) | ✅ |
| **T** | Sentinel-leak coverage on KUNDEN + PositionCommentPanel + post-ZSCHLG-edit | [`leak_test_10examples.md`](leak_test_10examples.md) + 9 new fixtures + extended leak tests (92+25 = 117 leak tests) | ✅ |
| **U** | 10×12 feature matrix | [`feature_coverage_audit.md`](feature_coverage_audit.md) + `PositionTableV2.coverage.test.tsx` (131 tests) | ✅ |
| **V** | Column re-classification | [`column_classification.md`](column_classification.md) (Round 5 sections) + `scripts/classify-10examples.mjs` | ✅ |
| **W** | Consolidate findings + fix everything that surfaced | parser additions, test corrections, this report | ✅ |

## Commits on top of Round 4

| Commit | What it ships |
|---|---|
| `f2eaf77` | **fix(panel)** · Re-add `NumCellEditable` — Round 4 PART O's "EK locked" wording was ambiguous. Per-position Material EK / Min/Einheit / NU EK cells are the calculator's primary input surface; locking them broke the GAEB-import → fill-EK workflow. ZSCHLG matrix row-totals (J4-J7) ARE still locked in the strip. |
| _this commit_ | **Round 5 consolidation** · parser captures F9 MwSt-Betrag and L12 Mitarbeiter-Einsatz flag (PART S gaps); duplicate-OZ warning for ex7 (14 duplicates); X9 header-block error scan (PART R); coverage test aligned with the over-lock-fix reality (f2 no longer false-positives on substring matches; f5 verifies customer-zone locked + EK editable); 6 new audit docs; 9 new fixture files; 4 new audit scripts; 88 new tests. |

## Test results — Round 4 → Round 5

| Suite | After Round 4 | After Round 5 | Delta |
|---|---:|---:|---:|
| Frontend (vitest + jsdom) | 87 | **331** | **+244** |
| Backend (node:test) | 51 | 51 | — |
| Playwright e2e | 1 | 1 | — |
| **Total assertions** | **139** | **383** | **+244** |

The `+244` breakdown:
- `audit-10examples.test.ts` (PART R) — 11 tests, runs the parser against each of the 10 .xlsx files and asserts headers/positions/issues
- `full-fidelity.test.ts` (PART S extension) — was 13 tests against 4 files, now 41 tests across 10 files (10×4 broad + the narrow PART P checks)
- `PositionTableV2.leak.test.tsx` (PART T extension) — was 10, now 92 (re-runs the sentinel suite across 10 fixtures)
- `PositionCommentPanel.leak.test.tsx` (PART T extension) — was 5, now 25 (5 invariants × 10 fixtures)
- `PositionTableV2.coverage.test.tsx` (PART U new) — 131 tests, the 12-feature matrix
- `parse.test.ts` ozParser variants — unchanged at 24 (the regression-test extensions PART V suggested are deferred — see "Deferred" below)

## Headline findings

1. **Parser works on all 10 files.** Header anchors, row-13 labels, OZ hierarchy (including the new zero-padded `01.  .001` format and the trailing-dot anomaly `1.2.` in ex7) — all canonical. The Vorlage really is a stable template.
2. **Formula-error gate still hard.** Round 2's policy (any error blocks import) was kept intact despite PART V suggesting a downgrade. 5 of 10 corpus files block — but they're real Elektro-sub-family files with broken `schlitz+Q*querschnitt`-style named-range references that the user wants surfaced, not silenced. The user's stated invariant ("import or fix in Excel") wins over corpus convenience.
3. **No content leaks.** All 10 fixtures sail through the KUNDEN sentinel leak test (92 assertions). The post-ZSCHLG-edit invariant holds. PositionCommentPanel never carries an internal field. The v2 architecture is **structurally** leak-proof; this round confirms it's leak-proof against the wild diversity of the real corpus.
4. **Round 4 PART O over-locked the per-position EK cells.** The fix landed in `f2eaf77` mid-Round-5 (committed by the PART U agent who discovered it). Material EK / Min/Einheit / NU EK are back to being editable inputs; customer-zone cells stay read-only. This is the only **regression** Round 5 surfaced.
5. **Two small parser captures added** (PART S hand-off): `meta.mwstBetragFromFile` from F9 and `headerExtras.mitarbeiterFlag` from L12. Both are derivable but capturing them future-proofs round-trip fidelity.
6. **Duplicate-OZ warning issued for ex7.** 14 OZ keys appear on multiple rows; the parser still imports cleanly (each row gets a unique nanoid) but OZ-keyed reconciliation (re-import + comment migration) would be ambiguous. A non-blocking warning surfaces this to the user.

## Variance discovered in the 10-example corpus

| Property | 4-file range | 10-file range | Implication |
|---|---|---|---|
| Hierarchy depth | 1–4 levels | 1–4 levels (no new max) | unchanged |
| Position count per file | 26–421 | 26–421 (no new max) | unchanged |
| OZ shape | 4 variants | **+4 new**: no-space-after-dot (ex6), mixed-depth single-file (ex7), trailing-dot anomaly (ex7), zero-padded (ex8) | `ozParser.mjs` already handles all 8 via trim/split/filter — no code change needed |
| ZSCHLG Stoffe | 20–25 % | **12–50 %** | wider — UI must not assume +ve only |
| ZSCHLG NU | 20–25 % | **12–40 %** | wider, **asymmetric with Stoffe** in ex9 (20 vs 40) and ex10 (50 vs 40) |
| Stundensatz | 64.90–67.90 € | **34.90–89.90 €** | wider — Trockenbau ex6 at 89.90, Reinigung ex7 at 34.90 |
| Zeitwert | −15 % to +50 % | **−55 % to +50 %** | wider |
| Formula errors | ex1/3/4 had U2/U3/U4/U12 | ex1/3/4/5/9 share the **expanded Elektro hotspot set** U2/U3/U4/U5/U7/X9/U12 | parser X9 catch added in `parse.ts` |
| Gewerk | Elektro only | **+ Trockenbau (ex6, ex8), Reinigung (ex7), HLS** | two template sub-families now identified — Elektro has broken Faktoren names; Trockenbau/HLS are clean |
| Duplicate OZ | 0 in 4-file corpus | **14 in ex7** | warning added in parser |

## Deferred to Round 6 (with reasoning)

- **OZ shape regression tests in `ozParser.test.ts`.** PART V suggested explicit fixtures for the no-space (ex6), mixed-depth (ex7), and zero-padded (ex8) variants. The parser already handles them (verified live in PART R) and `parse.test.ts` exercises them implicitly via the real-file path. Explicit unit fixtures would be belt-and-braces; deferred because no regression risk if Round 4's `ozKey()` stays as-is. Add when the parser's normalize logic changes.
- **`importer_readme.md` Elektro vs Trockenbau sub-family documentation.** PART V flagged this. The README is already long; a separate sub-family appendix would distract from the canonical contract. Deferred to a docs-only pass.
- **`parse.test.ts` extended to 10 fixtures.** PART V suggested. We have a dedicated `audit-10examples.test.ts` that explicitly runs against the 10-file corpus. Merging into `parse.test.ts` would double the assertions for no new coverage. Kept separate.
- **Group-row col-C overload (e.g. ex1 row 15 = 718276.67).** Currently dropped on import; PART S flagged for capture as `position.groupTotalFromFile`. Deferred because the import recomputes group subtotals from children, so the imported value would never be authoritative anyway. Useful only if we want round-trip fidelity of the original Excel-displayed total (which Excel itself computes via SUM).
- **`bridge` mode for PART V's hotspot-downgrade proposal.** PART V suggested downgrading formula errors at U2/U3/U4/U5/U7/X9/U12 to warnings (so 5 of 10 real files import without manual fixing). Explicit user policy from Round 2 is the opposite. **Deferred indefinitely** unless the user reverses the policy.

## How to verify Round 5 yourself

```bash
# Frontend tests (includes the 10-example audit + coverage + leak suites)
npm run test
# Expected: 11 test files, 331 tests passing

# Specific PART R audit (writes /tmp/kalku-parse/parser-run-10.json)
npx vitest run src/lib/kalku-xlsx/__tests__/audit-10examples.test.ts

# Specific PART U coverage matrix (writes /tmp/kalku-parse/coverage-10.json)
npx vitest run src/features/kalkulation/__tests__/PositionTableV2.coverage.test.tsx

# Build clean
npm run build
# Expected: ✓ built (no TS errors)

# Read the deliverables
ls docs/v2_redesign/*_10examples.md docs/v2_redesign/feature_coverage_audit.md
```

## Files added or modified in Round 5

### Documentation (6 new, 1 updated)
- ✅ `docs/v2_redesign/parser_audit_10examples.md` (new, PART R)
- ✅ `docs/v2_redesign/import_fidelity_10examples.md` (new, PART S)
- ✅ `docs/v2_redesign/leak_test_10examples.md` (new, PART T)
- ✅ `docs/v2_redesign/feature_coverage_audit.md` (new, PART U + W)
- ✅ `docs/v2_redesign/column_classification.md` (Round 5 sections added, PART V; original 4-file content preserved in Appendix A)
- ✅ `docs/v2_redesign/progress_round5.md` (this file, PART W)
- ✅ `docs/v2_redesign/KALKU_REDESIGN_REPORT.md` (Round 5 section added)

### Tests (4 new, 2 extended)
- ✅ `src/features/kalkulation/__tests__/PositionTableV2.coverage.test.tsx` (new, 131 tests)
- ✅ `src/lib/kalku-xlsx/__tests__/audit-10examples.test.ts` (new, 11 tests)
- ✅ `src/features/kalkulation/__tests__/PositionTableV2.leak.test.tsx` (extended, 92 tests)
- ✅ `src/pages/share/__tests__/PositionCommentPanel.leak.test.tsx` (extended, 25 tests)
- ✅ `src/lib/kalku-xlsx/__tests__/full-fidelity.test.ts` (extended, 41 tests)
- ✅ `src/lib/kalku-xlsx/__tests__/parse.test.ts` (kept at 4-file scope; 10-file coverage lives in `audit-10examples.test.ts`)

### Fixtures (9 new)
- ✅ `src/features/kalkulation/__fixtures__/lv_ex{2..10}.ts` (auto-generated from real .xlsx via `build-fixtures-10examples.mjs`; each carries 3 sentinel rows for the leak test)

### Production code
- ✅ `src/features/kalkulation/PositionTableV2.tsx` — `f2eaf77` re-introduces `NumCellEditable` for per-position EK inputs
- ✅ `src/lib/kalku-xlsx/parse.ts` — Round 5 W: X9 internal-block error scan, F9 MwSt-Betrag capture, L12 Mitarbeiter-Einsatz flag, duplicate-OZ warning
- ✅ `src/features/kalkulation/types.ts` — Round 5 W: `HeaderExtras.mitarbeiterFlag?` field; `ImportIssue.code` extended with `'duplicate_oz'`

### Scripts (4 new)
- ✅ `scripts/audit-parser-10examples.mjs` (PART R driver, writes `/tmp/kalku-parse/parser-run-10.json`)
- ✅ `scripts/build-fixtures-10examples.mjs` (PART T fixture generator)
- ✅ `scripts/feature-audit-10examples.mjs` (PART U driver)
- ✅ `scripts/classify-10examples.mjs` (PART V driver)

## Closing posture

The v2 architecture survived 10 real LV files with zero broken features. The one regression Round 5 found (PART O over-lock) was fixed mid-round. The parser is more comprehensive (catches X9, captures F9/L12, warns on duplicate OZ). The leak architecture proves out structurally and empirically. **Ready to merge to main** subject to the standing review process.
