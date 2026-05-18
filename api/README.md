# kalku-api

Minimaler Form-Submission-Backend für `kalku.kalkus.de` (später `kalku.de`).
Läuft als zweiter Container `kalku-api` neben `kalku-website`. Traefik routet
`Host(kalku.kalkus.de) && PathPrefix(/api)` mit Priority 300 → hierhin
(spezifischer als die `kalku-website` Host-only Regel mit Priority 200).

## Endpoints

- `GET  /api/healthz` → `200 ok` (Plaintext, auch für Docker-Healthcheck)
- `POST /api/forms/submit` → Akzeptiert offenes JSON-Schema, mindestens `email`.
  - Honeypot-Feld `website` (non-empty) → silent `200`, kein Log/Persist.
  - Ohne/ungültige `email` → `400 { ok:false, error:"invalid_email" }`.
  - Body > 50 KB → `413`.
  - Rate-Limit: 10 Requests/h pro IP.
  - Persistiert jede Submission als JSONL-Zeile in `./data/submissions.jsonl`
    (mit `id`, `ts`, `ip`, `ua` plus allen Body-Feldern außer `website`).
  - Optional: SMTP-Mail an `LEAD_EMAIL_TO` und Pipedrive-Lead. Beides
    best-effort — Failures werden nur geloggt, blockieren die `200`-Response
    nicht.

## Lokale Entwicklung

```bash
cd api
cp .env.example .env   # leer lassen reicht; ohne SMTP läuft Mailversand nicht
npm install
npm start              # → http://127.0.0.1:3000/api/healthz
```

Test:

```bash
curl -fsS http://127.0.0.1:3000/api/healthz
# → ok

curl -fsS -X POST http://127.0.0.1:3000/api/forms/submit \
  -H 'Content-Type: application/json' \
  -d '{"type":"kontakt","email":"test@example.com","firma":"Acme GmbH"}'
# → {"ok":true,"id":"…"}
```

JSONL-Output landet in `./data/submissions.jsonl`.

## Deployment

Der Service ist Teil der Root-`docker-compose.prod.yml`. Auf dem Server (Pfad
`~/projects/kalku-website`):

```bash
cd ~/projects/kalku-website
cp api/.env.example api/.env
# api/.env editieren — siehe „Env-Variablen" unten
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
curl -fsS https://kalku.kalkus.de/api/healthz   # → ok
```

Das Volume `./api/data:/app/data` persistiert `submissions.jsonl` zwischen
Container-Neustarts/Rebuilds. `data/` ist über `.gitignore` ausgenommen.

## Env-Variablen

Die Datei `api/.env` wird per `env_file:` in den Container geladen.

| Var | Pflicht? | Bedeutung |
| --- | --- | --- |
| `PORT` | nein (Default 3000) | Listen-Port. Traefik erwartet 3000. |
| `CORS_ORIGINS` | nein | Komma-separierte erlaubte Origins. Default deckt `kalku.kalkus.de`, `kalku.de`, `www.kalku.de` ab. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | optional, alle 4 nötig | Wenn vollständig → Lead-Mails gehen raus. Sonst Skip. |
| `SMTP_FROM` | wenn SMTP aktiv | Absenderadresse, z. B. `KALKU Web <noreply@kalku.de>`. |
| `LEAD_EMAIL_TO` | nein (Default `it@kalku.de`) | Empfänger der Lead-Benachrichtigung. |
| `PIPEDRIVE_API_TOKEN` | optional | Wenn gesetzt → Lead wird in Pipedrive angelegt. |
| `PIPEDRIVE_OWNER_ID` | optional | Numerische Pipedrive-User-ID als Owner des Leads. |

### Beispielwerte typischer Provider

- **Strato/IONOS/all-inkl**: `SMTP_HOST=smtp.<provider>.de`, `SMTP_PORT=587`,
  User/Pass = Mailbox-Credentials.
- **Resend**: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`,
  `SMTP_PASS=<api-key>`.
- **Gmail App-Password**: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`,
  User=Mailadresse, Pass=App-Password (nicht das Account-Passwort).

## Frontend-Integration

Forms im React-Frontend (`MultiStepForm.tsx`, `LeadMagnet.tsx`,
`ExitIntent.tsx`) rufen `fetch('/api/forms/submit', …)` an. Da Frontend und
API beide unter `kalku.kalkus.de` laufen (Traefik routet nach PathPrefix),
ist kein Cross-Origin-Aufruf nötig und CORS ist defensiv-permissiv. Falls der
fetch fehlschlägt (z. B. API down), fallen die Forms auf `mailto:it@kalku.de`
zurück.
