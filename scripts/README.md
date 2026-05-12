# Scripts

- `ai-vault.js` — helper CLI:
  - `scan`: inspect project identity and stack.
  - `claim`: install matched skills and merge matched memory assets into a target project.
  - `export`: create a project memory draft and registry entry.
  - `validate`: check vault structure, registry paths, CLI wiring, skill metadata, GitHub validation wiring, and obvious secrets.
- `bootstrap-claude-code.sh` — installs the global vault maintainer skill into Claude Code.

The CLI is intentionally minimal. The main workflow is AI-driven via `VAULT_PROTOCOL.md` and `skills/vault-maintainer/SKILL.md`.
