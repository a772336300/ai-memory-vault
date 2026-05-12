# Usage

## Export current project into vault

Tell an AI agent:

> Use the vault protocol. Summarize this project into `~/.ai-memory-vault`, update registry.yaml, validate, commit and push. Do not copy secrets.

Optional helper:

```bash
ai-vault export /path/to/project --project-id my-project
```

The helper creates a draft. An AI should refine it.

## Claim vault assets into current project

Tell an AI agent:

> Use the vault protocol. Scan this project and claim relevant global rules, project memory, patterns and skills into this project.

Optional helper:

```bash
ai-vault claim /path/to/project
```

## Restore on a new computer

```bash
git clone <repo> ~/.ai-memory-vault
cd ~/.ai-memory-vault
npm link
mkdir -p ~/.claude/skills/vault-maintainer
cp skills/vault-maintainer/SKILL.md ~/.claude/skills/vault-maintainer/SKILL.md
```
