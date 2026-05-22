#!/usr/bin/env bash
# Deploy kalku-website to production server (kalku.kalkus.de)
#
# Usage:  ./scripts/deploy.sh
#
# What it does:
#   1. Confirms main is up to date on origin
#   2. SSHs to Hetzner (admin@91.98.185.113)
#   3. Pulls latest main on server
#   4. Rebuilds the Docker container behind Traefik
#
# Prereqs:
#   - ~/.ssh/id_ed25519 has access to admin@91.98.185.113
#   - Repo on server lives at ~/projects/kalku-website (adjust SERVER_REPO_PATH if not)

set -euo pipefail

SERVER_HOST="admin@91.98.185.113"
SERVER_KEY="$HOME/.ssh/id_ed25519"
SERVER_REPO_PATH="~/projects/kalku-website"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Local: fetching origin/main..."
git fetch origin main --quiet

LOCAL=$(git rev-parse origin/main)
echo "    origin/main is at $LOCAL"

echo
echo "==> Server: pulling + rebuilding container..."
ssh -i "$SERVER_KEY" -o ConnectTimeout=15 "$SERVER_HOST" \
  "cd $SERVER_REPO_PATH && git config user.email 'deploy@kalku.de' && git config user.name 'kalku deploy' && git config pull.rebase false && git pull --no-edit origin main && docker compose -f $COMPOSE_FILE up --build -d && docker compose -f $COMPOSE_FILE ps"

echo
echo "==> Done. Live at https://kalku.kalkus.de/"
