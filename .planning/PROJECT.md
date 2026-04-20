# GSD Performance Optimization via Claude Code Extension Points

## What This Is

A performance-optimized plugin packaging of GSD (Get Shit Done) for Claude Code. Reduces per-turn token overhead by ~92%, exposes project state via MCP tools, and bundles everything into a single-install plugin with cross-session memory.

## Core Value

Reduce GSD's per-turn token overhead and agent spawn latency without breaking multi-CLI compatibility or creating fork maintenance burden.

## Requirements

### Validated

- ✓ Research confirms fork is unsustainable (~8-16+ hrs/month) — existing
- ✓ Research confirms most GSD features work fine externally — existing
- ✓ Six integration seams identified in Claude Code — existing
- ✓ `context: 'fork'` added to 15 GSD orchestrator skills — v1.0
- ✓ `.claude/agents/*.md` definitions enhanced for all 18 GSD agent types with typed capabilities — v1.0
- ✓ CLAUDE.md reduced from ~2,338 to ~174 words (~92% reduction) — v1.0
- ✓ GSD MCP server exposes project state as 6 queryable MCP resources — v1.0
- ✓ 10 MCP tools registered for workflow mutations — v1.0
- ✓ MCP server auto-starts via plugin manifest for existing and new projects — v1.0
- ✓ Phase outcomes and key decisions written to Claude Code memdir — v1.0
- ✓ Project context auto-recalled across sessions via memdir pipeline — v1.0
- ✓ GSD packaged as Claude Code plugin (60 skills, 21 agents, MCP, hooks) — v1.0
- ✓ Single-step install via `claude plugin install gsd` — v1.0
- ✓ PreCompact hook saves HANDOFF.json checkpoint via shared `generateCheckpoint`/`writeCheckpoint` library — v1.1 Phase 4
- ✓ SessionStart hook detects HANDOFF.json and injects auto-resume system message (startup/compact only, skips clear/resume) — v1.1 Phase 4

### Active

- [ ] CLAUDE.md auto-resume instruction as backup trigger
- [ ] Clean checkpoint lifecycle (create → resume → cleanup)
- [ ] Add `allowed-tools` to verification skills for read-only enforcement
- [ ] Tool restriction profiles (implementation vs verification vs research)
- [ ] Empirical token measurement before/after (analytical estimates validated during v1.0)

### Out of Scope

- Forking Claude Code — research proved unsustainable for solo maintainer
- Modifying Claude Code source — use public extension points only
- Progress UI integration — requires internal API access, low value vs effort
- Coordinator mode integration — feature-gated, wait for public API
- WorkflowTool registration — feature-gated, wait for public API
- Offline mode — real-time context is core value

## Current Milestone: v1.1 Session Continuity

**Goal:** Seamless GSD session continuity across context resets using Claude Code's native hook events.

**Target features:**
- PreCompact hook saves HANDOFF.json checkpoint when tokens run low
- SessionStart hook detects HANDOFF.json and triggers auto-resume
- CLAUDE.md instruction as backup for auto-resume
- Clean checkpoint lifecycle (create → resume → cleanup)

## Context

Shipped v1.0 with 3 phases, 10 plans, 27 tasks over 7 days.
Tech stack: Node.js CJS (bin/lib), MCP server (stdio JSON-RPC), Claude Code plugin system.
~14k LOC in bin/*.cjs, ~573 LOC MCP server, 60 self-contained skill files (~21k LOC).
Published as [jnuyens/gsd-plugin](https://github.com/jnuyens/gsd-plugin) on GitHub.
Based on [GSD 1.38.1](https://github.com/gsd-build/get-shit-done) by TACHES (Lex Christopherson).

## Constraints

- **No fork**: Use only public extension points
- **Solo maintainer**: Must be maintainable by one person
- **Multi-CLI compat**: GSD also works with other AI CLIs — improvements should be additive, not breaking
- **Update resilience**: Must survive Claude Code monthly updates
- **Measurable**: Token savings must be quantified before and after

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No fork | 8-16+ hrs/month maintenance, security risk, solo dev | ✓ Good |
| Extension points only | HIGH stability, no upstream coupling | ✓ Good |
| MCP server over prompt injection | Structured tools > token-heavy context | ✓ Good — 6 resources + 10 tools via @modelcontextprotocol/sdk |
| CLAUDE_PLUGIN_ROOT env var | Plugin path resolution with dev-mode fallback | ✓ Good — clean separation of installed vs development paths |
| Self-contained skills | Embedded workflow content, no execution_context indirection | ✓ Good — zero external file reads at skill load time |
| Lightweight MCP transport | Custom stdio JSON-RPC instead of full SDK in plugin | ✓ Good — reduces dependency footprint |
| memdir project-type memories | Lean phase memories with Why:/How to apply: structure | ✓ Good — auto-recalled by Claude Code's existing pipeline |
| Plugin hooks via hooks/hooks.json | Auto-loaded by plugin loader, not manifest.hooks | ✓ Good — avoids duplicate registration |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
5. Update `plugins/gsd/` in [davepoon/buildwithclaude](https://github.com/davepoon/buildwithclaude) — bump version, sync agents and skills, update README

**After each upstream GSD sync** (via `/gsd:quick`):
1. Sync `bin/lib/*.cjs` (preserve local patches in core.cjs), `bin/gsd-tools.cjs` (preserve local patches), `references/`, `templates/`, `contexts/`
2. Bump version in: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
3. **Update README.md**: bump "Based on" version line, update skill/agent counts, add/update feature descriptions for new upstream capabilities
4. Update this file's Context section (`Based on [GSD x.y.z]`)
5. Smoke-test: `node -e "require('./bin/lib/core.cjs')"` + verify local patches (resolveGsdRoot, resolveGsdDataDir, resolveGsdAsset)

---
*Last updated: 2026-04-20 after upstream sync to GSD 1.38.1*
