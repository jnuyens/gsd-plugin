# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
/Users/jnuyens/claude-code-gsd/
├── main.tsx                          # CLI entry point, argument parsing, initialization
├── QueryEngine.ts                    # Streaming query orchestrator
├── query.ts                          # High-level query API
├── Tool.ts                           # Tool definitions and type system
├── Task.ts                           # Task lifecycle and types
├── commands.ts                       # Command registry and dispatcher
├── context.ts                        # System/user context builders
├── history.ts                        # Conversation history management
├── cost-tracker.ts                   # Model usage and cost tracking
├── projectOnboardingState.ts         # Project setup state
├── setup.ts                          # Initialization and setup screens
├── replLauncher.tsx                  # REPL entry point
├── interactiveHelpers.tsx            # Dialog and rendering helpers
├── dialogLaunchers.tsx               # Dialog component launchers
├── ink.ts                            # Ink terminal framework entrypoint
├── ink/                              # Terminal UI components
│   ├── ink.tsx                       # Ink root renderer
│   ├── Ansi.tsx                      # ANSI to React component converter
│   ├── components/                   # Reusable Ink primitives (Layout, Text, Box, etc.)
│   ├── events/                       # Event handling and coordination
│   ├── hooks/                        # React hooks for terminal state
│   ├── layout/                       # Layout calculation (Yoga)
│   └── termio/                       # Terminal I/O and ANSI sequences
├── components/                       # React/Ink UI components for dialogs and features
│   ├── design-system/                # Design tokens and component library
│   ├── diff/                         # Diff visualization
│   ├── messages/                     # Message rendering
│   ├── shell/                        # Shell UI components
│   ├── mcp/                          # MCP UI components
│   ├── agents/                       # Agent UI components
│   └── [Feature]/                    # Feature-specific components
├── commands/                         # CLI command implementations (~100 subcommands)
│   ├── plan/                         # /gsd:plan-phase command
│   ├── review/                       # Code review command
│   ├── diff/                         # Diff display command
│   ├── compact/                      # History compaction command
│   ├── agents/                       # Agent management command
│   ├── config/                       # Configuration command
│   └── [OtherCommand]/               # Other commands
├── tools/                            # Tool implementations
│   ├── BashTool/                     # Shell execution (primary tool)
│   ├── FileEditTool/                 # File editing with diff
│   ├── FileReadTool/                 # File reading
│   ├── FileWriteTool/                # File writing
│   ├── AgentTool/                    # Sub-agent spawning
│   ├── LSPTool/                      # Language server integration
│   ├── MCPTool/                      # MCP resource access
│   ├── WebFetchTool/                 # HTTP requests
│   ├── REPLTool/                     # Python/Node REPL
│   ├── TaskCreateTool/               # Task management
│   ├── shared/                       # Shared tool utilities (permissions, git tracking)
│   └── [OtherTool]/                  # Other tools
├── services/                         # Domain-specific services
│   ├── api/                          # Claude API client and bootstrap
│   │   ├── claude.ts                 # Streaming API calls with retry
│   │   ├── bootstrap.ts              # Model/settings bootstrap data
│   │   ├── filesApi.ts               # File upload/download
│   │   └── [Other]/
│   ├── mcp/                          # Model Context Protocol client
│   │   ├── client.ts                 # MCP resource aggregation
│   │   ├── types.ts                  # MCP type definitions
│   │   ├── elicitationHandler.ts     # MCP elicitation flow
│   │   └── [Other]/
│   ├── compact/                      # Message history compaction
│   │   ├── autoCompact.ts            # Automatic compaction triggers
│   │   ├── compact.ts                # Compaction algorithm
│   │   ├── snipCompact.ts            # Snipping (feature-gated)
│   │   └── microCompact.ts           # Micro-compaction
│   ├── tools/                        # Tool execution orchestration
│   │   ├── StreamingToolExecutor.ts  # Parallel tool execution
│   │   ├── toolOrchestration.ts      # Tool invocation pipeline
│   │   └── [Other]/
│   ├── analytics/                    # Event logging and feature flags
│   │   ├── growthbook.ts             # Feature flag client (cached)
│   │   ├── index.ts                  # Event logging
│   │   └── [Other]/
│   ├── oauth/                        # OAuth flow management
│   ├── remoteManagedSettings/        # Remote policy/MDM loading
│   ├── policyLimits/                 # Token and rate limit enforcement
│   ├── lsp/                          # Language server management
│   ├── plugins/                      # Plugin loading and management
│   ├── SessionMemory/                # Session-scoped memory
│   ├── extractMemories/              # Memory extraction pipeline
│   └── [Other]/
├── state/                            # State management
│   ├── AppStateStore.ts              # Zustand store definition
│   ├── AppState.tsx                  # React provider and hooks
│   ├── AppStateStore.ts              # Store factory
│   ├── onChangeAppState.ts           # Change handlers
│   └── store.js                      # Store factory
├── tasks/                            # Task executors
│   ├── LocalShellTask/               # Local bash execution
│   ├── RemoteAgentTask/              # Remote agent invocation
│   ├── LocalAgentTask/               # Local agent spawning
│   ├── InProcessTeammateTask/        # In-process teammate
│   ├── DreamTask/                    # Dream (LLM-generated) tasks
│   └── types.ts                      # Task type definitions
├── query/                            # Query orchestration utilities
│   ├── tokenBudget.ts                # Token budget tracking
│   ├── stopHooks.ts                  # Stop condition handlers
│   ├── config.ts                     # Query configuration builder
│   ├── deps.ts                       # Dependency injection (testability)
│   ├── transitions.ts                # State transition types
│   └── [Other]/
├── types/                            # TypeScript type definitions
│   ├── message.ts                    # Message types (User, Assistant, System)
│   ├── permissions.ts                # Permission system types
│   ├── tools.ts                      # Tool-specific types
│   ├── plugin.ts                     # Plugin manifest types
│   ├── ids.ts                        # ID types (TaskId, AgentId)
│   ├── generated/                    # Generated types from schemas
│   └── [Other]/
├── utils/                            # Helper functions (331 files organized by concern)
│   ├── bash/                         # Bash command parsing and security
│   │   ├── commands.ts               # Command splitting logic
│   │   ├── ast.ts                    # AST parsing for permissions
│   │   └── [Other]/
│   ├── permissions/                  # Permission system
│   │   ├── PermissionMode.ts         # Permission modes (default, auto, etc.)
│   │   ├── filesystem.ts             # Filesystem restrictions
│   │   ├── denialTracking.ts         # Track denied permissions
│   │   ├── permissionSetup.ts        # Permission initialization
│   │   └── [Other]/
│   ├── settings/                     # Configuration and settings
│   │   ├── settings.ts               # Setting definitions and getters
│   │   ├── mdm/                      # MDM (macOS, Windows) policy reading
│   │   ├── changeDetector.ts         # Watch for setting changes
│   │   └── [Other]/
│   ├── git/                          # Git integration
│   │   ├── index.ts                  # Git command wrappers
│   │   └── [Other]/
│   ├── model/                        # Model selection and pricing
│   │   ├── model.ts                  # Model lookup and cost data
│   │   └── [Other]/
│   ├── messages/                     # Message utilities
│   │   ├── mappers.ts                # Type conversions (SDK ↔ internal)
│   │   ├── systemInit.ts             # System prompt building
│   │   └── [Other]/
│   ├── hooks/                        # Validation hooks
│   │   ├── postSamplingHooks.ts      # Post-completion hooks
│   │   ├── sessionHooks.ts           # Session-scoped hooks
│   │   └── [Other]/
│   ├── Shell.ts                      # Shell command execution wrapper
│   ├── ShellCommand.ts               # Command building and execution
│   ├── file.ts                       # File operations
│   ├── api.ts                        # API utilities
│   ├── config.ts                     # Global config file access
│   ├── cwd.ts                        # Current working directory tracking
│   ├── envUtils.ts                   # Environment variable helpers
│   ├── team.ts                       # Team context management
│   ├── claudemd.ts                   # CLAUDE.md file aggregation
│   ├── auth.ts                       # Authentication utilities
│   ├── effort.ts                     # Effort estimation
│   ├── thinking.ts                   # Thinking mode configuration
│   ├── fastMode.ts                   # Fast mode toggling
│   ├── theme.ts                      # Theme configuration
│   ├── format.ts                     # Text formatting utilities
│   ├── SessionStorage.ts             # Session transcript persistence
│   ├── fileHistory.ts                # File edit history tracking
│   └── [Many other utilities]/
├── constants/                        # Application constants
│   ├── oauth.ts                      # OAuth configuration
│   ├── product.ts                    # Product URLs and constants
│   ├── querySource.ts                # Query source types
│   ├── toolLimits.ts                 # Tool output limits
│   ├── xml.ts                        # XML tag constants
│   └── [Other]/
├── hooks/                            # React hooks (for tools)
│   ├── useCanUseTool.ts              # Permission checking hook
│   ├── useSettingsChange.ts          # Settings change listener
│   ├── toolPermission/               # Permission hook utilities
│   └── [Other]/
├── context/                          # React context providers
│   ├── notifications.ts              # Notification system
│   ├── stats.ts                      # Statistics store
│   ├── voice.ts                      # Voice context (feature-gated)
│   └── [Other]/
├── native-ts/                        # Native module bindings
│   ├── file-index/                   # File indexing
│   ├── color-diff/                   # Diff coloring
│   └── yoga-layout/                  # Layout calculation
├── bootstrap/                        # Initialization state
│   └── state.ts                      # Bootstrap state getters/setters
├── entrypoints/                      # Entry point modules
│   ├── init.ts                       # Initialization sequence
│   ├── agentSdkTypes.ts              # SDK type definitions
│   └── sdk/                          # Agent SDK entrypoint
├── migrations/                       # State migrations
│   └── [Migration files]/
├── plugins/                          # Plugin system
│   └── bundled/                      # Built-in plugins
├── skills/                           # Skills system
│   └── bundled/                      # Built-in skills
├── schemas/                          # Data validation schemas
│   └── [Zod schemas]/
├── keybindings/                      # Keyboard binding definitions
│   └── [Keybinding configs]/
├── outputStyles/                     # Output styling configurations
├── vim/                              # Vim integration
├── voice/                            # Voice mode support
├── assistant/                        # Assistant mode (feature-gated)
│   └── gate.ts                       # Feature gate
├── coordinator/                      # Coordinator mode (feature-gated)
│   └── coordinatorMode.ts            # Multi-agent orchestration
├── bridge/                           # Bridge mode (feature-gated)
├── buddy/                            # Buddy system (feature-gated)
├── memdir/                           # Memory directory (notes, todos)
├── moreright/                        # Extended features
├── remote/                           # Remote execution support
├── upstreamproxy/                    # Upstream proxy support
├── screens/                          # Setup screens and dialogs
├── server/                           # Server mode support
├── .planning/                        # Planning documents
└── .claude/                          # User instructions
```

## Directory Purposes

**Root-level TS files:**
- `main.tsx`: Application entry point, parses CLI arguments, initializes context in parallel
- `QueryEngine.ts`: Core streaming query orchestrator, manages model interaction
- `query.ts`: High-level query API, coordinates QueryEngine with tools and state
- `Tool.ts`: Tool type system and registry
- `Task.ts`: Task state machine and ID generation
- `commands.ts`: Command registry and routing dispatcher
- `context.ts`: System context (git status) and user context (CLAUDE.md) memoized builders

**ink/:**
- `ink.tsx`: React root that renders to terminal, manages lifecycle
- `components/`: Primitive UI building blocks (Layout, Text, Box, Link, Spacer)
- `hooks/`: React hooks for terminal state (useTerminalSize, useClock, useFocus)
- `layout/`: Yoga-based layout calculation engine
- `termio/`: Terminal I/O, ANSI sequence generation, cursor control
- `events/`: Event loop coordination and propagation

**components/:**
- UI components for dialogs, settings, diffs, messages
- Organized by feature (mcp, agents, permissions, tasks, etc.)
- Import from `ink/` for primitives, use React functional patterns

**commands/:**
- Each command is a separate directory with `index.ts` and supporting files
- Commands register via `commands.ts` which imports all subcommands
- Some feature-gated via `feature()` or conditional `require()` for DCE

**tools/:**
- Each tool is a directory with `[ToolName].tsx` (implementation) and supporting files
- Tools registered via `tools.ts` which imports all tool definitions
- `shared/`: Permission checking, git operation tracking used by multiple tools

**services/:**
- Encapsulate external integrations (API, MCP, OAuth) and complex domains (compaction, analytics)
- Async initialization and lazy imports where appropriate
- Some services feature-gated (analytics, voice)

**state/:**
- Single Zustand store definition with all AppState fields
- Provider wraps interactive components, injected via React context
- Change handlers listen to settings and update store atomically

**tasks/:**
- Each task type (LocalShellTask, RemoteAgentTask, etc.) spawns a long-running background operation
- Tasks write output to disk, maintain state machine, notify on completion/error

**utils/:**
- Organized by concern: bash (parsing), permissions (validation), settings (config), git (vcs), model (selection), messages (message handling)
- Helper functions for file I/O, shell execution, formatting, path handling
- Large utility files: Cursor.ts (46KB), analyzeContext.ts (42KB), auth.ts (65KB)

**types/:**
- TypeScript type definitions and interfaces
- Message types, permission types, tool types, plugin manifest
- Generated types from Zod schemas stored in `generated/`

**constants/:**
- Immutable configuration: OAuth endpoints, product URLs, XML tag names, tool output limits

**Native modules (native-ts/):**
- `file-index/`: Fast file indexing for codebase analysis
- `color-diff/`: Diff coloring engine
- `yoga-layout/`: Layout calculation (native Yoga library)

**Feature-gated directories:**
- `assistant/`: Kairos mode (feature-gated)
- `coordinator/`: Multi-agent coordination (feature-gated)
- `bridge/`: Bridge mode (feature-gated)
- `buddy/`: Buddy system (feature-gated)

## Key File Locations

**Entry Points:**
- `main.tsx`: CLI startup, argument parsing, command dispatch
- `replLauncher.tsx`: Interactive REPL launcher
- `interactiveHelpers.tsx`: Helper functions for dialogs and rendering
- `entrypoints/init.ts`: Initialization sequence (trust dialog, bootstrap, plugins)
- `entrypoints/sdk/`: SDK mode entrypoint for agent use

**Configuration:**
- `utils/config.ts`: Global config file (~/.claude/config.json)
- `utils/settings/`: Setting definitions, MDM/keychain reading
- `.claude/`: User's CLAUDE.md instructions
- `.planning/codebase/`: Architecture documentation (you are here)

**Core Logic:**
- `QueryEngine.ts`, `query.ts`: Conversation loop with streaming
- `query/deps.ts`: Dependency injection for testability
- `query/config.ts`: Query configuration builder
- `query/stopHooks.ts`: Stop condition handlers
- `query/tokenBudget.ts`: Token accounting

**State Management:**
- `state/AppStateStore.ts`: Zustand store definition
- `state/AppState.tsx`: React provider and hooks
- `state/onChangeAppState.ts`: Change event handlers

**Tools Registry:**
- `Tool.ts`: Tool type definitions
- `tools.ts`: Tool registry and builder
- `tools/[ToolName]/`: Individual tool implementations

**Testing/Mocking:**
- `query/deps.ts`: Dependency injection pattern for tests
- `services/api/`: Mock rate limits, VCR fixture support
- `tools/testing/`: Test utilities for tool execution

## Naming Conventions

**Files:**
- TypeScript components: `ComponentName.tsx` (React components) or `.ts` (pure functions)
- Tools: `[ToolName].tsx` (main), `UI.tsx` (rendering), `prompt.ts` (schema/prompts)
- Services: `[ServiceName].ts` or `[domain]/` directory with multiple files
- Utilities: `featureName.ts` or `featureName/` directory
- Tests: `.test.ts` or `.spec.ts` (alongside implementation)

**Directories:**
- Compound words: `camelCase` (e.g., `analyzeContext`, `fileStateCache`)
- Feature/domain: `PascalCase` for tools/tasks (e.g., `BashTool`, `AgentTool`)
- Service domains: `camelCase` (e.g., `mcp/`, `oauth/`, `compact/`)
- Utilities: `camelCase` (e.g., `bash/`, `permissions/`, `settings/`)

**Exported Functions:**
- Hooks: `use[Feature]` (e.g., `useAppState`, `useCanUseTool`, `useSettingsChange`)
- Getters: `get[Thing]` (e.g., `getSystemContext`, `getTools`, `getCommands`)
- Builders: `build[Thing]` or `create[Thing]` (e.g., `buildTool`, `createStore`)
- Executors: `[action][Thing]` (e.g., `queryModelWithStreaming`, `runTools`)

**Constants:**
- Feature names: `SCREAMING_SNAKE_CASE` (e.g., `COORDINATOR_MODE`, `KAIROS`)
- Config keys: `camelCase` (e.g., `hasCompletedOnboarding`, `selectedIPAgentIndex`)

## Where to Add New Code

**New Feature:**
- Primary code: `tools/[FeatureName]/[FeatureName].tsx` (if tool), or `services/[featureName]/` (if service)
- UI components: `components/[featureName]/` for feature-specific components
- Tests: Alongside implementation with `.test.ts` suffix
- Types: `types/[featureName].ts` or inline in feature directory

**New Component/Module:**
- Implementation: `components/[ComponentName]/index.tsx` (or `[ComponentName].tsx`)
- Sub-components: `components/[ComponentName]/[SubComponent].tsx`
- Styling: CSS-in-JS or inline styles (Ink doesn't use CSS files)
- Tests: `components/[ComponentName]/[ComponentName].test.tsx`

**Utilities:**
- Shared helpers: `utils/[featureName].ts` (if < 200 lines) or `utils/[featureName]/index.ts` (if directory)
- File operations: Add to `utils/file.ts` or create `utils/filePersistence/`
- Shell operations: Add to `utils/Shell.ts` or `utils/ShellCommand.ts`
- Bash-specific: Place in `utils/bash/` directory

**New Tool:**
- Create `tools/[ToolName]/` directory with:
  - `[ToolName].tsx`: Main tool implementation via `buildTool()`
  - `UI.tsx`: Tool-specific UI rendering
  - `prompt.ts`: Input schema and display prompts
  - `[feature].ts`: Supporting logic (permissions, validation, etc.)
- Register in `tools.ts` via `getTools()` function
- Add types to `types/tools.ts` if needed

**New Command:**
- Create `commands/[command-name]/` directory with:
  - `index.ts`: Command handler function
  - `[feature].ts`: Supporting logic
- Register in `commands.ts` via `getCommands()` function
- Add types to `types/message.ts` or `Tool.ts` if needed

## Special Directories

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes
- Committed: No

**dist/, build/:**
- Purpose: Compiled/bundled output
- Generated: Yes
- Committed: No

**migrations/:**
- Purpose: State schema migrations (settings, AppState shape changes)
- Generated: No
- Committed: Yes

**.planning/codebase/:**
- Purpose: Architecture documentation generated by /gsd:map-codebase command
- Generated: Yes
- Committed: Yes

**types/generated/:**
- Purpose: Auto-generated types from Zod schemas
- Generated: Yes
- Committed: Yes

---

*Structure analysis: 2026-03-31*
