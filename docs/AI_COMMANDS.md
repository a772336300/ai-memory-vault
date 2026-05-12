# AI Command Prompts

These are natural-language commands for Claude Code, OpenClaw, Codex, or other agents.

## Export a project into the vault

```text
Use the AI Memory Vault protocol at ~/.ai-memory-vault/VAULT_PROTOCOL.md.
Scan the current project and summarize durable knowledge into the vault:
- project facts
- architecture decisions
- known mistakes and fixes
- verified commands
- reusable workflows
- candidate skills
Do not copy secrets or raw chat logs.
Update registry.yaml, run validation, then commit and push.
```

## Claim assets into a project

```text
Use the AI Memory Vault protocol at ~/.ai-memory-vault/VAULT_PROTOCOL.md.
Scan the current project, match it against the vault registry, and claim relevant global rules, project memory, patterns, and skills into this project.
Prefer project-local .claude/ and .ai-memory/ files.
Do not overwrite user files blindly.
Run validation or a direct inspection after installing.
```

## Restore global setup on a new computer

```text
Use the AI Memory Vault protocol at ~/.ai-memory-vault/VAULT_PROTOCOL.md.
Restore my global Claude Code development setup from this vault:
- vault-maintainer skill
- global instructions
- coding style
- user preferences
Do not install project-specific memory globally.
```

## Create a new reusable skill

```text
We just verified a repeatable workflow. Use the vault protocol and create/update a concise skill under ~/.ai-memory-vault/skills/<skill-id>/.
Include SKILL.md and meta.yaml, update registry.yaml, validate, commit and push.
```
