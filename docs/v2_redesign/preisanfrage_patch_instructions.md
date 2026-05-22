# preisanfrage-side patch — required before Firma integration goes live

**Date:** 2026-05-22
**Status:** Pending — to be applied on `kalku-tech/Preisanfrage-agent` repo by the user
**Why:** kalku-website (this repo) now contains a Firmen panel that calls preisanfrage's REST API. Two small changes on the preisanfrage side are required before the production call works.

This doc is the only thing the user needs to act on for Phase 1a to go live.

---

## Change 1 — Add CORS origin

**File:** `/Users/admin/projects/kalku-procurement/app/config.py` (line ~145).

```python
# BEFORE
CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:5173",
    "https://preisanfrage.kalkus.de",
]
```

```python
# AFTER
CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:5174",            # ← kalku-website dev port
    "https://preisanfrage.kalkus.de",
    "https://kalku.kalkus.de",          # ← kalku-website panel (current staging)
    "https://kalku.de",                 # ← kalku-website panel (post-cutover)
]
```

> Note: the actual CORS check happens server-to-server in our case (panel-api → preisanfrage) where `Origin:` may not be sent at all — but adding these covers the browser-direct case too if we ever decide to drop the proxy layer.

After the change, restart the preisanfrage container:

```bash
ssh -4 -i ~/.ssh/hetzner_claude admin@91.98.185.113 \
  "cd ~/projects/kalku-procurement && \
   git pull && \
   docker compose -f docker-compose.prod.yml up --build -d"
```

---

## Change 2 — Provision a service-account user + long-lived JWT

panel-api uses ONE shared identity to call preisanfrage (per the architecture decision 2026-05-22). It does NOT impersonate individual KALKU calculators. The service account needs read-only access to all firmas.

### 2.1 — Create the user

In preisanfrage's admin UI (or directly via SQL on the prod Postgres):

```sql
-- Replace the password hash; recommended: generate via Python:
--   from passlib.hash import bcrypt; print(bcrypt.hash("<strong-random>"))
INSERT INTO users (username, password_hash, full_name, email,
                   is_active, is_admin, can_onboard_companies, can_see_vergabe)
VALUES (
  'kalku-website-bot',
  '$2b$12$...',               -- bcrypt hash of a long random password
  'KALKU Website Integration',
  'bot@kalku.de',
  TRUE,                       -- is_active
  FALSE,                      -- is_admin (we want minimum scope)
  FALSE,                      -- can_onboard_companies
  FALSE                       -- can_see_vergabe
);
```

Then assign it access to **all** company_ids:

```sql
-- Assuming a user_company_access table; adapt to your actual schema.
INSERT INTO user_company_access (user_id, company_id)
SELECT (SELECT id FROM users WHERE username='kalku-website-bot'), id FROM companies;
```

### 2.2 — Mint a long-lived JWT for the bot

Login once via the admin UI as `kalku-website-bot` and copy the JWT from the response. Default expiry in preisanfrage is short — for a service account we need ~12 months.

If preisanfrage's `/api/v1/auth/login` uses `jose` with `setExpirationTime`, override:

```python
# In app/utils/auth.py — wherever the access token is signed
def create_access_token(user_id: int, *, expires_minutes: int | None = None) -> str:
    ttl = expires_minutes or settings.ACCESS_TOKEN_EXPIRES_MINUTES
    payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(minutes=ttl)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
```

Add a one-shot CLI / admin endpoint to mint a 365-day token for the bot user. (Or accept the short-TTL default + add a refresh job — but a long-lived service token is the simpler ship.)

### 2.3 — Store the token in kalku-website's environment

On the production server (the box running panel-api):

```bash
ssh -4 -i ~/.ssh/hetzner_claude admin@91.98.185.113
cd ~/projects/kalku-website

# Append to the panel-api env file (next to docker-compose.prod.yml)
echo 'PREISANFRAGE_API_URL=https://preisanfrage.kalkus.de' >> .env.panel-api
echo 'PREISANFRAGE_SERVICE_JWT=<paste-the-365-day-token-here>' >> .env.panel-api

docker compose -f docker-compose.prod.yml up --build -d panel-api
```

### 2.4 — Verify

From a panel logged-in browser:

```bash
curl https://kalku.kalkus.de/api/panel/firmen/health \
  -H "Cookie: kalku_session=<your-session-cookie>"
# → { "enabled": true, "hint": "preisanfrage service token is configured" }

curl https://kalku.kalkus.de/api/panel/firmen \
  -H "Cookie: kalku_session=<your-session-cookie>"
# → { "rows": [ {...98 firms...} ], "managedCount": 7, "externalCount": 91, ... }
```

If `enabled: false` comes back, the env var didn't propagate to the container. Check `docker compose exec panel-api env | grep PREISANFRAGE`.

---

## Why a service-account JWT and not per-user SSO?

Per the architecture decision recorded in `multi_company_integration_architecture.md` (user choice 2026-05-22):

- Simpler to ship (no SSO plumbing, no per-user account provisioning)
- Audit on the kalku-website side already records which calculator did what (via the panel cookie)
- preisanfrage's audit log will show "kalku-website-bot read /companies" — not the individual user — which is fine because reads are non-destructive

If you ever need per-user audit on the preisanfrage side, switch to a token-exchange flow later: panel-api takes the user's session cookie, asks a new `/api/v1/auth/exchange` endpoint for a short-lived per-user JWT, uses that for the upstream call.

---

## What kalku-website does NOT need from preisanfrage

These were considered and explicitly excluded from Phase 1a:

- `POST /admin/external-firmas/{id}/adopt` — the "promote external→managed" endpoint. Not needed for read-only Firmen list. Add later if needed for in-panel firma onboarding.
- New columns on `companies` for calc defaults (Material/NU Zuschlag, Verrechnungslohn, Geräte). Per the architecture decision, panel-api owns these in its own `firma_calc_defaults` table.
- Webhooks. Phase 1a uses live API on every page load + 60 s in-memory cache. Phase 2 may add webhooks for real-time updates.
