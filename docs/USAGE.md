# Usage

## Export current project into vault

Tell an AI agent:

> Use the vault protocol. Summarize this project into `~/.ai-memory-vault`, update registry.yaml, validate, commit and push. Do not copy secrets.

Optional helper:

```bash
ai-vault export /path/to/project --project-id my-project
```

The helper creates `projects/<project-id>/` from templates and registers the project in `registry.yaml` with `visibility: private` by default. An AI should refine the generated draft before relying on it.

For non-destructive staging, prefer:

```bash
ai-vault summarize /path/to/project --text "short session summary"
```

This writes a proposal under `inbox/proposals/` and a paired session summary under `inbox/session-summaries/` without changing canonical project memory.

After review, promote the proposal into durable project memory:

```bash
ai-vault promote inbox/proposals/<proposal>.md --dry-run
ai-vault promote inbox/proposals/<proposal>.md
```

Promoted proposals are archived under `inbox/promoted/`.

## Claim vault assets into current project

Tell an AI agent:

> Use the vault protocol. Scan this project and claim relevant global rules, project memory, patterns and skills into this project.

Optional helper:

```bash
ai-vault claim /path/to/project
```

`claim` matches assets from `registry.yaml`, installs matched skills under `.claude/skills/`, records asset paths and hashes in `.ai-memory/claimed-assets.json`, writes `.ai-memory/sync-manifest.json`, and writes a compact marked reference block in `.claude/MEMORY.md`.

Preview without writing:

```bash
ai-vault claim /path/to/project --dry-run
```

Generate compact startup context for an agent:

```bash
ai-vault context /path/to/project
```

Check whether a project's local claimed assets are fresh:

```bash
ai-vault status /path/to/project
ai-vault status /path/to/project --json
```

Recover a project from the GitHub-backed vault on a new machine:

```bash
git pull --ff-only
ai-vault sync /path/to/project
```

Preview first:

```bash
ai-vault sync /path/to/project --dry-run
```

## Explore and search the asset graph

```bash
ai-vault list-assets
ai-vault asset vault-maintainer
ai-vault index
ai-vault search "debugging docker"
ai-vault impact vault-maintainer
ai-vault map
```

These commands are inspired by GitNexus-style progressive disclosure and impact analysis: list the graph, read one asset, build/query a lightweight local index, inspect references, and render a Mermaid map.

## Install agent adapters

```bash
ai-vault install-adapter claude-code /path/to/project
ai-vault install-adapter codex /path/to/project
ai-vault install-adapter openclaw /path/to/project
ai-vault install-adapter cursor /path/to/project
```

Each adapter writes a small local instruction file so the chosen agent knows where the vault is and which commands to use. Use `--dry-run` to preview writes.

## Validate the vault

```bash
npm test
npm run validate
```

Tests cover scan, registry-driven claim, memory marker preservation, sync manifest writing, export registry updates, context output, summarize proposal staging, promote, index/search, status freshness/staleness, adapter dry-runs, asset progressive disclosure, impact/map output, sync dry-run, and validation failure cases. Validation checks required files, registry paths, scopes/visibility, CLI package wiring, skill metadata, the GitHub validation workflow, and obvious secret patterns.

## Restore on a new computer

```bash
git clone <repo> ~/.ai-memory-vault
cd ~/.ai-memory-vault
npm link
mkdir -p ~/.claude/skills/vault-maintainer
cp skills/vault-maintainer/SKILL.md ~/.claude/skills/vault-maintainer/SKILL.md
```
