# AI Memory Vault

AI Memory Vault is an **AI-maintained development asset vault**.

It is not a normal note repo. It is a portable vault that coding agents can read, update, and claim from:

- **Project → Vault**: summarize project memory, decisions, skills, commands, and reusable lessons into this repo.
- **Vault → Project**: scan a local project and let an AI claim the relevant global rules, skills, patterns, and project memory into that project.
- **Vault → New device**: restore global agent instructions and skills on a new computer.

The human gives natural-language instructions. The AI does the extraction, classification, installation, validation, and commit.

## Quick start

```bash
git clone <your-private-repo-url> ~/.ai-memory-vault
cd ~/.ai-memory-vault
npm link
ai-vault scan /path/to/project
ai-vault claim /path/to/project --dry-run
ai-vault export /path/to/project --project-id my-project
ai-vault summarize /path/to/project --text "short session summary"
ai-vault context /path/to/project
ai-vault status /path/to/project
ai-vault sync /path/to/project --dry-run
ai-vault list-assets
ai-vault asset vault-maintainer
ai-vault index
ai-vault search "debugging docker"
ai-vault impact vault-maintainer
ai-vault map
ai-vault promote inbox/proposals/<proposal>.md --dry-run
ai-vault install-adapter claude-code /path/to/project --dry-run
ai-vault validate
```

For Claude Code, install the global maintainer skill:

```bash
mkdir -p ~/.claude/skills/vault-maintainer
cp skills/vault-maintainer/SKILL.md ~/.claude/skills/vault-maintainer/SKILL.md
```

Then tell Claude Code:

> Read `~/.ai-memory-vault/VAULT_PROTOCOL.md`, scan this project, and claim the relevant memories and skills into this project. Do not copy secrets.

or:

> Read `~/.ai-memory-vault/VAULT_PROTOCOL.md`, summarize this project into the vault, update registry.yaml, validate, commit and push.

## Core files

- `VAULT_PROTOCOL.md` — mandatory instructions for any AI agent using this vault.
- `registry.yaml` — index of global assets, projects, skills, and patterns.
- `skills/vault-maintainer/SKILL.md` — global AI skill that tells agents how to maintain and claim the vault.
- `scripts/ai-vault.js` — lightweight helper CLI for scanning, claiming, exporting, promoting, indexing, syncing, and validating.
- `docs/BORROWED_IDEAS.md` — roadmap of useful patterns borrowed from adjacent open-source memory/skill projects.
- `docs/GITNEXUS_IDEAS.md` — GitNexus-inspired roadmap for asset graph, impact, status, map, and safe promotion workflows.

## CLI behavior

- `scan` prints detected project identity, remote, package name, languages, frameworks, and dependencies as JSON.
- `claim` reads `registry.yaml`, matches assets by `match.always`, files, dependencies, frameworks, languages, packages, aliases, and remotes, then writes `.ai-memory/claimed-assets.json` with asset hashes, installs matched skills under `.claude/skills/`, and writes a compact marked `.claude/MEMORY.md` claim block.
- `export` creates `projects/<project-id>/` from templates and adds a matching private `project:<project-id>` entry to `registry.yaml`.
- `summarize` stages a non-destructive proposal in `inbox/proposals/` and a session summary in `inbox/session-summaries/`.
- `promote` moves a reviewed proposal into durable `projects/<id>/memory.md` and archives it under `inbox/promoted/`.
- `context` prints compact startup context for any agent without loading full assets.
- `status` compares a project's claim manifest with current vault asset hashes and reports fresh/stale/missing/visibility changes.
- `sync` runs the Git-backed recovery loop: pull vault, validate, claim into project, then print status (`--dry-run` previews only).
- `list-assets` and `asset <id>` provide progressive disclosure primitives.
- `index` builds `.ai-memory-index.json`; `search` queries the lightweight local index without a database.
- `install-adapter <claude-code|codex|openclaw|cursor>` writes small adapter files so each agent knows how to use the vault.
- `impact <asset-id>` and `map` expose lightweight asset graph relationships inspired by GitNexus.
- `validate` checks required vault files, registry paths, scopes/visibility, required CLI scripts/bin wiring, skill metadata, the GitHub validation workflow, and obvious secret patterns.

## Safety model

The vault stores durable, reusable development knowledge only:

- facts, decisions, mistakes, workflows, commands, skills
- never raw chat dumps
- never API keys, passwords, tokens, `.env` values, private keys, cookies

Run validation before committing:

```bash
npm test
npm run validate
```

The repository includes `.github/workflows/validate.yml` so GitHub runs the same validation on pushes and pull requests.
