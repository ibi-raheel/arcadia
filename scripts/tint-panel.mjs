// One-off: recolor the Kenney panel ornaments from cream to bronze so
// the HUD reads as "all dark brown" instead of "dark interior with
// cream rim". Reads the source PNG, swaps any non-transparent pixel
// to a bronze tone (preserving alpha), writes alongside as panel-bronze.png.

import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const SRC = process.argv[2];
const DST = process.argv[3];
if (!SRC || !DST) {
  console.error('usage: node tint-panel.mjs <src.png> <dst.png>');
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
    // alpha untouched — preserves anti-aliasing on ornament edges
  }
}

writeFileSync(DST, PNG.sync.write(png));
console.log(`tinted ${SRC} → ${DST} (${png.width}×${png.height})`);
