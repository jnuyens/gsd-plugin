# Phase 8: HANDOFF Schema Baseline + Detector - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning (R-1 answered; see `08-RESEARCH.md`)

<domain>
## Phase Boundary

Lock down the HANDOFF.json contract as a committed JSON Schema, validate `checkpoint.cjs` output against it in CI, and add a post-sync detector that compares upstream's `/gsd:pause-work` field list against our schema. Closes SCHEMA-01, SCHEMA-02, SCHEMA-03 and the schema portion of DRIFT-02.

Goal framing (informed by research):
- Plugin HANDOFF schema = upstream's 17 fields + our 2 plugin extensions (`source`, `partial`)
- Upstream schema is stable across 1.37.x → 1.38.x (byte-identical workflow body in inspected versions)
- Detector's job is to catch any *future* upstream drift — new fields added, existing fields removed, types changed

</domain>

<research_summary>
## Research Summary (from 08-RESEARCH.md)

- Upstream produces `.planning/HANDOFF.json` via `/gsd:pause-work`; same file path as plugin.
- **Upstream schema: 17 fields** — `version`, `timestamp`, `phase`, `phase_name`, `phase_dir`, `plan`, `task`, `total_tasks`, `status`, `completed_tasks`, `remaining_tasks`, `blockers`, `human_actions_pending`, `decisions`, `uncommitted_files`, `next_action`, `context_notes`
- **Plugin schema: 19 fields** — upstream's 17 + `source` + `partial` (plugin-only, added in v1.1 Phase 4)
- Plugin is a strict superset of upstream. No type conflicts. Upstream output validates against plugin schema if `source` and `partial` are optional. Plugin output is consumable by upstream.
- Upstream schema is **stable** across 1.37.1, 1.38.1, 1.38.3. No drift seen yet; detector is prophylactic.

</research_summary>

<decisions>
## Implementation Decisions

### Schema file

- **D-01:** Schema at `schema/handoff-v1.json`, JSON Schema draft-07. Single file; `schema/` is a new top-level dir (like `tests/` was in Phase 7). `-v1` suffix signals the contract version — if upstream ever changes fields such that we can't maintain compat, we'd write `handoff-v2.json` alongside rather than edit v1 destructively.
- **D-02:** 17 required fields (all upstream fields). 2 optional fields (`source`, `partial` — plugin extensions). Document this split in the schema's `$comment` field and in a short header doc alongside.
- **D-03:** Types follow what `checkpoint.cjs` actually emits — `version: string` (literal `"1.0"`), `timestamp: ISO-8601 string`, `phase: string`, `plan: string or null`, `task: number or string or null`, etc. Pragmatic, not overly strict; enforces structural shape, not semantic content.
- **D-04:** Schema is committed alongside a minimal **fixture** at `schema/fixtures/handoff-sample.json` — a realistic HANDOFF.json structurally equivalent to what `writeCheckpoint()` produces. Used for positive validation testing.

### Validation in CI

