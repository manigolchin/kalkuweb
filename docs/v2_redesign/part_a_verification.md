# PART A — v2 verification proof

**Date:** 2026-05-22
**Branch:** `claude-auto/2026-05-22-chef-preview-setup`

---

## 1. End-to-end rendering against real data

Built a dev-only sandbox at **`/dev/kalku-v2`** (gated by `import.meta.env.DEV`) that mounts `PositionTableV2` with the fixture extracted from `~/Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx` (rows 15–32 of sheet `Kalkulation`) plus three sentinel rows for the leak test.

Files:
- `src/features/kalkulation/__fixtures__/lv3_bh.ts` — real LV3_BH positions + sentinels
- `src/pages/DevKalkuV2.tsx` — sandbox route component
- `src/App.tsx` — registers `/dev/kalku-v2` only in DEV builds

### Screenshots captured live in the session (re-runnable at `/dev/kalku-v2`)

| View | What it proves |
|---|---|
| **INTERN view** | Customer cols (white) vs internal cols (slate-50) with vertical divider. Real KG 442 group with subtotal 7.247,47 €. Sentinel rows visible with WAGNIS amber chip and locked icon. |
| **KUNDEN view** | Only A:G visible. Project meta header (AG, Leistung, BV, Bieter, Vergabe-Nr, Abgabe). KG 443 subtotal 312.693,25 €. Sentinel-hidden and sentinel-wagnis rows correctly excluded. |
| **Collapsed groups** | All KG groups collapse to single rows with subtotals preserved. Sticky bottom totals show NETTO 942.825,82 € · BRUTTO 1.121.962,73 €. "(2 KUNDE)" indicator on KG 443 because the sentinel-visible row is included. |

---

## 2. KUNDEN content-security leak test — **PASSED** ✅

Executed in-browser against the live KUNDEN view via the dev sandbox:

```javascript
// Scoped to [data-testid="v2-kunden-preview"] (NOT the whole page, which has a
// dev-only descriptive header that intentionally mentions the sentinels)
const preview = document.querySelector('[data-testid="v2-kunden-preview"]');
const html = preview.outerHTML;
const sentinels = [
  { name: 'materialCost (raw)',          token: '99999.99' },
  { name: 'materialCost (de-fmt)',       token: '99.999,99' },
  { name: 'timeMinutes (raw)',           token: '88888' },
  { name: 'timeMinutes (de-fmt)',        token: '88.888' },
  { name: 'nuCost (raw)',                token: '77777' },
  { name: 'nuCost (de-fmt)',             token: '77.777' },
  { name: 'internalNote sentinel',       token: '__LEAK_INTERNAL_NOTE__' },
  { name: 'aufmassFormula sentinel',     token: '__LEAK_AUFMASS__' },
  { name: 'hidden row description',      token: 'SENTINEL — hidden standard row' },
  { name: 'wagnis row description',      token: 'SENTINEL — wagnis internal row' },
];
const leaked = sentinels.filter((s) => html.includes(s.token));
```

**Result:**
```json
{
  "pass": true,
  "leakedCount": 0,
  "sentinelsChecked": 10,
  "scopeHtmlSize": 12121,
  "visibleCustomerRows": 10,
  "derivedSentinelEPVisible": true
}
```

