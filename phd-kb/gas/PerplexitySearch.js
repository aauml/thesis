// =============================================================================
// PerplexitySearch.gs v2 — Perplexity Sonar search pipeline
//
// API: https://api.perplexity.ai/chat/completions
// Model: sonar (lightweight, web-grounded, cheap for bulk queries)
// Key: PERPLEXITY_API_KEY in Script Properties
// Output: PerplexityQueue tab (direct SpreadsheetApp write)
// Query column: q_fullweb (in Queries tab)
//
// CHANGES from v1:
//   + next_run gating: solo procesa queries donde today >= next_run (o vacío)
//   + Queries ordenadas por tier (1=alta prioridad) antes del batch slice
//   + _advanceNextRunDate(): calcula próxima fecha según frequency
//   + _pplx_updateQuerySchedule(): actualiza next_run vía SHEET_API después de éxito
//   + Logging mejorado: muestra queries saltadas por next_run
//   + cycleCompleted ahora refleja si se procesaron TODAS las queries elegibles
//     (no solo si se completaron todos los batches del índice)
// =============================================================================

var PPLX_CONFIG = {
  QUEUE_TAB:    'PerplexityQueue',
  QUEUE_COLS:   ['id', 'url', 'title', 'synthesis', 'citations', 'source_domain',
                 'date_found', 'query_used', 'q_id', 'q_name', 'run_id',
                 'status', 'notes', 'tokens_used'],

  // BATCH_SIZE=70 mantiene cada run dentro del límite de 6 min de Apps Script.
  // Con next_run filtering activo, el número real de queries por run puede ser
  // menor — las queries no vencidas se saltarán automáticamente.
  BATCH_SIZE:   70,
  FLUSH_EVERY:  15,
  SLEEP_MS:     150,
  MODEL:        'sonar',
  MAX_TOKENS:   400
};

var PPLX_SYSTEM_PROMPT = 'You are a research assistant monitoring regulatory and academic developments. '
  + 'Provide a 2-3 sentence synthesis of the most significant and recent developments (2025-2026) on the given topic. '
  + 'Be specific: include names, institutions, dates, and concrete findings. '
  + 'Focus on regulatory updates, court decisions, academic publications, and official guidance. '
  + 'Do not use filler phrases. Lead with the most important finding.';

// =============================================================================
// SCHEDULING HELPERS
// =============================================================================

/**
 * _advanceNextRunDate(frequencyStr)
 * Calcula la próxima fecha de ejecución a partir de hoy.
 * Retorna string en formato yyyy-MM-dd.
 */

/**
 * _isQueryDue(nextRunStr)
 * True si la query debe ejecutarse hoy (next_run vacío, no parseable, o vencido).
 */

/**
 * _pplx_updateQuerySchedule(sheetApi, queryId, frequency)
 * Actualiza next_run (y last_run si la columna existe) vía SHEET_API.
 * El WebApp ignora columnas inexistentes sin error.
 */
function _pplx_updateQuerySchedule(sheetApi, queryId, frequency) {
  if (!sheetApi || !queryId) return;
  var nextRun = _advanceNextRunDate(frequency);
  var lastRun = _fmtDate(new Date());
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
    Logger.log('[Perplexity][Schedule] ERR for ' + queryId + ': ' + e.message);
  }
}

// =============================================================================
// PUBLIC ENTRY POINTS
// =============================================================================

function runPerplexitySearch() {
  _runPerplexity('incremental', false);
}

function runPerplexitySweep() {
  _runPerplexity('sweep', true);
}

function quickTestPerplexity() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY');
  if (!apiKey) {
    Logger.log('[quickTest] PERPLEXITY_API_KEY not set.');
    return;
  }
  Logger.log('[quickTest] Calling Sonar with test query...');
  var result = _callPerplexityAPI('"EU AI Act" AND "NIST AI RMF" interoperability 2025 2026', apiKey);
  if (!result) {
    Logger.log('[quickTest] API call failed.');
    return;
  }
  Logger.log('[quickTest] SUCCESS | tokens=' + result.tokens + ' | citations=' + result.citations.length);
  Logger.log(result.synthesis);
}

