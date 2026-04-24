---
phase: 07-file-layout-drift-detector
plan: 01
subsystem: maintenance-scripts
tags: [drift-detector, ci, ratchet, file-layout, maintenance, bootstrap]

requires: []
provides:
  - bin/maintenance/check-file-layout.cjs — standalone file-layout drift detector with classify + ratchet-compare logic
  - tests/drift-baseline.json — first committed baseline for the counts-based ratchet
  - .github/workflows/check-drift.yml — first CI workflow on this repo (hard-fails on drift regression)
  - README.md "Maintenance scripts" section documenting both detector and namespace-rewrite scripts
affects:
  - every future push and pull request (CI will run the detector)
  - future Phase 8 schema detector + Phase 9 unified check — both will add jobs to the same check-drift.yml rather than creating new workflow files
  - future /gsd:sync-upstream cycles — new dangling refs now hard-fail CI instead of landing silently

tech-stack:
  added: []
  patterns:
    - "Maintenance-script skeleton mirrors bin/maintenance/rewrite-command-namespace.cjs: git ls-files walk → text-extension filter → shared skip list (v\\d+\\. regex, 04- deprecated, pre-2026-04-19 quick tasks, _research/)"
    - "Counts-based ratchet (not file-by-file allowlist) per CONTEXT D-07: baseline JSON stores {total_dangling, has_plugin_counterpart, genuinely_missing}; detector fails if any count exceeds baseline"
    - "Capture-then-normalize regex pipeline: two global patterns (`~/` and `$HOME/` forms) → normalizeSubpath() strips trailing markdown punctuation → isRealRef() rejects placeholder-shaped captures (`{name}.md`, `<subpath>`) and captures without a file extension"
    - "CI bootstrap pattern: single workflow file keyed by theme (check-drift.yml), one job per detector, so future phases append jobs rather than files"

key-files:
  created:
    - bin/maintenance/check-file-layout.cjs
    - tests/drift-baseline.json
    - .github/workflows/check-drift.yml
  modified:
    - README.md

key-decisions:
  - "DEV-01: Detector normalizes captured subpaths (strips trailing ``*],.;:!?``) and rejects placeholder-shaped captures (`{name}`, `<subpath>`) and captures without a file extension — without this filtering the count is destabilized by doc-prose artifacts like `references/foo.md**` and `workflows/bar.md\\`.`"
  - "DEV-02: Baseline committed with measured counts (112/38/74) rather than CONTEXT's claimed census (107/37/70) — deviation explained in Deviations section. Raising (not lowering) a ratchet baseline to match measured reality is the safe direction."
  - "DEV-03: Task 4 smoke test uses a novel unique ref string (`xxx-smoke-test-unique-260421.md`) instead of the plan's `zzz-drift-test-fake.md` — the plan-suggested string already appears in the plan document itself and so is already in the baseline count, making it incapable of producing a regression. Deviation noted; smoke test passed."

requirements-completed:
  - DRIFT-01
  - DRIFT-02

duration: ~9min
completed: 2026-04-21
commit_hashes:
  - 63444dd
  - c1d87b6
  - 9450005
  - 262cd76
---

# Phase 7 Plan 01: File-Layout Drift Detector Summary

**Ships a standalone detector (`bin/maintenance/check-file-layout.cjs`) that catches dangling `@~/.claude/get-shit-done/*` references in plugin content, backed by a committed ratchet baseline and the first CI workflow on this repo — closes DRIFT-01 (detection) and DRIFT-02 (file-layout hard-fail in CI).**

## Performance

- **Tasks:** 4 / 4 complete
- **Commits:** 4
- **Files created:** 3 (`bin/maintenance/check-file-layout.cjs`, `tests/drift-baseline.json`, `.github/workflows/check-drift.yml`)
- **Files modified:** 1 (`README.md`)
- **Duration:** ~9 minutes (wall clock — includes the census-discrepancy investigation)
- **Completed:** 2026-04-21

## Per-Task Outcome

