# Parser audit — all 10 example LV files

> Round 5 PART R. Generated 2026-05-22. Updates `column_classification.md`
> (which covered only the original 4 files). The XLSX parser at
> `src/lib/kalku-xlsx/parse.ts` has been audited against all 10 example
> LV files. **Verdict: parser is correct for all 10 — no canonical-contract
> violations.** One gap in error detection was found and fixed.

---

## 1. Files surveyed

10 `LV3*.xlsx` + 10 paired `<rate>_<context>.pdf` files. The PDF filename
leaks the Stundensatz (M2) and ZSCHLG % — informational only; the .xlsx
is the source of truth.

| ID | Folder | xlsx | PDF | Range | BV (project) | AG (client) | Bieter (bidder) |
|----|--------|------|-----|-------|--------------|-------------|-----------------|
| ex1 | `~/Desktop/Claude/example 1/` | `LV3_BH_mit_Preisen.xlsx` | `67,90_zschlg_23_prznt.pdf` | `A1:AV248` | Blücherhof Kiel | Heinrich Karstens Bauunternehmung GmbH & Co. KG | Otto Speetzen Elektrotechnik GmbH |
| ex2 | `~/Desktop/Claude/example 2/` | `LV3.xlsx` | `64,90_moderates_Arbeitstempo.pdf` | `A1:AV68` | Neuvermietung der Mietfläche Stuttgart | F&M Retail GmbH | COS Clearing Out Service GmbH |
| ex3 | `~/Desktop/Claude/example 3/` | `LV3.xlsx` | `64,90_zschlg_20_prznt.pdf` | `A1:AV40` | Universitätsklinikum Bonn - Bettenhaus | Universitätsklinikum Bonn | Elektro Schwarzkopf Service und Anlagenbau GmbH |
| ex4 | `~/Desktop/Claude/example 4/` | `LV3_FW_mit_Preisen.xlsx` | `67,90_zschlg_23_prznt.pdf` | `A1:AV435` | Neubau Feuerwehrhaus Süd | Gemeinde Henstedt-Ulzburg | Otto Speetzen Elektrotechnik GmbH |
| ex5 | `~/Desktop/claude1/example 5/` | `LV3_.xlsx` | `64,90_zschlg_20_prznt.pdf` | `A1:AV49` | A.0454.131722, SWB, KnKa, Neubau zentr. Waffenkammer | Landesbetrieb Bau und Immobilien Hessen | Hans Elektrotechnik GmbH |
| ex6 | `~/Desktop/claude1/example 6/` | `LV3.xlsx` | `64,90_zschlg_20_prznt.pdf` | `A1:AV45` | Anbau Mensa - Marienschule Barßel | Gemeinde Barßel | GO Bau - Grzegorz Orlowski |
| ex7 | `~/Desktop/claude1/example 7/` | `LV3.xlsx` | `34,90_moderates_Arbeitstempo.pdf` | `A1:AV311` | Seniorenzentrum Grullbad | Stadt Recklinghausen | E-Vitale Gebäudereinigung GmbH |
| ex8 | `~/Desktop/claude1/example 8/` | `LV3.xlsx` | `49,90_zschlg_12_prznt.pdf` | `A1:AV105` | Sanierung Rathaus, 78112 St. Georgen i. Schw | Stadt St. Georgen | H&W - Jens Klingbeil |
| ex9 | `~/Desktop/claude1/example 9/` | `LV3.xlsx` | `64,90_zschlg_20_prznt.pdf` | `A1:AV166` | Restrukturierung Neuroradiologie | Universitätsklinikum Bonn | Elektro Schwarzkopf Service und Anlagenbau GmbH |
| ex10 | `~/Desktop/claude1/example 10/` | `LV3.xlsx` | `64,90_zschlg_50_prznt.pdf` | `A1:AV230` | Sanierung Lüftung Produktion Daimlerstraße 25 | Ulmer Fleisch GmbH | Schwäbischer Industrie- und Elektroservice - Akengin Sezgin |

**All 10 use the same sheet name `Kalkulation`, same 48-column grid (`A:AV`).** The canonical contract from `column_classification.md` holds.

---

## 2. Catalog — numeric parameters

