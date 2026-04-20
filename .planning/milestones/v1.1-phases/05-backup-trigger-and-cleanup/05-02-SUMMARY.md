---
phase: 05-backup-trigger-and-cleanup
plan: 02
subsystem: lifecycle
tags: [checkpoint, handoff, lifecycle, resume, skills, cli]

requires:
  - phase: 04-checkpoint-and-resume
    provides: shared checkpoint library (bin/lib/checkpoint.cjs) with generateCheckpoint + writeCheckpoint + cmdCheckpoint
provides:
  - deleteCheckpoint(cwd) helper in bin/lib/checkpoint.cjs with never-throw contract and idempotent return shape { deleted, path, error? }
  - `node bin/gsd-tools.cjs checkpoint --clear` CLI flag that removes .planning/HANDOFF.json (routes through existing cmdCheckpoint dispatch; no new gsd-tools wiring needed)
  - Self-contained gsd-resume-work SKILL.md with 6 explicit process steps — ending with HANDOFF.json cleanup
affects: [gsd-resume-work skill invocations, future v1.2 LIFE-02 staleness work]

tech-stack:
  added: []
  patterns:
    - "Mode-switch CLI flag parsed FIRST in cmdCheckpoint — --clear short-circuits before any other flag is read so the writeCheckpoint path is statically unreachable when --clear is set"
    - "deleteCheckpoint mirrors writeCheckpoint's never-throw discipline: every IO site wrapped in try/catch, failures surfaced on the return object, not by throwing"
    - "Skill self-contained: process steps live in the SKILL.md body, no delegation to external @-referenced workflow files (which can silently go missing)"
    - "Skill-level cleanup with CLI primary + rm fallback: shell invocation tolerates ${CLAUDE_PLUGIN_ROOT} being unset in non-plugin installs"

key-files:
  created:
    - .planning/phases/05-backup-trigger-and-cleanup/05-02-SUMMARY.md
  modified:
    - bin/lib/checkpoint.cjs
    - skills/gsd-resume-work/SKILL.md

key-decisions:
  - "D-06: deleteCheckpoint helper co-located with generate/writeCheckpoint in bin/lib/checkpoint.cjs — keeps full lifecycle logic in one file"
  - "D-07: Deletion exposed as `checkpoint --clear` CLI flag branching inside cmdCheckpoint, not a new subcommand name — minimizes CLI surface growth"
  - "D-08: Cleanup runs as skill step 6 (last), not mid-process — ensures an aborted resume leaves HANDOFF.json intact for recovery"
  - "D-09: Cleanup is unconditional-on-success and silent (via stderr) — if skill reaches final step, resume is considered successful"
  - "D-10: SessionStart hook deliberately does NOT delete HANDOFF.json — the hook only detects; deletion lives in the resume-work skill"

patterns-established:
  - "Never-throw deletion helper returning { deleted, path, error? } — same contract as writeCheckpoint's partial=true fallback"
  - "--clear as mode-switch flag (first-check, early-return) rather than a modifier — eliminates any path where writeCheckpoint runs alongside deletion"
  - "Self-contained skill body as default pattern when external workflow file is missing or at risk of drift"
  - "Skill cleanup with CLI-primary + rm-fallback and 'cleanup failure is hygiene, not correctness' guidance"

requirements-completed:
  - LIFE-01

duration: ~3min (well under the 15-20min estimate — plan was precise and self-contained)
completed: 2026-04-20
---

# Phase 5 Plan 02: HANDOFF.json Cleanup After Resume Summary

**Added `deleteCheckpoint()` helper and `checkpoint --clear` CLI flag to the shared checkpoint library, and rewrote the gsd-resume-work skill to be self-contained with an explicit final cleanup step — closing LIFE-01 so HANDOFF.json no longer sits on disk triggering phantom resume messages on every subsequent session.**

## Performance

- **Tasks:** 3 (two code tasks + one CLI-level smoke test)
- **Commits:** 2 (Task 3 is test-only, no file changes)
- **Files created:** 0 (plus this SUMMARY)
- **Files modified:** 2 (`bin/lib/checkpoint.cjs`, `skills/gsd-resume-work/SKILL.md`)
- **Started:** 2026-04-20T05:11:02Z
- **Completed:** 2026-04-20T05:12:50Z
- **Elapsed:** ~108 seconds

## Task Outcomes

