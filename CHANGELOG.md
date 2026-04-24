# Changelog

All notable changes to this plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Plugin version in section brackets; upstream GSD base version in trailing parentheses. See [README § Versioning](./README.md#versioning) for the `plugin_major = upstream_major + 1` scheme.

History before 2.38.2 lives in git + the per-milestone archive (see `.planning/milestones/v1.0-ROADMAP.md` and `.planning/milestones/v1.1-ROADMAP.md`).

## [Unreleased]

## [2.38.4] - 2026-04-24  (based on upstream GSD 1.38.3)

v1.2 Upstream Resilience shipment. Full context in [milestones/v1.2-ROADMAP.md](.planning/milestones/v1.2-ROADMAP.md).

### Added
- **Unified drift check orchestrator** — `bin/maintenance/check-drift.cjs` runs the file-layout, HANDOFF schema, and namespace drift detectors in sequence and reports a consolidated verdict. Intended for local dev loops and post-upstream-sync verification. Offline-deterministic (upstream-schema detector kept separate per v1.2 Phase 9 design). Closes DRIFT-03 (v1.2 Phase 9).
- **README feature tour** for session continuity and drift resilience — new `## Session continuity + drift resilience` section. Two-paragraph prose describing the `/compact` round-trip (PreCompact hook → HANDOFF.json → SessionStart auto-resume → handoff cleanup) and the three-detector CI gate with ratchet baselines plus the post-sync upstream-schema detector. Closes DOCS-01 (v1.2 Phase 9).
- **`CHANGELOG.md`** — this file. Keep-a-Changelog format with plugin-vs-upstream version distinction in section headers. Closes DOCS-02 (v1.2 Phase 9).

### Changed
- **`.planning/PROJECT.md` post-sync checklist** — formalized nine-step sequence including a dedicated CHANGELOG update step, the unified `check-drift.cjs` gate ("must exit 0 before declaring sync complete"), and the separate `check-upstream-schema.cjs` step for upstream schema drift. Closes MAINT-01 (v1.2 Phase 9).
- **README reorganized for new-user-first flow** — install / quick start / updating / maintenance scripts now run contiguously at the top; upstream-user migration content consolidated into a trailing `## For users of upstream GSD` umbrella; versioning section demoted from top to meta. No content deletions (quick task 260421-rnu).

### Fixed
- **Skill command-ID duplication** — renamed all 81 skill directories from `skills/gsd-<name>/` → `skills/<name>/`. Previously Claude Code derived command IDs from the directory basename and prepended the plugin name (`gsd`), producing `/gsd:gsd-<name>` while the tab-completion menu displayed `/gsd:<name>` (from the frontmatter `name:` field). Dir rename unifies display and inserted forms. Also aligns plugin layout with upstream's `commands/gsd/<name>.md` structure — future syncs map 1:1 without a basename-rewriting step (quick task 260424-srn).

## [2.38.3] - 2026-04-21  (based on upstream GSD 1.38.3)

### Added
- **File-layout drift detector** (`bin/maintenance/check-file-layout.cjs`) — scans plugin content for dangling `@~/.claude/get-shit-done/*` references, classifies as repairable (has plugin counterpart) vs genuinely missing, compares counts against `tests/drift-baseline.json` ratchet, exits 0/1/2 per maintenance convention. Runs in CI on every push and pull request (first job of `.github/workflows/check-drift.yml`). Closes DRIFT-01 and the file-layout portion of DRIFT-02 (Phase 7).
- **Committed HANDOFF schema baseline** (`schema/handoff-v1.json`) — JSON Schema draft-07 describing the 19-field HANDOFF.json contract (17 required upstream-compat fields + 2 optional plugin-only fields). Fixture at `schema/fixtures/handoff-sample.json`. Closes SCHEMA-01 (Phase 8).
- **HANDOFF schema validator** (`bin/maintenance/check-handoff-schema.cjs`) — runs `writeCheckpoint()` in an isolated tmp dir and validates the generated HANDOFF.json against the committed schema via ajv. Cleans up tmp dir in a `finally{}` block (never touches real `.planning/HANDOFF.json`). Runs in CI as the second job of `.github/workflows/check-drift.yml`. Closes SCHEMA-02 (Phase 8).
- **Upstream schema drift detector** (`bin/maintenance/check-upstream-schema.cjs`) — downloads or uses a cached upstream GSD release tarball, extracts the declared `/gsd:pause-work` field list from `workflows/pause-work.md`, and diffs against the committed schema. Not in CI (network-dependent; post-sync-only). Set `UPSTREAM_VERSION=v1.x.y` to target a specific release. Closes SCHEMA-03 (Phase 8).
- **Frontier mode for `/gsd:sketch` and `/gsd:spike`** — running either command with no argument (or `frontier`) now analyzes the existing sketch/spike landscape and proposes consistency/frontier targets instead of requiring an explicit idea (from upstream 1.38.3).
- **Extended tool access** for sketches and spikes — both skills now include `WebSearch`, `WebFetch`, and context7 `resolve-library-id` / `query-docs` in allowed-tools, grounding experiments in real API surfaces (from upstream 1.38.3).
- **Second CI job** in `.github/workflows/check-drift.yml` — handoff-schema runs in parallel to file-layout on a separate ubuntu-latest runner with `cache: npm` + `npm ci`. Either regression fails the workflow independently (Phase 8).
- **`ajv` + `ajv-formats` as devDependencies** — first node dev deps on the project. `node_modules/` added to `.gitignore`. `package-lock.json` committed (Phase 8).

### Fixed
- **`bin/maintenance/rewrite-command-namespace.cjs` skip pattern** — generalized from literal `v1.0-` prefix to `v\d+\.` regex so versioned milestone archives (`v1.1-phases/`, future `v1.2-phases/`, …) are preserved as-is on re-runs.

## [2.38.2] - 2026-04-20  (based on upstream GSD 1.38.1)

v1.1 Session Continuity shipment. Full context in [milestones/v1.1-ROADMAP.md](.planning/milestones/v1.1-ROADMAP.md).

### Added
- **Session continuity across `/compact`** — PreCompact hook writes `.planning/HANDOFF.json` with current phase, plan, task, and status; SessionStart hook detects the handoff on next session and auto-invokes `/gsd:resume-work` with zero user intervention. Verified end-to-end via live `/compact` UAT on 2026-04-20. Closes CKPT-01/02/03 + RESM-01/02/03 (v1.1 Phase 4).
- **CLAUDE.md `## Session Continuity` section** — hook-independent fallback trigger. Works for CLIs without hook support or when the hook is overridden. Closes BKUP-01/02 (v1.1 Phase 5).
- **Handoff lifecycle cleanup** — `deleteCheckpoint()` helper in `bin/lib/checkpoint.cjs` + `checkpoint --clear` CLI flag. `/gsd:resume-work` removes the handoff after successful resume, preventing phantom resume attempts. Closes LIFE-01 (v1.1 Phase 5).
- **Hook-command version fallback** — `hooks/hooks.json` resolves the newest cached plugin version when the baked `${CLAUDE_PLUGIN_ROOT}` path is pruned mid-session (e.g. after an upgrade). Keeps long sessions working across plugin updates (v1.1 quick task 260420-vfb).
- **Namespace normalization** — 273 `/gsd-<skill>` dash-style refs rewritten to `/gsd:<skill>` across 100 files, plus a durable maintenance script for post-sync re-runs. Closes the "Unknown command: /gsd-foo" failure mode inherited from upstream's un-namespaced command form (v1.1 quick task 260420-cns).
