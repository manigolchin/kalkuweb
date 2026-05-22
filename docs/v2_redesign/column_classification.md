# Cross-example column classification — Kalkulation Excel template

> **Round 5 (2026-05-22)**: this document was originally generated from 4 LV
> examples (`~/Desktop/Claude/example {1..4}`). The Round 5 audit added 6 new
> examples (`~/Desktop/claude1/example {5..10}`) — bringing the survey to **10
> real-world template files**. The 10-example consensus is documented in
> sections 1–7 below; the 4-file findings remain valid as historical context
> in **Appendix A**.
>
> Parser: `scripts/parse-lv-examples.mjs` (original 4-file) +
> `scripts/classify-10examples.mjs` (Round 5 10-file).
> Audit harness: `scripts/audit-parser-10examples.mjs` (parser-canon check).
> Cells cited as `<sheet>!<colRow>` (e.g. `Kalkulation!I3`).

---

## 1. Files surveyed (Round 5 — 10 examples)

| # | File | Sheet | Rows | Max OZ depth | Positions | Group rows | Buffer rows | Stoffe-ZSCHLG | NU-ZSCHLG | Geräte-ZSCHLG | Lohn-Faktor | Stundensatz | Mittellohn | Zeitwert | Customer-zone errors | Hotspot U2-U12 errors |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ex1  | `Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx`  | `Kalkulation` | 248 | 4 | 199 | 17 | 18 | 23 % | 23 % | 10 % | 1.2633 | 67.90 € | 30 | −15 % | 0 | YES |
| ex2  | `Desktop/Claude/example 2/LV3.xlsx`                  | `Kalkulation` |  68 | 2 |  41 |  2 |  3 | 25 % | 25 % | 10 % | 1.1633 | 64.90 € | 30 | +50 % | 0 | no  |
| ex3  | `Desktop/Claude/example 3/LV3.xlsx`                  | `Kalkulation` |  40 | 1 |  25 |  0 |  1 | 20 % | 20 % | 10 % | 1.1633 | 64.90 € | 30 |   0 % | 0 | YES |
| ex4  | `Desktop/Claude/example 4/LV3_FW_mit_Preisen.xlsx`  | `Kalkulation` | 435 | 3 | 329 | 29 | 63 | 23 % | 23 % | 10 % | 1.2633 | 67.90 € | 30 | −15 % | 0 | YES |
| ex5  | `Desktop/claude1/example 5/LV3_.xlsx`                | `Kalkulation` |  49 | 3 |  22 |  2 | 11 | 20 % | 20 % | 10 % | 1.1633 | 64.90 € | 30 |   0 % | 0 | YES |
| ex6  | `Desktop/claude1/example 6/LV3.xlsx`                 | `Kalkulation` |  45 | 3 |  21 |  7 |  3 | 40 % | 40 % | 10 % | 1.9967 | 89.90 € | 30 |   0 % | 0 | no  |
| ex7  | `Desktop/claude1/example 7/LV3.xlsx`                 | `Kalkulation` | 311 | 4 | 265 | 25 |  7 | 25 % | 25 % | 10 % | 0.1633 | 34.90 € | 30 | −55 % | 0 | no  |
| ex8  | `Desktop/claude1/example 8/LV3.xlsx`                 | `Kalkulation` | 105 | 3 |  70 | 11 | 10 | 12 % | 12 % | 10 % | 0.6633 | 49.90 € | 30 |   0 % | 0 | no  |
| ex9  | `Desktop/claude1/example 9/LV3.xlsx`                 | `Kalkulation` | 166 | 3 | 137 |  9 |  6 | 20 % | **40 %** | 10 % | 1.9967 | 89.90 € | 30 |   0 % | 0 | YES |
| ex10 | `Desktop/claude1/example 10/LV3.xlsx`                | `Kalkulation` | 230 | 3 | 184 | 18 | 14 | **50 %** | 40 % | 10 % | 1.1633 | 64.90 € | 30 | +25 % | 0 | no  |

**10-example consensus.** All ten files share:
- Sheet name `Kalkulation` (or first sheet when only one is present).
- 48-column grid (`A..AV`).
- Identical row-13 header labels (cols A..AP — see §3).
- Identical header-anchor positions (`A2`, `A4`, `A6`, `A8`, `C8`, `C9`, `C10` — see §2).
- Identical Zuschlag-matrix layout (rows 4–7 cols J–M).
- Identical `M2` (Stundensatz), `K2` (Mittellohn), `J11` (Zeitwert) anchor cells.
- **Zero formula errors in the customer-visible zone `A:G`** — across all 10 files.

