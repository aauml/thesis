---
name: thesis-kb-update v5
description: "Knowledge Base update and review skill for doctoral thesis on EU AI Act and NIST AI RMF interoperability. Runs Claude web searches, reviews AcademicQueue and NewsResults staging tabs, and promotes qualifying items to the NewsLog. Use when the user types 'update', 'update claude', 'update academic', 'update news', 'nd', 'what did we find about [topic]', 'show archive', 'add scholar', or 'add topic'."
---

# Thesis KB Update Skill

## Purpose

Maintain the doctoral thesis Knowledge Base by: (1) running targeted web searches with Claude, (2) reviewing items staged in AcademicQueue and NewsResults by automated pipelines, and (3) promoting qualifying items to the master NewsLog with full thesis evaluation.

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
| `update` or `nd` | Full update: Claude web searches + review AcademicQueue + review NewsResults |
| `update claude` | Only Claude web searches → direct to NewsLog |
| `update academic` | Only review pending AcademicQueue items |
| `update news` | Only review pending NewsResults items |
| `update [topic]` | Targeted Claude search on that topic only (5-10 searches) |
| `what did we find about [topic]?` | Search existing Sheet data, no new searches |
| `show archive` or `show history` | Summarize existing Sheet data |
| `add scholar [name]` | Add a new scholar to the Queries tab |
| `add topic [description]` | Add a new topic query to the Queries tab |

**Token management:** With large queues (100+ pending items), a single `update` run processes as many items as the context allows and reports how many remain. Run `update academic` or `update news` again to continue.

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
      "added": "2026-03-08T00:00:00Z",
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

Runs all three sub-commands in order: Claude searches → AcademicQueue review → NewsResults review.

### Step 1: Check queues and metadata

```bash
# Metadata
curl -s -L "SHEET_API?action=getMeta"

# Pending counts
curl -s -L "SHEET_API?action=getAcademicQueue&status=pending&limit=1"
curl -s -L "SHEET_API?action=getNewsResults&status=pending&limit=1"

# Existing URLs for dedup
curl -s -L "SHEET_API?action=getUrls"

# Active queries
curl -s -L "SHEET_API?action=getQueries"
```

Report at the start: "AcademicQueue: X pending | NewsResults: Y pending | Last update: [date]"

### Step 2: Claude web searches (`update claude` sub-flow)

See the full `update claude` section below. Run 15-20 searches from the Queries tab (`q_fullweb` column). Write qualifying results directly to NewsLog via `action=append`.

### Step 3: Review AcademicQueue

See the full `update academic` section below. Process up to 40 pending items or until context is tight.

### Step 4: Review NewsResults

See the full `update news` section below. Process up to 40 pending items or until context is tight.

### Step 5: Final summary

Report total items added to NewsLog across all three steps. Highlight ALTA items. Note if queues still have pending items remaining.

---

## `update claude` — Claude Web Searches

Runs targeted web searches using Claude's `web_search` tool. Appends qualifying results **directly to NewsLog** (skips staging). Does not touch AcademicQueue or NewsResults.

### Execution

1. Fetch active queries: `getQueries`
2. Build search list from the `q_fullweb` column of active queries. Prefer `q_fullweb` over hardcoded queries.
3. Run 15-20 searches max per run. For targeted scans (`update [topic]`): 5-10 searches.
4. For each result that meets the logging bar: evaluate fully (see Evaluation section) and append to NewsLog.
5. Update metadata: `last_search_date`

#### Core search queries (fallback if Queries tab is empty)

**EU AI Act**
- `"EU AI Act" implementation 2025 2026`
- `"AI Act" delegated acts OR standards OR enforcement`
- `"AI Act" high-risk conformity assessment`
- `AI Office European Commission announcement`

**NIST AI RMF**
- `"NIST AI RMF" OR "AI Risk Management Framework" update 2025 2026`
- `NIST artificial intelligence guidance federal`
- `OMB artificial intelligence federal agencies policy`

**Comparative / Transatlantic**
- `"AI Act" AND "NIST" comparison OR interoperability`
- `EU US AI regulation comparison 2025 2026`
- `"Brussels Effect" artificial intelligence`

**Forensic AI**
- `STRmix court admissibility 2025 2026`
- `"probabilistic genotyping" ruling OR validation`
- `"AI Act" law enforcement OR judicial`

**AI Governance (broad)**
- `"AI governance" regulation framework 2025 2026`
- `"algorithmic accountability" regulation OR audit`
- `AI contestability OR explainability regulation`

