// Generates apps/web/public/maps/tavern.tmj — interior iso room for the
// Phase 2 TavernScene. Re-uses the existing world.png tileset so no new
// art is needed for Week 7. Real tavern art is a later polish step.
//
// Layout (15×15):
//   - Wall ring on the perimeter (rock tiles).
//   - One opening in the north wall at column 7 — the entrance tile (peers
//     spawn here on join).
//   - Floor: dirt/path tiles everywhere inside the perimeter.
//   - Bar counter: 3-tile-wide row of rock along the south wall (interior
//     side), centered — visual obstacle + collision.
//   - Two 1×1 "tables" at mid-room — scattered rock tiles as collision.
//
// Re-run to regenerate:
//   node scripts/generate-tavern-tmj.mjs

import { writeFileSync } from 'node:fs';

const W = 15;
const H = 15;
const OUT = 'apps/web/public/maps/tavern.tmj';
const idx = (x, y) => y * W + x;

// Tile indices (0-based within tileset) — convert to .tmj GID with +1.
const PATH = [0, 1, 2, 3].map((t) => t + 1);
const ROCK = [77, 78, 79, 80, 81].map((t) => t + 1);

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xb00b1e5);
const pickRandom = (arr) => arr[Math.floor(rand() * arr.length)];

const ground = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
const overlay = new Array(W * H).fill(0);

// Floor everywhere (path tiles).
for (let i = 0; i < W * H; i++) ground[i] = pickRandom(PATH);

// Wall ring.
const ENTRANCE_X = 7;
for (let x = 0; x < W; x++) {
  // North wall — leave one gap at the entrance.
  if (x !== ENTRANCE_X) collision[idx(x, 0)] = pickRandom(ROCK);
  // South wall — fully walled.
  collision[idx(x, H - 1)] = pickRandom(ROCK);
}
for (let y = 0; y < H; y++) {
  collision[idx(0, y)] = pickRandom(ROCK);
  collision[idx(W - 1, y)] = pickRandom(ROCK);
}

// Bar counter — 5 tiles along the south wall (interior side, y = H - 3).
for (let x = 5; x <= 9; x++) {
  collision[idx(x, H - 3)] = pickRandom(ROCK);
}

// Two scattered tables.
collision[idx(4, 6)] = pickRandom(ROCK);
collision[idx(10, 8)] = pickRandom(ROCK);

const tmj = {
  compressionlevel: -1,
  height: H,
  infinite: false,
  layers: [
    { data: ground, height: H, id: 1, name: 'ground', opacity: 1, type: 'tilelayer', visible: true, width: W, x: 0, y: 0 },
    { data: collision, height: H, id: 2, name: 'collision', opacity: 1, type: 'tilelayer', visible: true, width: W, x: 0, y: 0 },
    { data: overlay, height: H, id: 3, name: 'overlay', opacity: 1, type: 'tilelayer', visible: true, width: W, x: 0, y: 0 },
  ],
  nextlayerid: 4,
  nextobjectid: 1,
  orientation: 'isometric',
  renderorder: 'right-down',
  tiledversion: '1.11.0',
  tileheight: 32,
  tilesets: [
    {
      firstgid: 1,
      columns: 11,
      image: '../tilesets/world.png',
      imageheight: 704,
      imagewidth: 704,
      margin: 0,
      name: 'world',
      spacing: 0,
      tilecount: 121,
      tileheight: 64,
      tilewidth: 64,
    },
  ],
  tilewidth: 64,
  type: 'map',
  version: '1.10',
  width: W,
};

writeFileSync(OUT, JSON.stringify(tmj, null, 2) + '\n');
console.log(`wrote ${OUT} (${W}×${H})`);
