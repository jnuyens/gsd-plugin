# Roadmap: GSD Performance Optimization

## Overview

Transform GSD from a prompt-injection-heavy orchestration layer into a lean, extension-point-native integration with Claude Code. Phase 1 delivers immediate token savings through skill frontmatter and agent definitions. Phase 2 replaces remaining prompt-injected orchestration with structured MCP tools. Phase 3 packages everything as a single-install plugin with cross-session memory.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Skill and Agent Optimization** - Refactor GSD skills with fork-mode frontmatter and extract agent types into dedicated definition files
- [ ] **Phase 2: MCP Server** - Build GSD MCP server exposing project state and operations as structured tools replacing prompt injection
- [ ] **Phase 3: Plugin Packaging and Memory** - Bundle skills, agents, and MCP server into a single-install plugin with cross-session memory via memdir

## Phase Details

### Phase 1: Skill and Agent Optimization
**Goal**: GSD commands execute with isolated context and typed agent capabilities, eliminating prompt-embedded role descriptions and reducing CLAUDE.md injection from ~3,000-5,000 tokens to ~100 tokens
**Depends on**: Nothing (first phase)
**Requirements**: SKILL-01, SKILL-02, AGENT-01, AGENT-02
**Success Criteria** (what must be TRUE):
  1. GSD skill files include `context: 'fork'` frontmatter and orchestration prompts no longer leak into the parent conversation context
  2. CLAUDE.md contains only a minimal availability notice (~100 tokens) instead of full orchestration instructions, and GSD commands still function correctly
  3. Agent type files exist in `.claude/agents/` for each GSD role (planner, researcher, executor, checker) with per-agent tool lists and model overrides
  4. Spawning a GSD agent uses the `.claude/agents/*.md` definition rather than inline prompt role descriptions
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Add context: fork to 15 orchestrator GSD commands
- [x] 01-02-PLAN.md -- Audit and enhance all 18 agent definition frontmatter
- [x] 01-03-PLAN.md -- Reduce CLAUDE.md to minimal + update generate-claude-md tool

### Phase 2: MCP Server
**Goal**: GSD project state and workflow operations are accessible via structured MCP tools, replacing BashTool-to-gsd-tools roundtrips and prompt-injected orchestration context
**Depends on**: Phase 1
**Requirements**: MCP-01, MCP-02, MCP-03
**Success Criteria** (what must be TRUE):
  1. An MCP server exposes project state (current phase, requirements, roadmap, config) as queryable MCP resources
  2. GSD workflow operations (init, plan, execute, read-state, transition, verify) are callable as structured MCP tools with typed Zod schemas
  3. The MCP server auto-starts when a `.planning/` directory is detected in the project, without manual configuration
  4. GSD commands work through hybrid invocation: slash command triggers MCP tool call instead of BashTool-to-CLI roundtrip
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md -- MCP server foundation with stdio transport and read-only resources
- [ ] 02-02-PLAN.md -- MCP workflow tools and new-project integration

### Phase 3: Plugin Packaging and Memory
**Goal**: GSD installs in a single step via plugin manifest and persists decisions and context across sessions through Claude Code's memory system
**Depends on**: Phase 2
**Requirements**: MEM-01, MEM-02, PLUG-01, PLUG-02
**Success Criteria** (what must be TRUE):
  1. A `plugin.json` manifest bundles GSD skills, agent definitions, MCP server config, and lifecycle hooks into one distributable package
  2. Running a single install command sets up all GSD components (replaces manual `~/.claude/get-shit-done/` directory setup)
  3. Phase outcomes and key decisions are automatically written to Claude Code's `memdir/` after phase transitions
  4. Starting a new session in a GSD project auto-recalls project context (phase, recent decisions, blockers) without the user running any setup commands
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Skill and Agent Optimization | 3/3 | Complete | 2026-04-01 |
| 2. MCP Server | 0/2 | Planning complete | - |
| 3. Plugin Packaging and Memory | 0/0 | Not started | - |
