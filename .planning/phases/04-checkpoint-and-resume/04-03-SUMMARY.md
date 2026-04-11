---
phase: 04-checkpoint-and-resume
plan: 03
subsystem: infra
tags: [hooks, session-start, handoff, auto-resume, gsd-tools, cjs]

requires:
  - phase: 04-checkpoint-and-resume
    provides: HANDOFF.json generation via PreCompact hook (plan 04-02) and shared checkpoint library (plan 04-01)
provides:
  - SessionStart hook handler that detects HANDOFF.json on startup/compact sources
  - Automatic resume directive injected as system message via stdout
  - User-visible stderr notification when auto-resume fires
  - Source-filtered resume (skips on 'clear' and 'resume' to respect user intent and avoid loops)
affects: [gsd-resume-work, v1.1 session continuity loop]

tech-stack:
  added: []
  patterns:
    - "SessionStart stdout is injected as a system message (executeHooks -> AggregatedHookResult.systemMessage). Use stdout, not stderr, for Claude-facing directives."
    - "Stdin parsing wrapped in its own inner try/catch so missing/unparseable stdin never crashes the handler -- default source to 'startup'."
    - "HANDOFF.json detection isolated in its own try/catch so a malformed checkpoint file can never crash session start (T-04-11)."
    - "Source-aware hook behavior: same hook, different branches for startup/compact/clear/resume -- skip filtering prevents feedback loops."

key-files:
  created: []
  modified:
    - bin/gsd-tools.cjs

key-decisions:
  - "D-08: SessionStart detects HANDOFF.json and emits a system message via stdout telling Claude to run /gsd-resume-work -- zero user intervention"
  - "D-09: System message ends with 'Do this immediately without waiting for user input' to enforce zero-intervention resume"
  - "D-08 (filter): skip resume on source='clear' (user intentionally cleared) and source='resume' (avoid infinite loop)"
  - "T-04-09: system message only leaks lightweight fields (phase name, plan number, task number, source) -- no uncommitted files, no decisions log"

patterns-established:
  - "Two-layer try/catch in session-start: outer for migration (preserved from earlier work), new isolated block for HANDOFF.json detection so the two cannot interfere"
  - "stdin read is its own innermost try/catch that never contributes to control flow beyond populating hookInput -- missing stdin defaults source to 'startup'"
  - "Lazy require of ./lib/core.cjs inside the detection branch (only pay the require cost when HANDOFF.json is actually checked)"

requirements-completed:
  - RESM-01
  - RESM-02
  - RESM-03

duration: ~8min
completed: 2026-04-11
---

# Phase 4 Plan 03: SessionStart Auto-Resume Summary

**SessionStart hook now reads its stdin for the `source` field, scans `.planning/HANDOFF.json` on startup/compact, and injects a system message telling Claude to run `/gsd-resume-work` immediately -- closing the last gap in the v1.1 session continuity loop.**

## Performance

- **Tasks:** 1
- **Commits:** 2 (1 for the code change, 1 for this SUMMARY)
- **Files created:** 0
- **Files modified:** 1 (`bin/gsd-tools.cjs`, +53 lines in the `case 'hook':` block)
- **Completed:** 2026-04-11

## Accomplishments

- **SessionStart handler now reads stdin.** Added a defensive `fs.readFileSync(0, 'utf-8')` wrapped in its own try/catch at the top of the `hookType === 'session-start'` branch. Parses the JSON and pulls out the `source` field, defaulting to `'startup'` when stdin is missing or unparseable. This is the first time session-start actually consumes its stdin payload.

