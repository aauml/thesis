/**
 * GitHubSync.gs — Mirrors GitHub repo to Google Drive
 * Version: 1
 * Date: 2026-03-15
 *
 * Purpose: Automatically syncs files from the aauml/thesis GitHub repo
 * to a Google Drive folder called "thesis-repo". This provides:
 *   - Backup of all repo files in Drive
 *   - Easy access to scripts (WebApp.gs, etc.) without manual copy/paste
 *   - Works from anywhere — no Cowork or CLI needed
 *
 * SETUP:
 *   1. Paste this into a new .gs file in your Apps Script project
 *   2. Run syncGitHubToDrive() once manually to create the folder structure
 *   3. (Optional) Set up a daily trigger: Edit → Triggers → Add →
 *      syncGitHubToDrive → Time-driven → Day timer → 6am–7am
 *
 * The function uses GitHub's public API (no token needed for public repos).
 * If you make the repo private, add GITHUB_TOKEN to script properties.
 */

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const GITHUB_OWNER = 'aauml';
const GITHUB_REPO = 'thesis';
const GITHUB_BRANCH = 'main';
const DRIVE_FOLDER_NAME = 'thesis-repo';

// If you want the repo inside an existing Drive folder, set its ID here.
// Get the ID from the folder URL: https://drive.google.com/drive/folders/FOLDER_ID
// Leave empty to create in Drive root.
const DRIVE_PARENT_FOLDER_ID = '1KvWGLwbXxrNzpmBuFU6od4HJeH-IGXBY'; // 09_Sistema

// Files/folders to skip (regex patterns)
const SKIP_PATTERNS = [
  /^\.git/,           // .git folder
  /^pwa\//,           // PWA assets
  /^sw\.js$/,         // service worker
];

// ─────────────────────────────────────────────
// MAIN SYNC FUNCTION
// ─────────────────────────────────────────────

function syncGitHubToDrive() {
  const startTime = new Date();
  Logger.log('Starting GitHub \u2192 Drive sync: ' + startTime.toISOString());

  // Get or create the Drive folder
  const driveFolder = getOrCreateDriveFolder_(DRIVE_FOLDER_NAME);

  // Fetch the repo tree from GitHub API
  const tree = fetchGitHubTree_();
  if (!tree || !tree.length) {
    Logger.log('ERROR: No files found in GitHub tree');
    return;
  }

  Logger.log('Found ' + tree.length + ' items in GitHub repo');

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of tree) {
    // Skip directories (we create them on-demand)
    if (item.type !== 'blob') continue;

    // Skip patterns
    if (SKIP_PATTERNS.some(p => p.test(item.path))) {
      skipped++;
      continue;
    }

    try {
      syncFile_(driveFolder, item);
      synced++;
    } catch (e) {
      Logger.log('ERROR syncing ' + item.path + ': ' + e.message);
      errors++;
    }
  }

  const elapsed = ((new Date() - startTime) / 1000).toFixed(1);
  Logger.log('Sync complete: ' + synced + ' synced, ' + skipped + ' skipped, ' +
             errors + ' errors. Time: ' + elapsed + 's');

  // Update last-sync timestamp in Meta tab (if it exists)
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const metaSheet = ss.getSheetByName('Meta');
    if (metaSheet) {
      const data = metaSheet.getDataRange().getValues();
      let found = false;
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'github_sync_last') {
          metaSheet.getRange(i + 1, 2).setValue(new Date().toISOString());
          found = true;
          break;
        }
      }
      if (!found) {
        metaSheet.appendRow(['github_sync_last', new Date().toISOString()]);
      }
    }
  } catch (e) {
    // Silent — Meta update is optional
  }
}


// ─────────────────────────────────────────────
// GITHUB API
// ─────────────────────────────────────────────

function fetchGitHubTree_() {
  const url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO +
              '/git/trees/' + GITHUB_BRANCH + '?recursive=1';

  const options = {
    method: 'get',
    headers: { 'Accept': 'application/vnd.github.v3+json' },
    muteHttpExceptions: true
  };

  // Add token if repo is private
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  if (token) {
    options.headers['Authorization'] = 'token ' + token;
  }

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log('GitHub API error: ' + response.getContentText());
    return [];
  }

  const data = JSON.parse(response.getContentText());
  return data.tree || [];
}

