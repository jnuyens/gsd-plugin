---
milestone: v1.2
milestone_name: Upstream Resilience
audited: 2026-04-24 (post-completion)
status: complete — all 9 requirements satisfied, all 3 phases shipped clean, no gaps
---

# v1.2 Upstream Resilience — Milestone Audit

Unlike v1.1's audit (which was written mid-milestone to drive a rescope), v1.2 ships without scope drift: the Phase 7/8/9 boundaries from the 2026-04-20 kickoff held from start to finish, every requirement was closed by the phase that claimed it at kickoff time, and no requirements were deferred in-flight. This audit is written post-completion to document the clean close.

## Completion snapshot

| Phase | Plans | Tasks | Duration | Shipped |
|-------|-------|-------|----------|---------|
| 7 — File-Layout Drift Detector | 1/1 | 4/4 | ~9 min | 2026-04-21 |
| 8 — HANDOFF Schema Baseline + Detector | 1/1 | 6/6 | ~12 min | 2026-04-21 |
| 9 — Unified Check + Docs + Post-Sync Integration | 1/1 | 4/4 | ~5 min | 2026-04-21 |
| **Total** | **3/3** | **14/14** | **~26 min execution** | v1.2 shipped 2026-04-21 |

Milestone wall-clock from kickoff to Phase 9 commit: 2026-04-20 → 2026-04-21 (2 days, with interleaved upstream sync to 1.38.3 and two follow-up polish tasks on 2026-04-21 and 2026-04-24).

## Requirements coverage

All 9 requirements satisfied by the originally-assigned phase, no deferrals:

| Req | Phase | Status | Evidence |
|-----|-------|--------|----------|
| DRIFT-01 | 7 | SATISFIED | `bin/maintenance/check-file-layout.cjs` + `tests/drift-baseline.json` (109/38/71); commits `63444dd` + `777def6` |
| DRIFT-02 | 7, 8, 9 | SATISFIED | CI file-layout job `9450005`; schema job `fdcab58`; namespace via umbrella `0170c3f` |
| SCHEMA-01 | 8 | SATISFIED | `schema/handoff-v1.json` JSON Schema draft-07, 17 required + 2 optional; commit `1626112` |
| SCHEMA-02 | 8 | SATISFIED | `check-handoff-schema.cjs` validates `writeCheckpoint()` output in CI; commits `f18d357` + `fdcab58` |
| SCHEMA-03 | 8 | SATISFIED | `check-upstream-schema.cjs` post-sync detector; commit `3d67575`. R-1 resolved inline at plan time (upstream schema stable across 1.37.x–1.38.x; plugin is strict superset) |
| DRIFT-03 | 9 | SATISFIED | `check-drift.cjs` umbrella orchestrator; commit `0170c3f` |
| DOCS-01 | 9 | SATISFIED | README `## Session continuity + drift resilience` section; commit `7fd66c8` |
| DOCS-02 | 9 | SATISFIED | `CHANGELOG.md` scaffold with plugin-vs-upstream version distinction; commit `34a348c` |
| MAINT-01 | 9 | SATISFIED | PROJECT.md post-sync checklist formalized to 9 steps with drift-check gate; commit `f9561e7` |

## Requirements reframed from v1.1 backlog

The v1.1 audit deferred UPST-01 (HANDOFF format compat with upstream pause-work) to v1.2 after reframing it from "PR-ready compat" to "drift-detection baseline." This reframe was fully absorbed by SCHEMA-03; Phase 8's R-1 research confirmed the direction. UPST-03/04 (upstream PR packaging) remain deferred to v1.3+ pending upstream-direction review, consistent with the v1.1 audit's recommendation.

## Cross-phase integration

The three phases compose as a coherent story. Phases 7 and 8 are independent detectors (file-layout + schema); Phase 9's umbrella unifies them with the v1.1-era namespace check into one entry point and formalizes the post-sync workflow.

- **Detector independence**: Each detector has its own ratchet mechanism (`tests/drift-baseline.json` for file-layout; `schema/handoff-v1.json` for schema) and exits per the standard 0/1/2 convention.
- **CI serial jobs**: `.github/workflows/check-drift.yml` runs `file-layout` + `handoff-schema` as parallel jobs (not serial-in-sequence) so a failure in one doesn't mask another.
- **Umbrella vs CI**: `check-drift.cjs` is for local dev + post-sync; CI runs per-category jobs directly for fast-feedback granularity. Intentional split.
- **Post-sync integration**: PROJECT.md checklist now includes CHANGELOG update (step 5), namespace rewrite (step 7), umbrella gate (step 8), upstream-schema drift detector (step 9). Formalized from Phase 9.

