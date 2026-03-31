# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**AI/LLM:**
- Anthropic Claude - Primary LLM backend
  - SDK/Client: `@anthropic-ai/sdk` (beta messages API)
  - Auth: `ANTHROPIC_API_KEY`
  - Endpoint: `ANTHROPIC_BASE_URL` (customizable for 3P providers)
  - Implementation: `services/api/claude.ts` - streaming messages, tool use, prompt caching

**Alternative AI Providers:**
- AWS Bedrock - Supported via credential assumption
  - Auth: AWS credentials (via `prefetchAwsCredentialsAndBedRockInfoIfSafe()`)
  - Configuration: `utils/model/providers.ts`
  - Models: Updated dynamically via `updateBedrockModelStrings()`

- Google Cloud Vertex AI - Supported via OAuth
  - Auth: GCP credentials (via `prefetchGcpCredentialsIfSafe()`)
  - Configuration: `utils/model/providers.ts`

**Analytics & Feature Flags:**
- GrowthBook - Feature flags and experimentation platform
  - SDK/Client: `@growthbook/growthbook`
  - Implementation: `services/analytics/growthbook.ts`
  - Features: User targeting, A/B testing, feature toggles
  - User attributes tracked: UUID, sessionId, deviceID, platform, subscription tier, rateLimitTier, firstTokenTime, email, appVersion, GitHub Actions metadata

**Web Search:**
- Anthropic Web Search (beta) - Integrated via Claude API beta features
  - SDK: `@anthropic-ai/sdk/resources/beta/messages/messages.mjs`
  - Implementation: `tools/WebSearchTool/WebSearchTool.ts`
  - Configuration: Domain filtering (allowed_domains, blocked_domains)

**LSP & IDE:**
- LSP Protocol - Language Server Protocol for IDE integration
  - SDK: `vscode-languageserver-protocol`
  - Implementation: `tools/LSPTool/` directory
  - Purpose: IDE/editor integration and code intelligence

## Data Storage

**Session Storage:**
- Local file system only - No remote database
  - Format: Transcript files stored locally
  - Location: Project-specific directories (session-based)
  - Implementation: `utils/sessionStorage.ts` - file read/write operations
  - Features: Session persistence, transcript recording, file history snapshots

**Caching:**
- LRU Cache - In-memory caching
  - Package: `lru-cache`
  - Implementation: Various modules using memoization
  - Purpose: Performance optimization for frequently accessed data

**File Storage:**
- Local filesystem only - No cloud storage integration detected
  - File operations: `fs/promises` and synchronous `fs`
  - File watching: `chokidar` for real-time file monitoring
  - Lock management: `proper-lockfile` for concurrent access coordination

## Authentication & Identity

**Auth Provider:**
- Custom OAuth 2.0 implementation
  - Implementation: `services/oauth/` directory
  - Flow: Authorization code flow with PKCE
  - Callback handling: Local HTTP server listener on configurable port (default localhost callback endpoint)
  - File: `services/oauth/auth-code-listener.ts` - HTTP callback listener
  - File: `services/oauth/client.ts` - OAuth client implementation
  - File: `services/oauth/crypto.ts` - PKCE code challenge generation
  - File: `services/oauth/index.ts` - Main OAuth service orchestration

**OAuth Configuration:**
- Custom OAuth endpoints via `CLAUDE_CODE_CUSTOM_OAUTH_URL`
- Local/staging OAuth endpoints via `CLAUDE_LOCAL_OAUTH_*` env vars
- Browser-based flow with fallback to manual code entry
- Support for login hints and organization UUID targeting

**Identity Sources:**
- OAuth token exchange for Claude.ai users
- API key-based auth for programmatic access (`ANTHROPIC_API_KEY`)
- Legacy keychain integration (macOS)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry or explicit error tracking service found

**Analytics/Telemetry:**
- Datadog - Referenced in code (payload buffering via Envoy proxy)
  - Implementation: `services/analytics/sink.ts` - event routing
  - First-party event logging: `services/analytics/firstPartyEventLogger.ts`
  - Note: Datadog fanout happens via sink, with PII-tagged proto fields stripped

- First-party event logging - Custom event exporter
  - Purpose: Privacy-preserving analytics to first-party infrastructure
  - Implementation: `services/analytics/firstPartyEventLogger.ts`
  - Proto field support for structured data

**Logs:**
- Console logging - Primary approach via `utils/log.js`
- Debug mode - File-based debug output via `--debug-file` flag
- Session storage integration - Transcript recording in `utils/sessionStorage.ts`

**Upstream Proxy:**
- Envoy proxy integration - For request relay and buffering
  - Implementation: `upstreamproxy/relay.ts`
  - Purpose: Per-request buffer cap management, payload optimization

## CI/CD & Deployment

**Hosting:**
- Not explicitly defined - Client application
- Distribution: Likely via npm/Bun package registry

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI config found

**Version Control:**
- Git repository detected
- No explicit release process found

## Environment Configuration

**Required env vars (for basic operation):**
- `ANTHROPIC_API_KEY` - Claude API authentication (for public users or programmatic access)
- Or OAuth login via browser (interactive mode)

