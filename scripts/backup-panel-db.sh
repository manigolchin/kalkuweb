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

# RETENTION POLICY: KEEP EVERYTHING — never delete a backup (user request
# 2026-06-23: "back up all our calculations and dont delete them because after
# 6 month maybe i will need that auschreibung calculation"). Each daily file is
# a full snapshot of every calc, so any deleted-from-the-app calc stays
# recoverable from any older backup. Size is trivial (~900 KB/day → ~0.3 GB/yr).
# If on-server disk ever needs trimming, prune OLD LOCAL files only — the
# OneDrive copies are the permanent archive and must stay untouched.

# OneDrive off-site (rclone remote "onedrive" = the IT-Team Shared Documents
# library). Uploads into ONE dedicated NEW folder; nothing else in the library
# is ever read, moved, or deleted.
ONEDRIVE_REMOTE="${ONEDRIVE_REMOTE:-onedrive}"
ONEDRIVE_PATH="${ONEDRIVE_PATH:-kalku-backups}"

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

# 3. NO local deletion — keep every snapshot (see retention policy above).

# 4. Off-site copy to OneDrive (only if rclone + the remote are configured).
#    `copy` is upload-only + additive: it can never delete or overwrite anything
#    in the library, and it only ever writes inside the dedicated folder. There
#    is intentionally NO delete/sync/move anywhere here — backups are kept
#    forever off-site too.
RCLONE="$(command -v rclone || echo "${HOME}/bin/rclone")"
if [ -x "${RCLONE}" ] && "${RCLONE}" listremotes 2>/dev/null | grep -q "^${ONEDRIVE_REMOTE}:"; then
  if "${RCLONE}" copy "${OUT}" "${ONEDRIVE_REMOTE}:${ONEDRIVE_PATH}/"; then
    echo "$(date): off-site copy to ${ONEDRIVE_REMOTE}:${ONEDRIVE_PATH} OK (kept forever)"
  else
    echo "$(date): off-site copy to OneDrive FAILED (local backup still saved)"
  fi
else
  echo "$(date): OneDrive off-site not configured yet — local backup only"
fi
