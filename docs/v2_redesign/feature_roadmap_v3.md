# Feature Roadmap v3 — what to build next

Written 2026-05-22 after Round 7 (Firma integration). Perspective: senior calculator who has shipped offers in Nevaris, RIB iTwo, ARRIBA, California.pro, ORCA AVA, Sirados, STLB-Bau, MWM-Libero, Allplan Bauwerk, ProBauG.

The system already nails INTERN/KUNDEN split, per-row formulas with F1..F7 scratch slots, ZSCHLG matrix, Firma defaults cascade, snapshot-hashed share-links with password + revision tracking, per-position comments, GAEB import, Kalkulation-Vorlage Excel parity. Most German tools above lack the INTERN/KUNDEN split, snapshot-hashed share-links, and per-row scratch slots. What's missing is the "second day" with a real LV: throughput, defensibility, and workflow around the calculation, not the calculation itself.

## TL;DR — ship these 7 next

Each earns its slot because a senior calculator hits it within the first hour of a real bid:

1. **P0 — Bulk edit + multi-select** (Theme 1). EP/Menge/Faktor today is one row at a time. Nevaris/iTwo/ARRIBA mark 30 rows + apply +5% Aufschlag in one keystroke. A 400-position LV is unworkable without this.
2. **P0 — Undo / Redo (Cmd-Z)** (Theme 1). Today a wrong paste destroys data; only autosave saves you. Every competitor has it.
3. **P0 — Missing-price / plausibility badges** (Theme 4). Inline red chip when EP = 0 or deviates >40% from the user's own median for the same Bezeichnung. Catches the most expensive bid mistake. Nevaris and California.pro have "Plausibilitätsprüfung".
4. **P0 — GAEB DA XML 2000 + DA 90 export** (Theme 5). We import GAEB; not exporting is asymmetric and AGs increasingly require `.x84/.x94` back. Every serious AVA writes this.
5. **P1 — EFB 221 + 222 + 223 export** (Theme 5). Öffentliche Hand requires Mittellohn, Zuschlagsverteilung, Materialkosten breakdown. Calculators fill them by hand today. iTwo, ARRIBA, ORCA all generate them.
6. **P1 — Price suggestion from your own history** (Theme 9). Suggest EP from the calculator's previous projects via Kurztext+unit match. Cuts new-LV entry 30–50%. Sirados sells this as their whole business; we can build it over the user's own data first.
7. **P1 — Nachtrag-Workflow (VOB §2 Nr. 3/5/6)** (Theme 7). Schema already has `parentShareId` + `nachtragNumber`. Build UI for "Nachtrag erstellen", auto-numbering, diff view. iTwo/ARRIBA charge enterprise money for this — the #1 reason mid-size Inhaber stay on legacy systems.

---

## 1. Calculator productivity

### 1.1 Bulk edit + multi-select **(P0, medium)** ⭐
- *Ich will* 30 Positionen markieren und den ZSCHLG Stoffe oder Material-EP gleichzeitig anpassen.
- Saves 5–15 min/LV, prevents fatigue errors, unlocks last-hour-before-Abgabe changes. Competitor: Nevaris, iTwo, ARRIBA, California.pro, ORCA. **Table stakes.**

### 1.2 Undo / Redo (Cmd-Z) **(P0, medium)** ⭐
- *Ich will* einen falschen Aufmaß-Wert mit Cmd-Z wegnehmen, ohne den Autosave zu durchsuchen.
- Per-project ring buffer (~50 edits) keyed on position+field. Every desktop tool has it. Even Excel.

### 1.3 Keyboard navigation (Tab / Shift-Tab / Arrow / F2 / Enter) **(P1, small)**
- *Ich will* wie in Excel durch EK-Zellen tab-ben, F2 in Edit-Mode springen.
- Single biggest reason calculators say "fühlt sich an wie Excel". Competitor: Nevaris, California.pro, ORCA.

### 1.4 Column sort + filter (OZ, Menge, EP, Marge, Gewerk) **(P1, small)**
- *Ich will* nach Marge sortieren um die schlechtesten 10 Positionen oben zu sehen. Overlaps with ABC-Analyse (2.2). Competitor: all AVA tools.

