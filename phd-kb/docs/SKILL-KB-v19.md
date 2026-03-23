---
name: thesis-kb-update v19
description: "Knowledge Base update and review skill for doctoral thesis on EU AI Act and NIST AI RMF interoperability. Reviews staging queues (PerplexityQueue, AcademicQueue, NewsResults) and runs targeted Claude searches. Evaluated items are written to Supabase (primary) with a lightweight verification row in Sheet NewsLog. Use when the user types 'update', 'update claude', 'update perplexity', 'update academic', 'update news', 'nd', 'what did we find about [topic]', 'show archive', 'add scholar', or 'add topic'."
---

# Thesis KB Update Skill

## Architecture Reference — READ FIRST

Before modifying any system component (Supabase tables, index.html, embeddings, edge functions, dashboard integration), read:

```
Read file: thesis-repo/phd-pm/docs/SYSTEM-ARCHITECTURE.md
```

Contains: all Supabase tables and relations, RLS permissions, edge functions (semantic-search, generate-embeddings), deployment flow, pagination gotchas (1000-row limit), and the full data pipeline. Do not make structural changes without understanding dependencies.

---

## Purpose

Maintain the doctoral thesis Knowledge Base by: (1) reviewing items staged in PerplexityQueue, AcademicQueue, and NewsResults by automated pipelines, (2) running targeted Claude web searches for URGENT/FOLLOW-UP topics, and (3) writing evaluated items to **Supabase** (primary data store) with a lightweight verification row in Sheet NewsLog.

## Four Pipelines

The system has four independent pipelines feeding the same Google Sheet:

| Pipeline | Script | Query Column | Staging Tab | Review Command |
|----------|--------|-------------|-------------|----------------|
| 1 — Claude targeted | Claude web_search | q_fullweb (5-10 only) | direct to NewsLog | `update claude` |
| 2 — Academic | AcademicOrchestrator.gs | q_openalex, q_semantic, q_arxiv, q_core | AcademicQueue | `update academic` |
| 3 — News | GoogleNewsRSS.gs | q_news | NewsResults | `update news` |
| 4 — Perplexity | PerplexitySearch.gs | q_fullweb (all, weekly) | PerplexityQueue | `update perplexity` |

**Pipeline 4 (Perplexity) handles all bulk q_fullweb searches.** It runs automatically every Sunday via a GAS trigger. Claude no longer loops through all 115 q_fullweb queries during `update claude`. That token budget is now spent on evaluation.

## Configuration

```
SHEET_API=https://script.google.com/macros/s/AKfycbzk2vhu-qcKFBPqEImKGEZKSitpVZv1IQQEv5ZzG7pNfo-iPUWfvSoLWWnkoc8d8PQQ/exec
```

---

## Trigger Commands

| User types | What happens |
|------------|--------------|
| `update` or `nd` | Full update: review PerplexityQueue + AcademicQueue + NewsResults + targeted Claude searches |
| `update perplexity` | Only review pending PerplexityQueue items (staged by PerplexitySearch.gs) |
| `update claude` | Only targeted Claude searches (5-10 max, URGENT/FOLLOW-UP focus) |
| `update academic` | Only review pending AcademicQueue items |
| `update news` | Only review pending NewsResults items |
| `update [topic]` | Targeted Claude search on that topic only (5-10 searches) |
| `what did we find about [topic]?` | Search existing Sheet data, no new searches |
| `show archive` or `show history` | Summarize existing Sheet data |
| `add scholar [name]` | Add a new scholar to the Queries tab |
| `add topic [description]` | Add a new topic query to the Queries tab |

**Batch limits — HARD STOPS (do not exceed):**

| Command | Hard limit per session |
|---------|----------------------|
| `update perplexity` | **50 items** |
| `update academic` | **40 items** |
| `update news` | **40 items** |
| `update` (full) | 30 perplexity + 20 academic + 20 news |

When the limit is reached, stop, report "X items remaining in queue — run again to continue", and close the session. Do not process additional items. These limits exist to prevent context window compression from degrading thesis_relevance quality (confirmed issue: 77 degraded entries in run 2026-03-13-205 from a 198-item session).

---

## CRITICAL RULES

### Rule 1: "Add" always means the Queries tab

When the user asks to add a scholar, topic, institution, or any query, **always use the Queries tab via `action=addQuery`**. Never use the Meta tab's `custom_queries` field.

```bash
curl -s -L "SHEET_API" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "addQuery",
    "query": {
      "type": "scholar",
      "name": "Person Name",
      "query": "\"Person Name\" AI 2025 2026",
      "date_filter": "2025 2026",
      "active": "yes",
      "hist_sweep": "pending",
      "notes": "Why this person is tracked",
      "added": "2026-03-09T00:00:00Z",
      "tier": "2",
      "frequency": "monthly",
      "next_run": "",
      "q_openalex": "\"Person Name\"",
      "q_semantic": "\"Person Name\" artificial intelligence",
      "q_arxiv": "\"Person Name\"",
      "q_core": "\"Person Name\" AI governance",
      "q_fullweb": "\"Person Name\" AI 2025 2026",
      "q_news": "\"Person Name\" AI"
    }
  }'
```

**Required fields**: `type`, `name`, `query`, `date_filter`, `active`, `hist_sweep`, `notes`, `added`, `tier`, `frequency`, `q_openalex`, `q_semantic`, `q_arxiv`, `q_core`, `q_fullweb`, `q_news`.

- For **government/congressional** queries: leave `q_openalex`, `q_arxiv`, `q_core` empty. Fill `q_semantic`, `q_fullweb`, `q_news`.
- For **scholar** queries: fill all six `q_*` fields. `q_arxiv` can be empty for law/social science scholars not on arXiv.

Valid `type` values: `scholar` | `topic` | `media` | `government` | `podcast`
Valid `hist_sweep` values: `pending` | `done` | `no`
Valid `frequency` values: `monthly` | `weekly` | `biweekly` | leave empty for manual

### Rule 2: Use the right update action per tab

- Queries tab: `updateQuery`
- NewsLog: `updateRow` or `updateByUrl`
- NewsResults: `updateNewsRow`
- AcademicQueue: `updateAcademicRow`
- PerplexityQueue: `updatePerplexityRow` (use `url` field, NOT `id` — see Known Behaviors)

Never mix them.

### Rule 3: Logging bar for search results

