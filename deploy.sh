#!/usr/bin/env bash
# Prism Optimizer — quick deploy script
#
# Stages, commits, and pushes the project. Sevalla is already configured
# to auto-deploy on every push to your connected branch, so this script
# is the only step you need after making changes.
#
# Usage:
#   ./deploy.sh "message about the change"
#   ./deploy.sh                # uses a timestamped default message

set -euo pipefail
cd "$(dirname "$0")"

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Error: this folder is not a git repository yet."
    echo "Run this once first:"
    echo "  git init"
    echo "  git remote add origin <your-github-repo-url>"
    echo "  git branch -M main"
    exit 1
fi

if git diff --quiet && git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
    echo "Nothing to deploy — no changes since the last commit."
    exit 0
fi

MESSAGE="${1:-Update $(date '+%Y-%m-%d %H:%M:%S')}"
BRANCH="$(git symbolic-ref --short -q HEAD || echo main)"

echo "Staging changes..."
git add -A

echo "Committing: $MESSAGE"
git commit -m "$MESSAGE"

echo "Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

echo ""
echo "Done. Sevalla will pick up this push and redeploy automatically"
echo "(usually visible on your dashboard within a minute or two)."
