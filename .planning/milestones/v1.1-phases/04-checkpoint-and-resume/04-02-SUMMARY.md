---
phase: 04-checkpoint-and-resume
plan: 02
subsystem: infra
tags: [checkpoint, handoff, hooks, precompact, gsd-pause-work, cjs]

requires:
  - phase: 04-checkpoint-and-resume
    provides: shared checkpoint library (bin/lib/checkpoint.cjs) from plan 04-01
provides:
  - PreCompact hook registration in hooks/hooks.json (5s timeout, no matcher)
  - pre-compact hook handler in bin/gsd-tools.cjs that calls writeCheckpoint
  - /gsd-pause-work skill refactored to use `gsd-tools.cjs checkpoint --source manual-pause` as base, then enrich with conversation-only data
  - Single source of truth for HANDOFF.json generation shared by manual and automatic paths
affects: [04-03-PLAN, gsd-resume-work, SessionStart auto-resume]

tech-stack:
  added: []
  patterns:
    - "PreCompact hook handler keeps stdout empty (stdout becomes newCustomInstructions via executeHooksOutsideREPL) and writes status to stderr only"
    - "Hook handlers wrap all work in try/catch so hook failures never block Claude Code's compaction pipeline (D-04)"
    - "Manual pause path generates base HANDOFF.json via shared checkpoint command, then enriches with conversation context (D-12) -- no parallel schema implementations"
    - "hookType dispatch reads args[1] (the hook subtype), not args[0] which is the command name"

key-files:
  created: []
  modified:
    - hooks/hooks.json
    - bin/gsd-tools.cjs
    - skills/gsd-pause-work/SKILL.md

key-decisions:
  - "D-04: PreCompact handler is best-effort within 5s -- try/catch protects the hook pipeline and source is always 'auto-compact' regardless of trigger type"
  - "D-05: writeCheckpoint always overwrites HANDOFF.json -- latest snapshot wins"
  - "D-07: Register PreCompact in hooks.json alongside existing events (no matcher -- fires for both manual /compact and auto compaction)"
  - "D-10/D-12: /gsd-pause-work now calls the same shared checkpoint function the PreCompact hook uses; enrichment layered on top, not inline JSON"
  - "Rule 1 bug: hookType must read args[1] not args[0] -- fixed the dormant session-start dispatch as a side effect of making pre-compact actually execute"

patterns-established:
  - "Lazy require inside hook branch: require('./lib/checkpoint.cjs') only when pre-compact fires, keeping cold-start hooks fast"
  - "Best-effort stdin read: try fs.readFileSync(0) inside its own try/catch so a missing stdin never fails the handler"
  - "stderr-only status messaging for PreCompact hooks (stdout is reserved for compaction instructions)"
  - "Two-stage HANDOFF.json flow in gsd-pause-work: base via shared command, conversation enrichment via Read/Write"

requirements-completed:
  - CKPT-01
  - CKPT-02

duration: ~20min
completed: 2026-04-11
---

# Phase 4 Plan 02: PreCompact Hook + Pause-Work Refactor Summary

**PreCompact hook registered with a 5s budget that invokes the shared checkpoint library on context compaction, and /gsd-pause-work rewritten to route through the same shared command so manual and automatic checkpoints produce one identical HANDOFF.json schema.**

## Performance

- **Tasks:** 2
- **Commits:** 2 (plus this metadata commit)
- **Files created:** 0
- **Files modified:** 3 (hooks/hooks.json, bin/gsd-tools.cjs, skills/gsd-pause-work/SKILL.md)
- **Started:** 2026-04-11T10:44Z (approx)
- **Completed:** 2026-04-11

## Accomplishments

