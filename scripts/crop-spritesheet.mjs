// Crops a PNG to a sub-rectangle and writes the result to a new path.
//
// Usage:
//   node scripts/crop-spritesheet.mjs <input.png> <output.png> <x> <y> <w> <h>
//
// Example — extract the filled 128×256 region from a 832×256 Aseprite export:
//   node scripts/crop-spritesheet.mjs ~/Downloads/knight-idle.png \
//     apps/web/public/avatars/avatar-01/idle.png 0 0 128 256

import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const [, , inputPath, outputPath, xStr, yStr, wStr, hStr] = process.argv;

if (!inputPath || !outputPath || !xStr) {
  console.error(
    'usage: node scripts/crop-spritesheet.mjs <input> <output> <x> <y> <w> <h>',
  );
  process.exit(1);
}

const x = Number(xStr);
const y = Number(yStr);
const w = Number(wStr);
const h = Number(hStr);

const src = PNG.sync.read(readFileSync(inputPath));

if (x + w > src.width || y + h > src.height) {
  console.error(
    `crop region (${x}, ${y}) ${w}×${h} exceeds source ${src.width}×${src.height}`,
  );
  process.exit(1);
}

const dst = new PNG({ width: w, height: h });

for (let dy = 0; dy < h; dy++) {
  for (let dx = 0; dx < w; dx++) {
    const s = ((y + dy) * src.width + (x + dx)) * 4;
    const d = (dy * w + dx) * 4;
    dst.data[d] = src.data[s];
    dst.data[d + 1] = src.data[s + 1];
    dst.data[d + 2] = src.data[s + 2];
    dst.data[d + 3] = src.data[s + 3];
  }
}

writeFileSync(outputPath, PNG.sync.write(dst));
console.log(
  `Cropped ${inputPath} (${src.width}×${src.height}) → ${outputPath} (${w}×${h}) at (${x}, ${y})`,
);
