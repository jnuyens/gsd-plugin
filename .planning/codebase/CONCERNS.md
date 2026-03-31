# Codebase Concerns

**Analysis Date:** 2026-03-31

## Tech Debt

**Mutable Message State in CLI Print Loop:**
- Issue: Messages array is directly mutated during ask() calls instead of using immutable updates
- Files: `cli/print.ts` (line 1144-1145)
- Impact: Difficult to trace state changes, harder to debug message transformations, potential race conditions with concurrent mutations
- Fix approach: Migrate to immutable message updates or use structured state management with proper cloning in QueryEngine

**Redundant toolUseContext Assignment:**
- Issue: `toolUseContext.messages` is set during setup and then immediately overwritten with the same value
- Files: `query.ts` (line 545-548)
- Impact: Unnecessary computation and state management, confusing control flow
- Fix approach: Remove the initial setup assignment or consolidate into single assignment point

**Console Spy Bypass Security:**
- Issue: Direct stderr writes bypass console hooks that track debug output
- Files: `ink/ink.tsx` (line 1595)
- Impact: Debug output can be hidden from monitoring systems, potential security event leakage
- Fix approach: Redirect all stderr writes through console hooks or implement separate stderr monitoring

**Fragile API Error Detection:**
- Issue: Fast-mode rejection detection uses string pattern matching on error messages instead of response headers
- Files: `services/api/withRetry.ts` (line 597-607)
- Impact: Breaks when API error messages change, requires manual updates
- Fix approach: Implement dedicated response header (e.g., `x-fast-mode-rejected`) and migrate once API supports it

**SDK Status Code Propagation Unreliability:**
- Issue: During streaming, 529 status code sometimes fails to propagate through SDK, must detect via error message pattern
- Files: `services/api/withRetry.ts` (line 618-619)
- Impact: Error detection logic is fragile and coupled to message format; future SDK changes could silently break retry behavior
- Fix approach: Coordinate with SDK maintainers to ensure 529 status always propagates; add integration tests to catch regressions

## Known Bugs

**OAuth Token Cache Race Condition:**
- Symptoms: When two Claude Code instances refresh tokens simultaneously, both may execute full XAA chain and race on storage, wasting requests
- Files: `services/mcp/auth.ts` (line 1743-1750)
- Trigger: Multiple Claude Code processes with expiring OAuth tokens in parallel
- Workaround: Serialize MCP server connections across process instances
- Fix approach: Implement cross-process lockfile (like `refreshAuthorization()` pattern) before GA release

**Citations Delta Unhandled:**
- Symptoms: Citation deltas from streaming API are silently dropped during message assembly
- Files: `services/api/claude.ts` (line 2084-2086)
- Trigger: Any streaming response containing citation information
- Workaround: Citations will not appear in output
- Fix approach: Implement proper citation handling in message assembly pipeline

**IDE Diff UI Incomplete:**
- Symptoms: Diff approval prompt can remain open after IDE exits; no timeout for inactive diffs; UI state desynchronizes from IDE state
- Files: `hooks/useDiffInIDE.ts` (line 212-214)
- Trigger: User closes IDE while diff approval pending; extended inactivity on diff
- Workaround: Manually restart Claude Code to clear stale approval states
- Fix approach: Implement 5-minute inactivity timeout, watch IDE tab state, auto-close on IDE exit

## Security Considerations

**Dynamic Module Loading via `global.require()`:**
- Risk: Using `global.require()` to dynamically load `inspector` module bypasses static analysis
- Files: `main.tsx` (line 256)
- Current mitigation: Limited to debug introspection; only for detecting active debuggers
- Recommendations:
  - Document why dynamic load is necessary (async imports not viable at module level)
  - Consider switching to `node:inspector/promises` if Node version permits
  - Add security comment explaining this is intentional unsafe access

