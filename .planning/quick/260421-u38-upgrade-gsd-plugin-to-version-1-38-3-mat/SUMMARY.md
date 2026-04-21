---
quick_id: 260421-u38
slug: upgrade-gsd-plugin-to-version-1-38-3-mat
status: complete
upstream_version: 1.38.3
plugin_version: 2.38.3
completed: 2026-04-21
commits:
  - b4e8796 feat(quick-260421-u38): sync upstream GSD v1.38.3 sketch/spike updates
  - 1c75799 chore(quick-260421-u38): bump plugin version 2.38.2 → 2.38.3
release_url: https://github.com/jnuyens/gsd-plugin/releases/tag/v2.38.3
---

# Summary — Upgrade plugin to upstream GSD 1.38.3

## Outcome

Plugin synced to upstream GSD 1.38.3, version bumped `2.38.2 → 2.38.3`, tagged `v2.38.3`, pushed to origin, and published as GitHub release.

**Release URL:** https://github.com/jnuyens/gsd-plugin/releases/tag/v2.38.3

## What changed

### Ported from upstream 1.38.3
- `skills/gsd-sketch/SKILL.md` — frontier mode; WebSearch/WebFetch/context7 in allowed-tools; updated description + argument hint
- `skills/gsd-spike/SKILL.md` — same pattern (frontier mode + extended tools + updated description)

### Plugin-only fix
- `bin/maintenance/rewrite-command-namespace.cjs` skip pattern generalized: `/^\.planning\/milestones\/v1\.0-/` → `/^\.planning\/milestones\/v\d+\./` so versioned milestone archives (v1.1-phases/, future v1.2-phases/) are preserved as-is on re-runs. **Bug surfaced by this sync:** the first run of the post-sync rewrite wrongly modified 9 files under `.planning/milestones/v1.1-phases/04-checkpoint-and-resume/` — historical archive. Reverted via `git checkout --` before committing; skip pattern fixed.

### Version bumps
- `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: `2.38.2 → 2.38.3`
- `README.md`: "Based on" line `GSD 1.38.1 → 1.38.3`; "Plugin version" `2.38.2 → 2.38.3`
- `.planning/PROJECT.md`: Context line `GSD 1.38.1 → 1.38.3`; footer timestamp

## Upstream 1.38.3 work intentionally not ported

The substantive behavior changes for the sketch/spike workflows live in upstream's `get-shit-done/workflows/sketch.md` (184 diff lines), `spike.md` (414 diff lines), and the corresponding wrap-up files. **Plugin has no `workflows/` directory.** Every `@~/.claude/get-shit-done/workflows/*.md` reference in plugin `SKILL.md` files (confirmed across all skills including sketch/spike themselves) dangles — the path isn't part of the plugin cache.

Porting the workflow files here would require either:
- Creating a `workflows/` dir in the plugin and fixing ~50 @-references to point at it (structural refactor; scope creep)
- Inlining workflow bodies into each SKILL.md (large one-time cost; changes skill-file architecture)

Both paths are v1.2 Phase 7 territory (File-Layout Drift Detector is the detector; a follow-up phase would be the remediation).

## Local patches verified preserved

- `bin/lib/core.cjs`: `resolveGsdRoot`, `resolveGsdDataDir`, `resolveGsdAsset`, `MODEL_ALIAS_MAP.opus = 'claude-opus-4-7'` — all intact (not touched by this sync; verified post-sync)

## Smoke tests (all passed)

- `node -e "require('./bin/lib/core.cjs').resolveGsdRoot"` returns `function`
- `node bin/gsd-tools.cjs current-timestamp date` → `{ "timestamp": "2026-04-21" }`
- `hooks.json`, `package.json`, `plugin.json`, `marketplace.json` all parse
- Version consistency across all 4 locations: 2.38.3
- `node bin/maintenance/rewrite-command-namespace.cjs --dry` → 0 replacements (clean)

## Notes for next sync

- The maintenance script skip pattern fix means re-running after v1.2 completion will correctly preserve v1.2-phases archives without needing another patch.
- Watch for upstream 1.38.4 (if any hotfix lands). The CHANGELOG currently stops at 1.38.0 — upstream hasn't documented 1.38.1–1.38.3 in their CHANGELOG, so relying on `diff -rq` against upstream release tarballs is the canonical mechanism for this repo.
