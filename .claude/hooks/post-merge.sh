#!/usr/bin/env bash
# .claude/hooks/post-merge.sh — automatisations après merge d'une PR

set -euo pipefail

BRANCH_NAME="${1:-$(git branch --show-current)}"

echo "🔄 Post-merge tasks for branch: $BRANCH_NAME"

# 1. Parser la Story depuis le nom de branche
if [[ "$BRANCH_NAME" =~ ^(feat|fix|chore|refactor)/(ST-[0-9]+\.[0-9]+) ]]; then
  STORY_ID="${BASH_REMATCH[2]}"
  echo "  → Story: $STORY_ID"
else
  echo "  ⚠️  Could not parse story from branch name. Skipping JIRA sync."
  exit 0
fi

# 2. Trouver le task file
TASK_FILE=$(find tasks/EP-*/ -name "$STORY_ID*.md" 2>/dev/null | head -1)
if [ -z "$TASK_FILE" ]; then
  echo "  ⚠️  Task file not found for $STORY_ID"
  exit 0
fi
echo "  → Task file: $TASK_FILE"

# 3. Update frontmatter status à 'done'
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i.bak \
  -e "s/^status: .*/status: done/" \
  -e "s/^merged_at: .*/merged_at: $TIMESTAMP/" \
  "$TASK_FILE"
rm "${TASK_FILE}.bak"
echo "  → Frontmatter updated: status=done, merged_at=$TIMESTAMP"

# 4. Append au changelog
mkdir -p tasks
TITLE=$(grep "^title:" "$TASK_FILE" | head -1 | sed 's/^title: *//')
echo "[$TIMESTAMP] DONE $STORY_ID — $TITLE" >> tasks/_changelog.md
echo "  → Changelog updated"

# 5. Trigger sync JIRA via Claude Code command
if command -v claude &> /dev/null; then
  echo "  → JIRA sync : run '/sync-jira push --story=$STORY_ID' in your next session"
else
  echo "  ⚠️  claude CLI not found, JIRA sync skipped. Run /sync-jira manually."
fi

echo "✅ Post-merge OK"
