# Multi-Firma Integration — preisanfrage as Source of Truth

**Date:** 2026-05-22
**Status:** Architecture proposal — supersedes [`multi_company_proposal.md`](./multi_company_proposal.md) (which assumed greenfield Firma layer)
**Trigger:** User: "we can bring all information [...] from preisanfrage.kalkus.de [...] fetch Ausschreibungen [...] make all companies from server"

---

## TL;DR

**Don't build the Firma list in kalku-website. Consume it from preisanfrage.** preisanfrage already has 98 Bauunternehmer-Firmen, full OneDrive auto-discovery, GAEB parsing, n8n workflows running every 5 min, and a Postgres-backed API. The right architecture is **kalku-website = calculation layer; preisanfrage = source-of-truth for Firmen + Ausschreibungen**. Two thin integration pieces and we get everything you asked for in days, not weeks.

---

## What preisanfrage already gives us (auditable findings)

### Database (Postgres in prod, SQLite in dev)

| Entity | Table | What it holds |
|---|---|---|
| **Managed Firma** | `companies` | name, trade_type, SMTP, SharePoint site/drive/folder, OneDrive paths, classifier rules, feature flags, per-firma `settings` JSONB (e.g. `kommissionsnummer_pflicht`) |
| **External Firma** | `external_companies` | 98 OneDrive-discovered firms not yet managed; has `folder_name`, `display_name`, `adopted_company_id` (nullable FK back to `companies`) |
| **Ausschreibung** | `projects` | `project_number`, `name`, `auftraggeber_*`, `anschrift_*`, `submission_date/time`, `baumassnahme`, **`gaeb_file_path`**, `original_pdf_path`, `bekanntmachung_pdf_path`, `onedrive_share_url`, `total_positions`, `vergabe_status` (won/lost/open), `submitted_variant_rank`, `bidders` |
| **External Ausschreibung** | `external_projects` | OneDrive-discovered tenders for non-managed firms; carries our rank + winner data |
| **Positions** | `positions` | per-project LV positions parsed from GAEB (oz, short_text, long_text, quantity, unit, category, hersteller) — these are what kalku-website wants to import |

### Automation (already running)

- **n8n workflow `kalku_final_workflow.json`** — runs every 5 min on the server, scans OneDrive `KT01 - Documents/`, picks up new project folders, calls preisanfrage's `/analyze` endpoint, stores positions
- **GAEB parser** — 4 variants (direct, two-pass, multi-AI) at `/analyze/gaeb-*` endpoints
- **OneDrive watcher** — `onedrive_trigger.json` reacts to new files
- **External-firma scanner** — `/admin/external-firmas/scan` discovers new folders → creates `external_companies` shadow rows
- **External-firma parser** — `/admin/external-firmas/{id}/parse` extracts submission results

### OneDrive layout (verified by direct ls)

```
~/Library/CloudStorage/OneDrive-FreigegebeneBibliotheken–kalku/KT01 - Documents/
  ├── 1157_S&N_Behnke_UG/
  ├── 1199_Wärme_Wimmer_GmbH/
  ├── 1695_Gesellchen_GmbH/                  ← 36 projects
  │     ├── 260415_Feuerwehr_Moersbach/
  │     ├── 260512_Ludwigschule_St_Ingbert/   ← matches our LV3.xlsx audit
  │     │     ├── 01_Pläne_u_Gaeb/
  │     │     │     ├── LV Sanierung Sandsteinmauer.X83   ← GAEB file
  │     │     │     └── Anlage 01..04 .pdf (plans)
  │     │     ├── 02_Bieterkommunikation/
  │     │     ├── 03_Anfragen/  04_Angebote/  05_Submissionsergebnis/
  │     │     ├── 06_Nachforderung/  07_Tempos/  08_Vorkalkulation/
  │     │     ├── LV.xlsx + LV3.xlsx
  │     │     └── 260512_Ludwigschule_St_Ingbert.pdf (Bekanntmachung)
  │     └── ... 35 more projects
  ├── 1697_MPB_Bau/                          ← 7 projects + _abgeschlossen/_gewonnen
  └── ...98 firms total
```

**Pattern:** `{NNNN_4-digit-id}_{FirmName}/{YYMMDD}_{ProjectName}/01_Pläne_u_Gaeb/*.X83`

### API surface (verified, JWT Bearer auth)

```
POST  /api/v1/auth/login                                → { access_token, user }
GET   /api/v1/companies                                 → [{ id, name, trade_type }]
GET   /api/v1/projects?company_id=...&status=&limit=    → [Project]
GET   /api/v1/projects/{id}                             → Project + positions[]
GET   /api/v1/admin/external-firmas/overview            → BI view (98 firms, managed+external)
GET   /api/v1/admin/external-firmas/{id}/projects       → external projects with submission data
POST  /api/v1/analyze                                   → upload LV → positions
POST  /api/v1/analyze/gaeb-direct-url                   → parse GAEB from OneDrive URL
```