**Project-specific (handled per-file, not part of the template contract):**
- OZ hierarchy depth (1 → 4 levels, mixed-depth allowed) and numbering style.
- Whether KG-group headers exist (3 of 10 files have none).
- ZSCHLG values, Lohnfaktor, Stundensatz, Zeitwert.
- Whether Faktoren-Lookup names resolve (5 of 10 files have unresolved hotspots U2–U12).
- Whether Trockenbau-specific extras are filled (cols AC–AG, rows 2–7 — see §6.1).

---

## 2. Header block (rows 1–12) — variance across 10 files

The canonical anchor cells (re-verified across all 10 files):

| Cell | Role | Customer-visible? | All 10 files? | Notes |
|---|---|---|---|---|
| `A2`=`AG:` / `B2`=client name | Auftraggeber label + value | yes | yes | label exact |
| `A4`=`Leistung:` / `B4`=service text | Service label + value | yes | yes | label exact |
| `A6`=`BV:` / `B6`=project name | Bauvorhaben label + value | yes | yes | label exact |
| `A8`=`Bieter:` / `B8`=bidder name | Bidder identification | yes | yes | label exact |
| `C8`=`Netto Angebotssumme` / `F8`=value | Netto total label + sum | yes | yes | label exact |
| `C9`=`MwSt.:` / `D9`=rate / `F9`=value | VAT label + rate + sum | yes | yes | label exact |
| `C10`=`Brutto Angebotssumme` / `F10`=value | Brutto total label + sum | yes | yes | label exact |
| `D2`=`Abgabedatum:` / `F2`=date | Submission deadline | yes | yes | F2 contains free-text date/time |
| `D4`=`Vergabenummer:` / `F4`=tender no. | Tender reference | yes | yes | F4 contains free-text reference |
| `I2`=`Lohnkosten, inkl L-NK / Std.:` / `K2`=Mittellohn | **Internal** wage cost | no | yes | K2 = 30 across all 10 files |
| `L2`=`Stundensatz:` / `M2`=Stundensatz | **Internal** charge-out | no | yes | M2 varies 34.90..89.90 |
| `I3:M3` = `EINKAUF / ZSCHLG / VERKAUF / DIFFERNZ` matrix header | **Internal** matrix header | no | yes | layout identical |
| `I4:M4` = Stoffe (Material) row | EK / ZSCHLG % / VK / diff | no | yes | row-Y data |
| `I5:M5` = Nachunternehmer row | NU EK / ZSCHLG / VK / diff | no | yes | |
| `I6:M6` = Gerätekosten row | Equipment costs | no | yes | |
| `I7:M7` = Lohn row | Labor cost matrix | no | yes | K7 = `1 + (1+ZSCHLG_lohn)*Mittellohn/Stundensatz` |
| `I8:M8` = Mitarbeiter / Ges. Std. / Überschuss labels | Staffing + total hours + surplus | no | yes | |
| `I9:M9` = Arbeitstage / Monate / overshoot value | Working days / months / margin | no | yes | |
| `I11:M11` = Zeitwert / Kontrollsumme | Time-adjustment & control sum | no | yes | J11 = zeitwert in percent (decimal) |
| `I12:M12` = Stoffe row defaults | Per-position-type defaults | no | yes | |

### 2.1 Header block — newly observed variance (5 files only)

**Cols AC–AG rows 2–7 — Trockenbau-specific extras** (present in `ex6` and `ex8`, absent in the other 8):

| Cell | ex6 | ex8 | Interpretation |
|---|---|---|---|
| `AC2` | `GKB` | `GKB` | Plate type label (Knauf-/Rigips-Sortiment) |
| `AC3` | `GKF` | `GKF` | Plate type label |
| `AC4` | `GKBi` | `GKBi` | Plate type label |
| `AC5` | `GKFi` | `GKFi` | Plate type label |
| `AE2..AG7` | numeric (thickness × price grid) | numeric | Plate thickness 2.5 / 3.5 / 4.5 / 6 mm and price/m² |

These are **Trockenbau-customer-specific** internal calculation aids — they live in
the internal zone (col AC+), they do not exist as canonical row-13 headers, and
they do not contaminate the customer-visible zone. **The parser correctly ignores
them today.** No work required.