**Type Safety Bypass with `as any`:**
- Risk: One critical `as any` cast on `global` object in main entry point
- Files: `main.tsx` (line 256)
- Current mitigation: Cast is scoped and only accesses standard Node.js module
- Recommendations:
  - Create typed wrapper for `global.require()` to reduce casting scope
  - Document that this is only used for debugging detection at startup

**Eval-Equivalent Command Detection:**
- Risk: BashTool and PowerShellTool must detect eval-equivalent commands to prevent code execution vulnerabilities
- Files: `tools/BashTool/bashSecurity.ts` (line 53, 1074-1077), `tools/PowerShellTool/powershellSecurity.ts` (line 104, 130)
- Current mitigation: Extensive AST-based validation; multiple detection patterns for bash/zsh/PowerShell eval variants
- Recommendations:
  - Maintain HackerOne review findings and ensure patterns cover all discovered bypasses
  - Regular security audits of new shell features and plugin ecosystem

## Performance Bottlenecks

**Large Monolithic Files with Complex State:**
- Problem: Multiple 5000+ line files that handle significant state and operations
- Files:
  - `cli/print.ts` (5594 lines) - Main CLI coordination, ask() loop, message handling
  - `utils/messages.ts` (5512 lines) - Message transformation and normalization
  - `utils/sessionStorage.ts` (5105 lines) - Session state persistence
  - `utils/hooks.ts` (5022 lines) - Hook lifecycle and execution
  - `screens/REPL.tsx` (5005 lines) - Interactive prompt and command processing
- Cause: Monolithic architecture makes hot paths difficult to optimize; large bundle size impact
- Improvement path:
  - Profile memory usage during long sessions
  - Consider splitting into smaller modules with clear boundaries
  - Lazy-load non-critical functionality within large files
  - Implement incremental compilation caching

**Bash Parser Complexity:**
- Problem: Complex recursive descent parser (4436 lines) for bash command analysis
- Files: `utils/bash/bashParser.ts`
- Cause: Comprehensive parsing needed for security validation; full bash syntax support
- Improvement path:
  - Add caching layer for frequently parsed commands
  - Profile hotspots (grep the audit logs for most common command patterns)
  - Consider WASM port if JS parsing becomes bottleneck at scale

**Plugin and MCP System Complexity:**
- Problem: Plugin loader (3302 lines) and MCP client (3348 lines) manage intricate initialization and state
- Files: `utils/plugins/pluginLoader.ts`, `services/mcp/client.ts`
- Cause: Dynamic loading, lifecycle management, error recovery
- Improvement path:
  - Memoization not fully documented (line 589 in mcp/client.ts notes increased complexity)
  - Consider plugin registry pattern to decouple plugin loading from core
  - Profile plugin initialization during startup

**Message Attachment Computation:**
- Problem: Attachments computed at request time rather than as user types
- Files: `utils/attachments.ts` (line 741, 764)
- Cause: Deferred computation to avoid stale attachments
- Improvement path:
  - Implement incremental attachment computation while typing
  - Cache file state to avoid re-reading on each request
  - Consider background attachment indexing

## Fragile Areas

**Message Transformation Pipeline:**
- Files: `cli/print.ts`, `utils/messages.ts`, `query.ts`
- Why fragile: Messages pass through multiple transformation stages (user input → attachment → ask() → query → response assembly) with state mutations at each step
- Safe modification:
  - Add comprehensive test fixtures for each transformation stage
  - Use immutable data structures to prevent accidental mutations
  - Add invariant checks at pipeline boundaries
- Test coverage: No .test.ts files found; zero test coverage for message transformations

**API Response Streaming Assembly:**
- Files: `services/api/claude.ts` (line 2080-2110)
- Why fragile: Incremental assembly of tool_use input JSON from deltas; citations unhandled; content block type mismatches fatal
- Safe modification:
  - Add validation of content block types before assembly
  - Implement proper citation delta handling
  - Add logging of all streaming errors with full delta context
  - Test with edge cases: empty deltas, out-of-order deltas, mixed content types