### 1.5 View-Profile pro User **(P2, small)**
- "Kalkulator-/Inhaber-/Polier-View". Saves rearranging columns each session. Competitor: Nevaris, iTwo.

---

## 2. Analysis / decision support

### 2.1 Inline plausibility + missing-price badges **(P0, medium)** ⭐
- *Ich will* sofort sehen, welche Positionen EP = 0 haben oder >40% vom Median für denselben Kurztext abweichen.
- Two-rule MVP: (a) `gp === 0 && !isHeader` → "Preis fehlt"; (b) `|ep - median| / median > 0.4` → "Ungewöhnlich". Chip next to OZ. Median lookup runs over `projects.data.positions` of same user. Competitor: California.pro "Plausibilitätsprüfung", Nevaris "Prüfung", ARRIBA "Vergleichskalkulation".

### 2.2 ABC-Analyse / Pareto view **(P1, small)**
- *Ich will* in 10 Sekunden die 8 Positionen sehen, an denen sich die Marge entscheidet. Sort by GP desc + cumulative-% column. Competitor: iTwo "ABC-Analyse", ORCA.

### 2.3 Marge / Cost-mix Donut per Gewerk **(P1, small)**
- Stacked bar: Material / Lohn / NU / Geräte per KG. Honest look at where the money sits. Competitor: Nevaris, California.pro.

### 2.4 Sensitivity slider "+1 % ZSCHLG Stoffe = +€X" **(P2, small)**
- Live ribbon at top, total moves when ZSCHLG / Verrechnungslohn / NU-Marge ±1 %. No German AVA does this well — real differentiator.

### 2.5 Similar-position search (semantic) **(P2, medium)** — see 9.3

---

## 3. Workflow + collaboration

### 3.1 Per-position assignee + "done" state **(P1, small)**
- *Ich will* einen Mitkalkulator auf 40 Positionen ansetzen, sehen was er erledigt hat. 2 fields: `assigneeUserId`, `doneAt`. Pairs with Vier-Teams-Modell. Competitor: ProBauG, ARRIBA, iTwo, Cost Control.

### 3.2 Change-log feed per project **(P1, small)**
- `auditEvents` table (hash-chained) already exists. Render-only sidebar "Verlauf". Competitor: ARRIBA "Vorgangsprotokoll", iTwo audit.

### 3.3 Named project snapshots / versions **(P1, small)**
- "v1 vor Submission-Check", "Final vor Abgabe". Let user name, diff between two. Competitor: Nevaris "Versionen", iTwo "Stände".

### 3.4 Comment threads on INTERN **(P2, small)**
- Today comments are customer-side only. Mirror for internal review. Competitor: ARRIBA, Cost Control.

---

## 4. Quality / risk

### 4.1 Pflichtfeld + magnitude validation **(P0, small)** ⭐ (covered in 2.1)

### 4.2 OZ-Lücken-Check **(P1, small)**
- Warn on OZ jumps (01.03.01 → 01.03.04 missing .02/.03). AGs flag this as Formfehler. Competitor: GAEB-Online, iTwo, ORCA.

### 4.3 Sum-cross-check vs. AG's LV total **(P1, small)**
- Store AG's total at import (printed on Deckblatt). Warn on export if our total deviates >X% — usually a skipped position. Competitor: Nevaris.

### 4.4 Tariflohn-Updater — see 8.2.

### 4.5 Bindefrist-Ablauf + Preisbasis-Stempel **(P2, small)**
- Stamp snapshot with Preisbasis-Datum; warn near Bindefrist (BGB §§ 145 ff., default 30d). Competitor: iTwo, ARRIBA.

---

## 5. Export / reporting

### 5.1 GAEB DA XML 2000 + DA 90 export **(P0, large)** ⭐
- *Ich will* das fertige Angebot als .x84/.x94 zurück an den AG schicken.
- Public-sector AGs + large GUs require this. Parser exists; writer mirrors it. Large due to GAEB edge cases (DA90 vs. DA XML, line breaks, encoding). Every serious AVA writes it (Nevaris, iTwo, ARRIBA, ORCA, California.pro). Without it ~40% of mid-size GU bids lost.

