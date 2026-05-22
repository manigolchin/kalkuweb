# Cross-example column classification — Kalkulation Excel template

> Generated 2026-05-22 from `~/Desktop/Claude/example {1,2,3,4}/*.xlsx`.
> Parser: `scripts/parse-lv-examples.mjs` (uses `xlsx` lib, real cell formulas + types).
> Cells cited as `<sheet>!<colRow>` (e.g. `Kalkulation!I3`).

---

## 1. Files surveyed

| File | Sheet | Rows | Cols | Positions sampled | Hierarchy style |
|---|---|---:|---:|---:|---|
| `example 1/LV3_BH_mit_Preisen.xlsx` | `Kalkulation` | 248 | 48 | 234 | 4-level: ` 1. 4. 1.  .   1` (BV: Blücherhof Kiel, AG: Heinrich Karstens) |
| `example 2/LV3.xlsx` | `Kalkulation` | 68 | 48 | 54 | Flat: `Pos. 1`…`Pos. N` (BV: Neuvermietung Mietfläche Stuttgart) |
| `example 3/LV3.xlsx` | `Kalkulation` | 40 | 48 | 26 | Number-only: ` .  .  10`…` .  .  N0` (BV: UK Bonn Bettenhaus) |
| `example 4/LV3_FW_mit_Preisen.xlsx` | `Kalkulation` | 435 | 48 | 421 | 3-level: ` 1. 1.   1` (BV: Feuerwehrhaus Süd) |

**Canonical**: all 4 files use the same sheet name (`Kalkulation`), same 48-column grid, and the same row-13 header pattern. The template is portable. Hierarchy depth is the only structural variation — the parser must accept 1- to 4-level OZ.

---

## 2. Header block — rows 1–12 (anchor cells)

These cells are **canonical across all 4 files** (only the *values* change, never the *positions*):

| Cell | Role | Customer-visible? | Notes |
|---|---|---|---|
| `A2`=`AG:` / `B2`=client name | Auftraggeber label + value | ✅ | Always present |
| `A4`=`Leistung:` / `B4`=service text | Service label + value | ✅ | |
| `A6`=`BV:` / `B6`=project name | Bauvorhaben label + value | ✅ | |
| `A8`=`Bieter:` / `B8`=bidder name | Bidder identification | ✅ | |
| `C8`=`Netto Angebotssumme` / `F8`=value | Netto total label + sum | ✅ | Driving total |
| `C9`=`MwSt.:` / `D9`=rate (0.19) / `F9`=value | VAT label + rate + sum | ✅ | Rate also customer-visible |
| `C10`=`Brutto Angebotssumme` / `F10`=value | Brutto total label + sum | ✅ | |
| `D2`=`Abgabedatum:` / `F2`=date | Submission deadline | ✅ | |
| `D4`=`Vergabenummer:` / `F4`=tender no. | Tender reference | ✅ | |
| `I2`=`Lohnkosten, inkl L-NK / Std.:` / `K2`=mittellohn (e.g. 30) | **Internal** wage cost label + value | ❌ | LEAK RISK if mis-exported |
| `L2`=`Stundensatz:` / `M2`=value (e.g. 67.90) | **Internal** charge-out rate label + value | ❌ | LEAK RISK |
| `I3:M3` = `EINKAUF \| ZSCHLG \| VERKAUF \| DIFFERNZ` | **Internal** matrix header | ❌ | LEAK RISK if header row exported |
| `I4:M4` = Stoffe (Material) row | EK / ZSCHLG % / VK sum / diff | ❌ | LEAK RISK |
| `I5:M5` = Nachunternehmer row | NU EK / ZSCHLG / VK / diff | ❌ | |
| `I6:M6` = Gerätekosten row | Equipment costs | ❌ | |
| `I7:M7` = Lohn row | Labor cost matrix | ❌ | |
| `I8:M8` = Mitarbeiter / Ges. Std. / Überschuss labels | Staffing + total hours + surplus | ❌ | |
| `I9:M9` = Arbeitstage / Monate / overshoot value | Working days / months / margin | ❌ | |
| `I11:M11` = Zeitwert / Kontrollsumme | Time-adjustment & control sum | ❌ | |
| `I12:M12` = Stoffe row defaults | Per-position-type defaults | ❌ | |

---

## 3. Position-table column row 13 — **IDENTICAL across all 4 files**

