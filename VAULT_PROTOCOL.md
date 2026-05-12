# VAULT_PROTOCOL.md — AI Memory Vault Protocol

This repository is designed to be maintained primarily by AI agents.

Any agent working with this vault MUST follow this protocol before reading, writing, claiming, or exporting memory.

## 0. Core purpose

AI Memory Vault preserves reusable development assets across:

- computers
- accounts
- projects
- coding agents
- sessions

It exists to solve the problem that coding agents forget project context, skills, decisions, mistakes, and workflows when the user changes device/account/project/session.

## 1. Two allowed directions

### A. Project → Vault: summarize and store

Use this when the user says things like:

- "summarize this project into the vault"
- "sync this project's memory to GitHub"
- "move this project's Claude Code memory into the vault"
- "extract reusable skills from this project"

Process:

1. Identify the current project.
2. Read project docs and existing agent files:
   - `README*`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `docker-compose*.yml`
   - `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/**`, `.codex/**`
   - tests, scripts, deployment files, important config templates
3. Extract durable knowledge only:
   - project facts
   - architecture decisions
   - setup/run/test/deploy commands
   - known bugs and fixes
   - reusable workflows
   - reusable skills
4. Write structured files under `projects/<project-id>/`.
5. Update `registry.yaml`.
6. Run `node scripts/ai-vault.js validate`.
7. Commit with a conventional commit.

### B. Vault → Project: claim and install

Use this when the user says things like:

- "claim relevant skills from the vault"
- "restore my development memory on this project"
- "install suitable project memory"
- "bootstrap this repo with my AI rules"

Process:

1. Read this protocol and `registry.yaml`.
2. Scan the target project.
3. Match assets by identity and tags:
   - git remote URL
   - package/app/module name
   - framework files
   - dependencies
   - language/runtime
   - manual aliases
4. Install only relevant assets.
5. Prefer project-local installation for project-specific knowledge:
   - `.claude/skills/<skill>/SKILL.md`
   - `.claude/MEMORY.md`
   - `.ai-memory/claimed-assets.json`
6. Use global installation only for universal user preferences and coding rules.
7. Never overwrite user files blindly. Create backups or merge with markers.
8. Record a claim report in `.ai-memory/claimed-assets.json`.

## 2. Write quality rules

Do NOT store raw conversation transcripts.

Write only durable, reusable knowledge:

- **Facts**: what the project is, how it runs, key files
- **Decisions**: what was chosen and why
- **Mistakes**: errors, root causes, verified fixes
- **Commands**: exact commands that were verified or clearly documented
- **Workflows**: repeatable procedures
- **Skills**: reusable agent instructions

Mark uncertainty explicitly. Do not invent facts.

## 3. Security rules

Before writing to the vault or committing:

- Do not copy `.env`, secrets, private keys, cookies, tokens, API keys, passwords, SSH keys.
- Redact suspicious values as `[REDACTED]`.
- Prefer config examples with placeholder names.
- If a user explicitly asks to store credentials, refuse or ask for a safer secret-manager approach.

Forbidden secret categories include but are not limited to:

- OpenAI-style secret keys
- GitHub personal access tokens
- Slack bot/user tokens
- PEM/OpenSSH private key blocks
- real password assignments
- real API key assignments

## 4. Project file contract

Each project directory SHOULD contain:

```text
projects/<project-id>/
├── PROJECT.md      # identity, purpose, stack, status
├── memory.md       # durable long-term project memory
├── decisions.md    # product/architecture decisions
├── mistakes.md     # bugs, root causes, fixes
├── commands.md     # setup/run/test/deploy commands
├── files.md        # important files and directories
├── skills.yaml     # recommended skills and why
└── install.yaml    # how to claim into a local project
```

## 5. Skill file contract

Each skill directory SHOULD contain:

```text
skills/<skill-id>/
├── SKILL.md
├── meta.yaml
└── examples.md     # optional
```

`SKILL.md` must be short, imperative, tool-aware, and reusable.

## 6. Registry rules

`registry.yaml` is the map agents use to discover assets. Keep it concise and machine-readable.

Each asset should include:

- `id`
- `type`: `global`, `project`, `skill`, `pattern`
- `title`
- `tags`
- `path`
- `scope`: `global`, `project`, or `both`
- `match`: files/dependencies/remotes/aliases when relevant

## 7. Recommended user commands

Users can simply say:

- "Use the vault protocol and summarize this project into the vault."
- "Use the vault protocol and claim relevant assets into this project."
- "Use the vault protocol and restore my global Claude Code setup."
- "Create or update a skill from the reusable workflow we just verified."

The AI should execute the workflow directly instead of asking the user to run commands, unless credentials or irreversible external actions are required.
