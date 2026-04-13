# Quick Task 260414-1lv: Update GSD plugin to 1.35.0 upstream version

**Status:** Complete
**Commit:** 62ce0ca
**Date:** 2026-04-13

## What was done

Synced upstream GSD v1.35.0 (from `get-shit-done` tag v1.35.0) into the plugin layout, preserving all local patches.

### Files synced from upstream

- **bin/lib/*.cjs** — 13 existing modules updated in-place, 3 new modules added (intel.cjs, learnings.cjs, gsd2-import.cjs)
- **bin/gsd-tools.cjs** — updated with upstream changes, local patches re-applied
- **references/*.md** — 7 existing updated, 13 new added (including few-shot-examples/ subdirectory)
- **contexts/** — new directory with 3 execution context profiles (dev, research, review)
- **templates/** — phase-prompt.md updated, AI-SPEC.md added

### Local patches preserved

- `bin/lib/core.cjs`: resolveGsdRoot(), resolveGsdDataDir(), resolveGsdAsset() + exports
- `bin/gsd-tools.cjs`: write-phase-memory, checkpoint, migrate commands; SessionStart/PreCompact hooks handler
- `bin/lib/memory.cjs`, `bin/lib/checkpoint.cjs`: untouched (plugin-local)

### Version bumped

1.33.0 → 1.35.0 in: package.json, plugin.json, marketplace.json, README.md, PROJECT.md

### Key upstream changes included (v1.33.0 → v1.35.0)

- **v1.34.0**: Global Learnings Store, Queryable Codebase Intelligence, 6 new commands, execution context profiles, gates taxonomy, thinking-model guidance, hardened prompt injection scanner, 15 bug fixes
- **v1.34.1/v1.34.2**: npm publish catchup, Node.js min back to 22
- **v1.35.0**: 3 new runtimes (Cline, CodeBuddy, Qwen Code), 3 new commands, statusline, worktree safety improvements, 25+ bug fixes

## Verification

- All modules load without errors
- Local path resolution (resolveGsdRoot/resolveGsdDataDir) works correctly
- New modules (intel.cjs, learnings.cjs) load successfully
- All version references updated to 1.35.0
- No stale 1.33.0 references remain in version-tracked files