- **PreCompact hook registered.** New entry in `hooks/hooks.json` under the `PreCompact` key with a 5000 ms timeout and the command `node "${CLAUDE_PLUGIN_ROOT}/bin/gsd-tools.cjs" hook pre-compact`. No matcher: the hook fires on both manual `/compact` and automatic context compaction triggers per D-07.
- **pre-compact handler wired into gsd-tools.cjs.** Added a `else if (hookType === 'pre-compact')` branch inside the existing `case 'hook'` block. The handler lazy-loads `./lib/checkpoint.cjs`, attempts to read stdin (best-effort, not required), and calls `checkpoint.writeCheckpoint(cwd, { source: 'auto-compact', partial: false })`. On success it writes `GSD: checkpoint saved to .planning/HANDOFF.json` to stderr; on any error it writes a failure message to stderr. stdout is never written to, satisfying the executeHooksOutsideREPL constraint that PreCompact stdout becomes injected compaction instructions.
- **/gsd-pause-work routed through shared checkpoint command.** The `write_structured` step in `skills/gsd-pause-work/SKILL.md` no longer inlines a HANDOFF.json template. Instead it runs `node "$GSD_TOOLS" checkpoint --source manual-pause` to generate the base file, then enriches it with conversation-only fields (`completed_tasks`, `remaining_tasks`, `blockers`, `human_actions_pending`, `decisions`, `context_notes`, `next_action`). Fields the shared function owns (version, timestamp, source, partial, phase*, plan, task, total_tasks, status, uncommitted_files) are explicitly marked not-to-be-edited. The other steps (detect, gather, write, commit, confirm) and the human-readable `.continue-here.md` output are unchanged.
- **Manual and automatic paths verified to produce identical schemas.** Both paths call the same `generateCheckpoint` function from `bin/lib/checkpoint.cjs` (Plan 04-01 output), so D-01 (single HANDOFF.json format) and D-10 (single shared function) are now enforced by implementation, not convention.

## Task Commits

1. **Task 1: Register PreCompact hook and add handler in gsd-tools.cjs** -- `4530b6d` (feat)
2. **Task 2: Refactor /gsd-pause-work to use shared checkpoint command** -- `d8c636f` (refactor)

## Files Created/Modified

- `hooks/hooks.json` -- Added `PreCompact` event entry with 5000 ms timeout invoking `hook pre-compact`
- `bin/gsd-tools.cjs` -- Added `pre-compact` branch in the hook case; fixed hookType index from `args[0]` to `args[1]` (Rule 1 bug fix)
- `skills/gsd-pause-work/SKILL.md` -- Rewrote the `write_structured` step to call the shared checkpoint command and document the enrichment layer

## Decisions Made

None new. This plan implements decisions D-01, D-04, D-05, D-07, D-10, D-11, D-12 that were locked in `04-CONTEXT.md` during the discuss-phase step. The implementation honors each one:

- **D-01:** Both paths emit the same 19-field schema (enforced because they call the same library function).
- **D-04:** 5000 ms timeout in hooks.json; handler wrapped in try/catch; writeCheckpoint already never throws.
- **D-05:** writeCheckpoint overwrites HANDOFF.json unconditionally.
- **D-07:** PreCompact entry added alongside SessionStart/PreToolUse/PostToolUse.
- **D-10/D-12:** /gsd-pause-work uses the shared command as its base step.
- **D-11:** source field distinguishes origin ("auto-compact" vs "manual-pause") for logging only; resume logic treats both identically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix dormant hookType dispatch index (`args[0]` -> `args[1]`)**
- **Found during:** Task 1 end-to-end verification. Running `echo '{...}' | node bin/gsd-tools.cjs hook pre-compact` produced no output and no HANDOFF.json despite the branch being syntactically correct.
- **Issue:** The existing `case 'hook'` block read `const hookType = args[0]`. But `args[0]` is the command name itself (`'hook'`), not the hook subtype -- the subtype is at `args[1]`. The original session-start handler (commit fa5681c) shipped with this bug, and it went unnoticed because the legacy auto-migration is a silent no-op when nothing needs migrating. With the bug in place, my new `else if (hookType === 'pre-compact')` branch could never match: hookType was always `'hook'`.
- **Fix:** Changed `const hookType = args[0]` to `const hookType = args[1]` with an inline comment explaining the historical context. This both fixes the dead session-start migration path and enables pre-compact dispatch.
- **Files modified:** `bin/gsd-tools.cjs`
- **Verification:** Re-ran the simulated hook invocation (`printf '{"trigger":"manual"}' | node bin/gsd-tools.cjs hook pre-compact`). stdout stayed empty (0 bytes), stderr printed the success message, and `.planning/HANDOFF.json` was written with `source: "auto-compact"`, `status: "auto-checkpoint"`, version "1.0", and all 19 keys.
- **Committed in:** `4530b6d` (part of the Task 1 commit)

