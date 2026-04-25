---
slug: 260425-rgw-postool-read-tools
type: quick
created: 2026-04-25
status: in-progress
---

# Quick: Broaden PostToolUse matcher to include read-only tools (close the read-heavy-research gap)

## Problem (real, observed)

Yesterday's PostToolUse periodic checkpoint (260425-mct) used matcher `Bash|Edit|Write|MultiEdit|NotebookEdit` — file-mutating tools only. Today's incident report from `/Users/jnuyens/sftp-manager/`:

- Last HANDOFF written 02:19 (`source: auto-postool`)
- Usage cap hit 02:37 (per screenshot)
- **18-minute gap** with no checkpoint

Looking at the 18-min content: research-phase work, predominantly `Read`, `Grep`, `Glob`, `WebFetch`. Zero file mutations. PostToolUse never fired. The PostToolUse hook didn't fail — its matcher just didn't include the tools the user was actually using.

## Fix

Extend matcher in `hooks/hooks.json`:

```diff
-"matcher": "Bash|Edit|Write|MultiEdit|NotebookEdit"
+"matcher": "Bash|Edit|Write|MultiEdit|NotebookEdit|Read|Grep|Glob|WebFetch|WebSearch"
```

Result: hook fires on every read, search, glob, web-fetch, and web-search call too. Combined with the existing 60s mtime throttle, write rate stays bounded — most calls in a burst are throttled to no-op.

## Why this is bounded (and not noise-prone)

- 60-second mtime throttle in the `post-tool-use` handler caps actual HANDOFF writes to ≤1/min regardless of tool-call frequency.
- Hook itself is a node spawn + mtime-stat + early return on cooldown — sub-millisecond when throttled.
- Smoke-tested: 5 rapid reads (cold + 4 within cooldown) → 1 write. Backdated mtime by 90s + 1 read → write. Throttle works under burst load.

## What this catches

- Research-phase reads (`Read` x N, `Grep` for patterns, `Glob` for layouts) — common pre-plan work
- Doc-fetching (`WebFetch`, `WebSearch`) — common during research/spike
- Investigative `Bash` was already covered

What it still misses: pure-conversation thinking with no tool calls at all. Acceptable — if Claude isn't running tools, there's nothing meaningful to checkpoint beyond what STATE.md already has.

## Files affected

- `hooks/hooks.json` — matcher line (1 token added)
- `bin/gsd-tools.cjs` — comment in the `post-tool-use` handler updated to reflect the new matcher set + reason
- `README.md` — note the broadened matcher in `## Session continuity + drift resilience`

## Out of scope

- **Time-based fallback (option 2 from the analysis).** Could add later — a separate "tick" hook (e.g. UserPromptSubmit) that writes HANDOFF if older than N minutes regardless of tool calls. Catches the pure-thinking gap. Not needed for now; matcher broadening covers the observed failure mode.
- **Version bump.** Stays at 2.38.6; if user wants a release, separate request.

## Smoke tests (all passed)

| Test | Outcome |
|------|---------|
| Cold start → 1 read | Writes HANDOFF, source=auto-postool |
| 4 more rapid reads within cooldown | All 4 throttled, mtime unchanged |
| Backdate mtime −90s + 1 read | Rewrote (cooldown expired) |
| `check-drift.cjs` umbrella | All 3 detectors PASS |