`derivedSentinelEPVisible: true` is the correct positive control — the SENTINEL-visible row IS rendered in KUNDEN (it's `visibleToCustomer=true, positionType=standard`), and its **derived EP €311.442,55** is shown to the customer. The raw `materialCost=99999.99` that contributed to that EP is **never rendered**.

The two SENTINEL rows that should be hidden (one with `visibleToCustomer=false`, one with `positionType=wagnis` but `visibleToCustomer=true`) are both correctly excluded. This proves both filters work — and that the `positionType=wagnis` filter wins even when a buggy edit sets visibility true.

---

## 3. Pure-logic tests via `npm run test`

`src/features/kalkulation/ozParser.mjs` is a 100-line pure-JS module exporting:
- `ozSegments(raw)` → string[]
- `ozKey(raw)` → canonical "1.4.1.1" string
- `ozLevel(raw)` → number
- `classifyRow({oz, B, C, D, E, F})` → `'group' | 'position' | 'buffer'`
- `isErrorCell(cell)` → boolean

`src/features/kalkulation/__tests__/ozParser.test.mjs` covers all four hierarchy styles found across the 4 example files plus column-C overload + formula-error detection.

**Run with `npm run test`:**

```
▶ ozParser — whitespace tolerance
  ✔ all real-file whitespace variants resolve to the same key 1.4.1.1
  ✔ flat numbering (example 2): "Pos. 1" → ["Pos","1"], key "Pos.1"
  ✔ number-only (example 3): " .  .  10" → ["10"], level 1
  ✔ empty / buffer rows resolve to level 0
  ✔ group headers: " 1. 4" stays as 2 segments
▶ classifyRow — column-C overload
  ✔ level-2 group row: C carries the subtotal, D/E/F empty → "group"
  ✔ level-4 position row: full A-F filled → "position"
  ✔ level-3 sub-group: " 1. 4. 1" with all C/D/E empty → "group"
  ✔ buffer row: empty OZ with description-only → "buffer"
▶ isErrorCell — formula-error detection
  ✔ Excel error cells (t==="e") are detected
  ✔ string-literal error values are detected (defensive)
  ✔ clean numeric / string / null cells are NOT errors

ℹ tests 12   pass 12   fail 0   duration_ms 126.45
```

**Why Node's built-in `node:test` and not vitest**: the standing rule in `CLAUDE.md` forbids installing new npm dependencies without a queue item. Node 20+ ships `node:test`, which gave us a real, repeatable, CI-able test runner with zero install cost. When/if the team wants vitest (for jsdom/Testing Library/snapshot ergonomics), it's a one-line `npm i -D vitest` and a small rename — the test logic ports as-is.

---

## 4. Lint + Build status

```
$ npm run lint
✖ 6 problems (0 errors, 6 warnings)
  // All warnings pre-existing in unrelated files (data/blog.tsx, lib/auth.tsx,
  // components/sections/SubmissionTriage.tsx). Zero in the new v2 code.

$ npm run build
✓ built in 3.76s
  dist/assets/ProjectDetail-*.js  ~96 KB │ gzip: 24 KB
```

The DevKalkuV2 component is lazy-loaded behind `import.meta.env.DEV` and tree-shaken from production bundles.

---

## 5. What this verifies vs. what's still gap

**Verified (with running code, real data, automated assertions):**
- v2 renders the full LV3_BH KG 442+443 hierarchy correctly
- INTERN ↔ KUNDEN view toggle works; URL not used yet (state is component-local — moving it to URL is a P2 polish)
- KUNDEN preview NEVER renders internal cost fields (sentinel-leak test passes 10/10)
- `visibleToCustomer=false` filters rows out of KUNDEN
- `positionType=wagnis` filters rows even when visibility flag is buggy-set
- KG group collapse/expand works; subtotals stay visible
- OZ parser tolerates all 4 whitespace styles observed across the example files
- Column-C overload classifier correctly distinguishes group rows from position rows
- Formula-error detection works for both Excel-typed (`t === 'e'`) and string-literal cases
- Lint, build, and tests all green

**Not yet (deferred to PART D and a follow-up):**
- Vitest + jsdom + Testing Library (would let us write proper component-level tests that drive React Testing Library queries instead of querySelector). Blocked by the no-npm-install rule.
- A `puppeteer`/`playwright`-based CI test that hits the dev sandbox at `/dev/kalku-v2` and re-runs the leak assertion on every commit. Blocked same way; for now the test is reproducible by re-running the eval snippet in §2 against a `vite dev` instance.
- The third item in the user's spec — `(d) Error-cell rejection — fixture with #VALUE! in col U → import returns cell-level error report, refuses to populate the LV` — depends on the importer (PART D). It's covered by the `isErrorCell` unit test above, but the full pipeline assertion happens in PART D.
