# Milestones

## v1.0 MVP (Shipped: 2026-04-06)

**Phases completed:** 3 phases, 10 plans, 27 tasks

**Key accomplishments:**

- Added `context: fork` to all 15 GSD orchestrator commands so skill prompts execute in isolated sub-agent contexts instead of polluting the parent conversation
- All 18 GSD agent definitions enhanced with typed capability frontmatter (maxTurns, effort, permissionMode) for agent spawning via Claude Code's AgentJsonSchema
- Reduced CLAUDE.md from ~2,338 to ~174 words (~92% reduction) by adding --minimal flag to generate-claude-md that replaces project/stack/conventions/architecture sections with on-demand placeholders
- MCP server with stdio transport exposing 6 read-only GSD resources via @modelcontextprotocol/sdk, auto-discovered by Claude Code through .mcp.json
- GSD plugin manifest with MCP metadata, packaged runtime path resolution via CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA, and repo-owned validation
- 60 self-contained skills, 21 agents, 33 templates, 19 references migrated to plugin layout with zero legacy path dependencies
- GSD hooks packaged in hooks/hooks.json and MCP server at mcp/server.cjs with legacy .mcp.json dependency removed
- Phase-completion memory writer using Claude Code memdir with lean project-type memories and auto-recall
- Plugin distribution contract, README with single-step install, legacy migration helper, and clean runtime audit

---

## v1.1 Session Continuity (Shipped: 2026-04-20)

**Phases completed:** 2 phases (Phase 4 + Phase 5), 5 plans + 4 structurally related quick tasks, over 9 days (2026-04-11 → 2026-04-20). Phase 6 dropped mid-milestone per the 2026-04-20 audit rescope; 7 requirements rehomed to v1.2 backlog.

**Key accomplishments:**

- End-to-end session continuity across `/compact` — PreCompact hook writes HANDOFF.json (19-field schema); SessionStart hook detects it and auto-invokes `/gsd:resume-work`. Live round-trip verified 2026-04-20. Zero user intervention required.
- Hook-independent fallback path via `## Session Continuity` section in CLAUDE.md — provides a second trigger channel for CLIs without hook support or when the hook is overridden. Same skill executes; same end state.
- Full handoff lifecycle — creation, detection, **and cleanup**. `/gsd:resume-work` step 6 invokes `checkpoint --clear` after successful resume, closing the stale-HANDOFF-triggers-phantom-resume failure mode.
- Disciplined mid-milestone rescope — AUDIT-v1.1.md found upstream-compat scope compromised by upstream drift; Option C trimmed aggressively and shipped. Decision trail preserved for clean v1.2 context.
- Hook resolver falls back to newest cached plugin version when baked `${CLAUDE_PLUGIN_ROOT}` is pruned — opportunistic fix for long-running sessions surviving plugin upgrades (quick task 260420-vfb).
- Plugin-wide `/gsd-<skill>` → `/gsd:<skill>` namespace normalization (273 replacements across 100 files) with durable maintenance script at `bin/maintenance/rewrite-command-namespace.cjs` for post-sync re-runs (quick task 260420-cns).

Full v1.1 details: [milestones/v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) · [requirements archive](./milestones/v1.1-REQUIREMENTS.md) · [audit](./AUDIT-v1.1.md)

---