- Test coverage: Gaps in streaming error paths

**MCP Connection Manager State:**
- Files: `services/mcp/client.ts`, `services/mcp/useManageMCPConnections.ts`
- Why fragile: Concurrent connection setup/teardown; multiple auth flows (OAuth, XAA, direct); token refresh races
- Safe modification:
  - Use state machine pattern explicitly (current implicit in conditionals)
  - Add timeout guards on all async operations
  - Implement connection health checks with automatic restart
  - Add debug logging for state transitions
- Test coverage: No unit tests for connection lifecycle

**Session State Persistence:**
- Files: `utils/sessionStorage.ts`, `bridge/replBridge.ts`
- Why fragile: Session restoration on restart; message history compaction; variable scope caching
- Safe modification:
  - Validate restored state before using (version checks)
  - Implement checksum validation on persisted state
  - Add rollback mechanism if restore fails
  - Test with corrupted/partial state files
- Test coverage: No restore error scenarios covered

**Bash Security Validation:**
- Files: `tools/BashTool/bashPermissions.ts` (2621 lines), `tools/BashTool/bashSecurity.ts` (2592 lines)
- Why fragile: Permission decision depends on classifier + multiple validation chains; feature flag `BASH_CLASSIFIER` controls behavior
- Safe modification:
  - Changes to classifier logic must include test cases for all discovered HackerOne bypasses
  - Validate against both old and new logic before deploying
  - Monitor production for new bypass patterns
  - Document relationship between DCE budget limit (line 85) and feature logic
- Test coverage: Classifier behavior is feature-gated; need explicit test suite

## Scaling Limits

**Session History Memory Growth:**
- Current capacity: `pendingEntries` buffer flushes to disk but keeps full transcript in memory
- Files: `history.ts` (line 281), `cli/print.ts` (line 1145)
- Limit: Long multi-day sessions with thousands of messages will OOM
- Scaling path:
  - Implement tiered storage (recent messages in memory, historical in DB)
  - Add message pagination/lazy-loading from disk
  - Consider off-heap storage for compressed history

**Plugin Registry Growth:**
- Current capacity: All installed plugins loaded on startup
- Files: `utils/plugins/pluginLoader.ts`
- Limit: With 100+ plugins installed, startup time becomes prohibitive
- Scaling path:
  - Lazy-load plugins on first use
  - Implement plugin dependency ordering to avoid N² init cycles
  - Add plugin caching layer to avoid filesystem traversal

**Concurrent Ask Loop Requests:**
- Current capacity: Single sequential ask() loop can handle only one query at a time
- Files: `cli/print.ts`, `query.ts`
- Limit: Cannot parallelize independent tool calls within a single agent turn
- Scaling path:
  - Refactor ask loop to support batched tool requests
  - Implement request queuing with priority scheduling
  - Consider separating tool execution from message coordination

**File Change Detection State:**
- Current capacity: `readFileState` cache with fixed size limit
- Files: `cli/print.ts` (line 1165-1167), `tools/FileEditTool/FileEditTool.ts`
- Limit: Large projects with 1000s of modified files will evict important state
- Scaling path:
  - Implement LRU cache with configurable size
  - Add statistics on cache hit rates
  - Consider hybrid disk/memory cache for large workspaces

## Dependencies at Risk

**Upstream Proxy with Limited Error Recovery:**
- Risk: Upstream proxy has "fail open" strategy — any error disables proxy
- Files: `upstreamproxy/upstreamproxy.ts` (line 16)
- Impact: Network errors can silently downgrade proxy effectiveness
- Migration plan:
  - Add metrics tracking for proxy failures
  - Implement health check retries with backoff
  - Consider persistent failure state to avoid thrashing

**Node Inspector Module Dynamic Load:**
- Risk: Using `global.require()` for `inspector` module is unstable across Node versions
- Files: `main.tsx` (line 256)
- Impact: Debug detection may silently fail on version changes
- Migration plan:
  - Test against LTS and current Node versions
  - Add fallback detection methods if require fails
  - Consider conditional import once async top-level import supported

