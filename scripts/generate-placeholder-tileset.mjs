// Generates apps/web/public/tilesets/placeholder.png — a 192×32 RGBA PNG with
// three 64×32 tiles (grass, path, wall) used by Phase 1 placeholder rendering.
//
// Pure-Node; no third-party deps. PNG encoded manually using zlib.deflateSync
// and zlib.crc32 (available on Node 22.2+ / 20.15+).
//
// Re-run this script to regenerate the PNG if you tweak the palette.
//   node scripts/generate-placeholder-tileset.mjs
//
// When real art ships (post-Phase-1 polish), swap the placeholder.png for the
// real tileset image and delete this script. See ADR 0004.

import { writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { Buffer } from 'node:buffer';

const OUT = 'apps/web/public/tilesets/placeholder.png';

const TILE_W = 64;
const TILE_H = 32;
const TILES = [
  { name: 'grass', rgb: [92, 168, 98] },
  { name: 'path', rgb: [204, 178, 122] },
  { name: 'wall', rgb: [72, 80, 92] },
];

const W = TILE_W * TILES.length;
const H = TILE_H;

// Raw pixel data: one row = [filter-byte=0, then W pixels of RGBA].
const raw = Buffer.alloc(H * (1 + W * 4));
let pos = 0;
for (let y = 0; y < H; y++) {
  raw[pos++] = 0; // filter: None
  for (let x = 0; x < W; x++) {
    const tileIdx = Math.floor(x / TILE_W);
    const [r, g, b] = TILES[tileIdx].rgb;
    raw[pos++] = r;
    raw[pos++] = g;
    raw[pos++] = b;
    raw[pos++] = 255;
  }
}

const idat = deflateSync(raw);

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
ihdr[10] = 0; // compression: deflate
ihdr[11] = 0; // filter: standard
ihdr[12] = 0; // interlace: none

const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(OUT, png);

console.log(
  `Wrote ${OUT} — ${W}×${H} PNG with ${TILES.length} tiles: ${TILES.map((t) => t.name).join(', ')}`,
);
