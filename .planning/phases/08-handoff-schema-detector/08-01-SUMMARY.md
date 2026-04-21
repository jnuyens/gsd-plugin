---
phase: 08-handoff-schema-detector
plan: 01
subsystem: maintenance-scripts
tags: [schema, json-schema, drift-detector, ci, upstream-compat, maintenance, ajv]

requires:
  - Phase 7 (check-drift.yml workflow established, detector pattern in check-file-layout.cjs)
  - R-1 research (upstream schema stability; plugin as strict superset)
provides:
  - schema/handoff-v1.json — committed JSON Schema draft-07 for the 19-field HANDOFF.json contract (17 required + 2 optional)
  - schema/fixtures/handoff-sample.json — positive-validation fixture using all 19 fields
  - bin/maintenance/check-handoff-schema.cjs — schema validator runs writeCheckpoint() in tmp dir + ajv validate
  - bin/maintenance/check-upstream-schema.cjs — upstream drift detector; downloads/uses-cached upstream tarball, extracts fields from pause-work.md, diffs against plugin schema
  - .github/workflows/check-drift.yml — extended with handoff-schema job alongside existing file-layout job (parallel runners)
  - ajv + ajv-formats as devDependencies (not runtime)
  - README "Maintenance scripts" section documents both new scripts
  - PROJECT.md "After each upstream GSD sync" checklist formalizes namespace-rewrite (step 6) and schema-drift-check (step 7)
affects:
  - every future push and pull request (CI now runs schema validator in parallel to file-layout detector)
  - every future upstream sync (post-sync checklist now includes schema-drift check against the just-synced version)
  - Phase 9's unified check-drift.cjs will wrap check-file-layout.cjs + check-handoff-schema.cjs (and possibly check-upstream-schema.cjs as optional)
  - future upstream schema changes — detector catches any new upstream field, missing required field, or shape drift before the plugin ships against the synced version

tech-stack:
  added:
    - "ajv ^8.18.0 — JSON Schema validator, dev-only"
    - "ajv-formats ^3.0.1 — format validators for date-time, dev-only"
  patterns:
    - "JSON Schema draft-07 with `required` + `properties` + `additionalProperties: true` — strictness on field types and required-set, permissiveness on future extensions"
    - "Schema-vs-source-of-truth twinning — schema/handoff-v1.json and bin/lib/checkpoint.cjs are deliberately NOT coupled via codegen; both are the contract, one validated at CI, the other generating at runtime"
    - "Validator isolates its target via fs.mkdtempSync — never writes to real .planning/HANDOFF.json, cleanup in finally{} block"
    - "Upstream drift detector prefers cached tarball (/tmp/gsd-sync-<clean>/) over re-downloading — offline-capable when past sync artifacts are preserved"
    - "Placeholder substitution for pseudo-JSON parsing uses tight char class `[a-zA-Z0-9_ ,]+` not greedy `[^}]*` — required to distinguish placeholders from nested JSON objects"
    - "CI split: ajv-requiring jobs (handoff-schema) add `cache: npm` + `npm ci`; deps-free jobs (file-layout) remain lean"

key-files:
  created:
    - schema/handoff-v1.json
    - schema/fixtures/handoff-sample.json
    - bin/maintenance/check-handoff-schema.cjs
    - bin/maintenance/check-upstream-schema.cjs
    - package-lock.json
  modified:
    - .gitignore
    - package.json
    - .github/workflows/check-drift.yml
    - README.md
    - .planning/PROJECT.md

key-decisions:
  - "DEV-01: Tightened placeholder-substitution regex in check-upstream-schema.cjs from the plan's `\\{[^}]*\\}` to `\\{[a-zA-Z0-9_ ,]+\\}`. The plan's skeleton was subtly broken — the greedy pattern matched from the outer JSON's `{` straight through to the first `}` inside the first placeholder, destroying the top-level object shape and breaking JSON.parse. Two-pass substitution (quoted vs unquoted placeholders) also added to avoid doubled-quote artifacts like `\"\"placeholder\"\"`. See Deviation #1."
  - "DEV-02: Cached upstream tarball path uses stripped version (no leading 'v') for BOTH outer and inner directory names. The plan's skeleton used `gsd-sync-\${version}` which would mis-resolve when `UPSTREAM_VERSION=v1.38.3` because the real cached dir is `/tmp/gsd-sync-1.38.3/` (established by past sync runs). Detector now strips 'v' consistently. See Deviation #2."
  - "DEV-03: Added `node_modules/` to .gitignore. Not present before Phase 8 (no node dev deps before). Plan Task 1 acceptance criterion required node_modules not committed; adding it to .gitignore is the clean Rule 3 fix."

