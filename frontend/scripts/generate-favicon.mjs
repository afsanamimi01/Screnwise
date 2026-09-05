/**
 * Draw the Screenwise favicons from the brand mark.
 *
 * `public/favicon.svg` is the primary icon and is hand-written; this produces
 * the raster fallbacks (`favicon-32.png`, `favicon-16.png`, `favicon.ico`) for
 * browsers that ignore SVG icons and for the bare `/favicon.ico` request a
 * browser makes on its own.
 *
 * No image dependency: the tile and the four-point star are rasterised
 * directly, and Node's own zlib does the PNG compression.
 *
 *   node scripts/generate-favicon.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const TILE = [0x00, 0x6b, 0x79]; // #006b79 - the brand teal
const MARK = [0xf8, 0xfd, 0xfe]; // #f8fdfe - the mark on top of it
const SAMPLES = 4; // supersampling per axis, for smooth edges

/** Rounded-square coverage test, in unit coordinates. */
function insideTile(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * A four-point sparkle is an astroid: |x|^(2/3) + |y|^(2/3) <= r^(2/3).
 * Concave sides, sharp points - the same silhouette as the lucide glyph the
 * app draws, minus the detail that would turn to mush at 16px.
 */
function insideStar(x, y, cx, cy, r) {
  const dx = Math.abs(x - cx) / r;
  const dy = Math.abs(y - cy) / r;
  if (dx > 1 || dy > 1) return false;
  return Math.pow(dx, 2 / 3) + Math.pow(dy, 2 / 3) <= 1;
}

function renderRgba(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.25;
  // Below 32px the accent star is dropped, so the main one is centred and
  // grown to use the space - a tab favicon has to read at 16px.
  const detailed = size >= 32;
  const mainR = size * (detailed ? 0.3 : 0.4);
  const main = detailed
    ? { cx: size * 0.45, cy: size * 0.56 }
    : { cx: size * 0.5, cy: size * 0.5 };
  const accent = { cx: size * 0.765, cy: size * 0.235, r: size * 0.115 };

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let tile = 0;
      let mark = 0;

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = px + (sx + 0.5) / SAMPLES;
          const y = py + (sy + 0.5) / SAMPLES;
          if (!insideTile(x, y, size, radius)) continue;
          tile++;
          const onMark =
            insideStar(x, y, main.cx, main.cy, mainR) ||
            (detailed && insideStar(x, y, accent.cx, accent.cy, accent.r));
          if (onMark) mark++;
        }
      }

      const total = SAMPLES * SAMPLES;
      const alpha = tile / total;
      const markRatio = tile ? mark / tile : 0;
      const i = (py * size + px) * 4;
      // Blend the mark over the tile within the covered part of the pixel.
      for (let c = 0; c < 3; c++) {
        pixels[i + c] = Math.round(TILE[c] * (1 - markRatio) + MARK[c] * markRatio);
      }
      pixels[i + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

/* ------------------------------------------------------------------ png --- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  // 10..12 stay 0: deflate, adaptive filtering, no interlace.

  // Every scanline carries a filter byte; 0 means "store as-is".
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ ico --- */

/** ICO with PNG-compressed entries - supported since Windows Vista. */
function encodeIco(entries) {
  const dir = Buffer.alloc(6 + entries.length * 16);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(entries.length, 4);

  let offset = dir.length;
  entries.forEach(({ size, png }, i) => {
    const at = 6 + i * 16;
    dir[at] = size >= 256 ? 0 : size;
    dir[at + 1] = size >= 256 ? 0 : size;
    dir[at + 2] = 0; // palette size
    dir[at + 3] = 0; // reserved
    dir.writeUInt16LE(1, at + 4); // colour planes
    dir.writeUInt16LE(32, at + 6); // bits per pixel
    dir.writeUInt32LE(png.length, at + 8); // bytes in this entry
    dir.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });

  return Buffer.concat([dir, ...entries.map((e) => e.png)]);
}

/* ----------------------------------------------------------------- main --- */

const sizes = [16, 32, 48];
const entries = sizes.map((size) => ({ size, png: encodePng(size, renderRgba(size)) }));

for (const { size, png } of entries) {
  if (size === 16 || size === 32) {
    writeFileSync(join(OUT, `favicon-${size}.png`), png);
    console.log(`favicon-${size}.png  ${png.length} bytes`);
  }
}

const ico = encodeIco(entries);
writeFileSync(join(OUT, "favicon.ico"), ico);
console.log(`favicon.ico       ${ico.length} bytes (${sizes.join(", ")} px)`);