**CORS today:** `localhost:3000/5173/8080` + `preisanfrage.kalkus.de`. **kalku.kalkus.de NOT allowed** — first thing to add.

---

## The proposed architecture

```
       ┌─────────────────────────────────────────────────────────┐
       │  OneDrive (KT01 - Documents)                            │
       │  • 98 Firmen-Ordner • Auschreibungen • GAEB-Dateien     │
       └────────────────┬────────────────────────────────────────┘
                        │  scan every 5 min
                        ▼
       ┌─────────────────────────────────────────────────────────┐
       │  preisanfrage.kalkus.de  (FastAPI + Postgres + n8n)     │
       │  • companies + external_companies (98)                  │
       │  • projects (Ausschreibungen)                           │
       │  • GAEB-parsed positions                                │
       │  • Vergabe-status (won/lost/open)                       │
       │  • SMTP, SharePoint, classifier rules                   │
       │  └── REST API (JWT Bearer)                              │
       └────────────────┬────────────────────────────────────────┘
                        │  HTTPS /api/v1/companies, /projects
                        │  Service-account JWT
                        ▼
       ┌─────────────────────────────────────────────────────────┐
       │  kalku-website panel  (Vite + React + panel-api/Hono)   │
       │  ┌──────────────────────────────────────────────────┐   │
       │  │  Firmen-Ansicht (NEW)                            │   │
       │  │  ↓ all 98 from preisanfrage, click a firm        │   │
       │  │  Firma-Detail (NEW)                              │   │
       │  │   ├ Ausschreibungen-Liste (from preisanfrage)    │   │
       │  │   ├ "Kalkulation starten" → existing flow        │   │
       │  │   └ Defaults: Zuschlag, Stundensatz, Faktoren    │   │
       │  └──────────────────────────────────────────────────┘   │
       │  ┌──────────────────────────────────────────────────┐   │
       │  │  Kalkulation-Projekt (existing v2 panel)         │   │
       │  │  • GAEB-Import → pre-fills from preisanfrage     │   │
       │  │  • EP/GP/Zuschlag (already audited 1:1 vs Excel) │   │
       │  │  • INTERN ↔ KUNDEN view, share-links             │   │
       │  └──────────────────────────────────────────────────┘   │
       └─────────────────────────────────────────────────────────┘
```

### Data ownership split

| Owns | preisanfrage | kalku-website |
|---|---|---|
| Firma master list (name, trade type, SMTP, SharePoint, classifier rules) | ✅ | mirrors read-only |
| Ausschreibungen-Metadaten (project_number, auftraggeber, submission_date, GAEB file) | ✅ | mirrors read-only |
| LV-Positions parsed from GAEB | ✅ | seeds the calculation project on import |
| Submissionsergebnis (won/lost, bidders, rank) | ✅ | reads back to show on Firma overview |
| **Calculation defaults per Firma** (Zuschlag matrix, Stundensatz, Verrechnungslohn) | adds 4 cols | mirrors + lets calculator override per-project |
| **Calculation projects** (`Position[]` w/ Materialkosten, EP, GP, formulas) | — | ✅ sole owner |
| **Share-links + customer comments** | — | ✅ sole owner |
| **Faktoren-Bibliothek** | per Firma in `companies.settings` | reads + lets per-project override |

**Principle:** preisanfrage owns *what we're calculating for* (firm + tender). kalku-website owns *the calculation itself*.

---

## What needs to be built (concrete, in order)

### Phase 1A — preisanfrage side (2 small additions, ~half a day each)

1. **Add CORS origin for kalku.kalkus.de** — 1-line change in `app/config.py` `CORS_ORIGINS`.
2. **Add 4 calculation-default columns to `companies`** (migration 010):
   ```sql
   ALTER TABLE companies ADD COLUMN calc_material_zuschlag NUMERIC(5,4) DEFAULT 0.12;
   ALTER TABLE companies ADD COLUMN calc_nu_zuschlag       NUMERIC(5,4) DEFAULT 0.12;
   ALTER TABLE companies ADD COLUMN calc_verrechnungslohn  NUMERIC(8,2) DEFAULT 49.90;
   ALTER TABLE companies ADD COLUMN calc_geraete_satz      NUMERIC(8,2) DEFAULT 0.50;
   ```
   Plus expose them in the existing `/companies` and `/companies/{id}` payloads.
3. **(Optional)** `POST /admin/external-firmas/{id}/adopt` — promote external→managed. Currently the playbook does this via DB INSERT + new migration; an endpoint would let kalku-website do it from the Firmen page.

### Phase 1B — kalku-website side (~3 days)

