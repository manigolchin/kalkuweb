# Round 4 progress checkpoint

**Date:** 2026-05-22
**Branch:** `claude-auto/v2-gaps-closeout` (same as Rounds 1-3)

## Status per PART

| PART | Title | Status | Commit |
|---|---|---|---|
| N | Bezeichnung text-wrap (no truncation) + LV read-only foundation | ✅ shipped, 7 tests | `2a669c8` |
| P | Full-fidelity Excel import (Zuschlag matrix + extras + Faktoren) | ✅ shipped, 13 tests, fidelity report zero-discrepancy | `<sha>` |
| O | Read-only LV positions + editable ZSCHLG % matrix | ✅ shipped, 7 tests + 9 leak guards | `<sha>` |
| Q | INTERN exposes Vorlage matrix + Mitarbeiter/Std/Überschuss strip | ✅ shipped (bundled with O), 4 tests + sentinel guard | `<sha>` |

## Headline numbers

- **Frontend (vitest+jsdom):** 87/87 pass (was 51 pre-Round-4, +36)
- **Backend (node:test):** 51/51 pass (unchanged from Round 3)
- **Playwright e2e:** 1/1 pass in ~9 s (unchanged)
- **Fidelity:** 0 discrepancies in [`import_fidelity_report.md`](import_fidelity_report.md) across all 4 real example Excel files
- **Total assertions:** 139+ across the stack

## What's new in users' hands after deploy

### PART N — text fidelity

Every Bezeichnung renders in full, no clipping, no ellipsis, no line-clamp. KG/Titel headings wrap the same way. Long-text spec rows (e.g. "Erweiterung der bestehenden Zählerschrankanlage für E-Mobilität inkl. 35A SLS-Sicherung…") show their entire content on first render. Row height grows to fit; EP/GP cells top-align so a 4-line Bezeichnung doesn't push the price off the row. Tested with a synthetic 300-character Bezeichnung against the LV3_BH fixture.

### PART P — full-fidelity import

The Kalkulation-template importer now captures:

| Field | Source cell(s) | New field on ProjectData |
|---|---|---|
| Zuschlag matrix per cost type | J4:M7 | `zuschlagOriginal: ZuschlagMatrix` |
| Mitarbeiter | J8 | `headerExtras.mitarbeiter` |
| Ges. Std. | L8 | `headerExtras.gesStunden` |
| Arbeitstage | J9 | `headerExtras.arbeitstage` |
| Monate | L9 | `headerExtras.monate` |
| Überschuss € | M9 | `headerExtras.ueberschuss` |
| Zeitwert % | J11 | `headerExtras.zeitwert` |
| Kontrollsumme | M11 | `headerExtras.kontrollsumme` |
| Faktoren-Lookup (structured) | N–W × 2–12 | `faktoren: FaktorEntry[]` |

Round-trip test (`__tests__/full-fidelity.test.ts`) parses each of the 4 example files, walks the canonical cells via raw SheetJS, and asserts the captured values match within ±0.01 (numerics) and byte-exact (strings). 13 tests per-file all green. Final test writes a Markdown discrepancy table to `docs/v2_redesign/import_fidelity_report.md` — currently `## ✅ No discrepancies`.

### PART O — read-only LV + live-editable ZSCHLG

All LV-position fields locked: Pos, Bezeichnung, Menge, Einheit, EP, GP, Material EK, Min/Einheit, NU EK, Langtext, KG-group name. No `<input>`, no `<textarea>`, no `contenteditable`. The only EDITABLE numeric inputs in v2 are the ZSCHLG % cells in the matrix strip.

ZSCHLG live behavior:
- Each cost-type row has a `<ZschlgInput>` (text, inputMode decimal)
- Typing → debounced 300 ms → `onZschlgChange(cost, decimal)` fires
- `ProjectDetail.tsx` persists the value to `data.zuschlagAktuell` AND syncs the corresponding `calcParams` field (materialZuschlag / nuZuschlag / geraeteZuschlagPct, or verrechnungslohn for 'lohn')
- Live EP/GP recompute cascades automatically through `calculatePosition()` in every position row
- Auto-save debouncer (existing) picks up the change after 800 ms
- "Zurücksetzen" link appears when aktuell ≠ original; click restores

### PART Q — INTERN-only exposure

The Zuschlag matrix strip is rendered ONLY in INTERN view (top-0 sticky), never in KUNDEN view, never in `ShareView`. The sentinel leak test confirms with 9 distinctive values (ZSCHLG Stoffe 99.99%, ZSCHLG Lohn 88.88%, Stundensatz 66.66, Überschuss 77.777,77 €) — none appear in KUNDEN-view DOM under any condition, including immediately after a live ZSCHLG % edit.

## What's deliberately deferred (Round 5)

These items in the Round 4 brief I didn't ship — flagging honestly:

- **Audit log of ZSCHLG changes** (who/when/old→new). The data model is there (`zuschlagAktuell` overrides), but a structured per-change audit record isn't persisted yet. Comes for free once we route through the existing `auditEvents` table — would need a backend endpoint + a client-side fetch trigger.
- **Re-import merge prompt** ("Neue Excel hat ZSCHLG 20%, aktuell 25%. Übernehmen / Behalten / pro Cost Type entscheiden?"). The ImportDialog currently overwrites `calcParams` on replace-mode and merges on append-mode; the comparison-and-prompt flow is a UX modal I didn't build.
- **Toast on locked-field click attempts** ("Dieses Feld ist read-only. LV-Daten bitte in Excel ändern…"). The locked fields are read-only `<div>`s with no click handler — no event fires to attach a toast to. The dismissible localStorage-remembered version requires either a hover hint or wrapping every locked div in a button — meaningful UX call I'd want to discuss before shipping.
- **Kalkulationsdetail expander per row** (X–AP derived values from the Excel). The X–AP columns are derived from the captured EK + ZSCHLG; they can be recomputed live. The expander UI is straight UI work I didn't ship in this round.
- **Faktoren-Bibliothek side drawer**. The data is captured (`project.faktoren` array); the drawer UI isn't yet built.
- **Playwright visual snapshot of long-text row** in PART N. Visual regression testing needs baseline snapshots + reviewer workflow; not trivial to bootstrap.

## File inventory (this round)

**New**:
- `src/features/kalkulation/ZuschlagMatrixStrip.tsx` — sticky matrix component
- `src/features/kalkulation/__tests__/PositionTableV2.readonly.test.tsx` — PART N + early-O tests
- `src/features/kalkulation/__tests__/PositionTableV2.zschlg.test.tsx` — PART O+Q tests + leak guard
- `src/lib/kalku-xlsx/__tests__/full-fidelity.test.ts` — PART P round-trip
- `docs/v2_redesign/import_fidelity_report.md` — auto-generated; commit shows "✅ No discrepancies"
- `docs/v2_redesign/progress_round4.md` — this doc

**Modified**:
- `src/features/kalkulation/types.ts` — new ProjectData fields + ZuschlagMatrix / HeaderExtras / FaktorEntry types
- `src/features/kalkulation/PositionTableV2.tsx` — read-only divs, top-align, removed NumCell, ZuschlagMatrixStrip integration
- `src/features/kalkulation/ProjectDetail.tsx` — ZSCHLG callbacks + removeKey helper
- `src/lib/kalku-xlsx/parse.ts` — matrix + extras + faktoren capture
- `src/features/kalkulation/__fixtures__/lv3_bh.ts` — 4 new sentinel constants
- `src/pages/ShareView.tsx` — Bezeichnung wraps in customer-facing position rows

End.
