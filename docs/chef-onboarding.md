# Chef-Onboarding — eigener Branch + Live-Preview

So gibt der Inhaber dem Chef Zugriff auf die Landing-Page, ohne dass `main`
oder die Panel-Arbeit gefährdet ist.

## Architektur in einem Bild

```
   GitHub (manigolchin/kalkuweb)
   ├── main                 ─►  kalku.kalkus.de        (Production, Mani merged)
   ├── chef/landing         ─►  preview.kalku.kalkus.de (Chef's Spielwiese)
   └── claude-auto/...      ─►  (kein Deploy — Mani's Panel-Arbeit)

   Hetzner-Server (91.98.185.113)
   ├── ~/projects/kalku-website          (main checkout)
   │     └── kalku-website container
   └── ~/projects/kalku-website-chef     (git worktree, chef/landing)
         └── kalku-website-preview container, gepollt via cron alle 2 Min
```

## Einmaliges Setup (durch Mani)

### 1. Chef als Collaborator hinzufügen

GitHub → `manigolchin/kalkuweb` → **Settings** → **Collaborators** →
**Add people** → Chef's GitHub-Username eingeben → Rolle: **Write**.

Chef bekommt eine E-Mail-Einladung, muss er bestätigen.

### 2. Branch Protection auf `main`

GitHub → `manigolchin/kalkuweb` → **Settings** → **Branches** →
**Add branch protection rule**:

- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require approvals: **1**
- ✅ Restrict who can push to matching branches → nur Mani
- ✅ Do not allow bypassing the above settings

Damit kann Chef (oder sein Claude) nicht versehentlich auf `main` pushen,
auch nicht aus Versehen. Selbst wenn der Chef-Prompt ignoriert wird, GitHub
blockt's auf Plattform-Ebene.

### 3. Chef's Mac einrichten

Auf dem Mac, an dem der Chef arbeiten soll:

```bash
mkdir -p ~/projects && cd ~/projects
git clone --single-branch --branch chef/landing \
  git@github.com:manigolchin/kalkuweb.git kalku-website
cd kalku-website
git config user.email "chef@kalku.de"   # oder seine echte Mail
git config user.name "Chef"
npm install --legacy-peer-deps
```

Damit hat sein Mac **nur** den `chef/landing`-Branch lokal. `main` und
andere Branches existieren auf seiner Festplatte gar nicht.

Dann Claude Code in dem Ordner starten und ihm den **Chef-Prompt** (unten)
als allererste Nachricht geben.

## Chef-Prompt (Boss kopiert das in seine Claude-Session)

