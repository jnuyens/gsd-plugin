# Roadmap: GSD Performance Optimization

## Milestones

- [x] **v1.0 MVP** -- Phases 1-3 (shipped 2026-04-06)
- [ ] **v1.1 Session Continuity** -- Phases 4-5 (re-scoped 2026-04-20 per `.planning/AUDIT-v1.1.md`; Phase 6 dropped, deferred to v1.2)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-3) -- SHIPPED 2026-04-06</summary>

- [x] Phase 1: Skill and Agent Optimization (3/3 plans) -- completed 2026-04-01
- [x] Phase 2: MCP Server (2/2 plans) -- completed 2026-04-04
- [x] Phase 3: Plugin Packaging and Memory (5/5 plans) -- completed 2026-04-06

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### v1.1 Session Continuity

- [x] **Phase 4: Checkpoint and Resume** - PreCompact hook saves state, SessionStart hook detects and auto-resumes (completed 2026-04-11; live `/compact` UAT passed 2026-04-20)
- [ ] **Phase 5: Backup Trigger and Cleanup** - CLAUDE.md fallback path + HANDOFF.json cleanup after resume (re-scoped 2026-04-20)
- [~] **Phase 6: Upstream Compatibility and Documentation** - **Dropped from v1.1.** Upstream GSD 1.34→1.38.x evolved independently of the session-continuity primitives this phase assumed; compat scope needs a rethink before planning. Deferred to v1.2.

## Phase Details

### Phase 4: Checkpoint and Resume
**Goal**: GSD work survives context resets -- state is captured before compaction and restored automatically on next session
**Depends on**: Phase 3 (plugin packaging provides hooks infrastructure and gsd-tools binary)
**Requirements**: CKPT-01, CKPT-02, CKPT-03, RESM-01, RESM-02, RESM-03
**Success Criteria** (what must be TRUE):
  1. When Claude Code fires PreCompact, a HANDOFF.json file appears in .planning/ containing current phase, plan, task, and status
  2. HANDOFF.json includes a list of uncommitted files and the in-progress task context so the next session knows what was being worked on
  3. HANDOFF.json includes recent decisions and context notes so the resuming session can restore the mental model
  4. When a new session starts and HANDOFF.json exists, /gsd-resume-work fires automatically with zero user intervention
  5. After auto-resume, the session is positioned at the correct phase/plan/task and can continue work immediately
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md -- Shared checkpoint library and gsd-tools checkpoint command
- [x] 04-02-PLAN.md -- PreCompact hook registration and pause-work refactor
- [x] 04-03-PLAN.md -- SessionStart auto-resume enhancement

### Phase 5: Backup Trigger and Cleanup
**Goal**: Session continuity survives hook-pipeline failures (CLAUDE.md fallback) and cleans up after itself (HANDOFF.json deletion after resume). Deliberately trimmed from original scope — staleness detection and manual-save polish deferred to v1.2.
**Depends on**: Phase 4
**Requirements**: BKUP-01, BKUP-02, LIFE-01
**Success Criteria** (what must be TRUE):
  1. CLAUDE.md contains an instruction that causes Claude to check for HANDOFF.json at session start, independent of the SessionStart hook
  2. If SessionStart hook does not fire, the CLAUDE.md instruction alone is sufficient to trigger resume
  3. After successful resume, HANDOFF.json is deleted so subsequent sessions start fresh
**Plans**: TBD

**Deferred out of this phase (moved to v1.2 backlog):**
- LIFE-02 (staleness threshold detection)
- LIFE-03 (dedicated /gsd-checkpoint command — `/gsd-pause-work` + `gsd-tools.cjs checkpoint` already cover the manual path)

### Phase 6: Upstream Compatibility and Documentation *(DROPPED from v1.1)*
**Status**: Dropped 2026-04-20. Rationale in `.planning/AUDIT-v1.1.md` §Key findings #3. Upstream GSD moved independently between 1.34 and 1.38.x (added its own SDK-registered handlers, read-injection scanner, ingest-docs surface), so "compat" no longer has a stable target. Will be revisited in v1.2 after assessing upstream's current direction.

**Requirements rehomed:**
- DOCS-01 (README session-continuity paragraph) → **v1.2 backlog** (trivial; rides next README update)
- DOCS-02 (CHANGELOG.md) → **v1.2 backlog**
- UPST-01, UPST-03, UPST-04 → **v1.2 backlog** (need upstream-direction review first)
- UPST-02 (version distinction in artifacts) → already SATISFIED by 260418-r6d versioning scheme; close as done.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Skill and Agent Optimization | v1.0 | 3/3 | Complete | 2026-04-01 |
| 2. MCP Server | v1.0 | 2/2 | Complete | 2026-04-04 |
| 3. Plugin Packaging and Memory | v1.0 | 5/5 | Complete | 2026-04-06 |
| 4. Checkpoint and Resume | v1.1 | 3/3 | Complete (live UAT 1 passed 2026-04-20) | 2026-04-11 |
| 5. Backup Trigger and Cleanup | v1.1 | 0/? | Not started (trimmed scope) | - |
| 6. Upstream Compatibility and Documentation | v1.1 | — | Dropped (deferred to v1.2) | - |
