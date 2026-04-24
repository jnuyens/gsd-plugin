# Phase 7: File-Layout Drift Detector - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect dangling `@~/.claude/get-shit-done/*` and `@$HOME/.claude/get-shit-done/*` references in plugin content before they ship. The plugin has 107 unique dangling references today — 37 have a plugin-local counterpart (wrong path form) and 70 are genuinely missing (all in `workflows/`). Phase 7 ships a detector + ratchet baseline + CI gate; it does NOT fix the existing drift. Remediation of the 37 repairable refs is a separate follow-up (candidate quick task). Remediation of the 70 missing `workflows/` refs is a structural question deferred pending wider scope decision.

This is v1.2's first delivered phase and bootstraps the first CI on this plugin repo.

</domain>

<scope_census>
## Census of existing dangling references

Counted 2026-04-21 via `grep -rhoE "@[~]/\.claude/get-shit-done/[^'\"\\ )]+" skills/ agents/ references/ templates/`:

- **Total unique dangling paths:** 107
- **Category A — has plugin-local counterpart (repairable):** 37 (e.g., `@~/.claude/get-shit-done/references/debugger-philosophy.md` → plugin has `references/debugger-philosophy.md`)
- **Category B — no plugin-local counterpart (genuinely missing):** 70 — **all in `workflows/`**

Category A is auto-fixable via path rewrite (`@~/.claude/get-shit-done/<subpath>` → `@./<subpath>` or equivalent). Category B requires human decision per file: add the file, inline the content into the referencing skill, or drop the reference if no longer needed.

The `@$HOME/.claude/` alternate form shows 0 occurrences today but is part of the scan to prevent reintroduction.

</scope_census>

<decisions>
## Implementation Decisions

### Detector structure

