#!/usr/bin/env bash
set -euo pipefail
VAULT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.claude/skills/vault-maintainer"
cp "$VAULT_DIR/skills/vault-maintainer/SKILL.md" "$HOME/.claude/skills/vault-maintainer/SKILL.md"

if command -v npm >/dev/null 2>&1; then
  (cd "$VAULT_DIR" && npm link >/dev/null 2>&1 || true)
fi

cat <<MSG
AI Memory Vault installed.

Vault root: $VAULT_DIR
Claude Code skill: ~/.claude/skills/vault-maintainer/SKILL.md

Recommended environment variable:
  export AI_MEMORY_VAULT="$VAULT_DIR"

Try:
  ai-vault scan /path/to/project
MSG
