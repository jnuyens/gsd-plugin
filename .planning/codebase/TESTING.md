# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Status:** Not Detected

No dedicated test framework (Jest, Vitest, Mocha, etc.) is configured in this codebase. The project contains no `.test.ts`, `.spec.ts`, `.test.tsx`, or `.spec.tsx` files.

**Why Tests May Be Absent:**
- This appears to be a sophisticated CLI/REPL application where testing may occur through:
  - Manual integration testing via CLI commands
  - End-to-end testing in production-like environments
  - Code review-driven validation
- Complex state management (AppState, QueryEngine, Tool execution) makes snapshot/unit testing challenging without test infrastructure

**Testing Infrastructure:**
- No `jest.config.ts`, `vitest.config.ts`, or similar found
- No test commands in package.json
- No test fixtures or mock factories

## Testing Strategy Observed

**Code Design for Testability:**
- Heavy use of **function composition** and **pure functions** where possible
- Utility functions in `services/` and `utils/` directories are designed to be independently testable
- Example: `services/api/errorUtils.ts` contains pure functions that are easy to unit test if a framework were added
  - `extractConnectionErrorDetails()`: Takes error object, returns structured data
  - `sanitizeAPIError()`: Pure string transformation
  - `formatAPIError()`: Pure computation with no side effects

**State Management Design:**
- AppState is immutable and centralized in `state/AppState.js`
- State transitions through `setAppState()` function allow tracing state changes
- Makes manual state inspection feasible: `getAppState()` at any point

**Error Testing Patterns:**
From `services/api/errorUtils.ts`, the testing approach would focus on:
1. **Error chain parsing**: Test that `extractConnectionErrorDetails()` correctly walks cause chains
2. **HTML sanitization**: Verify CloudFlare error pages are handled
3. **Message extraction**: Test nested API error message extraction at different nesting levels
4. **Classification**: Test SSL vs. timeout vs. generic connection errors

Example testable function:
```typescript
export function extractConnectionErrorDetails(error: unknown): ConnectionErrorDetails | null {
  if (!error || typeof error !== 'object') {
    return null
  }
  // ... walks cause chain to depth 5
  // Easy to test with mock Error objects
}
```

## Code Patterns Supporting Testing

**Pure Functions:**
Utility functions designed to be pure and testable:
- `formatNumber()`, `formatDuration()` in `utils/format.js`
- `isTerminalTaskStatus()` in `Task.ts`
- `generateTaskId()` in `Task.ts`
- String manipulation functions in `utils/stringUtils.ts`

**Type Guards:**
Functions with `is` suffix enable type narrowing and can be tested independently:
```typescript
function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}
```

**Error Handling as Data:**
Errors are structured as typed return values rather than thrown exceptions in many cases:
```typescript
export type ValidationResult =
  | { result: true }
  | { result: false; message: string; errorCode: number }
```

This allows testing error paths without exception handling.

## Testing Gaps & Risks

**Areas Without Test Coverage:**
1. **Complex State Orchestration:**
   - QueryEngine orchestration of API calls, tool execution, message handling
   - AppState mutations and side effects
   - No tests verify correct state transitions

2. **Error Recovery Paths:**
   - SSL certificate error handling (multiple cert validation failure scenarios)
   - Connection retry logic (`services/api/withRetry.ts`)
   - OAuth flow error handling (`services/oauth/getOauthProfile.ts`)

3. **Tool Execution Logic:**
   - Bash tool command parsing and execution (`tools/BashTool/BashTool.tsx`)
   - File edit operations with diffs
   - Tool permission validation and enforcement

4. **UI Component Rendering:**
   - React components in `components/` (compiled with React compiler, original source not fully available)
   - Ink terminal rendering
   - Message formatting and display

5. **Integration Points:**
   - SDK message adaptation (`remote/sdkMessageAdapter.ts`)
   - MCP server communication (`services/mcp/`)
   - Session persistence and recovery

