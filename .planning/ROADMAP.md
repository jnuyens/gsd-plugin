# Roadmap: GSD Performance Optimization

## Milestones

- [x] **v1.0 MVP** — Phases 1-3 (shipped 2026-04-06)
- [x] **v1.1 Session Continuity** — Phases 4-5 (shipped 2026-04-20; Phase 6 dropped, rehomed to v1.2 backlog)
- [x] **v1.2 Upstream Resilience** — Phases 7-9 (shipped 2026-04-24 — 3 phases, 3 plans, 14 tasks, ~26min executor time)
- [ ] **v1.3** — Not yet scoped. Carried backlog: LIFE-02, LIFE-03, BEHAVIOR-01, UPST-03, UPST-04.

## Phases

<details>
<summary>v1.0 MVP (Phases 1-3) — SHIPPED 2026-04-06</summary>

- [x] Phase 1: Skill and Agent Optimization (3/3 plans) — completed 2026-04-01
- [x] Phase 2: MCP Server (2/2 plans) — completed 2026-04-04
- [x] Phase 3: Plugin Packaging and Memory (5/5 plans) — completed 2026-04-06

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>v1.1 Session Continuity (Phases 4-5) — SHIPPED 2026-04-20</summary>

- [x] Phase 4: Checkpoint and Resume (3/3 plans) — completed 2026-04-11 (live `/compact` UAT passed 2026-04-20)
- [x] Phase 5: Backup Trigger and Cleanup (2/2 plans) — completed 2026-04-20
- [~] Phase 6: Upstream Compatibility and Documentation — dropped 2026-04-20; rehomed to v1.2

Full details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>v1.2 Upstream Resilience (Phases 7-9) — SHIPPED 2026-04-24</summary>

- [x] Phase 7: File-Layout Drift Detector (1/1 plans) — completed 2026-04-21 (baseline 109/38/71; first CI workflow on this repo)
- [x] Phase 8: HANDOFF Schema Baseline + Detector (1/1 plans) — completed 2026-04-21 (schema + 2 detectors; handoff-schema CI job live)
- [x] Phase 9: Unified Check + Docs (1/1 plans) — completed 2026-04-21 (umbrella + README tour + CHANGELOG + 9-step post-sync checklist)

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

### v1.3 (not yet scoped)

Run `/gsd:new-milestone` to start v1.3 planning. Carries forward the following deferred requirements from v1.1 and v1.2:

- **LIFE-02** — staleness threshold detection for HANDOFF.json (resume refuses / warns on stale)
- **LIFE-03** — dedicated `/gsd:checkpoint` skill for manual save (optional; current manual path works via `/gsd:pause-work`)
- **BEHAVIOR-01** — integration tests detect semantic regressions in upstream skills that keep the same name but change behavior (needs integration-test infra)
- **UPST-03** — upstream-PR packaging (blocked on reassessment: is upstream still the right destination given their 1.34→1.38.x trajectory?)
- **UPST-04** — PR-ready diff preparation for upstream submission (blocked on UPST-03)

## Progress

| Milestone | Phases | Shipped |
|-----------|--------|---------|
| v1.0 MVP | 3 | 2026-04-06 |
| v1.1 Session Continuity | 2 (+ 1 dropped) | 2026-04-20 |
| v1.2 Upstream Resilience | 3 | 2026-04-24 |
| v1.3 | TBD | — |
