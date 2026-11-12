'use strict';
const {contextBridge, ipcRenderer, webUtils} = require('electron');
contextBridge.exposeInMainWorld('nova', {
  openFiles: () => ipcRenderer.invoke('open-files'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  importPaths: paths => ipcRenderer.invoke('import-paths', paths),
  restore: () => ipcRenderer.invoke('restore-library'),
  save: data => ipcRenderer.invoke('save-library', data),
  showFile: path => ipcRenderer.invoke('show-file', path),
  filePaths: files => Array.from(files).map(file => webUtils.getPathForFile(file)).filter(Boolean),
  onExternalFiles: callback => ipcRenderer.on('external-files', (_event, files) => callback(files))
});
