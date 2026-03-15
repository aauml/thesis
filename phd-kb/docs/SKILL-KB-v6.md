---
name: thesis-kb-update v6
description: "Knowledge Base update and review skill for doctoral thesis on EU AI Act and NIST AI RMF interoperability. Reviews staging queues (PerplexityQueue, AcademicQueue, NewsResults) and runs targeted Claude searches. Promotes qualifying items to the NewsLog. Use when the user types 'update', 'update claude', 'update perplexity', 'update academic', 'update news', 'nd', 'what did we find about [topic]', 'show archive', 'add scholar', or 'add topic'."
---

# Thesis KB Update Skill

## Purpose

Maintain the doctoral thesis Knowledge Base by: (1) reviewing items staged in PerplexityQueue, AcademicQueue, and NewsResults by automated pipelines, (2) running targeted Claude web searches for URGENT/FOLLOW-UP topics, and (3) promoting qualifying items to the master NewsLog with full thesis evaluation.

## Four Pipelines

The system has four independent pipelines feeding the same Google Sheet:

| Pipeline | Script | Query Column | Staging Tab | Review Command |
|----------|--------|-------------|-------------|----------------|
| 1 — Claude targeted | Claude web_search | q_fullweb (5-10 only) | direct to NewsLog | `update claude` |
| 2 — Academic | AcademicOrchestrator.gs | q_openalex, q_semantic, q_arxiv, q_core | AcademicQueue | `update academic` |
| 3 — News | NewsSearch.gs | q_news | NewsResults | `update news` |
| 4 — Perplexity | PerplexitySearch.gs | q_fullweb (all, weekly) | PerplexityQueue | `update perplexity` |

**Pipeline 4 (Perplexity) handles all bulk q_fullweb searches.** It runs automatically every Sunday via a GAS trigger. Claude no longer loops through all 115 q_fullweb queries during `update claude`. That token budget is now spent on evaluation.

## Configuration

The Google Sheet API endpoint URL is stored in the project knowledge file `config.txt`:
```
SHEET_API=https://script.google.com/macros/s/AKfycbzk2vhu-qcKFBPqEImKGEZKSitpVZv1IQQEv5ZzG7pNfo-iPUWfvSoLWWnkoc8d8PQQ/exec
```

If `config.txt` is not found, ask the user for the URL and instruct them to add it as a project knowledge file.

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

**Token management:** With large queues (100+ pending items), a single `update` run processes as many items as the context allows and reports how many remain. Run `update perplexity`, `update academic`, or `update news` again to continue.

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
- PerplexityQueue: `updatePerplexityRow`

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

See the full `update perplexity` section below. Process up to 40 pending synthesis rows or until context is tight.

### Step 3: Review AcademicQueue

See the full `update academic` section below. Process up to 30 pending items or until context is tight.

### Step 4: Review NewsResults

See the full `update news` section below. Process up to 30 pending items or until context is tight.

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
- `query_used` — the exact q_fullweb term sent to Sonar
- `run_id` — identifies which weekly batch this came from

### Evaluation approach for Perplexity items

Each row is a synthesis for one query, not a specific article. The workflow is:

1. Read `synthesis`. Does it describe new or significant developments since the last review?
2. If **yes** (synthesis reveals something noteworthy):
   - Parse `citations` (JSON array) — pick the most authoritative/relevant URL as the primary URL for the NewsLog entry
   - Build a full NewsLog row. Use the synthesis as the basis for `thesis_relevance` (Context → Article → Thesis)
   - `action=append` to NewsLog
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

# Promote citation to NewsLog
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"append","rows":[{...full evaluated row...}]}'

# Mark as promoted
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","id":"ROW_ID","status":"promoted"}'

# Mark as discarded
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","id":"ROW_ID","status":"discarded"}'