```
Hallo Claude, ich bin der Chef. Ich mache Änderungen an der KALKU
Landing Page. Du hilfst mir.

REGELN — strikt befolgen, keine Ausnahmen:

1. Arbeite IMMER auf Branch `chef/landing`. Prüfe mit `git branch --show-current`.
   Falls du auf einem anderen Branch bist: `git checkout chef/landing`.
   Falls der Branch lokal nicht existiert: STOPP und frag mich.

2. NIEMALS auf `main` committen. NIEMALS `git push origin main`.
   NIEMALS einen anderen Branch (panel, claude-auto/*) anfassen.
   Mani merged selbst von chef/landing nach main.

3. Du darfst NUR ändern:
   - `src/pages/Home.tsx` und andere Landing-Seiten in `src/pages/`
     (NICHT `Panel*`, NICHT `Login.tsx`, NICHT `ShareView.tsx`)
   - `src/components/sections/` (Landing-Sektionen wie Hero, Pricing, Footer-Inhalte)
   - `public/` (Bilder, Assets, robots.txt)
   - `src/index.css` — nur wenn unbedingt nötig, vorher fragen

   NICHT anfassen:
   - `src/features/kalkulation/**` (Mani's Panel)
   - `src/pages/panel/**` (Mani's Panel)
   - `src/pages/Login.tsx`, `src/pages/ShareView.tsx`
   - `src/components/layout/Nav.tsx`, `Footer.tsx`, `Layout.tsx`
     (geteilte Komponenten — Konflikt-Risiko)
   - `src/lib/constants.ts`
   - `tailwind.config.js`
   - `Dockerfile`, `nginx.conf`, `docker-compose*.yml`
   - `package.json`, `package-lock.json`
   - `panel-api/`, `api/`, `direkt/`
   - `.github/`, `scripts/`, `docs/`

   Müsstest du eine gesperrte Datei ändern → STOPP, frag mich erst.

4. Vor jedem Commit: `npm run lint` UND `npm run build` müssen grün sein.
   Wenn rot — fixen oder mit `git restore .` zurücksetzen.
   NIEMALS kaputt committen.

5. Workflow nach jeder fertigen Änderung:
   a. `git add <files>` — nur die geänderten Landing-Dateien
   b. `git commit -m "feat(landing): <kurz was geändert>"` (oder `fix:`/`chore:`)
   c. `git push origin chef/landing`
   d. Warte 1-2 Minuten, dann öffne https://preview.kalku.kalkus.de in einem Browser-Tab
      und prüfe das Ergebnis live.

   Ein Commit pro abgeschlossenem Schritt. Conventional Commits
   (`feat:`, `fix:`, `chore:`). NIE `--no-verify`. NIE `--amend`.
   KEINE `Co-Authored-By: Claude`-Zeile im Commit.

6. NIEMALS deployen. NIEMALS SSH zum Server (91.98.185.113).
   NIEMALS auf Production pushen. Nur lokal arbeiten, committen, pushen
   auf `chef/landing`. Der Server zieht sich neue Commits selbst.

7. Lokale Vorschau zum schnellen Iterieren (ohne push):
   `npm run dev` startet Hot-Reload auf http://localhost:5173
   — jede Änderung sofort im Browser sichtbar.
   Nutze die Preview-Tools (preview_start, preview_screenshot) damit
   ich nach jeder Änderung einen Screenshot bekomme.

8. Im Zweifel: frag mich. Lieber 30 Sekunden nachfragen als
   eine Stunde reparieren.

Meine erste Aufgabe ist: [HIER EINTRAGEN]
```

## Wenn Chef fertig ist — Merge zurück nach main

Mani auf seinem Mac:

```bash
# 1. Stand vom Chef holen
git fetch origin chef/landing

# 2. In Chef's Branch reinschauen
git checkout chef/landing
git pull
npm install --legacy-peer-deps   # falls package.json sich doch geändert hat
npm run build                     # baut's überhaupt?
npm run dev                       # sieht's gut aus? (localhost:5173)

# 3a. Alles OK → mergen via PR
git checkout main
gh pr create --base main --head chef/landing \
  --title "feat(landing): Chef's Änderungen $(date +%Y-%m-%d)" \
  --body "Merge chef/landing → main. Preview war auf preview.kalku.kalkus.de"
# Dann GitHub-PR mergen und deployen wie üblich

# 3b. Alles OK → mergen direkt (wenn Branch Protection per gh review umgangen werden kann)
git checkout main && git pull
git merge --no-ff chef/landing -m "feat(landing): merge chef/landing $(date +%Y-%m-%d)"
git push origin main
# Dann ./scripts/deploy.sh
```

## Wenn Chef Mist gebaut hat

Drei Fallbacks, vom mildesten zum härtesten:

| Problem | Fix |
|---|---|
| Chef's `chef/landing` ist kaputt, `main` noch nicht angefasst | Production läuft weiter. Chef-Branch löschen oder Chef bitten zu fixen. `git push origin --delete chef/landing` löscht remote, dann neu erstellen. |
| Chef's Stand auf `main` gemerged, Production kaputt | `git revert -m 1 <merge-sha> && git push origin main && ./scripts/deploy.sh` — Production rebuildet in ~1 Min mit altem Stand. |
| Reflog-Hack (letzter Ausweg) | `git reflog` zeigt alle alten States. `git reset --hard <alter-sha>` springt zurück. Force-push gefährlich — nur als allerletztes Mittel. |

`chef/landing` kann ruhig kaputt sein — `preview.kalku.kalkus.de` ist nicht
Production. Egal wie kaputt, `main` bleibt unberührt solange Mani nicht merged.

## Preview-Container: manuelles Eingreifen

Falls die Cron-Auto-Rebuild mal hängt oder explizit ein Rebuild gewünscht ist:

```bash
ssh -4 -i ~/.ssh/hetzner_claude admin@91.98.185.113
cd ~/projects/kalku-website-chef
git fetch origin chef/landing
git reset --hard origin/chef/landing
docker compose -f docker-compose.preview.yml up --build -d
```

Cron-Logs auf dem Server:

```bash
tail -f ~/projects/kalku-website-chef/preview-update.log
```