Log any result meeting **any** of these criteria:
- Supports or challenges a thesis argument
- Provides verifiable evidence for any capa (Teórica, Analítica, or Evaluativa)
- Is by or about a tracked scholar
- Informs the institutional, political, or regulatory context
- Is trustworthy information the user would want to know, even if it doesn't fit neatly into a capa

Only skip: spam, clearly off-topic, duplicates already in the Sheet, or sources with no credibility.

### Rule 4: Output length management

This skill involves many searches and API calls. Keep chat output minimal:
- Use 1-line status updates during processing, not paragraphs
- Never list all results in chat — the Sheet is the record
- The final summary should be 10-15 lines max, highlighting only ALTA items and key follow-ups

---

## `update` — Full Pipeline

Runs all sub-commands in sequence: PerplexityQueue review → AcademicQueue review → NewsResults review → targeted Claude searches.

### Step 1: Check queues and metadata

```bash
# Metadata
curl -s -L "SHEET_API?action=getMeta"

# Pending counts
curl -s -L "SHEET_API?action=getPerplexityQueue&status=pending&limit=1"
curl -s -L "SHEET_API?action=getAcademicQueue&status=pending&limit=1"
curl -s -L "SHEET_API?action=getNewsResults&status=pending&limit=1"

# Existing URLs for dedup
curl -s -L "SHEET_API?action=getUrls"

# Active queries
curl -s -L "SHEET_API?action=getQueries"
```

Report at the start: "PerplexityQueue: X pending | AcademicQueue: Y pending | NewsResults: Z pending | Last update: [date] | Last Perplexity scan: [date]"

### Step 2: Review PerplexityQueue

See the full `update perplexity` section below. **Hard limit: 50 items.** Stop and report remaining count when reached.

### Step 3: Review AcademicQueue

See the full `update academic` section below. **Hard limit: 40 items.** Stop and report remaining count when reached.

### Step 4: Review NewsResults

See the full `update news` section below. **Hard limit: 40 items.** Stop and report remaining count when reached.

### Step 5: Targeted Claude searches

See the `update claude` section below. Run 5-10 targeted searches focused on URGENT/FOLLOW-UP items and any recent events the staged queues didn't cover. Write qualifying results directly to NewsLog.

### Step 6: Final summary

Report total items added to NewsLog across all steps. Highlight ALTA items. Note if queues still have pending items remaining.

---

## `update perplexity` — Review PerplexityQueue

Reviews what PerplexitySearch.gs has staged in PerplexityQueue. **Does NOT run new searches.** The search runs automatically via the weekly GAS trigger (Sunday 3am).

Each PerplexityQueue row contains:
- `title` — the name of the query that produced this result (e.g., "NIST AI RMF — Implementation")
- `synthesis` — Sonar's 2-3 sentence synthesized answer about recent developments
- `citations` — JSON array of source URLs that Sonar used
- `url` — the first citation URL from the Sonar response (convenience field; always check the full `citations` array)
- `query_used` — the exact q_fullweb term sent to Sonar
- `run_id` — identifies which weekly batch this came from

### Evaluation approach for Perplexity items

Each row is a synthesis for one query, not a specific article. The workflow is:

1. Read `synthesis`. Does it describe new or significant developments since the last review?
2. If **yes** (synthesis reveals something noteworthy):
   - Parse `citations` (JSON array) — pick the most authoritative/relevant URL as the primary URL for the NewsLog entry. **Use a URL from `citations`, NOT the PerplexityQueue row's own `url` field** — the row URL is just the first citation stored as a convenience field and may not be the best source.
   - Build a full NewsLog row. Use the synthesis as the basis for `thesis_relevance` (Context → Article → Thesis)
   - `action=promoteToNewsLog` to NewsLog (NOT `action=append` — see Known Behaviors)
   - `updatePerplexityRow` with `status=promoted`
3. If **no** (synthesis covers known ground, nothing new):
   - `updatePerplexityRow` with `status=discarded`
4. If **borderline** (field-adjacent but not thesis-relevant now):
   - `updatePerplexityRow` with `status=reviewed`

**Note on titles:** Since Sonar synthesizes across sources rather than returning a single article, the `title` field for the NewsLog entry should describe what the synthesis is about (e.g., "Recent Developments: NIST AI RMF Implementation 2025-2026"). Use the query name or a short descriptive title.

**Note on content_type:** Perplexity-sourced items are typically `guidance`, `report`, or `article`. Assign based on what the primary citation actually is, not the synthesis format.

**Note on search_scope:** Set to `"update perplexity"` for all items sourced from this queue.

```bash
# Fetch pending PerplexityQueue items
curl -s -L "SHEET_API?action=getPerplexityQueue&status=pending"

# Promote citation to NewsLog — use promoteToNewsLog, NOT append
# (append deduplicates against all 4 tabs including PerplexityQueue,
#  so any URL already in PerplexityQueue will always be skipped)
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"promoteToNewsLog","rows":[{...full evaluated row...}]}'

# Mark as promoted — use `url` field (the PerplexityQueue row's url value), NOT `id`
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","url":"https://example.com/the-row-url","status":"promoted"}'

# Mark as discarded
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","url":"https://example.com/the-row-url","status":"discarded"}'

# Mark as reviewed (borderline, no action)
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","url":"https://example.com/the-row-url","status":"reviewed"}'
```

**IMPORTANT:** Always use `"url"` as the lookup key, never `"id"`. The GAS server-side lookup by `id` is unreliable for PerplexityQueue rows (confirmed bug — returns ok:true but does not update the row). The `url` value to pass is the PerplexityQueue row's own `url` field, not the NewsLog citation URL.

Report: X promoted, Y discarded, Z held. Highlight any ALTA items by topic.

---

## `update claude` — Targeted Claude Web Searches

Runs targeted web searches using Claude's `web_search` tool. Appends qualifying results **directly to NewsLog** (skips staging). Does not touch PerplexityQueue, AcademicQueue, or NewsResults.

**Scope is now limited to 5-10 searches per run.** The bulk q_fullweb retrieval is handled by PerplexitySearch.gs weekly. Claude's searches focus on:
- Items tagged URGENT or FOLLOW-UP in NewsLog that need fresh information
- Breaking developments that won't wait for the weekly Perplexity trigger
- Scholar-specific news (announcements, new papers, conference presentations)
- Specific date-constrained lookups (e.g., "Digital Omnibus vote outcome March 2026")
- Spanish-language searches (Sonar returns primarily English results)
- Any gap topics the user explicitly identifies