**Cols Q2–Y2 / Q3–Y3 / Q4–W4 — Faktoren reference table** (present in 5 files, absent in 5):

| Cells | Present in | Content |
|---|---|---|
| `T2`, `W2`, `Y2`, `Z2` | ex2, ex6, ex7, ex8, ex10 | Numeric reference data (e.g. `T2`=2, `W2`=52, `Y2`=52, `Z2`=`Trockenbauwand`) |
| `T3..Y3`, `Z3` | ex2, ex6, ex7, ex8, ex10 | Numeric+label (e.g. `Z3`=`Vorsatzschale`) |
| `Q2`, `S2`, `V2`, `Q3`, `S3`, `Q4`, `R4`, `S4`, `T4`, `V4`, `W4`, `Z4` | ex1, ex3, ex4, ex5, ex9 | Faktoren-Lookup string names (e.g. `Q4`=`Kabel`, `Z4`=`Leibungsverkleidung`) |

**Interpretation:** the two groups represent two different customer-base templates:
- **Elektro-template** (5 files: ex1, ex3, ex4, ex5, ex9) — Faktoren-Lookup names like `schlitz`, `kabel`, `zählerschrank` → these are the cells that **error** when the named ranges are not defined (see §5).
- **Trockenbau/HLS-template** (5 files: ex2, ex6, ex7, ex8, ex10) — same row-13 grid but the cells are pre-filled with numeric reference values, so the lookup formulas work and there are **no errors**.

Both groups have **identical** row-13 column headers and identical position-zone (A:G) behaviour. The customer-side template contract is robust across both groups.

---

## 3. Position-table column row 13 — **IDENTICAL across all 10 files**

Re-verified by `classify-10examples.mjs` cross-check: not a single file has a row-13 label mismatch in the parser's required columns. The full 36-column union table:

| Col | Header text | Role | Customer-visible? | Formula relationship |
|---|---|---|---|---|
| **A** | `Pos.` | Position number / hierarchy key | yes | Whitespace-tolerant; depth = customer-side; group rows ≠ position rows |
| **B** | `Bezeichnung` | Description / Kurztext | yes | Free text |
| **C** | `Menge` | Quantity (positions) **OR** group total (group rows) — overloaded | yes | If position-level: numeric Menge; if group-level: `SUM(F-children)` |
| **D** | *(no header)* | `Einheit` (St, m, Psch, h, …) | yes | Free text |
| **E** | `EP` | Einzelpreis (€/EH, customer-facing) | yes | `= AJ + AK + Z * (1+ZSCHLG_geraet) + AB * (1+ZSCHLG_lohn)` |
| **F** | `GP` | Gesamtpreis (€) | yes | `= C * E` |
| **G** | *(no header)* | Level-2 group subtotal (when present) | yes | `SUM(F-children)` |
| **H** | *(empty buffer)* | — | n/a | Visual separator only |
| **I** | `EP \| EK` (Stoffe) | Material Einkaufspreis / EH | no | Source value (manual or Σ-Lookup) |
| **J** | `Min/Einheit` | Minutes per Einheit (labor time) | no | Source value |
| **K** | `Lstg./Std.` | Productivity, person 1 (units / hour) | no | Inverse-derived from J |
| **L** | `Lstg./Std.` (2nd worker) | Productivity, person 2 | no | |
| **M** | `EP \| EK` (NU) | Nachunternehmer EP-Einkauf / EH | no | Source value |
| **N–W** | `F10`, `F9`, `F8`, `F7`, `F6`, `F5`, `F4`, `F3`, `F2`, `F1` | Faktoren-Lookup matrix (10 cols) | no | User-defined lookup keys (text or formula tokens like `schlitz+Q*querschnitt`) |
| **X** | `Kosten` | Total cost (calc field) | no | |
| **Y** | `in min` | Time accumulator | no | |
| **Z** | `Geräte` (EK) | Equipment EK / EH | no | |
| **AA** | `Geräte` (VK) | Equipment VK / EH | no | `= Z * (1 + ZSCHLG_geraet)` |
| **AB** | `Löhne` (EK) | Labor EK / EH | no | `= J/60 * Mittellohn` |
| **AC** | `in min` | Adjusted minutes | no | `= J * (1 + Zeitwert)` |
| **AE** | `Löhne` (VK) | Labor VK / EH | no | `= AB * (1 + ZSCHLG_lohn)` |
| **AF** | `Stoffe` (VK) | Material VK / EH | no | `= I * (1 + ZSCHLG_stoffe)` |
| **AG** | `Geräte` (VK alt) | Variant column | no | |
| **AH** | `Nachunt.` (VK) | NU VK / EH | no | `= M * (1 + ZSCHLG_nu)` |
| **AJ** | `Stoffe VK` | Material VK accumulator | no | |
| **AK** | `Nachu.` | NU accumulator | no | |
| **AM** | `Tagen` | Working-days projection | no | |
| **AN** | `Gesamt` | Total accumulator | no | |
| **AP** | `pro Einheit` | Per-unit roll-up | no | |

