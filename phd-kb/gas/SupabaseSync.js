/**
 * SupabaseSync.gs — One-way sync: Supabase → Sheet NewsLog
 * Version: 1
 * Date: 2026-03-23
 *
 * Supabase is the source of truth for evaluated items.
 * NewsLog becomes a full backup mirror, updated hourly.
 *
 * Setup (run once):
 *   1. Run setupSupabaseCredentials() after setting SUPABASE_URL and SUPABASE_KEY
 *      in Script Properties (File > Project properties > Script properties)
 *   2. Run setupSyncTrigger() to create the hourly trigger
 *
 * Manual run: syncFromSupabase()
 */

// ── Field mapping: Supabase → Sheet ──────────────────────────────────────────
// Sheet columns (NewsLog headers) ↔ Supabase field names
var FIELD_MAP = {
  'id':                  'sheet_id',
  'url':                 'url',
  'title':               'title',
  'source':              'source',
  'date_published':      'date_published',
  'date_found':          'date_found',
  'content_type':        'content_type',
  'importance':          'importance',
  'capa':                'capa',
  'capa_detail':         'capa_detail',
  'evaluativa_criteria': 'evaluativa_criteria',
  'action_tag':          'action_tag',
  'thesis_relevance':    'thesis_relevance',
  'scholar':             'scholar',
  'search_scope':        'search_scope',
  'language':            'language',
  'run_id':              'run_id',
  'tier':                'tier',
  'folder':              'folder',
  'notes':               'notes',
  'starred':             'starred'
};

// ── Supabase REST helpers ────────────────────────────────────────────────────

function getSupabaseConfig_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_KEY');
  if (!url || !key) {
    throw new Error('Supabase credentials not set. Add SUPABASE_URL and SUPABASE_KEY to Script Properties, then run setupSupabaseCredentials().');
  }
  return { url: url, key: key };
}

function supabaseFetch_(path, options) {
  var config = getSupabaseConfig_();
  var url = config.url + '/rest/v1/' + path;
  var opts = options || {};
  opts.headers = opts.headers || {};
  opts.headers['apikey'] = config.key;
  opts.headers['Authorization'] = 'Bearer ' + config.key;
  opts.muteHttpExceptions = true;
  var resp = UrlFetchApp.fetch(url, opts);
  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Supabase error ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
  return resp;
}

/**
 * Fetch all evaluated_items from Supabase (paginated, 1000 per request).
 * Returns array of objects.
 */
function fetchAllFromSupabase_() {
  var allItems = [];
  var offset = 0;
  var pageSize = 1000;
  var hasMore = true;

  while (hasMore) {
    var resp = supabaseFetch_(
      'evaluated_items?select=sheet_id,url,title,source,date_published,date_found,content_type,' +
      'importance,capa,capa_detail,evaluativa_criteria,action_tag,thesis_relevance,scholar,' +
      'search_scope,language,run_id,tier,folder,notes,starred,chapters,source_pipeline,updated_at' +
      '&order=pk.asc&offset=' + offset + '&limit=' + pageSize,
      { headers: { 'Prefer': 'count=exact' } }
    );

    var items = JSON.parse(resp.getContentText());
    allItems = allItems.concat(items);

    // Check content-range header for total
    var range = resp.getHeaders()['content-range'] || '';
    var match = range.match(/\/(\d+)/);
    var total = match ? parseInt(match[1]) : 0;

    offset += pageSize;
    hasMore = items.length === pageSize && offset < total;
  }

  Logger.log('Fetched ' + allItems.length + ' items from Supabase');
  return allItems;
}

// ── Main sync function ───────────────────────────────────────────────────────

/**
 * One-way sync: Supabase → Sheet NewsLog.
 * - Items in Supabase but not in Sheet → append
 * - Items in both → update Sheet row if Supabase has changes
 * - Items only in Sheet → leave untouched (legacy data)
 */
