# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- TypeScript files: `camelCase.ts` or `PascalCase.tsx` for React components
  - Example: `cost-tracker.ts`, `QueryEngine.ts`, `FilePathLink.tsx`
- Utility modules use kebab-case: `error-utils.ts`, `envUtils.ts`
- Directories containing tool implementations use PascalCase: `BashTool/`, `FileEditTool/`, `AgentTool/`

**Functions:**
- camelCase for all function declarations
  - Example: `generateTaskId()`, `extractConnectionErrorDetails()`, `formatAPIError()`
- Constants and readonly values in UPPER_SNAKE_CASE: `MAX_STATUS_CHARS`, `TASK_ID_ALPHABET`, `BASH_SEARCH_COMMANDS`
- Hook functions use `use` prefix in camelCase: `useSettings()`, `useAppState()`, `useCanUseTool()`
- Type guard functions use `is` prefix: `isTerminalTaskStatus()`, `hasNestedError()`

**Variables:**
- Local variables: camelCase: `taskId`, `userId`, `currentState`
- Module-level private variables: camelCase with comments indicating intent
  - Example: `let systemPromptInjection: string | null = null`
- Array and collection names: plural form recommended
  - Example: `BASH_SEARCH_COMMANDS`, `TASK_ID_PREFIXES`

**Types:**
- PascalCase for all type declarations and interfaces
  - Example: `TaskState`, `TaskType`, `TaskStatus`, `TaskHandle`
- Type names describe what they represent, not storage format
- Union types use explicit literals: `'pending' | 'running' | 'completed'`
- Generic utility types defined at module level: `ValidationResult`, `ConnectionErrorDetails`

## Code Style

**Formatting:**
- Tool: Biome (configured in the project)
- Line length: Balanced between readability and standard conventions
- Indentation: 2 spaces (standard TypeScript)
- Trailing commas: Enabled for multiline structures
- Quote style: Single quotes preferred, double quotes for JSX attributes

**Linting:**
- Tool: Biome (biome.json configuration enforced)
- ESLint rules disabled where noted: `biome-ignore assist/source/organizeImports` used in `commands.ts` for ANT-ONLY import markers
- Rule suppression comments: Inline with specific rules when necessary
  - Example: `/* eslint-disable @typescript-eslint/no-require-imports */`

## Import Organization

**Order:**
1. Bun-specific imports: `import { feature } from 'bun:bundle'`
2. External npm packages and SDKs: `@anthropic-ai/sdk`, `chalk`, `zod`, `lodash-es`, `react`
3. Type imports from external libraries: `import type { SomeType } from '@anthropic-ai/sdk'`
4. Relative imports from project modules: `from './utils/...'`, `from 'src/...'`
5. Type imports from project: `import type { AppState } from './state/AppState.js'`

**Path Aliases:**
- Absolute imports using `src/` prefix: `src/bootstrap/state.js`, `src/services/...`
- Local relative paths: `./utils/...`, `../types/...`
- All imports include `.js` extension (Bun requirement)

**Example Import Structure:**
```typescript
import { feature } from 'bun:bundle'
import type { APIError } from '@anthropic-ai/sdk'
import chalk from 'chalk'
import {
  getSessionId,
  isSessionPersistenceDisabled,
} from 'src/bootstrap/state.js'
import { EMPTY_USAGE } from 'src/services/api/logging.js'
import type { Command } from './commands.js'
```

## Error Handling

**Patterns:**
- Errors wrapped in try-catch blocks for synchronous operations
- Promise errors handled with `.catch()` for async operations
- Custom error types used for domain-specific errors
  - Example: `ShellError`, `APIError`, `ConnectionErrorDetails`
- Error messages sanitized before display (see `sanitizeAPIError()`)
- Connection errors analyzed via cause chain walk (see `extractConnectionErrorDetails()`)
  - Maximum depth limit of 5 to prevent infinite loops
- Error classification for recoverable vs. non-recoverable:
  - SSL/TLS errors: Specific guidance provided to users
  - Timeout errors: Actionable message about connectivity
  - HTML error pages (CloudFlare): Extracted title for clarity

