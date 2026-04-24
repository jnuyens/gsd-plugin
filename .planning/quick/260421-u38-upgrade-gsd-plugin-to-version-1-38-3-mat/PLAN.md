---
quick_id: 260421-u38
slug: upgrade-gsd-plugin-to-version-1-38-3-mat
description: Upgrade gsd-plugin to upstream GSD v1.38.3 (hotfix) and bump plugin to v2.38.3
created: 2026-04-21
upstream_version: 1.38.3
plugin_version: 2.38.3
---

# Upgrade gsd-plugin to upstream GSD v1.38.3

## Goal

Sync plugin to upstream GSD v1.38.3 (the hotfix stack after 1.38.1: 1.38.2 → 1.38.3), bump plugin to v2.38.3 per the `plugin_major = upstream_major + 1` scheme, and publish a GitHub release.

## Upstream release notes

**v1.38.2** (2026-04-21): No CHANGELOG update; release body is just the compare link. Diff-based inspection shows behavior-level workflow changes only (sketch/spike internals).

**v1.38.3** (2026-04-21): "Spike workflow defaults to interactive UI demos instead of stdout. Build a simple HTML page/web UI by default — fall back to terminal output only for pure fact-checking."

## File-level diff between 1.38.1 and 1.38.3

Full list from `diff -rq`:

| File | Size (diff lines) | Relevance to plugin |
|------|-------------------|---------------------|
| `commands/gsd/sketch.md` | 25 | → `skills/sketch/SKILL.md` (SYNC) |
| `commands/gsd/spike.md` | 31 | → `skills/spike/SKILL.md` (SYNC) |
| `get-shit-done/workflows/sketch.md` | 184 | **Not in plugin layout; SKIP** — plugin has no `workflows/` dir; all `@~/.claude/get-shit-done/workflows/*` refs point at the legacy install path, not the plugin. This is drift that v1.2 Phase 7 will catch and flag. |
| `get-shit-done/workflows/sketch-wrap-up.md` | 19 | Skip (same reason) |
| `get-shit-done/workflows/spike.md` | 414 | Skip (same reason) |
| `get-shit-done/workflows/spike-wrap-up.md` | 220 | Skip (same reason) |
| `package.json` | — | Version bump noted upstream (ours is separate) |

## Sync scope (narrow)

1. Overwrite `skills/sketch/SKILL.md` with upstream 1.38.3's `commands/gsd/sketch.md` content
2. Overwrite `skills/spike/SKILL.md` with upstream 1.38.3's `commands/gsd/spike.md` content
3. Both files have NEW content:
   - Frontier mode (no argument or "frontier") that analyzes existing sketch/spike landscape
   - Additional tools in allowed-tools (WebSearch, WebFetch, context7)
   - Updated descriptions and argument hints
4. Run the durable namespace rewrite script to convert any new `/gsd-<skill>` dash-form refs introduced by upstream to `/gsd:<skill>` colon-form

## Local patches to preserve

`bin/lib/core.cjs` — `resolveGsdRoot`, `resolveGsdDataDir`, `resolveGsdAsset`, `MODEL_ALIAS_MAP.opus = 'claude-opus-4-7'`. (Not touched by this sync; listed for invariant checking.)

## Version bumps

- `package.json`: 2.38.2 → 2.38.3
- `.claude-plugin/plugin.json`: 2.38.2 → 2.38.3
- `.claude-plugin/marketplace.json`: 2.38.2 → 2.38.3
- `README.md`: "Based on" line `GSD 1.38.1` → `GSD 1.38.3`, "Plugin version" line `2.38.2` → `2.38.3`
- `.planning/PROJECT.md`: Context section `GSD 1.38.1` → `GSD 1.38.3`, footer timestamp

## Smoke test

- `node -e "require('./bin/lib/core.cjs').resolveGsdRoot"` returns a function
- `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8'))"` succeeds
- `node bin/gsd-tools.cjs current-timestamp date` returns today's date
- `node bin/maintenance/rewrite-command-namespace.cjs --dry` reports 0 remaining after the namespace-rewrite step

## Commit pattern

1. `feat(quick-260421-u38): sync upstream GSD v1.38.3 sketch/spike SKILL.md updates`
2. `chore(quick-260421-u38): bump plugin version 2.38.2 → 2.38.3`
3. `docs(quick-260421-u38): record upstream sync + version bump`

## Tag + publish

- `git tag -a v2.38.3 -m "..."`
- `git push origin master --follow-tags`
- `gh release create v2.38.3 --title "v2.38.3"` with release-notes body

## Not in this sync

- **Workflow file changes** (sketch.md, spike.md, sketch-wrap-up.md, spike-wrap-up.md in upstream's `get-shit-done/workflows/`). Plugin has no workflows/ dir and every `@~/.claude/get-shit-done/workflows/...` reference in plugin SKILL.md files dangles. This structural drift is v1.2 Phase 7's target. Capturing it here only would be a scope creep.
- **Upstream CHANGELOG.md update** — upstream hasn't updated CHANGELOG for 1.38.2/1.38.3 yet; our plugin CHANGELOG doesn't exist yet either (DOCS-02 is v1.2 Phase 9 scope).
