# Formula Audit — Our EP/GP vs. Real Excel Vorlage

**Audit Date:** 2026-05-22
**Trigger:** User screenshot showed Mobilbauzaun position with `Menge=100.000 m`, `Material=2`, `EP=2,24`, `GP=224.000,00 €` and asked "are you sure that formular are correct i think is wrong".
**Reference file:** `/Users/admin/Library/CloudStorage/OneDrive-FreigegebeneBibliotheken–kalku/KT01 - Documents/1695_Gesellchen_GmbH/260512_Ludwigschule_St_Ingbert/LV3.xlsx` (Sanierung Sandsteinmauer — real Gesellchen GmbH project)
**Tool used:** `scripts/inspect-lv3-formulas.mjs` (reads raw cell formulas via SheetJS `cellFormula: true`)

---

## TL;DR

**The formula is correct.** Our code in `src/features/kalkulation/calc.ts` matches the real Excel Vorlage **cell-by-cell**. The €224.000,00 in the screenshot is the **mathematically correct** consequence of `Menge = 100.000` (= one hundred thousand meters = 100 km of mobile fence). The "wrong-looking" total is a **data magnitude issue, not a formula bug**.

---

## What the real Excel actually does (extracted from LV3.xlsx, row 16 onwards)

Per position row, the Excel template stores raw inputs in these columns:

| Excel col | Meaning | Type |
|---|---|---|
| `C` | Menge (quantity) | input |
| `X` | Material EK (€) — input via mirror in `I` | input |
| `Y` | Min/Einheit (minutes per unit) | input |
| `M` | NU EK (€) | input |
| `Z` | gzuschlag (constant per row, default `0.5`) | named-range |

And then **every position row** derives EP and GP via these exact formulas:

```excel
AC =  Y + (Y/100 * zeitabzug)           ← adjusted minutes (with zeitabzug %)
AA =  AC/60 * Z                          ← Geräte cost share (€)
AB =  AC/60 * verrechnungslohn           ← Lohn cost share (€)
AJ =  X + (X * materialzuschlag)         ← Material w/ Material-Zuschlag (€)
AK =  M + (M * nzuschlag)                ← NU w/ NU-Zuschlag (€)

E  =  AA + AB + AJ + AK                  ← EP (Einheitspreis)
F  =  C * E                              ← GP (Gesamtpreis)
```

Named ranges (read from `wb.Workbook.Names`):
| Name | Excel ref | Value in this Vorlage |
|---|---|---|
| `materialzuschlag` | `K4` | `0.12` |
| `nzuschlag` | `K5` | `0.12` |
| `verrechnungslohn` | `M2` | `49.9` €/h |
| `gzuschlag` | `AP3` | `0.5` (€/h Geräte rate) |
| `zeitabzug` | `AP5` | (typically `0`) |

---

## What our code does (`src/features/kalkulation/calc.ts:32-62`)

```typescript
const adjustedTime = pos.timeMinutes + (pos.timeMinutes / 100) * params.zeitabzug;
const epGeraet   = (adjustedTime / 60) * params.geraeteStundensatz;
const epLohn     = (adjustedTime / 60) * params.verrechnungslohn;
const epMaterial = pos.materialCost * (1 + params.materialZuschlag);
const epNu       = pos.nuCost * (1 + params.nuZuschlag);
const ep         = epLohn + epMaterial + epGeraet + epNu;
const gp         = pos.quantity * ep;
```

Plus `DEFAULT_CALC_PARAMS`:
```typescript
{
  mittellohn:           30.0,   // matches Excel K2 = 30
  verrechnungslohn:     49.9,   // matches Excel M2 = 49.9
  materialZuschlag:     0.12,   // matches Excel K4 = 0.12
  nuZuschlag:           0.12,   // matches Excel K5 = 0.12
  geraeteZuschlagPct:   0.10,   // matches Excel K6 = 0.10
  geraeteStundensatz:   0.5,    // matches Excel gzuschlag = 0.5
  zeitabzug:            0,
  mwst:                 0.19,   // matches Excel D9 = 0.19
}
```

---

## Side-by-side proof (component by component)

