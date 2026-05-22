# Round 7 — Firma Integration (preisanfrage as source of truth)

**Date:** 2026-05-22
**Branch:** `claude-auto/v2-gaps-closeout`
**Status:** Phase 1a + 1b + 1c shipped + end-to-end verified live

---

## What this round delivers

The user asked: *"can we add all of our companies that we are calculating in system and inside of each of them making calculations projects?"* then clarified: *"we can bring all information from preisanfrage.kalkus.de [...] fetch Ausschreibungen [...] make all companies from server"*.

The answer is yes — and rather than building a parallel Firma store, we made kalku-website a **consumer** of preisanfrage's existing infrastructure (98 OneDrive-discovered firms, n8n-driven GAEB parser, Postgres-backed REST API).

Three phases shipped this round:

### Phase 1a — Foundation (commit `d4cbc5d`)

- `panel-api/src/lib/preisanfrage.ts` — typed client (snake→camel mapping, 60 s in-memory cache, graceful 502/503)
- `panel-api/src/routes/firmen.ts` — `GET /firmen`, `GET /firmen/:kind/:id`, `PUT/DELETE /firmen/:kind/:id/defaults`
- `firma_calc_defaults` SQLite table (basis-points + cents for exact math)
- `Firmen.tsx` list page (search, filter, won-count, brutto-Umsatz)
- `Firma.tsx` detail page (editable defaults form + Ausschreibungen list)
- New `/panel/firmen` sidebar entry
- 8 panel-api tests

### Phase 1b — Mock fixture + Kalkulation-starten button (commit `530ae56`)

- `panel-api/src/lib/preisanfrage-fixture.ts` — 10 realistic firms from the actual OneDrive layout (Gesellchen + 9 others)
- Auto-mock in dev (NODE_ENV ≠ production AND no JWT → mock on; `PREISANFRAGE_MOCK=0` overrides)
- "DEMO" badge on the Firmen page header when isMock=true
- Each Auschreibung row gets a primary-coloured "Kalkulation starten" button that creates a new kalku-website project with `bidder`, `client`, `tenderNumber`, `deadline`, `calcParams` (cascaded from Firma defaults) pre-filled
- 3 more panel-api tests

### Phase 1c — GAEB-positions seeding (commit `f8c71cc`)

- `GET /api/panel/firmen/:kind/:firmaId/projects/:projectId/positions` — proxies to preisanfrage `/api/v1/projects/:id` and projects the response down to a kalku-website Position[]
- "Kalkulation starten" now seeds positions, not just metadata. Mobilbauzaun arrives at `quantity=100, unit="m"` (NOT 100000 — keeps the formula-audit baseline clean)
- External-firma projects 404 with `external_firma_has_no_positions` (preisanfrage only carries submission-result data for those)
- Fallback: if the positions fetch fails, the project is still created with empty positions[]
- Realistic 25-position Ludwigschule mock fixture (Baustelleneinrichtung → Gerüstbau → Abbrucharbeiten → Sandsteinmauer-Sanierung)
- 2 more panel-api tests

---

## End-to-end live verification

Drove the actual UI via Claude Preview MCP. Full demo loop:

1. Started `panel-api` with `PREISANFRAGE_MOCK=fixture` + seed credentials
2. Started `kalku-web` (Vite dev server, port 5174)
3. Logged in as `preview@kalku.de`
4. Navigated to `/panel/firmen` → saw the table with 10 firms + DEMO badge
5. Clicked Gesellchen GmbH → saw header (36 Projekte, 4 gewonnen, 1.245.320,50 € Umsatz) + Defaults form + Ausschreibungen list (4 projects)
6. Edited defaults to `materialZuschlag=18%`, `nuZuschlag=15%`, `verrechnungslohn=72,51 €/h` (Gesellchen's real values per the bauki audit) → saved → reload → form re-renders with the saved values
7. Clicked "Kalkulation starten" on Sanierung Sandsteinmauer Ludwigschule
8. Landed on `/panel/kalkulation/NaJ6G9FkeYbs8pye` — a fresh project

Verified via `GET /api/panel/projects/:id` directly:

| Field | Expected | Actual | ✓ |
|---|---|---|---|
| projectName | Sanierung Sandsteinmauer Ludwigschule | Sanierung Sandsteinmauer Ludwigschule | ✅ |
| bidder | Gesellchen GmbH | Gesellchen GmbH | ✅ |
| client | Stadtverwaltung Sankt Ingbert | Stadtverwaltung Sankt Ingbert | ✅ |
| tenderNumber | 260512 | 260512 | ✅ |
| deadline | 2026-05-12T14:00 | 2026-05-12T14:00 | ✅ |
| calcParams.materialZuschlag | 0.18 (Firma override) | 0.18 | ✅ |
| calcParams.nuZuschlag | 0.15 (Firma override) | 0.15 | ✅ |
| calcParams.verrechnungslohn | 72.51 (Firma override) | 72.51 | ✅ |
| calcParams.geraeteStundensatz | 0.5 (Firma + global match) | 0.5 | ✅ |
| positionCount | 25 (seeded from preisanfrage) | 25 | ✅ |
| Mobilbauzaun.quantity | 100 (NOT 100000) | 100 | ✅ |
| Mobilbauzaun.unit | m | m | ✅ |

**All 12 expectations met.** Full cascade `globals → Firma overrides → new project` works exactly as designed.

---

## What's deferred (Phase 1d+)

- **Real preisanfrage** — needs the user to apply the patches in [`preisanfrage_patch_instructions.md`](./preisanfrage_patch_instructions.md) (CORS for kalku.kalkus.de, bot user, 365-day JWT, env vars on the server). Once those are done, `PREISANFRAGE_MOCK` can be unset on prod and the page hits real data.
- **Firma chip on existing kalku-website projects** — so the Kalkulation list shows which Firma each project belongs to. Schema change needed: nullable `firmaRef` on the project payload.
- **Submissionsergebnis enrichment** — preisanfrage already knows "Wir haben Rang 3, Sieger war Müller mit 245 k€"; pull that into the Firma overview as a green chip per Ausschreibung.
- **Adopt endpoint** — promote an external firma to managed without leaving the panel. Requires a preisanfrage endpoint that doesn't yet exist.
- **Webhook from preisanfrage** — real-time updates instead of the 60 s cache.

---

## Test totals

After this round:
- `panel-api`: **68 tests pass** (10 are new in this round, covering preisanfrage client + mock mode + Ludwigschule fixture + JWT-leak guard)
- frontend vitest: **349 tests pass**
- `npm run lint`: **0 errors**
- `npm run build`: green (~3,75 s)

---

## Commits in this round (chronological)

| SHA | Title |
|---|---|
| `b3077d4` | docs: proposal — Firma layer above Projects (3-phase rollout) |
| `6ea675b` | docs: integration architecture — preisanfrage as Firmen/Ausschreibungen source |
| `d4cbc5d` | feat(panel): Firma integration Phase 1a — preisanfrage as source of truth |
| `530ae56` | feat(panel): Phase 1b — dev mock fixture + "Kalkulation starten" wiring |
| `f8c71cc` | feat(panel): Phase 1c — seed Kalkulation positions from preisanfrage GAEB |
