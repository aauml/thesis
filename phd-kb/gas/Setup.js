// Setup.gs — one-time maintenance functions

function fixQueryDuplicates() {
  // Deactivate duplicate scholar entries Q106-Q111 (added twice in March 2026)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Queries');
  if (!sheet) { Logger.log('No Queries tab'); return; }
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('id');
  var activeCol = headers.indexOf('active');
  var notesCol = headers.indexOf('notes');
  var dups = ['Q106','Q107','Q108','Q109','Q110','Q111'];
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    if (dups.indexOf(String(data[i][idCol])) !== -1) {
      sheet.getRange(i+1, activeCol+1).setValue('no');
      sheet.getRange(i+1, notesCol+1).setValue('DUPLICATE — deactivated 2026-03-07');
      count++;
      Logger.log('Deactivated row ' + (i+1) + ' id=' + data[i][idCol]);
    }
  }
  Logger.log('Done. Deactivated ' + count + ' rows.');
}

function clearAcademicQueue() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AcademicQueue');
  if (!sheet) { Logger.log('No AcademicQueue tab'); return; }
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) { Logger.log('Queue already empty'); return; }
  sheet.deleteRows(2, lastRow - 1);
  Logger.log('Cleared ' + (lastRow - 1) + ' rows from AcademicQueue');
}

function scheduleDeepSweep() {
  // Clean triggers first
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'runBatch' || fn === 'startDeepSweep') ScriptApp.deleteTrigger(t);
  });
  // Schedule startDeepSweep in 60 seconds
  ScriptApp.newTrigger('startDeepSweep')
    .timeBased().at(new Date(Date.now() + 60000)).create();
  Logger.log('Deep sweep scheduled in 60s');
}

// ── Supabase Sync setup ──────────────────────────────────────────────────────

/**
 * Run ONCE after adding SUPABASE_URL and SUPABASE_KEY to Script Properties.
 * (File > Project properties > Script properties in the old editor,
 *  or Project Settings > Script Properties in the new editor)
 *
 * Creates an hourly trigger for incremental sync.
 */
function setupSupabaseSync() {
  // Verify credentials exist
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_KEY');
  if (!url || !key) {
    Logger.log('ERROR: Set SUPABASE_URL and SUPABASE_KEY in Script Properties first.');
    return;
  }
  Logger.log('Supabase credentials: OK');

  // Remove existing sync triggers
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncIncremental') {
      ScriptApp.deleteTrigger(t);
      Logger.log('Removed existing syncIncremental trigger');
    }
  });

  // Create hourly trigger
  ScriptApp.newTrigger('syncIncremental')
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log('Created hourly syncIncremental trigger');

  // Run initial full sync
  Logger.log('Running initial full sync...');
  syncFromSupabase();
  Logger.log('Setup complete.');
}