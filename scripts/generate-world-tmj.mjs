// Generates apps/web/public/maps/world.tmj using the real iso tileset.
// First-pass programmatic design — paints grass + dirt paths + rock-ring
// collision + scattered flowers/bushes. The Tiled GUI is the right tool
// for a hand-designed map; this script exists so we can see the real art
// in-engine before the GUI work begins, and as a deterministic fallback
// if the .tmj ever needs to be rebuilt from scratch.
//
// Tile semantics (0-indexed within the tileset; .tmj GIDs are index + 1):
//   PATH   — tiles 0..4   (row 0; dirt/soil diamonds)
//   GRASS  — tiles 22..32 (row 2; grass-on-dirt blocks)
//   BUSH   — tiles 33..43 (row 3; bushes — short overlay)
//   FLOWER — tiles 44..54 (row 4; flowers + small plants — short overlay)
//   ROCK   — tiles 77..87 (row 7; gray rocks — collision/walls)
//
// Adjacent tall objects (trees 55..76, tall rocks 88..98) are NOT used
// here — tilemap-layer decorations render at fixed depth per layer, so
// anything tall enough to obscure the avatar needs to be an individually
// y-sorted sprite, which comes later.
//
// Re-run to regenerate:
//   node scripts/generate-world-tmj.mjs

import { writeFileSync } from 'node:fs';

const W = 30;
const H = 30;
const OUT = 'apps/web/public/maps/world.tmj';
const idx = (x, y) => y * W + x;

// Tile indices (0-based within tileset) — convert to .tmj GID with +1.
const GRASS = [22, 23, 24, 25, 26, 27].map((t) => t + 1); // 6 variants
const PATH = [0, 1, 2, 3].map((t) => t + 1); // 4 dirt variants
const ROCK = [77, 78, 79, 80, 81].map((t) => t + 1); // 5 rock variants
const FLOWER = [44, 45, 46, 47, 48, 49, 50].map((t) => t + 1);
const BUSH = [33, 34, 35, 36, 37].map((t) => t + 1);

// Seeded PRNG (mulberry32) so the generated map is reproducible.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xa4c4d1a); // change seed for a different layout

const pickRandom = (arr) => arr[Math.floor(rand() * arr.length)];

// Three layers.
const ground = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
const overlay = new Array(W * H).fill(0);

// Ground base: random grass variant everywhere.
for (let i = 0; i < W * H; i++) ground[i] = pickRandom(GRASS);

// Paths along the corridor network (same layout as before).
const paintPath = (x0, y0, x1, y1) => {
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    ground[idx(x, y)] = pickRandom(PATH);
    if (x !== x1) x += dx;
    else if (y !== y1) y += dy;
  }
  ground[idx(x1, y1)] = pickRandom(PATH);
};
paintPath(15, 15, 15, 10); // spawn → north corridor
paintPath(7, 10, 22, 10); // east-west corridor connecting Tavern + Academy
paintPath(15, 15, 15, 19); // spawn → Market entrance

// Collision: rock ring at map edges + rock blocks inside building footprints.
const paintRect = (layer, x0, y0, x1, y1, tilePool) => {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) layer[idx(x, y)] = pickRandom(tilePool);
};
for (let x = 0; x < W; x++) {
  collision[idx(x, 0)] = pickRandom(ROCK);
  collision[idx(x, H - 1)] = pickRandom(ROCK);
}
for (let y = 0; y < H; y++) {
  collision[idx(0, y)] = pickRandom(ROCK);
  collision[idx(W - 1, y)] = pickRandom(ROCK);
}
paintRect(collision, 5, 5, 9, 9, ROCK); // Tavern
paintRect(collision, 20, 5, 24, 9, ROCK); // Academy
paintRect(collision, 13, 20, 17, 24, ROCK); // Market

// Overlay: sparse flowers + bushes on grass cells only (not paths, not
// collision, not building-entrance tiles that will have zones placed).
const ENTRANCE_TILES = new Set([`7,10`, `22,10`, `15,19`, `7,11`, `22,11`, `15,18`]);
const DECOR_DENSITY = 0.08; // ~8% of eligible cells get decoration
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (collision[idx(x, y)] !== 0) continue; // no overlay on rocks
    // Path cells have ground[]=PATH GID; skip them.
    if (PATH.includes(ground[idx(x, y)])) continue;
    if (ENTRANCE_TILES.has(`${x},${y}`)) continue;
    if (rand() > DECOR_DENSITY) continue;
    overlay[idx(x, y)] = pickRandom(rand() < 0.5 ? FLOWER : BUSH);
  }
}

const tmj = {
  compressionlevel: -1,
  height: H,
  infinite: false,
  layers: [
    {
      data: ground,
      height: H,
      id: 1,
      name: 'ground',
      opacity: 1,
      type: 'tilelayer',
      visible: true,
      width: W,
      x: 0,
      y: 0,
    },
    {
      data: collision,
      height: H,
      id: 2,
      name: 'collision',
      opacity: 1,
      type: 'tilelayer',
      visible: true,
      width: W,
      x: 0,
      y: 0,
    },
    {
      data: overlay,
      height: H,
      id: 3,
      name: 'overlay',
      opacity: 1,
      type: 'tilelayer',
      visible: true,
      width: W,
      x: 0,
      y: 0,
    },
  ],
  nextlayerid: 4,
  nextobjectid: 1,
  orientation: 'isometric',
  renderorder: 'right-down',
  tiledversion: '1.11.0',
  tileheight: 32, // map grid vertical spacing (iso stagger; 2:1 diamonds)
  tilesets: [
    {
      firstgid: 1,
      image: '../tilesets/world.png',
      imageheight: 704,
      imagewidth: 704,
      margin: 0,
      name: 'world',
      spacing: 0,
      tilecount: 121, // 11×11 grid (115 filled, 6 transparent cells)
      tileheight: 64, // source tile height (upscaled 2× from 32)
      tilewidth: 64,
      columns: 11,
    },
  ],
  tilewidth: 64, // map grid horizontal spacing
  type: 'map',
  version: '1.10',
  width: W,
};

writeFileSync(OUT, JSON.stringify(tmj, null, 2) + '\n');
console.log(
  `Wrote ${OUT} — 30×30 iso, 121-tile tileset, ${overlay.filter((v) => v !== 0).length} decoration cells.`,
);
