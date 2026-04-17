---
phase: quick
plan: 260417-x1d
subsystem: scheduled-tasks
tags: [notification, upstream-check, cron]
dependency_graph:
  requires: []
  provides: [upstream-release-notification]
  affects: [session-start-hook]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified: []
decisions:
  - CronCreate jobs are session-only and auto-expire after 7 days — not viable for persistent notifications
  - Registered a session-only cron job as immediate fix (daily at 9:17am)
  - Long-term fix needed: add version check to SessionStart hook for cross-session persistence
metrics:
  duration: ~3min
  completed: 2026-04-17
  tasks: 1
  files: 0
---

# Quick Task 260417-x1d: Investigate and Fix GSD Upstream Release Notification

Diagnosed why GSD 1.36.0 release (2026-04-14) was not detected; registered daily cron job for this session; identified fundamental limitation requiring a different approach for durable notifications.

## Root Cause

Quick task 260407-4gi created `~/.claude/scheduled-tasks/gsd-upstream-check/SKILL.md` but **never called CronCreate** to register the job. The SKILL.md was a definition file only — no cron job was ever active.

## What Was Done

1. **Verified** the SKILL.md is valid and the gh API endpoint works (returns v1.36.0)
2. **Registered** a daily cron job (ID: 756b9d9d) at 9:17am via CronCreate
3. **Discovered** CronCreate limitations:
   - Jobs are session-only even with `durable: true`
   - Auto-expire after 7 days
   - Cannot survive across Claude Code sessions

## Key Finding: CronCreate Is Not Suitable for Persistent Notifications

The original quick task 260407-4gi assumed CronCreate could provide durable scheduled tasks. In practice, Claude Code cron jobs are ephemeral — they exist only within a single REPL session and auto-delete after 7 days.

**Recommended long-term fix:** Add an upstream version check to the **SessionStart hook** in the GSD plugin. This would:
- Run every time a Claude Code session starts in this project
- Compare `package.json` version against `gh api repos/gsd-build/get-shit-done/releases/latest`
- Display a notification banner if a newer version is available
- Be truly persistent (hooks survive across sessions, unlike cron jobs)

This should be tracked as a separate task or added to a future phase.

## Current Status

- **Immediate:** Cron job active for this session (daily at 9:17am, expires in 7 days)
- **Pending:** GSD 1.36.0 upgrade (current: 1.35.0) — user can run `/gsd-quick update to 1.36.0` when ready
- **Future:** Implement SessionStart hook-based version check for durable notifications

## Deviations from Plan

None — plan executed as written. The cron limitation was a discovery, not a deviation.
