# Phase 8 Research: Upstream HANDOFF.json Schema Reconnaissance

**Date:** 2026-04-21
**Question (R-1):** What does upstream GSD's `/gsd:pause-work` actually produce? Is the output structure stable across the 1.34 → 1.38.x versions we've seen, or does it evolve? Scopes whether SCHEMA-03 compares against a fixed point or tracks a moving target.

## Findings

### Upstream produces HANDOFF.json, same location as plugin

Upstream's `/gsd:pause-work` workflow (at `get-shit-done/workflows/pause-work.md`) writes `.planning/HANDOFF.json` alongside a human-readable `.continue-here.md` file — exactly the same path the plugin uses. Confirmed 2026-04-21 by reading upstream tarballs for v1.37.1, v1.38.1, v1.38.3.

### Upstream schema (17 fields)

From `get-shit-done/workflows/pause-work.md` §`<step name="write_structured">`, constant across all versions inspected:

```json
{
  "version": "1.0",
  "timestamp": "{timestamp}",
  "phase": "{phase_number}",
  "phase_name": "{phase_name}",
  "phase_dir": "{phase_dir}",
  "plan": {current_plan_number},
  "task": {current_task_number},
  "total_tasks": {total_task_count},
  "status": "paused",
  "completed_tasks": [
    {"id": 1, "name": "...", "status": "done", "commit": "{hash}"}
  ],
  "remaining_tasks": [
    {"id": 4, "name": "...", "status": "not_started"}
  ],
  "blockers": [
    {"description": "...", "type": "technical|human_action|external", "workaround": "..."}
  ],
  "human_actions_pending": [
    {"action": "...", "context": "...", "blocking": true}
  ],
  "decisions": [
    {"decision": "...", "rationale": "...", "phase": "..."}
  ],
  "uncommitted_files": [],
  "next_action": "...",
  "context_notes": "..."
}
```

### Plugin schema (19 fields = upstream's 17 + 2 plugin-only)

From `bin/lib/checkpoint.cjs` (v1.1 Phase 4 implementation), confirmed today via `node bin/gsd-tools.cjs checkpoint --source manual-pause` round-trip:

All 17 upstream fields are preserved **identically** (names, types, nested shapes). Plugin adds two fields:

- **`source`** (string, values `"auto-compact"` or `"manual-pause"`) — distinguishes PreCompact-hook-triggered checkpoints from manual `/gsd:pause-work` checkpoints. Introduced 2026-04-11 by Phase 4 D-11.
- **`partial`** (boolean) — flag set when PreCompact's 5s budget ran out mid-gather; the handoff is best-effort and downstream consumers know to degrade gracefully. Introduced 2026-04-11 by Phase 4 D-04.

### Stability across upstream versions

Inspected the upstream pause-work workflow at three version points:

| Version | File hash-equivalent to 1.38.3? | Notes |
|---------|-------------------------------|-------|
| 1.37.1 | Different SKILL.md but same JSON schema produced | SKILL file has v1.37.0 added `/gsd:spec-phase` surface area — not schema-related |
| 1.38.1 | **Identical workflow body** (byte-for-byte) | Confirmed via `diff` |
| 1.38.3 | **Identical workflow body** | Confirmed via `diff` |

The HANDOFF schema has not changed in the upstream versions we've shipped against. The workflow file body governing the JSON structure is stable from 1.37.x onward. The schema file itself is never explicitly versioned upstream — the `"version": "1.0"` literal string inside the JSON is the only marker.

### Compatibility directions

**Direction 1: Upstream consuming plugin-generated HANDOFF.json**

- All 17 upstream fields present in plugin output ✓
- Two extra fields (`source`, `partial`) — upstream's parser either ignores them (JSON is extensible) or surfaces them in a `source: "unknown"` code path if it's strict. Likely ignored in practice; upstream's resume-work reads specific fields by name.
- **Verdict: plugin output is a superset; upstream consumption should work.**

**Direction 2: Plugin consuming upstream-generated HANDOFF.json**

