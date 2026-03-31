# Phase 1: Skill and Agent Optimization - Research

**Researched:** 2026-03-31
**Domain:** Claude Code skill frontmatter and agent definition system
**Confidence:** HIGH

## Summary

Phase 1 requires two independent but complementary changes: (1) adding `context: 'fork'` frontmatter to GSD skill files so orchestration prompts execute in isolated sub-agents instead of polluting the parent conversation context, and (2) ensuring agent definitions in `~/.claude/agents/` have proper frontmatter (per-agent tools, model overrides, permissions) so that spawning uses the `.claude/agents/*.md` definition rather than inline prompt role descriptions. Additionally, the CLAUDE.md file must be reduced from its current ~3,000 tokens to a minimal ~100-token availability notice.

The research confirms that all required extension points already exist and are well-documented in Claude Code's source. The `context: 'fork'` skill frontmatter is fully implemented in `tools/SkillTool/SkillTool.ts` (line 622), which delegates to `executeForkedSkill()` when detected. Agent definitions are loaded from `~/.claude/agents/` via `loadAgentsDir.ts` and parsed with a comprehensive Zod schema supporting `tools`, `model`, `effort`, `permissionMode`, `maxTurns`, `hooks`, `skills`, `mcpServers`, `memory`, `isolation`, and more. GSD already has 18 agent definition files in `~/.claude/agents/` with frontmatter -- the task is to audit and optimize them, not create them from scratch.

**Primary recommendation:** Add `context: 'fork'` to all GSD commands that spawn subagents (the orchestrator commands). Audit existing agent definitions for missing frontmatter fields (model, effort, maxTurns). Replace the full CLAUDE.md content with a minimal notice pointing to `/gsd:*` commands. Move the bulk GSD context (project, stack, conventions, architecture) into on-demand loading via `<execution_context>` file references in skill files instead of static CLAUDE.md injection.

## Project Constraints (from CLAUDE.md)

**From project CLAUDE.md:**
- No fork: Use only public extension points
- Solo maintainer: Must be maintainable by one person
- Multi-CLI compat: GSD also works with other AI CLIs -- improvements should be additive, not breaking
- Update resilience: Must survive Claude Code monthly updates
- Measurable: Token savings must be quantified before and after
- Do not add Co-Authored-By lines to commit messages (user global CLAUDE.md)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKILL-01 | GSD skill files use `context: 'fork'` to isolate orchestration prompts in sub-agent context | Fully supported: `context: 'fork'` frontmatter is implemented in SkillTool.ts (line 622). When set, skill execution routes through `executeForkedSkill()` which creates an isolated sub-agent via `runAgent()`. Currently ZERO GSD commands use this field. |
| SKILL-02 | CLAUDE.md injection reduced from ~3,000-5,000 tokens to ~100 token availability notice with on-demand loading | Fully supported: Current CLAUDE.md is ~2,338 words (~3,000 tokens). GSD generates it via `gsd-tools generate-claude-md` with 6 marker-bounded sections. The workflow enforcement section alone is ~100 tokens. The project/stack/conventions/architecture sections can be removed and loaded on-demand via `<execution_context>` `@` file references in individual skill files. |
| AGENT-01 | GSD agent types defined as `.claude/agents/*.md` files with typed capabilities | Already partially done: 18 agent files exist in `~/.claude/agents/` with frontmatter. They have `name`, `description`, `tools`, `color`. Some lack `model`, `effort`, `maxTurns`, `permissionMode` fields. Need audit and optimization. |
| AGENT-02 | Agent definitions specify per-agent tools, model overrides, and permissions replacing prompt-embedded role descriptions | Partially done: Agent files have `tools` frontmatter. Model is currently resolved at runtime via `gsd-tools resolve-model` rather than via agent frontmatter `model` field. Need to add `model` frontmatter or verify the current `inherit`/runtime resolution pattern is correct. `permissionMode` is set on gsd-executor (`acceptEdits`) but missing from others. |
</phase_requirements>

## Standard Stack

