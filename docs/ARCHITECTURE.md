# Architecture

AI Memory Vault is intentionally simple: Git is the sync layer; Markdown/YAML are the agent-readable data layer; a small CLI provides deterministic helpers.

## Components

1. **Protocol** — `VAULT_PROTOCOL.md`
   - Defines what agents may write, claim, and commit.
   - Prevents raw chat dumps and secrets from entering the vault.

2. **Registry** — `registry.yaml`
   - Machine-readable index for assets.
   - Drives deterministic matching by files, dependencies, frameworks, languages, packages, aliases, remotes, and explicit `always` rules.
   - Carries `scope` and `visibility` metadata so private project memory can be separated from public reusable assets.

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
   - `claim`: install matched skills, write a compact project memory marker, and record claimed asset hashes.
   - `export`: create a draft project memory directory and private registry entry.
   - `summarize`: stage a non-destructive proposal and paired session summary in `inbox/`.
   - `context`: print compact startup context for an agent without loading full assets.
   - `validate`: check required files, registry paths, scopes/visibility, CLI wiring, skill metadata, GitHub workflow wiring, and obvious secret patterns.
   - `test`: exercise scan, claim, export, and validation failure behavior.

6. **Inbox** — `inbox/proposals/` and `inbox/session-summaries/`
   - Stages uncertain or newly extracted knowledge before promotion into canonical vault assets.
   - Keeps summarization non-destructive and reviewable.

7. **GitHub workflow** — `.github/workflows/validate.yml`
   - Runs `npm run validate` on push and pull request.
   - Keeps the vault cloneable and usable from GitHub without extra services.

## Why GitHub

- Cross-device clone/pull/push.
- Versioned memory with rollback.
- Private repo support.
- Works for developers without trusting a new SaaS.
- Easy migration across Claude accounts.

## Why not sync all ~/.claude

The vault stores distilled knowledge, not raw agent state. Raw session logs are noisy, path-dependent, hard to merge, and may contain secrets.