**2. [Rule 2 - Missing Critical] Defensive stdin read wrapping**
- **Found during:** Task 1 implementation.
- **Issue:** The plan's action text read stdin unconditionally with `fs.readFileSync(0, 'utf-8')`. Claude Code provides stdin when it fires the hook, but during test harness invocation (or if stdin is not a readable file), this call can throw synchronously and would need the outer try/catch to catch it.
- **Fix:** Wrapped the `fs.readFileSync(0)` call in its own inner try/catch so the handler never depends on stdin being present. The stdin contents are not used for control flow in this plan (source is always `'auto-compact'` per the plan), so silent failure is safe.
- **Files modified:** `bin/gsd-tools.cjs`
- **Verification:** Simulated invocation with and without stdin both produce the same result.
- **Committed in:** `4530b6d` (part of the Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 defensive hardening)
**Impact on plan:** Both were necessary for the pre-compact handler to actually execute under the required hook invocation pattern. Rule 1 in particular unblocked all Task 1 verification; without it, the automated checks still passed (grep-only) but the runtime path was dead. No scope creep -- both fixes are confined to the hook dispatch block.

## Issues Encountered

- **Silent handler (pre-Rule 1 fix):** Initial Task 1 verification reported `exit=0`, empty stdout, empty stderr, and no HANDOFF.json. Grep-level acceptance criteria passed (the code was in the file) but the branch never ran. Traced it to the `hookType = args[0]` index bug by logging `process.argv.slice(2)` and cross-referencing the `case 'state'` subcommand pattern (`args[1]`), which confirmed the hook case was using the wrong index.

## User Setup Required

None -- PreCompact hook registration takes effect on the next Claude Code session restart that picks up the updated `hooks/hooks.json`. No environment variables, no external services.

## Next Phase Readiness

- Plan 04-03 (SessionStart auto-resume) can rely on the fact that HANDOFF.json will be present after any compaction event, with the `source: "auto-compact"` field allowing SessionStart to distinguish automatic checkpoints from manual pauses for logging purposes (per D-11, behavior is identical).
- The `hookType = args[1]` fix also means the existing session-start migration branch is now live. Future SessionStart enhancements can safely add `else if (hookType === 'session-start')` refinements without having to re-discover the dispatch bug.
- `/gsd-pause-work` and the PreCompact hook now share the same HANDOFF.json generator. Any future schema changes only need to land in `bin/lib/checkpoint.cjs` once.

## Self-Check

- [x] `hooks/hooks.json` contains `PreCompact` with command `hook pre-compact` and timeout 5000 -- verified via `node -e` parse
- [x] `bin/gsd-tools.cjs` contains `hookType === 'pre-compact'` and `writeCheckpoint` references -- verified via source scan
- [x] pre-compact block does not write to stdout (no `process.stdout.write` or `console.log` between the `pre-compact` branch and the trailing `// pre-tool-use` comment) -- verified via block extraction
- [x] pre-compact block writes to stderr and is wrapped in try/catch -- verified via block extraction
- [x] Simulated hook invocation produces HANDOFF.json with 0 stdout bytes and the expected stderr message
- [x] `skills/gsd-pause-work/SKILL.md` references `checkpoint --source manual-pause` and documents enrichment of completed_tasks, remaining_tasks, blockers, human_actions_pending, decisions, context_notes, next_action
- [x] SKILL.md still contains all original steps (detect, gather, write_structured, write, commit, confirm) and still creates `.continue-here.md`
- [x] Commits `4530b6d` and `d8c636f` exist on the current branch -- verified via `git rev-parse`

## Self-Check: PASSED

---
*Phase: 04-checkpoint-and-resume*
*Completed: 2026-04-11*
