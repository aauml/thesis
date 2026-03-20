// =============================================================================
// GoogleNewsRSS.gs v1 — Google News RSS provider (replaces NewsSearch.gs)
//
// Source: https://news.google.com/rss/search?q=QUERY&hl=en&gl=US&ceid=US:en
// No API key required. Free, unlimited, aggregates all sources indexed by Google News.
// Output: NewsResults tab (same schema as NewsSearch.gs — drop-in replacement)
// Query column: q_news (in Queries tab)
//
// ENTRY POINTS (same names as NewsSearch.gs for trigger compatibility):
//   runNewsAPI()         — llamado por el trigger diario (priority batch)
//   runNewsSweep()       — manual: barre todas las queries ignorando next_run
//   runNewsSweepAll()    — manual: barre ALL queries sin límite de batch
//   quickTestNewsAPI()   — verifica conectividad RSS
//
// TRIGGER MANAGEMENT (same as NewsSearch.gs):
//   setupNewsTrigger()   — crea trigger DIARIO a las 11pm
//   removeNewsTrigger()  — elimina el trigger
//   resetBatchIndex()    — no-op (compatibilidad)
//
// DIFFERENCES FROM NewsSearch.gs v6:
//   - No API key or account required
//   - Uses Google News RSS instead of NewsAPI.org
//   - Parses XML (Atom/RSS) instead of JSON
//   - No hard request limit — Google News throttles heavy use but 90 queries/day is fine
//   - Results reflect Google News rankings (same sources as google.com/news)
//   - Date range filtering via 'after:' and 'before:' operators in the query string
// =============================================================================

var GNR_CONFIG = {
  RESULTS_TAB:     'NewsResults',
  RESULTS_PER_Q:   15,           // Google News RSS returns up to 100; we cap at 15
  RESULTS_COLUMNS: ['id','url','title','snippet','source_domain','news_rank',
                    'date_found','query_used','q_id','q_name','run_id','status','notes'],
  BATCH_SIZE:      90,
  FLUSH_EVERY:     10,
  SLEEP_MS:        1200          // ms between requests — be polite to Google
};

var GNR_RELEVANCE_FILTER_ENABLED = true;

var GNR_RELEVANCE_TERMS = [
  // Core frameworks
  'AI Act', 'NIST', 'AI RMF', 'risk management framework',
  // AI regulation / governance
  'artificial intelligence', 'AI regulation', 'AI governance', 'AI policy',
  'AI standard', 'AI compliance', 'AI audit', 'AI safety',
  'AI oversight', 'AI accountability', 'AI transparency',
  'algorithmic', 'machine learning',
  // Specific thesis topics
  'high-risk AI', 'conformity assessment', 'fundamental rights',
  'Brussels Effect', 'Digital Omnibus',
  'explainability', 'contestability', 'bias', 'fairness',
  // Forensic / law enforcement
  'forensic', 'STRmix', 'probabilistic genotyping', 'DNA evidence',
  'biometric', 'facial recognition', 'law enforcement AI',
  // Institutional
  'CAISI', 'AI Office', 'OMB', 'federal agency',
  'European Commission', 'EDPB',
  // Scholars (last names only)
  'Kaminski', 'Veale', 'Bradford', 'Wachter', 'Hildebrandt',
  'Calo', 'Hacker', 'Pasquale', 'Narayanan', 'Finck',
  'Rozenshtein', 'Kratsios'
];

