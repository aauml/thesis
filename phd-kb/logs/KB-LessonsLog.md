# KB Lessons Log
_Read this file at the START of every session. Update at the END of every session._

---

## Prevention Rules

These are hard rules derived from past bugs. Violating any of these means repeating a known mistake.

### PR-001 — Always use `promoteToNewsLog` when promoting from staging queues
- **Derived from:** Session 2026-03-15, BUG confirmed in `update academic`
- **Root cause:** `action=append` deduplicates against all 4 tabs, including the source queue. Items already in AcademicQueue/PerplexityQueue are always skipped.
- **Rule:** Use `action=promoteToNewsLog` for items coming from any staging queue. Use `action=append` ONLY for direct Claude web searches.

### PR-002 — Save all GAS script changes to the GitHub repo
- **Derived from:** Session 2026-03-15, ArXiv_v2.gs was only saved to outputs
- **Root cause:** Omitted the canonical save location. User had to track down the file.
- **Rule:** Every GAS script modification → save full versioned file to `phd-kb/scripts/` in the repo, commit and push. Also save to outputs in Cowork for download link. Naming: `ScriptName-vN.txt`.

### PR-003 — Hard batch limits are non-negotiable
- **Derived from:** Session 2026-03-13, BUG-003 (77 degraded entries)
- **Root cause:** Processing 198 items in one session caused context window compression. thesis_relevance degraded silently.
- **Rule:** `update perplexity` max 50, `update academic` max 40, `update news` max 40. Stop, report remaining, close. No exceptions.

### PR-004 — Quality gate before every NewsLog post
- **Derived from:** Session 2026-03-13, BUG-003
- **Root cause:** Degraded thesis_relevance wasn't caught before posting.
- **Rule:** Before posting: check thesis_relevance is >600 chars, doesn't start with "This content addresses", doesn't end with boilerplate. If any check fails, stop the session entirely.

### PR-005 — `updatePerplexityRow` must use `url`, never `id`
- **Derived from:** Session 2026-03-13, confirmed GAS bug
- **Root cause:** Server-side lookup by `id` returns `ok:true` but doesn't update the row.
- **Rule:** Always pass `"url"` as lookup key for PerplexityQueue updates.

### PR-006 — Run Session Closing Protocol completely
- **Derived from:** Session 2026-03-15, PM Log update was skipped
- **Root cause:** Session ended without completing all closing steps.
- **Rule:** Before closing: (1) update KB-PendingIssues.md, (2) update KB-LessonsLog.md, (3) update PM Log if decisions were made, (4) commit and push all changes to the repo.

### PR-007 — ArXiv queries require category filtering
- **Derived from:** Session 2026-03-15, BUG-004 (156 off-topic papers)
- **Root cause:** ArXiv v1 sent broad text queries without `cat:` filters, returning physics/biology/math papers.
- **Rule:** ArXiv_v2.gs auto-injects category filters. If modifying ArXiv scripts, always preserve the ALLOWED_CATEGORIES mechanism.

