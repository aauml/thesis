/**
 * ArXiv_v2.gs — ArXiv academic paper search provider
 * Pipeline: Academic (called by AcademicOrchestrator.gs)
 * API: http://export.arxiv.org/api/query (Atom XML, no JSON)
 * Key: None required (fully open)
 *
 * CHANGELOG v2 (2026-03-15):
 *   - Added ALLOWED_CATEGORIES filter to restrict results to relevant arXiv
 *     categories (cs.AI, cs.CY, cs.LG, cs.CR, cs.HC, cs.CL, stat.ML).
 *     Previously, queries like "AI Act" or "probabilistic genotyping" returned
 *     physics, biology, and math papers. The filter is injected automatically
 *     into all queries via _buildCategoryFilter().
 *   - Added _stripHtmlTags() for cleaner abstract extraction.
 *   - Improved XML parsing robustness with fallback regex patterns.
 *
 * Called by AcademicOrchestrator.gs PROVIDERS map:
 *   q_arxiv → searchArXiv(query, maxResults)
 */

// ── Configuration ──────────────────────────────────────────────────────

/**
 * Allowed arXiv categories. Only papers in these categories will be returned.
 * Full list: https://arxiv.org/category_taxonomy
 *
 * Relevant for this thesis (EU AI Act / NIST AI RMF / forensic AI):
 *   cs.AI  — Artificial Intelligence
 *   cs.CY  — Computers and Society (policy, governance, law)
 *   cs.LG  — Machine Learning
 *   cs.CR  — Cryptography and Security
 *   cs.HC  — Human-Computer Interaction
 *   cs.CL  — Computation and Language (NLP)
 *   cs.SE  — Software Engineering
 *   stat.ML — Machine Learning (statistics)
 *   eess.SP — Signal Processing (forensic DNA signal analysis)
 *   q-bio.QM — Quantitative Methods (probabilistic genotyping)
 *
 * To add a category: append to this array.
 * To disable filtering entirely: set to empty array [].
 */
var ALLOWED_CATEGORIES = [
  'cs.AI',
  'cs.CY',
  'cs.LG',
  'cs.CR',
  'cs.HC',
  'cs.CL',
  'cs.SE',
  'stat.ML',
  'eess.SP',
  'q-bio.QM'
];

var ARXIV_API = 'http://export.arxiv.org/api/query';

// ── Main entry point ───────────────────────────────────────────────────

/**
 * Search arXiv for papers matching the query.
 * Called by AcademicOrchestrator.gs via the PROVIDERS map.
 *
 * @param {string} query - The search term from Queries tab q_arxiv field
 * @param {number} maxResults - Maximum papers to return (typically 3)
 * @returns {Array<Object>} Standardized paper objects
 */
function searchArXiv(query, maxResults) {
  if (!query || !query.trim()) return [];
  maxResults = maxResults || 3;

  var searchQuery = _buildArXivQuery(query.trim());

  var url = ARXIV_API
    + '?search_query=' + encodeURIComponent(searchQuery)
    + '&start=0'
    + '&max_results=' + maxResults
    + '&sortBy=submittedDate'
    + '&sortOrder=descending';

  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var code = response.getResponseCode();

    if (code !== 200) {
      Logger.log('[ArXiv] HTTP ' + code + ' for query: ' + query);
      return [];
    }

    var xml = response.getContentText();
    return _parseArXivAtom(xml);

  } catch (e) {
    Logger.log('[ArXiv] Error fetching: ' + e.message);
    return [];
  }
}

// ── Query construction ─────────────────────────────────────────────────

/**
 * Build the full arXiv API query string, injecting category filter.
 *
 * arXiv query syntax:
 *   all:term          — search all fields
 *   cat:cs.AI         — filter by category
 *   AND / OR / ANDNOT — boolean operators
 *   Parentheses       — grouping
 *
 * If ALLOWED_CATEGORIES is non-empty, wraps the user query as:
 *   all:(user query) AND (cat:cs.AI OR cat:cs.CY OR ...)
 *
 * If the user query already contains "cat:", no category filter is added
 * (allows manual overrides from the Queries tab).
 *
 * @param {string} query - Raw query from q_arxiv field
 * @returns {string} Full arXiv search query
 */
function _buildArXivQuery(query) {
  // If user already specified categories, don't override
  if (query.toLowerCase().indexOf('cat:') >= 0) {
    return query;
  }

  // If no category filter configured, search all fields without restriction
  if (!ALLOWED_CATEGORIES || ALLOWED_CATEGORIES.length === 0) {
    return 'all:' + query;
  }

  // Build category filter: (cat:cs.AI OR cat:cs.CY OR ...)
  var catFilter = _buildCategoryFilter();

  // Combine: all:(user query) AND (category filter)
  return 'all:(' + query + ') AND (' + catFilter + ')';
}

/**
 * Build the OR-joined category filter string.
 * @returns {string} e.g. "cat:cs.AI OR cat:cs.CY OR cat:cs.LG"
 */
