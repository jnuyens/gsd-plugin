---
slug: 260425-clr-clear-suggestions
type: quick
created: 2026-04-25
completed: 2026-04-25
status: complete
commit: e0903f7
---

# Summary: Resurface `/clear` suggestions at end-of-flow boundaries

## What changed

7 files, 145 insertions. Every modified skill now has an `<output_format>` block instructing the workflow to emit a `/clear`-then-X continuation block on completion, citing `references/continuation-format.md` as the format spec, and including the "/clear is safe" parenthetical.

| File | Change |
|------|--------|
| `skills/execute-phase/SKILL.md` | New `<output_format>` after `<process>`. Phase-complete continuation. |
| `skills/complete-milestone/SKILL.md` | New `<output_format>` after `<process>`, before `<success_criteria>`. Milestone-complete continuation citing the § Milestone Complete variant. |
| `skills/verify-work/SKILL.md` | New `<output_format>` covering pass-and-gap-found branches. |
| `skills/quick/SKILL.md` | New `<output_format>` with skip-clear-on-trivial-tasks rule (preserves prompt cache for short fixes). |
| `skills/plan-phase/SKILL.md` | New `<output_format>` for plan-then-execute boundary. |
| `skills/ship/SKILL.md` | New `<output_format>` for PR-created boundary. |
| `references/continuation-format.md` | Top-of-file safety footer documenting that `/clear` is safe since v1.1's session-continuity work; gives the standard "/clear is safe" parenthetical wording as a single source of truth. |

## Why this fix

Audit found the continuation-format template was dormant: no skill or agent currently `@`-includes `references/continuation-format.md`. Only `agents/gsd-planner.md` line 1175 emits `/clear` directly. The user's perception that the plugin "no longer suggests /clear" was accurate.

This fix doesn't make the plugin auto-`/clear` (Claude Code doesn't expose that primitive to skills). It makes Claude reliably **suggest** `/clear` at the right boundaries — phase complete, milestone shipped, verification done, plan ready for execute, PR created, substantial quick task done — with a safety note that `/gsd:resume-work` restores from `HANDOFF.json` if the suggestion is taken in error.

## Decision: which skills to skip

Intentionally NOT touched:

- **Router skills** (`next`, `do`, `explore`) — they route to other skills; the routed-to skill's terminal owns the `/clear` hint. Adding it here would double-suggest.
- **Fresh-context skills** (`new-project`, `new-milestone`) — these BEGIN a context. `/clear` after kickoff would discard the just-loaded project bootstrap.
- **Mid-flow skills** (`research-phase`, `list-phase-assumptions`, `discuss-phase`) — completion isn't a phase boundary; downstream wants the accumulated context.

## Tradeoff baked into the `quick` rule

The `<output_format>` block in `skills/quick/SKILL.md` contains a conditional: only suggest `/clear` for quick tasks that ran for >5 tool calls or >10 minutes. Short, trivial fixes don't accumulate enough context to warrant a clear, and `/clear` mid-flurry-of-fixes blows away the prompt cache — net token cost goes UP for short tasks. This nuance is documented inline.

## Smoke tests

- `node bin/maintenance/check-drift.cjs` — all 3 detectors PASS. The new references all point at `references/continuation-format.md`, which is a plugin-local file; no dangling paths introduced.
- `grep -c "continuation-format.md"` on each target — 6/6 confirm 1 ref each.

## Out of scope

- **Context-pressure-aware prompts** (option B from yesterday's analysis) — needs a token-budget heuristic; v1.3-shaped.
- **Modifying agent files** — agents already either suggest `/clear` (planner) or operate inside fork contexts where the parent never sees their accumulation. Skill-level coverage is sufficient.

## User-visible effect

Starting now, when the user finishes:
- A phase via `/gsd:execute-phase N` → output ends with a `## ✓ Phase N Complete` block + `## ▶ Next Up` block + `/clear` then [next phase command] + safety parenthetical
- A milestone via `/gsd:complete-milestone vX.Y` → `## 🎉 Milestone Complete` + `/clear` then `/gsd:new-milestone` + safety
- Verification, planning, shipping, substantial quick tasks — all the same pattern

The safety parenthetical means users can take the `/clear` suggestion without fear: if they realize they wanted to keep the conversation, `/gsd:resume-work` restores phase/plan/task position from `HANDOFF.json`.

## Commit

`e0903f7` — feat(quick-260425-clr): resurface /clear suggestions at end-of-flow boundaries
