'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {mediaItem, fileType, collectFiles, scanDirectory, sanitizeState} = require('../src/library');

test('rozpoznaje audio i wideo oraz ignoruje inne pliki', () => {
  assert.equal(fileType('FILM.MP4'), 'video');
  assert.equal(fileType('test.MP3'), 'audio');
  assert.equal(fileType('fake.exe'), null);
});
test('importuje pliki i usuwa duplikaty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-media-'));
  try {
    const song = path.join(dir, 'Utwór.mp3');
    const movie = path.join(dir, 'Film.MP4');
    fs.writeFileSync(song, Buffer.from('test'));
    fs.writeFileSync(movie, Buffer.from('test'));
    assert.equal(mediaItem(song).type, 'audio');
    assert.equal(collectFiles([song, song, movie, 'nie-ma.mp3']).length, 2);
    assert.equal(scanDirectory(dir).length, 2);
  } finally {fs.rmSync(dir, {force: true, recursive: true});}
});
test('zabezpiecza przywracane ustawienia', () => {
  const state = sanitizeState({volume: 10, rate: 99, repeat: 'bad', paths: [12, '/tmp/file.mp3'], lastTime: -200});
  assert.equal(state.volume, 1);
  assert.equal(state.rate, 1);
  assert.equal(state.repeat, 'off');
  assert.equal(state.paths.length, 1);
  assert.equal(state.lastTime, 0);
});
