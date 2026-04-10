# Automatic session continuity via PreCompact/SessionStart hooks - builds on #2017

Following up on [Discussion #2017](https://github.com/gsd-build/get-shit-done/discussions/2017) (the plugin packaging post). This proposes automatic session continuity by wiring Claude Code's PreCompact hook to `/gsd-pause-work` and SessionStart hook to `/gsd-resume-work`, so GSD sessions survive context resets without manual intervention.

## The mechanism

GSD already has the building blocks:

- `/gsd-pause-work` saves a HANDOFF.json checkpoint with phase/plan/task position, uncommitted files, recent decisions, and context notes
- `/gsd-resume-work` detects HANDOFF.json and restores full project state
- Both work today, but require manual invocation -- you have to remember to pause before ending a session and resume when starting a new one

The proposal is to automate the trigger:

- **PreCompact** fires automatically when Claude Code's context window runs low. Hook calls `/gsd-pause-work`, which writes HANDOFF.json before the context is compressed.
- **SessionStart** fires when a new session begins. Hook detects HANDOFF.json and calls `/gsd-resume-work` automatically.
- Result: zero-intervention continuity across context resets. The checkpoint format and resume logic are unchanged -- it is wiring, not new logic.

## Why HANDOFF.json matters for upstream

- HANDOFF.json is already a GSD artifact, defined by `/gsd-pause-work`. The format includes version, timestamp, phase, plan, task, status, uncommitted files, decisions, and context notes.
- If upstream GSD and the plugin agree on the format, manual pause/resume and automatic hook-driven pause/resume produce identical checkpoints.
- Upstream could adopt the same hook pattern for other AI CLIs that support lifecycle events, without changing the core checkpoint logic.

## The open question

Does automatic session continuity via hooks belong upstream in GSD core (as an optional feature), or is it better kept downstream in the plugin?

If upstream: would a PR against the hooks infrastructure and HANDOFF.json format be welcome? The HANDOFF.json format is already upstream -- the new part is the automatic trigger via PreCompact and SessionStart hooks.

## Links

- [Discussion #2017](https://github.com/gsd-build/get-shit-done/discussions/2017)
- [gsd-plugin on GitHub](https://github.com/jnuyens/gsd-plugin)
- Based on [GSD 1.33.0](https://github.com/gsd-build/get-shit-done) by Lex Christopherson (TACHES).
