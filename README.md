# kalku.de — Website

Neue B2B-Website für KALKU Baukalkulationen, Saarbrücken. Vite + React 19 + TypeScript + Tailwind 3.4. Ersetzt die alte WordPress + Bricks-Builder-Seite.

## Inhalt

- [Stack](#stack)
- [Architektur](#architektur)
- [Lokal entwickeln](#lokal-entwickeln)
- [Deployment](#deployment)
- [Entwicklung](#entwicklung)
- [Doku](#doku)

---

## Stack

| Bereich | Wahl |
|---------|------|
| **Build** | Vite 7 |
| **UI** | React 19 + React Router 7 + Tailwind 3.4 + lucide-react |
| **Fonts** | Inter Variable (self-hosted via `@fontsource-variable/inter`) |
| **SEO** | `react-helmet-async` für Per-Route-Meta + JSON-LD |
| **Forms** | Pipedrive Webhook async + Listmonk Newsletter (Backend WIP) |
| **Termine** | Cal.com (self-hosted) |
| **Spam** | Cloudflare Turnstile (Managed-Mode, cookie-less) auf Tool-Forms |
| **Analytics** | Plausible (cookie-less, EU-hosted) |
| **Deploy** | Docker + nginx hinter Traefik auf Hetzner (91.98.185.113) |

---

## Architektur

```
                  ┌───────────────────────────────────────────┐
                  │      Traefik (Hetzner 91.98.185.113)      │
                  │            *.kalkus.de TLS                │
                  └─────────────────┬─────────────────────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                      ▼
        kalku.kalkus.de       preisanfrage.kalkus.de    gaeb.kalku.de
        ┌───────────────┐    ┌───────────────────┐    ┌────────────┐
        │ kalku-website │    │ kalku-procurement │    │ kalku-direkt│
        │  (this repo)  │    │   (separate repo) │    │  (subdir)  │
        └───────────────┘    └───────────────────┘    └────────────┘
```

Zwei Container in diesem Repo:

- **`kalku-website`** — Haupt-Site (Vite-Build → nginx) → `kalku.kalkus.de` (Staging während Bauphase, später `kalku.de`)
- **`kalku-direkt`** — Standalone-Tools-Micro-App im `/direkt/`-Subdir → eigene Traefik-Route

Beide hängen an Traefiks externem Netzwerk `kalku_kalku-network`.

---

## Lokal entwickeln

```bash
npm install
npm run dev          # http://localhost:5173
```

Build prüfen:
```bash
npm run build        # Production-Build in dist/
npx tsc -b           # Typcheck
```

Optional Container lokal:
```bash
docker compose -f docker-compose.prod.yml up --build
```

---

## Deployment

### Produktion (Hetzner + Traefik)

Identischer Workflow wie [kalku-procurement](https://github.com/kalku-tech/Preisanfrage-agent):

```bash
# Auf Server
cd /home/admin/projects/kalku-website
git pull
docker compose -f docker-compose.prod.yml up --build -d
```

Oder in einem Aufruf vom lokalen Rechner:

```bash
ssh -4 -i ~/.ssh/hetzner_claude admin@91.98.185.113 \
  "cd ~/projects/kalku-website && \
   git fetch origin && \
   git checkout main && \
   git merge --ff-only origin/main && \
   docker compose -f docker-compose.prod.yml up --build -d && \
   sleep 6 && \
   docker compose -f docker-compose.prod.yml ps && \
   docker exec kalku-website wget -qO- http://127.0.0.1/healthz"
```

**Voraussetzungen für Produktion:**
- Traefik-Netzwerk `kalku_kalku-network` muss existieren
- Domain `kalku.kalkus.de` zeigt auf 91.98.185.113
- Cloudflare-Wildcard-Cert `*.kalkus.de` ist via cert-resolver `cloudflare` verfügbar

**Verify nach Deploy:**
```bash
curl -fsS https://kalku.kalkus.de/ | grep -oE "index-[A-Za-z0-9_-]+\.js"
```
Der Hash muss zum lokalen `dist/assets/index-*.js` aus `npm run build` passen.

### Cutover-Plan

Aktuell läuft die Seite unter `kalku.kalkus.de` (Staging). Später Host-Rule auf `kalku.de` + `www.kalku.de` umstellen mit 301-Redirects der WordPress-URLs (siehe `docs/06a-sitemap-urls.md`).

---

## Entwicklung

### Git-Workflow

Wie bei [kalku-procurement](https://github.com/kalku-tech/Preisanfrage-agent): kleine, verifizierte Änderungen gehen **direkt auf `main`**. Kein PR-Zwang.

```bash
# Direkt auf main arbeiten
git add src/...
git commit -m "feat(scope): kurze Beschreibung"
git push origin main
# → Server pullt + rebuildet (siehe Deployment-Sektion)
```

Feature-Branches + PR nur in Ausnahmefällen:

- Mehrere parallele Claude-Sessions arbeiten am selben Repo (Race-Condition-Risiko)
- Größere Umbauten wo eine Review-Stufe wirklich sinnvoll ist
- User fordert ausdrücklich „PR" oder „Branch erst"

In diesen Fällen `feat/<thema>` / `fix/<thema>` / `chore/<thema>` / `refactor/<thema>` Branch verwenden. **Niemals** die auto-generierten `claude/xxx-yyy-zzz` Worktree-Namen unverändert pushen.

GitHub `main` ist Single Source of Truth — der Server fast-forwarded nur von `origin/main`, nie von Feature-Branches direkt.

### Commit-Messages

- Deutsch, kurz, im Imperativ
- Format: `feat(scope): was geändert wurde` oder einfacher `fix: kurze Beschreibung`
- **Keine `Co-Authored-By: Claude ...`** Zeilen — nur User-Sign-off
- **Niemals `--no-verify`** — pre-commit-Hooks müssen laufen

### Tests / Verifikation vor Push

```bash
npx tsc -b           # TypeScript clean
npm run build        # Vite-Build erfolgreich
```

Visuelle Verifikation im Browser via Claude-Preview-Tools oder `npm run dev`.

---

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
- `07a/b/c-review-*.md` — Pre-Launch-Reviews (Design / UX / Credibility)
- `08-fancy-research.md` — Zusatz-Recherche
- `09-kalku-online-research.md` — KALKU-spezifische Web-Recherche (LinkedIn, TikTok, Bülent, etc.)

---

## Lizenz

Proprietär — KALKU Baukalkulationen, Saarbrücken.
