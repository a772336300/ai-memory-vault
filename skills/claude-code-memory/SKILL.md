---
name: claude-code-memory
description: Migrate, summarize, and claim Claude Code memory into or from AI Memory Vault.
---

# Claude Code Memory Skill

Use this when handling Claude Code memory directories, `CLAUDE.md`, or `.claude/` project files.

## Export Claude Code memory to vault

1. Locate project memory under `~/.claude/projects/*/memory/` only if needed.
2. Prefer project-local `CLAUDE.md`, `.claude/`, docs, and scripts over raw session history.
3. Summarize into vault files instead of copying raw logs.
4. Redact secrets.
5. Update `registry.yaml` and validate.

## Claim vault memory into Claude Code project

1. Create `.claude/` if missing.
2. Copy/merge relevant project memory into `.claude/MEMORY.md`.
3. Copy relevant skills into `.claude/skills/<skill>/SKILL.md`.
4. Record claim in `.ai-memory/claimed-assets.json`.