### Execution

1. Fetch active queries: `getQueries`
2. Fetch recent NewsLog URGENT/FOLLOW-UP items: `getAll?action_tag=URGENT` and `getAll?action_tag=FOLLOW-UP`
3. Build a short search list (5-10 queries max) targeting:
   - URGENT items that need status updates
   - Any explicit topic the user mentioned
   - 1-2 Spanish-language queries if doing a full update
4. For each result that meets the logging bar: evaluate fully and append to NewsLog.
5. Update metadata: `last_search_date`

#### Core targeted queries (use when no specific URGENT items to follow up)

**Breaking / time-sensitive**
- `"AI Act" implementation news site:reuters.com OR site:politico.eu 2026`
- `"NIST AI RMF" update OR revision 2026`
- `Digital Omnibus AI Act amendment 2026`

**Forensic AI (high thesis relevance, Sonar often misses court-level sources)**
- `STRmix court admissibility ruling 2025 2026`
- `"probabilistic genotyping" court decision 2025 2026`

**Spanish-language (Sonar returns primarily English)**
- `"Ley de Inteligencia Artificial" UE implementación 2026`
- `"gobernanza algorítmica" regulación España 2026`

---

## `update academic` — Review AcademicQueue

Reviews what the AcademicOrchestrator has staged in AcademicQueue. **Does NOT run new searches.**

1. Fetch pending: `curl -s -L "SHEET_API?action=getAcademicQueue&status=pending"`
2. For each paper, decide: **promote**, **discard**, or **hold**
   - **Promote**: meets the logging bar → evaluate fully → `action=append` to NewsLog + `updateAcademicRow` with `status=promoted`
   - **Discard**: off-topic or negligible → `updateAcademicRow` with `status=discarded`
   - **Hold**: borderline, field-relevant but not thesis-relevant now → `updateAcademicRow` with `status=reviewed`
3. Report: X promoted, Y discarded, Z held. Highlight any ALTA papers.

**Note for academic papers:** `source` = `"First Author (Year)"`. `date_published` = `"YYYY"` or `"YYYY-MM"`. Use the `year` field from AcademicQueue.

```bash
# Fetch pending AcademicQueue items
curl -s -L "SHEET_API?action=getAcademicQueue&status=pending"

# Promote to NewsLog
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"append","rows":[{...full evaluated row...}]}'

# Mark as promoted in AcademicQueue — use `url` field, NOT `id` (IDs are non-unique)
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","url":"https://example.com/paper","status":"promoted"}'

# Mark as discarded
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","url":"https://example.com/paper","status":"discarded"}'

# Mark as held (reviewed, no action)
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","url":"https://example.com/paper","status":"reviewed"}'
```

---

## `update news` — Review NewsResults

Reviews what the GoogleNewsRSS pipeline has staged in NewsResults. **Does NOT trigger a new scan.** The scan runs automatically via the daily GAS trigger (11pm). No API key required — uses Google News RSS directly.

1. Fetch pending: `curl -s -L "SHEET_API?action=getNewsResults&status=pending"`
2. For each result, evaluate against the logging bar
3. Qualifying results → full evaluation → `action=append` to NewsLog
4. Mark each processed row:

```bash
# Mark as processed (covers both promoted and discarded)
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateNewsRow","id":"ROW_ID","fields":{"status":"processed"}}'
```

5. Report: X promoted to NewsLog, Y discarded. Highlight any ALTA items.

---

## Evaluation — How to Score Every Result

Apply to all items regardless of source (PerplexityQueue, AcademicQueue, NewsResults, or Claude web_search).

### Importance

| Level | Label | Criteria |
|-------|-------|----------|
| High | **ALTA** | Directly impacts thesis argument. Framework update, major ruling, seminal paper, official guidance. Must read now. |
| Medium | **MEDIA** | Supports or contextualizes thesis. Commentary, analysis, related policy, conference paper. |
| Low | **BAJA** | Tangentially related. General news, opinion without new analysis, event announcement. |

**Calibration:** Expect roughly 1-3 ALTA, 5-10 MEDIA per run. ALTA should be genuinely exceptional. If you're marking 5+ items ALTA, recalibrate downward.

### Capa Classification

**CAPA TEÓRICA**
- `Gobernanza IA comparada` — comparative AI governance theory, regulatory models
- `Metodológica` — research methodology, comparative law
- `Metodología derecho comparado` — functional equivalence, legal transplants
- `Derecho procesal y prueba electrónica` — procedural law, electronic evidence, admissibility
- `Contestabilidad algorítmica` — right to explanation, human oversight theory

**CAPA ANALÍTICA** (assign specific article mapping when identifiable)
- `Art. 9 ↔ MAP/MEASURE` — risk management
- `Art. 10 ↔ MAP/GOVERN` — data governance
- `Art. 11 ↔ GOVERN` — technical documentation
- `Art. 12 ↔ MEASURE` — activity logging
- `Art. 13 ↔ GOVERN/MAP` — transparency
- `Art. 14 ↔ GOVERN/MANAGE` — human oversight
- `Art. 15 ↔ MEASURE/MANAGE` — robustness, accuracy, cybersecurity

**CAPA EVALUATIVA**
- `Contestabilidad` | `Accountability` | `Equidad` | `Explicabilidad`

**CASO** — concrete case study, court ruling, or empirical example

### Content Type

`paper` | `article` | `report` | `blog` | `podcast` | `video` | `event` | `court_ruling` | `regulation` | `guidance` | `presentation` | `news` | `transcript` | `book` | `chapter` | `handbook`

### Thesis Relevance Note — Writing Style

Three short paragraphs, always in this order:

1. **Context** — What's happening in the world. Why does this topic matter right now?
2. **Article** — What this source says, finds, or argues. Concrete: names, dates, findings.
3. **Thesis** — Why it matters for the doctoral thesis. Connect to a capa, article comparison, or chapter. Be direct: "This is your evidence for X."

**Style rules (Gregory C. Allen voice):**
- Plain language, no jargon without context
- No passive academic voice
- No generic statements ("relevant to AI governance" is never acceptable)
- Lead with what's interesting or surprising