| Col | Header text | Role | Customer-visible? | Formula relationship |
|---|---|---|---|---|
| **A** | `Pos.` | Position number / hierarchy key | ✅ | Whitespace-tolerant; depth = customer-side; group rows ≠ position rows |
| **B** | `Bezeichnung` | Description / Kurztext | ✅ | Free text |
| **C** | `Menge` | Quantity (positions) **OR** group total (group rows) — **overloaded** | ✅ | If position-level: numeric Menge; if group-level: `SUM(F-children)` |
| **D** | *(no header)* | `Einheit` (St, m, Psch, h, …) | ✅ | Free text |
| **E** | `EP` | Einzelpreis (€/EH, customer-facing) | ✅ | `= AJ + AK + Z * (1 + ZSCHLG_geraet) + AB * (1 + ZSCHLG_lohn)` — see Zone 3 |
| **F** | `GP` | Gesamtpreis (€) | ✅ | `= C * E` |
| **G** | *(no header)* | Level-2 group subtotal (when present) | ✅ | `SUM(F-children)` |
| **H** | *(empty buffer)* | — | n/a | Visual separator only |
| **I** | `EP \| EK` (Stoffe) | Material Einkaufspreis / EH | ❌ | Source value (manual or Σ-Lookup) |
| **J** | `Min/Einheit` | Minutes per Einheit (labor time) | ❌ | Source value |
| **K** | `Lstg./Std.` | Productivity, person 1 (units / hour) | ❌ | Inverse-derived from J |
| **L** | `Lstg./Std.` (2nd worker) | Productivity, person 2 | ❌ | |
| **M** | `EP \| EK` (NU) | Nachunternehmer EP-Einkauf / EH | ❌ | Source value |
| **N–W** | `F10`, `F9`, `F8`, `F7`, `F6`, `F5`, `F4`, `F3`, `F2`, `F1` | Faktoren-Lookup matrix (10 factor columns) | ❌ | User-defined lookup keys (text or formula tokens like `schlitz+Q*querschnitt` — these are the cells that **error** when the lookup names are unresolved — see §5) |
| **X** | `Kosten` | Total cost (calc field) | ❌ | |
| **Y** | `in min` | Time accumulator | ❌ | |
| **Z** | `Geräte` (EK) | Equipment EK / EH | ❌ | |
| **AA** | `Geräte` (VK) | Equipment VK / EH | ❌ | `= Z * (1 + ZSCHLG_geraet)` |
| **AB** | `Löhne` (EK) | Labor EK / EH | ❌ | `= J/60 * Mittellohn` |
| **AC** | `in min` | Adjusted minutes | ❌ | `= J * (1 + Zeitwert)` |
| **AE** | `Löhne` (VK) | Labor VK / EH | ❌ | `= AB * (1 + ZSCHLG_lohn)` |
| **AF** | `Stoffe` (VK) | Material VK / EH | ❌ | `= I * (1 + ZSCHLG_stoffe)` |
| **AG** | `Geräte` (VK alt) | (duplicate-ish — varies by file) | ❌ | |
| **AH** | `Nachunt.` (VK) | NU VK / EH | ❌ | `= M * (1 + ZSCHLG_nu)` |
| **AJ** | `Stoffe VK` | Material VK accumulator | ❌ | |
| **AK** | `Nachu.` | NU accumulator | ❌ | |
| **AM** | `Tagen` | Working-days projection | ❌ | |
| **AN** | `Gesamt` | Total accumulator | ❌ | |
| **AP** | `pro Einheit` | Per-unit roll-up | ❌ | |