This phase involves no new libraries or external dependencies. All changes are to markdown files (skill frontmatter, agent definitions, CLAUDE.md content).

### Core
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| Skill frontmatter | `~/.claude/commands/gsd/*.md` | Skill configuration via YAML frontmatter | Claude Code's documented extension mechanism |
| Agent definitions | `~/.claude/agents/gsd-*.md` | Agent type specifications with capabilities | Claude Code's `loadAgentsDir.ts` system |
| CLAUDE.md | Project root `CLAUDE.md` | Context injection per query | Claude Code's primary context mechanism |
| gsd-tools.cjs | `~/.claude/get-shit-done/bin/` | State management, model resolution | Existing GSD tooling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `context: 'fork'` on all skills | Selective forking (only some skills) | Fork all orchestrator commands -- the overhead of NOT forking is ~3K tokens per non-GSD query |
| `model` in agent frontmatter | Runtime `resolve-model` via gsd-tools | Current runtime resolution is more flexible (supports profiles), keep it unless model frontmatter proves simpler |
| Remove all CLAUDE.md content | Minimal notice only | Must keep workflow enforcement section to guide Claude toward GSD entry points |

## Architecture Patterns

### Current Architecture (What Needs to Change)

```
User types /gsd:execute-phase
  |
  v
commands/gsd/execute-phase.md  (NO context: 'fork')
  |
  v
Skill prompt INJECTED INTO MAIN CONVERSATION (~2K tokens)
  |
  v
Model reads workflow from @$HOME/.claude/get-shit-done/workflows/execute-phase.md
  |
  v
Model spawns Task(subagent_type="gsd-executor")
  |
  v
Agent loaded from ~/.claude/agents/gsd-executor.md (separate context)
```

**Problems:**
1. The skill prompt content (~2K tokens) stays in the main conversation context
2. CLAUDE.md (~3K tokens) is injected into EVERY query, even non-GSD ones
3. The skill orchestrator prompt duplicates role descriptions that exist in agent definitions

### Target Architecture (After Phase 1)

```
User types /gsd:execute-phase
  |
  v
commands/gsd/execute-phase.md  (context: 'fork')
  |
  v
SkillTool detects context: 'fork'
  |
  v
executeForkedSkill() creates ISOLATED sub-agent
  |
  v
Skill prompt runs in sub-agent context (separate token budget)
  |
  v
Sub-agent spawns Task(subagent_type="gsd-executor")
  |
  v
Agent loaded from ~/.claude/agents/gsd-executor.md
  |
  v
Main conversation: ZERO GSD token overhead
```

### Pattern 1: Fork-Mode Skill with Agent Reference

**What:** Skills that orchestrate GSD workflows use `context: 'fork'` and optionally `agent:` to specify which agent type runs the forked execution.

**When to use:** All GSD commands that spawn subagents or run multi-step workflows.

**Example frontmatter:**
```yaml
---
name: gsd:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--wave N] [--gaps-only] [--interactive]"
context: fork
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
```

**Source:** `tools/SkillTool/SkillTool.ts` line 622 -- confirmed `command.context === 'fork'` triggers `executeForkedSkill()`.

### Pattern 2: Agent Definition with Full Frontmatter

**What:** Agent definitions include all capability fields: tools, model, effort, permissionMode, maxTurns, color, skills, hooks.

**When to use:** Every GSD agent type that gets spawned via `Task(subagent_type=...)`.

**Example frontmatter (enhanced):**
```yaml
---
name: gsd-executor
description: Executes GSD plans with atomic commits, deviation handling, checkpoint protocols, and state management.
tools: Read, Write, Edit, Bash, Grep, Glob
permissionMode: acceptEdits
color: yellow
maxTurns: 50
effort: high
---
```

**Source:** `tools/AgentTool/loadAgentsDir.ts` lines 73-99 (AgentJsonSchema) -- supports `tools`, `disallowedTools`, `model`, `effort`, `permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `skills`, `initialPrompt`, `memory`, `background`, `isolation`.

### Pattern 3: Minimal CLAUDE.md with On-Demand Loading

**What:** Replace the ~3K token CLAUDE.md with a ~100 token availability notice. Move full context into `<execution_context>` file references inside individual skills.

**Example minimal CLAUDE.md:**
```markdown
## GSD Workflow

