# Phase 5: Backup Trigger and Cleanup - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Scope source:** `.planning/AUDIT-v1.1.md` + `.planning/ROADMAP.md` (trimmed 2026-04-20)

<domain>
## Phase Boundary

Phase 4 made the PreCompact → HANDOFF.json → SessionStart → auto-resume round-trip work end-to-end (live UAT passed 2026-04-20). Phase 5 closes the two remaining lifecycle gaps:

1. **Hook-independent fallback (BKUP-01, BKUP-02).** If the SessionStart hook fails to fire (hook disabled, plugin not loaded in the right order, CLI without hook support, user has settings overrides), the resume round-trip is broken. CLAUDE.md is loaded into every session unconditionally, so an instruction there provides the second trigger path.

2. **Checkpoint cleanup (LIFE-01).** HANDOFF.json is currently never deleted after resume. It sits on disk forever, causing SessionStart to re-fire the resume systemMessage on every subsequent session until the file is manually removed. Verified: the 2026-04-20T04:27:56Z HANDOFF.json from this morning's /compact is still on disk right now.

Deliberately out of scope (deferred to v1.2 per 2026-04-20 audit): LIFE-02 (staleness detection), LIFE-03 (dedicated `/gsd-checkpoint` skill — `/gsd:pause-work` already covers the manual path), DOCS-01/02 (README + CHANGELOG), UPST-01/03/04 (upstream compat; needs direction review first).

</domain>

<decisions>
## Implementation Decisions

### CLAUDE.md fallback section (BKUP-01, BKUP-02)

- **D-01:** Add a **new** marker-bounded section (`<!-- GSD:session-continuity-start -->` / `...-end -->`) rather than extending the existing workflow-enforcement section. Semantic boundary: workflow-enforcement is about "gate file changes through GSD commands"; session-continuity is about "resume prior work first". Commingling the two makes future edits error-prone.

- **D-02:** Place the new section at **position 6 in the ordering**, immediately before workflow-enforcement. Reads as: "check for prior work first, then follow workflow rules for new work". Existing sections 1-5 stay put; workflow becomes 7; profile becomes 8.

- **D-03:** Section content is a **short, imperative instruction** matching the hook systemMessage tone: "If `.planning/HANDOFF.json` exists at session start, run `/gsd:resume-work` immediately — a previous session was interrupted and state is captured there. Do this before anything else, without waiting for user input."

- **D-04:** Content is a **hardcoded constant** in `bin/lib/profile-output.cjs` (pattern matches existing `CLAUDE_MD_WORKFLOW_ENFORCEMENT`). Generator function returns it verbatim. Not a fallback — this is always the content.

- **D-05:** `generate-claude-md` must also re-run against this repo's own `CLAUDE.md` as part of the plan so BKUP-01 is actually live in the project that ships the plugin. Not just in the template doc.

### HANDOFF.json cleanup (LIFE-01)

- **D-06:** Add `deleteCheckpoint(cwd)` helper to `bin/lib/checkpoint.cjs` that removes `.planning/HANDOFF.json` safely (no throw if absent; returns boolean for whether a file was removed). Keeps lifecycle logic co-located with creation logic.

- **D-07:** Expose deletion via a new CLI flag: `node bin/gsd-tools.cjs checkpoint --clear`. Chosen over a new subcommand name to minimize CLI surface growth. The same `cmdCheckpoint` handler branches on `--clear`.

- **D-08:** Add an explicit deletion step at the **end** of `skills/gsd-resume-work/SKILL.md` — after context has been restored and the user has been shown status. Placement at the end (not mid-process) means a failed/aborted resume leaves HANDOFF.json intact for recovery.

- **D-09:** Deletion is unconditional-on-success and silent. Rationale: LIFE-01 explicitly says "HANDOFF.json is deleted after successful resume"; there is no carve-out for "unless the user cancelled". If the resume skill reached its final step at all, resume is successful.

- **D-10:** Do NOT delete HANDOFF.json from the SessionStart hook. The hook only *detects* the file and emits a systemMessage; actual deletion must happen after the skill has had a chance to use the file. Deleting from the hook before resume-work reads it would be a race.

### Claude's Discretion

