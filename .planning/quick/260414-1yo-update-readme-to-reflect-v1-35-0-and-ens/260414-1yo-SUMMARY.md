# Quick Task 260414-1yo: Update README to reflect v1.35.0 and ensure future syncs always update README

**Status:** Complete
**Commit:** e3fb14e
**Date:** 2026-04-13

## What was done

### README.md updates
- Corrected skill count from 60 to 59 (accurate count of gsd-* skill directories)
- Added "Execution context profiles" (dev, research, review) to feature list
- Updated hooks description to include "checkpoint on compact"
- Updated references description to include "thinking-model guidance"

### Future sync process
- Added "After each upstream GSD sync" checklist to PROJECT.md Evolution section with 5 steps: file sync, version bump, README content update, PROJECT.md update, smoke-test
- Updated `gsd-upstream-check` scheduled task to include README update reminder when new upstream version is detected

## Why
The previous v1.35.0 sync (260414-1lv) bumped the version line in README but didn't update the feature descriptions. The README still referenced stale counts and was missing new capabilities. The sync process had no documented checklist, making it easy to forget content updates.
