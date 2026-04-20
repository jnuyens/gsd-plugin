# Phase 4: Checkpoint and Resume — Research

## RESEARCH COMPLETE

**Phase Goal:** GSD work survives context resets — state is captured before compaction and restored automatically on next session

---

## 1. Claude Code Hook System Architecture

### How Hooks Are Registered

Hooks are defined in `hooks/hooks.json` under event name keys. Current events registered:
- `SessionStart` — runs `node "${CLAUDE_PLUGIN_ROOT}/bin/gsd-tools.cjs" hook session-start` (timeout: 5000)
- `PreToolUse` — matcher `"Edit|Write"`, runs `hook pre-tool-use` (timeout: 3000)
- `PostToolUse` — matcher `"Bash"`, runs `hook post-tool-use` (timeout: 3000)

**Available but unregistered events relevant to Phase 4:**
- `PreCompact` — fires before context compaction (`entrypoints/sdk/coreSchemas.ts:569-577`)
- `PostCompact` — fires after compaction with `compact_summary`

### How Hook Input Works

All hooks receive JSON on stdin via `createBaseHookInput()` (`utils/hooks.ts:301-316`):
```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "permission_mode": "...",
  "hook_event_name": "PreCompact|SessionStart|..."
}
```

**PreCompact-specific fields** (`entrypoints/sdk/coreSchemas.ts:569-577`):
- `trigger`: `"manual"` | `"auto"` — whether user typed `/compact` or auto-compaction kicked in
- `custom_instructions`: string | null — any existing custom instructions for the compaction

**SessionStart-specific fields:**
- `source`: `"startup"` | `"resume"` | `"clear"` | `"compact"` — what triggered the session start

### How Hook Output Works

**Critical distinction between hook execution paths:**

1. **`executeHooksOutsideREPL`** (used by PreCompact) — `utils/hooks.ts:3003-3081`:
   - **stdout** → becomes `newCustomInstructions` (injected into compaction prompt)
   - **stderr** → becomes `userDisplayMessage` (shown to user)
   - **Decision**: PreCompact checkpoint hook should keep stdout empty (or minimal) and use stderr for status messages

2. **`executeHooks`** (used by SessionStart) — async generator pattern:
   - Returns `AggregatedHookResult` with `systemMessage` field
   - System message is injected into the conversation as context

### Hook Timeout Behavior

- Timeouts are in milliseconds (confirmed by `TOOL_HOOK_EXECUTION_TIMEOUT_MS` and existing `5000`/`3000` values in hooks.json)
- CONTEXT.md decision D-04 specifies 5s timeout → use `5000` to match existing convention
- When timeout fires, the hook process is killed — must write HANDOFF.json as early as possible

---

## 2. PreCompact Hook Implementation

### Registration in hooks.json

Add `PreCompact` event following the established pattern:
```json
"PreCompact": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/bin/gsd-tools.cjs\" hook pre-compact",
        "timeout": 5000
      }
    ]
  }
]
```

No `matcher` needed — we want to capture state on both manual and auto compaction. The `matchQuery` for PreCompact hooks is the `trigger` value ("manual" or "auto"), but without a matcher the hook runs for all triggers.

### Handler in gsd-tools.cjs

The hook dispatch is at `bin/gsd-tools.cjs:959-978`. Currently handles `session-start` only, with `pre-tool-use` and `post-tool-use` as no-ops.

Add `pre-compact` case that:
1. Reads STATE.md frontmatter for current phase/plan/task position
2. Runs `git status --porcelain` for uncommitted files
3. Reads recent git log (last 5 commits) for context
4. Reads STATE.md accumulated context (decisions, blockers)
5. Writes `.planning/HANDOFF.json`
6. Outputs status to stderr: `GSD: checkpoint saved to .planning/HANDOFF.json`
7. Keeps stdout empty (avoids injecting instructions into compaction)

### Timeout Strategy (D-04)

