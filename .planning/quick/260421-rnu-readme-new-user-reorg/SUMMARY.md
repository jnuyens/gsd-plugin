---
slug: 260421-rnu-readme-new-user-reorg
type: quick
created: 2026-04-21
completed: 2026-04-21
status: complete
commit: 5b5efd5
---

# Summary: README reorganization

## What changed

`README.md` — pure structural reorganization. No content deletions.

### Before
- Sections for new users (Install, Quick start, Updating, Maintenance scripts) were **interleaved** with sections for upstream-GSD users (What changed from upstream, Testing without affecting your install, Migrating from legacy install)
- Detailed Versioning explanation sat between the tagline and the install steps — useful meta, but not first-interest for a new user landing on the repo

### After
- New-user path runs cleanly top-to-bottom: tagline → features → feature tour → **install → quick start → updating → maintenance**
- Horizontal rule (`---`) separates new-user content from a single `## For users of upstream GSD` umbrella section at the bottom
- Upstream-user umbrella holds all migration + isolation + rollback content as subsections
- Versioning demoted to a section near the end (kept the one-line "Plugin version: 2.38.3" metadata at top)

## Final section order

| # | Section | Audience |
|---|---------|----------|
| 1 | *(title + Based on + Plugin version + tagline)* | everyone |
| 2 | What GSD Plugin provides | new user |
| 3 | Session continuity + drift resilience | new user (feature tour) |
| 4 | Installation | new user |
| 5 | Quick start | new user |
| 6 | Updating | new user |
| 7 | Maintenance scripts | new user (dev tools overview) |
| — | *horizontal rule* | separator |
| 8 | For users of upstream GSD (umbrella) | ex-upstream |
| 8a | └ What changed from upstream GSD | ex-upstream (comparison table) |
| 8b | └ Automatic migration on install | ex-upstream |
| 8c | └ Manual migration steps | ex-upstream |
| 8d | └ Testing the plugin without affecting your current install | ex-upstream |
| 8e | └ Rolling back | ex-upstream |
| 8f | └ Migration audit | ex-upstream |
| 8g | └ Verifying migration | ex-upstream |
| 9 | Versioning | meta |
| 10 | Credits | meta |
| 11 | License | meta |

## Verification

- 10 top-level `## ` headings (was 11; "What changed from upstream GSD" folded into the umbrella as `### What changed from upstream GSD`)
- Spot-checked 11 key phrases (install commands, `CLAUDE_PLUGIN_ROOT`, `~/.claude/get-shit-done-legacy`, `check-drift.cjs`, TACHES, Jasper Nuyens, etc.) — all present with expected counts
- Word count 1,752 (minor increase from the "Skip this entirely if you're a new user" clarifier added to the umbrella section)
- No install command, migration step, or rollback instruction was deleted

## Commit

`5b5efd5` — docs(quick-260421-rnu): reorganize README — new-user flow first, upstream-user content trailing