**Error Details Extraction:**
Located in `services/api/errorUtils.ts`:
- `extractConnectionErrorDetails()`: Walks cause chain to find root error code/message
- `getSSLErrorHint()`: Returns actionable SSL certificate guidance
- `sanitizeAPIError()`: Removes HTML content from error messages
- `formatAPIError()`: Comprehensive error formatting with user-friendly hints
- `extractNestedErrorMessage()`: Handles deserialized API errors from session JSONL

**Example Error Handling:**
```typescript
function extractConnectionErrorDetails(error: unknown): ConnectionErrorDetails | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  let current: unknown = error
  const maxDepth = 5 // Prevent infinite loops
  let depth = 0

  while (current && depth < maxDepth) {
    if (current instanceof Error && 'code' in current && typeof current.code === 'string') {
      const code = current.code
      const isSSLError = SSL_ERROR_CODES.has(code)
      return { code, message: current.message, isSSLError }
    }
    // Move to next cause in chain...
  }
  return null
}
```

## Logging

**Framework:** `console` object directly or specialized logging functions

**Patterns:**
- `console.log()` for normal output in CLI tools
- `console.error()` for error messages
- Custom logging functions in `services/internalLogging.ts` for diagnostic purposes
- Ink renderer patches console to prevent cross-talk: "console.error is swallowed by Ink's patchConsole"
- Diagnostic logging using `logForDiagnosticsNoPII()` for sensitive contexts
- Event logging via `logEvent()` from `services/analytics/index.js` for analytics

**When to Log:**
- Error conditions with context about what failed
- Long-running operations with progress indicators
- State transitions when debugging is needed
- Avoid logging in performance-critical paths

## Comments

**When to Comment:**
- JSDoc for exported functions and type definitions
- Inline comments for complex logic, workarounds, or non-obvious decisions
- TODO/FIXME comments for known issues that need attention (searchable in codebase)
- Comments explaining why something is done a certain way, not what it does

**JSDoc/TSDoc:**
- Functions have JSDoc blocks describing purpose, parameters, and return values
  - Format: `/** Description here */`
  - Parameter descriptions: `@param name Description`
  - Return type: `@returns Description`
- Example from codebase:
  ```typescript
  /**
   * Converts SDKMessage from CCR to REPL Message types.
   *
   * The CCR backend sends SDK-format messages via WebSocket. The REPL expects
   * internal Message types for rendering. This adapter bridges the two.
   */
  ```
- Type definitions include JSDoc explaining purpose and notable behaviors

## Function Design

**Size:** Functions are relatively concise, focusing on single responsibility
- Utility functions: 10-30 lines typical
- Tool implementations: 50-150 lines with clear section separation
- Large functions (200+ lines) include comments breaking logical sections

**Parameters:**
- Avoid positional parameters for functions with many arguments
- Use destructuring for configuration/options objects
- Type annotations required for all parameters
- Example: `function createTaskStateBase(id: string, type: TaskType, description: string, toolUseId?: string)`

**Return Values:**
- Explicit return types for all functions
- Functions returning `Promise` use async/await or `.then()` chains
- Union types used for success/failure returns
  - Example: `ValidationResult = { result: true } | { result: false; message: string; errorCode: number }`
- Void functions still use explicit `void` return type annotation

## Module Design

**Exports:**
- Named exports for functions, types, and constants
- Default exports used rarely, only when single primary export exists
- Re-exports at package boundaries for backwards compatibility
  - Example in `Tool.ts`: `export type { AgentToolProgress, BashProgress, ... }`

**Barrel Files:**
- Used sparingly at package boundaries
- Example: `commands/index.js` exports all command handlers

## Special Patterns

**Conditional Compilation:**
- `import { feature } from 'bun:bundle'` used for feature flags
- Example: `const proactive = feature('PROACTIVE') ? require(...) : null`
- Enables dead code elimination in production builds

**Lazy Imports:**
- Optional imports wrapped in functions for modules with side effects
- Example from `QueryEngine.ts`:
  ```typescript
  const messageSelector = (): typeof import('src/components/MessageSelector.js') =>
    require('src/components/MessageSelector.js')
  ```

**Type Guards:**
- Predicates with `is` prefix for type narrowing
- Example: `function hasNestedError(value: unknown): value is NestedAPIError`
- Used to narrow types before unsafe casts

---

*Convention analysis: 2026-03-31*