requirements-completed:
  - SCHEMA-01
  - SCHEMA-02
  - SCHEMA-03
  - DRIFT-02 (schema portion — file-layout portion was satisfied in Phase 7; namespace portion pending Phase 9)

duration: ~12min
completed: 2026-04-21
commit_hashes:
  - c3825d5
  - 1626112
  - f18d357
  - 3d67575
  - fdcab58
  - cb37532
---

# Phase 8 Plan 01: HANDOFF Schema Baseline + Detector Summary

**Ships the committed `schema/handoff-v1.json` (19-field JSON Schema draft-07), a schema validator that runs `writeCheckpoint()` in an isolated tmp dir and validates against the schema via ajv (runs in CI on every push/PR), and an upstream drift detector that diffs upstream GSD's declared `pause-work` field set against the committed schema (runs post-sync, not in CI) — closes SCHEMA-01 (baseline), SCHEMA-02 (CI validation), SCHEMA-03 (upstream drift detection), and the schema portion of DRIFT-02.**

## Performance

- **Tasks:** 6 / 6 complete
- **Commits:** 6
- **Files created:** 5 (`schema/handoff-v1.json`, `schema/fixtures/handoff-sample.json`, `bin/maintenance/check-handoff-schema.cjs`, `bin/maintenance/check-upstream-schema.cjs`, `package-lock.json`)
- **Files modified:** 5 (`.gitignore`, `package.json`, `.github/workflows/check-drift.yml`, `README.md`, `.planning/PROJECT.md`)
- **Duration:** ~12 minutes (wall clock — includes one plan-skeleton-bug investigation in Task 4)
- **Completed:** 2026-04-21

## Per-Task Outcome

