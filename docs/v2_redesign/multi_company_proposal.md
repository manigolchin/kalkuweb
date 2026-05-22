# Proposal — Multi-Firma layer above Projects

**Date:** 2026-05-22
**Status:** Planning / awaiting user confirmation
**Author:** Claude (Autonomous Worker)
**Trigger:** User asked "is it a good idea to add all of our companies that we are calculating in system and inside of each of them making calculations projects?"

---

## TL;DR — yes, this is the right architecture, and it solves a real problem you have today

**Recommendation:** Yes, add a `Company` (Firma) entity above `Project`. Roll it out in 3 phases. Phase 1 alone removes ~80 % of the per-project repetition that exists in your current workflow.

---

## What you have today (the gap)

Looking at `src/features/kalkulation/types.ts`:

```ts
ProjectData {
  name:    string  // "Ludwigschule St. Ingbert"
  client:  string  // "Stadtverwaltung Sankt Ingbert"     ← the AG (customer)
  bidder:  string  // "Gesellchen GmbH"                  ← the firm KALKU works for
  calcParams: { ... }   // 12 % / 12 % / 49,9 €/h — per project
  faktoren?: [...]      // per project
  zuschlagOriginal?     // per project
  ...
}
```

**Every project carries its own copy of `bidder`, `calcParams`, `zuschlagOriginal`, `faktoren`, etc.** That means:

- All 12 Gesellchen projects each store the string "Gesellchen GmbH" separately. Rename → 12 edits.
- Every new Gesellchen project starts with KALKU defaults (12 % / 49,9), not Gesellchen's actual `72,51 €/h / 20 % / 20 %`. The calculator has to re-import the Vorlage every time, or manually fix it.
- "Show me all 12 projects we've done for Gesellchen" → no UI for that today; you'd have to text-search the client column.
- Share-links for Gesellchen's customers carry KALKU's logo, not Gesellchen's. (Co-branded mode exists as a flag, but there's no per-firma logo storage.)
- The Faktoren-Bibliothek (F1..F7 reusable parameters) is project-scoped — Gesellchen-specific cost factors get re-imported into every new project.

This matches your real-world workflow only loosely. **You're an agency calculating for multiple Bauunternehmer.** The data model treats every project as an island.

---

## What multi-Firma would look like

### New entity

```ts
type Firma = {
  id:           string
  name:         string      // "Gesellchen GmbH"
  shortName?:   string      // "Gesellchen" (for breadcrumbs)
  address?:     string
  contacts:     Contact[]   // GF, Bauleiter, Buchhaltung, …
  defaultCalcParams: CalcParams       // ← inherited by every new project
  defaultZuschlag?:  ZuschlagMatrix   // ← inherited
  defaultFaktoren?:  FaktorEntry[]    // ← inherited
  logoUrl?:     string      // for co-branded share links
  brandColor?:  string      // accent colour for shares
  notes?:       string
  createdAt:    string
  archivedAt?:  string
}

ProjectData {
  ...                       // existing fields
  firmaId?:    string       // ← NEW (nullable for backward compat)
  // calcParams stays — but is now a per-project OVERRIDE of firma defaults
}
```

### New navigation

```
/panel/firmen                            ← new landing page (replaces "all projects")
   ├── Gesellchen GmbH (12 Projekte)
   ├── Bauunternehmen Müller (3)
   └── + Neue Firma

/panel/firmen/gesellchen-gmbh            ← Firma overview
   ├── Einstellungen (Zuschlag, Stundensatz, Logo, Kontakte)
   ├── Projekte (12)
   │     ├── Ludwigschule St. Ingbert (2026-05-12, 224 k€)
   │     └── …
   ├── Faktoren-Bibliothek (Gesellchen-spezifisch)
   └── Berichte (Umsatz YTD, durchschnittliche EP, …)

/panel/firmen/gesellchen-gmbh/projekte/ludwigschule    ← existing ProjectDetail
```

### Inheritance rule

```
effectiveCalcParams =
   { ...defaultCalcParams (KALKU global),
     ...firma.defaultCalcParams,           // overrides KALKU defaults
     ...project.calcParams }               // overrides Firma defaults
```

Same for Faktoren, ZuschlagMatrix, branding.

---

