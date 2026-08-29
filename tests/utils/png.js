/**
 * Minimal PNG decoder — pure JavaScript, Node built-ins only.
 *
 * Exists so the visual suite can pixel-diff snapshots on any platform without
 * the native `canvas` package (which needs cairo/pango system libraries and so
 * behaves differently on Windows, Linux and CI).
 *
 * Handles the non-interlaced subset Playwright emits (8-bit RGB / RGBA) plus
 * greyscale, palette and 16-bit variants for robustness. Interlaced (Adam7)
 * images are rejected loudly rather than decoded incorrectly.
 */

'use strict';

const fs = require('fs');
const zlib = require('zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Samples per pixel, indexed by PNG colour type.
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readChunks(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG file (bad signature)');
  }
  let header = null;
  let palette = null;
  let transparency = null;
  const idat = [];

  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end > buf.length) throw new Error(`truncated PNG chunk ${type}`);

    if (type === 'IHDR') {
      header = {
        width: buf.readUInt32BE(start),
        height: buf.readUInt32BE(start + 4),
        bitDepth: buf[start + 8],
        colorType: buf[start + 9],
        compression: buf[start + 10],
        filter: buf[start + 11],
        interlace: buf[start + 12],
      };
    } else if (type === 'PLTE') {
      palette = buf.subarray(start, end);
    } else if (type === 'tRNS') {
      transparency = buf.subarray(start, end);
    } else if (type === 'IDAT') {
      idat.push(buf.subarray(start, end));
    } else if (type === 'IEND') {
      break;
    }

    offset = end + 4; // skip CRC
  }

  if (!header) throw new Error('PNG has no IHDR chunk');
  if (!idat.length) throw new Error('PNG has no IDAT chunk');
  return { header, palette, transparency, idat: Buffer.concat(idat) };
}

/** Reverse the per-scanline filters applied by the encoder, in place. */
function unfilter(raw, height, lineBytes, bpp) {
  const out = Buffer.alloc(height * lineBytes);
  let pos = 0;
  let prev = null;

  for (let y = 0; y < height; y++) {
    if (pos >= raw.length) throw new Error(`PNG data ends early at row ${y}`);
    const filter = raw[pos++];
    const cur = out.subarray(y * lineBytes, (y + 1) * lineBytes);
    raw.copy(cur, 0, pos, pos + lineBytes);
    pos += lineBytes;

    switch (filter) {
      case 0:
        break;
      case 1:
        for (let i = bpp; i < lineBytes; i++) cur[i] = (cur[i] + cur[i - bpp]) & 0xff;
        break;
      case 2:
        if (prev) for (let i = 0; i < lineBytes; i++) cur[i] = (cur[i] + prev[i]) & 0xff;
        break;
      case 3:
        for (let i = 0; i < lineBytes; i++) {
          const a = i >= bpp ? cur[i - bpp] : 0;
          const b = prev ? prev[i] : 0;
          cur[i] = (cur[i] + ((a + b) >> 1)) & 0xff;
        }
        break;
      case 4:
        for (let i = 0; i < lineBytes; i++) {
          const a = i >= bpp ? cur[i - bpp] : 0;
          const b = prev ? prev[i] : 0;
          const c = prev && i >= bpp ? prev[i - bpp] : 0;
          cur[i] = (cur[i] + paeth(a, b, c)) & 0xff;
        }
        break;
      default:
        throw new Error(`unsupported PNG filter type ${filter} on row ${y}`);
    }
    prev = cur;
  }
  return out;
}

/**
 * Decode a PNG buffer to 8-bit RGBA.
 * @returns {{ width: number, height: number, data: Buffer }} data is width*height*4 bytes.
 */
function decodePNG(buf) {
  const { header, palette, transparency, idat } = readChunks(buf);
  const { width, height, bitDepth, colorType, compression, interlace } = header;

  if (compression !== 0) throw new Error(`unsupported PNG compression ${compression}`);
  if (interlace !== 0) throw new Error('interlaced (Adam7) PNGs are not supported');
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);
  if (![1, 2, 4, 8, 16].includes(bitDepth)) {
    throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  }
  if (colorType === 3 && !palette) throw new Error('indexed PNG has no PLTE chunk');

  const bitsPerPixel = channels * bitDepth;
  const lineBytes = Math.ceil((width * bitsPerPixel) / 8);
  const bpp = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const pixels = unfilter(zlib.inflateSync(idat), height, lineBytes, bpp);

  const maxValue = (1 << bitDepth) - 1;
  const data = Buffer.alloc(width * height * 4);

  // Read sample `i` of row `y`, normalised to 0-255 (palette indices excepted).
  const readSample = (y, i) => {
    if (bitDepth === 8) return pixels[y * lineBytes + i];
    if (bitDepth === 16) return pixels[y * lineBytes + i * 2]; // high byte is enough for diffing
    const bitPos = i * bitDepth;
    const byte = pixels[y * lineBytes + (bitPos >> 3)];
    const shift = 8 - bitDepth - (bitPos & 7);
    return (byte >> shift) & maxValue;
  };
  const scale = bitDepth < 8 ? 255 / maxValue : 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      const s = x * channels;
      let r;
      let g;
      let b;
      let a = 255;

      if (colorType === 3) {
        const index = readSample(y, s);
        r = palette[index * 3];
        g = palette[index * 3 + 1];
        b = palette[index * 3 + 2];
        if (transparency && index < transparency.length) a = transparency[index];
      } else if (colorType === 0 || colorType === 4) {
        r = g = b = Math.round(readSample(y, s) * scale);
        if (colorType === 4) a = Math.round(readSample(y, s + 1) * scale);
      } else {
        r = Math.round(readSample(y, s) * scale);
        g = Math.round(readSample(y, s + 1) * scale);
        b = Math.round(readSample(y, s + 2) * scale);
        if (colorType === 6) a = Math.round(readSample(y, s + 3) * scale);
      }

      data[base] = r;
      data[base + 1] = g;
      data[base + 2] = b;
      data[base + 3] = a;
    }
  }

  return { width, height, data };
}

function decodePNGFile(filePath) {
  return decodePNG(fs.readFileSync(filePath));
}

module.exports = { decodePNG, decodePNGFile };