| # | Task                                                         | Commit    | Status                                                                                                                 |
| - | ------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1 | Add `ajv` + `ajv-formats` as devDependencies                 | `c3825d5` | PASS — both deps resolve; `.gitignore` updated to exclude `node_modules/` (deviation #3); `package-lock.json` committed alongside |
| 2 | Write `schema/handoff-v1.json` + positive fixture             | `1626112` | PASS — all 6 structural checks green (draft-07, 17 required, source/partial optional, version const, additionalProperties true); fixture validates against schema |
| 3 | Implement `bin/maintenance/check-handoff-schema.cjs`          | `f18d357` | PASS — all 12 source-level checks green; end-to-end smoke passes (Status: PASS, 19/19 fields present, 17/17 required, 2/2 optional) |
| 4 | Implement `bin/maintenance/check-upstream-schema.cjs`         | `3d67575` | PASS (with deviation) — `UPSTREAM_VERSION=v1.38.3` exits 0 with Status: PASS; plan's placeholder regex + cached-dir path both had bugs, fixed inline (see Deviations #1 + #2) |
| 5 | Extend `.github/workflows/check-drift.yml` with handoff-schema job | `fdcab58` | PASS — all 6 source-level checks green; YAML parses clean via js-yaml with both jobs (`file-layout`, `handoff-schema`); `check-upstream-schema.cjs` deliberately absent per D-10 |
| 6 | README + PROJECT.md pointers                                 | `cb37532` | PASS — README has both script entries + UPSTREAM_VERSION doc; PROJECT.md post-sync checklist has namespace-rewrite (step 6) + schema-drift-check (step 7) |

## File-Change Summary

- **`schema/handoff-v1.json`** (created, 96 lines) — JSON Schema draft-07 describing the 19-field HANDOFF.json contract. Fields split 17 required (upstream-compat) + 2 optional (plugin-only `source` + `partial`). Types match what `bin/lib/checkpoint.cjs` `generateCheckpoint` emits verbatim: `version: const "1.0"`, `timestamp: date-time`, `task: number|string|null`, `status: enum ["paused", "auto-checkpoint"]`, array-of-object fields for `completed_tasks`/`remaining_tasks`/`blockers`/`human_actions_pending`/`decisions`, raw array for `uncommitted_files`. `additionalProperties: true` by design (per CONTEXT D-02 — leave room for future plugin extensions without schema churn). Top-level `$comment` explains the 17+2 split and points to 08-RESEARCH.md.

- **`schema/fixtures/handoff-sample.json`** (created, 35 lines) — Realistic HANDOFF.json fixture using all 19 fields. Positive-validation test: validates cleanly against `schema/handoff-v1.json`. Hand-written (not captured from writeCheckpoint) so it includes non-null values in `phase`/`plan`/`task`/etc. — exercises the non-null type branches of the schema (plain writeCheckpoint against a tmp dir produces mostly-null values).

- **`bin/maintenance/check-handoff-schema.cjs`** (created, 119 lines, executable 755) — Schema validator. `'use strict'`, shebang, repo-root env guard, try/require of `ajv` + `ajv-formats` (exit 2 if missing), require of `bin/lib/checkpoint.cjs` via `require(path.resolve(...))`. Main flow: `fs.mkdtempSync(os.tmpdir() + '/gsd-schema-')` → `mkdirSync('.planning')` → write minimal `STATE.md` stub → `writeCheckpoint(tmpDir, { source: 'manual-pause' })` → read back `.planning/HANDOFF.json` → ajv.compile + validate. Prints "HANDOFF Schema Validator" header, field counts (present / required / optional), Status line, exit 0/1/2 per convention. Cleanup via `deleteCheckpoint(tmpDir) + fs.rmSync(tmpDir, {recursive:true, force:true})` in `finally{}` block — never leaks tmp dirs.

- **`bin/maintenance/check-upstream-schema.cjs`** (created, 175 lines, executable 755) — Upstream drift detector. Resolves target version from `UPSTREAM_VERSION` env var OR `gh release view --repo gsd-build/get-shit-done` fallback. Uses cached `/tmp/gsd-sync-<clean>/get-shit-done-<clean>/` if present, else downloads via `gh release download ... --archive=tar.gz` + `tar xzf`. Parses `get-shit-done/workflows/pause-work.md` `<step name="write_structured">` fenced JSON block; substitutes placeholders with a two-pass regex (`"{...}"` → `"placeholder"`, `{...}` → `0`), strips trailing commas, `JSON.parse`, takes `Object.keys(parsed)` as upstream field list. Compares to `schema.required` (17 upstream-compat fields) and `Object.keys(schema.properties)` (all 19). FAIL if upstream has a field not in plugin schema, OR plugin required field not in upstream. PASS otherwise. Exit 0/1/2 per convention.

- **`.github/workflows/check-drift.yml`** (modified, +14 lines) — Added second job `handoff-schema` alongside existing `file-layout` job. Runs in parallel on a separate ubuntu-latest runner (no `needs:` dependency — either regression fails the workflow independently). `cache: 'npm'` + `npm ci` steps added since this job needs the dev deps (ajv, ajv-formats); file-layout job keeps its no-install profile. `check-upstream-schema.cjs` deliberately NOT added (per CONTEXT D-10: post-sync-only, requires network + gh + rate limits).

- **`README.md`** (modified, +2 lines) — Added two bullets to the existing `## Maintenance scripts` section (between `check-file-layout.cjs` / `rewrite-command-namespace.cjs` and end-of-section). Each bullet describes the script, its CI status (in-CI for check-handoff-schema, NOT-in-CI for check-upstream-schema), key environment variable (`UPSTREAM_VERSION`), and exit-code contract.

- **`.planning/PROJECT.md`** (modified, +2 lines) — Added steps 6 (rewrite-command-namespace post-sync) and 7 (check-upstream-schema post-sync) to the "After each upstream GSD sync" checklist. Step 6 was previously a memory rule; now it's formal. Step 7 is new for Phase 8. Existing steps 1-5 unchanged.

- **`package.json`** (modified, +4 lines) — Added `devDependencies` block with `ajv: "^8.18.0"` + `ajv-formats: "^3.0.1"`. These are the first devDeps on the project (empty `devDependencies` key before this phase).

- **`package-lock.json`** (created, +~80 lines) — Lockfile for the ajv + ajv-formats install tree. 6 packages pinned transitively. Committed alongside `package.json` per plan Task 1 acceptance.

- **`.gitignore`** (modified, +1 line) — Added `node_modules/` to the existing ignore set (which before Phase 8 was only `.planning/`). First node-dev-dep on the repo; keeping `node_modules/` untracked is required by plan Task 1 acceptance. See Deviation #3.

## Decisions Made

Beyond the 11 CONTEXT decisions (D-01..D-11) which were all followed unchanged, three execution-time decisions were added — all were Rule 1 / Rule 3 auto-fixes with no need for user consultation:

- **DEV-01 (placeholder regex):** The plan's skeleton for `check-upstream-schema.cjs` suggested `.replace(/\{[^}]*\}/g, '"placeholder"')`. Running this against v1.38.3's `pause-work.md` JSON block fails with `SyntaxError: Unexpected non-whitespace character` because the greedy match eats from the outer JSON's `{` through the first `}` inside `{timestamp}`, dissolving the top-level object. Replaced with tighter `\{[a-zA-Z0-9_ ,]+\}` — placeholder content is always letters/digits/underscore/space/comma; nested JSON objects contain quotes + colons so they won't match. Also split into two passes (quoted → `"placeholder"` then unquoted → `0`) to avoid the `""placeholder""` doubled-quote bug when source has `"{phase_number}"`. Verified: v1.38.3 now extracts all 17 fields cleanly, Status: PASS.

- **DEV-02 (cached-dir path):** The plan used `gsd-sync-${version}` with raw `v`-prefixed input. Real cached directories (from past sync runs) are at `/tmp/gsd-sync-1.38.3/` — no `v`. Stripping `v` only on the inner `get-shit-done-<clean>` dir (as the plan did) but not the outer `gsd-sync-<version>` dir would cause a cache miss and force a download even though the tarball already exists. Strip on both for consistency.

- **DEV-03 (gitignore node_modules):** Plan Task 1 acceptance required "`.gitignore` (or lack thereof) leaves `node_modules/` untracked — do NOT commit that dir." Before this phase, the repo had no node dev deps and `.gitignore` only contained `.planning/`. Adding `node_modules/` was the minimal Rule 3 fix — without it, git would have tracked every file in the install tree.

## Deviations from Plan

### 1. [Rule 1 - Bug fix in plan skeleton] Placeholder regex in `check-upstream-schema.cjs`

- **Found during:** Task 4 initial run (`UPSTREAM_VERSION=v1.38.3 node bin/maintenance/check-upstream-schema.cjs`).
- **Plan specified:** `let candidate = jsonBlockMatch[1].replace(/\{[^}]*\}/g, '"placeholder"').replace(/,(\s*[}\]])/g, '$1');` (two operations: placeholder sub, then trailing-comma strip).
- **What I observed:** Script exited 2 with `SyntaxError: Unexpected non-whitespace character after JSON at position 13 (line 1 column 14)`. Candidate output showed the outer JSON's opening `{\n  "version": "1.0",\n  "timestamp": ` had been collapsed to `"placeholder"",`. The greedy `[^}]*` eats from the outer `{` through the first `}` inside `{timestamp}`, destroying the top-level object structure. Additionally, quoted placeholders like `"{timestamp}"` became `""placeholder""` (doubled quotes — invalid JSON).
- **Investigation steps:**
  1. Printed the full candidate (it's dumped on parse failure by the existing error path — useful feature).
  2. Noticed the first `}` in the source is inside `{timestamp}`, not at the end of the outer object. This is the root cause: `\{[^}]*\}` is a non-greedy-boundary match in terms of `}`, but greedy in content — it matches the FIRST closing `}`. Since the first `}` is nested inside a placeholder, everything from outer `{` through that first `}` collapses.
  3. Inspected placeholder values across the file: all are `[a-zA-Z0-9_ ,]+` (identifiers, spaces, commas). Nested JSON objects like `{"id": 1, "name": ...}` contain `"` and `:` — mutually exclusive character class. So tightening the regex to `\{[a-zA-Z0-9_ ,]+\}` makes it correctly discriminate.
  4. Fixed the doubled-quote issue by splitting into two passes: quoted placeholders first (`"{...}"` → `"placeholder"` drops surrounding quotes), then unquoted placeholders (`{...}` → `0` because they only appear where upstream uses unquoted numbers like `"plan": {current_plan_number}`).
- **Fix:**
  ```javascript
  let candidate = jsonBlockMatch[1]
    .replace(/"\{[a-zA-Z0-9_ ,]+\}"/g, '"placeholder"')  // quoted → literal
    .replace(/\{[a-zA-Z0-9_ ,]+\}/g, '0')                 // unquoted → 0
    .replace(/,(\s*[}\]])/g, '$1');                       // strip trailing commas
  ```
- **Conclusion:** Plan skeleton was bugged; verified implementation works. The plan's source-level verify check looked for `\{[^}]*\}` exact in the script source, which now fails (this is the only "failing" plan-level verify for Task 4). Relaxed the Phase 8 source-level verify to look for `.replace(/.*\{.*\}.*/g,` (any placeholder-replacement pattern). The implementation-level acceptance criterion ("extracts fields via placeholder-stripping") is unchanged and passes.
- **Files affected:** `bin/maintenance/check-upstream-schema.cjs`.
- **Commit:** `3d67575` (the fix ships in the same Task 4 commit; the bug never landed).
- **Follow-up:** None. Future upstream JSON blocks would need to add a field name with quotes, colons, or braces to defeat this filter — which is highly unlikely since upstream is declaring pseudo-JSON placeholders, not real JSON.

### 2. [Rule 1 - Bug fix in plan skeleton] Cached-dir path in `check-upstream-schema.cjs`

- **Found during:** Task 4 implementation (pre-run, inspection of plan skeleton vs actual cached dir).
- **Plan specified:** `const workDir = path.join('/tmp', 'gsd-sync-${version}'); const cachedDir = path.join(workDir, 'get-shit-done-${clean}');` where `version` is the raw `UPSTREAM_VERSION` value (e.g. `v1.38.3`) and `clean` is the leading-`v`-stripped form (e.g. `1.38.3`).
- **What I observed:** `ls -d /tmp/gsd-sync-*/` shows `/tmp/gsd-sync-1.38.3/` (no `v`) — past sync runs always strip the `v` when creating the sync workdir. The plan's skeleton would have produced `workDir = /tmp/gsd-sync-v1.38.3/` (doesn't exist), missing the cache and forcing a download every run.
- **Fix:** Strip `v` for BOTH the outer dir AND inner dir. `const clean = version.replace(/^v/, '');` applied once, both paths use `clean`:
  ```javascript
  const workDir = path.join('/tmp', `gsd-sync-${clean}`);
  const cachedDir = path.join(workDir, `get-shit-done-${clean}`);
  ```
- **Conclusion:** Cosmetic bug, but it would have defeated the cache-first optimization. Fixed in place; the detector now finds the cached v1.38.3 tarball on first run.
- **Files affected:** `bin/maintenance/check-upstream-schema.cjs`.
- **Commit:** `3d67575`.
- **Follow-up:** None.

### 3. [Rule 3 - Missing critical config] `.gitignore` missing `node_modules/`

- **Found during:** Task 1, after `npm install --save-dev ajv ajv-formats`.
- **Plan specified:** Task 1 acceptance criterion: "`.gitignore` (or lack thereof) leaves `node_modules/` untracked — do NOT commit that dir."
- **What I observed:** `.gitignore` contained only `.planning/`. `git status` showed `node_modules/` as untracked — git would track every file in the install tree on the next `git add .`. Since this is the first time the project has node devDeps, there was no existing rule to inherit.
- **Fix:** Added `node_modules/` as a second line to `.gitignore`. Verified via `git check-ignore node_modules/ajv/package.json` → IGNORED.
- **Conclusion:** Plan's Task 1 action-text was silent on HOW to ensure this; acceptance criterion specified the outcome. Rule 3 applies — add the gitignore entry rather than rely on fragile `git add -A` avoidance.
- **Files affected:** `.gitignore`.
- **Commit:** `c3825d5`.
- **Follow-up:** None.

## Issues Encountered

- **`python3 -c "import yaml"` unavailable (PEP 668 blocks pip install).** Same as Phase 7's Issue #2. Workaround: installed `js-yaml` to `/tmp/p8-yaml/` via `npm install --silent --no-save` and ran the YAML parse check via Node. Parsed cleanly: `jobs: [file-layout, handoff-schema]`.
- **Triple-escape regex verify in plan Task 3.** Plan's `<automated>` verify block has the same nested-quoting issue as Phase 7 (JSON → shell → regex → Node `-e`). Worked around by writing semantic checks to `/tmp/p8-tN-verify.cjs` files and running via `node <file>`. All source-level checks green for Tasks 3, 4, and 5.
- **`writeCheckpoint` prints a warn about partial data when run against an empty tmp dir.** Expected — the tmp dir has no `.git`, so `git status --porcelain` fails and sets `partial: true`. The output is still structurally valid (all 19 fields present, all required filled) so validation passes. The warn line is cosmetic, not a failure.

## Verification Results

### Task 1 (devDependencies)

```
ok: ajv present
ok: ajv-formats present
ajv + ajv-formats resolve
IGNORED (git check-ignore node_modules/ajv/package.json)
```

### Task 2 (schema + fixture)

```
ok: $schema draft-07
ok: required has 17 entries
ok: source optional
ok: partial optional
ok: version const
ok: additionalProperties true
ok: fixture validates against schema
```

### Task 3 (check-handoff-schema source + end-to-end)

```
ok: shebang
ok: strict mode
ok: requires checkpoint
ok: requires ajv
ok: requires ajv-formats
ok: mkdtempSync
ok: writeCheckpoint call
ok: schema load
ok: exit 0 pass
ok: exit 1 fail
ok: exit 2 env
ok: cleanup

(end-to-end)
Fields present: 19
Required fields: 17/17 present
Optional fields: 2/2 present (source, partial)
Status: PASS — HANDOFF.json validates against schema/handoff-v1.json
exit=0
```

### Task 4 (check-upstream-schema source + end-to-end)

```
ok: shebang
ok: gsd-build/get-shit-done
ok: UPSTREAM_VERSION env
ok: workflow path
ok: placeholder replacement regex
ok: schema load
ok: exit 0 pass
ok: exit 1 fail
ok: exit 2 env

(end-to-end, UPSTREAM_VERSION=v1.38.3)
Using cached tarball at: /tmp/gsd-sync-1.38.3/get-shit-done-1.38.3
Upstream fields: 17 → version, timestamp, phase, phase_name, phase_dir, plan, task,
  total_tasks, status, completed_tasks, remaining_tasks, blockers,
  human_actions_pending, decisions, uncommitted_files, next_action, context_notes
Plugin required: 17 → (identical list)
Plugin total: 19
Status: PASS — upstream field set is a subset of plugin schema (no drift)
exit=0
```

### Task 5 (check-drift.yml)

```
ok: file-layout job preserved
ok: handoff-schema job added
ok: npm ci step
ok: cache npm
ok: runs check-handoff-schema
ok: check-upstream-schema NOT in workflow

(YAML parse via js-yaml)
YAML OK — jobs: file-layout, handoff-schema
```

### Task 6 (README + PROJECT.md)

```
ok: check-handoff-schema documented
ok: check-upstream-schema documented
ok: UPSTREAM_VERSION mentioned
ok: post-sync namespace step
ok: post-sync schema step
```

### Full-phase regression suite

```
=== Phase 7 file-layout detector (baseline 109/38/71) ===
Status: PASS — no regression, baseline matches.
exit=0

=== Phase 8 check-handoff-schema ===
Status: PASS — HANDOFF.json validates against schema/handoff-v1.json
exit=0

=== Phase 8 check-upstream-schema vs v1.38.3 ===
Status: PASS — upstream field set is a subset of plugin schema (no drift)
exit=0
```

All three pre-commit verification targets (regression defenses) green.

## Next Phase Readiness

- **SCHEMA-01, SCHEMA-02, SCHEMA-03, DRIFT-02 (schema portion)** all satisfied. DRIFT-02's namespace portion is the only remaining Phase-9 gate.
- Phase 9's unified `bin/maintenance/check-drift.cjs` now has two detectors to wrap: `check-file-layout.cjs` + `check-handoff-schema.cjs`. Both follow the same `'use strict'` / exit 0/1/2 / env-guard skeleton — the shared structure is obvious enough that Phase 9's orchestrator can extract a small helper without heavy refactoring.
- `.github/workflows/check-drift.yml` now has 2 jobs; Phase 9 can either add a third (namespace detector) or replace the two fine-grained jobs with a single `check-drift` job that calls the umbrella script. Both structures are supported by the current YAML layout.
- `check-upstream-schema.cjs` is the first plugin script that runs `gh release view` / `gh release download` — if Phase 9's umbrella script decides to include it optionally, it needs a `--no-upstream` or similar flag to keep CI offline-capable.
- The fixture at `schema/fixtures/handoff-sample.json` exercises the non-null branches of the schema and complements Task 3's validator (which runs against writeCheckpoint's mostly-null output in a tmp dir). Together they cover both "realistic field-filled HANDOFF" and "early-plan empty HANDOFF" paths.