| Component | Excel formula | Our code | Match |
|---|---|---|---|
| Adjusted minutes (`AC`) | `Y + (Y/100*zeitabzug)` | `timeMinutes + (timeMinutes/100)*zeitabzug` | ✅ |
| Geräte share (`AA`) | `AC/60 * gzuschlag` | `(adjustedTime/60) * geraeteStundensatz` | ✅ |
| Lohn share (`AB`) | `AC/60 * verrechnungslohn` | `(adjustedTime/60) * verrechnungslohn` | ✅ |
| Material w/ Zuschlag (`AJ`) | `X + (X * materialzuschlag)` | `materialCost * (1 + materialZuschlag)` | ✅ (algebraically identical) |
| NU w/ Zuschlag (`AK`) | `M + (M * nzuschlag)` | `nuCost * (1 + nuZuschlag)` | ✅ (algebraically identical) |
| EP (`E`) | `AA + AB + AJ + AK` | `epLohn + epMaterial + epGeraet + epNu` | ✅ |
| GP (`F`) | `C * E` | `quantity * ep` | ✅ |
| Default values | K2=30 / M2=49.9 / K4=0.12 / K5=0.12 / K6=0.10 / gzuschlag=0.5 / D9=0.19 | mittellohn=30 / verrechnungslohn=49.9 / materialZuschlag=0.12 / nuZuschlag=0.12 / geraeteZuschlagPct=0.10 / geraeteStundensatz=0.5 / mwst=0.19 | ✅ |

**Conclusion: formula and defaults are an exact 1:1 mirror of the Vorlage.**

---

## Walk-through of the Mobilbauzaun screenshot

Inputs visible in the screenshot:
- `Menge      = 100.000  m`  (German format → **one hundred thousand** meters)
- `Material   = 2`            (Material EK = €2 / m)
- `Min/Einheit = 0`           (not entered, no labour time)
- `NU EK      = 0`            (no subcontractor)

Step through our formula (which matches Excel):

| Step | Calculation | Value |
|---|---|---|
| `adjustedTime` | `0 + (0/100)*0` | `0` |
| `epGeraet` | `0/60 * 0.5` | `0` |
| `epLohn` | `0/60 * 49.9` | `0` |
| `epMaterial` | `2 * (1 + 0.12)` | `2.24` |
| `epNu` | `0 * (1 + 0.12)` | `0` |
| **`ep`** | `0 + 2.24 + 0 + 0` | **`2.24`** ✓ matches screen |
| **`gp`** | `100000 * 2.24` | **`224000.00`** ✓ matches screen |

The display reads "2,24 €" and "224.000,00 €" exactly as our formula predicts. **No bug.**

---

## So why does it "look wrong"?

Because **100.000 m of mobile fence is 100 kilometres of fence**, which is physically unrealistic for a single school renovation. The likely root cause is one of:

1. **GAEB-import unit interpretation.** The source GAEB record may have had `Menge = 100,00` (German "one hundred, two decimals") and our importer interpreted the dot as a thousands separator instead of a decimal mark.
2. **User typo at entry.** Someone typed `100000` thinking they were entering one hundred.
3. **Genuine large quantity.** If this is a real long-term Bauzaun rental tender, 100 km might be correct — but the per-meter Material cost of €2 then wildly understates a real fence.

The **panel** is doing exactly what the **Excel** would do given the same Menge — we have parity.

---

## Recommended follow-ups (separate work items — NOT in this audit commit)

1. **Sanity-check on absurd magnitudes.** When `Menge × EP > €100.000` for a single line item, show an amber warning chip in INTERN: "Bitte Menge prüfen". Non-blocking.
2. **GAEB-import audit for thousands/decimal handling.** Round-trip a known LV through the parser, verify that `100,00 m` arrives as `100.00`, not `10000`.
3. **EP breakdown tooltip.** Hovering on the EP cell could show a 4-line breakdown:
   ```
   Material:  2,00 × 1,12 =  2,24 €
   Lohn:      0,0/60 × 49,90 =  0,00 €
   Geräte:    0,0/60 × 0,50  =  0,00 €
   NU:        0,00 × 1,12 =  0,00 €
   ──────────────────────────────
   EP        =          2,24 €
   ```
   This would have answered the user's question in 1 second instead of requiring an audit.

---

## Reproducer

```bash
node scripts/inspect-lv3-formulas.mjs
```

Reads the same Excel I used; dumps every formula in the header block, the named-range table, and the first 36 position rows. Use this any time you want to re-verify formula parity against a real customer Vorlage.
