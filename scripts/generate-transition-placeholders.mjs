// Generates the three building transition placeholder PNGs —
// apps/web/public/transitions/{tavern,academy,market}.png. Each is a 1×1
// fully-transparent PNG so the overlay shows just the spinner + title
// until real art drops in. Zero runtime cost. Re-run if they go missing:
//
//   node scripts/generate-transition-placeholders.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const OUT_DIR = 'apps/web/public/transitions';
const BUILDINGS = ['tavern', 'academy', 'market'];

// Minimal PNG writer — matches scripts/generate-placeholder-tileset.mjs.
function be32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  return Buffer.concat([be32(data.length), body, be32(crc)]);
}

function writeTransparentPng(path) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // 1×1 RGBA
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); // width
  ihdr.writeUInt32BE(1, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0; // no interlace
  // One row: filter byte (0) + RGBA (0,0,0,0)
  const row = Buffer.from([0, 0, 0, 0, 0]);
  const idat = deflateSync(row);
  const iend = Buffer.alloc(0);
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', iend)]);
  writeFileSync(path, png);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const name of BUILDINGS) {
  const path = `${OUT_DIR}/${name}.png`;
  writeTransparentPng(path);
  console.log(`wrote ${path}`);
}