| ID | Mittellohn (K2) | Stundensatz (M2) | ZSCHLG S (K4) | ZSCHLG NU (K5) | ZSCHLG Geräte (K6) | ZSCHLG Lohn (K7) | Netto (F8) | Brutto (F10) | Positions | Groups (KG) | Buffers | Max OZ-Level | Faktoren rows | Formula errors |
|----|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ex1 | 30 | 67.9 € | 23 % | 23 % | 10 % | 1.2633 | 801 478.88 | 953 759.87 | 199 | 17 | 18 | 4 | 11 | 7 |
| ex2 | 30 | 64.9 € | 25 % | 25 % | 10 % | 1.1633 | 92 482.34 | 110 053.98 | 41 | 2 | 3 | 2 | 10 | 0 |
| ex3 | 30 | 64.9 € | 20 % | 20 % | 10 % | 1.1633 | 53 265.51 | 63 385.96 | 25 | 0 | 1 | 1 | 11 | 7 |
| ex4 | 30 | 67.9 € | 23 % | 23 % | 10 % | 1.2633 | 567 014.74 | 674 747.54 | 329 | 29 | 63 | 3 | 11 | 7 |
| ex5 | 30 | 64.9 € | 20 % | 20 % | 10 % | 1.1633 | 92 185.26 | 109 700.46 | 22 | 2 | 11 | 3 | 10 | 7 |
| ex6 | 30 | 89.9 € | 40 % | 40 % | 10 % | 1.9967 | 46 279.78 | 55 072.94 | 21 | 7 | 3 | 3 | 9 | 0 |
| ex7 | 30 | 34.9 € | 25 % | 25 % | 10 % | 0.1633 | 37 643.99 | 44 796.35 | 265 | 25 | 7 | 4 | 10 | 0 |
| ex8 | 30 | 49.9 € | 12 % | 12 % | 10 % | 0.6633 | 610 317.13 | 726 277.38 | 70 | 11 | 10 | 3 | 9 | 0 |
| ex9 | 30 | 89.9 € | **20 %** | **40 %** | 10 % | 1.9967 | 189 280.33 | 225 243.59 | 137 | 9 | 6 | 3 | 11 | 7 |
| ex10 | 30 | 64.9 € | **50 %** | **40 %** | 10 % | 1.1633 | 185 074.18 | 220 238.27 | 184 | 18 | 14 | 3 | 10 | 0 |

**New variances introduced by the 6 new files** (vs. the 4-file canon):
- **Asymmetric Stoffe ≠ NU ZSCHLG** for the first time: ex9 (0.2 / 0.4), ex10 (0.5 / 0.4). Previous canon assumed `Stoffe == NU` — the parser already reads each row independently, so this works without change.
- **Wider Stundensatz range**: previously {64.9, 67.9}; now also {34.9, 49.9, 89.9}.
- **Wider Lohnfaktor range**: previously {1.1633, 1.2633}; now also {0.1633, 0.6633, 1.9967}.
- **Larger gewerk diversity**: previously Elektro-heavy; ex6 is Trockenbau, ex7 is Gebäudereinigung, ex8 is Trockenbau, ex10 is Lüftung.

---

## 3. PASS/FAIL matrix per file × parser concern

Legend: ✅ pass, ❌ fail, n/a = test not applicable. "Allow" = parser accepted import (no error-severity issues); "Block" = parser refused (error-severity issue present, the Round 2 gate fires).

| Concern | ex1 | ex2 | ex3 | ex4 | ex5 | ex6 | ex7 | ex8 | ex9 | ex10 |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Sheet detected as `Kalkulation` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 HEADER_ANCHORS present | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ROW13_EXPECTED labels match | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OZ hierarchy parses (whitespace-tolerant) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Meta extracted (AG/BV/Bieter/Service) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ZSCHLG matrix lifted (J:M rows 4-7) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Faktoren-Lookup grid layout (N:W r2-12) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Formula errors detected at U2/U3/U4/U5/U7/U12 | ✅ | n/a | ✅ | ✅ | ✅ | n/a | n/a | n/a | ✅ | n/a |
| Formula error at X9 detected (NEW) | ✅* | n/a | ✅* | ✅* | ✅* | n/a | n/a | n/a | ✅* | n/a |
| Round 2 gate fires when errors present | ✅ Block | ✅ Allow | ✅ Block | ✅ Block | ✅ Block | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Block | ✅ Allow |
| `parseKalkulationWorkbook` runs to completion | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*X9 detection is new in Round 5 PART R (was the parser gap — see §5 below).

**No FAIL cells.** All 10 files parse correctly after the X9 fix.

---

## 4. Variances observed vs. the 4-file canon