| # | Task | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1 | Add deleteCheckpoint helper + --clear branch + export | PASS | `8228e7c` | Both verify checks pass (source scan + runtime functional/idempotency test) |
| 2 | Rewrite gsd-resume-work SKILL.md as self-contained with cleanup step | PASS | `f699947` | All 7 verify checks pass — frontmatter preserved, 6 steps, cleanup last, no stale external workflow ref |
| 3 | End-to-end CLI-level lifecycle smoke test (write → clear → clear-again) | PASS | (test-only, no commit) | `rm` → `checkpoint` → `test -f` → `checkpoint --clear` → `test ! -f` → `checkpoint --clear` → exit 0 |

## Accomplishments

- **`deleteCheckpoint(cwd)` helper added to `bin/lib/checkpoint.cjs`.** Inserted immediately after `writeCheckpoint` (before the `CLI command handler` banner) and mirrors `writeCheckpoint`'s never-throw contract. Resolves the HANDOFF.json path via `planningPaths(cwd).planning` (workspace-aware), returns `{ deleted: false, path }` when the file is absent (idempotent success), returns `{ deleted: true, path }` after successful `fs.unlinkSync`, and returns `{ deleted: false, path, error }` on any failure — every IO site wrapped so the function never throws.
- **`--clear` branch added to `cmdCheckpoint`.** Placed as the very first check inside the function (before `--source`, `--context-notes`, `--partial` parsing) so `writeCheckpoint` is statically unreachable when `--clear` is present. On success, emits `GSD: checkpoint cleared from .planning/HANDOFF.json` to stderr (wrapped in try/catch against a closed stream); on error, emits the error message; when the file wasn't there, stays silent (the absence is the desired end-state). Writes the `deleteCheckpoint` result object to stdout via the shared `output()` helper for scripted callers.
- **Module exports extended.** `deleteCheckpoint` now lives in `module.exports` between `writeCheckpoint` and `cmdCheckpoint`, grouping the creation/deletion pair before the CLI handler.
- **`skills/gsd-resume-work/SKILL.md` rewritten as self-contained.** Dropped the `@~/.claude/get-shit-done/workflows/resume-project.md` delegation that pointed at a file which does not exist on disk (verified 2026-04-20 — the skill was silently broken). Frontmatter (name, description, allowed-tools) preserved verbatim. Body replaced with a 6-step `<process>` block: detect handoff, load STATE.md (with reconstruction fallback), read and parse HANDOFF.json, present compact status, route to next action, and — step 6 — invoke `gsd-tools.cjs checkpoint --clear` with `rm -f .planning/HANDOFF.json` as fallback. A `<rules>` block codifies the three invariants from Phase 5 CONTEXT decisions: cleanup runs last, skip when HANDOFF.json is absent, skill (not hook) owns deletion.
- **Full CLI-level lifecycle verified.** Task 3 smoke test wrote a real HANDOFF.json via `checkpoint --source manual-pause`, cleared it via `checkpoint --clear`, then re-ran `checkpoint --clear` to verify idempotency — all three steps exit 0, and the final filesystem state has no HANDOFF.json.

## Files Created/Modified

- `bin/lib/checkpoint.cjs` — +56 lines: `deleteCheckpoint` function, `--clear` branch in `cmdCheckpoint`, added to `module.exports`. No existing logic touched.
- `skills/gsd-resume-work/SKILL.md` — +47 / −24 lines: body fully replaced with self-contained 6-step process block and `<rules>` block; frontmatter unchanged.
- `.planning/phases/05-backup-trigger-and-cleanup/05-02-SUMMARY.md` — new file (this summary).

## Decisions Made

None new. This plan implements decisions **D-06 through D-10** that were locked in `05-CONTEXT.md` during the discuss-phase step. The implementation honors each one:

- **D-06:** `deleteCheckpoint(cwd)` landed in `bin/lib/checkpoint.cjs` next to the existing generate/write helpers, closing the lifecycle API in one file.
- **D-07:** Exposed as the CLI flag `checkpoint --clear`, not a new subcommand. Handler branches inside the existing `cmdCheckpoint`; no new dispatch wiring needed in `bin/gsd-tools.cjs`.
- **D-08:** Skill places cleanup at step 6 — final step, after all context restoration and status presentation. A failure in steps 1-5 leaves HANDOFF.json on disk for recovery.
- **D-09:** Cleanup is unconditional-on-success and silent (stderr informational only). No carve-out for "user cancelled" — if the skill reached step 6, resume is successful by definition.
- **D-10:** SessionStart hook was NOT modified — deletion is exclusively the resume-work skill's responsibility. Confirmed by not touching `bin/gsd-tools.cjs`.

