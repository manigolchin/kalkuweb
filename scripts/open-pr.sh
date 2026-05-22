#!/usr/bin/env bash
# Round 6 PART CC — open the v2 INTERN/KUNDEN PR.
#
# Why this script exists:
#   gh CLI auth token expired during Round 6, so the Claude session that
#   prepared the PR could not call `gh pr create` itself.  The branch is
#   already pushed to origin (claude-auto/v2-gaps-closeout); only the PR
#   creation + labels + final coverage-matrix comment remain.
#
# Usage:
#   1. gh auth login            (one-shot, browser flow)
#   2. bash scripts/open-pr.sh
#
# The script is idempotent: if a PR for this branch already exists, it
# prints the URL and exits.

set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="claude-auto/v2-gaps-closeout"
TITLE="Kalku v2: INTERN/KUNDEN split + full Excel import + share-link with password / per-position comments / revision banner"
BODY_FILE="docs/v2_redesign/PR_DESCRIPTION.md"
COVERAGE_FILE="docs/v2_redesign/feature_coverage_audit.md"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not installed. brew install gh" >&2
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login -h github.com" >&2
  exit 1
fi

# If a PR already exists, just print its URL.
EXISTING=$(gh pr list --head "$BRANCH" --state open --json url --jq '.[0].url' 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  echo "PR already open: $EXISTING"
  exit 0
fi

# Create the PR with the prepared body.
PR_URL=$(gh pr create \
  --base main \
  --head "$BRANCH" \
  --title "$TITLE" \
  --body-file "$BODY_FILE" \
  --label needs-migration \
  --label frontend \
  --label backend \
  --label e2e-tested)

echo "PR opened: $PR_URL"

# Post the 10-LV coverage matrix as a follow-up comment.
# We extract the matrix block from feature_coverage_audit.md (the first
# table after "## The matrix") so the comment stays a single source of
# truth.  Falling back gracefully if the section isn't found.
MATRIX=$(awk '/^## The matrix/,/^## Per-feature commentary/' "$COVERAGE_FILE" | head -n -1 | tail -n +2 || true)
if [ -n "$MATRIX" ]; then
  echo ""
  echo "Posting coverage matrix as a follow-up comment..."
  gh pr comment "$PR_URL" --body "$MATRIX"
fi

echo ""
echo "Done."
