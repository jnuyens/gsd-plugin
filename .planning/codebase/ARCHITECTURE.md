# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Layered application with event-driven query engine, reactive state management, and modular tool system

**Key Characteristics:**
- Streaming query engine with progressive tool execution and compaction
- React-based state management (Zustand-pattern store) with AppState context
- Composable tool system with permission/validation layers
- Service-oriented architecture with feature flags for dead-code elimination
- Ink-based React terminal UI with deferred prefetching and lifecycle management

## Layers

**Query Engine & Model Interaction:**
- Purpose: Execute multi-turn conversations with Claude, manage tool calls, handle streaming responses
- Location: `QueryEngine.ts`, `query.ts`, `query/` directory
- Contains: Streaming orchestration, tool invocation, budget tracking, compaction pipeline
- Depends on: Tools, AppState, Services (api, compact, analytics)
- Used by: Main REPL loop, assistant mode, coordinator mode

**Tool System:**
- Purpose: Define and execute tools (Bash, file operations, agents, MCP, etc.) with permission validation
- Location: `Tool.ts`, `tools/` directory
- Contains: Tool definitions, input validation, execution context, progress tracking
- Depends on: Permission system, Shell execution, AppState
- Used by: QueryEngine for tool invocation during conversation

**State Management:**
- Purpose: Maintain global application state, settings, and UI configuration
- Location: `state/AppStateStore.ts`, `state/AppState.tsx`, `state/store.js`
- Contains: Model selection, verbose mode, tasks, permissions, teammate info, speculation state
- Depends on: Settings utilities, notification system
- Used by: All UI components, tools, services

**Services Layer:**
- Purpose: Domain-specific business logic separated from core engine
- Location: `services/` directory
- Contains: API communication, MCP client, analytics, authentication, compaction, permissions
- Key services:
  - `api/` - Claude API calls, bootstrap data, file downloads
  - `mcp/` - Model context protocol client and server management
  - `analytics/` - GrowthBook feature flags, event logging
  - `compact/` - Message history compaction and snipping
  - `tools/` - Tool execution orchestration and streaming
  - `oauth/`, `remoteManagedSettings/` - Authentication and configuration

**Commands Layer:**
- Purpose: CLI command implementations and handlers
- Location: `commands.ts`, `commands/` directory
- Contains: ~100 commands (clear, status, help, config, review, plan, etc.)
- Depends on: QueryEngine, Tools, Services, AppState
- Used by: Main CLI dispatcher, feature-gated command registration

**UI/Components:**
- Purpose: React components for terminal rendering via Ink
- Location: `ink/` directory, `components/` directory
- Contains: Ink primitives (Layout, Text, Box), interactive dialogs, message rendering
- Depends on: Ink library, React, terminal context (size, focus, clock)
- Used by: Main app component, dialog launchers, command handlers

**Utilities:**
- Purpose: Cross-cutting helper functions and adapters
- Location: `utils/` directory (331 files organized by concern)
- Contains: File operations, Shell command execution, Git integration, permissions, settings, model selection, formatting
- Key areas:
  - `bash/` - Command parsing, AST analysis, permission rules
  - `permissions/` - Permission mode tracking, classifier, filesystem restrictions
  - `settings/` - Configuration management, MDM/keychain integration
  - `model/` - Model selection logic, cost tracking
  - `messages/` - Message normalization, system prompt building

**Context & Contexts:**
- Purpose: Prepare system and user context injected into every query
- Location: `context.ts`, `context/` directory
- Contains: Git status collection, CLAUDE.md file aggregation, memoized context builders
- Depends on: Git utilities, file system operations
- Used by: QueryEngine to build system prompts

## Data Flow

**Conversation Turn (Main Loop):**

1. User provides input via REPL or command invocation
2. Early input captured in `seedEarlyInput()` for responsiveness
3. `QueryEngine.query()` called with:
   - Current AppState
   - Tools registry
   - System/user context
   - Compacted message history
4. System prompt built with git status + CLAUDE.md context
5. User message normalized and combined with accumulated messages
6. `queryModelWithStreaming()` calls Claude API with streaming
7. As tool calls arrive, `StreamingToolExecutor` invokes tools in parallel
8. Tool results accumulated with output truncation and result storage
9. Compaction happens during response (if `HISTORY_SNIP` feature enabled)
10. AppState updated with new messages, task state, speculation results
11. UI re-renders via Ink
12. On completion, messages persisted to session storage

**State Management:**
- AppState held in Zustand store created during `main.tsx` initialization
- AppStateProvider wraps all interactive components, injected via context
- Settings changes trigger `applySettingsChange()` which patches AppState
- Tools read AppState via `getAppState()`, update via `setAppState()`
- Speculation state tracks pipelined completions for faster feel

**Tool Invocation Pipeline:**