- Exact whitespace and comment formatting inside the generated section.
- Whether to invoke `node bin/gsd-tools.cjs checkpoint --clear` via Bash or delete the file directly inside the skill. (Recommendation: CLI command, for workspace-aware path resolution via `planningPaths()`.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### CLAUDE.md generation pipeline
- `bin/lib/profile-output.cjs` — `CLAUDE_MD_WORKFLOW_ENFORCEMENT` constant (line 186) and `generateWorkflowSection` (line 374) are the pattern to mirror for the new section. `cmdGenerateClaudeMd` (line 917) manages MANAGED_SECTIONS, generators, sectionHeadings — all three need the new entry.
- `templates/claude-md.md` — documents the section templates, section ordering, and marker format. New section must be documented here per existing style (lines 91-105 show the workflow-enforcement precedent).

### Checkpoint lifecycle
- `bin/lib/checkpoint.cjs` — `generateCheckpoint` and `writeCheckpoint` exports. `deleteCheckpoint` slots in next to them. `cmdCheckpoint` (line 388) parses flags and is the single CLI entry — `--clear` branches here.
- `bin/gsd-tools.cjs` — session-start hook handler (lines 1290-1313) reads HANDOFF.json. Confirms the file exists at session start. No change needed here for deletion — deletion lives in the resume-work skill, not the hook.

### Resume skill
- `skills/gsd-resume-work/SKILL.md` — currently a thin delegator to a missing external workflow file (`~/.claude/get-shit-done/workflows/resume-project.md` does not exist on disk). Plan 05-02 adds explicit steps including the final deletion, decoupling from the missing workflow doc.

### Requirements
- `.planning/REQUIREMENTS.md` — BKUP-01, BKUP-02, LIFE-01 (lines 16-20).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **profile-output.cjs pattern**: Each managed CLAUDE.md section has (1) a content constant or generator, (2) an entry in `MANAGED_SECTIONS`, (3) a key in `generators` map, (4) a key in `sectionHeadings` map, (5) optional fallback in `CLAUDE_MD_FALLBACKS`. Adding the session-continuity section is pure extension — no refactor.
- **checkpoint.cjs pattern**: Existing `writeCheckpoint` does filesystem writes inside try/catch with `data.partial = true` on failure and never throws. `deleteCheckpoint` must follow the same never-throw contract (resume is not a hot path, but consistency matters).

### Established Patterns
- Marker-bounded sections in CLAUDE.md: `<!-- GSD:{name}-start source:{source} -->` / `<!-- GSD:{name}-end -->`. Parser: `extractSectionContent` in profile-output.cjs at line 225.
- Hardcoded section content uses a module-level constant (all-caps, `CLAUDE_MD_*`). Generator returns `{ content, source, hasFallback: false }`.
- gsd-tools flag parsing: `args.includes('--clear')` for booleans, `args.indexOf('--foo')` + next arg for values. See `cmdCheckpoint` lines 391-404 for the existing pattern.

### Integration Points
- `bin/lib/profile-output.cjs` — new constant, new generator, register in `MANAGED_SECTIONS`, `generators`, `sectionHeadings`
- `bin/lib/checkpoint.cjs` — new `deleteCheckpoint` export, `cmdCheckpoint` branch for `--clear`
- `templates/claude-md.md` — new section block + ordering entry
- `skills/gsd-resume-work/SKILL.md` — explicit resume steps including final cleanup invocation
- `CLAUDE.md` (project root) — regenerate after profile-output.cjs change so the new section materializes

</code_context>

<specifics>
## Specific Ideas

Section key name: **`session-continuity`** (kebab-case, matches existing markers like `workflow-start`).

Section heading: **`## Session Continuity`**.

CLI flag: **`--clear`** (boolean, on `checkpoint` command; branches to `deleteCheckpoint` instead of `writeCheckpoint`).

Helper export: **`deleteCheckpoint(cwd)`** returning **`{ deleted: boolean, path: string, error?: string }`**.

</specifics>

<deferred>
## Deferred Ideas

- **LIFE-02 (staleness detection)** — would check HANDOFF.json timestamp and refuse resume if too old. Deferred to v1.2.
- **LIFE-03 (`/gsd-checkpoint` skill)** — `/gsd:pause-work` + `gsd-tools checkpoint` already cover the manual path; no dedicated skill needed.
- **Archiving deleted HANDOFF.json** — e.g., moving to `.planning/handoffs/YYYY-MM-DD-hash.json` for audit. Not requested; LIFE-01 explicitly says "deleted". Straight delete.
- **Detecting hook-vs-fallback path** — interesting observability (does BKUP-02 ever trigger in practice?), but no requirement.

</deferred>

---

*Phase: 05-backup-trigger-and-cleanup*
*Context gathered: 2026-04-20*
