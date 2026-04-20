# Phase 4: Checkpoint and Resume - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

GSD work survives context resets — state is captured automatically before compaction and restored automatically on next session. This phase makes the existing manual pause/resume workflow automatic via Claude Code hooks.

</domain>

<decisions>
## Implementation Decisions

### HANDOFF.json Content
- **D-01:** Automatic PreCompact checkpoint produces the same HANDOFF.json format as /gsd-pause-work — one schema for both manual and automatic checkpoints
- **D-02:** Context notes sourced from STATE.md + recent git commits — no conversation access needed
- **D-03:** Uncommitted files list (git status) always included in HANDOFF.json

### PreCompact Hook Behavior
- **D-04:** 5s timeout, best effort — write what's possible within the window; if something times out, write partial data with a `partial: true` flag
- **D-05:** If HANDOFF.json already exists (from manual pause), overwrite with fresh data — the most recent snapshot is always most useful
- **D-06:** Write HANDOFF.json to disk only — no git commit. It's a transient artifact deleted after resume
- **D-07:** Register PreCompact as a new hook event in hooks/hooks.json alongside existing SessionStart

### SessionStart Auto-Resume
- **D-08:** SessionStart hook detects HANDOFF.json and returns a system message telling Claude to run /gsd-resume-work — zero user intervention
- **D-09:** After auto-resume, present project status box first, then automatically route to next action (present status, then continue)

### Code Architecture
- **D-10:** Extract HANDOFF.json generation into a shared function in gsd-tools.cjs — both PreCompact hook and /gsd-pause-work call the same function (single source of truth)
- **D-11:** /gsd-resume-work treats all HANDOFF.json files identically regardless of source (manual or auto). Optionally include a `source` field for logging but no behavioral difference
- **D-12:** Refactor /gsd-pause-work in this phase to use the shared function — both paths stay in sync from day one

### Claude's Discretion
- Implementation details of the shared function API (parameters, return type)
- Error handling strategy within the 5s timeout window
- Exact system message format injected by SessionStart hook

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Hook Infrastructure
- `hooks/hooks.json` — Current hook configuration (SessionStart, PreToolUse, PostToolUse). PreCompact must be added here.
- `bin/gsd-tools.cjs` §hook case (~line 960) — Hook dispatch handler. PreCompact handler goes here.

### Existing Pause/Resume
- `skills/gsd-pause-work/SKILL.md` — Manual pause workflow that creates HANDOFF.json and .continue-here.md. Shared function must be extracted from this logic.
- `skills/gsd-resume-work/SKILL.md` — Resume workflow that reads HANDOFF.json. SessionStart hook must trigger this.
- `references/continuation-format.md` — Standard format for presenting next steps after resume.

### Requirements
- `.planning/REQUIREMENTS.md` — CKPT-01 through CKPT-03 (checkpoint), RESM-01 through RESM-03 (resume)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **hooks/hooks.json**: Established pattern for hook registration — add PreCompact entry following same structure
- **gsd-tools.cjs hook handler**: Existing dispatch pattern at ~line 960 handles session-start; PreCompact follows same pattern
- **/gsd-pause-work skill**: Contains the full HANDOFF.json generation logic to extract into shared function
- **/gsd-resume-work skill**: Already reads HANDOFF.json and restores context — no changes needed to resume logic itself

### Established Patterns
- Hooks are shell commands dispatched via `node gsd-tools.cjs hook {event-type}` with configurable timeouts
- Hook output goes to stderr for user-visible messages, stdout for structured data
- STATE.md is the canonical project state file — all position/progress data lives here
- gsd-tools.cjs is the single binary entry point for all CLI operations

### Integration Points
- `hooks/hooks.json` — New PreCompact entry
- `bin/gsd-tools.cjs` hook case — New pre-compact handler + shared checkpoint function
- `skills/gsd-pause-work/SKILL.md` — Refactor to call shared function instead of inline logic
- `bin/gsd-tools.cjs` session-start handler — Add HANDOFF.json detection + system message injection

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-checkpoint-and-resume*
*Context gathered: 2026-04-11*