1. Tool call extracted from assistant message
2. `findToolByName()` resolves tool from registry
3. Permission check via `canUseTool()` hook
4. Input validation via tool's Zod schema or `buildTool()` validator
5. Execution context prepared with file cache, AppState getter/setter
6. Tool invoked with `setToolJSX()` for progressive UI updates
7. Progress events (BashProgress, TaskOutputProgress, etc.) streamed to client
8. Tool result built and added to message history
9. Budget checked (token, file result size, task output limits)
10. If result too large, stored to disk with reference instead of inline

## Key Abstractions

**QueryEngine:**
- Purpose: Orchestrate streaming model interaction with tool invocation
- Examples: `QueryEngine.ts`, `query.ts`
- Pattern: Dependency injection for testability (QueryDeps), stream processing with early termination

**Tool:**
- Purpose: Represent an executable action with schema, permissions, progress
- Examples: `tools/BashTool/`, `tools/FileEditTool/`, `tools/AgentTool/`
- Pattern: Builder pattern via `buildTool()`, JSX rendering for UI updates, progressive execution

**AppState:**
- Purpose: Global reactive state container
- Examples: `state/AppStateStore.ts`
- Pattern: Zustand store with `useAppState()` hook for selectors

**Service (e.g., MCPService, AnalyticsService):**
- Purpose: Encapsulate external integrations or complex domains
- Examples: `services/mcp/client.ts`, `services/analytics/index.ts`
- Pattern: Async initialization, lazy imports with feature flags, event-based notifications

**Task:**
- Purpose: Long-running background operation (bash, agent, workflow, MCP monitor)
- Examples: `tasks/LocalShellTask/`, `tasks/RemoteAgentTask/`
- Pattern: State machine (pending → running → completed/failed/killed), output streaming to disk

## Entry Points

**Main CLI:**
- Location: `main.tsx`
- Triggers: Application startup (parsing argv, initializing MDM/keychain in parallel)
- Responsibilities: Profile checkpoint markers, context initialization, command dispatch, Ink setup

**Query REPL:**
- Location: `replLauncher.tsx`, `interactiveHelpers.tsx`
- Triggers: User enters a prompt
- Responsibilities: Message preprocessing, QueryEngine dispatch, AppState updates, Ink rendering

**Commands:**
- Location: `commands/` directory (e.g., `commands/plan/`, `commands/review/`)
- Triggers: CLI subcommand invocation
- Responsibilities: Parse flags, build query config, invoke QueryEngine, render results

**Assistant/Kairos Mode:**
- Location: `assistant/` directory (feature-gated)
- Triggers: `--assistant` flag or environment variable
- Responsibilities: Different conversation loop optimized for server-side agent behavior

**Coordinator Mode:**
- Location: `coordinator/` directory (feature-gated)
- Triggers: `COORDINATOR_MODE` feature flag
- Responsibilities: Multi-agent orchestration, teammate management, specialized prompt building

## Error Handling

**Strategy:** Typed error categories with recovery paths; permission denials tracked separately from exceptions

**Patterns:**

- **API Errors:** `categorizeRetryableAPIError()` in `services/api/errors.js` determines retry eligibility
- **Tool Validation:** Schema failures caught by Zod, rendered in tool result with error details
- **Permission Denials:** Tracked in `denialTrackingState`, can trigger auto-deny or prompt user via dialog
- **File I/O:** Wrapped in try-catch with graceful fallbacks (e.g., file read → empty if ENOENT)
- **Orphaned Tasks:** Cleanup on shutdown via `gracefulShutdown()`, prevents zombie processes
- **Bash Parsing:** AST errors in `parseForSecurity()` don't crash query, rendered as validation error

## Cross-Cutting Concerns

**Logging:**

- Info: `logForDiagnosticsNoPII()` for startup metrics, `logEvent()` for analytics
- Errors: `logError()`, `logForDebugging()`, `logAntError()` for internal debugging
- Structured: Checkpoints in startup profiler track timing

**Validation:**

- Bash commands: `parseForSecurity()` + permission rules + `checkReadOnlyConstraints()`
- File operations: Permission mode checks, workspace boundary checks
- Tool input: Zod schemas auto-generated or manually defined in `buildTool()`
- Quoted strings: `semanticBoolean()`, `semanticNumber()` parse user intent

**Authentication:**

- OAuth tokens: Prefetched in parallel during startup
- API keys: Stored in keychain (macOS) or secure storage
- Managed settings: Loaded from MDM / remote policy
- Trust dialog: Gated until accepted

**Feature Flags:**

- Compile-time: `feature('COORDINATOR_MODE')`, `feature('KAIROS')` enable dead-code elimination
- Runtime: GrowthBook cached values checked via `getFeatureValue_CACHED_MAY_BE_STALE()`
- Remote: `isPolicyAllowed()` checks remote policy limits
- Speculative: `ENABLE_AGENT_SWARMS`, `HISTORY_SNIP` control behavioral features

---

*Architecture analysis: 2026-03-31*
