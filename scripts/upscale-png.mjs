// Integer nearest-neighbor upscale for pixel-art PNGs.
// Preserves crisp pixel edges (no bilinear blur). Pure-Node via pngjs.
//
// Usage:
//   node scripts/upscale-png.mjs <input.png> <output.png> <factor>
//
// Example — 2x an Aseprite / itch.io tileset to match our 64x32 world grid:
//   node scripts/upscale-png.mjs \
//     ~/Downloads/spritesheet.png \
//     apps/web/public/tilesets/world.png 2

import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const [, , inputPath, outputPath, factorStr] = process.argv;

if (!inputPath || !outputPath || !factorStr) {
  console.error('usage: node scripts/upscale-png.mjs <input> <output> <integer-factor>');
  process.exit(1);
}

const factor = Math.floor(Number(factorStr));
if (!Number.isFinite(factor) || factor < 2) {
  console.error('factor must be an integer >= 2');
  process.exit(1);
}

const src = PNG.sync.read(readFileSync(inputPath));
const outW = src.width * factor;
const outH = src.height * factor;
const dst = new PNG({ width: outW, height: outH });

for (let y = 0; y < outH; y++) {
  const srcY = Math.floor(y / factor);
  for (let x = 0; x < outW; x++) {
    const srcX = Math.floor(x / factor);
    const s = (srcY * src.width + srcX) * 4;
    const d = (y * outW + x) * 4;
    dst.data[d] = src.data[s];
    dst.data[d + 1] = src.data[s + 1];
    dst.data[d + 2] = src.data[s + 2];
    dst.data[d + 3] = src.data[s + 3];
  }
}

writeFileSync(outputPath, PNG.sync.write(dst));
console.log(
  `Upscaled ${inputPath} (${src.width}×${src.height}) → ${outputPath} (${outW}×${outH}) at ${factor}×`,
);