**GrowthBook SDK API Shape Mismatch:**
- Risk: API returns value in `value` field (current) or `defaultValue` field (post-fix)
- Files: `services/analytics/growthbook.ts` (line 332, 385)
- Impact: Feature flags may fail to evaluate when API changes
- Migration plan:
  - Implement dual-field reading with priority (marked as temporary)
  - Add monitoring for field usage to detect when migration complete
  - Plan complete cutover once upstream API stabilizes

## Missing Critical Features

**Citation Support in Streaming:**
- Problem: Citation deltas received during streaming but silently dropped
- Blocks: Cannot display inline citations in responses
- Impact: User loses rich information about response sources
- Priority: Medium (affects response quality, not functionality)

**Cross-Process Token Refresh Coordination:**
- Problem: No lockfile mechanism for OAuth token refresh across processes
- Blocks: Running multiple Claude Code instances with shared MCP servers
- Impact: Wasted API requests, potential token revocation
- Priority: High (GA blocker per TODO comment)

**Idle Timeout for Diff Approval:**
- Problem: IDE diff approval UI has no timeout
- Blocks: Cannot auto-dismiss stale approval prompts
- Impact: Terminal can hang indefinitely waiting for user approval
- Priority: Medium (affects user experience)

**Plugin Lazy Loading:**
- Problem: All plugins loaded on startup
- Blocks: Cannot scale to 100+ plugin installations
- Impact: Startup time degrades with plugin count
- Priority: Low (future scaling concern)

## Test Coverage Gaps

**Message Transformation Pipeline:**
- What's not tested: Entire multi-stage transformation from user input through ask() to response assembly
- Files: `cli/print.ts`, `utils/messages.ts`, `query.ts`, `services/api/claude.ts`
- Risk: Regressions in message ordering, content loss, type mismatches go undetected
- Priority: High (core functionality)

**API Streaming Error Scenarios:**
- What's not tested: Content block type mismatches, out-of-order deltas, malformed JSON deltas, citations
- Files: `services/api/claude.ts` (line 2080-2150)
- Risk: Streaming failures can crash message assembly
- Priority: High (affects reliability)

**Session Restoration:**
- What's not tested: Restore from corrupted state, partial state, version mismatches, memory pressure
- Files: `utils/sessionStorage.ts`, `bridge/replBridge.ts`
- Risk: Session restore failures can cause data loss or crashes
- Priority: High (affects persistence)

**MCP Connection Lifecycle:**
- What's not tested: Concurrent setup/teardown, token refresh races, reconnection after network failure
- Files: `services/mcp/client.ts`, `services/mcp/useManageMCPConnections.ts`
- Risk: Connection management bugs manifest as cryptic auth failures
- Priority: High (affects reliability)

**Bash Permission Classification:**
- What's not tested: New shell features, known HackerOne bypasses, feature flag toggle behavior
- Files: `tools/BashTool/bashPermissions.ts`
- Risk: Security regressions can be deployed undetected
- Priority: Critical (security)

**IDE Diff State Management:**
- What's not tested: Timeout handling, IDE exit scenarios, concurrent approval requests
- Files: `hooks/useDiffInIDE.ts`
- Risk: UI can get stuck or show inconsistent state
- Priority: Medium (affects user experience)

**Plugin Initialization:**
- What's not tested: Plugin load order, circular dependencies, schema validation failures, memory constraints
- Files: `utils/plugins/pluginLoader.ts`
- Risk: Broken plugins can prevent Claude Code startup
- Priority: Medium (affects reliability)

**File Change Detection:**
- What's not tested: Cache eviction, large file lists, external file modifications, concurrent edits
- Files: `cli/print.ts`, `utils/attachments.ts`
- Risk: File changes missed or incorrectly attributed
- Priority: Medium (affects correctness)

---

*Concerns audit: 2026-03-31*
