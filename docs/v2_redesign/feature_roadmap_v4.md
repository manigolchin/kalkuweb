# Feature Roadmap v4 — Next 5 highest-leverage features (2026-05-23)

Updates `feature_roadmap_v3.md`. Researched against current state of main:
Multi-Firma + PositionTableV2 + comments + ⌘K + Excel/GAEB import + share
chain are all shipped.

## Recommended sequencing (≈3 focused-work weeks)

| # | Feature | Build cost | Marketing punch |
|---|---|---|---|
| 1 | EFB 221/222/223 auto-generation | 2.5 d | "VOB-konform ausschreibungsfertig in 1 Klick" |
| 2 | Preisspiegel (NU-Angebote nebeneinander) | 3 d | "Subunternehmer-Vergleich ohne Excel" |
| 3 | Kalkulations-Versions-Diff | 1.5 d | "Was hat sich seit der letzten Revision geändert?" |
| 4 | GAEB X84 Export-Validator + Submit-Bundle | 2 d | "Kein Angebotsausschluss wegen Formfehler" |
| 5 | Nachkalkulation Lite (Soll vs. Ist) | 3 d | "Wo blutet meine Marge tatsächlich?" |

Week 1: #3 (Diff) + #4 (X84 Validator) — small surface area, ship in one sprint.
Week 2: #1 (EFB) — biggest single-feature pull for sales.
Week 3: #2 (Preisspiegel) + #5 (Nachkalk Lite) — both reuse PositionTableV2 + share infra.

---

## 1 · EFB-Preisblätter 221 / 222 / 223 Auto-Generation

**What:** One-click PDF + GAEB-XML of Formblätter 221 (Zuschlagskalkulation), 222 (Endsummenkalkulation), 223 (Aufgliederung der EP) derived from the existing position data + per-Firma Mittellohn / Zuschläge.

**Why it matters:** EFB sheets are mandatory in nearly every public VOB/A tender above the EU threshold. Submission without them — or with arithmetic that doesn't reconcile to the LV — is grounds for **Angebotsausschluss** (BGH-bestätigt). Manual filling of EFB 223 alone is described by vendors as "erheblicher Aufwand" because every EP must be broken into Lohn / Stoff / Geräte / SoKo / NU. The single highest-frequency pain in the daily VOB workflow.

**Competition:** nextbau + GAEB-Online 2025 sell this as a paid add-on; Nevaris / California pro require a parallel Zuschlagskalkulation. None surface live validation against the priced LV. KALKU already owns Mittellohn + per-Firma defaults — generating EFB is a presentation layer on data the system already holds, with a live "Summen stimmen überein" green badge.

**Build sketch:** New `panel-api/src/routes/efb.ts` returning JSON; new `src/pages/panel/ProjectEFB.tsx` rendering 221/222/223 with `@react-pdf/renderer` (already a dep). Pull from `projects.ts` snapshot + `firmen.ts` Mittellohn.

**Estimate:** 2.5 days (heaviest piece: reconciling 222 endsumme with rounding tolerances).

---

## 2 · Preisspiegel — Subunternehmer-Angebote nebeneinander

**What:** Extend the existing Preisanfrage feature with a Preisspiegel view: matrix of positions × NU-Anbieter with min/max highlighting, Vergabe-Empfehlung, and one-click "in Kalkulation übernehmen" per position.

**Why it matters:** Every AVA vendor cites Preisspiegel as a core feature (ABK, BauSU, ORCA, NOVA AVA) because comparing 3–5 NU/Lieferanten-Angebote in Excel is where margins are won or lost. The Inhaber currently does this on a print-out with a calculator — every NU pricing round costs 1–3 hours.

**Competition:** ORCA + ABK have Preisspiegel but require the NU to fill out a GAEB X84 you sent. KALKU's edge: the existing **customer-share + snapshot + comment chain** already handles "NU receives link, fills prices, returns" without GAEB software on the NU side. That's a moat — small NU shops have nothing but Excel.

**Build sketch:** New `PriceMatrix.tsx` reusing `PositionTableV2` cell rendering; extend share routes (`shares.ts`) with a `kind: 'preisanfrage'` snapshot type (already in flight per docs); new endpoint `POST /projects/:id/apply-preisspiegel` to write selected NU prices back as cost components.

**Estimate:** 3 days.

---

## 3 · Kalkulations-Versions-Diff (snapshot compare)

**What:** Side-by-side diff of any two snapshots of a project: position-level adds/removes/quantity/price deltas, totals delta, color-coded.

**Why it matters:** Public Vergabe runs through 3–8 revisions (Aufklärungsgespräch, Nachträge, Bieterfragen). The Inhaber needs to answer "warum ist die neue Endsumme höher?" in minutes, not hours. Today every competitor (Nevaris, ORCA, California pro) makes you open two windows and eyeball it.

**Competition:** Nobody in the surveyed AVA market does a true Git-style diff. ORCA has revision tracking but presents it as a flat audit log. KALKU already snapshots for customer-share + the Nachtrag chain — the data is sitting in the DB.

**Build sketch:** Reuse snapshot rows already produced by `shares.ts` + the Nachtrag flow; new `src/components/panel/SnapshotDiff.tsx` with a left/right table; reuse `PositionTableV2` row primitives. No new endpoint needed beyond `GET /projects/:id/snapshots?ids=a,b`.

**Estimate:** 1.5 days. Highest ROI per LOC on this list.

---

## 4 · GAEB X84 Export-Validator + One-Click Upload-Ready Bundle