**Canonical customer-visible zone = `A:G`. Everything from `I` onward is internal.** (Column H is empty in all files — it's the visual gap between zones.)

---

## 4. Position-number / hierarchy patterns observed

Real-world OZ strings the parser **must** accept (all four examples below should resolve to the SAME canonical key `1.4.1.1`):

```
" 1. 4. 1.  .   1"   — example 1, real string
" 1.4.1.1"           — same content, no padding
"1.4.1.1"            — no leading space
" 1. 4. 1.   .  1"   — irregular padding (also seen)
```

Other patterns:
- `" 1. 4"` — level-2 group header (KG); col C carries the **group total**, col D/E/F are empty
- `" 1. 4. 1"` — level-3 sub-group header (KG-sub); cols C–F are empty (subtotal lives in col G)
- `"Pos. 1"` — flat-numbering (example 2); no KG hierarchy
- `" .  .  10"` — number-only positions (example 3); leading-dot padding signals "no parent levels"
- `""` (empty OZ) — buffer / commentary row (example 4 line 17/18 — these carry pure description text in col B)

**Parser rule** (proposed):

```
OZ_NORMALIZE = trim → split on '.' → trim each segment → drop empty segments → rejoin with '.'
LEVEL = count of non-empty segments
IS_GROUP = (cols D, E, F all empty AND col C is numeric)  OR  (level < 3 AND no Menge)
IS_POSITION = (col C numeric AND col D non-empty AND col E numeric)
IS_BUFFER = (OZ empty AND col B non-empty)  // descriptive insert, render as a hint row
```

---

## 5. Formula-error cells — confirmed hotspots

| Cell | Files affected | Formula | Why it errors | Treat as |
|---|---|---|---|---|
| `Kalkulation!U2` | ex1, ex3, ex4 | `schlitz+Q2*querschnitt` | Undefined named ranges `schlitz`, `querschnitt` | `#VALUE!` |
| `Kalkulation!U3` | ex1, ex3, ex4 | `lasttrennschalter+lastfaktor*Q3` | Undefined named ranges | `#VALUE!` |
| `Kalkulation!U4` | ex1, ex3, ex4 | `zählerschrank+Q4*zählergröße` | Undefined named ranges | `#VALUE!` |
| `Kalkulation!U12` | ex1, ex3, ex4 | `rohrverlgen+Q12*#REF!` | Hard `#REF!` literal in formula | `#REF!` |
| ex2 | — | — | Clean (newer/smaller file) | No errors |

**Implication for the importer (PART D):**
- Errors are restricted to internal-zone cells (col U is part of the F3 Faktoren-Lookup at N–W). They do NOT contaminate the customer-visible columns (A–G).
- The importer should **import the customer side anyway** but flag the broken Faktoren-Lookup so the user knows they can't rely on the auto-derived factor when re-pricing.
- The "refuse import entirely on any formula error" rule from the original brief is **too strict** — it would block 3 of 4 real files. Better policy: **import, but mark the broken lookup cells and refuse to share** until cleared (since a broken lookup could silently push wrong EP into col E if the user edits it). Documented in `importer_readme.md`.

---

## 6. Variance across files

| Property | ex1 | ex2 | ex3 | ex4 |
|---|---|---|---|---|
| Hierarchy max depth | 4 | 2 (flat) | 1 | 3 |
| Pos. count (data rows) | ~234 | ~54 | ~26 | ~421 |
| Uses KG group headers | Yes (KG 442, 444, …) | No (only "Leistung" hint at r15) | No | Yes (KG 443, KG 444, …) |
| ZSCHLG Stoffe | 23 % | 25 % | 20 % | 23 % |
| ZSCHLG NU | 23 % | 25 % | 20 % | 23 % |
| ZSCHLG Geräte | 10 % | 10 % | 10 % | 10 % |
| Lohnfaktor (K7) | 1.2633 | 1.1633 | 1.1633 | 1.2633 |
| Stundensatz (M2) | 67.90 € | 64.90 € | 64.90 € | 67.90 € |
| Mittellohn (K2) | 30 | 30 | 30 | 30 |
| Zeitwert | −15 % | +50 % | 0 % | −15 % |
| Has buffer/description rows | Yes | Yes | Yes | Yes (frequent) |
| U2–U4 / U12 formula errors | Yes | No | Yes | Yes |
| Faktoren-Lookup names defined | No | Partial | No | No |

**Stable across all files (the canonical contract):**
- Sheet name `Kalkulation`
- 48-column grid
- Row-13 header pattern (cols A–F + I–AP labels)
- Header anchors (`AG:`, `Leistung:`, `BV:`, `Bieter:`, `Netto Angebotssumme`, `MwSt.:`, `Brutto Angebotssumme`)
- ZSCHLG matrix at I3:M11
- Customer-zone = A:G

**Project-specific (handled per-file):**
- Hierarchy depth & numbering style (1 to 4 levels)
- Whether KG-group headers exist
- ZSCHLG values, Lohnfaktor, Stundensatz, Zeitwert
- Whether Faktoren-Lookup names resolve (most files: no)
- Faktoren-Lookup names defined: most files have broken refs in U2–U12

---

## 7. Implications for redesign

| Implication | Where it lands |
|---|---|
| Importer must accept all 4 hierarchy styles | PART D / `src/lib/kalku-xlsx/parse.ts` |
| Column-zone classification is **stable** — A:G customer, I:AP internal, H buffer | `PositionTableV2` already enforces this for the in-app model |
| Header anchors give us robust block detection | PART D detector |
| Formula errors at U2–U12 are common — must downgrade "refuse import" to "import + warn" | PART D + `importer_readme.md` |
| ZSCHLG / Stundensatz live in header block — parser must lift them into `CalcParams` | PART D |
| KUNDEN view stripping is correct: drop col H onward, period | `PositionTableV2` ✅ already |

End.