**Example (good):**
"The entire enforcement architecture of the EU AI Act rests on technical standards that were supposed to be ready by August 2025. They're not. CEN and CENELEC missed the deadline, which means companies facing high-risk AI obligations don't have a concrete benchmark to comply with.\n\nThe Commission acknowledged the problem in November 2025 with its Digital Omnibus proposal, essentially hitting pause on certain requirements and floating interim measures.\n\nThis is arguably the most useful finding for your thesis right now. If Europe hasn't finished writing its own Art. 9 risk management standard, and NIST already has a working one, you have a real-world opening for the interoperability argument — not as a hypothetical, but as a practical necessity during the gap."

**For Perplexity-sourced items:** Paragraph 2 ("Article") describes the landscape that Sonar synthesized, not a specific article. Name the most concrete finding from the synthesis (e.g., "As of March 2026, the AI Office has published three implementing acts under Art. 9 but none directly addressing federal agency use cases"). Do not write "Perplexity found that..." — write about the substance.

### Action Tag

- **REFERENCE** — citable in the thesis
- **CONTEXT** — informs understanding, unlikely to cite
- **FOLLOW-UP** — track this topic/author/event going forward
- **URGENT** — requires immediate attention (deadline, framework change, major ruling)

### Additional Fields

- **Scholar**: Name if item is by or about a tracked scholar. Empty otherwise.
- **Language**: `en` | `es` | other ISO code
- **Search scope**: What triggered this find — `"update perplexity"`, `"update academic"`, `"update news"`, `"update claude"`, or `"update [topic]"`
- **Run ID**: `YYYY-MM-DD-NNN` where NNN = `total_searches` from metadata (zero-padded). Generate once per session.
- **Tier**: `1` = official/government/court | `2` = expert/academic/think tank | `3` = general. Never leave blank.
- **Folder**: `01_Marco_Teorico` | `02_Metodologia` | `03_Corpus_Juridico` | `04_Estado_del_Arte` (empty if unclassified)
- **Chapters**: Array of chapter numbers (int[]) using the canonical 7-chapter structure. Always populate. See canonical mapping below.

### Canonical Chapter Numbering (TASK-014, updated TASK-017)

The `chapters` field in Supabase uses this fixed numbering. Source of truth: `chapter_sections` table in Supabase. **Updated 2026-03-23 to hybrid structure (v16).**

| Chapter | Title |
|---------|-------|
| 1 | Introducción |
| 2 | Marco teórico y estado de la cuestión |
| 3 | El Reglamento de Inteligencia Artificial |
| 4 | El NIST AI Risk Management Framework |
| 5 | Análisis comparativo |
| 6 | Caso de estudio: Departamento de Justicia |
| 7 | Conclusiones |

When evaluating an item, assign one or more chapter numbers based on where the content fits in the thesis argument:
- **Cap 2 (Marco teórico):** AI governance theory, comparative law methodology, regulatory theory, contestability/algorithmic accountability theory, procedural law / electronic evidence, general methodology (§2.6)
- **Cap 3 (RIA):** EU AI Act specific — articles 8-15 high-risk requirements, AI Office, conformity assessment, implementing acts, EU AI governance architecture
- **Cap 4 (NIST):** NIST AI RMF specific — GOVERN/MAP/MEASURE/MANAGE functions, federal AI policy (EOs, OMB memos), US agency AI governance
- **Cap 5 (Análisis comparativo):** Direct EU AI Act ↔ NIST RMF crosswalks, interoperability analysis, correspondence matrix, documentation protocol
- **Cap 6 (Caso de estudio):** DOJ systems (PATTERN, STRmix, NGI-IPS/FACE Services), forensic AI, court admissibility (Daubert/Frye), Bureau of Prisons, probabilistic genotyping
- **Cap 7 (Conclusiones):** Policy recommendations, synthesis, future research

**Do NOT assign Cap 1 (Introducción) or Cap 7 (Conclusiones) to sources.** The Supabase trigger rejects chapters outside 2-6.

**Classifier v2 logic (title-first):** Primary chapter is determined by title keywords. Max 3 chapters per item (primary/secondary/tertiary — array position = priority). Secondary only if relevance ≥ 60% of primary.

---

## Write to NewsLog

```bash
curl -s -L "SHEET_API" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "append",
    "rows": [
      {
        "id": "GENERATE_AS_DESCRIBED_BELOW",
        "url": "https://example.com/article",
        "title": "Article Title",
        "source": "Source Name",
        "date_published": "2026-02-15",
        "date_found": "2026-03-09",
        "content_type": "article",
        "importance": "ALTA",
        "capa": "Teórica, Analítica",
        "capa_detail": "Gobernanza IA comparada, Art. 9 ↔ MAP/MEASURE",
        "evaluativa_criteria": "Accountability, Explicabilidad",
        "action_tag": "REFERENCE",
        "thesis_relevance": "Context paragraph.\n\nArticle paragraph.\n\nThesis paragraph.",
        "scholar": "",
        "search_scope": "update perplexity",
        "language": "en",
        "run_id": "2026-03-09-001",
        "tier": "2",
        "folder": "01_Marco_Teorico",
        "chapters": [2, 5],
        "notes": "",
        "starred": ""
      }
    ]
  }'
```

### ID field

The `id` field is stored as-is in the sheet. Server-side deduplication (from v32 onward) uses the normalized URL, not the `id` field. You can generate `id` as `base64(url)[:16]` for consistency with existing rows, but it does not affect whether the row is accepted or skipped.

After appending, update metadata:
```bash
curl -s -L "SHEET_API" \
  -H "Content-Type: application/json" \
  -d '{"action":"updateMeta","meta":{"last_search_date":"2026-03-09T14:30:00Z"}}'
```

**Deduplication behavior:** `promoteToNewsLog` deduplicates by normalized URL against NewsLog only — `www.domain.com` and `domain.com` are treated as the same URL. `append` deduplicates by normalized URL against all 4 tabs. Both are idempotent — re-submitting the same URL is safe.

---

## Supabase — Primary Data Store (TASK-006)

**Since 2026-03-19**, Supabase is the **primary and sole destination** for evaluated items. The Sheet NewsLog tab receives only a lightweight verification row (title, url, importance, source_pipeline) so the user can visually confirm writes happened. All full data lives in Supabase.

### Supabase Connection

```
SUPABASE_URL=https://wtwuvrtmadnlezkbesqp.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0d3V2cnRtYWRubGV6a2Jlc3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzczMDYsImV4cCI6MjA4OTUxMzMwNn0.1eCIlv6URloKHnEzxB2drHtiS2NR_VH_2DHF6YFLerY
```