- **HANDOFF.json detection on startup/compact only.** After the preserved auto-migration block, a new block lazy-loads `./lib/core.cjs` for `planningPaths`, computes the HANDOFF.json path, and checks for its existence. The check only runs when `source === 'startup'` or `source === 'compact'` -- both `clear` and `resume` are explicitly skipped. This honors D-08 (user clearing context is intentional) and prevents feedback loops (resume source means we're already in a resume flow).

- **System message construction.** When HANDOFF.json exists, the handler parses it for four lightweight fields (`phase_name`/`phase`, `plan`, `task`, `source`) and assembles a single-line directive: `"GSD session continuity: Found checkpoint from previous session. Phase: {phase}, Plan: {plan}, Task: {task} (source: {source}). Run /gsd-resume-work to restore context and continue. Do this immediately without waiting for user input."` This is written to stdout via `process.stdout.write(systemMsg)` -- per the research in section 4 of 04-RESEARCH.md, SessionStart stdout flows through `executeHooks` and becomes the `systemMessage` field in `AggregatedHookResult`, which Claude sees as conversation context. The `Do this immediately` clause closes the RESM-02 requirement (zero-intervention resume).

- **User-visible stderr notification.** A separate `process.stderr.write('GSD: session checkpoint detected, auto-resuming...\n')` runs alongside the stdout write so the user sees the hook firing in their terminal. stderr and stdout carry different semantics in the SessionStart channel: stderr is the user-facing display, stdout is the Claude-facing system message.

- **Defensive error isolation.** The entire HANDOFF.json detection is wrapped in its own try/catch, separate from the migration try/catch. If the file is malformed, if `planningPaths` throws, if `fs.readFileSync` fails, or if `JSON.parse` chokes, session start simply proceeds normally without any resume. Verified: a literal malformed JSON file (`{not valid json`) does not crash the handler (exit 0). This satisfies T-04-11 (malicious/corrupted HANDOFF.json cannot break session start).

- **Plan 02 pre-compact handler preserved unchanged.** The entire `else if (hookType === 'pre-compact')` block from commit `4530b6d` is intact, including the Plan 02 Rule 1 bug fix (`args[1]` vs `args[0]`) and the defensive stdin wrap.

- **Auto-migration block preserved unchanged.** The legacy-cleanup `autoMigrate` try/catch is still the first thing session-start does after parsing stdin -- the order matters because migration should run before any HANDOFF.json logic, so even legacy installs go through cleanup first.

## Task Commits

1. **Task 1: Enhance SessionStart handler to detect HANDOFF.json and inject resume system message** -- `22825e5` (feat)

## Files Created/Modified

- `bin/gsd-tools.cjs` -- Added 53 lines inside the `case 'hook':` block:
  - stdin read + JSON parse with defensive try/catch (top of session-start branch, before migration)
  - HANDOFF.json detection block (after migration, before the closing of session-start)
  - Lazy require of `./lib/core.cjs` only inside the detection branch
  - stdout `systemMsg` write + stderr auto-resuming notification
  - Outer try/catch around the entire detection block for error isolation

## Decisions Made

None new. This plan implements decisions that were locked in `04-CONTEXT.md` during the discuss-phase step:

- **D-08:** SessionStart returns a system message telling Claude to run `/gsd-resume-work` -- implemented by writing the directive to stdout, which Claude Code's hook pipeline converts into a system message via `AggregatedHookResult.systemMessage`.
- **D-09:** Zero user intervention -- enforced by the `"Do this immediately without waiting for user input"` clause at the end of the system message.
- **Source filter (derived from D-08):** `clear` and `resume` skip HANDOFF.json detection. The research section 4 established these four source values (`startup`, `compact`, `clear`, `resume`), and the plan locks filtering to the first two only.
- **T-04-09 (threat model):** the system message only leaks phase name, plan number, task number, and source. No uncommitted files or full decisions log are exposed in the injected prompt -- that data stays in HANDOFF.json for the resume-work skill to read after it has been invoked.

## Deviations from Plan

None -- plan executed exactly as written. The code block in the plan's `<action>` was pasted verbatim into the target location with no modifications.

## Issues Encountered

None.

## Verification Results

All 6 automated grep checks from the plan pass (verified via an inline `node -e` script):

1. `HANDOFF.json` reference present -- OK
2. Source filtering present (`source === 'startup'` and `source === 'compact'`) -- OK
3. Resume instruction `gsd-resume-work` present -- OK
4. `process.stdout.write(systemMsg)` present -- OK
5. stderr `auto-resuming` notification present -- OK
6. Pre-compact handler from Plan 02 still present (`hookType === 'pre-compact'`) -- OK

Plus:

7. `autoMigrate` still present (migration block preserved) -- OK
8. `immediately` directive present in system message -- OK

All 5 end-to-end verification scenarios from the plan pass:

**Test 1: HANDOFF.json exists, source=startup**
```
echo '{"source":"startup"}' | node bin/gsd-tools.cjs hook session-start 2>/dev/null
```
-> stdout = `GSD session continuity: Found checkpoint from previous session. Phase: 04-checkpoint-and-resume, Plan: 3, Task: 1 (source: auto-compact). Run /gsd-resume-work to restore context and continue. Do this immediately without waiting for user input.` -- PASS (contains gsd-resume-work).

**Test 2: HANDOFF.json exists, source=compact**
```
echo '{"source":"compact"}' | node bin/gsd-tools.cjs hook session-start 2>/dev/null
```
-> stdout = same resume message as Test 1 -- PASS (contains gsd-resume-work).

**Test 3: HANDOFF.json exists, source=clear**
```
echo '{"source":"clear"}' | node bin/gsd-tools.cjs hook session-start 2>/dev/null
```
-> stdout empty -- PASS (skipped on clear).

**Test 4: No HANDOFF.json, source=startup**
```
rm .planning/HANDOFF.json && echo '{"source":"startup"}' | node bin/gsd-tools.cjs hook session-start 2>/dev/null
```
-> stdout empty -- PASS.

**Test 5 (bonus): HANDOFF.json exists, source=resume**
```
echo '{"source":"resume"}' | node bin/gsd-tools.cjs hook session-start 2>/dev/null
```
-> stdout empty -- PASS (skipped on resume, preventing feedback loops).

**Test 6 (bonus): stderr notification on startup**
```
echo '{"source":"startup"}' | node bin/gsd-tools.cjs hook session-start 2>&1 >/dev/null
```
-> stderr = `GSD: session checkpoint detected, auto-resuming...` -- PASS.

**Test 7 (defensive bonus): malformed HANDOFF.json**
```
echo '{not valid json' > .planning/HANDOFF.json
echo '{"source":"startup"}' | node bin/gsd-tools.cjs hook session-start
```
-> exit 0, no crash -- PASS (T-04-11 mitigation working).

Test HANDOFF.json cleaned up after verification.

## User Setup Required

None. The SessionStart hook picks up the updated `bin/gsd-tools.cjs` automatically on the next Claude Code session. No configuration, no environment variables, no external services.

## Next Phase Readiness

- **Phase 4 complete.** Plans 04-01 (shared checkpoint library), 04-02 (PreCompact hook + pause-work refactor), and 04-03 (SessionStart auto-resume) together close the full checkpoint -> resume loop. A session hitting context compaction will now:
  1. PreCompact hook fires -> `writeCheckpoint` writes HANDOFF.json.
  2. Claude Code compacts and starts a new session with `source: 'compact'`.
  3. SessionStart hook fires -> detects HANDOFF.json -> injects system message.
  4. Claude sees the directive and runs `/gsd-resume-work` without user input.
  5. `gsd-resume-work` skill reads HANDOFF.json, restores context, and deletes the file.

- **Phase 5 (if needed) can build on this loop** with stale-checkpoint detection (LIFE-02), CLAUDE.md backup trigger (BKUP-01/02), or empirical measurement of end-to-end auto-resume behavior in a real compaction scenario.

- **Manual verification recommended before declaring v1.1 shipped:** trigger a real `/compact` in a running Claude Code session with this plugin loaded and confirm the auto-resume flow works end-to-end. Synthetic hook testing covered everything the grep and stdin checks can reach, but only a live compaction exercises the actual `executeHooks` -> `AggregatedHookResult.systemMessage` pipeline.

## Self-Check

- [x] `bin/gsd-tools.cjs` contains `hookInput.source` handling inside session-start -- verified via source inspection
- [x] `bin/gsd-tools.cjs` contains `source === 'startup'` and `source === 'compact'` guards -- verified via automated grep
- [x] System message written to stdout via `process.stdout.write(systemMsg)` and contains `gsd-resume-work` + `immediately` -- verified via both grep and live execution
- [x] stderr notification contains `auto-resuming` -- verified via grep and live execution
- [x] HANDOFF.json detection wrapped in dedicated try/catch -- verified via source inspection and malformed-JSON defensive test
- [x] `autoMigrate` block preserved -- verified via grep (`autoMigrate` still present)
- [x] Pre-compact handler (`hookType === 'pre-compact'`) preserved -- verified via grep
- [x] Commit `22825e5` exists on master -- verified via `git log`
- [x] All 7 verification scenarios (4 from the plan + 3 bonus) produce expected stdout/stderr
- [x] Test HANDOFF.json cleaned up after verification
- [x] `.planning/phases/04-checkpoint-and-resume/04-03-SUMMARY.md` written matching the summary template

## Self-Check: PASSED

---
*Phase: 04-checkpoint-and-resume*
*Completed: 2026-04-11*
