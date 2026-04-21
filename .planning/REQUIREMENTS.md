# Requirements: v1.2 Upstream Resilience

## Milestone Requirements

### File-Layout Drift Detection
- [x] **DRIFT-01**: Automated detector scans all `@~/.claude/...` and `@$HOME/.claude/...` references in skills, agents, and references; flags any reference pointing at a file that doesn't exist in the plugin layout — **Phase 7 (satisfied 2026-04-21)**
- [x] **DRIFT-02**: Drift detectors (file-layout, schema, namespace) run in CI and hard-fail on any detected drift — **Phase 7 (file-layout) + Phase 8 (schema) + Phase 9 (namespace via unified orchestrator) satisfied 2026-04-21**

### HANDOFF Schema Baseline and Drift Detection
- [x] **SCHEMA-01**: Committed `schema/handoff-v1.json` describes the 19-field HANDOFF.json contract with field types and required/optional status — **Phase 8 (satisfied 2026-04-21, commit 1626112)**
- [x] **SCHEMA-02**: `checkpoint.cjs`-generated HANDOFF.json validates against `handoff-v1.json` in CI; schema validation is part of the hard-fail gate — **Phase 8 (satisfied 2026-04-21, commits f18d357 + fdcab58)**
- [x] **SCHEMA-03**: Post-upstream-sync check compares upstream's `/gsd:pause-work` output structure against the plugin's HANDOFF schema; flags structural drift as a maintenance task — **Phase 8 (satisfied 2026-04-21, commit 3d67575; R-1 resolved at plan time)**

### Unified Maintenance + Docs
- [x] **DRIFT-03**: Single `bin/maintenance/check-drift.cjs` entry-point runs file-layout + schema + namespace detectors in one invocation and reports a consolidated summary — **Phase 9 (satisfied 2026-04-21, commit 0170c3f)**
- [x] **DOCS-01** (carried from v1.1): Full README paragraph documenting session continuity feature + drift-resilience story (failure modes, detector coverage, post-sync checklist) — **Phase 9 (satisfied 2026-04-21, commit 7fd66c8)**
- [x] **DOCS-02** (carried from v1.1): `CHANGELOG.md` scaffold tracking plugin vs upstream versions side-by-side, starting with v2.38.2 (v1.1 shipped) and working forward — **Phase 9 (satisfied 2026-04-21, commit 34a348c)**
- [x] **MAINT-01**: PROJECT.md "After each upstream GSD sync" checklist adds a `node bin/maintenance/check-drift.cjs` step as mandatory before declaring the sync complete — **Phase 9 (satisfied 2026-04-21, commit f9561e7)**

## Reframed from v1.1 backlog

| v1.1 Req | Fate in v1.2 |
|----------|--------------|
| UPST-01 | **Reframed** → **SCHEMA-03**. Goal shifts from "make HANDOFF compatible for upstream PR submission" to "detect drift between upstream's `pause-work` output and our schema." Upstream-PR direction is deferred to v1.3+ after Phase 8 research clarifies whether upstream's output is stable enough to aim at. |

## Research Questions

- [x] **R-1**: What does upstream GSD's `/gsd:pause-work` actually produce? Is the output structure stable across the 1.34 → 1.38.x versions we've seen, or does it evolve? **Resolved at Phase 8 planning (2026-04-21):** upstream schema is stable across 1.37.x → 1.38.x (byte-identical workflow body in inspected versions), and plugin is a strict superset (17 upstream fields + 2 plugin-only). SCHEMA-03 compares against a subset relationship; detector confirmed PASS vs v1.38.3. See `.planning/phases/08-handoff-schema-detector/08-RESEARCH.md` for full findings.

## Future Requirements (deferred to v1.3+)

### Drift detection — behavior category
- **BEHAVIOR-01** *(future)*: Integration tests detect semantic regressions where an upstream skill keeps the same name but changes behavior. Blocked on integration-test infrastructure, which this milestone does not build.

### Checkpoint lifecycle polish (from v1.1 backlog)
- **LIFE-02** *(future)*: Stale HANDOFF.json (older than configurable threshold) is detected and flagged/refused at resume time. *Deferred; not drift-related.*
- **LIFE-03** *(future)*: Dedicated `/gsd:checkpoint` skill for manual save. *Deferred; manual path already covered by `/gsd:pause-work` + `checkpoint --source manual-pause`.*

### Upstream-PR track (from v1.1 backlog)
- **UPST-03** *(future)*: Plugin-side changes packaged as isolated upstream-ready patches. *Blocked on reassessment after Phase 8 research — is upstream still the right destination?*
- **UPST-04** *(future)*: Patch files / PR-ready diff prepared for upstream submission. *Blocked on UPST-03.*

## Out of Scope

- **Auto-patching on drift** — detectors report, humans fix. Auto-patching is tempting for namespace drift (the rewrite script could self-trigger) but adds complexity and hides what's actually changing. Keep detection separate from mitigation.
- **Multi-version matrix testing** — we don't spin up test environments with each upstream version to check for behavior drift. Too expensive for this milestone.
- **Upstream contribution workflow beyond detection** — we detect when upstream drifts from us; we do not automate the decision of whether to chase the drift (compat patch) or let it diverge (fork more aggressively). That's a human judgment call per drift incident.
- **Protecting against Claude Code (CC) drift** — scope is upstream GSD, not upstream CC. CC's `CLAUDE_PLUGIN_ROOT` behavior is orthogonal and already mitigated in v1.1 (260420-vfb).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DRIFT-01 | Phase 7 | Satisfied (2026-04-21, commits 63444dd + 777def6) |
| DRIFT-02 | Phases 7, 8, 9 | Satisfied (2026-04-21) — file-layout in CI (9450005 + 777def6), schema in CI (fdcab58), namespace via unified umbrella (0170c3f) |
| SCHEMA-01 | Phase 8 | Satisfied (2026-04-21, commit 1626112) |
| SCHEMA-02 | Phase 8 | Satisfied (2026-04-21, commits f18d357 + fdcab58) |
| SCHEMA-03 | Phase 8 | Satisfied (2026-04-21, commit 3d67575; R-1 resolved at plan time) |
| DRIFT-03 | Phase 9 | Satisfied (2026-04-21, commit 0170c3f) |
| DOCS-01 | Phase 9 | Satisfied (2026-04-21, commit 7fd66c8) |
| DOCS-02 | Phase 9 | Satisfied (2026-04-21, commit 34a348c) |
| MAINT-01 | Phase 9 | Satisfied (2026-04-21, commit f9561e7) |