Decisions D-01 through D-05 belong to the parallel Plan 05-01 (CLAUDE.md fallback section).

## Deviations from Plan

**None.** The plan was exceptionally precise — action texts included the final code to paste, acceptance criteria matched the implementation line-by-line, verify commands were copy-pasteable, and the smoke test ran clean on first try.

### One micro-note for completeness

The Task 1 automated source-scan check had `process.exit(fail)` positioned before the runtime export check, which would have silently skipped the runtime check when all static checks passed (exit code 0). Reordered locally to `if (fail) process.exit(fail)` so the runtime check always runs on success. This only affected the verify script's own control flow — no production code change. All 5 static checks + 1 runtime check + the separate functional idempotency test all passed.

## Issues Encountered

None. Each task's verify command passed on first invocation after the edit. No auth gates, no blockers, no auto-fix attempts needed.

## User Setup Required

None. Changes take effect immediately:
- `deleteCheckpoint` is a pure library addition — callable via `require('./bin/lib/checkpoint.cjs').deleteCheckpoint(cwd)` from anywhere in the project.
- `node bin/gsd-tools.cjs checkpoint --clear` is the new CLI path.
- The updated skill body is picked up by Claude Code the next time `/gsd:resume-work` is invoked; no plugin rebuild required since skills are read from disk at invocation time.

## Next Phase Readiness

- **LIFE-01 closed.** `.planning/HANDOFF.json` is now removed at the end of every successful `/gsd:resume-work` invocation, eliminating the phantom-resume-on-every-session bug where SessionStart re-fires the resume systemMessage against a stale handoff file.
- **Parallel Plan 05-01 unblocked.** Plan 05-01 (CLAUDE.md session-continuity fallback section) runs independently — it touches `bin/lib/profile-output.cjs`, `templates/claude-md.md`, and `CLAUDE.md`, all files this plan did NOT modify. No merge conflicts expected.
- **Future v1.2 LIFE-02 (staleness detection) extension point.** `deleteCheckpoint` returns `{ deleted, path, error? }` — a future staleness checker can call `deleteCheckpoint` unconditionally before reading, or introduce a sibling `isCheckpointStale(cwd, maxAgeMs)` helper. The existing contract won't need to change.

## Self-Check

- [x] `bin/lib/checkpoint.cjs` contains `function deleteCheckpoint(cwd)` — verified
- [x] `bin/lib/checkpoint.cjs` contains `fs.unlinkSync` — verified
- [x] `bin/lib/checkpoint.cjs` contains `args.includes('--clear')` inside `cmdCheckpoint` — verified
- [x] `module.exports` includes `deleteCheckpoint` — verified at runtime via `require()`
- [x] `deleteCheckpoint` returns `{ deleted: true }` when HANDOFF.json exists, `{ deleted: false }` (no error) when absent — verified via tmp-dir test
- [x] `skills/gsd-resume-work/SKILL.md` frontmatter unchanged (name: gsd:resume-work preserved) — verified
- [x] `skills/gsd-resume-work/SKILL.md` no longer references `resume-project.md` — verified
- [x] `skills/gsd-resume-work/SKILL.md` contains 6 numbered steps with step 6 being the cleanup step — verified
- [x] `skills/gsd-resume-work/SKILL.md` contains `checkpoint --clear` invocation — verified
- [x] `skills/gsd-resume-work/SKILL.md` contains `<rules>` block — verified
- [x] CLI smoke test: `checkpoint --source manual-pause` creates `.planning/HANDOFF.json` — verified
- [x] CLI smoke test: `checkpoint --clear` removes `.planning/HANDOFF.json` — verified
- [x] CLI smoke test: second `checkpoint --clear` exits 0 (idempotent) — verified
- [x] After the full sequence, `.planning/HANDOFF.json` does not exist on disk — verified (`ls` returns "No such file or directory")
- [x] Commits `8228e7c` and `f699947` exist on master — verified via `git rev-parse --short HEAD` after each commit

## Self-Check: PASSED

---
*Phase: 05-backup-trigger-and-cleanup*
*Completed: 2026-04-20*
