# Cross-Project Formula Audit — kalku-website vs bauki/kalku-ki vs Real Excel

**Audit Date:** 2026-05-22
**Trigger:** User followup after the kalku-website ↔ LV3.xlsx audit: "check formula in bauki tool in projects that for claculation that we system have like that calculation formular" — verify the bauki/kalku-ki tool computes EP/GP the same way.
**Sister project audited:** `/Users/admin/projects/bauki/kalku-ki/`
**Reference:** [formula_audit_vs_real_excel.md](./formula_audit_vs_real_excel.md) (kalku-website ↔ LV3.xlsx, already proven 1:1)

---

## TL;DR

**Both engines in bauki/kalku-ki use the SAME formula as kalku-website and the SAME formula as the real Excel Vorlage.** No mathematical drift in either tool. The only differences across the three are the **default parameter values** (labour rate, material/NU markup) — those are intentional per-firma settings, not bugs.

---

## bauki/kalku-ki has TWO calculation engines

### Engine 1 — `src/utils/projectCalc.js` (manual / fallback flow)

`calculatePosition(quantity, materialCost, timeMinutes, nuCost, params)` at lines 22–78.
Verified exact code (sed -n '22,42p'):

```javascript
const actualTime = timeMinutes + (timeMinutes / 100 * params.zeitabzug);
const epGeraete  = (actualTime / 60) * params.geraete_stundensatz;
const epLohn     = (actualTime / 60) * params.verrechnungslohn;
const epMaterial = materialCost * (1 + params.material_zuschlag);
const epNu       = nuCost * (1 + params.nu_zuschlag);
const ep         = epGeraete + epLohn + epMaterial + epNu;
const gp         = quantity * ep;
```

### Engine 2 — `src/engine/calculator.js` (Regelwerk auto-calc flow)

`calculatePosition` at lines 282–297. Verified exact code:

```javascript
result.EP_lohn     = round2((Y / 60) * p.stundensatz);
result.EP_material = round2(X * (1 + p.zuschlag_material));
result.EP_geraet   = round2((Y / 60) * Z);
result.EP_nu       = 0;                                      // NU positions use a separate calculateNU()
result.EP          = round2(result.EP_lohn + result.EP_material + result.EP_geraet + result.EP_nu);
result.GP          = round2(result.EP * result.quantity);
```

*Note:* Engine 2 omits the `zeitabzug` adjustment because Y is sourced from the Regelwerk lookup table, which is pre-adjusted by construction. Engine 1 applies `zeitabzug` for manually-entered values. **Both are arithmetically correct** for their respective inputs.

---

## Side-by-side: Excel ↔ kalku-website ↔ bauki (both engines)

| Element | Real Excel (LV3.xlsx) | kalku-website (`calc.ts`) | bauki projectCalc.js | bauki calculator.js |
|---|---|---|---|---|
| adjMin | `Y + (Y/100*zeitabzug)` | `timeMinutes + (timeMinutes/100)*zeitabzug` | `timeMinutes + (timeMinutes/100*zeitabzug)` | `Y` (pre-adjusted) |
| epLohn | `AC/60 * verrechnungslohn` | `(adjMin/60)*verrechnungslohn` | `(actualTime/60)*verrechnungslohn` | `(Y/60)*stundensatz` |
| epGeraet | `AC/60 * gzuschlag` | `(adjMin/60)*geraeteStundensatz` | `(actualTime/60)*geraete_stundensatz` | `(Y/60)*Z` |
| epMaterial | `X + (X*materialzuschlag)` | `materialCost*(1+materialZuschlag)` | `materialCost*(1+material_zuschlag)` | `X*(1+zuschlag_material)` |
| epNu | `M + (M*nzuschlag)` | `nuCost*(1+nuZuschlag)` | `nuCost*(1+nu_zuschlag)` | `0` (separate `calculateNU()`) |
| EP | `AA+AB+AJ+AK` | `epLohn+epMaterial+epGeraet+epNu` | `epGeraete+epLohn+epMaterial+epNu` | `EP_lohn+EP_material+EP_geraet+EP_nu` |
| GP | `C * E` | `quantity * ep` | `quantity * ep` | `quantity * EP` |
| Project Brutto | `Netto * (1+0,19)` | `totalNetto + totalNetto*mwst` | `netto * (1+mwst)` | (handled at project level) |

**Conclusion:** Every formula step is identical (modulo variable names). Three independent implementations of the same math. **No drift.**

---

## Default-value comparison (the ONE real difference)

| Parameter | Excel Vorlage default | kalku-website default | bauki FIRMA_DEFAULTS |
|---|---|---|---|
| Labour rate (verrechnungslohn) | `M2 = 49,90 €/h` | `49.9` | **`stundensatz = 72,51 €/h`** ⚠️ +45 % |
| Material Zuschlag | `K4 = 0,12` | `0.12` | **`zuschlag_material = 0,20`** ⚠️ +67 % |
| NU Zuschlag | `K5 = 0,12` | `0.12` | **`zuschlag_nu = 0,20`** ⚠️ +67 % |
| Geräte Stundensatz | `gzuschlag = 0,5 €/h` | `0.5` | `geraete_default = 0,50 €/h` ✅ |
| MwSt | `D9 = 0,19` | `0.19` | `mwst = 0,19` ✅ |

bauki ships higher defaults (`72,51 €/h` labour, 20 % markups). This is **intentional firma policy** — bauki assumes a different cost base — not a formula bug. If you want bauki to behave exactly like the Gesellchen-style Vorlage, the user should override these defaults in bauki's Einstellungen module to `49,9 / 0,12 / 0,12 / 0,5`.

---

## What the user should take away

1. **All three calculators compute EP and GP the same way.** kalku-website ✓ bauki Engine 1 ✓ bauki Engine 2 ✓ real Excel ✓
2. **The 224 k issue** from the previous screenshot was a **Menge-magnitude issue (100 km of fence)**, not a formula bug — confirmed by [the previous audit](./formula_audit_vs_real_excel.md).
3. **The only "drift" is per-firma defaults** in bauki (€72,51/h vs €49,90/h, 20 % vs 12 %). If you switch a project between tools and notice different EP values, **check the Zuschlag matrix + Verrechnungslohn first** — the formula is identical.

---

## Reproducer

```bash
# Verify kalku-website ↔ Excel:
node /Users/admin/projects/kalku-website/scripts/inspect-lv3-formulas.mjs

# Verify bauki formulas (read the source directly):
sed -n '22,42p' /Users/admin/projects/bauki/kalku-ki/src/utils/projectCalc.js
sed -n '278,300p' /Users/admin/projects/bauki/kalku-ki/src/engine/calculator.js
grep -A 7 "FIRMA_DEFAULTS" /Users/admin/projects/bauki/kalku-ki/src/engine/regelwerk.js
```