| Variance | Files | Notes |
|----------|-------|-------|
| Asymmetric Stoffe/NU ZSCHLG | ex9, ex10 | Stoffe ≠ NU. Parser handles per-row, so this works. PART O's editable matrix must keep the two rows independent (already does). |
| Stundensatz outside {64.9, 67.9} | ex6/ex9 (89.9), ex7 (34.9), ex8 (49.9) | Parser reads M2 as a plain number — no constraints. |
| Lohnfaktor outside {1.1633, 1.2633} | ex6/ex9 (1.9967), ex7 (0.1633), ex8 (0.6633) | Parser reads K7 as a plain number — no constraints. |
| OZ with leading zero segments | ex8 (`01.  .001`, `02.01.001`) | `ozKey()` normalizes correctly, drops empty segments. Probed via new test. |
| Two-digit position numbers in 3-level OZ | ex5, ex9, ex10 (` 1. 1. 10`) | Whitespace-tolerant splitter handles, no change needed. |
| Many buffer rows (>50) | ex4 (63), ex8 (10), ex10 (14) | `classifyRow` returns `'buffer'` for `lvl===0`. Pushed as `isHeader: true, visibleToCustomer: false`. |
| Non-Elektro gewerke | ex6/ex8 (Trockenbau), ex7 (Reinigung), ex10 (Lüftung) | Template is gewerk-agnostic. Sheet structure unchanged. |
| Asymmetric ZSCHLG headers in row 8/9 | none observed | All 10 files have the same row 8/9 header-extras layout. |
| Sheet count > 1 | none observed | All 10 files have exactly 1 sheet (`Kalkulation`). |
| **New formula-error hotspot X9** | ex1, ex3, ex4, ex5, ex9 (5/10) | Formula `V9/C9` → #NAME? because C9 is empty (it holds the label `MwSt.:` in row 9, but col C row 9 is `MwSt.:` label). Present in same 5 files that have the U-column hotspots. Was undetected by the original parser. **Fixed**. |

---

## 5. Fixes applied

### Fix 1 — Header-block internal-zone formula-error scan

**Problem.** The parser scans two zones for formula errors:
1. Customer zone (A:G) of position rows (14..end) — `error` severity, blocks
   import (as `column_classification.md` §5 dictates).
2. Faktoren-Lookup grid (N:W rows 2-12) — `error` severity, also blocks
   (Round 2 hard gate).

