// One-off: recolor the Kenney panel ornaments from cream to bronze so
// the HUD reads as "all dark brown" instead of "dark interior with
// cream rim". Reads the source PNG, swaps any non-transparent pixel
// to a bronze tone, writes alongside as panel-bronze.png. Optional
// alpha multiplier argument softens the rim — 0.6 means "render the
// border lines at 60% opacity so they're delicate, not loud".

import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const SRC = process.argv[2];
const DST = process.argv[3];
const ALPHA_MUL = process.argv[4] !== undefined ? Number(process.argv[4]) : 1;
if (!SRC || !DST || Number.isNaN(ALPHA_MUL) || ALPHA_MUL < 0 || ALPHA_MUL > 1) {
  console.error('usage: node tint-panel.mjs <src.png> <dst.png> [alpha-multiplier=1]');
  process.exit(1);
}

const png = PNG.sync.read(readFileSync(SRC));
// Bronze hex from the design system: --bronze-bright #d4a868 (R=212 G=168 B=104).
const R = 0xd4,
  G = 0xa8,
  B = 0x68;

for (let y = 0; y < png.height; y += 1) {
  for (let x = 0; x < png.width; x += 1) {
    const idx = (png.width * y + x) << 2;
    const a = png.data[idx + 3];
    if (a === 0) continue; // keep transparent pixels transparent
    png.data[idx] = R;
    png.data[idx + 1] = G;
    png.data[idx + 2] = B;
    // Apply the alpha multiplier — preserves anti-aliasing on ornament
    // edges by scaling rather than thresholding.
    png.data[idx + 3] = Math.round(a * ALPHA_MUL);
  }
}

writeFileSync(DST, PNG.sync.write(png));
console.log(`tinted ${SRC} → ${DST} (${png.width}×${png.height}, alpha × ${ALPHA_MUL})`);
