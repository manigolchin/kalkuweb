# Round 12 Feature Audit & Prioritized Roadmap
**kalku-website panel + calculation page**
**Analysis date:** 2026-05-25

---

## Executive Summary

The system has shipped 5 major features from the v4 roadmap (EFB 221/222/223, Preisspiegel, Snapshot Diff, GAEB Validator, Nachkalkulation Lite). The next phase must focus on **calculator productivity** — the 5–7 features that a professional calculator hits within the first hour of opening a real LV with 400+ positions.

The highest-impact gap is **bulk edit + keyboard navigation**, which competitors (Nevaris, iTwo, ARRIBA, ORCA) make table-stakes. Without it, a calculator cannot throughput a large LV in one sitting. The second group—**plausibility checks + sorting**—prevents the most expensive mistakes (missing prices, marginal outliers, OZ conflicts).

---

## The 5–7 Highest-Value Features (Next Sprint)

### 1. **Bulk Edit + Multi-Select (Position Batch Operations)**

**Priority:** P0 (must-have)  
**Effort:** Medium (4–5 days)  
**Risk:** Low (isolated to PositionTableV2 cell selection logic + onChange callback)

**User story:**  
*"Als Kalkulator will ich 30 Positionen markieren und den ZSCHLG Stoffe oder die Material-EP gleichzeitig um +5% anpassen, ohne 30 separate Klicks."*

**Why it matters:**
- A 400-position LV is unworkable without this. Last-hour changes (AG asks for –3% across Material, or +2% ZSCHLG Stoffe) take seconds in Nevaris, hours by hand in KALKU.
- Prevents fatigue errors (forgetting a row, copy-paste mishap).
- Unlocks "Angebots-Finalisierung" workflows where the Inhaber adjusts pricing en masse before submission.

**Implementation scope:**
- Add checkbox column + selection state (Set<positionId>) to PositionTableV2.
- Multi-select action bar: "X Positionen" + batch operation dropdowns (set EP, set Material-EK, apply ±% Aufschlag, set NU-Quote, toggle visibility).
- Server already recalcs; client-side preview before commit.
- No new backend endpoints — uses existing `api.projects.update()`.
- ~15 new tests (selection logic, batch formulas, edge cases like headers/groups).

**Competitors:** Nevaris, iTwo, ARRIBA, California.pro, ORCA.

---

### 2. **Undo / Redo (Cmd-Z / Cmd-Shift-Z)**

**Priority:** P0 (must-have)  
**Effort:** Medium (3–4 days)  
**Risk:** Medium (state management; must not break optimistic-locking or debounced-save)

**User story:**  
*"Ich will einen falschen Aufmaß-Wert oder Copy-Paste-Fehler mit Cmd-Z wegnehmen, ohne in den Autosave zu greifen."*

**Why it matters:**
- Every desktop tool has it. The absence screams "web app" in a negative way.
- One wrong paste destroys 10 minutes of work; only autosave recovery saves you (fragile UX).
- Enables rapid prototyping: calculators try pricing scenarios + revert instantly.

**Implementation scope:**
- In-memory ring buffer (50–100 edits per project) of ProjectData snapshots, keyed on position/field + timestamp.
- Trigger on: position quantity/EP/Material-EK change, ZSCHLG edit, formula save, batch operation.
- Exclude: auto-save or version-bump (those are explicit user intents, not edits).
- Keyboard handler in ProjectDetail: listen for Cmd-Z / Cmd-Shift-Z, pop/push from undo/redo stacks.
- Toast feedback: "Position 01.03.02 × Menge rückgängig gemacht."
- No server impact — entirely client-side; auto-save still fires normally.
- ~20 tests (push/pop, boundary conditions, exclusions, keyboard dispatch).

**Competitors:** Every major AVA + Excel.

---

### 3. **Inline Plausibility Badges (Missing Price / Outlier Detection)**

**Priority:** P0 (strong differentiator)  
**Effort:** Small (2–3 days)  
**Risk:** Low (view-only, no mutation)

**User story:**  
*"Ich will sofort sehen, welche Positionen EP = 0 haben oder >40% vom Median für denselben Kurztext abweichen — als rote Chip neben der OZ."*

**Why it matters:**
- Catches the single most-expensive bid mistake: missing prices submitted to the AG (Angebotsausschluss).
- Outlier detection catches copy-paste errors (Stoff-EP 999€ instead of 9,99€) before submission.
- Visual snapping: one pass through the LV, spot all red chips, fix, submit confidently.
- Competitors: California.pro "Plausibilitätsprüfung", Nevaris, ARRIBA.

**Implementation scope:**
- Two simple rules:
  1. **Missing price:** `ep === 0 && !isHeader` → red "Preis fehlt" chip.
  2. **Outlier:** `|ep - median| / median > 0.4` → amber "Ungewöhnlich" chip (suggests the median in the tooltip).
