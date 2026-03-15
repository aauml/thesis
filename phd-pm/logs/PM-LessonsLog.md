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

### PR-003 — GAS DriveApp "server error" means Drive API not enabled in GCP
- **Derived from:** GitHubSync setup, session 2026-03-15
- **Root cause:** DriveApp throws generic "server error" (not "permission denied") when Google Drive API is disabled in the GCP project. OAuth scope in appsscript.json is not enough — the API must be separately enabled in GCP console.
- **Rule:** If DriveApp fails with "server error", check GCP console → APIs & Services → verify Google Drive API is enabled. Diagnostic: use `UrlFetchApp.fetch` with `ScriptApp.getOAuthToken()` to call Drive REST API — it returns a 403 with clear error message and activation link.
- **GCP console URL:** `console.developers.google.com/apis/api/drive.googleapis.com/overview?project=90318015894`

### PR-004 — Never type in GAS editor; use Monaco API
- **Derived from:** GitHubSync setup, sessions 2026-03-14 and 2026-03-15
- **Root cause:** GAS editor's autocomplete corrupts text when Claude uses `type` action to enter code. Text gets garbled with autocomplete suggestions mixed in.
- **Rule:** Always use `monaco.editor.getModels()` + `model.pushEditOperations()` to replace file content programmatically. Find the correct model by searching content (`content.includes('functionName')`), not by index — indexes shift between page navigations.

---

## Problem Log

| Date | Problem | Root Cause | Prevention Rule | Resolved? |
|------|---------|-----------|-----------------|-----------|
| 2026-03-15 | DriveApp "server error" in GitHubSync | Drive API not enabled in GCP project | PR-003 | Yes — enabled via GCP console |
| 2026-03-15 | GAS editor corrupts typed code | Autocomplete interference | PR-004 | Yes — use Monaco API |
| 2026-03-15 | PM files only in Drive, not accessible from chat | No repo structure for PM project | PR-001 | Yes — migrated to GitHub |

---

## Session History

| Date | Session Type | Key Actions | Lessons Added |
|------|-------------|-------------|---------------|
| 2026-03-15 | infrastructure | GitHubSync v1 + WebApp v33 installed, Drive API enabled, 53 files synced | PR-003, PR-004 |
| 2026-03-15 | infrastructure | Created phd-pm folder in repo, migrated files from Drive | PR-001, PR-002 |

---

_Última actualización: 2026-03-15_