### 5.2 EFB 221 / 222 / 223 export **(P1, large)** ⭐
- 221 = EP-Aufgliederung; 222 = Personalkosten; 223 = NU-Liste. Calc data all there (Mittellohn, ZSCHLG, NU-Kosten). PDF/Excel renderer over CalcParams + positions. Competitor: iTwo, ARRIBA, ORCA, California.pro. Sales differentiator vs. "wir kalkulieren mit Excel".

### 5.3 Per-Gewerk PDF breakdown **(P1, small)**
- Roll up by Gewerk for NU-Anfragen and Bauphysik/HLS handoffs. Competitor: ORCA, Nevaris.

### 5.4 Multi-variant offer (Spar/Standard/Komfort) **(P2, medium)**
- One project, 3 EP columns. Closes "können Sie eine günstigere Variante?" in one round. Competitor: ARRIBA, iTwo.

### 5.5 DATANORM 4/5 Material-Stammdaten-Import **(P2, medium)**
- Großhändler-Katalog (Sonepar/Zajadacz/Eldis/FEGA/Knauf) once, then pull EK+Bezeichnung. Pairs with 6.1. Competitor: Nevaris, California.pro, MWM-Libero (the German standard).

---

## 6. Integrations

### 6.1 Supplier price-feed (DATANORM + Excel-Preisspiegel) **(P1, medium)**
- *Ich will* den Sonepar-Preisspiegel reinziehen, Material-EK aktualisiert sich. Schema add: `material_catalog`; position → optional `materialArtikelNr`. Competitor: MWM-Libero (their core product), Nevaris.

### 6.2 Sirados / STLB-Bau Textbausteine **(P1, large)**
- *Ich will* STLB-Standardtext einfügen statt 800 Zeichen Kurztext zu tippen. MVP: user uploads own STLB-XML, we index by code. Phase 2: official Sirados connector (€1–3k/yr license). Competitor: every German AVA — Sirados is de facto standard since 1990.

### 6.3 BIM / IFC quantity takeoff **(P2, large)**
- Pull Mengen from IFC. Competitor: Allplan Bauwerk, iTwo BIM. Large — IFC parsing is its own product.

### 6.4 Calendar integration (Submission → ics/Outlook) **(P2, small)**
- Deadlines already exist; emit `.ics` with 3/7/14-day reminders. Competitor: ARRIBA, iTwo.

### 6.5 preisanfrage NU-offer pull-back **(P1, medium)** ⭐
- Sister system already collects Großhändler/NU offers. Show inline on each position ("3 NU-Preise: 4.200, 4.450, 4.890 €") with one-click adopt. **Nobody else has this** — unique advantage of running both systems together. High-leverage differentiator.

---

## 7. Nachtrag / Änderungsmanagement

### 7.1 Nachtrag-Workflow VOB §2 Nr. 3/5/6 **(P1, medium)** ⭐
- *Ich will* aus einem laufenden Auftrag einen Nachtrag erstellen, auto-nummeriert, mit Diff-Ansicht zu Originalmengen.
- Schema has `parentShareId` + `nachtragNumber`. UI: "Nachtrag erstellen", copy positions, edit Menge + add new, mark each as §2/3 (geändert), §2/5 (Mengenmehrung >10%), §2/6 (zusätzlich). Competitor: iTwo, ARRIBA, ProBauG. **Enterprise lock-in feature.**

### 7.2 Stundenlohnzettel / Regiearbeiten **(P2, small)**
- Tagessätze separat für Regiezeit. Competitor: ARRIBA, ProBauG.

---

## 8. Bauunternehmer-specific

### 8.1 Mittellohn-Rechner integration **(P1, small)**
- `/direkt/mittellohn` standalone exists. Wire into calculator: project → "Mittellohn neu berechnen", write to `calcParams.mittellohn`. 90% done. Competitor: California.pro, ARRIBA.

### 8.2 Tariflohn-Updater (Bauhaupt / Elektro / SHK / GaLaBau) **(P1, small)**
- Click "Tarif 2026 anwenden" → Mittellohn + Verrechnungslohn + Zuschläge update across all projects. Competitor: California.pro publishes annually; iTwo dito.