With 5s budget, prioritize data gathering:
1. **Sync reads first** (~50ms): STATE.md parse, check phase directory
2. **Git status** (~200ms): `git status --porcelain`
3. **Git log** (~200ms): `git log --oneline -5`
4. **Write HANDOFF.json** (~50ms): Write whatever we have
5. **If time remains**: Read current PLAN.md task details

If anything times out, write partial data with `"partial": true` flag (D-04).

---

## 3. HANDOFF.json Schema

### Existing Format (from /gsd-pause-work)

The schema is defined in `skills/gsd-pause-work/SKILL.md:89-121`:
```json
{
  "version": "1.0",
  "timestamp": "...",
  "phase": "...",
  "phase_name": "...",
  "phase_dir": "...",
  "plan": null,
  "task": null,
  "total_tasks": null,
  "status": "paused",
  "completed_tasks": [],
  "remaining_tasks": [],
  "blockers": [],
  "human_actions_pending": [],
  "decisions": [],
  "uncommitted_files": [],
  "next_action": "...",
  "context_notes": "..."
}
```

### Extensions for Auto-Checkpoint (D-01, D-11)

Add `source` field to distinguish origin without behavioral difference:
```json
{
  "source": "auto-compact" | "manual-pause",
  "partial": false
}
```

### Data Source Mapping

| HANDOFF.json field | Source | Method |
|---|---|---|
| phase, phase_name, phase_dir | STATE.md frontmatter | Parse YAML |
| plan, task, total_tasks | STATE.md "Current Position" | Text parse |
| status | Always "auto-checkpoint" | Hardcoded |
| completed_tasks | Git log + SUMMARY.md existence | Filesystem check |
| remaining_tasks | PLAN.md without SUMMARY.md | Filesystem check |
| uncommitted_files | `git status --porcelain` | Shell exec |
| decisions | STATE.md "Accumulated Context > Decisions" | Text parse |
| context_notes | STATE.md + recent git commit messages | Text parse |
| next_action | STATE.md "Current Position > Status" | Text parse |

---

## 4. SessionStart Auto-Resume Enhancement

### Current Behavior

`bin/gsd-tools.cjs:961-975` — SessionStart handler currently only runs auto-migration for legacy artifacts.

### Required Enhancement (D-08)

After migration check, add HANDOFF.json detection:
1. Check if `.planning/HANDOFF.json` exists
2. If found, output a system message to stdout telling Claude to run `/gsd-resume-work`
3. The system message format should be concise and directive

**Important**: SessionStart hooks use `executeHooks` (the generator version), where stdout becomes the system message. This is the correct channel for injecting resume instructions.

### System Message Format

The hook should return (on stdout):
```
GSD session continuity: Found checkpoint from previous session. Run /gsd-resume-work to restore context and continue.
```

This gets injected as a system message into the conversation, which Claude will see and act on automatically (D-08, D-09).

### SessionStart source filtering

The SessionStart hook fires on 4 sources: `startup`, `resume`, `clear`, `compact`. 

- **startup**: Check for HANDOFF.json → trigger resume
- **compact**: Check for HANDOFF.json → this means we just wrote it during PreCompact, so the session is continuing (post-compaction). Should still trigger resume since the compacted session lost context.
- **clear**: User cleared context. Could check HANDOFF.json but this was likely intentional.
- **resume**: Already resuming, skip.

Use the stdin JSON `source` field to decide behavior. The hook receives the full input JSON on stdin.

---

## 5. Shared Checkpoint Function (D-10, D-12)

### Current pause-work Logic

`skills/gsd-pause-work/SKILL.md` is a Claude skill (markdown instructions, not code). The actual HANDOFF.json generation is performed by Claude following the skill's instructions — there's no existing code function.

### Shared Function Design

