# Scripts

- `ai-vault.js` — helper CLI:
  - `scan`: inspect project identity and stack.
  - `claim`: match assets from `registry.yaml`, install matched skills, write a compact memory marker, and record asset hashes.
  - `export`: create a project memory draft and private registry entry.
  - `summarize`: stage a non-destructive proposal and session summary in `inbox/`.
  - `context`: print compact startup context for an agent.
  - `validate`: check vault structure, registry paths, scopes/visibility, CLI wiring, skill metadata, GitHub validation wiring, and obvious secrets.
- `bootstrap-claude-code.sh` — installs the global vault maintainer skill into Claude Code.

The CLI is intentionally minimal. The main workflow is AI-driven via `VAULT_PROTOCOL.md` and `skills/vault-maintainer/SKILL.md`.