function _gnr_isRelevant(title, snippet) {
  if (!GNR_RELEVANCE_FILTER_ENABLED) return true;
  var text = ((title || '') + ' ' + (snippet || '')).toLowerCase();
  for (var i = 0; i < GNR_RELEVANCE_TERMS.length; i++) {
    if (text.indexOf(GNR_RELEVANCE_TERMS[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

// =============================================================================
// SCHEDULING HELPERS (identical to NewsSearch.gs v6)
// =============================================================================

function _gnr_advanceNextRunDate(frequencyStr) {
  var base = new Date();
  var daysToAdd = 30;
  var freq = (frequencyStr || '').toLowerCase().trim();
  if      (freq === 'weekly')    daysToAdd = 7;
  else if (freq === 'biweekly')  daysToAdd = 14;
  else if (freq === 'monthly')   daysToAdd = 30;
  else if (freq === 'quarterly') daysToAdd = 90;
  else if (freq === 'manual')    return _gnr_fmtDate(base);
  base.setDate(base.getDate() + daysToAdd);
  return _gnr_fmtDate(base);
}

function _gnr_isQueryDue(nextRunStr) {
  if (!nextRunStr || String(nextRunStr).trim() === '') return true;
  var nextRun = new Date(nextRunStr);
  if (isNaN(nextRun.getTime())) return true;
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  nextRun.setHours(0, 0, 0, 0);
  return today >= nextRun;
}

function _gnr_updateQuerySchedule(sheetApi, queryId, frequency) {
  if (!sheetApi || !queryId) return;
  var nextRun = _gnr_advanceNextRunDate(frequency);
  var lastRun = _gnr_fmtDate(new Date());
  try {
    UrlFetchApp.fetch(sheetApi, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        action: 'updateQuery',
        id: queryId,
        fields: { next_run: nextRun, last_run: lastRun }
      }),
      muteHttpExceptions: true
    });
  } catch(e) {
    Logger.log('[GNR][Schedule] ERR for ' + queryId + ': ' + e.message);
  }
}

// =============================================================================
// PUBLIC ENTRY POINTS
// =============================================================================

function runNewsAPI() {
  _runGNR('incremental', false);
}

function runNewsSweep() {
  _runGNR('sweep', false);
}

function runNewsSweepAll() {
  _runGNR('sweep', true);
}

// =============================================================================
// CORE LOGIC
// =============================================================================

function _runGNR(mode, ignoresBatch) {
  var props    = PropertiesService.getScriptProperties();
  var sheetApi = props.getProperty('SHEET_API');

  if (!sheetApi) {
    Logger.log('[GNR] ERROR: SHEET_API not set in Script Properties.');
    return;
  }

  Logger.log('=== GoogleNewsRSS v1 START mode=' + mode + (ignoresBatch ? ' (ALL)' : '') + ' ===');

  // ── Date range ──
  var toDate   = new Date();
  var fromDate;
  if (mode === 'sweep') {
    fromDate = new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);
    Logger.log('Sweep: ' + _gnr_fmtDate(fromDate) + ' → ' + _gnr_fmtDate(toDate));
  } else {
    var lastScan = _gnr_getLastScan(sheetApi);
    if (lastScan) {
      fromDate = new Date(lastScan);
      fromDate.setDate(fromDate.getDate() + 1);
    } else {
      fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    Logger.log('Incremental: ' + _gnr_fmtDate(fromDate) + ' → ' + _gnr_fmtDate(toDate));
  }

  // ── Dedup ──
  var knownUrls = _gnr_getKnownUrls(sheetApi);
  Logger.log('Known URLs (dedup): ' + knownUrls.size);

  // ── Load active queries with q_news ──
  var allQueries = _gnr_getActiveQueries(sheetApi);
  Logger.log('Total queries with q_news: ' + allQueries.length);
  if (allQueries.length === 0) {
    Logger.log('[GNR] No active queries have q_news set.');
    return;
  }

  // ── Filter by next_run ──
  var eligibleQueries;
  if (ignoresBatch) {
    eligibleQueries = allQueries;
    Logger.log('ALL mode: procesando ' + eligibleQueries.length + ' queries');
  } else if (mode === 'sweep') {
    eligibleQueries = allQueries;
    Logger.log('Sweep mode: ' + eligibleQueries.length + ' queries elegibles');
  } else {
    eligibleQueries = allQueries.filter(function(q) { return _gnr_isQueryDue(q.next_run); });
    var skippedCount = allQueries.length - eligibleQueries.length;
    Logger.log('Eligible (due): ' + eligibleQueries.length + ' | Skipped (not due): ' + skippedCount);
  }

  if (eligibleQueries.length === 0) {
    Logger.log('[GNR] No queries are due today.');
        if (mode === 'incremental') _gnr_updateLastScan(sheetApi); // always update meta even with 0 queries
    return;
  }

  // ── Sort by priority: tier ASC, then oldest next_run first ──
  eligibleQueries.sort(function(a, b) {
    var tierA = parseInt(a.tier || '3', 10);
    var tierB = parseInt(b.tier || '3', 10);
    if (tierA !== tierB) return tierA - tierB;
    var dateA = (a.next_run && String(a.next_run).trim()) ? new Date(a.next_run) : new Date(0);
    var dateB = (b.next_run && String(b.next_run).trim()) ? new Date(b.next_run) : new Date(0);
    if (isNaN(dateA.getTime())) dateA = new Date(0);
    if (isNaN(dateB.getTime())) dateB = new Date(0);
    return dateA - dateB;
  });

  var queries = ignoresBatch ? eligibleQueries : eligibleQueries.slice(0, GNR_CONFIG.BATCH_SIZE);
  Logger.log('Procesando ' + queries.length + ' queries (batch cap=' + GNR_CONFIG.BATCH_SIZE + ')');

  // ── Process queries ──
  var runDate       = _gnr_fmtDate(toDate);
  var runId         = runDate + '-N' + (mode === 'sweep' ? 'S' : 'I');
  var pendingRows   = [];
  var totalAdded    = 0;
  var totalFiltered = 0;
  var apiCalls      = 0;
  var successCount  = 0;

  for (var qi = 0; qi < queries.length; qi++) {
    var q    = queries[qi];
    var term = (q.q_news || '').trim();
    if (!term) continue;

    Logger.log('[' + (qi + 1) + '/' + queries.length + '] ' + q.name
      + ' (tier=' + (q.tier || '?') + ') → "' + term + '"');

    try {
      var results = _gnr_searchGoogleNews(term, fromDate, toDate);
      apiCalls++;

      var added    = 0;
      var filtered = 0;

      for (var ri = 0; ri < results.length; ri++) {
        var r = results[ri];
        if (!r.url || knownUrls.has(_gnr_normalizeUrl(r.url))) continue;
        if (!_gnr_isRelevant(r.title, r.snippet)) { filtered++; continue; }

        knownUrls.add(_gnr_normalizeUrl(r.url));
        added++;
        pendingRows.push({
          id:            _gnr_makeId(r.url),
          url:           r.url,
          title:         r.title    || '',
          snippet:       r.snippet  || '',
          source_domain: r.domain   || '',
          news_rank:     r.rank     || '',
          date_found:    r.published || runDate,
          query_used:    term,
          q_id:          q.id       || '',
          q_name:        q.name     || '',
          run_id:        runId,
          status:        'pending',
          notes:         ''
        });
      }

      totalAdded    += added;
      totalFiltered += filtered;
      Logger.log('  → ' + results.length + ' fetched, +' + added + ' new, ' + filtered + ' filtered');

      if (mode === 'incremental') {
        _gnr_updateQuerySchedule(sheetApi, q.id, q.frequency);
        successCount++;
      }

      if (pendingRows.length >= GNR_CONFIG.FLUSH_EVERY * 2) {
        _gnr_writeToResultsTab(pendingRows);
        Logger.log('  [flush] wrote ' + pendingRows.length + ' rows');
        pendingRows = [];
      }

      Utilities.sleep(GNR_CONFIG.SLEEP_MS);

    } catch(e) {
      Logger.log('  [GNR] ERR on "' + term + '": ' + e.message);
    }
  }

  // ── Final flush ──
  if (pendingRows.length > 0) {
    _gnr_writeToResultsTab(pendingRows);
    Logger.log('[flush] wrote final ' + pendingRows.length + ' rows');
  }

  // ── Summary ──
  Logger.log('=== GoogleNewsRSS v1 DONE ===');
  Logger.log('  RSS calls:       ' + apiCalls);
  Logger.log('  New rows:        ' + totalAdded);
  Logger.log('  Filtered noise:  ' + totalFiltered);
  Logger.log('  next_run updated: ' + successCount + ' queries');

  if (mode === 'incremental') {
    _gnr_updateLastScan(sheetApi);
    Logger.log('  ✓ last_news_scan actualizado.');
  }
}

// =============================================================================
// GOOGLE NEWS RSS FETCH + XML PARSE
// =============================================================================

/**
 * _gnr_searchGoogleNews(term, fromDate, toDate)
 * Fetches Google News RSS for the given search term.
 * Date filtering: uses 'after:YYYY-MM-DD before:YYYY-MM-DD' operators appended to the query.
 * Returns array of {url, title, snippet, domain, rank, published}.
 */
function _gnr_searchGoogleNews(term, fromDate, toDate) {
  // Append date operators to narrow results
  var query = term;
  if (fromDate) query += ' after:' + _gnr_fmtDate(fromDate);
  if (toDate)   query += ' before:' + _gnr_fmtDate(toDate);

  var url = 'https://news.google.com/rss/search'
    + '?q='    + encodeURIComponent(query)
    + '&hl=en'
    + '&gl=US'
    + '&ceid=US:en';

  try {
    var resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GAS-ThesisKB/1.0)' }
    });

    var code = resp.getResponseCode();
    if (code !== 200) {
      Logger.log('[GNR] HTTP ' + code + ' for "' + term + '"');
      return [];
    }

    var xml  = resp.getContentText();
    var doc  = XmlService.parse(xml);
    var root = doc.getRootElement();

    // RSS structure: <rss><channel><item>...</item></channel></rss>
    var channel = root.getChild('channel');
    if (!channel) return [];

    var items   = channel.getChildren('item');
    var results = [];

    for (var i = 0; i < Math.min(items.length, GNR_CONFIG.RESULTS_PER_Q); i++) {
      var item = items[i];

      var title     = _gnr_getChildText(item, 'title');
      var link      = _gnr_getChildText(item, 'link');
      var pubDate   = _gnr_getChildText(item, 'pubDate');
      var desc      = _gnr_getChildText(item, 'description');

      // Google News RSS wraps the real URL inside a redirect; extract source name from title
      // Title format: "Article title - Source Name"
      var sourceName = '';
      var titleClean = title;
      var dashIdx = title.lastIndexOf(' - ');
      if (dashIdx !== -1) {
        sourceName = title.substring(dashIdx + 3);
        titleClean = title.substring(0, dashIdx);
      }

      // Strip HTML from description (Google News embeds a <a> tag sometimes)
      var snippet = desc ? desc.replace(/<[^>]+>/g, '').trim() : '';

      // Parse published date to YYYY-MM-DD
      var published = '';
      if (pubDate) {
        try {
          published = new Date(pubDate).toISOString().split('T')[0];
        } catch(e) { published = ''; }
      }

      if (!link) continue;

      results.push({
        url:       link,
        title:     titleClean.trim(),
        snippet:   snippet,
        domain:    sourceName || _gnr_extractDomain(link),
        rank:      i + 1,
        published: published
      });
    }

    return results;

  } catch(e) {
    Logger.log('[GNR] FETCH/PARSE ERR for "' + term + '": ' + e.message);
    return [];
  }
}