## Why this is a good idea (concrete wins)

| Problem today | What multi-Firma gives you |
|---|---|
| Every new Gesellchen project starts with wrong Zuschlag (KALKU's 12 %, not Gesellchen's 20 %) | New project auto-inherits Gesellchen's `20 % / 72,51 €/h`. |
| "Show me all Gesellchen projects" → text search | One click. |
| Gesellchen rename → edit 12 projects | Edit 1 entity. |
| Gesellchen logo missing in co-branded shares | Stored once per Firma, reused per share. |
| Same Faktoren re-imported per project | Firma-scoped library. |
| No revenue/activity-per-firma report | Comes free. |
| Permissions: "Anjali handles Gesellchen, Ugur handles Müller" | Future-proof: assign team members per Firma. |
| Sister tool **bauki/kalku-ki** ships different defaults (€72,51 / 20 %) than kalku-website (€49,9 / 12 %) | Both could read from one shared Firma profile. |

---

## Risks / costs (honest)

1. **Migration.** Existing projects need a Firma. **Mitigation:** auto-create one Firma per distinct `bidder` string on first deploy. Projects with the same bidder string get auto-linked.
2. **UI is one click deeper.** Mitigation: keep a "Alle Projekte" flat view as a tab on the Firmen page, so daily-driver flow isn't slower.
3. **Backend work.** New `companies` table, FK on `projects`, settings cascade, share-link Firma context. ~2 days of focused work.
4. **Co-branded share semantics.** Whose logo wins? Mitigation: explicit toggle in share settings ("KALKU only / Firma only / both") — already half-built (`brandHeader: 'own' | 'co-branded' | 'minimal'`).
5. **Scope creep risk.** Easy to bolt on CRM features (deals, pipeline, …). **Mitigation:** ship Phase 1 first, defer everything else.

---

## Phased rollout

### Phase 1 — Foundation (~2 days, high value)

- `companies` table (sqlite migration)
- `projects.company_id` nullable FK
- One-shot migration: auto-create Firma per distinct `bidder`, assign existing projects
- New `/panel/firmen` route + Firma overview page
- Per-Firma `defaultCalcParams` editable on Firma settings page
- New project: pre-fills calcParams from selected Firma
- Project list grouped by Firma (collapsible)
- Backwards-compatible: old API still works, `firmaId` optional everywhere

**Ships:** the 80/20 value. Stop here if you're happy.

### Phase 2 — Branding + Faktoren (~1 day)

- Per-Firma logo upload + brand color
- Per-Firma Faktoren-Bibliothek (with global fallback)
- Per-Firma contact roster (multi-contact, role tags)
- Co-branded share links use Firma logo when project belongs to a Firma

### Phase 3 — Reporting + Permissions (later, on demand)

- Firma dashboard: revenue YTD, project count, avg EP, last activity
- Per-Firma team member assignment (when KALKU grows past 2 people)
- Customer portal: a single share URL Gesellchen's PM uses to see all their KALKU projects
- Per-Firma Vergabenummer / OZ auto-numbering schemes

---

## What I'd want to know before starting Phase 1

1. **Naming.** "Firma" or "Auftraggeber" or "Kunde" or "Bauunternehmer"? (Today's `client` and `bidder` are confusingly different things — Phase 1 is also a chance to clarify.)
2. **Bridge.** Should the existing `bidder: string` become read-only, derived from `firma.name`? Or stay editable as a per-project override?
3. **Do you want Phase 1 in this branch (`claude-auto/v2-gaps-closeout`) or a fresh branch?** I'd suggest fresh — this is a significant enough change that it deserves its own PR.
4. **Auth model.** Today every project is owned by the logged-in user. Should Firma also be owned per-user, or shared across the whole KALKU team?

---

## My honest take

**Do it.** Specifically Phase 1. The current data model is forcing your calculators to do work the computer should do (re-importing Vorlagen, re-typing Bieter strings, re-creating Faktoren). Every time someone opens a Gesellchen project they're re-deriving Gesellchen's settings from scratch.

It's also the right unlock for the next round of features (per-Firma branding, customer portal, team permissions) — without it those features are awkward bolt-ons.

The one thing I'd NOT do: skip Phase 1 and jump to a full CRM. Stay narrow.