## Follow-ups Spawned

- **Phase 9 (unified check-drift.cjs):** wraps the two Phase 7 + Phase 8 detectors. Currently no decision on whether `check-upstream-schema.cjs` should be part of the umbrella (it can't run in CI per D-10 but could be an optional manual step). DRIFT-02 namespace portion also lands here.
- **Upstream resync trigger:** next `/gsd:quick` upstream-sync task should include step 7 of the post-sync checklist (`UPSTREAM_VERSION=v<synced> node bin/maintenance/check-upstream-schema.cjs`) as a hard gate before closing the sync. The automation for this is the quick-task template update, which Phase 9 MAINT-01 will handle.
- **Potential: flag `node_modules/` as committed-safely in the file-layout detector's scope.** The file-layout detector already skips `_research/` and `.planning/` — `node_modules/` is covered by the text-extension filter (no `.md`/`.json`-reading into the tree) but as dep count grows a future skip list entry would be cheap insurance. Not needed today.

## Self-Check

- `schema/handoff-v1.json` — FOUND (96 lines, valid JSON, draft-07, 17 required + 19 total)
- `schema/fixtures/handoff-sample.json` — FOUND (35 lines, validates against schema)
- `bin/maintenance/check-handoff-schema.cjs` — FOUND (119 lines, executable 755, exits 0 against current plugin)
- `bin/maintenance/check-upstream-schema.cjs` — FOUND (175 lines, executable 755, exits 0 vs v1.38.3)
- `.github/workflows/check-drift.yml` — FOUND (modified, parses as valid YAML with file-layout + handoff-schema jobs)
- `package.json` — FOUND (modified with devDependencies.ajv + devDependencies["ajv-formats"])
- `package-lock.json` — FOUND (committed alongside package.json)
- `.gitignore` — FOUND (modified, now ignores node_modules/)
- `README.md` — FOUND (modified, Maintenance scripts section has both new script entries)
- `.planning/PROJECT.md` — FOUND (modified, post-sync checklist has steps 6 + 7)
- Commits `c3825d5`, `1626112`, `f18d357`, `3d67575`, `fdcab58`, `cb37532` — all FOUND in `git log`
- No lingering uncommitted changes to plugin content (only `_research/` remains untracked — pre-existing from before this phase, unrelated scope)

## Self-Check: PASSED

---
*Phase: 08-handoff-schema-detector*
*Completed: 2026-04-21*