### Batch write protocol — CRITICAL

Sessions can pause or restart if they run too long. To avoid losing progress:

1. **Evaluate in batches of ~20 items** from the staging queue.
2. **Write the batch to Supabase** immediately after evaluating.
3. **Write verification rows to Sheet** (lightweight, same batch).
4. **Confirm the batch** before moving to the next group.
5. If the session restarts, only the current unwritten batch is lost.

**Never** evaluate all items first and write at the end. Always: evaluate batch → write batch → next batch.

### Step 1 — Write to Supabase (primary)

POST all evaluated items in the batch to Supabase. This is the complete record.

```bash
curl -s -X POST "SUPABASE_URL/rest/v1/evaluated_items" \
  -H "apikey: SUPABASE_KEY" \
  -H "Authorization: Bearer SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=ignore-duplicates,return=minimal" \
  -d '[{
    "url": "https://example.com/article",
    "title": "Article Title",
    "source": "Source Name",
    "date_published": "2026-02-15",
    "content_type": "article",
    "importance": "ALTA",
    "capa": "Teórica, Analítica",
    "capa_detail": "Gobernanza IA comparada, Art. 9 ↔ MAP/MEASURE",
    "evaluativa_criteria": "Accountability, Explicabilidad",
    "action_tag": "REFERENCE",
    "thesis_relevance": "Context paragraph.\n\nArticle paragraph.\n\nThesis paragraph.",
    "scholar": "",
    "search_scope": "update perplexity",
    "language": "en",
    "run_id": "2026-03-19-001",
    "tier": "2",
    "folder": "01_Marco_Teorico",
    "notes": "",
    "starred": false,
    "source_pipeline": "perplexity",
    "chapters": [2, 5]
  }]'
```

Multiple items can be included in the array for batch inserts. The `unique_url` constraint prevents duplicates.

### Step 2 — Write verification row to Sheet NewsLog

After a successful Supabase write, append a **minimal** row to NewsLog via the Sheet API so the user can visually verify. Only these fields are needed:

```
action=append&tab=NewsLog
Fields: title, url, importance, source_pipeline, date_found (today), notes="✓ Supabase"
```

All other fields (thesis_relevance, capa, capa_detail, etc.) are left blank in the Sheet row — the full data is in Supabase only. The `notes="✓ Supabase"` marker makes it easy to distinguish these verification rows from legacy full rows.

### Step 3 — Generate embeddings

After writing a batch to Supabase, call the edge function to generate embeddings for the new items:

```bash
curl -s -X POST "SUPABASE_URL/functions/v1/generate-embeddings" \
  -H "Authorization: Bearer SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 1}'
```

Call once per new item in the batch (or let the scheduled task handle it later — embeddings are not blocking).

### Supabase fields

| Field | Type | Notes |
|-------|------|-------|
| `url` | text | **Required.** Unique constraint — duplicates ignored |
| `title` | text | **Required.** |
| `importance` | text | **Required.** `ALTA` \| `MEDIA` \| `BAJA` |
| `source` | text | Publication/site name |
| `date_published` | text | Original publication date |
| `content_type` | text | article, paper, report, etc. |
| `capa` | text | Thesis layer(s) |
| `capa_detail` | text | Specific sub-areas within layer |
| `evaluativa_criteria` | text | Which evaluative criteria apply |
| `action_tag` | text | `REFERENCE` \| `CONTEXT` \| `FOLLOW-UP` \| `URGENT` |
| `thesis_relevance` | text | Full 3-paragraph evaluation |
| `scholar` | text | Associated scholar if any |
| `search_scope` | text | Query/command that found it |
| `language` | text | Default `en` |
| `run_id` | text | Session identifier (YYYY-MM-DD-NNN) |
| `tier` | text | `1` \| `2` \| `3` |
| `folder` | text | Target thesis folder |
| `chapters` | integer[] | **Required.** Canonical chapter numbers (1–7). See Chapter Numbering section. Never leave empty. |
| `notes` | text | Free text |
| `starred` | boolean | Default `false` |
| `source_pipeline` | text | `perplexity` \| `academic` \| `news` \| `claude` \| `scholar_gateway` \| `consensus` |
| `embedding` | vector(384) | Auto-generated by edge function (leave null on write) |

### `source_pipeline` values

Set based on the command that produced the item:
- `update perplexity` → `"perplexity"`
- `update academic` → `"academic"`
- `update news` → `"news"`
- `update claude` → `"claude"`
- Scholar Gateway searches → `"scholar_gateway"`
- Consensus searches → `"consensus"`

### Error handling

- **Supabase write fails:** Retry once. If still fails, write the FULL row to Sheet NewsLog as fallback (not just verification row) and add `notes="supabase_write_failed"`. Log in session for backfill later.
- **Sheet verification row fails:** Not critical — the data is safe in Supabase. Continue.

### Querying Supabase

For `what did we find about [topic]?` and `show archive`, **always query Supabase first** (it has the complete data). Sheet NewsLog is no longer the primary source for queries.

```bash
# By importance
curl -s "SUPABASE_URL/rest/v1/evaluated_items?importance=eq.ALTA&order=created_at.desc&limit=20" \
  -H "apikey: SUPABASE_KEY"

# By capa
curl -s "SUPABASE_URL/rest/v1/evaluated_items?capa=ilike.*Analítica*&limit=20" \
  -H "apikey: SUPABASE_KEY"

# Full text search on thesis_relevance
curl -s "SUPABASE_URL/rest/v1/evaluated_items?thesis_relevance=ilike.*NIST*&order=created_at.desc" \
  -H "apikey: SUPABASE_KEY"

# Semantic search (requires embedding — call search_evaluated_items RPC)
curl -s "SUPABASE_URL/rest/v1/rpc/search_evaluated_items" \
  -H "apikey: SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query_embedding": "[384d vector]", "match_threshold": 0.7, "match_count": 10}'
```

### Embeddings pipeline

- **Model:** gte-small (384 dimensions), free via Supabase AI
- **Edge function:** `generate-embeddings` — processes items with `embedding IS NULL`, one at a time
- **Invocation:** `POST SUPABASE_URL/functions/v1/generate-embeddings` with `Authorization: Bearer SUPABASE_KEY` and `{"batch_size": 1}`
- **Auto-population:** After writing new items, embedding is null. Edge function generates it on demand or via scheduled task `generate-embeddings-backfill`.
- **Search function:** `search_evaluated_items(query_embedding, match_threshold, match_count, filter_importance)` returns ranked results by cosine similarity.

