# Scripts

- `ai-vault.js` — helper CLI:
  - `scan`: inspect project identity and stack.
  - `claim`: match assets from `registry.yaml`, install matched skills, write a compact memory marker, and record asset hashes.
  - `export`: create a project memory draft and private registry entry.
  - `summarize`: stage a non-destructive proposal and session summary in `inbox/`.
  - `promote`: move reviewed proposal knowledge into durable project memory.
  - `context`: print compact startup context for an agent.
  - `status`: compare local claimed asset hashes with current vault assets.
  - `sync`: run pull + validate + claim + status for a target project.
  - `list-assets`: list registry assets with hashes and visibility.
  - `asset`: print one asset by id.
  - `index`: build `.ai-memory-index.json`.
  - `search`: query the lightweight local index.
  - `impact`: show registry/file references for an asset.
  - `map`: render a Mermaid asset graph.
  - `install-adapter`: write Claude Code, Codex, OpenClaw, or Cursor adapter hints.
  - `validate`: check vault structure, registry paths, scopes/visibility, CLI wiring, skill metadata, GitHub validation wiring, and obvious secrets.
- `bootstrap-claude-code.sh` — installs the global vault maintainer skill into Claude Code.

The CLI is intentionally minimal. The main workflow is AI-driven via `VAULT_PROTOCOL.md` and `skills/vault-maintainer/SKILL.md`.