## How to Add Tests

**If test framework were added** (e.g., Vitest), follow these patterns:

**1. Test Error Handling Functions:**
```typescript
// File: services/api/errorUtils.test.ts
import { extractConnectionErrorDetails, formatAPIError } from './errorUtils.ts'

describe('extractConnectionErrorDetails', () => {
  it('returns null for non-error input', () => {
    expect(extractConnectionErrorDetails(null)).toBeNull()
    expect(extractConnectionErrorDetails(undefined)).toBeNull()
  })

  it('extracts code from single-level error', () => {
    const error = new Error('Connection failed')
    ;(error as any).code = 'ECONNREFUSED'

    const result = extractConnectionErrorDetails(error)
    expect(result?.code).toBe('ECONNREFUSED')
    expect(result?.isSSLError).toBe(false)
  })

  it('walks cause chain up to max depth', () => {
    let deepError = new Error('Root error')
    ;(deepError as any).code = 'DEPTH_ZERO_SELF_SIGNED_CERT'

    let chainedError = new Error('Chained')
    ;(chainedError as any).cause = deepError

    const result = extractConnectionErrorDetails(chainedError)
    expect(result?.code).toBe('DEPTH_ZERO_SELF_SIGNED_CERT')
    expect(result?.isSSLError).toBe(true)
  })
})
```

**2. Test Type Guards:**
```typescript
// File: Task.test.ts
import { isTerminalTaskStatus } from './Task.ts'

describe('isTerminalTaskStatus', () => {
  it('returns true for terminal states', () => {
    expect(isTerminalTaskStatus('completed')).toBe(true)
    expect(isTerminalTaskStatus('failed')).toBe(true)
    expect(isTerminalTaskStatus('killed')).toBe(true)
  })

  it('returns false for non-terminal states', () => {
    expect(isTerminalTaskStatus('pending')).toBe(false)
    expect(isTerminalTaskStatus('running')).toBe(false)
  })
})
```

**3. Test ID Generation:**
```typescript
// File: Task.test.ts
import { generateTaskId } from './Task.ts'

describe('generateTaskId', () => {
  it('generates IDs with correct prefix for task type', () => {
    expect(generateTaskId('local_bash')).toMatch(/^b[0-9a-z]{8}$/)
    expect(generateTaskId('local_agent')).toMatch(/^a[0-9a-z]{8}$/)
  })

  it('generates unique IDs', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateTaskId('local_bash'))
    }
    expect(ids.size).toBe(100)
  })
})
```

## Manual Testing Approach

Given the absence of automated tests, the codebase likely relies on:

**Manual CLI Testing:**
- Running commands via the CLI interface
- Verifying output format and behavior matches expectations
- Testing error conditions by simulating failure states

**Integration Testing:**
- Testing complete workflows: query → tool execution → response
- Error recovery: disconnect, reconnect, resume
- State persistence: saving and loading sessions

**Code Review:**
- Peer review of logic changes
- Verification of error handling paths
- Type checking via TypeScript compiler

## Testing Recommendations if Adding Tests

1. **Start with error handling:** `services/api/errorUtils.ts` is small, pure, and already well-structured for testing

2. **Add type guard tests:** Functions like `isTerminalTaskStatus()`, `isSearchOrReadBashCommand()` in `tools/BashTool/BashTool.tsx`

3. **Test utility functions:** Pure functions in `utils/` are good candidates:
   - `utils/format.ts`: `formatNumber()`, `formatDuration()`
   - `utils/semanticBoolean.ts`, `utils/semanticNumber.ts`

4. **Create fixtures for complex objects:**
   - Mock Error objects with various cause chains
   - Mock AppState objects for integration testing
   - Mock Tool objects with different schemas

5. **Use TypeScript for test type safety:**
   - Leverage strict type checking in tests
   - Test type guards extensively

---

*Testing analysis: 2026-03-31*
