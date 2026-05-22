#!/usr/bin/env bash
# preview-update.sh — keep preview.kalku.kalkus.de in sync with chef/landing branch.
#
# Run on the server as a cron job (every 2 minutes):
#   */2 * * * * /home/admin/projects/kalku-website-chef/scripts/preview-update.sh >> /home/admin/projects/kalku-website-chef/preview-update.log 2>&1
#
# It runs against the git worktree at ~/projects/kalku-website-chef which is
# checked out to chef/landing. The main checkout (~/projects/kalku-website on
# `main`) is never touched by this script.
#
# Behavior:
#   - Polls origin/chef/landing
#   - If there's a new commit: hard-resets the worktree + rebuilds the preview
#     container in-place
#   - If not: exits silently (no log spam, no docker churn)
#   - Lockfile prevents concurrent runs while a rebuild is still in progress

set -euo pipefail

WORKTREE="${WORKTREE:-$HOME/projects/kalku-website-chef}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.preview.yml}"
BRANCH="${BRANCH:-chef/landing}"
LOCKFILE="/tmp/kalku-preview-update.lock"

# Prevent overlapping runs. flock returns immediately if another instance is
# holding the lock — that's fine, just skip this tick.
exec 9>"$LOCKFILE"
if ! flock -n 9; then
  exit 0
fi

cd "$WORKTREE"

# Fetch silently — avoid log spam from "From github.com..." every 2 minutes.
git fetch --quiet origin "$BRANCH"

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
echo "[$(ts)] new commit on $BRANCH: $LOCAL → $REMOTE — rebuilding preview"

# Hard-reset the worktree to match remote exactly. Discards any accidental
# local state (there shouldn't be any since nobody edits the worktree directly).
git reset --hard "origin/$BRANCH"

# Rebuild + restart only the preview container.
docker compose -f "$COMPOSE_FILE" up --build -d kalku-website-preview

# Quick health probe — non-blocking, just for the log.
sleep 4
if docker exec kalku-website-preview wget -qO- http://127.0.0.1/healthz | grep -q "ok"; then
  echo "[$(ts)] preview rebuilt OK at $REMOTE"
else
  echo "[$(ts)] WARN: preview rebuilt but healthz did not return ok"
fi