| # | Task                                                      | Commit    | Status                                                                                                                 |
| - | --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1 | Implement detector at `bin/maintenance/check-file-layout.cjs` | `63444dd` | PASS — all 10 source-level checks green; dry-run produces expected Category A / B / Total report                       |
| 2 | Generate and commit `tests/drift-baseline.json`           | `c1d87b6` | PASS (with deviation) — structural checks + sum invariant green; measured counts 112/38/74 deviate from CONTEXT 107/37/70 (see Deviations) |
| 3 | Bootstrap CI at `.github/workflows/check-drift.yml`       | `9450005` | PASS — all 7 source-level checks green; YAML parses cleanly via js-yaml                                                |
| 4 | README pointer + end-to-end smoke                         | `262cd76` | PASS (with deviation) — README checks green; smoke test passed after substituting a truly-unique test ref (plan's suggested ref was already self-referenced in the baseline) |

## File-Change Summary

- **`bin/maintenance/check-file-layout.cjs`** (created, 221 lines, executable 755) — New Node script implementing the file-layout drift detector. Mirrors `bin/maintenance/rewrite-command-namespace.cjs` for the skeleton (skip list, text-extension filter, git-ls-files walk). Adds drift-specific pieces: two ref patterns (`~/` and `$HOME/` forms), `normalizeSubpath()` that strips trailing markdown punctuation, `isRealRef()` that rejects placeholder-shaped captures, `classify()` that distinguishes Category A (has plugin counterpart) vs Category B (genuinely missing), `readBaseline()` / `writeBaseline()` round-trip, `report()` that prints the baseline-annotated summary, and `main()` that orchestrates with exit codes 0/1/2.

- **`tests/drift-baseline.json`** (created, 10 lines) — Initial baseline written via `--write-baseline`. Shape matches CONTEXT D-05 spec: `{ file_layout: { total_dangling, has_plugin_counterpart, genuinely_missing, generated_at, note } }`. Counts: 112/38/74 (deviation from CONTEXT's 107/37/70 claim — see Deviations).

- **`.github/workflows/check-drift.yml`** (created, 17 lines) — First CI workflow on the repo. Single `file-layout` job that runs the detector on `ubuntu-latest` with Node 22 on every push and pull request. Non-zero exit hard-fails the job. Workflow is named `check-drift.yml` (not `check-file-layout.yml`) so Phase 8 + 9 can add jobs to the same file per CONTEXT D-14.

- **`README.md`** (modified, +7 lines) — Inserted `## Maintenance scripts` section between `## Updating` and `## Migrating from legacy install`. Two bullets, one paragraph each: the new `check-file-layout.cjs` (description, CI integration, `--dry` / `--write-baseline` flags) and the existing `rewrite-command-namespace.cjs` (description, upstream-sync context).

## Decisions Made

All 14 CONTEXT decisions (D-01..D-14) were followed without change. Three execution-time decisions were added:

- **DEV-01 (detector hygiene):** The regex `[^\s'"\\)]+` from the plan captures markdown prose artifacts (`references/foo.md**`, `workflows/bar.md\`.`, etc.) that inflate counts and destabilize the ratchet. Added `normalizeSubpath()` + `isRealRef()` filtering so the detector measures real path references and ignores doc-prose. Without this filter, a plan-document edit that adds a new code fence could tick the count without adding a real ref.

- **DEV-02 (baseline vs CONTEXT census):** CONTEXT census claimed 107 unique refs (37 A / 70 B). After implementing Task 1's detector and hardening the regex, the measured counts are 112 / 38 / 74. Investigated thoroughly (see Deviations #1 below). The +5/+1/+4 delta is explainable by (1) the CONTEXT grep scoped to `skills/ agents/ references/ templates/` only, while D-09 specifies the full skip-list scope which includes the active Phase 7 plan doc itself (2 extra refs from plan examples) and `bin/` scripts (2 extra refs from the detector's own pattern-string literal), and (2) the CONTEXT's raw grep didn't consistently dedupe or clean markdown punctuation, so the 107 is a slightly off tally. Baseline was committed at the measured values — **raising a ratchet baseline to match reality is the safe deviation**; lowering would create a bogus floor.

- **DEV-03 (smoke test pollution):** Plan Task 4's suggested regression test string (`@~/.claude/get-shit-done/zzz-drift-test-fake.md`) literally appears in the plan document itself. Because the detector scans the active planning tree, that fake path is already in the baseline count. Appending it to `skills/next/SKILL.md` just duplicates an existing unique ref and does NOT trigger a regression. Substituted `xxx-smoke-test-unique-260421.md` (verified unique across the tree) and the smoke test then passed end-to-end as designed. Same issue applies to the plan's `fake-new-ref.md` example.

## Deviations from Plan

### 1. [Rule 2 - Correctness] Baseline counts 112/38/74 differ from CONTEXT's 107/37/70

- **Found during:** Task 2 (`--write-baseline` initial run).
- **What the plan said:** Task 2 acceptance criterion `total_dangling=107, has_plugin_counterpart=37, genuinely_missing=70`.
- **What I observed:** First run with the plan's verbatim regex produced 133/38/95 (lots of doc-prose noise). After adding the `normalizeSubpath()` + `isRealRef()` filters (DEV-01), counts stabilized at 112/38/74. Narrowing the scan to exactly the census scope (`skills|agents|references|templates`) still produced 109/38/71 — still not 107/37/70.
- **Investigation steps:**
  1. Reproduced the CONTEXT's grep command verbatim: `grep -rhoE "@[~]/\.claude/get-shit-done/[^'\"\\ )]+" skills/ agents/ references/ templates/ | sort -u | wc -l` → 121 raw captures.
  2. Applied progressively cleaner normalization strategies (strip trailing markdown punctuation, reject placeholder-shaped captures, require file extensions) — the best-faith clean floor is 109 unique refs in the census scope, 112 when scanning the full plugin including active planning docs and the detector's own source.
  3. Inspected A/B splits at each cleaning level: A stably counts 38 (31 `references/` + 7 `templates/`, all existing files); B stably counts 71–74 depending on scope (all `workflows/*.md` refs, zero false positives, including one `workflows/{name}.md` literal placeholder the filter now rejects).
  4. Confirmed no code changes landed in `skills/ agents/ references/ templates/` between 2026-04-21 (CONTEXT census date) and execution time. The upstream-sync commit `b4e8796` from earlier today touched `skills/sketch/SKILL.md` but did not add any `@~/.claude/get-shit-done/` refs.
- **Conclusion:** CONTEXT's 107/37/70 census is off by 2/1/1 relative to a rigorous detector. Most likely the planner's grep pipeline missed deduping a few near-dupes with different trailing punctuation, or they hand-filtered out a placeholder-looking entry we now include. The detector is correct; the CONTEXT number is slightly inaccurate.
- **Fix:** Committed `tests/drift-baseline.json` with the measured-and-hardened values (112/38/74). Added documentation of the discrepancy in the baseline commit message (`c1d87b6`) and in this Summary. **Raising the baseline above CONTEXT** still preserves the ratchet's purpose: any future addition of dangling refs hard-fails CI. The only thing we lose is the pre-baked "you should be at 107 to start" claim — which was slightly wrong anyway.
- **Files affected:** `tests/drift-baseline.json` (committed with 112/38/74).
- **Commit:** `c1d87b6`.
- **Follow-up:** The candidate follow-up quick task to auto-fix the 38 Category A refs will bring `total_dangling` down to 74 and `has_plugin_counterpart` to 0 — both a clear reduction the ratchet will accept (and the operator can run `--write-baseline` to lock in the gain).

### 2. [Rule 1 - Plan self-collision] Smoke test's suggested regression string is self-defeating

- **Found during:** Task 4 smoke test initial run.
- **What the plan said:** Append `@~/.claude/get-shit-done/zzz-drift-test-fake.md` to `skills/next/SKILL.md`, expect the detector to exit 1 with Status: FAIL.
- **What I observed:** The detector exited 0 with Status: PASS — the regression was NOT detected. Cause: `zzz-drift-test-fake.md` literally appears inside the plan document (`.planning/phases/07-file-layout-drift-detector/07-01-PLAN.md`), which is scanned by the detector, so the ref was already counted in the baseline's `total_dangling=112`. Appending it to SKILL.md adds a second occurrence of the same unique subpath; Set-based dedupe collapses it to the same count.
- **Fix:** Substituted a novel unique ref (`@~/.claude/get-shit-done/xxx-smoke-test-unique-260421.md`) that's confirmed absent from the entire tree via `grep -rh`. Re-ran the smoke test — all four transitions (clean → regression → clean-after-revert → dry-run) behaved as specified. Same issue applies to the plan's other example ref `fake-new-ref.md` (also self-referenced in the plan).
- **Files affected:** None persisted — smoke test cleans up its own pollution via `git checkout -- skills/next/SKILL.md`. Final `git status` confirmed no lingering changes to `skills/`.
- **Commit:** No separate commit — the deviation is in test methodology, not in any committed artifact. Task 4's README commit (`262cd76`) covers only the documentation change.
- **Follow-up:** A future quick task that archives this phase to `.planning/milestones/v1.2-phases/` will automatically hide `zzz-drift-test-fake.md` / `fake-new-ref.md` from the detector's scan (the skip list covers archived milestones). Once that happens, the plan's original smoke-test string would actually work — but by then the plan is done and it doesn't matter.

## Issues Encountered

- Execution-time regex escaping in the plan's `<automated>` verify blocks — the triple-nested quoting (JSON → shell → regex literal) stripped backslashes and broke the Node `-e` invocations. Worked around by writing the same semantic checks to a file (`/tmp/phase7-verify-task1.cjs`) and running them via `node <file>`. The plan flagged this risk explicitly and authorized the workaround.
- YAML parsing tool unavailability — neither `yaml` nor `js-yaml` is installed in the base Node environment, and `pyyaml` is blocked by PEP 668 on this machine. Worked around by `npm install --silent --no-save js-yaml` into `/tmp/phase7-yaml/` and running `node -e` from there. YAML parsed OK (keys: `name`, `on`, `jobs`; jobs: `file-layout`).
- No other issues.

## Verification Results

### Task 1 automated verify (source-level)

```
ok: shebang
ok: strict mode
ok: skip list matches precedent
ok: text extension filter
ok: tilde-form ref pattern
ok: HOME-form ref pattern
ok: classify function
ok: writeBaseline function
ok: ratchet comparison
ok: exit 1 on regression
```

### Task 1 automated verify (dry-run smoke)

```
exit: 0
File-layout drift detector
==========================
Scanned: 302 plugin-tracked text files

Dangling refs found:
  Category A (repairable, has plugin counterpart):      38
  Category B (genuinely missing):                       74
  Total:                                               112

Dry-run mode — not comparing to baseline.
```

PASS: dry-run produces expected report.

### Task 2 automated verify (structural — deviation-adjusted)

```
ok: total_dangling is set
ok: has_plugin_counterpart set
ok: genuinely_missing is set
ok: sum matches               (38 + 74 === 112)
ok: generated_at present
ok: note present

Actual counts: {"total_dangling":112,"has_plugin_counterpart":38,"genuinely_missing":74,...}
```

The plan's original check (`===107`, `===37`, `===70`) does NOT pass — see Deviation #1.

### Task 2 automated verify (ratchet vs self)

```
exit: 0
Status: PASS — no regression, baseline matches.
```

### Task 3 automated verify (source-level)

```
ok: name
ok: push trigger
ok: pr trigger
ok: checkout action
ok: node setup
ok: node 22
ok: runs detector
```

### Task 3 automated verify (YAML parse)

```
YAML OK — top-level keys: [ 'name', 'on', 'jobs' ]
jobs: [ 'file-layout' ]
```

### Task 4 automated verify (README source)

```
ok: Maintenance scripts section
ok: check-file-layout mentioned
ok: rewrite-command-namespace mentioned
ok: references baseline
```

### Task 4 automated verify (end-to-end smoke)

```
Test 1 (clean):              exit 0, Status: PASS     → PASS
Test 2 (regression):         exit 1, Status: FAIL     → PASS (with Deviation #2)
Test 3 (clean-after-revert): exit 0, Status: PASS     → PASS
Test 4 (dry-run):            exit 0, "Dry-run mode"   → PASS
Post-test git status:        (clean, only README.md+README add from this task)
```

## Next Phase Readiness

- DRIFT-01 (file-layout detector) and DRIFT-02's file-layout portion (hard-fail CI) are live. First CI push will exercise the workflow on the next commit.
- `bin/maintenance/check-file-layout.cjs` + `bin/maintenance/rewrite-command-namespace.cjs` share a mostly-identical skeleton (skip list, text-ext filter, git-ls-files walk). Phase 9's unified `check-drift.cjs` will extract the shared helper — Phase 7 intentionally did not pre-extract per CONTEXT D-11.
- `.github/workflows/check-drift.yml` is structured so Phase 8 (schema drift detector) can add a second job and Phase 9 (unified orchestrator) can add a third — per CONTEXT D-14.
- The measured-vs-claimed baseline discrepancy (112 vs 107) is a planning artefact, not blocking. A short follow-up could re-census the CONTEXT values for accuracy, but it's cosmetic.

## Follow-ups Spawned

- **Candidate quick task — Category A auto-fix:** 38 mechanical path rewrites (`@~/.claude/get-shit-done/<X>` → `@<X>`) would drop `has_plugin_counterpart` from 38 to 0 and `total_dangling` from 112 to 74. The detector will happily accept this reduction on the next run, and the operator can `--write-baseline` to lock it in.
- **Phase 8 (schema drift detector):** planned next; will add a second job to `.github/workflows/check-drift.yml`.
- **Phase 9 (unified `check-drift.cjs`):** extracts the shared skeleton from the two detectors into `bin/maintenance/lib/` (TBD).
- **Structural question for Category B:** 70+ `workflows/*.md` refs dangle because the plugin has no `workflows/` directory. Needs a separate decision (inline content into skills, create plugin-local `workflows/`, or drop refs). Explicitly out of Phase 7 scope per CONTEXT D-12.

## Self-Check

- `bin/maintenance/check-file-layout.cjs` — FOUND (executable, 221 lines, runs cleanly in dry-run + default + --write-baseline modes)
- `tests/drift-baseline.json` — FOUND (valid JSON, sum invariant 38+74=112 holds)
- `.github/workflows/check-drift.yml` — FOUND (parses as valid YAML via js-yaml)
- `README.md` — modified (Maintenance scripts section present between Updating and Migrating from legacy install)
- Commits `63444dd`, `c1d87b6`, `9450005`, `262cd76` — all FOUND in `git log`
- No lingering uncommitted changes to `skills/` or any other plugin content (smoke test cleaned up)

## Self-Check: PASSED

---
*Phase: 07-file-layout-drift-detector*
*Completed: 2026-04-21*