// =============================================================================
// CORE LOGIC
// =============================================================================

function _runPerplexity(mode, ignoresBatch) {
  var props    = PropertiesService.getScriptProperties();
  var apiKey   = props.getProperty('PERPLEXITY_API_KEY');
  var sheetApi = props.getProperty('SHEET_API');

  if (!apiKey) {
    Logger.log('[Perplexity] ERROR: PERPLEXITY_API_KEY not set in Script Properties.');
    return;
  }
  if (!sheetApi) {
    Logger.log('[Perplexity] ERROR: SHEET_API not set in Script Properties.');
    return;
  }

  Logger.log('=== PerplexitySearch v2 START mode=' + mode
    + (ignoresBatch ? ' (ALL — no batch limit)' : '') + ' ===');

  // Cargar todas las queries activas con q_fullweb
  var allQueries = _pplx_getActiveQueries(sheetApi);
  Logger.log('Active queries with q_fullweb: ' + allQueries.length);
  if (allQueries.length === 0) {
    Logger.log('[Perplexity] No active queries have q_fullweb set.');
    return;
  }

  // --- v2: Filtrar por next_run (saltar queries que no están vencidas) ---
  var eligibleQueries;
  if (ignoresBatch) {
    // sweep manual: procesar todas independientemente de next_run
    eligibleQueries = allQueries;
    Logger.log('Sweep mode: procesando TODAS (' + eligibleQueries.length + ') queries');
  } else {
    eligibleQueries = allQueries.filter(function(q) {
      return _isQueryDue(q.next_run);
    });
    var skippedCount = allQueries.length - eligibleQueries.length;
    Logger.log('Eligible (due): ' + eligibleQueries.length + ' | Skipped (not due): ' + skippedCount);
  }

  if (eligibleQueries.length === 0) {
    Logger.log('[Perplexity] No queries are due for execution. Próxima ejecución programada en el trigger.');
    return;
  }

  // --- v2: Ordenar por tier (1=alta prioridad) ---
  eligibleQueries.sort(function(a, b) {
    var tierA = parseInt(a.tier || '3', 10);
    var tierB = parseInt(b.tier || '3', 10);
    return tierA - tierB;
  });

  // Batch selection sobre la lista elegible
  var queries;
  var cycleCompleted;

  if (ignoresBatch) {
    queries = eligibleQueries;
    cycleCompleted = true;
  } else {
    var batchIndex   = parseInt(props.getProperty('pplx_batch_index') || '0', 10);
    var totalBatches = Math.ceil(eligibleQueries.length / PPLX_CONFIG.BATCH_SIZE);
    if (batchIndex >= totalBatches) batchIndex = 0;

    var start = batchIndex * PPLX_CONFIG.BATCH_SIZE;
    var end   = Math.min(start + PPLX_CONFIG.BATCH_SIZE, eligibleQueries.length);
    queries   = eligibleQueries.slice(start, end);

    Logger.log('Batch ' + (batchIndex + 1) + '/' + totalBatches
      + ' (queries ' + (start + 1) + '-' + end + ' de ' + eligibleQueries.length + ' elegibles)');

    var nextBatch = (batchIndex + 1 >= totalBatches) ? 0 : batchIndex + 1;
    props.setProperty('pplx_batch_index', String(nextBatch));
    cycleCompleted = (nextBatch === 0);
  }

  _pplx_ensureQueueTab();

  var runDate     = _fmtDate(new Date());
  var runId       = runDate + '-P' + (ignoresBatch ? 'S' : 'I');
  var pendingRows = [];
  var totalAdded  = 0;
  var totalTokens = 0;
  var hadError    = false;
  var apiCalls    = 0;

  for (var qi = 0; qi < queries.length; qi++) {
    var q    = queries[qi];
    var term = (q.q_fullweb || '').trim();
    if (!term) continue;

    Logger.log('[' + (qi + 1) + '/' + queries.length + '] ' + q.name
      + ' (tier=' + (q.tier || '?') + ')');

    var result = _callPerplexityAPI(term, apiKey);
    apiCalls++;

    if (result === null) {
      Logger.log('  ⚠ API error — stopping batch. Progress saved.');
      hadError = true;
      break;
    }

    totalTokens += result.tokens;

    var primaryUrl = result.citations.length > 0 ? result.citations[0] : '';
    var rowId = _pplx_makeId(primaryUrl || (term + runDate));

    totalAdded++;
    pendingRows.push({
      id:            rowId,
      url:           primaryUrl,
      title:         q.name || term,
      synthesis:     result.synthesis,
      citations:     JSON.stringify(result.citations),
      source_domain: primaryUrl ? _pplx_extractDomain(primaryUrl) : '',
      date_found:    runDate,
      query_used:    term,
      q_id:          q.id   || '',
      q_name:        q.name || '',
      run_id:        runId,
      status:        'pending',
      notes:         '',
      tokens_used:   result.tokens
    });

    Logger.log('  → ' + result.tokens + ' tokens | ' + result.citations.length + ' citations'
      + (primaryUrl ? ' | ' + _pplx_extractDomain(primaryUrl) : ' | (no URL)'));

    // --- v2: Actualizar next_run en la Queries tab ---
    if (!hadError) {
      _pplx_updateQuerySchedule(sheetApi, q.id, q.frequency);
    }

    if (pendingRows.length >= PPLX_CONFIG.FLUSH_EVERY) {
      _pplx_writeToQueueTab(pendingRows);
      Logger.log('  [flush] wrote ' + pendingRows.length + ' rows');
      pendingRows = [];
    }

    Utilities.sleep(PPLX_CONFIG.SLEEP_MS);
  }

  if (pendingRows.length > 0) {
    _pplx_writeToQueueTab(pendingRows);
    Logger.log('[flush] final ' + pendingRows.length + ' rows written');
  }

  Logger.log('=== PerplexitySearch v2 DONE ===');
  Logger.log('  API calls:    ' + apiCalls);
  Logger.log('  Rows added:   ' + totalAdded);
  Logger.log('  Total tokens: ' + totalTokens);
  Logger.log('  Est. cost:    ~$' + (totalTokens / 1000000 * 1.5).toFixed(4));

  if (hadError) {
    Logger.log('  ⚠ Run ended early due to API error.');
  }

  if (!hadError && cycleCompleted) {
    _pplx_updateLastScan(sheetApi);
    Logger.log('  ✓ Cycle complete — last_perplexity_scan updated.');
  } else if (!cycleCompleted) {
    Logger.log('  ↷ Cycle not complete — last_perplexity_scan NOT updated.');
  }
}

