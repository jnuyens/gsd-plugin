# GSD Plugin -- Get Shit Done for Claude Code

**Based on:** [GSD 1.38.1](https://github.com/gsd-build/get-shit-done/releases/tag/v1.38.1) base tree by **TACHES** (Lex Christopherson)

**Plugin version:** `2.38.1`

A performance-optimized plugin packaging of [GSD](https://github.com/gsd-build/get-shit-done) for Claude Code. Reduces per-turn token overhead by ~92%, adds MCP-backed project state, and bundles everything into a single-install plugin.

### Versioning

The plugin version mirrors upstream GSD with the major bumped by one to signal that this is a derivative with extra features layered on top:

```
plugin_major = upstream_major + 1
plugin_minor = upstream_minor
plugin_patch = upstream_patch
```

So upstream GSD `1.38.1` ships here as plugin `2.38.1`. When upstream advances to `2.x`, this plugin will move to `3.x`. Patch-level changes that are plugin-only (not tied to an upstream sync) bump the patch number further (e.g. `2.38.2`).

This project repackages the GSD workflow system as a native Claude Code plugin with additional optimizations: skill isolation via `context: fork`, structured MCP tools replacing prompt injection, and cross-session memory via memdir.

## Installation

GSD Plugin installs *inside* a Claude Code session, not from your host shell. If you have never used Claude Code plugins before, follow these steps in order.

### Step 1 — Launch Claude Code

From your host shell (Terminal, iTerm, etc.), in any directory:

```bash
claude --dangerously-skip-permissions
```

The `--dangerously-skip-permissions` flag is recommended for the install flow: it lets the plugin marketplace add, plugin install, and MCP server bootstrap run without a wall of permission prompts. You can launch with plain `claude` later if you prefer to approve each tool use.

### Step 2 — Add the marketplace and install the plugin

You should now be inside a Claude Code session (you'll see the Claude Code prompt, not your shell prompt). Type these two commands at the Claude Code prompt:

```
/plugin marketplace add jnuyens/gsd-plugin
/plugin install gsd@gsd-plugin
```

That's it. This installs everything: slash commands, agent definitions, hooks, and an MCP server for project state. No manual configuration required. Enable auto-update for the marketplace in Claude Code settings to receive updates automatically.

## What GSD Plugin provides

- **81 slash commands** (`/gsd:*`) for project planning, execution, debugging, and verification
- **21 agent definitions** for specialized workflow roles (planner, executor, researcher, verifier, etc.)
- **MCP server** exposing project state as queryable resources and mutation tools
- **Hooks** for session-start context loading, workflow enforcement, checkpoint on compact, and tool-use monitoring
- **Execution context profiles** (dev, research, review) for role-specific behavior
- **Templates and references** for planning artifacts, summaries, verification checklists, and thinking-model guidance
- **Memory integration** -- phase outcomes persist across sessions via Claude Code's memdir

## What changed from upstream GSD

| Aspect | Upstream GSD | This plugin |
|--------|-------------|-------------|
| Install | `npx get-shit-done-cc` | `/plugin marketplace add jnuyens/gsd-plugin && /plugin install gsd@gsd-plugin` (run inside Claude Code) |
| Context overhead | ~3,000-5,000 tokens/turn via CLAUDE.md | ~200 tokens (92% reduction) |
| Skill isolation | Inline execution | `context: fork` sub-agent isolation |
| State access | BashTool roundtrips to gsd-tools | MCP resources + tools |
| Memory | None | memdir auto-recall across sessions |
| Agent definitions | Inline prompt role descriptions | `.claude/agents/*.md` with typed frontmatter |

## Quick start

Assumes you have already completed the Installation section above (Claude Code is running with the plugin installed). All commands below are typed at the Claude Code prompt, not in your shell.

1. Start a new project: `/gsd:new-project`
2. Plan your first phase: `/gsd:plan-phase`
3. Execute: `/gsd:execute-phase`
4. Verify: `/gsd:verify-work`

## Testing without affecting your current GSD install

If you already have GSD installed (via `npx get-shit-done-cc` or `~/.claude/get-shit-done/`), you can test this plugin version safely in an isolated environment.

Test the plugin from a fresh project directory without touching your existing install:

```bash
# 1. Clone this repo somewhere
git clone https://github.com/jnuyens/gsd-plugin.git ~/src/gsd-plugin

# 2. Move the legacy install out of the way (prevents duplicate commands)
mv ~/.claude/get-shit-done ~/.claude/get-shit-done-legacy

# 3. Create a throwaway test project
mkdir ~/test-gsd-plugin && cd ~/test-gsd-plugin
git init

# 4. Launch Claude Code with the plugin root override
CLAUDE_PLUGIN_ROOT=~/src/gsd-plugin claude --dangerously-skip-permissions

# 5. Inside the session, only plugin GSD commands are active
```

To restore your legacy install after testing:

```bash
mv ~/.claude/get-shit-done-legacy ~/.claude/get-shit-done
```

The `CLAUDE_PLUGIN_ROOT` env var tells the plugin's `bin/lib/core.cjs` to resolve all paths from the specified directory instead of the default plugin cache.

### What to verify

After launching with the plugin:

1. `/gsd:help` -- lists all 81 commands
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

Enable auto-update for the marketplace in Claude Code settings and updates will be applied automatically at startup. For manual updates, type these at the Claude Code prompt:

```
# Step 1: Pull the latest marketplace catalog from GitHub
/plugin marketplace update gsd-plugin

# Step 2: Reinstall the plugin to pick up the new version
/plugin install gsd@gsd-plugin
```

Note: Step 1 refreshes the marketplace index but does not upgrade the installed plugin. Step 2 is needed to install the new version.

## Migrating from legacy install

If you previously installed GSD via `get-shit-done-cc` or manual setup, most migration happens automatically.

### What happens automatically

On your first session after installing the plugin, GSD auto-migrates:

- **Moves** `~/.claude/get-shit-done/` to `~/.claude/get-shit-done-legacy/` (safe backup, not deleted)
- **Moves** `~/.claude/commands/gsd/` to `~/.claude/commands/gsd-legacy/` (prevents duplicate slash commands)
- **Removes** legacy GSD skill directories (`gsd-*`) from `~/.claude/skills/`
- **Removes** legacy GSD agent files (`gsd-*.md`) from `~/.claude/agents/`
- **Removes** legacy GSD MCP server entries from your project's `.mcp.json`
- **Removes** legacy GSD hook entries from `~/.claude/settings.json`
- **Removes** legacy hook scripts (`gsd-check-update.js`, `gsd-context-monitor.js`, `gsd-prompt-guard.js`, `gsd-statusline.js`) from `~/.claude/hooks/`

You'll see a summary of what was migrated in the session output.

### What you still need to do manually

#### 1. Install the plugin

Type these at the Claude Code prompt:

```
/plugin marketplace add jnuyens/gsd-plugin
/plugin install gsd@gsd-plugin
```

#### 2. Uninstall `get-shit-done-cc` npm package (if installed)

```bash
npm uninstall -g get-shit-done-cc
```

#### 3. Stop using `/gsd:update`

The `/gsd:update` command is deprecated. Use `/plugin marketplace update gsd-plugin` to update.

#### 4. Clean up the backup (optional, after verifying the plugin works)

```bash
rm -rf ~/.claude/get-shit-done-legacy/
```

### Manual migration audit

To check for any remaining legacy artifacts:

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
