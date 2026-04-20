# Phase 4: Checkpoint and Resume - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 04-checkpoint-and-resume
**Areas discussed:** HANDOFF.json content, PreCompact hook behavior, SessionStart auto-resume, Relationship to existing pause/resume

---

## HANDOFF.json Content

### Q1: Should the automatic PreCompact checkpoint produce the same format as /gsd-pause-work?

| Option | Description | Selected |
|--------|-------------|----------|
| Same format | Reuse /gsd-pause-work's HANDOFF.json schema exactly — one format for both manual and automatic checkpoints | ✓ |
| Subset (lightweight) | Capture only phase/plan/task position + uncommitted files. Faster but less context. | |
| Extended format | Same as pause-work plus token count estimate, conversation summary, or recent tool calls | |

**User's choice:** Same format (Recommended)
**Notes:** Single schema means /gsd-resume-work works identically for both sources.

### Q2: Where should PreCompact get context notes from?

| Option | Description | Selected |
|--------|-------------|----------|
| STATE.md + recent commits | Read STATE.md for project position, parse recent git log | ✓ |
| STATE.md only | Simpler but less context | |
| STATE.md + git + .planning/ scan | Also scan for .continue-here files, incomplete plans, and pending todos | |

**User's choice:** STATE.md + recent commits (Recommended)
**Notes:** Available without conversation access, sufficient for mental model restoration.

### Q3: Should the automatic checkpoint include uncommitted files (git status)?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always | Run git status and include uncommitted files | ✓ |
| Yes, but skip if slow | Try git status with 2s timeout, skip if too long | |
| No, skip git status | Keep hook fast, resuming session runs git status itself | |

**User's choice:** Yes, always (Recommended)
**Notes:** None.

---

## PreCompact Hook Behavior

### Q4: How should the hook handle the time constraint?

| Option | Description | Selected |
|--------|-------------|----------|
| 5s timeout, best effort | Write what you can within 5s. If timeout, write partial data with `partial: true` flag | ✓ |
| 10s timeout | Request more time in hooks.json, delays compaction | |
| Async fire-and-forget | Start process but don't block compaction. Risk: incomplete file | |

**User's choice:** 5s timeout, best effort (Recommended)
**Notes:** STATE.md read + git status + JSON write should fit within 5s.

### Q5: What if HANDOFF.json already exists when PreCompact fires?

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite with fresh data | Automatic checkpoint has newer state. Replace old HANDOFF.json | ✓ |
| Merge and update | Read existing, update changed fields, keep manual annotations | |
| Skip if exists | Respect manual checkpoint, don't overwrite | |

**User's choice:** Overwrite with fresh data (Recommended)
**Notes:** Most recent snapshot is always most useful.

### Q6: Should the PreCompact hook commit HANDOFF.json to git?

| Option | Description | Selected |
|--------|-------------|----------|
| Write to disk only | Transient artifact, deleted after resume. No git history pollution | ✓ |
| Commit as WIP | Commit with 'wip: checkpoint' message, survives branch switches | |
| You decide | Claude's discretion | |

**User's choice:** Write to disk only (Recommended)
**Notes:** None.

### Q7: How should PreCompact be registered in hooks?

| Option | Description | Selected |
|--------|-------------|----------|
| Add PreCompact to hooks.json | New PreCompact hook entry alongside existing SessionStart | ✓ |
| Extend session-start handler | One hook handles both events based on event type | |
| You decide | Claude's discretion | |

**User's choice:** Add PreCompact to hooks.json (Recommended)
**Notes:** Clean separation of concerns.

---

## SessionStart Auto-Resume

### Q8: How should auto-resume trigger?

| Option | Description | Selected |
|--------|-------------|----------|
| Hook injects system message | SessionStart hook detects HANDOFF.json, returns system message telling Claude to run /gsd-resume-work | ✓ |
| Hook runs resume directly | SessionStart hook executes resume logic in gsd-tools.cjs | |
| CLAUDE.md instruction only | Skip hook, add instruction to CLAUDE.md (Phase 5 adds this as backup anyway) | |

**User's choice:** Hook injects system message (Recommended)
**Notes:** Zero user intervention — Claude sees the instruction and acts.

### Q9: After auto-resume loads context, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Present status, then continue | Show project status box, then route to next action | ✓ |
| Silent continue | Skip status display, pick up where it left off | |
| Present status and ask | Show status and wait for user confirmation | |

**User's choice:** Present status, then continue (Recommended)
**Notes:** User sees where they are before work starts.

---

## Relationship to Existing Pause/Resume

### Q10: How should the PreCompact code relate to /gsd-pause-work?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared function in gsd-tools | Extract HANDOFF.json generation into shared function. Both paths call same function | ✓ |
| Separate lightweight implementation | PreCompact writes own simplified version. Less coupling but potential drift | |
| PreCompact calls /gsd-pause-work | Hook invokes pause-work logic. Maximum reuse but may be too heavy for 5s timeout | |

**User's choice:** Shared function in gsd-tools (Recommended)
**Notes:** Single source of truth for the format.

### Q11: Should /gsd-resume-work behave differently depending on who created HANDOFF.json?

| Option | Description | Selected |
|--------|-------------|----------|
| No difference | HANDOFF.json is HANDOFF.json regardless of source. Optionally include source field for logging | ✓ |
| Source-aware resume | Auto-created triggers faster resume, manual shows full status | |
| You decide | Claude's discretion | |

**User's choice:** No difference (Recommended)
**Notes:** None.

### Q12: Should /gsd-pause-work be refactored now to use the shared function?

| Option | Description | Selected |
|--------|-------------|----------|
| Refactor now | Extract shared function, update /gsd-pause-work. Both paths in sync from day one | ✓ |
| Defer refactor | Build shared function for PreCompact only, update pause-work later | |
| You decide | Claude's discretion | |

**User's choice:** Refactor now (Recommended)
**Notes:** Clean engineering — both paths stay in sync.

---

## Claude's Discretion

- Implementation details of the shared function API (parameters, return type)
- Error handling strategy within the 5s timeout window
- Exact system message format injected by SessionStart hook

## Deferred Ideas

None — discussion stayed within phase scope.
