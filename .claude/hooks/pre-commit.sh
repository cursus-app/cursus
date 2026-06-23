#!/usr/bin/env bash
# .claude/hooks/pre-commit.sh — gates qualité avant commit

set -euo pipefail

echo "🔍 Pre-commit checks..."

# 1. Lint
echo "  → ESLint..."
pnpm lint --fix --quiet || { echo "❌ Lint failed"; exit 1; }

# 2. Type-check
echo "  → TypeScript..."
pnpm typecheck || { echo "❌ Typecheck failed"; exit 1; }

# 3. Tests unit sur fichiers modifiés
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|vue)$' || true)
if [ -n "$STAGED_FILES" ]; then
  echo "  → Unit tests on staged files..."
  pnpm test --run --changed --no-coverage || { echo "❌ Tests failed"; exit 1; }
fi

# 4. Gitleaks (no secrets)
if command -v gitleaks &> /dev/null; then
  echo "  → Secrets scan..."
  gitleaks protect --staged --no-banner || { echo "❌ Secrets detected"; exit 1; }
else
  echo "  ⚠️  gitleaks not installed, skipping. Install: brew install gitleaks"
fi

echo "✅ Pre-commit OK"
