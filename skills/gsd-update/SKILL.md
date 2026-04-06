---
name: gsd-update
description: "DEPRECATED -- Plugin-managed updates replace this command"
allowed-tools:
  - Bash
  - AskUserQuestion
---

<objective>
This command is deprecated. GSD is now distributed as a Claude Code plugin and updates are managed automatically by the plugin system.

## What replaced /gsd:update

- **Plugin-managed updates** replace the npm-based update flow
- **`claude plugin install gsd`** is the single install and update command
- The legacy npm installer package is no longer the distribution path

## How to update GSD

Run:
```
claude plugin install gsd
```

Claude Code's plugin system handles versioning, caching, and updates automatically.

## Migration from legacy install

If you have a legacy GSD installation, see `README.md` for complete migration steps
including cleanup of old directories, hook entries, and MCP configuration.
</objective>

<success_criteria>
- [ ] User informed that /gsd:update is deprecated
- [ ] User directed to `claude plugin install gsd`
- [ ] Legacy paths documented for cleanup
</success_criteria>