- **D-01:** Detector lives at `bin/maintenance/check-file-layout.cjs`. One-detector-per-file in `bin/maintenance/`. Aligns with Phase 9's plan to have `check-drift.cjs` be a unified orchestrator that calls each per-category detector.
- **D-02:** Detector classifies every `@~/.claude/get-shit-done/<subpath>` ref (and `@$HOME/.claude/get-shit-done/` alternate) into **Category A** (plugin has `<subpath>`) or **Category B** (plugin doesn't). Reports both counts.
- **D-03:** Runs from repo root. Walks `git ls-files`. Filters to text extensions (`.md`, `.cjs`, `.js`, `.json`) — same pattern as the namespace rewrite script.
- **D-04:** `--dry` flag for previews (no baseline write). Default mode reads baseline, compares, exits 0 or non-zero.

### Ratchet and baseline

- **D-05:** Baseline stored at `tests/drift-baseline.json`. Starts as a counts object:
  ```json
  {
    "file_layout": {
      "total_dangling": 107,
      "has_plugin_counterpart": 37,
      "genuinely_missing": 70,
      "generated_at": "2026-04-21"
    }
  }
  ```
- **D-06:** CI compares current detector output to baseline. **PASS** if every count is ≤ baseline; **FAIL** if any count increased. Ratchets down over time as drift is fixed — baseline numbers can be lowered with the same commit that fixes drift.
- **D-07:** Not using a file-by-file allowlist. Counts-based ratchet is simpler, lets anyone fix drift without updating a file list, and catches equal-number drift where a refactor swaps one dangling ref for another (because the set identity would change even when totals don't — but counts-only lets this slip; acceptable trade-off for simplicity in Phase 7, tightenable later if the slip matters).
- **D-08:** Baseline regeneration is a separate subcommand: `--write-baseline`. Only run intentionally — CI never runs this.

### What's in scope / out of scope

- **D-09:** Only scans plugin-tracked files. `_research/`, `.planning/milestones/v*`, `.planning/phases/04-*` (deprecated path), and pre-2026-04-19 `.planning/quick/` tasks are historical archives — excluded. Same skip list as `bin/maintenance/rewrite-command-namespace.cjs` after today's fix (matches `^\.planning\/milestones\/v\d+\.`).
- **D-10:** Relative `@./`, `@.planning/...`, `@package.json` etc. are project-local or internal — NOT scanned. Detector is specifically about dangling external-system paths (`~/.claude/` form).
- **D-11:** Auto-fix for Category A repairable refs is **out of Phase 7**. Split into a follow-up task (mechanical, sed-style rewrite, gets baseline to 70). Rationale: Phase 7 is "detector"; conflating detector + remediation breaks the milestone theme (detect-and-hard-fail).
- **D-12:** Fix for Category B (workflows/*) is a structural question — needs a separate phase or milestone to answer "do we inline workflow content, create plugin-local `workflows/`, or drop the references." Explicitly NOT Phase 7.

### CI bootstrap

- **D-13:** Workflow at `.github/workflows/check-drift.yml`. Triggers: `push` to any branch, `pull_request`. Single job: checkout, set up Node 22, run `node bin/maintenance/check-file-layout.cjs`. No caching (fast enough).
- **D-14:** First CI on this repo. Future phases (Phase 8 schema detector, Phase 9 unified check) will extend this workflow rather than create new ones.

### Claude's discretion

- Exact JSON shape of the report output (as long as it's parseable and includes per-category counts).
- Report formatting (plain text vs ANSI-colored; GitHub Actions annotations are nice-to-have but not required).
- Whether to include a `--json` flag for machine-readable output (probably yes for Phase 9's unification needs, but not mandatory in Phase 7).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Precedent to mirror
- `bin/maintenance/rewrite-command-namespace.cjs` — established pattern for maintenance scripts. Same:
  - Runs from repo root via `git ls-files`
  - Skip list for historical archives (recently generalized to `/^\.planning\/milestones\/v\d+\./`)
  - Text-extension filter
  - Never-throw contract (silent-on-missing inputs)
  - `--dry` flag for previews
  Phase 7's detector should pattern-match this precedent exactly.

### Plugin layout
- `skills/`, `agents/`, `references/`, `templates/`, `contexts/` — directories that contain plugin content with `@~/.claude/...` refs to detect
- No `workflows/` dir in the plugin — this is the structural root cause of 70/107 dangling refs

### Testing / CI
- No existing `tests/` or `.github/` — Phase 7 bootstraps both:
  - `tests/drift-baseline.json` — the ratchet file
  - `.github/workflows/check-drift.yml` — first CI workflow

### Versioning
- This is the first v1.2 phase. Next plugin release after Phase 7 lands should be `v2.38.4` (plugin-only patch bump). Release can wait until Phase 7 + 8 + 9 all ship (single v1.2 release) OR ship per-phase (faster feedback). Decision deferred to post-phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `bin/maintenance/rewrite-command-namespace.cjs` — the precedent (just added 2026-04-20, bug-fixed 2026-04-21). Skip-list + git-ls-files + text-extension pattern. Copy the skeleton.
- `bin/gsd-tools.cjs` current-timestamp + hook dispatch — shows the CLI entry convention. Phase 7 detector is standalone (not wired into gsd-tools.cjs), matches the rewrite-command-namespace precedent.

### Anti-patterns to avoid
- Don't duplicate the skip-list between detectors. Phase 9 will extract a shared helper — Phase 7 keeps the skip list inline and Phase 9 extracts. Don't extract prematurely.
- Don't conflate detection with fix. The namespace rewrite script does both (scan + rewrite); this detector is scan-only per D-11.

### Integration points
- `tests/drift-baseline.json` — new; baseline file. Creating `tests/` dir for the first time is intentional.
- `.github/workflows/check-drift.yml` — new; first CI workflow. Creating `.github/` dir for the first time is intentional.

</code_context>

<specifics>
## Specific Ideas

**Detector exit codes:**
- `0` — counts at-or-below baseline (PASS)
- `1` — counts above baseline (FAIL — drift regressed)
- `2` — environment error (not a git repo, baseline file missing, etc.)

**Report format (plain):**
```
File-layout drift detector
==========================

Scanned: 300 plugin files
Dangling refs found:
  Category A (repairable, has plugin counterpart): 37 [baseline: 37]
  Category B (genuinely missing):                   70 [baseline: 70]
  Total:                                           107 [baseline: 107]

Status: PASS — no regression beyond baseline
```

**Ratchet comparison:**
- Every count in the output must be ≤ corresponding baseline count. Any regression fails.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-fix for Category A refs** — 37 mechanical rewrites of `@~/.claude/get-shit-done/<X>` → plugin-relative path. Straightforward follow-up task. Would bring baseline to 70/0/70.
- **Workflow content remediation** — 70 Category B refs. Needs a separate phase or milestone to decide: inline content into skills, create plugin-local `workflows/`, or drop refs. Structural question.
- **Per-file allowlist** (instead of counts) — D-07 chose counts for simplicity. Could tighten later if needed.
- **GitHub annotations** — nice UX for CI failures (`::error file=...::`). Not required; counts report is sufficient.
- **Mapper skip list abstracted into a shared config** — will happen in Phase 9 when `check-drift.cjs` unifies detectors. Not yet.

</deferred>

---

*Phase: 07-file-layout-drift-detector*
*Context gathered: 2026-04-21*
