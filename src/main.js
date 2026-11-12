'use strict';
const {app, BrowserWindow, ipcMain, dialog, shell, nativeTheme} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {collectFiles, scanDirectory, sanitizeState} = require('./library');

let mainWindow;
let pendingExternalFiles = [];
let rendererReady = false;

// Never deliver startup file paths before the renderer has finished restoring the library.
function flushPendingFiles() {
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed() ||
      mainWindow.webContents.isLoading() || !pendingExternalFiles.length) return;
  const files = collectFiles(pendingExternalFiles);
  pendingExternalFiles = [];
  if (files.length) mainWindow.webContents.send('external-files', files);
}
const statePath = () => path.join(app.getPath('userData'), 'player-state.json');

function readState() {
  try { return sanitizeState(JSON.parse(fs.readFileSync(statePath(), 'utf8'))); }
  catch { return sanitizeState({}); }
}
function writeState(raw) {
  const clean = sanitizeState(raw);
  const filePath = statePath();
  const temporary = `${filePath}.tmp`;
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(temporary, JSON.stringify(clean, null, 2), 'utf8');
  fs.renameSync(temporary, filePath);
  return true;
}
function createWindow() {
  rendererReady = false;
  mainWindow = new BrowserWindow({
    width: 1340, height: 860, minWidth: 890, minHeight: 570,
    backgroundColor: '#0b0e1b', show: false,
    title: 'NOVA MEDIA PLAYER',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.webContents.on('did-finish-load', flushPendingFiles);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const files = collectFiles(argv.filter(v => !v.startsWith('--')));
    if (files.length) pendingExternalFiles.push(...files.map(item => item.id));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      flushPendingFiles();
    }
  });
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  app.setAppUserModelId('com.nova.mediaplayer');
  pendingExternalFiles.push(...process.argv.slice(app.isPackaged ? 1 : 2).filter(v => !v.startsWith('--')));
  ipcMain.handle('renderer-ready', () => {
    rendererReady = true;
    flushPendingFiles();
    return true;
  });
  ipcMain.handle('open-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Wybierz muzykę lub filmy',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {name: 'Pliki multimedialne', extensions: ['mp3', 'wav', 'flac', 'ogg', 'opus', 'm4a', 'aac', 'wma', 'mp4', 'm4v', 'webm', 'mov', 'mkv', 'avi', 'wmv']},
        {name: 'Wszystkie pliki', extensions: ['*']}
      ]
    });
    return result.canceled ? [] : collectFiles(result.filePaths);
  });
  ipcMain.handle('open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Dodaj cały folder multimediów', properties: ['openDirectory']
    });
    return result.canceled ? [] : scanDirectory(result.filePaths[0]);
  });
  ipcMain.handle('import-paths', (_event, paths) => collectFiles(Array.isArray(paths) ? paths.slice(0, 2500) : []));
  ipcMain.handle('restore-library', () => {
    const state = readState();
    return {state, items: collectFiles(state.paths)};
  });
  ipcMain.handle('save-library', (_event, state) => writeState(state));
  ipcMain.handle('show-file', async (_event, filePath) => {
    if (typeof filePath === 'string' && collectFiles([filePath]).length) {
      await shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
