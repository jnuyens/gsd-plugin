# Requirements: GSD Performance Optimization

**Defined:** 2026-03-31
**Core Value:** Reduce GSD's per-turn token overhead and agent spawn latency without breaking multi-CLI compatibility

## v1 Requirements

### Skill Optimization

- [x] **SKILL-01**: GSD skill files use `context: 'fork'` to isolate orchestration prompts in sub-agent context
- [x] **SKILL-02**: CLAUDE.md injection reduced from ~3,000-5,000 tokens to ~100 token availability notice with on-demand loading

### Agent Definitions

- [x] **AGENT-01**: GSD agent types (planner, researcher, executor, checker, etc.) defined as `.claude/agents/*.md` files with typed capabilities
- [x] **AGENT-02**: Agent definitions specify per-agent tools, model overrides, and permissions replacing prompt-embedded role descriptions

### MCP Server

- [x] **MCP-01**: GSD MCP server exposes project state (phase, requirements, roadmap, config) as MCP resources
- [ ] **MCP-02**: GSD operations available as structured MCP tools replacing prompt-injected orchestration context
- [x] **MCP-03**: MCP server auto-starts when GSD project detected (`.planning/` directory exists)

### Memory Integration

- [ ] **MEM-01**: GSD phase outcomes and key decisions written to Claude Code's `memdir/` auto-memory system
- [ ] **MEM-02**: Project context auto-recalled across sessions without manual CLAUDE.md loading

### Plugin Packaging

- [ ] **PLUG-01**: GSD packaged as a Claude Code plugin bundling skills, agents, MCP server, and hooks
- [ ] **PLUG-02**: Single-step installation via plugin manifest (replaces manual `~/.claude/get-shit-done/` setup)

## v2 Requirements

### Tool Restriction

- **TOOL-01**: Verification agents restricted to read-only tools via `allowed-tools` frontmatter
- **TOOL-02**: Phase-specific tool access profiles (implementation vs verification vs research)

### Advanced Integration

- **ADV-01**: WorkflowTool registration when WORKFLOW_SCRIPTS becomes public API
- **ADV-02**: Coordinator mode integration when COORDINATOR_MODE becomes public API
- **ADV-03**: Progress UI via Ink components for real-time workflow dashboards

## Out of Scope

| Feature | Reason |
|---------|--------|
| Forking Claude Code | 8-16+ hrs/month maintenance, security risk, solo dev |
| Modifying Claude Code source | Couples to unstable internals, breaks on updates |
| Custom compaction logic | Requires internal API access, compaction pipeline is opaque |
| Multi-CLI integration changes | This milestone is Claude Code-specific optimization; multi-CLI stays as-is |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SKILL-01 | Phase 1 | Complete |
| SKILL-02 | Phase 1 | Complete |
| AGENT-01 | Phase 1 | Complete |
| AGENT-02 | Phase 1 | Complete |
| MCP-01 | Phase 2 | Complete |
| MCP-02 | Phase 2 | Pending |
| MCP-03 | Phase 2 | Complete |
| MEM-01 | Phase 3 | Pending |
| MEM-02 | Phase 3 | Pending |
| PLUG-01 | Phase 3 | Pending |
| PLUG-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