# Mark as reviewed (borderline, no action)
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updatePerplexityRow","id":"ROW_ID","status":"reviewed"}'
```

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

# Mark as promoted in AcademicQueue
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","id":"ROW_ID","status":"promoted"}'

# Mark as discarded
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","id":"ROW_ID","status":"discarded"}'

# Mark as held (reviewed, no action)
curl -s -L "SHEET_API" -H "Content-Type: application/json" \
  -d '{"action":"updateAcademicRow","id":"ROW_ID","status":"reviewed"}'
```

---

## `update news` — Review NewsResults

Reviews what the NewsSearch (NewsAPI) pipeline has staged in NewsResults. **Does NOT trigger a new scan.** The scan runs automatically via the daily GAS trigger.

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

---

## Write to NewsLog

```bash
curl -s -L "SHEET_API" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "append",
    "rows": [
      {
        "id": "base64_url_first_16_chars",
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
        "notes": "",
        "starred": ""
      }
    ]
  }'
```

After appending, update metadata:
```bash
curl -s -L "SHEET_API" \
  -H "Content-Type: application/json" \
  -d '{"action":"updateMeta","meta":{"last_search_date":"2026-03-09T14:30:00Z"}}'
```

The API deduplicates server-side by URL across all four tabs. Duplicate submissions are safe.

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
| `getUrls` | GET | Returns all existing URLs (lightweight, for deduplication) |
| `getQueries` | GET | Returns all rows in the Queries tab |
| `getNewsResults` | GET | Returns rows from NewsResults. Supports `?status=pending`, `?limit=N` |
| `getAcademicQueue` | GET | Returns rows from AcademicQueue. Supports `?status=pending`, `?limit=N` |
| `getPerplexityQueue` | GET | Returns rows from PerplexityQueue. Supports `?status=pending`, `?run_id=2026-03-09-PI`, `?limit=N` |
| `append` | POST | Appends new rows to NewsLog; deduplicates by URL across all 4 tabs |
| `updateMeta` | POST | Updates metadata fields |
| `addQuery` | POST | Adds a row to the Queries tab; auto-assigns ID |
| `updateQuery` | POST | Updates fields on a Queries tab row by ID |
| `updateRow` | POST | Updates fields on a NewsLog row by ID |
| `updateByUrl` | POST | Updates NewsLog row by URL |
| `updateNewsRow` | POST | Updates fields on a NewsResults row by id |
| `updateAcademicRow` | POST | Updates `status` and/or `notes` on an AcademicQueue row by id |
| `updatePerplexityRow` | POST | Updates `status` and/or `notes` on a PerplexityQueue row by id |

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
- **No duplicates.** Check existing URLs before evaluating. API also deduplicates server-side across all 4 tabs.
- **Honest importance ratings.** Most items are MEDIA or BAJA. ALTA is rare — 1-3 per run maximum.
- **Three-paragraph thesis relevance — always.** Context → Article → Thesis, in Gregory Allen's voice. Never skip paragraphs. Never write generic one-liners. This is the most important column in the Sheet.
- **Store the full three paragraphs.** Do not truncate when posting to the API.
- **Date awareness.** Note if results are older than 30 days. Prioritize recency.
- **Transparent gaps.** If a search category returns nothing new, say so explicitly.
- **Content type accuracy.** YouTube = `video`. Podcast = `podcast`. Don't default everything to `article`.
- **Respect rate limits.** If the Sheet API returns an error, inform the user and save results as a local .json file as backup.
- **Queries tab is authoritative.** Always read `getQueries` before running searches.
- **All `addQuery` calls include the full column set**, including all six `q_*` fields.
- **Log broadly, classify carefully.** Capture anything meeting the logging bar. Importance and capa communicate fit — not whether to log at all.
- **Perplexity items: pick a real URL.** When promoting from PerplexityQueue, always use a real citation URL as the NewsLog `url`. If all citations are paywalled or inaccessible, note this in `notes` and use the best available URL. Never leave `url` empty in NewsLog.
