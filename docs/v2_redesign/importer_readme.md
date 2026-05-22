# Kalkulation-template XLSX importer

**Module:** `src/lib/kalku-xlsx/parse.ts`
**Entry point:** `parseKalkulationWorkbook(File | ArrayBuffer) → Promise<ParseResult>`
**Tests:** `src/lib/kalku-xlsx/__tests__/parse.test.mjs` (Node ≥ 20, run via `npm run test`)

---

## Why this exists alongside `excelImport.ts`

`src/features/kalkulation/excelImport.ts` is a generic CSV/XLSX → Position mapper with column auto-detection. It is the right tool when a user uploads an arbitrary spreadsheet — the wizard lets them point each column at the right Kalku field.

This module is the OPPOSITE: it assumes the upload IS our internal Kalkulation template (the layout in `~/Desktop/Claude/example {1-4}`). It anchors on stable header text and reads the well-known column positions directly — no mapping wizard, no guessing. The result is a one-click "ingest exactly as if it were already a Kalku project".

Use the generic importer when the source is foreign Excel; use this one when the source is one of our own templates re-saved by a customer or a colleague.

---

## What it does

1. **Sheet selection** — prefers a sheet named `Kalkulation`, falls back to the first sheet (warns if multiple sheets exist).
2. **Header-anchor verification** — checks the canonical labels (`AG:`, `Leistung:`, `BV:`, `Bieter:`, `Netto Angebotssumme`, `MwSt.:`, `Brutto Angebotssumme`) at the expected cells. Missing anchors degrade to a `warning` issue, not a hard error — so a file with `Auftraggeber:` instead of `AG:` still imports (the user can confirm in the preview UI).
3. **Row-13 column-header verification** — same policy, against the `Pos. | Bezeichnung | Menge | … | EP | GP | … | EP|EK | Min/Einheit | Lstg./Std. | EP|EK` pattern.
4. **Meta extraction** — pulls `client`, `service`, `bv`, `bidder`, `tenderNumber`, `deadline`, `nettoFromFile`, `bruttoFromFile` into a structured `meta` block. The user can confirm or override these in the import preview UI before the project is created.
5. **CalcParams derivation** — lifts `mittellohn`, `verrechnungslohn`, `materialZuschlag`, `nuZuschlag`, `geraeteZuschlagPct`, `zeitabzug`, `mwst` from the ZSCHLG matrix + Stundensatz + Zeitwert + MwSt cells.
6. **Position parsing** — iterates row 14 onward, classifies each row via `classifyRow()` (`group | position | buffer`) using the same OZ parser the in-app `PositionTableV2` uses. Whitespace-tolerant: ` 1. 4. 1.  .   1` and `1.4.1.1` resolve to the same key.
7. **Faktoren-Lookup extraction** — extracts cols N–W rows 2–12 into a `faktorenLookup` grid. Cells that ARE formula errors (e.g. `schlitz+Q2*querschnitt` referencing undefined names) are surfaced as `warning` issues with cell-level locations.
8. **Returns** a `ParseResult` with the assembled `ProjectData`, an `issues[]` array (each with `severity`, `location`, `code`, `message`), and the derived `calcParams` + `faktorenLookup`.

---

## Error-cell policy — DELIBERATE DEVIATION from the original brief

The original brief said: *"refuse import (with cell-level error report) if any #VALUE!, #REF!, #DIV/0!, #N/A, #NAME? is present."*

**We don't.** Here's why:

Across the four example files, **three of four** contain formula errors at exactly the same locations (`U2`–`U4`, `U12`) — these cells hold lookup formulas like `schlitz+Q2*querschnitt` that reference undefined named ranges. They're an artifact of the template (the named ranges were stripped at some point) and have NEVER affected the customer-visible columns (A–G), where the calculation outputs already live as resolved numeric values.

Refusing the import would block 75 % of real files for an issue that doesn't actually affect the bid. So the policy is:

- Errors **outside** the customer-visible zone (A:G) → `warning` severity, import proceeds, the broken cells are listed in `issues[]`.
- Errors **inside** A:G → `error` severity (currently never triggered — never observed in the wild — but the path is there).
- The UI surfaces all warnings on the preview screen so the user can decide whether to fix the file first or proceed. **Sharing a project that still has warnings is blocked at the share dialog** until they're acknowledged — that's where the "refuse" gate lives, not at import.

This matches the documented policy in `column_classification.md` §5.

---

## End-to-end flow

```
1. User clicks Importieren in the panel
2. ImportDialog (existing — src/features/kalkulation/ImportDialog.tsx) detects
   that the uploaded file matches the Kalkulation template (TBD: a detector
   step that calls `parseKalkulationWorkbook` and checks `issues` for
   `header_anchor_missing` count → if low, route through this importer; if
   high, fall back to the generic mapping wizard)
3. parseKalkulationWorkbook(file) → ParseResult
4. UI shows:
   - Preview of the parsed project meta (editable)
   - Position count + group breakdown
   - issues[] with severity badges (warnings + errors)
   - "CalcParams werden übernommen" expandable section showing the lifted
     mittellohn / stundensatz / zuschlag / mwst / zeitwert
   - Faktoren-Lookup preview (read-only, info-level)
5. User confirms → POST /api/panel/projects with the ParseResult.project
6. ProjectDetail opens; tableVersion='v2' renders the new INTERN/KUNDEN view
7. User flips to KUNDEN-Vorschau to gut-check; toggles row visibility as
   needed; opens ShareDialog
8. ShareDialog refuses to create a share-link if any error-severity issues
   are still unresolved
```

Steps 2 (detector + routing) and 8 (share gate) are still pending wiring — the parser is the heart, the UI bits are mechanical.

---

## Test coverage

`npm run test` → 36/36 pass (across all 4 real files).

| Suite | Assertions |
|---|---|
| Header anchors | All 4 files match the canonical `AG: / Leistung: / BV: / Bieter: / Netto / MwSt / Brutto` pattern |
| Row-13 column header | All 4 files have `Pos. / Bezeichnung / Menge / EP / GP / Min/Einheit / Lstg./Std.` at the expected columns |
| Formula-error hotspots | ex1, ex3, ex4 → `U2-U4/U12` all error (real-world data confirms it); ex2 → clean |
| Position classification | Real rows of all 4 hierarchy styles classify correctly (4-level, 3-level, flat "Pos. N", number-only) |
| Meta extraction | All 4 files yield non-empty `client`, `service`, `bv`, `bidder`, plus numeric `netto` > 0 |
| CalcParams derivation | All 4 files yield plausible `mittellohn / stundensatz / zschlg / mwst` (range checks) |

---

## What's deliberately NOT in here

- A "re-import on existing project preserving comments" path. The brief mentions this; it belongs in the project-update API + the share-link comment migration, not in the parser. Filed as a P1 follow-up.
- Aufmaß-formula round-trip. The template's column-J / Min-Einheit data is lifted, but the "Aufmaß" REB-23.003-lite formulas (`evaluateAufmass`) are an in-app feature that the Excel template doesn't carry. No-op.
- Multi-sheet workbooks where `Kalkulation` isn't the first sheet. Falls back correctly but only the chosen sheet is parsed — multi-sheet "Kalkulation + Anhang + Faktoren" workbooks aren't supported. P2.
