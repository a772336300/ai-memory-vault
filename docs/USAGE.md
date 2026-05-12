# Usage

## Export current project into vault

Tell an AI agent:

> Use the vault protocol. Summarize this project into `~/.ai-memory-vault`, update registry.yaml, validate, commit and push. Do not copy secrets.

Optional helper:

```bash
ai-vault export /path/to/project --project-id my-project
```

The helper creates `projects/<project-id>/` from templates and registers the project in `registry.yaml`. An AI should refine the generated draft before relying on it.

## Claim vault assets into current project

Tell an AI agent:

> Use the vault protocol. Scan this project and claim relevant global rules, project memory, patterns and skills into this project.

Optional helper:

```bash
ai-vault claim /path/to/project
```

`claim` installs matched skills under `.claude/skills/`, records the claim in `.ai-memory/claimed-assets.json`, and merges claimed non-skill assets into a marked block in `.claude/MEMORY.md`.

Preview without writing:

```bash
ai-vault claim /path/to/project --dry-run
```

## Validate the vault

```bash
npm run validate
```

Validation checks required files, registry paths, CLI package wiring, skill metadata, the GitHub validation workflow, and obvious secret patterns.

## Restore on a new computer

```bash
git clone <repo> ~/.ai-memory-vault
cd ~/.ai-memory-vault
npm link
mkdir -p ~/.claude/skills/vault-maintainer
cp skills/vault-maintainer/SKILL.md ~/.claude/skills/vault-maintainer/SKILL.md
```