1. **New `preisanfrage-client.ts`** in `panel-api/` — typed wrapper for `/companies`, `/projects`, `/projects/{id}`, `/admin/external-firmas/overview`. Uses a **service-account JWT** stored in env (one shared identity, scope = read-only on all firmas).
2. **New `firmen` route + page** in panel — lists all 98 firmas from preisanfrage with: name, trade_type, project_count, last_submission_date, won_sum_brutto. Search + filter. Click → Firma page.
3. **New `firma/{folder_name}` page** — Firma overview:
   - Defaults panel (calcParams from preisanfrage, editable here, writes back to preisanfrage)
   - Ausschreibungen list (live from `/projects?company_id=` or `/external-firmas/{id}/projects`)
   - Click an Ausschreibung → "Kalkulation starten" or "öffne bestehende Kalkulation"
4. **Calc-project ↔ preisanfrage link** — add `preisanfrage_project_id INTEGER NULL` to kalku-website's project table. When the calculator opens an Ausschreibung, we either:
   - Create a new calc-project seeded from preisanfrage positions, OR
   - Open the existing linked calc-project
5. **GAEB import wired to preisanfrage** — instead of (or alongside) the current upload UI, fetch the parsed positions via `GET /projects/{id}` and seed the calc-project's Position[] directly. Skip the local GAEB parser for projects that already exist in preisanfrage.
6. **Defaults cascade in `calc.ts`** — apply Firma defaults under project overrides:
   ```ts
   const effective = { ...DEFAULT_CALC_PARAMS, ...firma.calcDefaults, ...project.calcParams }
   ```

### Phase 2 — automation closing loop (~1 day)

- **Webhook from preisanfrage → kalku-website** on `external_project.parsed` event, so the Firma page list updates in real time (today: would only refresh on Firma page visit).
- **Submissionsergebnis sync** — once preisanfrage learns we lost/won, surface a chip on the kalku-website Firma page ("Ludwigschule: 3. Rang, Sieger 245k€"). Already in `external_projects.bidders` JSON.

### Phase 3 (optional, later)

- Per-Firma branding (logo upload) — store on preisanfrage `companies.logo_url`, kalku-website uses for co-branded share links.
- Per-Firma Faktoren-Bibliothek — store on preisanfrage `companies.settings.faktoren`, kalku-website seeds from it on new project.
- Customer portal: 1 magic link per Firma → customer sees all their projects across both systems.

---

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| preisanfrage downtime breaks calculation UI | kalku-website caches last-known Firma list locally (sqlite) + degrades to read-from-cache mode |
| Different auth models (preisanfrage = JWT per user, kalku-website = cookie per user) | Service-account JWT (one identity) for preisanfrage calls; kalku-website's own cookie session unchanged |
| Migration of existing kalku-website projects (none of them have `preisanfrage_project_id`) | Auto-link by matching `project.name` against preisanfrage `projects.baumassnahme` + `auftraggeber_name`; surface unmatched as "ohne Firma" |
| Schema drift between systems | Treat preisanfrage's API as a contract; version it. Add a contract test in CI. |
| Data sovereignty — Firma data leaks across calculators | preisanfrage's JWT scope already filters by user.company_ids. Our service-account would have full read; we'd need a per-user-on-kalku-website ACL on top. |

---

## What I need you to decide (4 questions)

1. **Live API or local mirror?** Should kalku-website read Firmen+Ausschreibungen LIVE from preisanfrage on every page visit, or sync nightly into its own DB and serve from there? Live = always fresh, breaks if preisanfrage is down. Mirror = always up, may show stale data for ≤24 h.
2. **Adopt or all-firms?** Should kalku-website show **all 98** Firmen, or only ones explicitly "adopted" (= `adopted_company_id IS NOT NULL` or trade_type = "galabau")? Today there are 98 OneDrive folders but only ~5–7 managed companies in preisanfrage.
3. **Auth model.** Should each calculator have their own preisanfrage account, or one shared service-account JWT for kalku-website → preisanfrage? Per-user is cleaner for audit; service-account is simpler to ship.
4. **Where to add the 4 calculation-default columns** — on preisanfrage's `companies` table (source-of-truth, but you need to deploy a migration there), OR on a new table in kalku-website's panel-api DB keyed by `preisanfrage_company_id`? Cleaner = preisanfrage. Easier to ship = kalku-website-only.

---

## What I'm NOT proposing

- Replacing preisanfrage. Both systems stay.
- Migrating preisanfrage to a different stack. It's working.
- Building a parallel n8n / OneDrive watcher in kalku-website. Reuse preisanfrage's.
- Building our own Firma master in kalku-website. Mirror only.

---

## Reproducers used in this research

```bash
# preisanfrage backend models
ls /Users/admin/projects/kalku-procurement/app/models/

# OneDrive structure
ls "/Users/admin/Library/CloudStorage/OneDrive-FreigegebeneBibliotheken–kalku/KT01 - Documents/" | wc -l    # → 98
ls "/Users/admin/Library/CloudStorage/OneDrive-FreigegebeneBibliotheken–kalku/KT01 - Documents/1695_Gesellchen_GmbH/" | wc -l   # → 36

# Endpoint inventory
grep -rn '@router\.\(get\|post\|put\|delete\)' /Users/admin/projects/kalku-procurement/app/api/
```
