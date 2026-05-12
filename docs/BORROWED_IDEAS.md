# Borrowed Ideas Roadmap

This document tracks useful patterns found in adjacent open-source AI memory, Claude Code, MCP, and skill projects. It is not a dependency list; it is a product roadmap for ideas worth adapting into AI Memory Vault.

## Sources reviewed

- `claude-memsync` write-up — background daemon, filesystem watcher, private Git transport, per-machine manifest, safe delete handling.
- `claude-memory` — local SQLite plus cloud backup, session summaries, non-destructive summarization, deleted-memory audit trail.
- `claude-memory-compiler` — hooks capture session ends / pre-compact events, daily logs compile into cross-referenced markdown knowledge articles.
- `claude-supermemory` / Supermemory plugins — scoped user/project memories, project config, codebase indexing command, context injection.
- `mem0-mcp` — explicit memory CRUD tools, filters, pagination, entity scopes.
- `mcp-memory-service` / Neo4j memory MCP patterns — graph relationships, tags, consolidation insights, service health/self-healing.
- Claude Skills ecosystem — progressive disclosure: keep only skill name/description in context, load full skill and support files on demand.
- Microsoft/large skill repos — skill catalog, categories, metadata, CI harness, contribution/security templates.

## What to borrow

### P0 — next implementation targets

1. **Manifest-based sync state**
   - Add `.ai-memory/state/manifest.json` for last claimed/exported asset hashes.
   - Use it to distinguish inbound new assets from local deletes.
   - Enables safe cross-machine update flows without guessing.

2. **Project/user/team scopes**
   - Extend `registry.yaml` assets with `scope: user | project | team | global`.
   - Add `visibility: public | private | secret-ref`.
   - Prevent private project memories from being exported to public repos by default.

3. **Session-summary inbox**
   - Add `inbox/session-summaries/YYYY-MM-DD.md` as an append-only staging area.
   - AI writes raw-ish summaries there first, then promotes durable knowledge into `projects/`, `patterns/`, or `skills/`.
   - Keeps `projects/*` clean while preserving reviewable evidence.

4. **Non-destructive summarize mode**
   - Add `ai-vault summarize <project> --dry-run`.
   - It should generate proposed changes under `inbox/proposals/` instead of mutating canonical files directly.
   - Promotion requires validation and commit.

### P1 — strong upgrades

5. **Progressive disclosure for claimed assets**
   - Keep `.claude/MEMORY.md` compact.
   - Store asset pointers and hashes in `.ai-memory/claimed-assets.json`.
   - Add `ai-vault read-asset <id>` so agents can load full content on demand.

6. **Memory CRUD commands**
   - Add deterministic CLI commands mirroring MCP memory tools:
     - `add-memory`
     - `list-memory`
     - `search-memory`
     - `update-memory`
     - `delete-memory`
   - Keep Git-backed markdown as source of truth.

7. **Relationship metadata**
   - Add optional `links:` blocks to assets:
     - `relates_to`
     - `supersedes`
     - `depends_on`
     - `applies_to`
   - Enables graph-like traversal without needing Neo4j/Qdrant for MVP.

8. **Context injection command**
   - Add `ai-vault context <project>` to print a compact startup context:
     - relevant assets
     - recent decisions
     - known mistakes
     - recommended skills
   - This is the equivalent of `/context` for agents that lack native memory.

### P2 — ecosystem polish

9. **Adapter installers**
   - `install-claude-code`
   - `install-codex`
   - `install-openclaw`
   - `install-cursor`
   - Each maps vault skills/memory into that agent's native folders.

10. **Health/audit dashboard later**
   - Start with `ai-vault status` JSON.
   - Later add a simple static report showing stale assets, duplicate memories, broken paths, and unclaimed project memories.

11. **Skill quality harness**
   - Add tests that validate every skill has frontmatter, short description, examples or usage notes, and no secret-looking strings.
   - Borrow the idea from larger skill catalogs: metadata + CI gates beat manual review.

## Design stance

AI Memory Vault should stay Git-native and markdown-first. Borrow ideas, not architecture bloat.

Avoid adding vector databases, cloud APIs, or daemon services until the Git-backed protocol is solid. The near-term differentiator is not semantic search; it is reliable AI-maintained asset lifecycle:

```text
capture → stage → validate → promote → claim → verify → sync
```

## Immediate next sprint

Recommended next commit sequence:

1. `feat: add asset scopes and privacy metadata`
2. `feat: add session-summary inbox and summarize proposal flow`
3. `feat: add context command for compact startup injection`
4. `feat: add sync manifest for safe cross-machine claims`