**Spanish-language** (2-3 queries in full scan)
- `"Ley de Inteligencia Artificial" UE implementación`
- `"gobernanza algorítmica" regulación 2025`

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

Apply to all items regardless of source (Claude search, AcademicQueue, or NewsResults).

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

### Action Tag

- **REFERENCE** — citable in the thesis
- **CONTEXT** — informs understanding, unlikely to cite
- **FOLLOW-UP** — track this topic/author/event going forward
- **URGENT** — requires immediate attention (deadline, framework change, major ruling)

### Additional Fields

- **Scholar**: Name if item is by or about a tracked scholar. Empty otherwise.
- **Language**: `en` | `es` | other ISO code
- **Search scope**: What triggered this find (e.g., "update claude", "update academic", "update news")
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
        "date_found": "2026-03-08",
        "content_type": "article",
        "importance": "ALTA",
        "capa": "Teórica, Analítica",
        "capa_detail": "Gobernanza IA comparada, Art. 9 ↔ MAP/MEASURE",
        "evaluativa_criteria": "Accountability, Explicabilidad",
        "action_tag": "REFERENCE",
        "thesis_relevance": "Context paragraph.\n\nArticle paragraph.\n\nThesis paragraph.",
        "scholar": "",
        "search_scope": "update claude",
        "language": "en",
        "run_id": "2026-03-08-001",
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
  -d '{"action":"updateMeta","meta":{"last_search_date":"2026-03-08T14:30:00Z"}}'
```

The API deduplicates server-side by URL across all three tabs. Duplicate submissions are safe.

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
| `getMeta` | GET | Returns metadata: last_search_date, total_searches, last_acad_scan, last_news_scan |
| `getAll` | GET | Returns all rows in NewsLog. Supports `?limit=N`, `?offset=N`, `?importance=ALTA`, `?folder=01_Marco_Teorico`, `?action_tag=URGENT` |
| `getUrls` | GET | Returns all existing URLs (lightweight, for deduplication) |
| `getQueries` | GET | Returns all rows in the Queries tab |
| `getNewsResults` | GET | Returns rows from NewsResults. Supports `?status=pending`, `?limit=N` |
| `getAcademicQueue` | GET | Returns rows from AcademicQueue. Supports `?status=pending`, `?limit=N` |
| `append` | POST | Appends new rows to NewsLog; deduplicates by URL across all 3 tabs |
| `updateMeta` | POST | Updates metadata fields |
| `addQuery` | POST | Adds a row to the Queries tab; auto-assigns ID |
| `updateQuery` | POST | Updates fields on a Queries tab row by ID |
| `updateRow` | POST | Updates fields on a NewsLog row by ID |
| `updateByUrl` | POST | Updates NewsLog row by URL |
| `updateNewsRow` | POST | Updates fields on a NewsResults row by id |
| `updateAcademicRow` | POST | Updates `status` and/or `notes` on an AcademicQueue row by id |

**NewsLog tab** (21 columns):
`id`, `url`, `title`, `source`, `date_published`, `date_found`, `content_type`, `importance`, `capa`, `capa_detail`, `evaluativa_criteria`, `action_tag`, `thesis_relevance`, `scholar`, `search_scope`, `language`, `run_id`, `tier`, `folder`, `notes`, `starred`

**Queries tab**: `id`, `type`, `name`, `query`, `date_filter`, `active`, `hist_sweep`, `notes`, `added`, `tier`, `frequency`, `next_run`, `q_openalex`, `q_semantic`, `q_arxiv`, `q_core`, `q_fullweb`, `q_news`

**NewsResults tab** (13 columns):
`id`, `url`, `title`, `snippet`, `source_domain`, `news_rank`, `date_found`, `query_used`, `q_id`, `q_name`, `run_id`, `status`, `notes`
- `status`: `pending` | `processed`

**AcademicQueue tab** (12 columns):
`id`, `url`, `title`, `authors`, `year`, `abstract`, `source_api`, `query_id`, `query_name`, `date_found`, `status`, `notes`
- `status`: `pending` | `promoted` | `discarded` | `reviewed`

**Meta tab** (key-value): `last_search_date`, `total_searches`, `last_acad_scan`, `last_news_scan`

---

## Quality Standards

- **No hallucinated results.** Every item must come from an actual web search result with a real URL.
- **No duplicates.** Check existing URLs before evaluating. API also deduplicates server-side.
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