### 8.3 Bürgschaft tracker **(P2, small)**
- Vertragserfüllungs-/Gewährleistungs-/Vorauszahlungsbürgschaft per Projekt. `/direkt/buergschaft` exists. Competitor: ARRIBA, ProBauG.

### 8.4 Abschlags- + Schlussrechnung generator **(P1, medium)**
- Rechnung mit Aufmaßbezug, kumulierter §16 VOB-Aufstellung, MwSt. Closes loop offer→invoice. Competitor: ARRIBA, Nevaris, California.pro.

### 8.5 Preisgleitklausel (Stoff/Lohn-Index) **(P2, small)**
- Bei langlaufenden Aufträgen Anpassung nach Index. Klein im Code, groß im Vertrieb. Competitor: iTwo, ARRIBA.

---

## 9. AI / smart

### 9.1 EP suggestion from own history **(P1, medium)** ⭐
- MVP: trigram match on Kurztext + same Einheit across user's last 50 projects → median EP + sample count. Phase 2: text-embedding-3-small cached. Ghosted suggestion in EP cell. Competitor: Sirados (industry baseline), Cost Control. Nobody does "from your own history" well yet.

### 9.2 Pre-flight plausibility on full LV before share **(P1, small)**
- ShareDialog modal: "4 Positionen ohne Preis, 2 mit Marge < 5%, 1 mit EP > 3× Markt". Pairs with 2.1. Competitor: California.pro, ARRIBA.

### 9.3 Semantic similar-position search **(P2, medium)**
- Reuses 9.1 pipeline. Search box "alle Putz-Positionen across all projects". Competitor: Sirados, MWM-Libero.

### 9.4 GAEB → Kurztext-Cleanup AI **(P2, small)**
- GAEB texts arrive uppercase + line-break noise. One LLM pass to normalize, batched per project. No competitor does it — polish that earns trust.

---

## 10. Mobile / field

### 10.1 Mobile read-only project view **(P1, small)**
- Grid is desktop-only. Mobile card view ("Polier looks up EP and Menge on site") covers 80%. Competitor: Nevaris Mobile, iTwo Site.

### 10.2 Aufmaß per phone + photo attachment **(P2, medium)**
- Aufmaß on site + photo for Nachtrag-Belege. Builds on `aufmassFormula`. Add `position_attachments` table. Competitor: Nevaris Mobile, ARRIBA Mobile, ProBauG.

### 10.3 Voice notes per position **(P2, small)**
- Whisper transcription → notes. Niche but viral. No competitor.

---

## Sequencing recommendation

**Sprint 1 (2–3 weeks):** 1.1 Bulk edit, 1.2 Undo/Redo, 1.3 Keyboard nav, 2.1 Inline plausibility, 4.2 OZ-Lücken-Check. All P0/P1, all small-to-medium, all visible the moment a calculator opens the app.

**Sprint 2 (3–4 weeks):** 5.1 GAEB export, 5.2 EFB-221, 5.3 Per-Gewerk-PDF, 4.3 Sum-cross-check. Closes the "exit-the-tool" loop and unlocks öffentliche-Hand bids.

**Sprint 3 (3–4 weeks):** 7.1 Nachtrag-Workflow, 6.5 preisanfrage NU-offer pull, 9.1 Price suggestion. Differentiation tier — these are the features that make calculators say "I can't go back".

Everything in Sprints 1–3 is roughly 8–10 weeks of focused work. After that the roadmap is about depth in Themes 6 (Integrations: DATANORM, Sirados, BIM) and 9 (AI) — they're the long-tail moats but they assume the day-one productivity story is already solid, which it isn't yet.

## What NOT to build next

- **Native mobile app** — 10.1 read-only mobile view covers 80% at 5% cost.
- **Own STLB-Bau ingestion before Sirados deal** — copyright minefield; let users upload their own license-keyed XML first.
- **BIM/IFC quantity takeoff** before GAEB export ships — wrong order; the customer with BIM also expects GAEB writeback first.
- **Full ERP integration (DATEV / Lexware)** — that's a year of work and not what kills deals today; the Abschlagsrechnung generator (8.4) covers the immediate accounting pain.
