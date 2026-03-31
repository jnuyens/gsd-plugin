# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript - Full codebase, types throughout all modules
- TSX (TypeScript + React) - UI components and interactive elements

**Secondary:**
- JavaScript - Legacy/compatibility code, dynamic imports
- Bash/Shell - Used for command execution and scripting

## Runtime

**Environment:**
- Bun - TypeScript runtime and bundler (`bun:bundle` imports seen throughout)
- Node.js compatible APIs used (fs, path, crypto, child_process, etc.)

**Package Manager:**
- Bun package manager (inferred from build system and imports)
- Lockfile: Present (implied by Bun usage)

## Frameworks

**Core:**
- React - UI rendering and interactive components (`react` imports in main.tsx and components/)
- Commander.js - CLI argument parsing and command handling (`@commander-js/extra-typings` for type-safe CLI)

**Streaming & Async:**
- Streaming API from @anthropic-ai/sdk - Real-time message streaming

**Testing:**
- Not detected - No Jest/Vitest/Mocha configuration found

**Build/Dev:**
- Bun bundler - Primary build tool (dead code elimination with `feature()` function)
- TypeScript compiler - For type checking

## Key Dependencies

**Critical:**
- `@anthropic-ai/sdk` - Anthropic Claude API client (messages, beta features, streaming)
- `zod` - Type-safe schema validation (schema definitions in multiple tools)
- `lodash-es` - Utility functions (mapValues, pickBy, uniqBy, last, memoize)

**Infrastructure & Utilities:**
- `@growthbook/growthbook` - Feature flags and A/B testing (`/services/analytics/growthbook.ts`)
- `chalk` - Terminal color output
- `commander` - CLI framework with type-safe options
- `execa` - Process execution (spawning child processes)
- `chokidar` - File system watching
- `marked` - Markdown parsing
- `shell-quote` - Shell command escaping
- `strip-ansi` - ANSI color code removal
- `tree-kill` - Process tree termination
- `axios` - HTTP client
- `undici` - HTTP client (Node.js native fetch implementation)
- `https-proxy-agent` - HTTPS proxy support
- `google-auth-library` - Google Cloud authentication
- `p-map` - Concurrent promise mapping
- `lru-cache` - LRU caching implementation
- `semver` - Semantic versioning
- `picomatch` - Glob pattern matching
- `proper-lockfile` - File locking for concurrent access
- `vscode-languageserver-protocol` - LSP protocol support
- `ws` - WebSocket client/server
- `xss` - XSS protection
- `signal-exit` - Graceful shutdown handling
- `ignore` - .gitignore pattern matching
- `env-paths` - XDG/Windows standard config paths
- `figures` - Unicode symbols for terminal output

**Native Modules:**
- `audio-capture-napi` - Native audio recording (CoreAudio on macOS, ALSA on Linux) - lazy-loaded via `/services/voice.ts`

## Configuration

**Environment:**
- Multiple configuration sources detected:
  - Environment variables (process.env) for feature flags and customization
  - OAuth configuration via `CLAUDE_CODE_*` prefixed env vars
  - User type detection via `USER_TYPE` env var (ant = internal, else = external)
  - AWS/Bedrock credentials via standard AWS env vars
  - GCP credentials via standard GCP env vars

**Build:**
- Bun configuration (bunfig.toml may exist but not explicitly found)
- TypeScript configuration (tsconfig.json may exist but not explicitly found)
- Feature flag system using `feature()` from `bun:bundle` for dead code elimination

**Key Configuration Variables:**
- `ANTHROPIC_API_KEY` - Claude API authentication
- `ANTHROPIC_BASE_URL` - Custom API endpoint (for Bedrock/Vertex/3P providers)
- `USER_TYPE` - Environment type detection (ant = internal)
- `CLAUDE_CODE_*` - Custom overrides for OAuth, dates, etc.
- `CLAUDE_CODE_SIMPLE` - Minimal mode flag
- Various internal flags for development/testing

## Platform Requirements

**Development:**
- macOS, Linux, or Windows (cross-platform support)
- TypeScript 5.x (inferred from usage patterns)
- Bun runtime (implied primary)
- Node.js compatible APIs

**Production:**
- Bun runtime
- Network access to:
  - Anthropic Claude API (api.anthropic.com or custom endpoint)
  - GrowthBook API (feature flags)
  - AWS services (Bedrock - optional)
  - GCP services (Vertex AI - optional)
  - Session ingress endpoints (authenticated)
- System audio capabilities (optional - for voice input)

## Supported Model Providers

**Primary:**
- Anthropic Claude (native integration via @anthropic-ai/sdk)

**Alternative Providers (via environment config):**
- AWS Bedrock - (`prefetchAwsCredentialsAndBedRockInfoIfSafe` in utils/auth.ts)
- Google Cloud Vertex AI - (`prefetchGcpCredentialsIfSafe` in utils/auth.ts)
- Third-party providers - Via ANTHROPIC_BASE_URL override

---

*Stack analysis: 2026-03-31*