### PR-008 — GitHub repo is the single source of truth for all project files
- **Derived from:** Session 2026-03-15, Drive sync unreliable (can't delete, requires Cowork mount, not available in chat)
- **Root cause:** Using Drive as canonical location limited access to Cowork mode only. GitHub works in Cowork, regular chat, and Claude Code.
- **Rule:** All scripts, docs, and logs live in `github.com/aauml/thesis`. Clone at session start, push at session close. Drive is a convenience mirror, not the source.

### PR-009 — Supabase connectivity: test early, use Python sessions, batch calls
- **Derived from:** Session 2026-03-19 (run 210), Supabase HTTP 000
- **Root cause:** Container DNS resolver saturated after many curl calls to different domains; Supabase REST API unreachable by the time writes were attempted.
- **Rule (3 parts):**
  1. **Test Supabase at session start** — immediately after cloning the repo and before any other API calls. If reachable, proceed with Supabase-primary protocol. If not, operate in Sheet-only mode for the entire session and note it.
  2. **Use Python `requests.Session()` instead of repeated `curl` calls** — connection pooling reuses DNS lookups. Write a single Python script for batch API operations instead of multiple curl one-liners.
  3. **If Supabase fails mid-session** — write FULL rows to Sheet NewsLog with `notes="supabase_write_failed"`. Backfill to Supabase in a fresh session.

---

## Problem Log

| Date | Problem | Root Cause | Prevention Rule | Resolved? |
|------|---------|-----------|-----------------|-----------|
| 2026-03-13 | 77 degraded thesis_relevance entries in NewsLog | Context window compression from 198-item session | PR-003, PR-004 | Partially — limits added, 77 entries still need re-evaluation |
| 2026-03-13 | `updatePerplexityRow` by id silently fails | GAS server-side bug | PR-005 | Yes — documented, using url lookup |
| 2026-03-15 | 156 off-topic arXiv papers in AcademicQueue | No category filter in ArXiv v1 | PR-007 | Yes — ArXiv_v2.gs with ALLOWED_CATEGORIES |
| 2026-03-15 | ArXiv_v2.gs not saved to Drive AppScripts | Omitted canonical save path | PR-002 | Yes — fixed this session |
| 2026-03-15 | PM Log not updated after session decisions | Session closing protocol incomplete | PR-006 | Yes — protocol reinforced |
| 2026-03-15 | `action=append` skipped 27 items from AcademicQueue | append deduplicates against source queue | PR-001 | Yes — switched to promoteToNewsLog |
| 2026-03-15 | Drive sync can't delete files, requires Cowork mount | Cowork sandbox limitation + Drive only accessible in Cowork | PR-008 | Yes — migrated to GitHub as canonical source |
| 2026-03-19 | Supabase unreachable from container (HTTP 000) + DNS cache overflow | Container DNS resolver saturated after ~20+ curl calls to multiple domains | PR-009 | Yes — fallback to Sheet full-write, backfill to Supabase next session |

---

## Session History

| Date | Session Type | Key Actions | Lessons Added |
|------|-------------|-------------|---------------|
| 2026-03-13 | update perplexity | 198 items processed, BUG-003 discovered | PR-003, PR-004, PR-005 |
| 2026-03-15 | update academic | 200 items processed (24 promoted, 156 discarded), ArXiv_v2.gs created | PR-001, PR-002, PR-006, PR-007 |
| 2026-03-15 | infrastructure | Migrated all files from Drive to GitHub repo, created folder structure, SKILL-KB-v13 | PR-008 |
| 2026-03-19 | infrastructure | Supabase proyecto phd-kb creado. Tabla evaluated_items (21 cols + pgvector 384d + metadata). Backfill 1,489 items. Edge function generate-embeddings desplegada (gte-small). RLS + search_evaluated_items. SKILL-KB-v15 dual-write. SKILL-PM-v7 con Supabase en §8/§12. | — |
| 2026-03-19 | update all (run 209) | Queues empty. 7 Claude searches → 7 items added (3 ALTA, 4 MEDIA). CRITICAL: IMCO/LIBE voted Digital Omnibus 101-9-8 (Mar 18), TRUMP AMERICA AI Act draft released (Mar 19). FJC PG guidance, CAISI listening sessions, CREATE AI Act, Sorenson forensics outlook. | — |
| 2026-03-19 | update all (run 210) | Queues empty. 5 Claude searches → 5 items added (2 ALTA, 3 MEDIA). Council position Mar 13, EP Think Tank enforcement briefing, NLR TRUMP AI Act analysis, Zenodo gobernanza algorítmica paper (es), EC guidelines roadmap. Supabase unreachable — full rows written to Sheet as fallback. Meta update failed (DNS cache overflow). | PR-009 |

---

_Última actualización: 2026-03-19 (run 209)_
