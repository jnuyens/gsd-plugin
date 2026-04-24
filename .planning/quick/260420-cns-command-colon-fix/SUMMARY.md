---
slug: 260420-cns-command-colon-fix
type: quick
created: 2026-04-20
completed: 2026-04-20
status: complete
commit: 5dfbbd2
---

# Summary: Command namespace dash→colon rewrite

## What changed

273 replacements of `/gsd-<skill>` → `/gsd:<skill>` across 100 files (skills, agents, references, templates, bin/ code, active planning docs, README).

Rewrite was driven by the live skill registry (81 entries from `skills/gsd-*/` directories). Regex `/gsd-(<alt>)(?![a-z-])` matches exact skill names with a negative-lookahead guard against partial matches.

## Bug found and fixed mid-task

Initial pattern lacked a leading boundary, so it also matched inside file-path contexts like `skills/resume-work/SKILL.md` and produced broken `skills/gsd:resume-work/SKILL.md` in 4 files (22 occurrences). Caught via a follow-up grep for `\b(skills|agents|...)/gsd:` pattern. Reverse-fixed in place via targeted regex. Verified zero path-damage remains.

## Scope and exclusions

Included: all tracked `.md`, `.cjs`, `.js`, `.json`, `.yml`, `.sh`, `.html` files except:
- `_research/` — CC source snapshot, not ours
- `.planning/milestones/v1.0-*` — shipped milestone archive
- `.planning/phases/04-*` — Phase 4 historical record (contains references from sessions where dash-style was live)
- `.planning/quick/2604(07–18)-*` — early quick-task summaries (historical)

## Verification

- Path-aware grep: zero remaining command-style `/gsd-<skill>` references.
- Smoke test: `node bin/gsd-tools.cjs current-timestamp date` runs cleanly.
- JSON integrity: `hooks.json`, `package.json` parse successfully.
- Balanced diff: 273 insertions + 273 deletions for the rewrite itself (pure substitution, no structural change).

## Out of scope

- **Post-sync normalization guard** (was option D in the initial analysis). Upstream GSD uses dash-style; every upstream sync will reintroduce them. Re-running this task's script after each sync is the workaround. A proper fix would be a CI check or a post-sync hook that greps for dash-style command refs and fails if found. Deferred.
- **Runtime shim** in `gsd-tools.cjs` to rewrite emitted `/gsd-*` → `/gsd:*` (was option C). Rejected earlier — static content is where most references live, and rewriting output wouldn't fix SKILL.md bodies Claude reads directly.

## Commit

`5dfbbd2` — fix(quick-260420-cns): rewrite /gsd-<skill> → /gsd:<skill> across plugin content
