# PM Lessons Log
_Read this file at the START of every session. Update at the END of every session._

---

## Prevention Rules

These are hard rules derived from past bugs. Violating any of these means repeating a known mistake.

### PR-001 — GitHub repo is the single source of truth
- **Derived from:** KB project migration, session 2026-03-15
- **Root cause:** Files scattered across Drive, outputs, and project knowledge made it hard to track what's current.
- **Rule:** All PM files live in `github.com/aauml/thesis` under `phd-pm/`. Clone at session start, push at session close.

### PR-002 — Always run Session Closing Protocol completely
- **Derived from:** KB project experience (PR-006)
- **Root cause:** Sessions ending without updating logs lose context for the next session.
- **Rule:** Before closing: (1) update PM-LessonsLog.md, (2) update PM Log in repo, (3) commit and push.

---

## Problem Log

| Date | Problem | Root Cause | Prevention Rule | Resolved? |
|------|---------|-----------|-----------------|-----------|
| 2026-03-15 | PM files only in Drive, not accessible from chat | No repo structure for PM project | PR-001 | Yes — migrated to GitHub |

---

## Session History

| Date | Session Type | Key Actions | Lessons Added |
|------|-------------|-------------|---------------|
| 2026-03-15 | infrastructure | Created phd-pm folder in repo, migrated files from Drive | PR-001, PR-002 |

---

_Última actualización: 2026-03-15_