- Median lookup: run over `positions` of same user + same Kurztext (substring match).
- Render in PositionTableV2's OZ cell, left of the OZ number.
- Click badge → scroll to first position with that issue (optional polish).
- ~8–10 tests (zero price, outlier detection, median edge cases, tooltip content).

**Data store:** No new schema; median calculated client-side at render time (O(n²) acceptable for ≤500 positions).

---

### 4. **Keyboard Navigation (Tab / Shift-Tab / Arrow / F2 / Enter)**

**Priority:** P1 (strong signal of polish)  
**Effort:** Medium (3–4 days)  
**Risk:** Medium (keyboard event capture + cell focus management; test thoroughly on Firefox/Safari)

**User story:**  
*"Ich will wie in Excel durch die EP-Zellen Tab-ben, mit F2 in Edit-Modus springen, und mit Arrow Up/Down zwischen Positionen navigieren."*

**Why it matters:**
- Single biggest reason calculators say "fühlt sich an wie Excel" when evaluating tools.
- Saves 20–30% time for touch-typists; dramatically improves perceived responsiveness.
- Enables rapid number entry: skip non-editable cells (OZ, Bezeichnung) automatically via Tab.
- Competitors: Nevaris, California.pro, ORCA.

**Implementation scope:**
- Add focusable row/cell indices to PositionTableV2 state.
- Tab handler: skip to next editable cell (ignore headers, OZ, Bezeichnung, read-only).
- Shift-Tab: previous editable cell (with wrap-around at boundaries).
- Arrow Up/Down: move one row up/down in the same column (skip headers, wrap within visible rows).
- F2: enter edit mode on the active cell (if editable); Escape exits edit mode.
- Enter: commit cell, move down one row (or next editable cell).
- Render visual focus ring + aria-activedescendant for screen readers.
- ~15–20 tests (navigation direction, wrap-around, edit-mode entry/exit, group-header skipping).

---

### 5. **Column Sort + Filter (OZ, Menge, EP, GP, Marge %)**

**Priority:** P1 (unlocks analysis workflows)  
**Effort:** Medium (3–4 days)  
**Risk:** Low (view-only; does not mutate positions array)

**User story:**  
*"Ich will nach Marge % sortieren um die schlechtesten 10 Positionen oben zu sehen — oder nach OZ filtern um alle Lohnpositionen zu isolieren."*

**Why it matters:**
- Overlaps with ABC-Analyse (feature 2.2 in v3): calculators spend 10 minutes finding margin-bleeding positions.
- Filter by position type (Lohn, Material, NU) isolates cost components for negotiation.
- One click: "show OZ 01.03.* only" for Gewerk-level analysis.
- Unlocks spreadsheet-like workflows: sort by margin, then batch-edit the worst 5 rows.

**Implementation scope:**
- Column headers become clickable; first click sorts ascending, second click descending, third click clears sort.
- Active sort indicator: chevron + light background on the column.
- Filter toolbar above the table: Kurztext search (substring), OZ range slider or prefix filter, Position-Type checkboxes (Lohn/Stoff/NU/Geräte).
- State: stored in component (not persisted across sessions yet — Phase 2 in presets).
- Render sorted/filtered rows; keep position IDs stable for undo/redo + comment badges.
- Disable sort on read-only INTERN view; allow on editable data (INTERN in kalkulator mode).
- ~12–15 tests (multi-column sort, filter combination, OZ pattern, Kurztext substring, position-type enum).

---

### 6. **OZ-Lücken-Check (Missing Ordinal Number Detection)**

**Priority:** P1 (compliance / risk mitigation)  
**Effort:** Small (1–2 days)  
**Risk:** Low (validation-only; no mutation)

**User story:**  
*"Ich will sehen, wenn ich OZ 01.03.01 → 01.03.04 springe (02 und 03 fehlen), damit der AG das nicht als Formfehler rügt."*

**Why it matters:**
- OZ gaps are grounds for "Formfehler" rejection per GAEB rules (cited by AGs as a blocking issue).
- AG prints the LV with OZ numbers and manually flags gaps during bid evaluation.
- Early warning: show red badge on the first missing gap, with hint "OZ 01.03.02 fehlt".
- Competitors: GAEB-Online, iTwo, ORCA.

**Implementation scope:**
- Algorithm: parse all OZ strings (ignore empty/headers); for each group (01.*, 02.*, etc.), check for consecutive .01 → .NN.
- Report: list of missing OZs as a pre-flight warning (modal on export / before share, like the submit validator).
- Inline badge (optional polish): red chip on the OZ cell of the first row *after* a gap.
- ~6–8 tests (OZ parsing, gap detection, edge cases: leading zeros, 01.03.10 vs 01.03.9).

---

### 7. **EP Suggestion from Own History (Price Auto-Complete)**

**Priority:** P1 (throughput accelerator)  
**Effort:** Medium (3–5 days)  
**Risk:** Low (read-only feature; no schema changes)

**User story:**  
*"Wenn ich einen Kurztext anfange ('Putz, gew...'), soll der Rechner die letzten 3 Preise zeigen, die ich für ähnliche Texte gekalkult habe."*