**What:** Dedicated "Angebot abgeben" screen that produces the X84 file, validates it against the originating X83 (Ordnungszahlen, Mengen, Einheiten match), packages it with EFB PDFs (from #1) and any geforderte Nachweise into a single ZIP named per Vergabestelle convention.

**Why it matters:** BGH ruling (cited by Staatsanzeiger BW) — bidders who submit malformed GAEB are excluded, no review. The actual failure mode is small: a renamed position, a missing OZ, an Einheit shift. A pre-flight validator that says "fix these 2 cells or you get ausgeschlossen" prevents the worst-case loss.

**Competition:** Dangl-IT has a free X84 converter but no project context; ORCA / Nevaris validate but only against their own DB, not the original X83. KALKU has both files in scope.

**Build sketch:** Extend `src/lib/gaeb/export.ts` with a `validateAgainst(x83)` function (reuses existing parsers); new `src/pages/panel/ProjectSubmit.tsx`; bundle via JSZip (already in deps for Excel import).

**Estimate:** 2 days.

---

## 5 · Nachkalkulation Lite — Soll vs. Ist auf Positionsebene

**What:** After project status flips to `gewonnen`, allow uploading a CSV of actual hours + material cost (or manual entry), and show Soll/Ist deltas per position with Marge-Trend across past projects per Gewerk.

**Why it matters:** Bauprofessor + openHandwerk: Nachkalkulation is the only mechanism that closes the loop on Mittellohn/Zuschlag accuracy — without it, every Vorkalkulation repeats the same systematic errors. dataflor + Moser sell standalone Nachkalk modules at €€€. The Inhaber persona desperately wants "where did I bleed margin last quarter, by Gewerk?" — the KPI dashboard already exists but is forward-looking only.

**Competition:** bps, dataflor, Moser — but all require their full ERP stack. None integrate with a clean cloud kalku tool. Differentiation: KALKU shows the *learning loop* — "your Putzer-Stundenansatz has been 12% too low in 4 of 5 last projects, adjust default?"

**Build sketch:** New table `project_actuals`; new `panel-api/src/routes/actuals.ts`; new `src/pages/panel/ProjectActuals.tsx` reusing `PositionTableV2`. CSV upload reuses existing Excel wizard plumbing.

**Estimate:** 3 days.

---

## Explicitly deprioritized (with reason)

- **Open-Submissions search** — Vergabe24 / evergabe.de / DTAD already own this; rebuilding the crawl is months not days, and the Inhaber already has saved searches there.
- **WhatsApp share-bot** — share-links + mobile-responsive ShareView already cover Bauleiter-on-site; WhatsApp Business API needs Meta approval and a subscription.
- **Materialpreis supplier feeds** — Sirados owns this category through 40 years of price research; competing head-on is a data-acquisition problem, not a software one.
- **HOAI Phase 1–9** — wrong persona (Architekten/Ingenieurbüros, not Bauunternehmer).
- **Aufmaß OCR from photo** — magicplan / CATSmobil already do this well; KALKU's REB-23.003 formulas are the right scope.
- **AI features (generic)** — the user is already drowning in those pitches; value-add needs to be UX, not LLM-flavour.

## Sources

- Wolters Kluwer — [Angebotsabgabe mit GAEB-Dateien](https://www.wolterskluwer.com/de-de/expert-insights/angebotsabgabe-gaeb-dateien-oeffentliche-bauausschreibungen)
- Staatsanzeiger BW — [Bieterausschluss bei fehlender GAEB-Datei](https://www.staatsanzeiger.de/nachrichten/ausschreibung-und-vergabe/auftraggeber-schliesst-bieter-aus-weil-der-gaeb-datei-nicht-liefert/)
- GAEB-Online 2025 — [EFB 221/223 automatisch ausfüllen](https://www.gaeb-online.de/gaeb-efb-221-223.html)
- nextbau — [EFB-Formblätter Pain Point](https://www.nextbau.de/bauunternehmer/efb-formblatt/)
- WEKA Bausoftware — [EFB 221/222/223 Formblätter](https://www.weka-bausoftware.de/faq/efb-preis-formblaetter/welches-efb-blatt)
- VOB.de — [EFB 221 ausfüllen und Ansprüche sichern](https://www.vob.de/magazin/efb221/)
- Phase0 — [AVA Software Vergleich 2026](https://www.phase0.com/blog/ava-software-vergleich)
- ABK — [Preisspiegel Subvergabe von Bauleistungen](https://www.abk.at/produkte/ava-auftragnehmer/preisspiegel/)
- BauSU — [Subunternehmer-Verwaltung](https://www.bausu.de/bausoftware/module/kalkulation/subunternehmer-verwaltung)
- Bauprofessor — [Nachkalkulation Definition](https://www.bauprofessor.de/nachkalkulation/)
- openHandwerk — [Nachkalkulation Soll vs. Ist](https://openhandwerk.de/blog/nachkalkulation-ist-kosten-vs-soll-kosten-im-vergleich-der-schluessel-zur-rentablen-auftragsabwicklung-im-handwerk/)
- dataflor — [Nachkalkulation Tiefbau](https://www.dataflor.de/erd-und-tiefbau/produkte/nachkalkulation/)
- Dangl-IT — [GAEB Converter](https://www.dangl-it.com/articles/convert-gaeb-files-with-the-free-gaeb-converter/)
- ORCA Helpdesk — [GAEB Export Konzepte](https://helpdesk.orca-software.com/Solution/AVA/Content/Konzepte-115_24711)
- Sirados — [Baupreise & Update März 2026](https://www.sirados.de/produkte/ausschreibung/baupreise)
- Nevaris — [Bausoftware-Vergleich](https://www.nevaris.com/blog/bausoftware-im-vergleich-nevaris-dominiert/)