GSD project management is available. Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
```

**Source:** CLAUDE.md template in `~/.claude/get-shit-done/templates/claude-md.md` shows 6 sections. Only the workflow enforcement section needs to remain.

### Anti-Patterns to Avoid

- **Adding `context: 'fork'` to ALL commands:** Some commands are lightweight (e.g., `/gsd:help`, `/gsd:progress`, `/gsd:stats`) and should remain inline to avoid the sub-agent spawn overhead. Only fork commands that run multi-step workflows or spawn their own subagents.

- **Removing CLAUDE.md entirely:** The model needs to know GSD exists so it can suggest entry points. A zero-token CLAUDE.md means the model will not know `/gsd:*` commands are available.

- **Putting model IDs in agent frontmatter:** GSD's model profile system (`quality`/`balanced`/`budget`/`inherit`) resolves models dynamically based on user preference. Hardcoding `model: claude-sonnet-4-20250514` in frontmatter would break this flexibility. Use `inherit` or omit the `model` field and let `gsd-tools resolve-model` handle it at runtime.

- **Duplicating the orchestration prompt in both skill and workflow file:** Currently, skill files reference workflow files via `@$HOME/.claude/get-shit-done/workflows/*.md`. After adding `context: 'fork'`, the skill file should remain thin (just frontmatter + `<execution_context>` references). The workflow file contains the actual logic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill isolation | Custom sub-agent spawning logic | `context: 'fork'` frontmatter | Built into SkillTool.ts, handles token budgets, cache sharing, analytics automatically |
| Agent capability definition | Prompt-embedded role descriptions | `.claude/agents/*.md` frontmatter fields | loadAgentsDir.ts parses tools, model, effort, permissions, maxTurns from frontmatter natively |
| Model resolution | Hardcoded model IDs in frontmatter | `gsd-tools resolve-model` at runtime | Supports profile switching (quality/balanced/budget/inherit) and non-Anthropic providers |
| CLAUDE.md management | Manual file editing | `gsd-tools generate-claude-md` | Manages 6 sections independently with marker-bounded updates |

**Key insight:** Claude Code already implements everything Phase 1 needs. The work is configuration/content change, not code development. The risk is not "can we build it" but "will the token savings be measurable and the GSD commands still work correctly after the changes."

## Common Pitfalls

### Pitfall 1: Fork Overhead Exceeding Inline Cost for Lightweight Commands
**What goes wrong:** Adding `context: 'fork'` to simple commands like `/gsd:help` or `/gsd:progress` creates a sub-agent spawn (new model session, context initialization) that takes longer and costs more tokens than just running inline.
**Why it happens:** Fork mode creates a fresh agent context. For commands that just read a file and display results, this is overkill.
**How to avoid:** Categorize commands into "orchestrator" (fork) vs "utility" (inline). Only fork commands that spawn their own subagents or run multi-step workflows. Utility commands that just read files and format output should remain inline.
**Warning signs:** Simple commands take noticeably longer after adding fork mode.

### Pitfall 2: Losing CLAUDE.md Context in Forked Skills
**What goes wrong:** A forked skill runs in a sub-agent. The sub-agent may not have the full CLAUDE.md context if `omitClaudeMd` is set or if the agent definition strips it. The skill then fails because it cannot access project conventions.
**Why it happens:** The `BaseAgentDefinition` type has an `omitClaudeMd` field (line 129 of loadAgentsDir.ts). Built-in agents like Explore and Plan use this to save tokens. GSD agents should NOT set this.
**How to avoid:** Ensure no GSD agent definition has `omitClaudeMd: true`. The project CLAUDE.md (even when reduced to ~100 tokens) will be loaded by the forked agent's context builder.
**Warning signs:** Forked skills fail to follow project conventions. Agent responses ignore CLAUDE.md directives.

### Pitfall 3: Breaking gsd-tools generate-claude-md
**What goes wrong:** Reducing CLAUDE.md to ~100 tokens requires changing the `generate-claude-md` command. If the markers are removed but the generation tool still expects them, future regeneration will fail or overwrite the minimal version with the full version.
**Why it happens:** The `generate-claude-md` tool writes 6 marker-bounded sections. Removing sections breaks the marker-based update mechanism.
**How to avoid:** Either (a) update `generate-claude-md` to support a "minimal" mode that only outputs the workflow enforcement section, or (b) keep the markers but make the project/stack/conventions/architecture sections contain only a single-line "loaded on demand" notice instead of full content.
**Warning signs:** Running `generate-claude-md` after Phase 1 reverts to the full CLAUDE.md.

### Pitfall 4: Model Resolution Conflict Between Frontmatter and Runtime
**What goes wrong:** If `model` is set in agent frontmatter AND gsd-tools also passes a model parameter at spawn time, there is a precedence question. Which one wins?
**Why it happens:** Claude Code's `parseAgentFromMarkdown` (line 569) reads `model` from frontmatter. But GSD workflows also resolve models via `gsd-tools resolve-model` and pass them to `Task()`. If both are set, the behavior depends on how `runAgent` merges them.
**How to avoid:** Choose ONE model resolution strategy. Current recommendation: omit `model` from agent frontmatter and continue using runtime resolution via `gsd-tools resolve-model`. This preserves the profile system (quality/balanced/budget/inherit). If frontmatter model is used, it should be `inherit` to delegate to the calling context.
**Warning signs:** Agents use unexpected models. Token costs change unexpectedly after agent definition updates.

### Pitfall 5: AskUserQuestion Not Working in Forked Context
**What goes wrong:** Some GSD commands (like `/gsd:execute-phase --interactive`) use `AskUserQuestion` for user interaction. In a forked sub-agent context, interactive tools may behave differently or not surface properly in the parent conversation.
**Why it happens:** Forked skills communicate results back to the parent as a tool result. Interactive prompts inside a fork may not propagate to the user correctly.
**How to avoid:** Test interactive commands (`--interactive` flag) thoroughly after adding `context: 'fork'`. If interaction breaks, those specific commands may need to remain inline or use a different interaction pattern.
**Warning signs:** User prompts inside forked skills do not appear. Commands hang waiting for input that never arrives.

## Code Examples

### Example 1: Adding Fork Mode to a Skill File

Before (current `execute-phase.md` frontmatter):
```yaml
---
name: gsd:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--wave N] [--gaps-only] [--interactive]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
```

After (with fork mode):
```yaml
---
name: gsd:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--wave N] [--gaps-only] [--interactive]"
context: fork
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
```

The only change is adding `context: fork`. The SkillTool handles everything else.

### Example 2: Enhanced Agent Definition Frontmatter

Before (current `gsd-verifier.md` frontmatter):
```yaml
---
name: gsd-verifier
description: Verifies phase goal achievement through goal-backward analysis.
tools: Read, Write, Bash, Grep, Glob
color: green
---
```

After (with additional capability fields):
```yaml
---
name: gsd-verifier
description: Verifies phase goal achievement through goal-backward analysis.
tools: Read, Write, Bash, Grep, Glob
color: green
maxTurns: 30
effort: high
---
```

### Example 3: Minimal CLAUDE.md

Before (~3,000 tokens):
```markdown
<!-- GSD:project-start source:PROJECT.md -->
## Project
[... 200+ lines of project, stack, conventions, architecture ...]
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement
[... 8 lines ...]
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile
[... profile content ...]
<!-- GSD:profile-end -->
```

After (~100 tokens):
```markdown
<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
<!-- GSD:profile-end -->
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline skill execution only | `context: 'fork'` for sub-agent isolation | Available in Claude Code since at least current version | Eliminates context pollution from skill prompts |
| Basic agent name/description | Full agent schema (tools, model, effort, permissions, maxTurns, hooks, memory, isolation) | Expanded incrementally in recent Claude Code versions | Enables fine-grained agent capability specification |
| CLAUDE.md as primary context delivery | CLAUDE.md + `<execution_context>` file references in skills + agent definitions | Current architecture | Reduces per-query overhead while maintaining per-command context |

**Deprecated/outdated:**
- Embedding role descriptions in skill prompts when agent definitions can carry them -- this is the core anti-pattern Phase 1 eliminates

## Inventory of Changes Required

### GSD Commands to Categorize

**Orchestrator commands (ADD `context: 'fork'`):**
These spawn subagents or run multi-step workflows. Forking isolates their orchestration prompts.

| Command | Spawns Agents | Estimated Prompt Size |
|---------|---------------|----------------------|
| execute-phase | gsd-executor, gsd-verifier | ~2K tokens |
| plan-phase | gsd-researcher, gsd-planner, gsd-checker | ~2K tokens |
| research-phase | gsd-phase-researcher | ~1.5K tokens |
| verify-work | gsd-verifier | ~1.5K tokens |
| quick | gsd-planner, gsd-executor | ~1.5K tokens |
| debug | gsd-debugger | ~1K tokens |
| discuss-phase | N/A but multi-step | ~1K tokens |
| map-codebase | gsd-codebase-mapper | ~1K tokens |
| new-project | gsd-roadmapper | ~1K tokens |
| new-milestone | gsd-planner | ~1K tokens |
| validate-phase | gsd-verifier | ~1K tokens |
| review | gsd-verifier | ~1K tokens |
| autonomous | gsd-executor | ~1K tokens |
| manager | multiple agents | ~1K tokens |
| ship | gsd-verifier | ~1K tokens |

**Utility commands (KEEP inline):**
These are lightweight, read-only, or just display information. Forking would add unnecessary latency.

| Command | Reason to Keep Inline |
|---------|----------------------|
| help | Displays help text only |
| progress | Reads and displays state |
| stats | Reads and displays metrics |
| settings | Configuration display/update |
| health | Quick health check |
| next | Reads state, suggests action |
| note | Simple note-taking |
| add-todo | Simple todo addition |
| check-todos | Simple todo check |
| resume-work | Session resume |
| pause-work | Session pause |
| session-report | Report generation |
| join-discord | Simple URL display |

### Agent Definitions to Audit

| Agent | Has tools | Has model | Has effort | Has maxTurns | Has permissionMode | Action |
|-------|-----------|-----------|------------|--------------|-------------------|--------|
| gsd-planner | Yes | No | No | No | No | Add maxTurns, effort |
| gsd-executor | Yes | No | No | No | Yes (acceptEdits) | Add maxTurns, effort |
| gsd-verifier | Yes | No | No | No | No | Add maxTurns, effort |
| gsd-phase-researcher | Yes | No | No | No | No | Add maxTurns, effort |
| gsd-debugger | Yes | No | No | No | No | Add maxTurns, effort, permissionMode |
| gsd-plan-checker | Yes | No | No | No | No | Add maxTurns, effort |
| gsd-codebase-mapper | Yes | No | No | No | No | Add maxTurns |
| gsd-integration-checker | Yes | No | No | No | No | Add maxTurns |
| gsd-project-researcher | Yes | No | No | No | No | Add maxTurns |
| gsd-research-synthesizer | Yes | No | No | No | No | Add maxTurns |
| gsd-roadmapper | Yes | No | No | No | No | Add maxTurns, effort |
| gsd-nyquist-auditor | Yes | No | No | No | No | Add maxTurns |
| gsd-ui-researcher | Yes | No | No | No | No | Add maxTurns |
| gsd-ui-checker | Yes | No | No | No | No | Add maxTurns |
| gsd-ui-auditor | Yes | No | No | No | No | Add maxTurns |
| gsd-advisor-researcher | Yes | No | No | No | No | Add maxTurns |
| gsd-assumptions-analyzer | Yes | No | No | No | No | Add maxTurns |
| gsd-user-profiler | Yes | No | No | No | No | Add maxTurns |

### CLAUDE.md Changes

| Section | Current Size | Target Size | Action |
|---------|-------------|-------------|--------|
| Project | ~500 tokens | 0 | Remove (loaded by skills on demand) |
| Stack | ~800 tokens | 0 | Remove (loaded by skills on demand) |
| Conventions | ~800 tokens | 0 | Remove (loaded by skills on demand) |
| Architecture | ~700 tokens | 0 | Remove (loaded by skills on demand) |
| Workflow Enforcement | ~100 tokens | ~100 tokens | Keep as-is |
| Developer Profile | ~50 tokens | ~50 tokens | Keep as-is |
| **Total** | **~3,000 tokens** | **~150 tokens** | **~95% reduction** |

### gsd-tools Changes Required

The `generate-claude-md` command needs a "minimal" mode or needs to be updated to skip the project/stack/conventions/architecture sections. Options:
1. Add `--minimal` flag to `generate-claude-md` that only writes workflow+profile sections
2. Change the default behavior to write minimal content with `--full` flag for explicit full generation
3. Keep markers but write "Loaded on demand by GSD commands" as content for removed sections

Option 3 is safest -- it preserves backward compatibility and the marker-based update mechanism.

## Open Questions

1. **Interactive commands in fork mode**
   - What we know: `AskUserQuestion` is in the allowed-tools list for some forked commands. Claude Code does support interaction in forked skills (progress events are forwarded).
   - What's unclear: Whether `AskUserQuestion` prompts bubble up correctly from a forked skill to the user.
   - Recommendation: Test `--interactive` mode empirically after adding `context: 'fork'`. If broken, keep interactive-mode commands inline.

2. **Model resolution strategy**
   - What we know: GSD resolves models at runtime via `gsd-tools resolve-model`. Agent frontmatter supports `model` field. Both can coexist.
   - What's unclear: Precedence when both are set. Does agent frontmatter `model` override the runtime-passed model, or vice versa?
   - Recommendation: Do not add `model` to agent frontmatter for now. Continue using runtime resolution. Revisit in Phase 3 when plugin packaging might standardize this.

3. **Token savings measurement**
   - What we know: CLAUDE.md is ~3,000 tokens. Removing it saves ~3,000 tokens per non-GSD query.
   - What's unclear: Exact token cost of forked skill overhead vs inline overhead. Fork creates a new API call, which may cost more in absolute terms but isolates context.
   - Recommendation: Measure before and after. Use `wc -w` on CLAUDE.md as a proxy. For fork overhead, compare response times for a simple non-GSD query with and without CLAUDE.md content.

## Sources

### Primary (HIGH confidence)
- `tools/SkillTool/SkillTool.ts` lines 118-289, 622 -- Forked skill execution implementation
- `tools/AgentTool/loadAgentsDir.ts` lines 73-99, 541-755 -- Agent definition parsing with Zod schema
- `utils/frontmatterParser.ts` lines 41-47 -- Skill frontmatter context field definition
- `~/.claude/commands/gsd/*.md` -- Current GSD skill files (68 files, zero use `context: 'fork'`)
- `~/.claude/agents/gsd-*.md` -- Current GSD agent definitions (18 files with partial frontmatter)
- `~/.claude/get-shit-done/templates/claude-md.md` -- CLAUDE.md template with 6 marker-bounded sections
- Project CLAUDE.md -- Current file is ~2,338 words (~3,000 tokens)

### Secondary (MEDIUM confidence)
- Pre-phase research: `.planning/research/ARCHITECTURE.md` -- Integration seam analysis confirming Layer 1 (skills) and Layer 2 (agents) approaches
- Pre-phase research: `.planning/research/STACK.md` -- Token budget analysis showing 10x reduction estimate
- Pre-phase research: `.planning/research/FEATURES.md` -- Feature landscape confirming skill frontmatter fields

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All changes are to existing markdown files using documented frontmatter fields
- Architecture: HIGH - `context: 'fork'` and agent definitions are confirmed in Claude Code source
- Pitfalls: HIGH - Based on direct code analysis of SkillTool.ts and loadAgentsDir.ts

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- skill/agent systems are mature in Claude Code)
