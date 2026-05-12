---
name: vault-maintainer
description: Maintain and claim AI Memory Vault assets. Use when the user asks to summarize a project into the vault, sync project memory, claim relevant skills/memory into a project, or restore global AI development setup.
---

# Vault Maintainer Skill

You maintain an AI Memory Vault. The vault is for AI agents first, humans second.

## First step

Find the vault root. Prefer:

1. `$AI_MEMORY_VAULT`
2. `~/.ai-memory-vault`
3. `./ai-memory-vault`
4. ask only if not found

Read `VAULT_PROTOCOL.md` before making changes.

## Project → Vault

When exporting/summarizing a project:

1. Identify project name and stable identity using git remote, package/app name, and aliases.
2. Read docs, manifests, agent instructions, scripts, and existing memory files.
3. Extract only durable knowledge: facts, decisions, mistakes, commands, workflows, reusable skills.
4. Never copy secrets, `.env`, tokens, private keys, cookies, or raw chat dumps.
5. Write/update `projects/<project-id>/` files.
6. Update `registry.yaml`.
7. Run `node scripts/ai-vault.js validate` from the vault root.
8. Commit with `docs: update <project-id> vault memory` or a better conventional message.

## Vault → Project

When claiming into a project:

1. Read `registry.yaml`.
2. Scan the target project.
3. Match assets by git remote, files, dependencies, language, framework, and aliases.
4. Install relevant assets to project-local `.claude/` or `.ai-memory/` by default.
5. Use global install only for global preferences/skills.
6. Do not overwrite; merge or create backups.
7. Write `.ai-memory/claimed-assets.json`.

## Output

Report:

- what was read
- what was written or claimed
- skipped sensitive items
- validation result
- commit hash if committed
