# Phase 9: Unified Check + Docs + Post-Sync Integration - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning (no research needed — all surfaces plugin-internal)

<domain>
## Phase Boundary

Close v1.2 by:
1. Building one `bin/maintenance/check-drift.cjs` umbrella that invokes all three detectors (file-layout, schema, namespace) in a single pass and returns a consolidated result.
2. Writing the full README paragraph on session continuity + drift resilience (DOCS-01).
3. Scaffolding `CHANGELOG.md` starting with v2.38.2 (v1.1 ship) working forward through v2.38.3 (today's sync) and v2.38.4 (v1.2 ship when this phase lands) (DOCS-02).
4. Formalizing the PROJECT.md post-sync checklist to call the umbrella check (MAINT-01).

Phase 9 is the capstone: it doesn't add new detection capability (Phases 7 + 8 did), but it unifies the interface, documents the feature, and makes the post-sync workflow bulletproof. Closes DRIFT-03, DOCS-01, DOCS-02, MAINT-01, and the namespace portion of DRIFT-02.

</domain>

<decisions>
## Implementation Decisions

### Unified detector (DRIFT-03)

- **D-01:** `bin/maintenance/check-drift.cjs` is an orchestrator — spawns the three per-category detectors via `child_process.spawnSync` and aggregates results. Does NOT reimplement detection logic. Keeps each per-category detector independently runnable (local dev loop), while giving CI and post-sync a single entry point.
- **D-02:** Three detectors invoked, in order: (1) `check-file-layout.cjs`, (2) `check-handoff-schema.cjs`, (3) `rewrite-command-namespace.cjs --dry`. The namespace script has `--dry` preview mode; the umbrella treats non-zero "Total replacements" in dry mode as namespace drift and FAILs. The namespace script is not modified — Phase 9 only reads its output.
- **D-03:** Flags propagated from umbrella to children: `--dry` propagates to check-file-layout (affects its own comparison mode). Not applicable to schema validator (always compares against schema). Namespace child always runs in `--dry` from the umbrella — the umbrella's concern is detection, not fix.
- **D-04:** Exit codes (umbrella): 0 if ALL three children pass; 1 if ANY child fails; 2 if the orchestrator itself can't run (child binary missing, invalid cwd, etc.).
- **D-05:** Output format: per-detector summary line, then consolidated verdict. Keep child output piped through verbatim so operators get the full error context — the umbrella doesn't try to re-summarize each child.
- **D-06:** NOT added to CI as a new job. `check-drift.yml` already runs file-layout + handoff-schema as separate jobs (Phase 7 + 8 design). Adding a redundant umbrella job would duplicate work + obscure which axis failed. The umbrella is for local dev + post-sync use. CI stays per-detector for fast-feedback granularity.

### DOCS-01 (README paragraph)

- **D-07:** Add a `## Session continuity + drift resilience` section to `README.md`, positioned between `## What GSD Plugin provides` and `## What changed from upstream GSD`. Two paragraphs:
  - **Paragraph 1 (session continuity):** what the feature does — PreCompact hook captures state to `.planning/HANDOFF.json`; SessionStart detects and auto-invokes `/gsd:resume-work`; CLAUDE.md fallback for hook-less CLIs; resume clears the handoff after use. User-facing behavior description, not implementation.
  - **Paragraph 2 (drift resilience):** three detectors — file-layout, HANDOFF schema, namespace — with ratchet baselines and CI hard-fail. Why it matters: plugin sits downstream of a rapidly-moving upstream; detectors surface drift at sync time rather than after users hit bugs.
- **D-08:** DOCS-01 was partially satisfied in v1.1 quick-task 260420-rar (the "Auto-resume across `/compact`" bullet). The new section DOES NOT delete that bullet; it expands the coverage. Bullet stays in the features list; section gives a proper feature tour.
- **D-09:** Brevity is a feature. Two paragraphs, ~150 words each. No subheaders beyond the top-level section. Readers who want depth follow links into `.planning/milestones/v1.1-ROADMAP.md` and the per-phase summaries.

### DOCS-02 (CHANGELOG.md scaffold)

- **D-10:** New top-level `CHANGELOG.md` in repo root. Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format since that's the convention upstream GSD uses in its own `CHANGELOG.md` (consistency helps future-us).
- **D-11:** Entries structured as `## [<plugin version>] - <date>  (based on upstream <upstream version>)`. Plugin-vs-upstream distinction is surfaced in the section header directly, not buried in prose. Example:
  ```markdown
  ## [2.38.4] - 2026-04-21  (based on upstream GSD 1.38.3)
  ### Added
  - File-layout drift detector (Phase 7)
  - HANDOFF schema baseline + detector (Phase 8)
  - Unified drift check orchestrator (Phase 9)
  ```
- **D-12:** Scaffold starts at v2.38.2 (v1.1 ship — 2026-04-20). Earlier history remains in git + milestone archive; not backfilled retroactively — DOCS-02's ask is "starting with v2.38.2." v2.38.3 entry covers today's upstream sync. v2.38.4 entry covers v1.2 ship (added when this phase lands + plugin is bumped — reflected but pending at Phase 9 commit time; finalized at tag-time).
- **D-13:** CHANGELOG is never scanned by the drift detectors (it's not plugin-content for delivery; it's user-facing documentation). No impact on baselines.

### MAINT-01 (post-sync checklist)

- **D-14:** Replace the current PROJECT.md step 6 + 7 (namespace rewrite + upstream-schema check) with a consolidated step that runs the umbrella:
  ```
  6. Run `node bin/maintenance/rewrite-command-namespace.cjs` to normalize new dash-style command refs (if any).
  7. Run `node bin/maintenance/check-drift.cjs` — must exit 0 before declaring the sync complete. If it fails, fix or (if the increase is intentional) regenerate the relevant baseline with `--write-baseline`.
  8. Run `UPSTREAM_VERSION=v1.x.y node bin/maintenance/check-upstream-schema.cjs` — must exit 0. If upstream added fields, decide to absorb into schema v1 or bump to v2 before declaring sync complete.
  ```
  The umbrella covers steps 6's detection angle but NOT the fix. Keep the rewrite-command-namespace step because the current-upstream-sync pattern is `sync → normalize-namespace → verify-clean`.
- **D-15:** The upstream-schema check (step 8) stays as a separate step. Per Phase 8 D-10, it's not in CI due to network + gh dependency; it remains a manual post-sync action. D-06 above also keeps it out of the umbrella (umbrella is offline-deterministic).

### Claude's discretion

- Whether to add `--json` output on the umbrella (probably yes — small helper for future CI integration if it ever graduates out of "local + post-sync" use). Not required for acceptance.
- Exact prose wording of the README section — stay within the style of surrounding sections.
- Whether CHANGELOG includes v2.38.4 as "Unreleased" or pre-populated — pre-populate assuming Phase 9 ships today. If v1.2 doesn't ship today, the header gets updated at tag-time.

</decisions>

<canonical_refs>
## Canonical References

### Precedent

- `bin/maintenance/check-file-layout.cjs` — per-detector pattern. Umbrella spawns it.
- `bin/maintenance/check-handoff-schema.cjs` — per-detector pattern. Umbrella spawns it.
- `bin/maintenance/rewrite-command-namespace.cjs` — `--dry` mode prints "Total replacements: N". Umbrella parses N.
- `bin/maintenance/check-upstream-schema.cjs` — NOT spawned by the umbrella (out of scope per D-15).

### Files to modify

- `bin/maintenance/check-drift.cjs` (new) — the umbrella
- `README.md` — new `## Session continuity + drift resilience` section
- `CHANGELOG.md` (new) — top-level Keep-a-Changelog scaffold
- `.planning/PROJECT.md` — post-sync checklist step 6+7+8 formalization

### Upstream convention for CHANGELOG

- `/tmp/gsd-sync-1.38.3/get-shit-done-1.38.3/CHANGELOG.md` (from today's sync) uses Keep-a-Changelog format. Match that style.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- `child_process.spawnSync` for orchestration — well-known pattern. Inherit stdio for transparency (so child errors bubble up to the operator unredacted).
- `rewrite-command-namespace.cjs --dry` already prints `Total replacements: N` on its last line. Umbrella greps that.
- `check-file-layout.cjs` and `check-handoff-schema.cjs` both exit with standard codes (0/1/2). Umbrella just watches exit status.

### Anti-patterns to avoid

- Don't let the umbrella silently swallow child output. Full stdout+stderr pipes through. Operators see exactly what each child said.
- Don't reimplement ratchet logic in the umbrella. The per-detector logic lives in each per-detector script; umbrella is coordination-only.
- Don't add `check-upstream-schema.cjs` to the umbrella. Network-dependent + post-sync-only. Umbrella should run deterministically offline.

### Integration points

- `bin/maintenance/check-drift.cjs` (new)
- `README.md` (section insert)
- `CHANGELOG.md` (new file)
- `.planning/PROJECT.md` (post-sync checklist update)

</code_context>

<specifics>
## Specific Ideas

**Umbrella exit-code discipline** (matches per-detector convention):
- 0 — all three children passed
- 1 — any child failed
- 2 — orchestrator couldn't run at all

**Report format (plain text):**
```
Unified drift check
===================

[1/3] File-layout drift detector
  <child output>
  → PASS

[2/3] HANDOFF schema validator
  <child output>
  → PASS

[3/3] Namespace drift (dry-run of rewrite script)
  Total replacements: 0
  → PASS

Consolidated: PASS (all 3 detectors clean)
```

**README section wording (draft):**

> ## Session continuity + drift resilience
>
> **Session continuity.** When Claude Code runs `/compact` (manual or automatic), this plugin's PreCompact hook captures the current session state to `.planning/HANDOFF.json` — phase, plan position, uncommitted files, recent decisions, and a resumption hint. On the next session start, the SessionStart hook detects the handoff and auto-invokes `/gsd:resume-work` with zero user intervention. CLAUDE.md carries the same instruction as a fallback for CLIs where hooks don't fire. The handoff file is deleted after a successful resume so stale state doesn't trigger phantom resume attempts.
>
> **Drift resilience.** The plugin sits downstream of [upstream GSD](https://github.com/gsd-build/get-shit-done), which ships frequent feature releases. To catch structural drift before it reaches users, three detectors run in CI on every push: a **file-layout drift detector** flags dangling `@~/.claude/get-shit-done/*` references (e.g. skill files delegating to workflow bodies that don't exist in the plugin); a **HANDOFF schema validator** confirms `checkpoint.cjs` output matches the committed JSON Schema; and after each upstream sync, a **namespace normalizer** rewrites `/gsd-<skill>` → `/gsd:<skill>` and an **upstream drift detector** compares upstream's pause-work output against our schema. Each detector has a committed baseline; regressions hard-fail.

</specifics>

<deferred>
## Deferred Ideas

- **Umbrella `--json` output** for programmatic consumption. Probably useful later; not required for Phase 9 acceptance.
- **Parallel child spawning** via `Promise.all` + async spawn. Serial is simpler and children are fast. Revisit if CI gets slow.
- **Consolidating `rewrite-command-namespace.cjs` into the umbrella** as a first-class detector (instead of reading `--dry` output). Would require adding an exit-code contract to the namespace script. Possible v1.3 cleanup; not blocking.
- **Badge in README showing CI status** — Keep-a-Changelog compat + a shields.io badge would be a small polish. Not requested.

</deferred>

---

*Phase: 09-unified-check-and-docs*
*Context gathered: 2026-04-21*