## Opportunistic polish during the milestone

Three quick tasks landed between the v1.1 ship and the v1.2 ship that are structurally part of the v1.2 "make plugin maintenance easier" arc:

| Slug | Description | Commit |
|------|-------------|--------|
| 260421-u38 | Upstream sync to GSD 1.38.3; plugin bumped to 2.38.3 | `1c75799` |
| 260421-rnu | README reorganized to put new-user flow first; upstream-user migration content consolidated at end | `5b5efd5` |
| 260424-srn | Renamed `skills/gsd-<name>/` → `skills/<name>/` (81 dirs) to fix duplicated `/gsd:gsd-<skill>` prefix in tab completion | `b652f55` |

`260421-u38` carried the upstream 1.38.3 content into the plugin mid-milestone. `260421-rnu` and `260424-srn` are UX-polish tasks that emerged from observing the plugin in use: the first reorganized the README for discoverability, the second closed a long-standing UX bug where tab completion inserted `/gsd:gsd-<name>` instead of `/gsd:<name>`.

## What went well (and why)

- **Scope held from kickoff.** The 2026-04-20 explore-session narrowed v1.2 to drift hardening (#1 + #2 from the drift taxonomy) with LIFE-02/03, behavior-drift, and UPST-PR cleanly deferred. No mid-milestone rescope needed — a contrast with v1.1.
- **Research front-loaded.** R-1 (upstream HANDOFF format reconnaissance) was queued at kickoff but resolved inline at Phase 8 plan time — ~10 minutes, well under the 30-minute estimate. Having the answer before Phase 8 execution tightened the plan's field-comparison semantics.
- **Detector pattern was reusable.** Phase 7's `check-file-layout.cjs` established the detector skeleton (`use strict`, env guard, `git ls-files` walk, exit 0/1/2, `--dry` flag, `--write-baseline` for ratchet regen). Phases 8 and 9 reused it without ceremony.
- **Executor deviations were caught and fixed.** Phase 7's executor discovered the census count was 112/38/74 vs the plan's 107/37/70 (my initial count was scoped to 4 dirs, detector scans all plugin files); post-execution I generalized the skip list to exclude `.planning/` entirely and got to 109/38/71. Phase 9's executor caught a plan-internal regex self-collision (the plan's own example strings tripped the detector) and used Unicode non-breaking hyphens as a workaround. Phase 8 executor caught and fixed a placeholder-regex greediness bug. All three interventions were correct and documented.
- **Upstream alignment as a side effect.** The 260424-srn skill-dir rename aligned plugin structure with upstream's `commands/gsd/<name>.md` layout. Future syncs map 1:1 without a basename-rewriting step.

## What didn't go well (small, worth noting)

- **Pre-planning census scope drift.** My Phase 7 census used `grep -rohE ... skills/ agents/ references/ templates/` which missed hits in `bin/`, `hooks/`, etc. Baseline had to be adjusted post-execution. Lesson: for ratchet-baseline tasks, run the actual detector in dry mode BEFORE writing the plan's strict-count acceptance criteria.
- **Skip-pattern ordering bug.** The rewrite-command-namespace.cjs skip list excluded only `v1.0-` archives when it should've been `v\d+\.` (generic). Surfaced during the 1.38.3 sync as v1.1-phases/ archives being wrongly touched. Fixed in the same commit but would've been caught earlier with a broader-scoped initial skip list.
- **Plan self-collision.** Phase 9's plan document contained the literal string `/gsd-execute-phase` as a regression-test example, which made it part of the baseline corpus itself. Unicode-hyphen workaround was clever but not ideal. Lesson: when a plan's regression-test strings would match the detector's regex, use code fences or explicit anchors to exempt them.

## Verdict

Shipped clean on scope, on time, on requirements. Ready for archive.

Next milestone direction: revisit UPST-03/04 after a third-party check of upstream's trajectory, OR pick up LIFE-02 (staleness detection) + behavior-drift-detection if integration-test infra becomes worth investing in. Neither is urgent.