// =============================================================================
// PERPLEXITY API CALL
// =============================================================================

function _callPerplexityAPI(term, apiKey) {
  if (!term) return null;

  var payload = {
    model:      PPLX_CONFIG.MODEL,
    messages:   [
      { role: 'system', content: PPLX_SYSTEM_PROMPT },
      { role: 'user',   content: term }
    ],
    max_tokens: PPLX_CONFIG.MAX_TOKENS
  };

  try {
    var resp = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', {
      method:             'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type':  'application/json'
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = resp.getResponseCode();

    if (code === 401) {
      Logger.log('[Perplexity] 401 UNAUTHORIZED — verificar PERPLEXITY_API_KEY.');
      return null;
    }
    if (code === 429) {
      Logger.log('[Perplexity] 429 RATE LIMITED.');
      return null;
    }
    if (code !== 200) {
      var errText = '';
      try { errText = JSON.parse(resp.getContentText()).error || resp.getContentText().substring(0, 200); } catch(x) {}
      Logger.log('[Perplexity] HTTP ' + code + ' for "' + term + '": ' + errText);
      return null;
    }

    var data      = JSON.parse(resp.getContentText());
    var choice    = data.choices && data.choices[0] && data.choices[0].message;
    var synthesis = choice ? (choice.content || '') : '';
    var citations = data.citations || [];
    var usage     = data.usage || {};

    return {
      synthesis: synthesis.trim(),
      citations: citations.filter(function(u) { return typeof u === 'string' && u.startsWith('http'); }),
      tokens:    (usage.total_tokens || 0)
    };

  } catch(e) {
    Logger.log('[Perplexity] FETCH ERR for "' + term + '": ' + e.message);
    return null;
  }
}

