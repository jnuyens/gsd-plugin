---
phase: quick
plan: 260417-wib
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/lib/core.cjs
  - .planning/quick/260417-wib-integrate-opus-4-7-model-and-analyse-gsd/gsd2-feature-analysis.md
autonomous: true
must_haves:
  truths:
    - "The 'opus' alias resolves to claude-opus-4-7 instead of claude-opus-4-6"
    - "Model profiles continue to work without changes (they use aliases)"
    - "A written analysis of GSD-2 features exists with actionable borrowing recommendations"
  artifacts:
    - path: "bin/lib/core.cjs"
      provides: "Updated MODEL_ALIAS_MAP with opus -> claude-opus-4-7"
      contains: "'opus': 'claude-opus-4-7'"
    - path: ".planning/quick/260417-wib-integrate-opus-4-7-model-and-analyse-gsd/gsd2-feature-analysis.md"
      provides: "Feature-by-feature analysis of GSD-2 with borrowing priority"
  key_links:
    - from: "bin/lib/model-profiles.cjs"
      to: "bin/lib/core.cjs"
      via: "MODEL_ALIAS_MAP resolves 'opus' alias used in profiles"
      pattern: "'opus': 'claude-opus-4-7'"
---

<objective>
Update the Opus model alias from claude-opus-4-6 to claude-opus-4-7 and produce a
feature analysis of GSD-2 with concrete recommendations on what to borrow.

Purpose: Opus 4.6 is now a legacy model. Opus 4.7 offers step-change agentic coding
improvement at the same pricing. The GSD-2 analysis captures ideas for future work.

Output: One-line code change + analysis document.
</objective>

<context>
@bin/lib/core.cjs (MODEL_ALIAS_MAP around line 1378)
@bin/lib/model-profiles.cjs (uses aliases, no change needed)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Opus model alias to 4.7</name>
  <files>bin/lib/core.cjs</files>
  <action>
In bin/lib/core.cjs, change line 1379 from:

  'opus': 'claude-opus-4-6',

to:

  'opus': 'claude-opus-4-7',

This is a single-line edit. Do NOT change any other model aliases (sonnet, haiku).

Note: The upstream Claude Code source tree (outside bin/) contains many references to
opus-4-6 in files like constants/prompts.ts, utils/model/configs.ts, etc. Those are
upstream files and must NOT be touched -- they are managed by the Claude Code team, not
this plugin. The plugin's MODEL_ALIAS_MAP in core.cjs is the only alias mapping that
the gsd-plugin controls.

After editing, verify model-profiles.cjs still uses aliases ('opus', 'sonnet', 'haiku')
and requires no changes -- it picks up the new model through the alias map.

Important consideration: Opus 4.7 does NOT support extended thinking (unlike 4.6 which
does). Check if any gsd-plugin code in bin/ explicitly enables extended thinking for
opus. If found, note it in the commit message but do not change it in this task --
that would be a separate concern. The upstream Claude Code runtime handles thinking
negotiation; the plugin just sets the model ID.
  </action>
  <verify>
    <automated>grep -n "opus.*4-7" bin/lib/core.cjs && grep -c "opus-4-6" bin/lib/core.cjs | grep -q "^0$" && echo "PASS: alias updated, no stale references in bin/" || echo "FAIL"</automated>
  </verify>
  <done>MODEL_ALIAS_MAP maps 'opus' to 'claude-opus-4-7'. No other files in bin/ reference opus-4-6.</done>
</task>

<task type="auto">
  <name>Task 2: Write GSD-2 feature analysis with borrowing recommendations</name>
  <files>.planning/quick/260417-wib-integrate-opus-4-7-model-and-analyse-gsd/gsd2-feature-analysis.md</files>
  <action>
Create a feature analysis document covering each GSD-2 feature listed below. For each
feature, assess: (a) what it does in GSD-2, (b) whether the gsd-plugin already has
something equivalent, (c) feasibility of borrowing/adapting, (d) priority (high/medium/low/skip).

Features to analyze (from research findings):

1. Hierarchical Work Structure (Milestone -> Slice -> Task)
2. Fresh Context Per Task (pre-inlined context, 65% token reduction)
3. Cost Tracking (per-unit token/cost ledger)
4. Stuck Detection (sliding-window pattern matching)
5. Headless Mode (non-interactive CI/CD execution)
6. Extension API (third-party extensions from .gsd/extensions/)
7. Knowledge Graph (queryable learnings/decisions/patterns)
8. Dynamic Model Routing (complexity-based model selection)
9. Unified Orchestration Kernel (compile gates, audit envelopes)
10. Parallel Workers (multi-worker execution with file IPC)
11. Auto-recovery (crash recovery, TOCTOU-hardened locks)
12. Reassessment Gates (automatic roadmap updates after slices)

Structure the document as:
- Title and date
- Executive summary (3-5 sentences: what GSD-2 is, its maturity, overall assessment)
- Feature-by-feature analysis table (Feature | GSD-Plugin Equivalent | Feasibility | Priority | Notes)
- Top 3 recommendations section with concrete rationale
- A "Not Worth Borrowing" section explaining what to skip and why

Ground the analysis in the gsd-plugin's actual architecture: it wraps GSD prompts in a
Claude Code plugin with MCP-backed project state, uses model profiles via aliases, and
has session continuity hooks (Phase 04 work). The plugin focuses on reducing token
overhead (~92% reduction) through compiled command routing.

Keep the tone pragmatic -- the user noted GSD-2 is "not really production-ready yet",
so recommendations should focus on ideas and patterns worth adapting, not code to port.
  </action>
  <verify>
    <automated>test -f ".planning/quick/260417-wib-integrate-opus-4-7-model-and-analyse-gsd/gsd2-feature-analysis.md" && wc -l < ".planning/quick/260417-wib-integrate-opus-4-7-model-and-analyse-gsd/gsd2-feature-analysis.md" | awk '{if ($1 > 30) print "PASS: analysis written ("$1" lines)"; else print "FAIL: too short"}'</automated>
  </verify>
  <done>Analysis document exists with all 12 features assessed, priority ratings, top 3 recommendations, and skip rationale.</done>
</task>

</tasks>

<verification>
1. `grep "'opus': 'claude-opus-4-7'" bin/lib/core.cjs` returns a match
2. `grep -c "opus-4-6" bin/lib/core.cjs` returns 0 (no stale references)
3. gsd2-feature-analysis.md exists and covers all 12 features
4. Model profiles in bin/lib/model-profiles.cjs unchanged (still use 'opus' alias)
</verification>

<success_criteria>
- Opus alias points to claude-opus-4-7
- No functional regressions in model resolution (profiles use aliases, not IDs)
- GSD-2 analysis provides actionable recommendations grounded in the plugin's architecture
</success_criteria>

<output>
After completion, create `.planning/quick/260417-wib-integrate-opus-4-7-model-and-analyse-gsd/260417-wib-SUMMARY.md`
</output>