Create a new function in `bin/gsd-tools.cjs` (or a separate lib module) that:
1. Accepts parameters: `cwd`, `options` (source type, partial flag)
2. Gathers all data (STATE.md, git status, git log, phase files)
3. Returns the HANDOFF.json object
4. Writes to `.planning/HANDOFF.json`

**New gsd-tools.cjs command**: `checkpoint`
```bash
node gsd-tools.cjs checkpoint [--source auto-compact|manual-pause]
```

This command:
- Generates HANDOFF.json using the shared function
- Called by PreCompact hook handler
- Can also be called by pause-work skill instead of inline JSON generation

### Refactoring pause-work (D-12)

The pause-work skill currently has Claude generate HANDOFF.json inline. Refactor to:
1. Skill gathers human-context info (decisions, blockers from conversation)
2. Calls `node gsd-tools.cjs checkpoint --source manual-pause --context-notes "..."` 
3. The command generates the base HANDOFF.json, skill can merge additional context

**Important**: The skill also writes `.continue-here.md` (human-readable). This is separate from HANDOFF.json and should remain skill-generated.

---

## 6. /gsd-resume-work Integration (D-11)

### Current Resume Behavior

`skills/gsd-resume-work/SKILL.md:109-136`:
- Checks for HANDOFF.json (primary) and .continue-here.md (fallback)
- Parses structured data from HANDOFF.json
- Validates uncommitted files against git status
- Deletes HANDOFF.json after successful resume
- Presents PROJECT STATUS box
- Routes to next action

### No Changes Needed for Resume Logic

Per D-11, resume treats all HANDOFF.json files identically regardless of `source`. The existing resume-work skill already handles:
- Reading and parsing HANDOFF.json
- Validating state
- Deleting after resume
- Routing to next action

The `source` field is informational only — resume-work can display it but behavior doesn't change.

---

## 7. File Modification Summary

| File | Change | Complexity |
|---|---|---|
| `hooks/hooks.json` | Add PreCompact entry | Low |
| `bin/gsd-tools.cjs` (hook case) | Add pre-compact handler, enhance session-start | Medium |
| `bin/gsd-tools.cjs` (new command) | Add `checkpoint` command with shared function | Medium |
| `skills/gsd-pause-work/SKILL.md` | Refactor to use `checkpoint` command | Low |

---

## 8. Risk Assessment

### Risk: 5s Timeout Too Tight
- **Mitigation**: Prioritize writes. Gather sync data first, write partial HANDOFF.json, then enrich.
- **Measurement**: Time the full checkpoint in dev. Git operations are typically <500ms.

### Risk: HANDOFF.json Written but Session Doesn't Actually Reset
- **Impact**: Stale HANDOFF.json triggers unnecessary resume on next session
- **Mitigation**: Resume-work already validates state. Could add timestamp staleness check (Phase 5 LIFE-02).

### Risk: Hook stdout Injection into Compaction
- **Impact**: PreCompact stdout becomes compaction instructions
- **Mitigation**: Keep PreCompact hook stdout empty. Use stderr only for user messages.

### Risk: Race Between PreCompact Write and Process Kill
- **Mitigation**: Use `fs.writeFileSync` for atomic write. JSON.stringify + writeFileSync is ~1ms.

---

## 9. Dependency Analysis

### Phase 3 Dependencies (satisfied)
- `hooks/hooks.json` — exists, established pattern ✓
- `bin/gsd-tools.cjs` hook handler — exists at line 959 ✓
- Plugin packaging with `CLAUDE_PLUGIN_ROOT` — established ✓

### External Dependencies
- None — all functionality uses Node.js built-ins and git CLI

### Phase 5 Forward Dependencies
- LIFE-01 (HANDOFF.json deletion after resume) — already handled by resume-work
- LIFE-02 (stale checkpoint detection) — needs timestamp in HANDOFF.json (included in schema)
- BKUP-01/02 (CLAUDE.md fallback) — independent of hook implementation

---

*Research completed: 2026-04-11*
*Phase: 04-checkpoint-and-resume*