### Sheet tabs — current roles

| Tab | Role | Status |
|-----|------|--------|
| **Queries** | Control plane — defines searches, scholars, schedules | Active (Apps Script reads) |
| **PerplexityQueue** | Staging — raw Perplexity results | Active (Apps Script writes, Claude reads) |
| **AcademicQueue** | Staging — raw academic/OpenAlex results | Active (Apps Script writes, Claude reads) |
| **NewsResults** | Staging — raw Google News RSS results | Active (Apps Script writes, Claude reads) |
| **NewsLog** | Verification log — minimal rows confirming Supabase writes | Active (receive-only, not queried for data) |

---

## Special Commands

### `add scholar [name]`

1. `getQueries` — check if scholar already exists
2. If not: `addQuery` with all required fields (see Rule 1)
3. Confirm: "[Name] added to Queries tab (ID: [returned id]). Included in future scans."

### `add topic [description]`

1. `getQueries` — check for duplicates
2. Generate 1-2 focused search queries from the description
3. `addQuery` for each with all required fields
4. Confirm with generated queries so user can adjust

### `what did we find about [topic]?`

1. `getAll` — fetch all NewsLog rows
2. Filter by keyword in title, thesis_relevance, scholar, capa_detail
3. Present matches conversationally — no new searches
4. If more than 5 results, group by importance and capa

### `show archive` / `show history`

1. `getAll` — fetch all rows
2. Present text summary: total items, breakdown by importance and capa, top scholars by count, most recent 5-10 items, any URGENT or FOLLOW-UP items outstanding
3. No new searches. No file generation.

### `search [name/topic] and log findings` (historical sweep)

1. Run 2-5 targeted searches covering the full requested date range
2. Evaluate every result against the logging bar
3. Append all qualifying results via `action=append`
4. If subject has a Queries tab entry: `updateQuery` to set `hist_sweep=done`
5. Update `last_search_date` in metadata
6. Report items added and highlight ALTA findings

---

## Google Sheet API Reference

All requests go to the endpoint in `config.txt`.

| Action | Method | Description |
|--------|--------|-------------|
| `getMeta` | GET | Returns metadata: last_search_date, total_searches, last_acad_scan, last_news_scan, last_perplexity_scan |
| `getAll` | GET | Returns all rows in NewsLog. Supports `?limit=N`, `?offset=N`, `?importance=ALTA`, `?folder=01_Marco_Teorico`, `?action_tag=URGENT` |
| `getUrls` | GET | Returns all existing URLs from NewsLog (lightweight, for deduplication reference) |
| `getQueries` | GET | Returns all rows in the Queries tab |
| `getNewsResults` | GET | Returns rows from NewsResults. Supports `?status=pending`, `?limit=N` |
| `getAcademicQueue` | GET | Returns rows from AcademicQueue. Supports `?status=pending`, `?limit=N` |
| `getPerplexityQueue` | GET | Returns rows from PerplexityQueue. Supports `?status=pending`, `?run_id=2026-03-09-PI`, `?limit=N` |
| `append` | POST | Appends new rows to NewsLog; deduplicates by normalized URL against **all 4 tabs**. Use for direct Claude searches only. |
| `promoteToNewsLog` | POST | Appends new rows to NewsLog; deduplicates by normalized URL against **NewsLog only**. Use when promoting from staging queues. |
| `updateMeta` | POST | Updates metadata fields |
| `addQuery` | POST | Adds a row to the Queries tab; auto-assigns ID |
| `updateQuery` | POST | Updates fields on a Queries tab row by ID |
| `updateRow` | POST | Updates fields on a NewsLog row by ID |
| `updateByUrl` | POST | Updates NewsLog row by URL |
| `updateNewsRow` | POST | Updates fields on a NewsResults row by id |
| `updateAcademicRow` | POST | Updates `status` and/or `notes` on an AcademicQueue row **by url** (NOT by id — IDs are non-unique due to base64 truncation) |
| `updatePerplexityRow` | POST | Updates `status` and/or `notes` on a PerplexityQueue row **by url** (NOT by id — see Known Behaviors) |

**NewsLog tab** (21 columns):
`id`, `url`, `title`, `source`, `date_published`, `date_found`, `content_type`, `importance`, `capa`, `capa_detail`, `evaluativa_criteria`, `action_tag`, `thesis_relevance`, `scholar`, `search_scope`, `language`, `run_id`, `tier`, `folder`, `notes`, `starred`

**Queries tab**: `id`, `type`, `name`, `query`, `date_filter`, `active`, `hist_sweep`, `notes`, `added`, `tier`, `frequency`, `next_run`, `q_openalex`, `q_semantic`, `q_arxiv`, `q_core`, `q_fullweb`, `q_news`

**NewsResults tab** (13 columns):
`id`, `url`, `title`, `snippet`, `source_domain`, `news_rank`, `date_found`, `query_used`, `q_id`, `q_name`, `run_id`, `status`, `notes`
- `status`: `pending` | `processed`

**AcademicQueue tab** (12 columns):
`id`, `url`, `title`, `authors`, `year`, `abstract`, `source_api`, `query_id`, `query_name`, `date_found`, `status`, `notes`
- `status`: `pending` | `promoted` | `discarded` | `reviewed`

**PerplexityQueue tab** (14 columns):
`id`, `url`, `title`, `synthesis`, `citations`, `source_domain`, `date_found`, `query_used`, `q_id`, `q_name`, `run_id`, `status`, `notes`, `tokens_used`
- `url`: first citation URL returned by Sonar (may be empty if no citations)
- `title`: name of the query that produced this result
- `synthesis`: Sonar's 2-3 sentence synthesized answer
- `citations`: JSON-encoded array of source URLs
- `tokens_used`: input+output tokens for cost monitoring
- `status`: `pending` | `promoted` | `discarded` | `reviewed`

**Meta tab** (key-value): `last_search_date`, `total_searches`, `last_acad_scan`, `last_news_scan`, `last_perplexity_scan`

---

## Quality Standards