// =============================================================================
// TRIGGER MANAGEMENT
// =============================================================================

function setupPerplexityTrigger() {
  var existing = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'runPerplexitySearch';
  });
  if (existing.length > 0) {
    Logger.log('[Perplexity] Trigger already exists.');
    return;
  }
  ScriptApp.newTrigger('runPerplexitySearch')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(3)
    .create();
  Logger.log('[Perplexity] Weekly trigger created (Sunday 3am).');
}

function removePerplexityTrigger() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'runPerplexitySearch') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log('[Perplexity] Removed ' + removed + ' trigger(s).');
}

function resetPerplexityBatch() {
  PropertiesService.getScriptProperties().setProperty('pplx_batch_index', '0');
  Logger.log('[Perplexity] Batch index reset to 0.');
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function _pplx_getActiveQueries(sheetApi) {
  try {
    var resp = UrlFetchApp.fetch(sheetApi + '?action=getQueries', { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) return [];
    var all = JSON.parse(resp.getContentText()).queries || [];
    return all.filter(function(q) {
      return q.active === 'yes' && (q.q_fullweb || '').trim() !== '';
    });
  } catch(e) {
    Logger.log('[Perplexity] getQueries err: ' + e.message);
    return [];
  }
}

function _pplx_updateLastScan(sheetApi) {
  try {
    UrlFetchApp.fetch(sheetApi, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        action: 'updateMeta',
        meta:   { last_perplexity_scan: new Date().toISOString() }
      }),
      muteHttpExceptions: true
    });
  } catch(e) {
    Logger.log('[Perplexity] updateMeta err: ' + e.message);
  }
}

function _pplx_ensureQueueTab() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PPLX_CONFIG.QUEUE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(PPLX_CONFIG.QUEUE_TAB);
    Logger.log('[Perplexity] Created tab: ' + PPLX_CONFIG.QUEUE_TAB);
  }
  var header = sheet.getRange(1, 1, 1, PPLX_CONFIG.QUEUE_COLS.length).getValues()[0];
  if (header[0] !== 'id') {
    sheet.getRange(1, 1, 1, PPLX_CONFIG.QUEUE_COLS.length)
      .setValues([PPLX_CONFIG.QUEUE_COLS])
      .setFontWeight('bold')
      .setBackground('#cfe2f3');
    sheet.setFrozenRows(1);
    var synthColIdx = PPLX_CONFIG.QUEUE_COLS.indexOf('synthesis') + 1;
    if (synthColIdx > 0) sheet.setColumnWidth(synthColIdx, 400);
    var citColIdx   = PPLX_CONFIG.QUEUE_COLS.indexOf('citations') + 1;
    if (citColIdx > 0) sheet.setColumnWidth(citColIdx, 300);
  }
  return sheet;
}

function _pplx_writeToQueueTab(rows) {
  var sheet  = _pplx_ensureQueueTab();
  var values = rows.map(function(r) {
    return PPLX_CONFIG.QUEUE_COLS.map(function(col) {
      return r[col] !== undefined ? r[col] : '';
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, PPLX_CONFIG.QUEUE_COLS.length)
    .setValues(values);
}

function _pplx_extractDomain(url) {
  try {
    var m = url.match(/^https?:\/\/([^\/]+)/);
    return m ? m[1].replace(/^www\./, '') : '';
  } catch(e) { return ''; }
}

function _pplx_makeId(str) {
  return Utilities.base64Encode(str).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}