**Why it matters:**
- Cuts new-LV entry time 30–50%. A 200-position LV that today takes 4 hours could take 2.
- Reduces cognitive load: calculator doesn't have to remember "was meine Putzer-EK das letzte Mal?".
- Sirados sells this as their whole business; KALKU can build it over the user's own data first (zero licensing cost).
- Competitors: Sirados (external baseline), Cost Control.

**Implementation scope:**
- Index: on project load, scan user's last 50 projects (cached in a ref or indexedDB for speed) and build a trigram map: `Kurztext (substring) + Einheit → [{ ep, projectId, ozDate }]`.
- Trigger: when the calculator types in the Kurztext cell, show a ghost suggestion (lighter text) of the median EP from 3+ prior uses of the same Kurztext+Einheit.
- Storage: `api.templates` endpoint already exists; could seed a `price_history` table backend-side (future optimization).
- MVP: client-side indexing of prior projects (no backend change needed).
- Phase 2: text-embedding-3-small semantic similarity (fuzzy "Putz, gew..." matches "Putzen gewöhnlich").
- ~10–12 tests (trigram matching, Einheit pairing, edge cases: new user with no history).

---

## Sequencing Recommendation (3–4 weeks)

| Phase | Features | Build cost | Unlocks |
|-------|----------|-----------|---------|
| **Week 1** | Bulk Edit + Multi-Select + Undo/Redo | 7–9 days | Last-hour changes, scenario testing |
| **Week 2** | Plausibility Badges + OZ-Lücken-Check | 3–5 days | Pre-flight confidence, compliance |
| **Week 3** | Keyboard Nav + Sort/Filter | 6–8 days | Excel-like UX, rapid analysis |
| **Week 4 (optional)** | EP Suggestion from History | 3–5 days | Throughput acceleration, learning loop |

**Ship order:** 1 (bulk) → 2 (undo) → 3 (plausibility) → 4 (keyboard) in parallel with 5 (sort). Items 6 + 7 are follow-up sprints.

---

## Risk & Mitigation

| Feature | Risk | Mitigation |
|---------|------|-----------|
| Bulk Edit | Accidental over-write of 100 rows | Confirm dialog + preview changes before commit + undo coverage |
| Undo/Redo | State/save race condition | Ring buffer is client-only; auto-save unaffected; snapshot before/after in tests |
| Keyboard Nav | Browser-specific capture; screen-reader confusion | Test on FF/Safari/Chrome; aria-activedescendant + live region for active cell |
| Sort/Filter | Breaks comment badge OZ keying | Position IDs stay stable; sort is view-only; re-render badges by ID |
| OZ-Lücken-Check | False positives (01.03.01.01 → 01.04.01 is valid) | Parse OZ level-count; only flag same-level gaps |
| EP Suggestion | Privacy concern (shows user's old prices) | Indexed client-side; no server log of lookups; tooltip shows "3 times @ €X" without project names |

---

## What's NOT on This List (Deprioritized)

- **Nachtrag-Workflow** (item 7.1 in v3) — deferred to Round 13; depends on bulk edit + keyboard nav for rapid position adds.
- **Mobile read-only view** — mobile is 15% of traffic, not a blocker.
- **DATANORM 4/5 supplier feeds** — requires Sirados partnership; data-heavy.
- **Per-position assignee + done-state** — nice-to-have; collaboration not yet a user ask.
- **Full ERP integration** (DATEV/Lexware) — year of work; Abschlagsrechnung (invoice) is Phase 2.

---

## Competitive Positioning

After Round 12, KALKU will match or exceed Nevaris / iTwo / ARRIBA on **daily calculator workflow**:
- Bulk operations + undo → parity with Nevaris.
- Keyboard nav → parity with California.pro.
- Plausibility checks → advantage over ORCA (who lack inline outlier detection).
- History-based EP suggestion → unique vs. all competitors (data advantage).

By EOQ (3 sprints = ~9 weeks), KALKU closes the gap on the "day 1 in a real bid" scenario that currently drives Inhaber to legacy tools.

---

## Success Criteria

- [ ] All 5 features ship with <5 regressions in existing tests.
- [ ] Keyboard nav meets WCAG 2.1 Level AA (aria-activedescendant, focus visible).
- [ ] Bulk edit + undo cover 95% of user actions (no "oops" reports post-launch).
- [ ] Plausibility badges catch 80%+ of zero-price submissions in internal QA.
- [ ] EP suggestion reduces Kurztext-entry time by 30% (measured via telemetry in a/b test).
- [ ] Zero regressions in share-view, public export, or GAEB validator.

---

**Report compiled from:**
- feature_roadmap_v4.md (v4 shipped features)
- feature_roadmap_v3.md (broader v3 context + competitor research)
- WORK_LOG.md (Recent audit findings, Round 11 completion)
- Codebase audit: ProjectDetail.tsx, PositionTableV2.tsx, routes/*.ts