- **No hallucinated results.** Every item must come from an actual source. For Perplexity items, the synthesis must be grounded in the citations array — do not invent findings.
- **No duplicates.** Check existing URLs before evaluating. API also deduplicates server-side by `id` against NewsLog.
- **Honest importance ratings.** Most items are MEDIA or BAJA. ALTA is rare — 1-3 per run maximum.
- **Three-paragraph thesis relevance — always.** Context → Article → Thesis, in Gregory Allen's voice. Never skip paragraphs. Never write generic one-liners. This is the most important column in the Sheet.
- **Store the full three paragraphs.** Do not truncate when posting to the API.
- **Quality gate before every API post:** If the thesis_relevance you are about to post is (a) under 600 characters, (b) starts with "This content addresses", or (c) ends with "Directly relevant to thesis capas on AI governance frameworks" — do NOT post it. These are signs of context window compression. Stop processing, report the count of items remaining, and close the session. Re-evaluate those items in a fresh session instead.
- **Context degradation is silent and cumulative.** You will not notice it happening. The only defense is the hard batch limits above. Do not override them for any reason.
- **Date awareness.** Note if results are older than 30 days. Prioritize recency.
- **Transparent gaps.** If a search category returns nothing new, say so explicitly.
- **Content type accuracy.** YouTube = `video`. Podcast = `podcast`. Don't default everything to `article`.
- **Respect rate limits.** If the Sheet API returns an error, inform the user and save results as a local .json file as backup.
- **Queries tab is authoritative.** Always read `getQueries` before running searches.
- **All `addQuery` calls include the full column set**, including all six `q_*` fields.
- **Log broadly, classify carefully.** Capture anything meeting the logging bar. Importance and capa communicate fit — not whether to log at all.
- **Perplexity items: pick a real URL from `citations`.** When promoting from PerplexityQueue, always parse the `citations` JSON array and pick the most authoritative URL as the NewsLog `url`. Do NOT use the PerplexityQueue row's own `url` field as the NewsLog URL (it's just the first citation stored as a convenience). If all citations are paywalled or inaccessible, note this in `notes` and use the best available URL. Never leave `url` empty in NewsLog.


## Repository Access

All project files (scripts, docs, logs) live in the GitHub repository. At the start of every session, clone it:

```bash
REPO_DIR="thesis-repo"
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR" && git pull
else
  git clone https://x-access-token:<token>@github.com/aauml/thesis.git "$REPO_DIR"
  cd "$REPO_DIR"
  git config user.email "claude@thesis.local"
  git config user.name "Claude PM"
fi
```

The push token is in the phd-kb project instructions. **Never hardcode it in committed files.**

### Repository structure

```
thesis/
├── index.html                    # KB webapp (GitHub Pages)
├── dashboard.html                # PM dashboard (GitHub Pages)
├── phd-kb/
│   ├── scripts/                  # All GAS scripts, versioned
│   │   ├── ArXiv-v2.txt
│   │   ├── WebApp-v32.txt
│   │   └── ...
│   ├── docs/                     # SKILL files, config, system reference
│   │   ├── SKILL-KB-v13.md
│   │   ├── KB-Config.txt
│   │   └── KB-SystemReference-v1.txt
│   └── logs/                     # Lessons log, pending issues
│       ├── KB-LessonsLog.md
│       └── KB-PendingIssues.md
└── phd-pm/
    ├── docs/                     # PM skill files, project instructions
    └── logs/                     # PM session logs, lessons
```

This structure is the same for both projects. Any new project (e.g., phd-writing) follows the same pattern: `project-name/{scripts,docs,logs}/`.

---

## GAS Script Management

Whenever a Google Apps Script file is modified (bug fix, new feature, configuration change), the following steps are **mandatory**:

1. **Save the complete updated script** to the repo:
   ```
   phd-kb/scripts/ScriptName-vN.txt
   ```
   Never save patches or diffs — always the full file.
2. **Commit and push** with a descriptive message.
3. **Also save to outputs** (`/sessions/.../mnt/outputs/`) in Cowork mode so the user gets a download link in chat. In regular chat, skip this step.
4. The user will locate the file in the GitHub repo and paste it manually into the GAS editor.

**Why full scripts, not patches:** Patches require the user to locate the exact diff location in the GAS editor. Full versioned scripts let them select-all and paste, with no risk of partial application.

**Naming convention:** `ScriptName-vN.txt` where N increments from the previous highest version in `phd-kb/scripts/`. If no previous version exists, start at `v1`. Check the folder listing before naming: `ls phd-kb/scripts/ScriptName-v*.txt`

### Updating this skill file

The same versioning rule applies to this skill file itself. When modifications are needed (new rules, bug fixes, updated behaviors):

1. **Never edit the existing file in place.** Always create a new version.
2. **Create `SKILL-KB-vN+1.md`** in `phd-kb/docs/` with all changes applied. Current version is v19, so next update produces `SKILL-KB-v20.md`.
3. **Also overwrite `SKILL-KB-current.md`** with the same content. This is the file the bootstrap loader reads — it must always point to the latest version.
4. Commit and push to the repo.
5. The user does NOT need to update project knowledge — the bootstrap loads `current.md` automatically.

This ensures the change history is preserved (versioned files + git log) and the bootstrap always loads the latest version.

---

## Session Startup Protocol

**Al iniciar cualquier sesión de trabajo con este skill, siempre ejecutar estos pasos ANTES de cualquier trabajo:**

### 1. Clonar o actualizar el repositorio
```bash
git clone https://x-access-token:<token>@github.com/aauml/thesis.git thesis-repo
cd thesis-repo && git config user.email "claude@thesis.local" && git config user.name "Claude KB"
```
Or if already cloned: `cd thesis-repo && git pull`

### 2. Leer CHANGELOG.md (contexto cross-contexto)
```
Ruta: thesis-repo/CHANGELOG.md
```
Log unificado de TODOS los contextos (Chat, Cowork, Code, Dispatch). Leer las últimas entradas para saber qué cambió desde la última sesión KB — especialmente cambios de PM o Code que puedan afectar pipelines o datos.

### 3. Leer KB-LessonsLog.md
```
Ruta: thesis-repo/phd-kb/logs/KB-LessonsLog.md
```
Read all Prevention Rules. These are hard rules derived from past bugs — violating any means repeating a known mistake. Internalize them before processing any items.

### 4. Leer KB-PendingIssues.md
```
Ruta: thesis-repo/phd-kb/logs/KB-PendingIssues.md
```
Check for open bugs and pending tasks. Note any that are relevant to the current session's work.