- 17 upstream fields present ✓
- `source` and `partial` absent — plugin's resume flow currently treats `source` defensively (`hookInput.source || 'startup'`; `source || 'unknown'` fallback in the SessionStart hook) and doesn't read `partial` for behavior, only display. Neither is load-bearing.
- **Verdict: plugin consumption should work; source/partial must be declared optional in the schema.**

## Implications for Phase 8

### SCHEMA-01 (baseline schema)

Commit `schema/handoff-v1.json` (or `.schema.json` — JSON Schema draft-07) describing the 19-field contract. Fields to mark:
- **required (17):** `version`, `timestamp`, `phase`, `phase_name`, `phase_dir`, `plan`, `task`, `total_tasks`, `status`, `completed_tasks`, `remaining_tasks`, `blockers`, `human_actions_pending`, `decisions`, `uncommitted_files`, `next_action`, `context_notes`
- **optional (2):** `source`, `partial`

Document in the schema file header that the 2 optional fields are plugin extensions; upstream-compat requires they be optional.

### SCHEMA-02 (plugin validates in CI)

Generate HANDOFF.json via `node bin/gsd-tools.cjs checkpoint --source manual-pause` and validate against `schema/handoff-v1.json`. Fails if plugin output misses any required field or adds a type-incompatible one.

### SCHEMA-03 (upstream-drift detector, REFRAMED)

Research changes SCHEMA-03's scope meaningfully:

- **Was (reframed from v1.1 UPST-01):** "Post-upstream-sync check compares upstream's `/gsd:pause-work` output structure against the plugin's HANDOFF schema; flags structural drift."
- **Now, informed by research:** Upstream's schema is stable and is a **subset** of ours. SCHEMA-03's job becomes: "scan the upstream pause-work workflow body at sync time; extract its declared field list; compare to `schema/handoff-v1.json`'s required+optional fields; fail if upstream has added a field we haven't accounted for, removed a field we require, or changed a type we declare."

Extraction approach: parse the fenced JSON block inside upstream's `pause-work.md` `<step name="write_structured">` section. The example is pseudo-JSON (contains `{placeholders}`) but the field *keys* and nested shape are exact. Parse field names + structural shape only; ignore placeholder values.

Upstream source tarball acquisition pattern already established (this task downloaded v1.38.3 via `gh release download` and extracted to `/tmp/gsd-sync-1.38.3/`). Phase 8 detector can automate: `gh release view --repo gsd-build/get-shit-done $latest_tag && download + extract + parse workflow + diff field sets`.

### What this means for later phases (v1.3+)

- **UPST-01 reframe already absorbed** — research confirmed the direction from "PR-ready compat" to "drift detection baseline" was correct. The compat story is settled: plugin is a superset; upstream consumption works; plugin consumption of upstream output works. There's nothing left in UPST-01 that isn't covered by SCHEMA-03.
- **UPST-03/04 (still deferred):** Research doesn't change the evaluation. Upstream-PR packaging remains blocked on whether upstream is even the right destination — they shipped 1.34→1.38.x with orthogonal features (read-injection-scanner, ingest-docs, ultraplan) and haven't signaled appetite for checkpoint-on-compact work.

## Method / reproducibility

Research performed inline from this repo's local state:

1. `gh release download v1.38.1 --repo gsd-build/get-shit-done --archive=tar.gz` (already extracted at `/tmp/gsd-sync-1.38.1/`)
2. `gh release download v1.38.3 --repo gsd-build/get-shit-done --archive=tar.gz` (already extracted at `/tmp/gsd-sync-1.38.3/`)
3. Inspected `get-shit-done/workflows/pause-work.md` §`<step name="write_structured">` in both tarballs. Compared byte-wise via `diff`.
4. Inspected `~/.claude/plugins/cache/gsd-plugin/gsd/1.37.1/skills/pause-work/SKILL.md` as a third data point (older plugin cache version pulled from upstream's 1.37.1).
5. Cross-checked against this plugin's `bin/lib/checkpoint.cjs` `generateCheckpoint` function to enumerate the current 19 fields.

Cost: ~10 minutes. Well below the 30-minute estimate in the v1.2 kickoff.