function fetchGitHubFileContent_(path) {
  const url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO +
              '/contents/' + encodeURIPath_(path) + '?ref=' + GITHUB_BRANCH;

  const options = {
    method: 'get',
    headers: { 'Accept': 'application/vnd.github.v3+json' },
    muteHttpExceptions: true
  };

  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  if (token) {
    options.headers['Authorization'] = 'token ' + token;
  }

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error('HTTP ' + response.getResponseCode());
  }

  const data = JSON.parse(response.getContentText());

  // GitHub returns content as base64
  if (data.encoding === 'base64' && data.content) {
    return {
      content: Utilities.newBlob(Utilities.base64Decode(data.content)).getDataAsString(),
      sha: data.sha,
      size: data.size
    };
  }

  // For files too large for the contents API, use the raw URL
  if (data.download_url) {
    const raw = UrlFetchApp.fetch(data.download_url, { muteHttpExceptions: true });
    return {
      content: raw.getContentText(),
      sha: data.sha,
      size: data.size
    };
  }

  throw new Error('Unable to fetch content for ' + path);
}

// Encode path segments but not slashes
function encodeURIPath_(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}


// ─────────────────────────────────────────────
// DRIVE OPERATIONS
// ─────────────────────────────────────────────

function getOrCreateDriveFolder_(name) {
  // If a parent folder ID is configured, look/create inside it
  if (DRIVE_PARENT_FOLDER_ID) {
    const parent = DriveApp.getFolderById(DRIVE_PARENT_FOLDER_ID);
    const folders = parent.getFoldersByName(name);
    if (folders.hasNext()) {
      return folders.next();
    }
    Logger.log('Creating Drive folder: ' + name + ' inside ' + parent.getName());
    return parent.createFolder(name);
  }
  // Otherwise, use Drive root
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  Logger.log('Creating Drive folder: ' + name);
  return DriveApp.createFolder(name);
}

function getOrCreateSubFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

function syncFile_(rootFolder, item) {
  const pathParts = item.path.split('/');
  const fileName = pathParts.pop();

  // Navigate/create subfolder structure
  let currentFolder = rootFolder;
  for (const part of pathParts) {
    currentFolder = getOrCreateSubFolder_(currentFolder, part);
  }

  // Fetch the file content from GitHub
  const fileData = fetchGitHubFileContent_(item.path);

  // Check if file already exists in Drive
  const existingFiles = currentFolder.getFilesByName(fileName);
  if (existingFiles.hasNext()) {
    const existing = existingFiles.next();
    // Only update if SHA changed (compare via description where we store the sha)
    const storedSha = existing.getDescription() || '';
    if (storedSha === fileData.sha) {
      return; // No change — skip
    }
    // Update existing file
    existing.setContent(fileData.content);
    existing.setDescription(fileData.sha);
    Logger.log('Updated: ' + item.path);
  } else {
    // Create new file
    const newFile = currentFolder.createFile(fileName, fileData.content);
    newFile.setDescription(fileData.sha);
    Logger.log('Created: ' + item.path);
  }
}


// ─────────────────────────────────────────────
// MANUAL DEPLOY HELPER
// ─────────────────────────────────────────────

/**
 * Quick function to view the latest WebApp.gs from Drive.
 * Run this, then check the Execution Log for the script URL.
 */
function showLatestWebAppUrl() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (!folders.hasNext()) {
    Logger.log('No thesis-repo folder found. Run syncGitHubToDrive() first.');
    return;
  }
  const root = folders.next();
  const kbFolder = root.getFoldersByName('phd-kb');
  if (!kbFolder.hasNext()) { Logger.log('No phd-kb folder'); return; }
  const scripts = kbFolder.next().getFoldersByName('scripts');
  if (!scripts.hasNext()) { Logger.log('No scripts folder'); return; }

  const files = scripts.next().getFiles();
  const scriptFiles = [];
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().startsWith('WebApp-')) {
      scriptFiles.push(f.getName());
    }
  }
  scriptFiles.sort();
  Logger.log('Available WebApp versions in Drive: ' + scriptFiles.join(', '));
  Logger.log('Latest: ' + scriptFiles[scriptFiles.length - 1]);
}
