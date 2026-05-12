# Global Workflows

Store repeatable workflows that apply across many projects.

## Vault project export

1. Read `VAULT_PROTOCOL.md`.
2. Scan current project for agent files, docs, scripts, and dependency manifests.
3. Extract facts, decisions, mistakes, commands, and reusable skills.
4. Write structured files under `projects/<project-id>/`.
5. Update `registry.yaml`.
6. Run validation.
7. Commit and push.
