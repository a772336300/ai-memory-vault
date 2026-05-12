# Architecture

AI Memory Vault is intentionally simple: Git is the sync layer; Markdown/YAML are the agent-readable data layer; a small CLI provides deterministic helpers.

## Components

1. **Protocol** — `VAULT_PROTOCOL.md`
   - Defines what agents may write, claim, and commit.
   - Prevents raw chat dumps and secrets from entering the vault.

2. **Registry** — `registry.yaml`
   - Machine-readable index for assets.
   - Helps agents discover relevant global rules, skills, patterns, and project memory.

3. **Assets**
   - `global/`: global preferences and standards.
   - `projects/`: project-specific durable memory.
   - `skills/`: reusable agent workflows.
   - `patterns/`: reusable implementation/debug/deploy patterns.

4. **Maintainer Skill** — `skills/vault-maintainer/SKILL.md`
   - Installed globally into Claude Code.
   - Converts natural-language user requests into vault maintenance actions.

5. **Helper CLI** — `scripts/ai-vault.js`
   - `scan`: detect project identity and stack.
   - `claim`: install matched assets into a project.
   - `export`: create a draft project memory directory.
   - `validate`: check required files and obvious secret patterns.

## Why GitHub

- Cross-device clone/pull/push.
- Versioned memory with rollback.
- Private repo support.
- Works for developers without trusting a new SaaS.
- Easy migration across Claude accounts.

## Why not sync all ~/.claude

The vault stores distilled knowledge, not raw agent state. Raw session logs are noisy, path-dependent, hard to merge, and may contain secrets.