function _gnr_getChildText(element, childName) {
  try {
    var child = element.getChild(childName);
    return child ? child.getText() : '';
  } catch(e) { return ''; }
}

function quickTestNewsAPI() {
  var results = _gnr_searchGoogleNews('"AI Act" AND "NIST"', null, null);
  Logger.log('[quickTest] Got ' + results.length + ' results');
  results.slice(0, 5).forEach(function(r) {
    var relevant = _gnr_isRelevant(r.title, r.snippet);
    Logger.log('  [' + r.rank + '] ' + (relevant ? '✓' : '✗') + ' ' + r.published + ' | ' + r.title + ' — ' + r.domain);
  });
}

// =============================================================================
// TRIGGER MANAGEMENT
// =============================================================================

function setupNewsTrigger() {
  var existing = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'runNewsAPI';
  });
  if (existing.length > 0) {
    Logger.log('[GNR] Trigger already exists.');
    return;
  }
  ScriptApp.newTrigger('runNewsAPI')
    .timeBased().everyDays(1).atHour(23).create();
  Logger.log('[GNR] Daily trigger created (11pm).');
}

function removeNewsTrigger() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'runNewsAPI') { ScriptApp.deleteTrigger(t); removed++; }
  });
  Logger.log('[GNR] Removed ' + removed + ' trigger(s).');
}