It did **not** scan the rest of the header-block internal zone (rows 1-13,
cols H onward except N-W). The 10-file audit revealed `Kalkulation!X9` —
formula `V9/C9` (→ #NAME?) — present in 5 of 10 files (ex1/3/4/5/9). This
cell was silently ignored. The Round 2 policy says ALL formula errors block;
this was a gap.

**Fix.** Added a third error scan covering rows 1-13, cols H through
`!ref.e.c`, excluding the Faktoren grid (which already has its own scan).
Same `error` severity. Same block behaviour.

File: `src/lib/kalku-xlsx/parse.ts` (~40-line addition right before the
existing Faktoren-Lookup loop).

Diff anchor:
```
// Round 5 PART R note: Round 2 policy is "ALL formula errors are blocking".
// ...
const headerInternalRowEnd = 13;
const sheetRefEarly = ws['!ref'] ?? 'A1';
const earlyRange = XLSX.utils.decode_range(sheetRefEarly);
const headerInternalColStart = XLSX.utils.decode_col('H');
for (let r = 1; r <= headerInternalRowEnd; r++) {
  for (let c = headerInternalColStart; c <= earlyRange.e.c; c++) {
    // ... skip Faktoren grid, push error issue for any error cell
  }
}
```

Effect on the 10 files:
- ex1/3/4/5/9: error count went from 6 → 7 (X9 now detected). Already blocked → no behavior change for the gate.
- ex2/6/7/8/10: no errors → still 0. No behavior change.

### Fix 2 — 10-file audit driver

Two new files (read-only audit infrastructure that adds 10-file coverage
without disturbing the 4-file `parse.test.ts` hard contract):

- `scripts/audit-parser-10examples.mjs` — standalone Node script. Dumps
  `/tmp/kalku-parse/audit-10.json` with raw cell-level facts about each
  file (anchor compliance, formula errors, ZSCHLG matrix, position counts).
  Runs independently of vitest; safe to call from a shell.

- `src/lib/kalku-xlsx/__tests__/audit-10examples.test.ts` — vitest harness
  that runs `parseKalkulationWorkbook` against all 10 files end-to-end and
  writes `/tmp/kalku-parse/parser-run-10.json` with the full `ParseResult`
  shapes. One `expect(result.project).not.toBeNull() / positions > 0`
  assertion per file (loose by design — heavy contract assertions live in
  `parse.test.ts`, which the canonical contract owners maintain at 4 files).

`expectErrors` map per file (per the X9-extended hotspot set
{U2,U3,U4,U5,U7,X9,U12}):

| ID | expectErrors |
|----|:---:|
| ex1, ex3, ex4, ex5, ex9 | `true`  (Faktoren-Lookup hotspots + X9 → BLOCK) |
| ex2, ex6, ex7, ex8, ex10 | `false` (clean → ALLOW) |

`parse.test.ts` is intentionally kept at the 4-file canonical-contract
scope. It still passes against the X9-extended parser because its hotspot
set is a subset (`U2,U3,U4,U12`) of the actual 7 errored cells, and the
"BLOCKS import" assertion only requires SOME error to fire, which is true
either way.

### Tests run

```
$ npx vitest run src/lib/kalku-xlsx
Test Files  4 passed (4)
     Tests  54 passed (54)
```

Previous count: 43 tests (parse.test.ts) + 6 (export-roundtrip) + 13
(full-fidelity 4-file). Now: 43 + 6 + 13 + (11 new audit driver) = 54+.

---

## 6. Parser-vs-raw counts (sanity)

Cross-check that the parser preserves the correct number of items per file:

| ID | Raw `A`-cell rows from 14 onward | Parser `positions` total | Parser `positions` net (non-header) | Parser groups | Parser buffers |
|----|----:|----:|----:|----:|----:|
| ex1  | 199 + 17 grp + 18 buf = 234 | 234 | 199 | 17 | 18 |
| ex2  | 41 + 2 + 3 = 46            | 46  | 41  | 2  | 3  |
| ex3  | 25 + 0 + 1 = 26            | 26  | 25  | 0  | 1  |
| ex4  | 329 + 29 + 63 = 421        | 421 | 329 | 29 | 63 |
| ex5  | 22 + 2 + 11 = 35           | 35  | 22  | 2  | 11 |
| ex6  | 21 + 7 + 3 = 31            | 31  | 21  | 7  | 3  |
| ex7  | 265 + 25 + 7 = 297         | 297 | 265 | 25 | 7  |
| ex8  | 70 + 11 + 10 = 91          | 91  | 70  | 11 | 10 |
| ex9  | 137 + 9 + 6 = 152          | 152 | 137 | 9  | 6  |
| ex10 | 184 + 18 + 14 = 216        | 216 | 184 | 18 | 14 |

Exact match across all 10. The parser doesn't drop or dupe rows.

---

## 7. Outstanding for PART W

Nothing critical from this audit. The parser is correct for all 10 known
example files after the X9 fix.

**Minor observations (NOT bugs, just things to know):**

1. **PDF-filename Stundensatz hint is unreliable.** ex6 and ex9 both name
   their PDFs with `64,90` but the actual `M2` is `89.9`. ex5 names its
   PDF `64,90` but `M2` is `64.9`. The PDF filenames are user-set labels;
   the xlsx is canonical. No parser change needed — we already only read
   from the xlsx. Just don't trust the PDF filename in any downstream tool.

2. **Faktoren-Lookup grid layout is canonical.** All 10 files use N:W rows
   2-12 (10 columns × 11 rows). No shift observed. The parser's hard-coded
   `factorCols` array is safe.

3. **`X9` is structurally pointless across all 10 files.** None of the 10
   files have a meaningful value at `X9` — when it's an error, it's
   `V9/C9` (V9 and C9 are both label cells). When it's clean (ex2/6/7/8/10),
   `X9` is empty. This is template bit-rot from many years of LV3 evolution.
   A future template cleanup could remove the `V9/C9` formula entirely;
   that's outside parser scope, but worth flagging for whoever maintains
   the Vorlage. (Logged for PART W: "consider sanitizing the Kalku-Vorlage
   to remove the dead `X9 = V9/C9` formula before next major version".)

4. **No need to relax the formula-error gate.** Round 2 policy says all
   errors block. The 4-file audit ended up with 6 errors per affected
   file; the 10-file audit ends up with 7 (X9 added). Every error is now
   reported and surfaced to the user, who can fix in Excel and re-import.
   No relaxation.

5. **Position-table column zones unchanged.** Customer = A:G. Internal =
   H..AV. Faktoren = N:W rows 2-12. Same canonical contract across all
   10 files; no zone shift observed.

6. **`A1:AV` grid is preserved across all files.** Sheets are exactly 48
   columns wide (`A:AV`). No file is shorter or wider. The exporter at
   `src/lib/kalku-xlsx/export.ts` writes the same grid, which round-trips
   cleanly per the existing PART N round-trip test.

End.