function syncFromSupabase() {
  var startTime = new Date();
  Logger.log('=== Supabase → Sheet sync started at ' + startTime.toISOString() + ' ===');

  // 1. Fetch all from Supabase
  var sbItems = fetchAllFromSupabase_();
  if (!sbItems.length) {
    Logger.log('No items in Supabase. Aborting.');
    return;
  }

  // 2. Get NewsLog sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('NewsLog');
  if (!sheet) {
    Logger.log('No NewsLog tab found. Aborting.');
    return;
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var lastRow = sheet.getLastRow();

  // 3. Build URL index from Sheet (url → row number)
  var urlCol = headers.indexOf('url');
  if (urlCol === -1) {
    Logger.log('No "url" column in NewsLog. Aborting.');
    return;
  }

  var sheetUrls = {};
  if (lastRow >= 2) {
    var urlData = sheet.getRange(2, urlCol + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < urlData.length; i++) {
      var u = String(urlData[i][0]).trim();
      if (u) sheetUrls[u] = i + 2; // row number (1-indexed, skip header)
    }
  }

  // 4. Separate: new items vs existing
  var toAppend = [];
  var toUpdate = [];

  for (var j = 0; j < sbItems.length; j++) {
    var item = sbItems[j];
    var itemUrl = String(item.url || '').trim();
    if (!itemUrl) continue;

    if (sheetUrls[itemUrl]) {
      toUpdate.push({ row: sheetUrls[itemUrl], item: item });
    } else {
      toAppend.push(item);
    }
  }

  Logger.log('To append: ' + toAppend.length + ', To update: ' + toUpdate.length);

  // 5. Append new items
  if (toAppend.length > 0) {
    var newRows = [];
    for (var a = 0; a < toAppend.length; a++) {
      newRows.push(buildSheetRow_(headers, toAppend[a]));
    }
    sheet.getRange(lastRow + 1, 1, newRows.length, headers.length).setValues(newRows);
    Logger.log('Appended ' + newRows.length + ' new rows');
  }

  // 6. Update existing items (batch by collecting ranges)
  var updated = 0;
  for (var u = 0; u < toUpdate.length; u++) {
    var entry = toUpdate[u];
    var row = buildSheetRow_(headers, entry.item);
    sheet.getRange(entry.row, 1, 1, headers.length).setValues([row]);
    updated++;
  }
  if (updated > 0) Logger.log('Updated ' + updated + ' existing rows');

  // 7. Record sync time
  var props = PropertiesService.getScriptProperties();
  props.setProperty('LAST_SUPABASE_SYNC', new Date().toISOString());

  var elapsed = ((new Date() - startTime) / 1000).toFixed(1);
  Logger.log('=== Sync complete in ' + elapsed + 's. Appended: ' + toAppend.length + ', Updated: ' + updated + ' ===');
}

/**
 * Build a Sheet row array from Supabase item, matching header order.
 */
function buildSheetRow_(headers, item) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var sbField = FIELD_MAP[h];
    if (sbField && item[sbField] !== undefined && item[sbField] !== null) {
      row.push(item[sbField]);
    } else if (h === 'notes') {
      // Append sync marker + source_pipeline + chapters info
      var parts = [];
      if (item.notes) parts.push(item.notes);
      if (item.source_pipeline) parts.push('pipeline:' + item.source_pipeline);
      if (item.chapters && item.chapters.length) parts.push('ch:' + item.chapters.join(','));
      row.push(parts.join(' | '));
    } else {
      row.push('');
    }
  }
  return row;
}

// ── Incremental sync (for hourly trigger — faster) ───────────────────────────

/**
 * Sync only items updated since last sync. Falls back to full sync if no
 * last_sync timestamp exists.
 */
function syncIncremental() {
  var props = PropertiesService.getScriptProperties();
  var lastSync = props.getProperty('LAST_SUPABASE_SYNC');

  if (!lastSync) {
    Logger.log('No previous sync found. Running full sync.');
    syncFromSupabase();
    return;
  }

  var startTime = new Date();
  Logger.log('=== Incremental sync (since ' + lastSync + ') ===');

  // Fetch only items updated since last sync
  var config = getSupabaseConfig_();
  var resp = supabaseFetch_(
    'evaluated_items?select=sheet_id,url,title,source,date_published,date_found,content_type,' +
    'importance,capa,capa_detail,evaluativa_criteria,action_tag,thesis_relevance,scholar,' +
    'search_scope,language,run_id,tier,folder,notes,starred,chapters,source_pipeline,updated_at' +
    '&updated_at=gte.' + lastSync +
    '&order=pk.asc&limit=1000'
  );

  var items = JSON.parse(resp.getContentText());
  Logger.log('Items updated since last sync: ' + items.length);

  if (items.length === 0) {
    props.setProperty('LAST_SUPABASE_SYNC', new Date().toISOString());
    Logger.log('Nothing to sync.');
    return;
  }

  // Get Sheet URL index
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('NewsLog');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var lastRow = sheet.getLastRow();
  var urlCol = headers.indexOf('url');

  var sheetUrls = {};
  if (lastRow >= 2) {
    var urlData = sheet.getRange(2, urlCol + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < urlData.length; i++) {
      var u = String(urlData[i][0]).trim();
      if (u) sheetUrls[u] = i + 2;
    }
  }

  var appended = 0;
  var updated = 0;

  for (var j = 0; j < items.length; j++) {
    var item = items[j];
    var itemUrl = String(item.url || '').trim();
    if (!itemUrl) continue;

    var row = buildSheetRow_(headers, item);

    if (sheetUrls[itemUrl]) {
      sheet.getRange(sheetUrls[itemUrl], 1, 1, headers.length).setValues([row]);
      updated++;
    } else {
      sheet.appendRow(row);
      appended++;
    }
  }

  props.setProperty('LAST_SUPABASE_SYNC', new Date().toISOString());
  var elapsed = ((new Date() - startTime) / 1000).toFixed(1);
  Logger.log('=== Incremental sync done in ' + elapsed + 's. Appended: ' + appended + ', Updated: ' + updated + ' ===');
}

// ── Sync status (for dashboard/API) ──────────────────────────────────────────

function getSyncStatus() {
  var props = PropertiesService.getScriptProperties();
  return {
    last_sync: props.getProperty('LAST_SUPABASE_SYNC') || 'never',
    supabase_url: props.getProperty('SUPABASE_URL') ? 'configured' : 'missing'
  };
}
