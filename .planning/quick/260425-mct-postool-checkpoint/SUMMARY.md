---
slug: 260425-mct-postool-checkpoint
type: quick
created: 2026-04-25
completed: 2026-04-25
status: complete
commit: 1c0ab2f
---

# Summary: PostToolUse periodic checkpoint

## What changed

`hooks/hooks.json` — PostToolUse matcher expanded:
```diff
- "matcher": "Bash"
+ "matcher": "Bash|Edit|Write|MultiEdit|NotebookEdit"
```

`bin/gsd-tools.cjs` — new `post-tool-use` handler. Reads `.planning/HANDOFF.json` mtime; writes a fresh checkpoint with `source: "auto-postool"` only when absent or older than 60 seconds. Silent on success. `try/catch` around everything so the tool pipeline never breaks (3s budget on PostToolUse).

`bin/lib/checkpoint.cjs` — `generateCheckpoint`'s status field now maps `auto-compact OR auto-postool` → `"auto-checkpoint"`; `manual-pause` → `"paused"`. Doc comment lists the 3 source values.

`schema/handoff-v1.json` — `source` enum extended from `["auto-compact", "manual-pause"]` to `["auto-compact", "manual-pause", "auto-postool"]` with a `$comment` describing each value.

`README.md` — extended `## Session continuity + drift resilience` paragraph with a sentence about the PostToolUse periodic checkpoint and the microcompact gap it bridges.

`.planning/PROJECT.md` — Validated section bullet pointing at this task.

## Why this fix

Claude Code has two compaction paths verified in `_research/claude-code-internals/services/compact/`:

| Path | Fires PreCompact? |
|------|-------------------|
| `compactConversation` (full summary) | ✓ |
| `microcompactMessages` (per-turn lossy GC) | ✗ |

Microcompact silently strips stale Read/Bash/Grep/Glob/Edit/Write/MultiEdit/WebFetch/WebSearch outputs between turns. Between full-compact events, this can shrink context substantially without writing any HANDOFF. A session terminating between full compacts loses recent state.

The fix uses a side channel: write a fresh checkpoint after every file-mutating tool call, throttled to ~1/minute via mtime. HANDOFF.json is at most 60 seconds stale at any point during an active session, regardless of which CC compaction path has run.

## Throttle design

- **Time-based, mtime as the clock.** No separate state file. `now - st.mtimeMs > 60_000` → write. Else skip.
- **Cleanup automatic.** `/gsd:resume-work` deletes HANDOFF after restore (LIFE-01 from v1.1), so the next session's first PostToolUse always writes fresh.
- **Bursts collapsed.** 10 tool calls in 1s → 1 write. 1 tool call/min → 1 write/min.
- **No upper write rate cap.** Worst case: 1 write per 60s × 60 minutes = 60 writes/hour, ~1.4kB each → 84kB/hour of disk churn. Negligible.

## Smoke tests (all passed)

| Scenario | Expected | Actual |
|----------|----------|--------|
| Cold (no HANDOFF) → post-tool-use | Write fresh, source=auto-postool | ✓ `"source": "auto-postool"` |
| Warm within 60s | No rewrite, mtime unchanged | ✓ mtime preserved |
| Backdated 90s → post-tool-use | Rewrite, mtime advances | ✓ mtime advanced |
| `check-handoff-schema.cjs` against new enum | PASS | ✓ |
| `check-drift.cjs` umbrella (all 3) | PASS | ✓ |

## Pre-existing state

PostToolUse hook was registered in `hooks/hooks.json` (matcher: `Bash`, command piped to `gsd-tools.cjs hook post-tool-use`), but `gsd-tools.cjs` had no `else if (hookType === 'post-tool-use')` branch — every PostToolUse fire silently no-op'd. This commit fills absence; nothing is being replaced.

## Out of scope

- **Tool-result archive (option C from yesterday's analysis).** Preserves the *bytes* microcompact discards, not just the position. Bigger feature; would be a v1.3 phase if pursued.
- **Phase/plan transition explicit checkpoints (option B).** Could complement this fix; the 60s mtime throttle alone covers the immediate concern.
- **Version bump.** Stays at 2.38.4. Quick task; rolls into next milestone tag.

## Commit

`1c0ab2f` — feat(quick-260425-mct): PostToolUse periodic checkpoint to bridge the microcompact gap

## Note for future debugging

If `HANDOFF.json` shows `source: "auto-postool"` after an unexpected session end, you'll know the periodic checkpoint caught the most recent state. If it shows `source: "auto-compact"`, the last full compact was the most recent capture. If `source: "manual-pause"`, the user explicitly paused. The `timestamp` field tells you exactly when each was written.
