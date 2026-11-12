'use strict';
// Generates cross-platform PNG/ICO branding without extra dependencies.
// Existing custom icons are preserved.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, {recursive: true});
const pngFile = path.join(dir, 'icon.png');
const icoFile = path.join(dir, 'icon.ico');
const SIZE = 256;
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 4 + 1);
  for (let x = 0; x < SIZE; x++) {
    let r = 11, g = 14, b = 31, a = 255;
    const cx = x - 128, cy = y - 128;
    const radius = Math.hypot(cx, cy);
    if (radius < 108) { r = 98 + Math.round(x / 7); g = 48 + Math.round(y / 12); b = 218; }
    if (radius < 91) { r = 22; g = 23; b = 51; }
    // White play symbol: pointed end at x=182, vertical back at x=94.
    const inside = x >= 94 && x <= 184 && Math.abs(y - 128) <= (x <= 94 ? 0 : (184 - x) * 0.69);
    // Triangle defined using tip at x=184 and vertical base at x=94.
    if (x >= 94 && x <= 184 && Math.abs(y - 128) <= (184 - x) * 0.65) {
      r = 247; g = 249; b = 255;
    }
    const idx = row + 1 + x * 4;
    raw[idx] = r; raw[idx+1] = g; raw[idx+2] = b; raw[idx+3] = a;
  }
}
let crcTable = Array.from({length:256}, (_, n) => {let c=n; for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):(c>>>1);return c>>>0;});
function crc32(data){let c=0xffffffff;for(const byte of data)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(name, data){const type=Buffer.from(name);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([len,type,data,crc]);}
function generatePng(){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(SIZE,0);ihdr.writeUInt32BE(SIZE,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw, {level:9})),chunk('IEND',Buffer.alloc(0))]);}
let image=fs.existsSync(pngFile) ? fs.readFileSync(pngFile) : generatePng();
if(!fs.existsSync(pngFile))fs.writeFileSync(pngFile,image);
if(!fs.existsSync(icoFile)){
  const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=0;header[7]=0;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(image.length,14);header.writeUInt32LE(22,18);
  fs.writeFileSync(icoFile,Buffer.concat([header,image]));
}
console.log('Ikony NOVA MEDIA PLAYER gotowe.');
