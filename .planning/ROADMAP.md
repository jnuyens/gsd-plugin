# Roadmap: GSD Performance Optimization

## Milestones

- [x] **v1.0 MVP** — Phases 1-3 (shipped 2026-04-06)
- [x] **v1.1 Session Continuity** — Phases 4-5 (shipped 2026-04-20; Phase 6 dropped, rehomed to v1.2 backlog)
- [ ] **v1.2** — Not yet scoped. Backlog: LIFE-02, LIFE-03, DOCS-01, DOCS-02, UPST-01, UPST-03, UPST-04, plus upstream-direction review.

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

### v1.2 (not yet scoped)

Run `/gsd:new-milestone` to start v1.2 planning. Carries forward the following deferred requirements from v1.1:

- LIFE-02 (staleness threshold detection)
- LIFE-03 (dedicated manual-checkpoint skill — optional; current manual path works via `/gsd:pause-work`)
- DOCS-01 (full README session-continuity paragraph — partially covered by the existing auto-resume bullet)
- DOCS-02 (CHANGELOG scaffold)
- UPST-01 (HANDOFF format compat — needs compat-target rethink against upstream 1.38.x+)
- UPST-03, UPST-04 (upstream patch packaging + PR — blocked on UPST-01)

## Progress

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1.0 MVP | 3 | Complete | 2026-04-06 |
| v1.1 Session Continuity | 2 (+ 1 dropped) | Complete | 2026-04-20 |
| v1.2 | TBD | Not scoped | — |
