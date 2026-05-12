#!/usr/bin/env bash
set -euo pipefail
VAULT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$HOME/.claude/skills/vault-maintainer"
cp "$VAULT_DIR/skills/vault-maintainer/SKILL.md" "$HOME/.claude/skills/vault-maintainer/SKILL.md"
echo "Installed vault-maintainer skill to ~/.claude/skills/vault-maintainer/SKILL.md"
