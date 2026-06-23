#!/bin/bash
# Daily backup of the KALKU panel calculations database (SQLite).
#
# Why this exists: the panel calcs (projects table) are critical data and were
# NOT covered by the existing ~/backups/backup-db.sh (that one only dumps the
# kalku-procurement Postgres DB). This script makes a CONSISTENT snapshot of the
# live SQLite DB (VACUUM INTO — safe while the app is writing), compresses it,
# keeps 30 days on-server, and — if an rclone remote is configured — also pushes
# it OFF-SITE so a server/disk loss can't take the data with it.
#
# Install: copied to /home/admin/backups/backup-panel-db.sh on the server and run
# nightly via cron. Source of truth lives in the repo at scripts/backup-panel-db.sh.
set -uo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/admin/backups}"
CONTAINER="${CONTAINER:-kalku-panel-api}"
DB_IN_CONTAINER="${DB_IN_CONTAINER:-/app/data/kalku.db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# OneDrive / off-site (optional until configured). Set up once with rclone:
#   rclone config   # create a remote (OneDrive personal OR a SharePoint site)
# then this script auto-uploads each new backup. Override the remote/path here
# or via env if your remote isn't named "onedrive".
ONEDRIVE_REMOTE="${ONEDRIVE_REMOTE:-onedrive}"
ONEDRIVE_PATH="${ONEDRIVE_PATH:-IT-Team - Documents/kalku-backups}"

TS="$(date +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR}/kalku_website_${TS}.db.gz"
TMP="/app/data/_backup_${TS}.db"

mkdir -p "${BACKUP_DIR}"

# 1. Consistent snapshot INSIDE the container (better-sqlite3 is already a dep).
#    VACUUM INTO produces a clean, fully-checkpointed copy even with WAL active —
#    safer than copying the live .db/.wal files.
if ! docker exec "${CONTAINER}" node -e "const db=require('better-sqlite3')('${DB_IN_CONTAINER}'); db.exec(\"VACUUM INTO '${TMP}'\"); db.close();"; then
  echo "$(date): panel backup FAILED — snapshot step"
  exit 1
fi

# 2. Stream the snapshot out of the container and gzip it to the host, then drop
#    the in-container temp. (No TTY → binary-safe stream.)
docker exec "${CONTAINER}" cat "${TMP}" | gzip > "${OUT}"
RC=$?
docker exec "${CONTAINER}" rm -f "${TMP}" 2>/dev/null
if [ "${RC}" -ne 0 ] || [ ! -s "${OUT}" ]; then
  echo "$(date): panel backup FAILED — copy/compress step"
  rm -f "${OUT}"
  exit 1
fi

SIZE="$(du -h "${OUT}" | cut -f1)"
echo "$(date): panel backup OK: ${OUT} (${SIZE})"

# 3. Retention — keep the last ${RETENTION_DAYS} days on-server.
find "${BACKUP_DIR}" -name 'kalku_website_*.db.gz' -mtime "+${RETENTION_DAYS}" -delete

# 4. Off-site copy (OneDrive/SharePoint via rclone) — only if configured. Until
#    then this is a no-op and the local backup still succeeds.
RCLONE="$(command -v rclone || echo "${HOME}/bin/rclone")"
if [ -x "${RCLONE}" ] && "${RCLONE}" listremotes 2>/dev/null | grep -q "^${ONEDRIVE_REMOTE}:"; then
  if "${RCLONE}" copy "${OUT}" "${ONEDRIVE_REMOTE}:${ONEDRIVE_PATH}/"; then
    echo "$(date): off-site copy to ${ONEDRIVE_REMOTE}:${ONEDRIVE_PATH} OK"
    # Mirror the 30-day retention off-site too.
    "${RCLONE}" delete --min-age "${RETENTION_DAYS}d" "${ONEDRIVE_REMOTE}:${ONEDRIVE_PATH}/" 2>/dev/null || true
  else
    echo "$(date): off-site copy to OneDrive FAILED (local backup still saved)"
  fi
else
  echo "$(date): OneDrive off-site not configured yet — local backup only"
fi
