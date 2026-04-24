---
slug: 260425-wfd-ship-workflows-dir
type: quick
created: 2026-04-25
status: in-progress
---

# Quick: Close Category B drift — ship `workflows/` dir + rewrite all dangling `@~/.claude/get-shit-done/*` refs to plugin-local form

## Problem

Phase 7's file-layout drift detector reported a baseline of 109 dangling `@~/.claude/get-shit-done/*` refs across plugin content:
- **70 in `workflows/`** (Category B — genuinely missing; no plugin counterpart)
- **38 in `references/` and `templates/`** (Category A — has plugin counterpart, just wrong path form)
- (1 misc — see below)

Phase 7 detected and explicitly **deferred the fix** because it's structural. Today's bug report (`@~/.claude/get-shit-done/...` resolution failing in the user's `/gsd:gsd-ui-phase` invocation) confirms the impact: skills delegating to workflow bodies get "Falling back to legacy workflow file" and silently lose operational logic.

## Fix (one shot, all categories)

Two parallel moves:

### 1. Ship `workflows/` in the plugin

Copy upstream's `get-shit-done/workflows/*.md` (78 files in upstream 1.38.3, of which we reference 70) into a new top-level `workflows/` dir in the plugin.

Then run the durable namespace rewrite (`bin/maintenance/rewrite-command-namespace.cjs`) on the new content — upstream workflow bodies use `/gsd-<skill>` dash-form which we normalize to colon-form per project convention.

### 2. Rewrite all `@~/.claude/get-shit-done/...` refs to plugin-local form

Mass-rewrite across all tracked plugin content:

```
@~/.claude/get-shit-done/<subpath>  →  @${CLAUDE_PLUGIN_ROOT}/<subpath>
```

Why `${CLAUDE_PLUGIN_ROOT}`: Claude Code's plugin loader substitutes this variable in skill/agent content (per `_research/claude-code-internals/utils/plugins/pluginOptionsStorage.ts` `substitutePluginVariables`). At runtime, the variable expands to the version-stamped install path, so the `@`-include resolves to the actual file in the plugin cache.

Substitution covers all three subpaths: `workflows/`, `references/`, `templates/`.

## Files affected

- **New**: 78 files under `workflows/` (mirrors upstream's `get-shit-done/workflows/`)
- **Modified**: every plugin file containing `@~/.claude/get-shit-done/...` references — 109 ref-occurrences across roughly 50-60 files
- **Updated**: `bin/maintenance/check-file-layout.cjs` extended to also detect `@${CLAUDE_PLUGIN_ROOT}/...` refs (catches future drift in the new pattern)
- **Updated**: `tests/drift-baseline.json` regenerated — should land at 0/0/0
- **Updated**: `.planning/PROJECT.md` sync checklist — add a workflows/ sync step
- **Updated**: README.md `## What GSD Plugin provides` — note the workflows dir

## Approach

1. Copy upstream's `get-shit-done/workflows/*.md` into `workflows/`
2. Run `node bin/maintenance/rewrite-command-namespace.cjs` to normalize dash-form commands in the new files
3. Build a regex for the path rewrite: `@~/.claude/get-shit-done/<subpath>` → `@\${CLAUDE_PLUGIN_ROOT}/<subpath>` where `<subpath>` matches the three known dirs
4. Apply across `git ls-files` filtered to text extensions, skipping `_research/`, `.planning/milestones/v*`, etc. (same skip list as the namespace-rewrite script)
5. Update `bin/maintenance/check-file-layout.cjs` to also scan for `@${CLAUDE_PLUGIN_ROOT}/<subpath>` refs and check `<subpath>` exists in the plugin
6. Run `--write-baseline` to regenerate `tests/drift-baseline.json`
7. Run umbrella `check-drift.cjs` — should be all green
8. Sync-process update: PROJECT.md "After each upstream GSD sync" gets a step that copies `get-shit-done/workflows/` into `workflows/` and runs the namespace-rewrite over them
9. README mention of the new dir

## Out of scope

- **Inlining workflow content into skills.** Considered, rejected — would balloon SKILL.md files (each workflow is 100-500 lines). Plugin-local workflows/ + ${CLAUDE_PLUGIN_ROOT} refs is the lighter mid-ground.
- **Removing the @-include mechanism altogether** — too disruptive; the @-include is the right Claude Code primitive for this, just needs a working path.
- **Version bump.** Stays at 2.38.5; bumping for every quick task gets noisy. Next milestone tag (or the next deliberate patch) will gather this.

## Verification

- `node bin/maintenance/check-drift.cjs` — all 3 detectors PASS, file-layout reports 0/0/0
- `node bin/gsd-tools.cjs current-timestamp date` — still works
- Spot-check: `grep -r "@~/.claude/get-shit-done/" skills/ agents/` — should be 0 hits in plugin content
- Spot-check: `cat workflows/ui-phase.md` — exists, no longer the user's "missing file" bug
- `node bin/maintenance/rewrite-command-namespace.cjs --dry` — 0 replacements (already clean post-rewrite)

## Risks

- **`${CLAUDE_PLUGIN_ROOT}` resolution** — relies on CC's plugin loader doing variable substitution in skill content. Verified in `_research/claude-code-internals/utils/plugins/pluginOptionsStorage.ts` doc comment ("Used in MCP/LSP server command/args/env, hook commands, skill/agent content"). If this assumption is wrong, the @-includes won't resolve. Mitigation: spot-check by reading a transformed skill via Claude Code's normal load path.
- **Workflow files reference each other** — upstream workflows often cross-reference. After copy, those cross-refs may also dangle if they use different forms. Mitigation: same path-rewrite covers them.
- **Future upstream syncs** — the sync template needs to include `workflows/` from now on. Documenting the step in PROJECT.md handles this.
- **Detector blind spot** — if we don't extend `check-file-layout.cjs` to also detect `${CLAUDE_PLUGIN_ROOT}/` refs, drift in the new pattern goes undetected. Doing the extension as part of this task.
