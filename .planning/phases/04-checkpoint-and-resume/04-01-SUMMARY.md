---
phase: 04-checkpoint-and-resume
plan: 01
subsystem: infra
tags: [checkpoint, handoff, gsd-tools, cjs, hooks]

requires:
  - phase: 03-hook-foundation
    provides: hook handler dispatch pattern in gsd-tools.cjs
provides:
  - Shared checkpoint library exposing generateCheckpoint/writeCheckpoint/cmdCheckpoint
  - `checkpoint` CLI command on gsd-tools.cjs that writes HANDOFF.json
  - Crash-safe HANDOFF.json generation (never throws, supports partial fallback)
affects: [04-02-PLAN, 04-03-PLAN, gsd-pause-work, PreCompact hook, SessionStart hook]

tech-stack:
  added: []
  patterns:
    - "Shared library in bin/lib/ required inside dispatcher case (lazy load)"
    - "Crash-safe gather-then-write: generate returns object, write persists"
    - "Single HANDOFF.json schema shared between manual and automatic paths"

key-files:
  created:
    - bin/lib/checkpoint.cjs
  modified:
    - bin/gsd-tools.cjs

key-decisions:
  - "D-10: one shared checkpoint function, not two parallel implementations"
  - "D-04: PreCompact hook gets a 5s budget, so generateCheckpoint never throws — partial data is acceptable"
  - "D-03: uncommitted_files always sourced from fresh git status"
  - "D-05: HANDOFF.json is always overwritten (no versioning)"

patterns-established:
  - "Lazy require inside switch case: require('./lib/checkpoint.cjs') only when the checkpoint command runs"
  - "generateCheckpoint vs writeCheckpoint split: pure data assembly vs disk I/O"
  - "Status field derived from source: auto-compact → auto-checkpoint, manual-pause → paused"

requirements-completed:
  - CKPT-01
  - CKPT-02
  - CKPT-03

duration: ~18min
completed: 2026-04-11
---

# Phase 4 Plan 01: Checkpoint Library Summary

**Shared checkpoint.cjs library + `checkpoint` command in gsd-tools.cjs that produces the 19-field HANDOFF.json matching the existing pause-work schema.**

## Performance

- **Tasks:** 2
- **Commits:** 2
- **Files created:** 1 (bin/lib/checkpoint.cjs, 419 lines)
- **Files modified:** 1 (bin/gsd-tools.cjs)
- **Completed:** 2026-04-11

## Accomplishments

- New shared library `bin/lib/checkpoint.cjs` exporting `generateCheckpoint`, `writeCheckpoint`, and `cmdCheckpoint`.
- `generateCheckpoint(cwd, options)` assembles the 19-field HANDOFF.json object by parsing STATE.md frontmatter + body, running `git status --porcelain` and `git log --oneline -5`, and scanning the current phase directory for PLAN/SUMMARY pairs to compute `completed_tasks` and `remaining_tasks`.
- Crash-safe by design: every git call and file read is wrapped in try/catch. If any step fails, `partial: true` is set and empty arrays are used. Never throws — satisfies the 5s PreCompact budget (D-04).
- `writeCheckpoint(cwd, options)` delegates to `generateCheckpoint`, then writes JSON to `.planning/HANDOFF.json` via synchronous `fs.writeFileSync`. Always overwrites (D-05), never commits (D-06).
- `cmdCheckpoint(cwd, args, raw)` parses `--source` and `--context-notes` flags and emits the JSON via `output()` plus a stderr status line.
- Wired into `bin/gsd-tools.cjs` as `case 'checkpoint'` in the command dispatcher, following the lazy-require pattern used by the adjacent `write-phase-memory` handler.
- Both `node bin/gsd-tools.cjs checkpoint` (default `manual-pause`) and `--source auto-compact` produce valid HANDOFF.json with matching `status` field values (`paused` vs `auto-checkpoint`).

## Task Commits

1. **Task 1: Create bin/lib/checkpoint.cjs shared checkpoint library** — `e98c865` (feat)
2. **Task 2: Wire checkpoint command into gsd-tools.cjs dispatcher** — `b974647` (feat)

## Files Created/Modified

- `bin/lib/checkpoint.cjs` — Shared checkpoint library with generateCheckpoint/writeCheckpoint/cmdCheckpoint
- `bin/gsd-tools.cjs` — Added `checkpoint` command dispatch (lazy-loads the lib) and help entry in the file header comment

## Decisions Made

None — plan executed as written. All decisions (D-01..D-12) were locked in CONTEXT.md before execution; the implementation honors each one.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Verification Results

All verification commands from the plan passed:

1. `require('./bin/lib/checkpoint.cjs')` loads cleanly; `generateCheckpoint` returns an object with all 19 required keys, `version === '1.0'`, `source === 'auto-compact'`, `status === 'auto-checkpoint'` — PASS.
2. `node bin/gsd-tools.cjs checkpoint --source auto-compact` writes `.planning/HANDOFF.json` with the correct shape — PASS.
3. `node bin/gsd-tools.cjs checkpoint` (no flags) writes HANDOFF.json with `source: "manual-pause"` and `status: "paused"` — PASS.
4. `uncommitted_files` is an array (populated from live git status) — PASS.
5. Graceful degradation: handler wraps all I/O in try/catch, never throws.

## Next Phase Readiness

- Plan 04-02 can now call `writeCheckpoint({ source: 'auto-compact' })` directly from the `pre-compact` hook handler.
- Plan 04-02 can refactor `skills/gsd-pause-work/SKILL.md` to invoke `node "$GSD_TOOLS" checkpoint --source manual-pause` instead of inlining HANDOFF.json generation.
- HANDOFF.json schema is locked and verified; downstream plans only extend behavior, not the shape.

---
*Phase: 04-checkpoint-and-resume*
*Completed: 2026-04-11*
