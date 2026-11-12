'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.opus', '.m4a', '.aac', '.wma']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm', '.mov', '.mkv', '.avi', '.wmv']);
const ALL_EXTENSIONS = new Set([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]);
const MAX_FILES = 2500;

function fileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return null;
}
function mediaItem(filePath) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !fileType(filePath)) return null;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    return {
      id: filePath,
      name: path.basename(filePath),
      type: fileType(filePath),
      extension: path.extname(filePath).slice(1).toUpperCase(),
      size: stat.size,
      url: pathToFileURL(filePath).href
    };
  } catch { return null; }
}
function collectFiles(filePaths, max = MAX_FILES) {
  const items = [];
  const seen = new Set();
  for (const filePath of filePaths || []) {
    if (items.length >= max) break;
    if (typeof filePath !== 'string') continue;
    const key = process.platform === 'win32' ? filePath.toLowerCase() : filePath;
    if (seen.has(key)) continue;
    const item = mediaItem(filePath);
    if (item) { seen.add(key); items.push(item); }
  }
  return items;
}
function scanDirectory(directory, limit = MAX_FILES) {
  const files = [];
  const queue = [directory];
  let folders = 0;
  while (queue.length && files.length < limit && folders < 400) {
    const current = queue.shift();
    folders++;
    let entries;
    try { entries = fs.readdirSync(current, {withFileTypes: true}); } catch { continue; }
    entries.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) { if (queue.length < 400) queue.push(fullPath); }
      else if (entry.isFile() && ALL_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
        if (files.length >= limit) break;
      }
    }
  }
  return collectFiles(files, limit);
}
function sanitizeState(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const paths = Array.isArray(value.paths) ? value.paths.filter(p => typeof p === 'string' && path.isAbsolute(p)).slice(0, MAX_FILES) : [];
  const favorites = Array.isArray(value.favorites) ? value.favorites.filter(p => typeof p === 'string' && path.isAbsolute(p)).slice(0, MAX_FILES) : [];
  const volume = Number(value.volume);
  const rate = Number(value.rate);
  const lastTime = Number(value.lastTime);
  return {
    paths,
    favorites,
    current: typeof value.current === 'string' ? value.current : null,
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.8,
    rate: [0.75, 1, 1.25, 1.5, 2].includes(rate) ? rate : 1,
    repeat: ['off', 'all', 'one'].includes(value.repeat) ? value.repeat : 'off',
    shuffle: value.shuffle === true,
    lastTime: Number.isFinite(lastTime) ? Math.max(0, Math.min(lastTime, 86400)) : 0
  };
}
module.exports = {mediaItem, fileType, collectFiles, scanDirectory, sanitizeState, MAX_FILES};