- **D-05:** Validator at `bin/maintenance/check-handoff-schema.cjs`. Generates a fresh HANDOFF via `bin/lib/checkpoint.cjs` `writeCheckpoint({ source: 'manual-pause' })` against a tmp dir (no polluting the real `.planning/HANDOFF.json`), reads it back, validates against schema. Exits 0 on pass, 1 on schema violation.
- **D-06:** Use `ajv` for JSON Schema validation. Justifies a dev dependency: reference implementation, well-maintained, small footprint. Add to `package.json` `devDependencies`. Not a runtime dep (hooks + checkpoint don't need it).
- **D-07:** CI: add a second job to `.github/workflows/check-drift.yml` (following Phase 7 D-14 intent). New job `handoff-schema` running after file-layout passes (so schema violations don't mask file-layout regressions and vice versa; matrix-style parallel is nice-to-have but single serial is simpler).

### Upstream drift detection (SCHEMA-03)

- **D-08:** Detector at `bin/maintenance/check-upstream-schema.cjs`. Takes upstream version via env var `UPSTREAM_VERSION` (default: latest `v1.38.*` tag via `gh release view --repo gsd-build/get-shit-done --json tagName`). Downloads tarball, extracts, parses `get-shit-done/workflows/pause-work.md` for the fenced JSON block, extracts field list.
- **D-09:** Comparison logic: the upstream field set must be a **subset** of our required-or-optional fields. Specifically:
  - **FAIL** if upstream has a field not in our schema (plugin needs to add support for it before sync)
  - **FAIL** if upstream is missing a field we mark as required (plugin's schema is too strict)
  - **WARN** if upstream has changed a field's type (potentially compat-breaking)
- **D-10:** Not run in CI by default. Triggered manually or via the post-sync workflow. Reason: running on every push would require network + `gh` availability + GitHub API rate limits. Post-sync is the right moment — upstream tarball is already downloaded locally at sync time.
- **D-11:** Post-sync integration: the upstream sync quick-task pattern (e.g. `260421-u38`) should add `node bin/maintenance/check-upstream-schema.cjs` as a step after the sync commits land. Documented in PROJECT.md's "After each upstream GSD sync" checklist. Phase 9's MAINT-01 formalizes this.

### Claude's discretion

- Exact ajv format options (strict mode, allErrors, etc.) — use reasonable defaults, document choice.
- Whether `version: "1.0"` should be a const check (probably yes — fail if upstream bumps it, so we notice).
- Whether to cache the downloaded upstream tarball (probably no — Phase 8 detector runs infrequently; re-downloading is simpler than stale-cache bugs).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Precedent to mirror

- `bin/maintenance/check-file-layout.cjs` — the Phase 7 detector. Same `'use strict'` pattern, same skip-list structure (not used here but consistent structure), same exit-code contract (0 pass / 1 regress / 2 env-error), same `--dry` flag convention. New detectors should look structurally like this.
- `.github/workflows/check-drift.yml` — Phase 8 extends this file with a second job; doesn't create a new workflow.

### Plugin code

- `bin/lib/checkpoint.cjs` — the 19-field `generateCheckpoint` function. Schema should match what this produces byte-for-byte.
- `bin/gsd-tools.cjs` — the CLI entry that exposes `checkpoint --source X`, `checkpoint --clear`. Not changed in Phase 8; referenced for how the validator generates a fresh HANDOFF.

### Upstream artifacts

- Upstream 1.38.3 tarball already extracted at `/tmp/gsd-sync-1.38.3/get-shit-done-1.38.3/` (from today's sync).
- Upstream schema source of truth: `get-shit-done/workflows/pause-work.md` §`<step name="write_structured">`.

### Research

- `08-RESEARCH.md` — R-1 findings (inline in this phase dir).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- `bin/lib/checkpoint.cjs` `writeCheckpoint(cwd, options)` — creates a HANDOFF.json against whatever `cwd`'s `.planning/` is. Point it at a tmp dir in the schema validator.
- `bin/lib/checkpoint.cjs` `deleteCheckpoint(cwd)` — clean up after validation so tmp dir isn't left populated.
- Existing post-sync rhythm: upstream sync → `bin/maintenance/rewrite-command-namespace.cjs` → smoke tests. Phase 8 adds `check-upstream-schema.cjs` to this rhythm (Phase 9 will add `check-drift.cjs` as an umbrella).

### Anti-patterns to avoid

- Don't re-use `.planning/HANDOFF.json` as the validation target. Generate in a tmp dir to avoid polluting real session state. Tmp dir via `os.tmpdir() + mkdtempSync`.
- Don't make ajv a runtime dependency. It's only needed by the maintenance scripts, not by hooks or CLI. `devDependencies` only; CI can do `npm ci` or `npm install --include=dev`.
- Don't couple schema.json to bin/lib/checkpoint.cjs via codegen. They're twins, not parent-child — both are the contract, one enforced at runtime, the other enforced in schema validation.

### Integration points

- `package.json` — new `devDependencies.ajv` entry; new `scripts.check:schema` alias.
- `.github/workflows/check-drift.yml` — add second job (handoff-schema).
- `schema/` — new dir, new files.
- `bin/maintenance/check-handoff-schema.cjs` — new file (schema validator).
- `bin/maintenance/check-upstream-schema.cjs` — new file (upstream drift detector).

</code_context>

<specifics>
## Specific Ideas

**Suggested `schema/handoff-v1.json` skeleton (abbreviated):**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/jnuyens/gsd-plugin/schema/handoff-v1.json",
  "title": "GSD HANDOFF.json (v1)",
  "type": "object",
  "required": [
    "version", "timestamp", "phase", "phase_name", "phase_dir",
    "plan", "task", "total_tasks", "status",
    "completed_tasks", "remaining_tasks", "blockers",
    "human_actions_pending", "decisions", "uncommitted_files",
    "next_action", "context_notes"
  ],
  "additionalProperties": true,
  "properties": {
    "version": { "type": "string", "const": "1.0" },
    "timestamp": { "type": "string", "format": "date-time" },
    "source": {
      "type": "string",
      "enum": ["auto-compact", "manual-pause"],
      "$comment": "Plugin extension (not in upstream); optional for compat"
    },
    "partial": {
      "type": "boolean",
      "$comment": "Plugin extension (not in upstream); optional for compat"
    },
    "phase": { "type": ["string", "null"] },
    "plan": { "type": ["string", "null"] },
    "task": { "type": ["number", "string", "null"] },
    "total_tasks": { "type": ["integer", "null"] },
    "status": { "type": "string", "enum": ["paused", "auto-checkpoint"] },
    "completed_tasks": { "type": "array", "items": { "type": "object" } },
    "remaining_tasks": { "type": "array", "items": { "type": "object" } },
    "blockers": { "type": "array", "items": { "type": "object" } },
    "human_actions_pending": { "type": "array", "items": { "type": "object" } },
    "decisions": { "type": "array", "items": { "type": "object" } },
    "uncommitted_files": { "type": "array" },
    "next_action": { "type": ["string", "null"] },
    "context_notes": { "type": "string" }
    /* ... remaining fields ... */
  }
}
```

`additionalProperties: true` (not the stricter `false`) allows future plugin extensions to land without schema update — the strictness is on required/optional + types, not on allowlist.

**Upstream schema extraction (parsing pseudo-JSON from workflow markdown):**

The upstream pause-work.md JSON block contains `{placeholders}` like `"{timestamp}"` and `{phase_number}`. A permissive regex-pass can extract keys: find `"key": ` patterns inside the fenced block. Alternatively, sed the placeholders to JSON-safe values and `JSON.parse`. Either works; the regex pass is more robust against format drift.

**Exit code discipline** (matches check-file-layout.cjs):
- 0 — PASS
- 1 — REGRESS (schema violation / drift found)
- 2 — ENV ERROR (can't download, can't parse, missing ajv, etc.)

</specifics>

<deferred>
## Deferred Ideas

- **Schema v2 bump on upstream drift** — if upstream ever adds a field, Phase 8's detector flags it, and the human decision is "absorb into v1 as optional" or "start handoff-v2.json." Not automated. Deferred pending first actual drift event.
- **Runtime schema validation on PreCompact** — checkpoint.cjs could validate its own output before writing. Overhead + complexity not worth it for a best-effort 5s-budget path. Schema is CI-enforced, not runtime-enforced.
- **Cross-version compat matrix** — track which upstream versions each plugin version is compat with. Nice-to-have observability; not Phase 8's job. Maybe a v1.3 DOCS item.
- **Round-trip testing** — generate HANDOFF via plugin, feed to upstream's `/gsd:resume-work` via SDK, confirm it parses. Requires upstream CLI execution surface in CI. Deferred; Phase 8 schema check is sufficient static evidence.

</deferred>

---

*Phase: 08-handoff-schema-detector*
*Context gathered: 2026-04-21*
