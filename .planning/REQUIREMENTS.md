# Requirements: v1.2 Upstream Resilience

## Milestone Requirements

### File-Layout Drift Detection
- [x] **DRIFT-01**: Automated detector scans all `@~/.claude/...` and `@$HOME/.claude/...` references in skills, agents, and references; flags any reference pointing at a file that doesn't exist in the plugin layout — **Phase 7 (satisfied 2026-04-21)**
- [~] **DRIFT-02**: Drift detectors (file-layout, schema, namespace) run in CI and hard-fail on any detected drift — **Phase 7 portion satisfied 2026-04-21**; schema detector (Phase 8) and namespace detector (Phase 9) pending

### HANDOFF Schema Baseline and Drift Detection
- [ ] **SCHEMA-01**: Committed `schema/handoff-v1.json` describes the 19-field HANDOFF.json contract with field types and required/optional status — Phase 8
- [ ] **SCHEMA-02**: `checkpoint.cjs`-generated HANDOFF.json validates against `handoff-v1.json` in CI; schema validation is part of the hard-fail gate — Phase 8
- [ ] **SCHEMA-03**: Post-upstream-sync check compares upstream's `/gsd:pause-work` output structure against the plugin's HANDOFF schema; flags structural drift as a maintenance task — Phase 8 (research R-1 first)

### Unified Maintenance + Docs
- [ ] **DRIFT-03**: Single `bin/maintenance/check-drift.cjs` entry-point runs file-layout + schema + namespace detectors in one invocation and reports a consolidated summary — Phase 9
- [ ] **DOCS-01** (carried from v1.1): Full README paragraph documenting session continuity feature + drift-resilience story (failure modes, detector coverage, post-sync checklist) — Phase 9
- [ ] **DOCS-02** (carried from v1.1): `CHANGELOG.md` scaffold tracking plugin vs upstream versions side-by-side, starting with v2.38.2 (v1.1 shipped) and working forward — Phase 9
- [ ] **MAINT-01**: PROJECT.md "After each upstream GSD sync" checklist adds a `node bin/maintenance/check-drift.cjs` step as mandatory before declaring the sync complete — Phase 9

## Reframed from v1.1 backlog

| v1.1 Req | Fate in v1.2 |
|----------|--------------|
| UPST-01 | **Reframed** → **SCHEMA-03**. Goal shifts from "make HANDOFF compatible for upstream PR submission" to "detect drift between upstream's `pause-work` output and our schema." Upstream-PR direction is deferred to v1.3+ after Phase 8 research clarifies whether upstream's output is stable enough to aim at. |

## Research Questions

- [ ] **R-1**: What does upstream GSD's `/gsd:pause-work` actually produce? Is the output structure stable across the 1.34 → 1.38.x versions we've seen, or does it evolve? This scopes whether SCHEMA-03 compares against a fixed point or tracks a moving target. **Estimated effort:** ~30 min upstream repo reconnaissance. **Triggered at:** Phase 8 planning (`/gsd:plan-phase 8`).

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
| DRIFT-02 | Phases 7, 8, 9 | Partial — Phase 7 portion satisfied (CI workflow 9450005 + skip-list fix 777def6); Phases 8, 9 pending |
| SCHEMA-01 | Phase 8 | Pending |
| SCHEMA-02 | Phase 8 | Pending |
| SCHEMA-03 | Phase 8 | Pending (blocked on R-1) |
| DRIFT-03 | Phase 9 | Pending |
| DOCS-01 | Phase 9 | Pending |
| DOCS-02 | Phase 9 | Pending |
| MAINT-01 | Phase 9 | Pending |