**Optional env vars:**
- `ANTHROPIC_BASE_URL` - Custom API endpoint (for Bedrock/Vertex/3P providers)
- `USER_TYPE` - "ant" for internal, else external
- `CLAUDE_CODE_CUSTOM_OAUTH_URL` - Custom OAuth provider URL
- `CLAUDE_LOCAL_OAUTH_API_BASE` - Local OAuth API endpoint (dev only)
- `CLAUDE_LOCAL_OAUTH_APPS_BASE` - Local OAuth apps endpoint (dev only)
- `CLAUDE_LOCAL_OAUTH_CONSOLE_BASE` - Local OAuth console endpoint (dev only)
- `CLAUDE_CODE_OVERRIDE_DATE` - Override system date for testing
- `DEBUG` or `--debug-file` - Enable debug logging
- `AWS_*` - AWS credentials for Bedrock integration
- `GCLOUD_*` / `GOOGLE_*` - GCP credentials for Vertex AI

**Secrets location:**
- Environment variables (process.env)
- System keychain (macOS) - OAuth token storage
- .env files (not committed - manual configuration)

## MCP (Model Context Protocol)

**MCP Servers:**
- Multiple MCP server support
  - Official registry: `prefetchOfficialMcpUrls()` in `services/mcp/officialRegistry.ts`
  - Custom servers: Via MCP configuration
  - Implementation: `services/mcp/client.ts` - MCP client orchestration

**Pre-integrated Servers (referenced in code):**
- Slack - `@modelcontextprotocol/server-slack`
- Datadog - `mcp.datadoghq.com`
- Sentry - `getsentry/sentry-mcp`
- Stripe - Third-party MCP server
- AWS - Third-party MCP server

**MCP Features:**
- Tool discovery and execution
- Resource access and reading
- Authentication handling: `services/mcp/xaaIdpLogin.ts` - Identity provider integration
- Permission management: `services/mcp/channelPermissions.ts`
- Tool classification for UI: `tools/MCPTool/classifyForCollapse.ts`

## Webhooks & Callbacks

**Incoming:**
- OAuth callback endpoint - HTTP server on localhost for auth code capture
  - Implementation: `services/oauth/auth-code-listener.ts`
  - Endpoint: `http://localhost:[port]/callback?code=AUTH_CODE&state=STATE`
  - Purpose: Authorization code exchange in OAuth 2.0 flow

**Outgoing:**
- Session ingress telemetry - Calls to session management endpoints
  - Implementation: `services/api/sessionIngress.ts`
  - Purpose: Session state synchronization and quota tracking

- Remote managed settings - Polling for policy and configuration updates
  - Implementation: `services/remoteManagedSettings/index.ts`
  - Purpose: Enterprise policy enforcement, settings sync
  - Polling: Background polling callback for hot-reload support

## Voice & Audio

**Audio Input:**
- Native audio capture via native NAPI module
  - Package: `audio-capture-napi` (CoreAudio on macOS, ALSA on Linux)
  - Fallback: SoX `rec` command or `arecord` (Linux ALSA)
  - Implementation: `services/voice.ts`
  - Configuration: Sample rate 16kHz, mono, silence detection via 2s of 3% threshold

**Speech Recognition:**
- Not explicitly integrated - Audio is captured and sent to API for processing

## HTTP & Network

**HTTP Client:**
- Primary: `axios` - General purpose HTTP requests
- Secondary: `undici` - Node.js native HTTP/2 support
- Proxy support: `https-proxy-agent` for HTTPS proxy tunneling

**WebSocket:**
- `ws` - WebSocket client for real-time communication
  - Purpose: Streaming responses and bidirectional communication

## File System Operations

**Core FS:**
- `fs` (sync) - Synchronous file operations (selective use for critical paths)
- `fs/promises` - Async file operations (preferred)
- `path` - Cross-platform path handling

**File Watching:**
- `chokidar` - Recursive file system monitoring
  - Purpose: Detect file changes for hot-reload

**Glob Patterns:**
- `picomatch` - Fast glob pattern matching
- `ignore` - .gitignore-style pattern matching

## Package Management

**Package Registry:**
- Bun package registry (implied)
- npm/Bun compatible package resolution

**Dependency Resolution:**
- Semver - Semantic versioning support
  - Package: `semver`
  - Purpose: Version constraint resolution

## Process Management

**Child Process Spawning:**
- `child_process` (Node.js API) - Process spawning
- `execa` - Promise-based process execution wrapper
  - Purpose: Running external commands (Bash, PowerShell, git, etc.)

**Process Termination:**
- `tree-kill` - Kill process tree gracefully
  - Purpose: Cleanup of child processes on exit

**Graceful Shutdown:**
- `signal-exit` - Handle SIGTERM/SIGINT
  - Implementation: `utils/gracefulShutdown.ts`
  - Purpose: Cleanup and final sync before exit

## Development & Debugging

**Debug Logging:**
- Custom debug infrastructure: `utils/debug.js`
- Debug file output: `--debug-file` CLI flag
- Environment variable: DEBUG mode

**Profiling:**
- Startup profiler: `utils/startupProfiler.ts`
- Headless profiler: `utils/headlessProfiler.ts`
- Performance measurement for various subsystems

## Security

**URL Parsing & Sanitization:**
- `xss` - XSS attack prevention
- Shell escaping: `shell-quote`

**Cryptography:**
- Node.js `crypto` module - PKCE, UUID generation
- OAuth PKCE support: `services/oauth/crypto.ts`

---

*Integration audit: 2026-03-31*