**Cells AD, AI, AL, AO are empty in all 10 files** (visual separators). They are part of the canonical layout.

### 3.1 Row-13 variance scan — none

`classify-10examples.mjs` cross-checked the 10 parser-required row-13 cells (`A,B,C,E,F,I,J,K,L,M`) against the canon — **zero mismatches across all 10 files**.

**Canonical customer-visible zone = `A:G`. Everything from `I` onward is internal.** (Column H is empty in all files — it's the visual gap between zones.) Confirmed by the 10-file scan.

---

## 4. Position-number / hierarchy patterns — Round 5 expanded inventory

OZ raw shapes observed across all 10 files (first instance per shape — see `classify-10examples.mjs` output for the full list):

| File | Max depth | Sample of unique shapes (first 3) | Notes |
|---|---:|---|---|
| ex1  | 4 | `" #. #"`, `" #. #. #"`, `" #. #. #.  .   #"` | 4-level with **leading-space + space-after-dot** + intermediate-empty-segment |
| ex2  | 2 | `"Pos. #"`, `"Pos. ##"`, `"Bedarfspos. "` | "Pos. N" flat numbering — no OZ dots at all |
| ex3  | 1 | `" .  .  ##"`, `" .  . ###"` | leading-dot-prefix shorthand (`" .  .  10"` parses to level-1 because empty segments are dropped) |
| ex4  | 3 | `" #"`, `" #. #"`, `" #. #.   #"` | 3-level |
| ex5  | 3 | `" #"`, `" #. #"`, `" #. #.  ##"` | 3-level (similar to ex4) |
| ex6  | 3 | `" #"`, `" #.#"`, `" #.#. #"` | **No-space-after-dot variant** (`" 1.1"` instead of `" 1. 1"`) |
| ex7  | 4 (mixed) | `"#"`, `"#.#"`, `"#.#.#"`, `"#.#.#.#"` | **No leading space, no space-after-dot at all** — but **mixed 3- and 4-level positions in the same file** (256 3-level + 7 4-level) |
| ex8  | 3 | `" ##"`, `" ##.  .###"`, `" ##.##"` | **Zero-padded segments** (`" 01"`, `" 02.01.001"`) |
| ex9  | 3 | `" #"`, `" #. #"`, `" #. #.  ##"` | Standard 3-level |
| ex10 | 3 | `" #"`, `" #. #"`, `" #. #. ##"` | Standard 3-level |

### 4.1 New OZ patterns introduced by examples 5–10

1. **`ex6` — no-space-after-dot** (`" 1.1"`): the dot-separator has no whitespace
   after it. The parser's `OZ_NORMALIZE` rule (`split on '.' → trim each → drop empty
   → rejoin`) handles this correctly because `trim` swallows the missing space.
2. **`ex7` — no-leading-space, no-space-after-dot** (`"1"`, `"1.1.1"`): same as
   above plus no leading-whitespace prefix. Parser handles correctly.
3. **`ex7` — mixed-depth positions in one file** (256 × 3-level + 7 × 4-level):
   this is the most interesting new case. Previously assumed: a file uses one
   uniform depth. Reality: a file can mix depths. The parser must NOT assume a
   uniform depth (it doesn't today — the parser keys positions by their
   normalized OZ string, so mixed depth is already fine).
4. **`ex7` row 35 — trailing-dot anomaly** (`"1.2."`): a stray trailing dot. The
   normalize rule treats this as 2 segments → level 2 → group row. Behaviour is
   correct (treated as a group-header).
5. **`ex8` — zero-padded segments** (`" 01"`, `" 02.01.001"`): integer segments
   can be zero-padded. Normalize keeps the leading zeros (parser keeps the raw
   string for the segments after trim, so `" 01"` and `"1"` normalize to
   different keys — this is intentional because the customer-visible OZ value
   should round-trip identically).
6. **`ex8` group rows with `Menge`** (e.g. row 18 ` 01` has `B`=description but
   no `C`/`D`/`E`): treated as a group/buffer row — correct.

**Parser rule (re-confirmed for Round 5):**

```
OZ_NORMALIZE = trim → split on '.' → trim each segment → drop empty segments → rejoin with '.'
LEVEL = count of non-empty segments
IS_GROUP    = (cols D, E, F all empty AND col C numeric)  OR  (level < 3 AND no Menge)
IS_POSITION = (col C numeric AND col D non-empty AND col E numeric)
IS_BUFFER   = (OZ empty AND col B non-empty)  // descriptive insert, render as a hint row
```

All ten files conform to this rule.

---

## 5. Formula-error cells — Round 5 hotspot re-confirmation

| Cell | Files affected (Round 5) | Formula | Why it errors | Treat as |
|---|---|---|---|---|
| `Kalkulation!U2`  | ex1, ex3, ex4, ex5, ex9 | `schlitz+Q2*querschnitt` | Undefined named ranges `schlitz`, `querschnitt` | `#VALUE!` (value `15`) |
| `Kalkulation!U3`  | ex1, ex3, ex4, ex5, ex9 | `lasttrennschalter+lastfaktor*Q3` | Undefined named ranges | `#VALUE!` (value `15`) |
| `Kalkulation!U4`  | ex1, ex3, ex4, ex5, ex9 | `zählerschrank+Q4*zählergröße` | Undefined named ranges | `#VALUE!` (value `15`) |
| `Kalkulation!U5`  | ex1, ex3, ex4, ex5, ex9 | `leuchte+leuchtenfaktor*Q5` | Undefined named ranges | `#VALUE!` (value `15`) |
| `Kalkulation!U7`  | ex1, ex3, ex4, ex5, ex9 | `anschließen+anschließen*Q7/3` | Undefined named ranges | `#VALUE!` (value `15`) |
| `Kalkulation!X9`  | ex1, ex3, ex4, ex5, ex9 | `V9/C9` | C9 numeric but V9 missing | `#VALUE!` (value `15`) |
| `Kalkulation!U12` | ex1, ex3, ex4, ex5, ex9 | `rohrverlgen+Q12*#REF!` | Hard `#REF!` literal in formula | `#REF!` (value `23`) |
| Files **without errors** | ex2, ex6, ex7, ex8, ex10 | — | "Trockenbau/HLS-template" sub-family — fully numeric Faktoren grid | — |

**New finding from Round 5:**
- The error pattern is now confirmed as a **template sub-family signature** (the
  "Elektro" sub-family): U2 / U3 / U4 / U5 / U7 / X9 / U12 all error together as
  a single set of 7 in every affected file. The original 4-file finding listed
  only U2/U3/U4/U12 — Round 5 inventory found that U5, U7, and X9 are also
  always-erroring members of the same set.
- Files ex2, ex6, ex7, ex8, ex10 (the Trockenbau / HLS sub-family) have a
  fully-numeric Faktoren grid (cols T2–Y4 contain ref data, not lookup names)
  and therefore have **zero formula errors anywhere on the sheet**.
- **Zero customer-zone formula errors** across all 10 files. The errors stay
  inside the internal zone (cols U, V, W, X — within N..W Faktoren-Lookup and
  X "Kosten" calc field).

**Implication for the importer (unchanged from Round 4 + reconfirmed in Round 5):**
- Errors are restricted to internal-zone cells. They do NOT contaminate the
  customer-visible columns (A:G).
- Current Round 4 policy (`severity='error'` on any Faktoren-Lookup cell error
  blocks the import) is **too strict for the Elektro sub-family** — it would
  block 5 of 10 real files. Round 5 recommends downgrading the policy:
  - `severity='warning'` for U2–U7, X9, U12 (the known-broken cells of the
    Elektro sub-family).
  - `severity='error'` only for **previously unseen** error cells (early-warning
    that the user has a new kind of broken template).
- Alternative: the importer detects "Elektro sub-family signature" (U2/U3/U4
  text formulas with `schlitz`/`zählerschrank`/etc. and tolerates ALL hotspot
  errors silently. PART R/W decide.

---

## 6. Variance across all 10 files

See **section 1** for the full per-file matrix.

**Stable across all 10 files (the canonical contract):**
- Sheet name `Kalkulation`
- 48-column grid
- Row-13 header pattern (cols A–F + I–AP labels) — see §3
- Header anchors (`AG:`, `Leistung:`, `BV:`, `Bieter:`, `Netto Angebotssumme`, `MwSt.:`, `Brutto Angebotssumme`)
- ZSCHLG matrix at I3:M11
- Customer-zone = A:G
- Zero formula errors in the customer-visible zone
- Cells AD, AI, AL, AO empty (visual buffer columns within the internal zone)

**Project-specific (handled per-file):**
- Hierarchy depth (1 → 4 levels) and numbering style (Pos.-prefix, leading-dot, zero-padded, no-space, mixed-depth — see §4)
- Whether KG-group headers exist (3 of 10 files have 0–2 group headers; the rest have 7–29)
- ZSCHLG values (Stoffe: 12 → 50 %, NU: 12 → 40 %, Geräte: stable at 10 %, Lohn-Faktor: 0.16 → 2.0)
- Stundensatz (34.90 → 89.90 €); Mittellohn is stable at 30 €/h across all 10 files
- Zeitwert (−55 % → +50 %)
- Whether Faktoren-Lookup names resolve (Elektro sub-family: no; Trockenbau/HLS sub-family: yes)
- Trockenbau-specific cells `AC2..AG7` populated in 2 of 10 files (ex6, ex8)
- Faktoren reference data cells `T2..Z3` populated in 5 of 10 files (Trockenbau sub-family)

### 6.1 New columns observed in examples 5–10

| Cells | Files where populated | Header / content | Classification | Action |
|---|---|---|---|---|
| `AC2..AG7` | ex6, ex8 | Trockenbau plate-type label grid (`GKB`/`GKF`/`GKBi`/`GKFi` + thickness × price) | (c) deliberately customer-internal | parser correctly ignores today |
| `T2..Y2`, `T3..Y3`, `T4..W4`, `Z2..Z4` | ex2, ex6, ex7, ex8, ex10 | Faktoren reference data (numeric for Trockenbau, string names for Elektro) | (c) deliberately customer-internal | parser already captures via `faktorenLookup` & `faktoren` |
| All other internal columns (N..AP rows 14+) | all 10 | unchanged from canonical row-13 schema | (a/c) parser captures via row-13 anchoring | no change |
| `X9` formula error | ex1, ex3, ex4, ex5, ex9 | `V9/C9` errors when V9 missing | (c) Elektro-sub-family marker | downgrade to `severity='warning'` (see §5) |

**No new columns, no new row-13 labels, no new header anchors** — the canonical template contract is unchanged.

The two new "extras" (Trockenbau plate-type grid and Faktoren reference data) are
**customer-internal aids** that live entirely inside the parser's internal zone
and do not affect customer-visible output. They are correctly ignored by the
current parser (parser drops cols H onward when shaping the customer view).

---

## 7. Implications for redesign — Round 5 update

### 7.1 Concrete pointers for parser / UI work

| Implication | Status | Where it lands |
|---|---|---|
| Importer must accept all observed hierarchy styles incl. zero-padded (`" 01"`), no-space (`" 1.1"`), no-leading-space (`"1"`), and mixed-depth per file | already conformant — re-verify in tests | PART R / `src/lib/kalku-xlsx/parse.ts` + `src/features/kalkulation/ozParser.mjs` |
| Column-zone classification is **stable across 10 files** — A:G customer, I:AP internal, H buffer, AD/AI/AL/AO buffer | already enforced | `PositionTableV2` ✅ |
| Header anchors give us robust block detection | already enforced | parser anchors ✅ |
| **Formula error policy must downgrade** — the 7-cell Elektro sub-family error signature (U2,U3,U4,U5,U7,X9,U12) shows up in 5 of 10 files; current `severity='error'` blocks half the corpus | **needs change** — Round 5 recommends `severity='warning'` for hotspot cells | PART R + `importer_readme.md` |
| ZSCHLG / Stundensatz / Mittellohn / Zeitwert live in header block — parser must lift them into `CalcParams` | already conformant | parser ✅ |
| KUNDEN-view stripping is correct: drop col H onward, period | already conformant | `PositionTableV2` ✅ |
| New Trockenbau-specific extras (AC..AG rows 2–7) and Faktoren-ref data (T..Z rows 2–4) live in internal zone — parser correctly ignores them | already conformant | no change |
| Customer-zone (A:G) is **error-free across all 10 files** — strengthens the "show customer-zone, defer internal-zone repair" UX direction | confirmed | UI confirmation |

### 7.2 Ranked hand-off list for PART R/W

1. **`parse.ts` formula-error policy** — Round 4 policy is `severity='error'` for any Faktoren-Lookup error. Round 5 finds this blocks 5 of 10 real files. Change to `severity='warning'` (or pattern-detect the Elektro sub-family signature). Highest priority.
2. **`__tests__/parse.test.mjs` corpus** — extend the test corpus from 4 to all 10 example files to lock in the variance findings. Medium priority.
3. **`ozParser.mjs`** — verify all 10 OZ shapes round-trip through the normalize rule. Should already work; add tests for ex6, ex7, ex8 edge cases (no-space, mixed-depth, zero-padded). Low priority — no code change expected, just regression tests.
4. **`importer_readme.md`** — document the "Elektro sub-family" vs "Trockenbau/HLS sub-family" template signature so future readers understand the two failure modes. Low priority.

---

## Appendix A — Original 4-file findings (kept for historical reference)

> Generated 2026-05-22 from `~/Desktop/Claude/example {1,2,3,4}/*.xlsx`.
> Superseded by sections 1–7 above (Round 5 10-example consensus) but the
> table and observations remain accurate for the 4 files surveyed.

### A.1 Files surveyed (original 4)

| File | Sheet | Rows | Cols | Positions sampled | Hierarchy style |
|---|---|---:|---:|---:|---|
| `example 1/LV3_BH_mit_Preisen.xlsx` | `Kalkulation` | 248 | 48 | 234 | 4-level: ` 1. 4. 1.  .   1` (BV: Blücherhof Kiel, AG: Heinrich Karstens) |
| `example 2/LV3.xlsx` | `Kalkulation` | 68 | 48 | 54 | Flat: `Pos. 1`…`Pos. N` (BV: Neuvermietung Mietfläche Stuttgart) |
| `example 3/LV3.xlsx` | `Kalkulation` | 40 | 48 | 26 | Number-only: ` .  .  10`…` .  .  N0` (BV: UK Bonn Bettenhaus) |
| `example 4/LV3_FW_mit_Preisen.xlsx` | `Kalkulation` | 435 | 48 | 421 | 3-level: ` 1. 1.   1` (BV: Feuerwehrhaus Süd) |

### A.2 Original 4-file ZSCHLG variance

| Property | ex1 | ex2 | ex3 | ex4 |
|---|---|---|---|---|
| Hierarchy max depth | 4 | 2 (flat) | 1 | 3 |
| Pos. count (data rows) | ~234 | ~54 | ~26 | ~421 |
| Uses KG group headers | Yes | No | No | Yes |
| ZSCHLG Stoffe | 23 % | 25 % | 20 % | 23 % |
| ZSCHLG NU | 23 % | 25 % | 20 % | 23 % |
| ZSCHLG Geräte | 10 % | 10 % | 10 % | 10 % |
| Lohnfaktor (K7) | 1.2633 | 1.1633 | 1.1633 | 1.2633 |
| Stundensatz (M2) | 67.90 € | 64.90 € | 64.90 € | 67.90 € |
| Mittellohn (K2) | 30 | 30 | 30 | 30 |
| Zeitwert | −15 % | +50 % | 0 % | −15 % |
| U2–U4 / U12 formula errors | Yes | No | Yes | Yes |
| Faktoren-Lookup names defined | No | Partial | No | No |

### A.3 Original 4-file formula-error inventory

| Cell | Files affected | Formula | Why it errors |
|---|---|---|---|
| `Kalkulation!U2` | ex1, ex3, ex4 | `schlitz+Q2*querschnitt` | Undefined named ranges |
| `Kalkulation!U3` | ex1, ex3, ex4 | `lasttrennschalter+lastfaktor*Q3` | Undefined named ranges |
| `Kalkulation!U4` | ex1, ex3, ex4 | `zählerschrank+Q4*zählergröße` | Undefined named ranges |
| `Kalkulation!U12` | ex1, ex3, ex4 | `rohrverlgen+Q12*#REF!` | Hard `#REF!` literal |

Round 5 expanded this list to include U5, U7, X9 (always-erroring members of the same set) and confirmed the same pattern in ex5 + ex9 (the new Elektro sub-family files).

End.
