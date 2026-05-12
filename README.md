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
- `scripts/ai-vault.js` — lightweight helper CLI for scanning, claiming, exporting, and validating.

## Safety model

The vault stores durable, reusable development knowledge only:

- facts, decisions, mistakes, workflows, commands, skills
- never raw chat dumps
- never API keys, passwords, tokens, `.env` values, private keys, cookies

Run validation before committing:

```bash
npm run validate
```