### 5. Confirm readiness
Report: "Lessons log read (N prevention rules). CHANGELOG: [resumen últimas entradas o 'sin cambios']. Pending issues: [list open bugs]. Ready to proceed."

**This protocol takes 1 minute and prevents repeating known mistakes. It works in Cowork, regular chat, and Claude Code.**

---

## Session Closing Protocol

**Al terminar cualquier sesión de trabajo con este skill, siempre ejecutar estos pasos antes de cerrar:**

### 1. Leer KB-PendingIssues.md
```
Ruta: thesis-repo/phd-kb/logs/KB-PendingIssues.md
```
Revisar si alguna tarea pendiente fue resuelta esta sesión. Si sí, marcarla como completada.

### 2. Registrar bugs y tareas nuevas
Si se identificaron nuevos bugs o tareas técnicas durante la sesión, agregarlos a `KB-PendingIssues.md` con:
- ID secuencial (BUG-XXX o TASK-XXX)
- Descripción del problema
- Impacto
- Fix posible o acción requerida
- Fecha detectado

### 3. Registrar decisiones técnicas
Agregar cualquier decisión técnica nueva a la tabla de "Decisiones técnicas registradas" en `KB-PendingIssues.md`.

### 4. Actualizar versiones en la tabla de decisiones
Si se crearon archivos nuevos (scripts GAS, versiones del skill), registrarlos.

### 5. Actualizar KB-LessonsLog.md
Si se descubrieron nuevos problemas, errores, o patrones durante la sesión:
- Agregar una nueva Prevention Rule (PR-XXX) con: problema, root cause, y regla de prevención
- Agregar entrada al Problem Log table
- Actualizar Session History table
```
Ruta: thesis-repo/phd-kb/logs/KB-LessonsLog.md
```

### 6. Actualizar el PM Log
Agregar entrada en el Registro de decisiones del PM Log si hubo cambios significativos.

### 7. Actualizar KB-PendingIssues.md — fecha
Actualizar la línea `_Última actualización: YYYY-MM-DD_` al final del archivo.

### 8. Actualizar RECOVERY-KB.md (si aplica)
Si durante la sesión cambiaron conexiones, servicios, arquitectura, o versiones de archivos críticos (nuevo SKILL, nuevo script, nuevo servicio), actualizar `phd-kb/docs/RECOVERY-KB.md` con la información nueva. En particular:
- §3 (Conexiones) si cambió una URL, key, o se agregó un servicio
- §5 (Apps Script) si se creó o modificó un script
- §7 (Versionamiento) si se creó nueva versión del SKILL
- §8 (Bugs y Tasks) si cambió el estado de un bug/task importante

No crear versiones de RECOVERY — es un snapshot que se sobreescribe.

### 9. CHANGELOG.md (cross-contexto, append-only)
Agregar entrada al final de `CHANGELOG.md` con resumen de la sesión:
```
## YYYY-MM-DD | cowork-kb | componente(s) | resumen
- Qué se hizo (items procesados, pipelines ejecutados)
- Bugs encontrados (si aplica)
- Qué afecta a otros contextos (si aplica)
```
**Regla:** Solo append. Nunca editar ni borrar entradas anteriores.

### 10. Commit y push
```bash
cd thesis-repo
git add phd-kb/logs/ phd-kb/scripts/ phd-kb/docs/ CHANGELOG.md
git commit -m "session close: [brief description of changes]"
git push
```

**Este protocolo toma 2-3 minutos y evita perder contexto entre sesiones.**

---
## Known Behaviors and Bugs

These are confirmed behaviors from production use. Handle accordingly.

### 1. Use `promoteToNewsLog` when promoting from staging queues (CRITICAL)

`action=append` deduplicates against all 4 tabs (NewsLog + AcademicQueue + PerplexityQueue + NewsResults). If the URL being promoted already exists in the source queue (which it always does), it will be skipped with `skipped:1`. Use `action=promoteToNewsLog` instead — it deduplicates against NewsLog only. Use `action=append` only for direct Claude searches that bypass all queues.

### 2. `updatePerplexityRow` must use `url`, not `id`

The GAS server-side lookup for `updatePerplexityRow` by `id` field is unreliable — it returns `ok:true` but does not update the row in many cases. Always use `"url": "..."` as the lookup key. The `url` value is the PerplexityQueue row's `url` field value.

### 3. Duplicate PerplexityQueue rows

The same query often produces 2-3 PerplexityQueue rows with different `run_id` values (e.g., `2026-03-09-PS`, `2026-03-09-PI`). Each `updatePerplexityRow` call by URL updates only the first matching pending row. Multiple calls to the same URL update duplicates one by one. This is expected behavior — process the same URL multiple times if needed to clear all duplicate rows.

### 4. Non-www ID collisions (rare)

A small number of non-www URLs may also produce ID collisions if their domain produces the same base64[:16] prefix as an existing NewsLog entry (e.g., multiple `artificialintelligenceact.eu/*` URLs sharing the same prefix). When `append` returns `skipped:1` for a URL that genuinely isn't a duplicate, this is the cause. These rows can be marked `reviewed` in their source queue instead of `promoted`.

### 6. Context window compression produces degraded thesis_relevance (BUG-003)

During long sessions (100+ items), context window fills up and thesis_relevance output degrades silently. Symptoms: entries shorter than 600 characters, entries starting with "This content addresses [X].", entries ending with "Directly relevant to thesis capas on AI governance frameworks and comparative regulatory analysis." The boilerplate tail is the definitive indicator.

**Confirmed instance:** 77 entries in run `2026-03-13-205` are degraded due to a 198-item session that exceeded context limits. Fix: re-evaluate these entries in a fresh session by fetching the original PerplexityQueue rows (still exist, marked `promoted`) and using their `synthesis` field to write a proper 3-paragraph thesis_relevance, then update each NewsLog row via `updateByUrl`.

**Prevention:** Hard batch limits in v12 (50 items for `update perplexity`). Quality gate before every API post.

### 5. Bash tool 120s timeout with large batches

Processing 100+ items sequentially via curl in a single Bash call will exceed the 120-second timeout. Use Python with `concurrent.futures.ThreadPoolExecutor` for parallel API calls, or split into chunks of 20-25 items per Bash call. Sequential calls with 5 workers balance speed and avoid race conditions on duplicate-URL rows.