function resetBatchIndex() {
  Logger.log('[GNR] resetBatchIndex() es no-op.');
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function _gnr_getKnownUrls(sheetApi) {
  var known = new Set();
  try {
    var resp = UrlFetchApp.fetch(sheetApi + '?action=getUrls', { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      var data = JSON.parse(resp.getContentText());
      (data.urls || []).forEach(function(u) { if (u) known.add(String(u)); });
    }
  } catch(e) { Logger.log('[GNR] getUrls err: ' + e.message); }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['AcademicQueue', GNR_CONFIG.RESULTS_TAB].forEach(function(tabName) {
    try {
      var sheet = ss.getSheetByName(tabName);
      if (!sheet || sheet.getLastRow() < 2) return;
      var vals = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
      vals.forEach(function(row) { if (row[0]) known.add(_gnr_normalizeUrl(String(row[0]))); });
    } catch(e) { Logger.log('[GNR] dedup err (' + tabName + '): ' + e.message); }
  });

  return known;
}

function _gnr_getActiveQueries(sheetApi) {
  try {
    var resp = UrlFetchApp.fetch(sheetApi + '?action=getQueries', { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) return [];
    var all = JSON.parse(resp.getContentText()).queries || [];
    return all.filter(function(q) {
      return q.active === 'yes' && (q.q_news || '').trim() !== '';
    });
  } catch(e) { Logger.log('[GNR] getQueries err: ' + e.message); return []; }
}

function _gnr_getLastScan(sheetApi) {
  try {
    var resp = UrlFetchApp.fetch(sheetApi + '?action=getMeta', { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) return null;
    return (JSON.parse(resp.getContentText()) || {}).last_news_scan || null;
  } catch(e) { return null; }
}

function _gnr_updateLastScan(sheetApi) {
  try {
    UrlFetchApp.fetch(sheetApi, {
      method:             'post',
      headers:            { 'Content-Type': 'application/json' },
      payload:            JSON.stringify({ action: 'updateMeta', meta: { last_news_scan: new Date().toISOString() } }),
      muteHttpExceptions: true
    });
  } catch(e) { Logger.log('[GNR] updateMeta err: ' + e.message); }
}

function _gnr_ensureResultsTab() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(GNR_CONFIG.RESULTS_TAB);
  if (!sheet) sheet = ss.insertSheet(GNR_CONFIG.RESULTS_TAB);
  var header = sheet.getRange(1, 1, 1, GNR_CONFIG.RESULTS_COLUMNS.length).getValues()[0];
  if (header[0] !== 'id') {
    sheet.getRange(1, 1, 1, GNR_CONFIG.RESULTS_COLUMNS.length)
      .setValues([GNR_CONFIG.RESULTS_COLUMNS]).setFontWeight('bold').setBackground('#d9ead3');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _gnr_writeToResultsTab(rows) {
  var sheet  = _gnr_ensureResultsTab();
  var values = rows.map(function(r) {
    return GNR_CONFIG.RESULTS_COLUMNS.map(function(col) { return r[col] !== undefined ? r[col] : ''; });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, GNR_CONFIG.RESULTS_COLUMNS.length).setValues(values);
}

function _gnr_normalizeUrl(url) {
  return url.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

function _gnr_extractDomain(url) {
  try {
    var m = url.match(/^https?:\/\/([^\/]+)/);
    return m ? m[1].replace(/^www\./, '') : '';
  } catch(e) { return ''; }
}

function _gnr_makeId(url) {
  return Utilities.base64Encode(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

function _gnr_fmtDate(d) {
  return d.toISOString().split('T')[0];
}
