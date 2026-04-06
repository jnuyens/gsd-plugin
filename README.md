# GSD Plugin -- Get Shit Done for Claude Code

**Based on:** [GSD 1.32.0](https://github.com/gsd-build/get-shit-done/releases) base tree by **TACHES** (Lex Christopherson)

A performance-optimized plugin packaging of [GSD](https://github.com/gsd-build/get-shit-done) for Claude Code. Reduces per-turn token overhead by ~92%, adds MCP-backed project state, and bundles everything into a single-install plugin.

This project repackages the GSD workflow system as a native Claude Code plugin with additional optimizations: skill isolation via `context: fork`, structured MCP tools replacing prompt injection, and cross-session memory via memdir.

## Installation

```bash
claude plugin install gsd
```

That single command installs everything: slash commands, agent definitions, hooks, and an MCP server for project state. No manual configuration required.

## What GSD Plugin provides

- **60 slash commands** (`/gsd:*`) for project planning, execution, debugging, and verification
- **21 agent definitions** for specialized workflow roles (planner, executor, researcher, verifier, etc.)
- **MCP server** exposing project state as queryable resources and mutation tools
- **Hooks** for session-start context loading, workflow enforcement, and tool-use monitoring
- **Templates and references** for planning artifacts, summaries, and verification checklists
- **Memory integration** -- phase outcomes persist across sessions via Claude Code's memdir

## What changed from upstream GSD

| Aspect | Upstream GSD | This plugin |
|--------|-------------|-------------|
| Install | `npx get-shit-done-cc` | `claude plugin install gsd` |
| Context overhead | ~3,000-5,000 tokens/turn via CLAUDE.md | ~200 tokens (92% reduction) |
| Skill isolation | Inline execution | `context: fork` sub-agent isolation |
| State access | BashTool roundtrips to gsd-tools | MCP resources + tools |
| Memory | None | memdir auto-recall across sessions |
| Agent definitions | Inline prompt role descriptions | `.claude/agents/*.md` with typed frontmatter |

## Quick start

1. Install: `claude plugin install gsd`
2. Start a new project: `/gsd:new-project`
3. Plan your first phase: `/gsd:plan-phase`
4. Execute: `/gsd:execute-phase`
5. Verify: `/gsd:verify-work`

## Testing without affecting your current GSD install

If you already have GSD installed (via `npx get-shit-done-cc` or `~/.claude/get-shit-done/`), you can test this plugin version safely in an isolated environment.

### Option A: CLAUDE_PLUGIN_ROOT override (recommended)

Test the plugin from a fresh project directory without touching your existing install:

```bash
# 1. Clone this repo somewhere
git clone https://github.com/jnuyens/gsd-plugin.git ~/src/gsd-plugin

# 2. Create a throwaway test project
mkdir ~/test-gsd-plugin && cd ~/test-gsd-plugin
git init

# 3. Launch Claude Code with the plugin root override
CLAUDE_PLUGIN_ROOT=~/src/gsd-plugin claude

# 4. Inside the session, GSD commands use the plugin version
#    Your ~/.claude/get-shit-done/ is untouched
```

The `CLAUDE_PLUGIN_ROOT` env var tells the plugin's `bin/lib/core.cjs` to resolve all paths from the specified directory instead of the default plugin cache.

### Option B: Separate Claude Code profile

If Claude Code supports profile directories (check `claude --help` for `--profile` or `CLAUDE_CONFIG_DIR`):

```bash
# Create an isolated profile
mkdir -p ~/.claude-test
CLAUDE_CONFIG_DIR=~/.claude-test claude

# Install the plugin in the isolated profile
# /gsd:help should work, your main profile is untouched
```

### Option C: Docker / devcontainer

For full isolation:

```bash
# Use a devcontainer or Docker with Claude Code installed
# Install the plugin fresh -- zero risk to host system
claude plugin install gsd
```

### What to verify

After launching with the plugin:

1. `/gsd:help` -- lists all 60 commands
2. `/gsd:progress` -- shows project state (or prompts to create one)
3. `/gsd:new-project` -- full project initialization flow
4. Check MCP resources are available (the GSD MCP server should auto-start via plugin manifest)

### Rolling back

To revert to upstream GSD after testing:

```bash
# Remove the plugin
claude plugin uninstall gsd

# Your legacy ~/.claude/get-shit-done/ is still in place and working
```

## Updating

Updates are managed automatically by Claude Code's plugin system:

```bash
claude plugin install gsd
```

## Migrating from legacy install

If you previously installed GSD via `get-shit-done-cc` or manual setup, follow these steps to migrate to the plugin-based install.

### What the plugin replaces

| Legacy component | Plugin replacement |
|---|---|
| `~/.claude/get-shit-done/` directory | Plugin cache at `~/.claude/plugins/cache/` (managed automatically) |
| `get-shit-done-cc` npm package | `claude plugin install gsd` |
| `/gsd:update` command | Plugin-managed updates (command is now deprecated) |
| Manual `.mcp.json` entries pointing at `~/.claude/get-shit-done/mcp/server.cjs` | Plugin manifest declares MCP server automatically |
| Manual `~/.claude/settings.json` hook entries | Plugin-packaged `hooks/hooks.json` auto-loaded by plugin loader |

### Migration steps

#### 1. Install the plugin

```bash
claude plugin install gsd
```

#### 2. Remove legacy `~/.claude/get-shit-done/` directory

The legacy install directory is no longer needed. The plugin bundles all skills, agents, templates, references, and bin tools.

```bash
rm -rf ~/.claude/get-shit-done/
```

#### 3. Remove GSD entries from `.mcp.json`

If your project has a `.mcp.json` file with a GSD MCP server entry pointing at the legacy path, remove it. The plugin manifest now declares the MCP server.

Look for and remove entries like:

```json
{
  "mcpServers": {
    "gsd": {
      "command": "node",
      "args": ["/Users/.../.claude/get-shit-done/mcp/server.cjs"]
    }
  }
}
```

#### 4. Remove GSD hook entries from `~/.claude/settings.json`

If your `~/.claude/settings.json` contains hook entries referencing old GSD scripts (e.g., `gsd-check-update.js`, `gsd-context-monitor.js`, `gsd-prompt-guard.js`, `gsd-statusline.js` from `~/.claude/hooks/`), remove those entries. The plugin provides equivalent hooks via `hooks/hooks.json`.

#### 5. Remove legacy hook scripts

```bash
rm -f ~/.claude/hooks/gsd-check-update.js
rm -f ~/.claude/hooks/gsd-context-monitor.js
rm -f ~/.claude/hooks/gsd-prompt-guard.js
rm -f ~/.claude/hooks/gsd-statusline.js
```

#### 6. Uninstall `get-shit-done-cc` npm package (if installed)

```bash
npm uninstall -g get-shit-done-cc
```

#### 7. Stop using `/gsd:update`

The `/gsd:update` command is deprecated. Use `claude plugin install gsd` to update.

### Automated migration audit

GSD includes a migration helper that audits your system for legacy paths:

```bash
node bin/gsd-tools.cjs migrate
```

This prints all legacy GSD artifacts found on your system. To remove them (with confirmation):

```bash
node bin/gsd-tools.cjs migrate --clean
```

### Verifying migration

After migration, verify the plugin is active:

1. Start a new Claude Code session
2. Run `/gsd:help` -- should list all commands
3. Check that MCP resources are available (the GSD MCP server should auto-start)

## Credits

- **[GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done)** by TACHES (Lex Christopherson) -- the original workflow framework this plugin is based on
- Plugin packaging, MCP integration, token optimization, and memory system by Jasper Nuyens

## License

MIT
