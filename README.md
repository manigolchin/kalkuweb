# kalku.de — Website

Neue B2B-Website für KALKU Baukalkulationen, Saarbrücken. Vite + React 19 + TypeScript + Tailwind 3.4. Ersetzt die alte WordPress + Bricks-Builder-Seite.

## Stack

- **Build:** Vite 7
- **UI:** React 19 + React Router 7 + Tailwind 3.4 + lucide-react
- **Fonts:** Inter Variable (self-hosted via `@fontsource-variable/inter`)
- **SEO:** `react-helmet-async` für Per-Route-Meta + JSON-LD
- **Forms:** Pipedrive Webhook async + Listmonk Newsletter
- **Termine:** Cal.com (self-hosted)
- **Spam:** Cloudflare Turnstile (Managed-Mode, cookie-less) auf Tool-Forms
- **Analytics:** Plausible (cookie-less)
- **Deploy:** Docker + nginx hinter Traefik auf Hetzner (91.98.185.113)

## Lokal entwickeln

```bash
npm install
npm run dev
```

Server: http://localhost:5173

## Build & Production

```bash
npm run build           # local build to dist/
docker compose -f docker-compose.prod.yml up --build -d
```

## Deploy

Production-Cutover: `neu.kalku.de` während Bauphase, dann Cutover auf `kalku.de` mit 301-Redirects der WordPress-URLs (siehe `docs/06a-sitemap-urls.md`).

## Doku

Alle Phase-Dokumente in [`docs/`](./docs/):

- `00-phase1-dossier.md` — Strategie + Decisions
- `01-design-tokens.md` — komplette Token-Reference (626 Zeilen)
- `02-component-inventory.md` — 26 Komponenten + 8 neue
- `03-content-audit-ugur.md` — verfügbarer Copy-Korpus
- `04-competitor-research.md` — Wettbewerb + 8 Differenzierungs-Hebel
- `05-seo-keywords.md` — Keyword-Universum + Quick-Wins
- `06-phase2-plan.md` — Phase 2 Synthese
- `06a-sitemap-urls.md` — finale URL-Architektur + Schema.org
- `06b-wireframes.md` — Wireframes pro Seitentyp
- `06c-conversion-pipedrive.md` — Form-Strategie + CRM-Mapping

## Lizenz

Proprietär — KALKU Baukalkulationen, Saarbrücken.