function _buildCategoryFilter() {
  return ALLOWED_CATEGORIES.map(function(cat) {
    return 'cat:' + cat;
  }).join(' OR ');
}

// ── XML parsing ────────────────────────────────────────────────────────

/**
 * Parse arXiv Atom XML response into standardized paper objects.
 *
 * arXiv returns Atom XML with <entry> elements. Each entry has:
 *   <id>          — arXiv URL (e.g., http://arxiv.org/abs/2603.05471v1)
 *   <title>       — Paper title
 *   <summary>     — Abstract
 *   <published>   — ISO date
 *   <author><name> — Author names
 *   <arxiv:primary_category term="cs.AI"/> — Primary category
 *
 * @param {string} xml - Raw Atom XML response
 * @returns {Array<Object>} Parsed papers
 */
function _parseArXivAtom(xml) {
  var results = [];

  // Split by <entry> tags
  var entries = xml.split('<entry>');

  // First element is the feed header, skip it
  for (var i = 1; i < entries.length; i++) {
    var entry = entries[i];
    var closingIdx = entry.indexOf('</entry>');
    if (closingIdx > 0) {
      entry = entry.substring(0, closingIdx);
    }

    var paper = _parseEntry(entry);
    if (paper) {
      results.push(paper);
    }
  }

  return results;
}

/**
 * Parse a single <entry> block into a standardized paper object.
 * @param {string} entry - XML content between <entry> and </entry>
 * @returns {Object|null} Paper object or null if parsing fails
 */
function _parseEntry(entry) {
  try {
    var url = _extractTag(entry, 'id');
    var title = _extractTag(entry, 'title');
    var summary = _extractTag(entry, 'summary');
    var published = _extractTag(entry, 'published');

    if (!url || !title) return null;

    // Clean up title and summary (arXiv often includes newlines/extra spaces)
    title = _cleanText(title);
    summary = _cleanText(_stripHtmlTags(summary || ''));

    // Truncate abstract to 500 chars to avoid sheet cell limits
    if (summary.length > 500) {
      summary = summary.substring(0, 497) + '...';
    }

    // Extract year from published date (e.g., "2026-03-07T08:00:00Z" → 2026)
    var year = '';
    if (published) {
      var yearMatch = published.match(/^(\d{4})/);
      if (yearMatch) year = parseInt(yearMatch[1], 10);
    }

    // Extract authors
    var authors = _extractAuthors(entry);

    return {
      url: url.trim(),
      title: title,
      authors: authors,
      year: year,
      abstract: summary,
      source_api: 'arxiv'
    };

  } catch (e) {
    Logger.log('[ArXiv] Error parsing entry: ' + e.message);
    return null;
  }
}

/**
 * Extract all author names from an entry.
 * @param {string} entry - XML entry content
 * @returns {string} Semicolon-separated author names (max 3)
 */
function _extractAuthors(entry) {
  var authors = [];
  var authorPattern = /<author>\s*<name>([^<]+)<\/name>/g;
  var match;

  while ((match = authorPattern.exec(entry)) !== null) {
    authors.push(match[1].trim());
    if (authors.length >= 3) break; // Cap at 3 authors
  }

  return authors.join('; ');
}

// ── Utility functions ──────────────────────────────────────────────────

/**
 * Extract text content of an XML tag. Handles simple cases.
 * For nested/repeated tags, use specific extractors.
 * @param {string} xml - XML string to search
 * @param {string} tag - Tag name (e.g., 'title', 'id')
 * @returns {string|null} Text content or null
 */
function _extractTag(xml, tag) {
  var openTag = '<' + tag;
  var closeTag = '</' + tag + '>';

  var startIdx = xml.indexOf(openTag);
  if (startIdx < 0) return null;

  // Find end of opening tag (handle attributes)
  var tagEnd = xml.indexOf('>', startIdx);
  if (tagEnd < 0) return null;

  var contentStart = tagEnd + 1;
  var endIdx = xml.indexOf(closeTag, contentStart);
  if (endIdx < 0) return null;

  return xml.substring(contentStart, endIdx);
}

/**
 * Clean text: collapse whitespace, trim.
 * @param {string} text
 * @returns {string}
 */
function _cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Strip HTML tags from text.
 * @param {string} text
 * @returns {string}
 */
function _stripHtmlTags(text) {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '');
}

// ── Test function ──────────────────────────────────────────────────────

/**
 * Manual test — run from GAS editor to verify the script works.
 * Should return CS/AI papers only, not physics or biology.
 */
function testArXivSearch() {
  var results = searchArXiv('"AI Act"', 5);
  Logger.log('Results: ' + results.length);
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    Logger.log((i+1) + '. ' + r.title);
    Logger.log('   URL: ' + r.url);
    Logger.log('   Authors: ' + r.authors);
    Logger.log('   Year: ' + r.year);
    Logger.log('   Abstract: ' + (r.abstract || '').substring(0, 100) + '...');
  }
}
