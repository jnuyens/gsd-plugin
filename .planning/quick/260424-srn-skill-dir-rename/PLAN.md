---
slug: 260424-srn-skill-dir-rename
type: quick
created: 2026-04-24
status: in-progress
---

# Quick: Rename `skills/gsd-<name>/` → `skills/<name>/` to fix duplicate `gsd-` prefix in command IDs

## Problem

Claude Code's plugin loader (`loadPluginCommands.ts:67-81`) derives command IDs from the skill parent-directory basename:

```javascript
if (isSkill) {
  const commandBaseName = basename(skillDirectory)
  return `${pluginName}:${commandBaseName}`
}
```

Plugin name is `gsd` (from `.claude-plugin/plugin.json`). Current skill dirs are `skills/gsd-add-todo/` etc. → registered commands become `/gsd:gsd-add-todo`. The tab-completion MENU shows the frontmatter `name:` field (`/gsd:add-todo`, clean) — but accepting the suggestion inserts the actual ID (`/gsd:gsd-add-todo`, duplicated). UX bug.

## Fix

Rename 81 skill directories from `skills/gsd-<name>/` to `skills/<name>/`. Directory rename alone fixes the IDs; no frontmatter changes needed (frontmatter `name: gsd:<skill>` is already the desired form and stays the display string).

## Execution plan

1. **Rename via `git mv`** — preserves file-level git history. 81 `git mv` calls.
2. **Update 48 path references** across 15 files — any `skills/gsd-<skill-name>/...` path reference where `<skill-name>` is a known skill gets rewritten to `skills/<skill-name>/...`.
3. **Update `bin/maintenance/rewrite-command-namespace.cjs`** — its skill-enumeration logic (`readdirSync('skills').filter(d=>d.startsWith('gsd-'))`) becomes obsolete. Replace with a `SKILL.md`-presence filter since after the rename, every skill dir is a bare skill name.
4. **Smoke-test all maintenance scripts** — `check-file-layout.cjs` (should stay at 109/38/71 since it scans `references/X` / `workflows/Y`, not `skills/`), `check-handoff-schema.cjs`, `rewrite-command-namespace.cjs --dry` (should still report 0 — colon form is fine), `check-drift.cjs` umbrella (should pass).

## Exclusions

- Frontmatter `name:` field in SKILL.md files — stays as `gsd:<skill>`. Used for display.
- Historical/archive dirs — `.planning/milestones/v1.0-*`, `.planning/milestones/v1.1-phases/04-*`, `.planning/quick/` pre-2026-04-19 — not rewritten; they're snapshots of past state.
- `_research/` — upstream artifacts, not ours.

## Version bump

NOT in this task. Version bump (2.38.3 → 2.38.4) happens at `/gsd:complete-milestone v1.2` tag time; this change rides the v1.2 release.

## Risks

- **Muscle memory** — if users have typed `/gsd:gsd-<name>` repeatedly, autocomplete history will suggest the old form. Fuzzy match still catches it. Short-term UX hiccup; long-term fix.
- **Unanticipated path ref** — if any code/doc has `skills/gsd-X` without passing through the regex (e.g., in a comment, a minified build artifact, a non-.md file type), it would be missed. Mitigation: 48 references across 15 files is small enough to eyeball.
- **Upstream-sync compatibility** — future syncs produce `commands/gsd/<name>.md` (no `gsd-` prefix in basename, already). That maps naturally to `skills/<name>/SKILL.md` in the new structure. Closer alignment with upstream, not further.

## Verification

After the change:
- `ls skills/` shows all dirs without `gsd-` prefix (check a sample — `add-todo`, `plan-phase`, `quick`, etc.)
- `node bin/maintenance/check-drift.cjs` exits 0 (umbrella catches any regression across all three detectors)
- `node bin/gsd-tools.cjs current-timestamp date` still works (plugin CLI not affected)
- New skill registry has 81 bare-name dirs
- Rewrite script dry-run returns 0 (colon form already consistent throughout plugin content)
