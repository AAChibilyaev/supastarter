#!/usr/bin/env bash
# merge-worktree.sh — merge agent worktree into current branch, then clean up
# Usage: ./tooling/scripts/merge-worktree.sh <agent-id> "<commit message>"
set -e

AGENT_ID="$1"
MSG="${2:-merge: agent $AGENT_ID work}"
BRANCH="worktree-agent-$AGENT_ID"
WORKTREE=".claude/worktrees/agent-$AGENT_ID"

if [ -z "$AGENT_ID" ]; then
  echo "Usage: $0 <agent-id> [commit message]"
  exit 1
fi

# Helper: remove stale pre-split saas.json files agents sometimes create
_fix_i18n() {
  local found
  found=$(git diff --name-only --diff-filter=U 2>/dev/null | grep "saas\.json" || true)
  if [ -n "$found" ]; then
    echo "  → removing stale saas.json files (pre-split format)..."
    git rm --cached packages/i18n/translations/*/saas.json 2>/dev/null || true
    rm -f packages/i18n/translations/*/saas.json
  fi
}

echo "→ Merging branch $BRANCH (-X theirs)..."
if git merge "$BRANCH" -X theirs --no-edit \
    -m "$MSG

Co-Authored-By: Paperclip <noreply@paperclip.ing>" 2>&1; then
  echo "✓ Merge clean"
else
  echo "  Conflicts detected — auto-resolving..."
  _fix_i18n
  git add -A
  git commit -m "$MSG

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
  echo "✓ Resolved"
fi

echo "→ Cleaning up worktree and branch..."
git worktree unlock "$WORKTREE" 2>/dev/null || true
git worktree remove --force --force "$WORKTREE" 2>/dev/null || true
git branch -D "$BRANCH" 2>/dev/null || true

echo "✓ Done: $BRANCH merged and removed"
