#!/usr/bin/env node
// Tiled → Phaser import pipeline (ADR 0007 pattern).
//
// Usage:
//   node scripts/import-tiled-world.mjs <src-dir> <tmj-name> [--out-map <path>] [--out-tilesets <dir>]
//
// Defaults:
//   --out-map       apps/web/public/maps/arcadia-world.tmj
//   --out-tilesets  apps/web/public/tilesets-world
//
// Handles both external .tsx refs and inlined (embed-tilesets) tilesets.
// Base64 / CSV tile-layer encoding passes through untouched — Phaser handles
// both. Object layers pass through; Phaser's scene code spawns Sprites per
// object (see ADR 0007).

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function parseArgs(argv) {
  const [, , srcDir, tmjName, ...rest] = argv;
  if (!srcDir || !tmjName) {
    console.error('usage: node scripts/import-tiled-world.mjs <src-dir> <tmj-name>');
    process.exit(1);
  }
  let outMap = resolve(REPO_ROOT, 'apps/web/public/maps/arcadia-world.tmj');
  let outTilesets = resolve(REPO_ROOT, 'apps/web/public/tilesets-world');
  let webTilesetsRoot = '/tilesets-world';
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--out-map') outMap = resolve(REPO_ROOT, rest[++i]);
    else if (rest[i] === '--out-tilesets') {
      outTilesets = resolve(REPO_ROOT, rest[++i]);
      webTilesetsRoot = '/' + relative(resolve(REPO_ROOT, 'apps/web/public'), outTilesets);
    }
  }
  return { srcDir: resolve(srcDir), tmjName, outMap, outTilesets, webTilesetsRoot };
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\.(tsx|png|jpg|jpeg)$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseTsx(tsxPath) {
  const xml = readFileSync(tsxPath, 'utf-8');
  const name = xml.match(/<tileset[^>]*\sname="([^"]+)"/);
  const tw = xml.match(/\stilewidth="(\d+)"/);
  const th = xml.match(/\stileheight="(\d+)"/);
  const count = xml.match(/\stilecount="(\d+)"/);
  const cols = xml.match(/\scolumns="(\d+)"/);
  const img = xml.match(/<image[^>]*\ssource="([^"]+)"[^>]*\swidth="(\d+)"[^>]*\sheight="(\d+)"/);
  const alignment = xml.match(/\sobjectalignment="([^"]+)"/);
  if (!name || !tw || !th || !count || !cols || !img) {
    throw new Error(`failed to parse ${tsxPath}`);
  }
  return {
    name: name[1],
    tileWidth: parseInt(tw[1], 10),
    tileHeight: parseInt(th[1], 10),
    tileCount: parseInt(count[1], 10),
    columns: parseInt(cols[1], 10),
    imageSource: img[1],
    imageWidth: parseInt(img[2], 10),
    imageHeight: parseInt(img[3], 10),
    objectAlignment: alignment ? alignment[1] : null,
  };
}

function main() {
  const { srcDir, tmjName, outMap, outTilesets, webTilesetsRoot } = parseArgs(process.argv);
  const tmjPath = resolve(srcDir, tmjName);
  if (!existsSync(tmjPath)) {
    console.error(`TMJ not found: ${tmjPath}`);
    process.exit(1);
  }
  const tmj = JSON.parse(readFileSync(tmjPath, 'utf-8'));
  mkdirSync(outTilesets, { recursive: true });
  mkdirSync(dirname(outMap), { recursive: true });

  const newTilesets = [];
  const usedSlugs = new Set();
  let okCount = 0;
  let missingTsx = 0;
  let missingImg = 0;

  function nextSlug(hint) {
    let slug = slugify(hint);
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(hint)}-${n++}`;
    usedSlugs.add(slug);
    return slug;
  }

  for (const ts of tmj.tilesets ?? []) {
    if (!ts.source) {
      // Inlined (embed-tilesets) — rewrite image path, copy PNG.
      if (!ts.image) {
        newTilesets.push(ts);
        continue;
      }
      const imagePath = resolve(dirname(tmjPath), ts.image);
      const slug = nextSlug(ts.image.replace(/\.(png|jpg|jpeg)$/i, ''));
      const destRel = `${webTilesetsRoot}/${slug}.png`;
      const destAbs = resolve(outTilesets, `${slug}.png`);
      if (existsSync(imagePath)) {
        copyFileSync(imagePath, destAbs);
        okCount++;
      } else {
        console.warn(`⚠ missing image for "${ts.name}": ${ts.image}`);
        missingImg++;
      }
      newTilesets.push({ ...ts, image: destRel });
      continue;
    }

    // External .tsx — parse + inline + copy.
    const tsxPath = resolve(srcDir, ts.source);
    if (!existsSync(tsxPath)) {
      console.warn(`⚠ missing TSX: ${ts.source} (gid ${ts.firstgid}) — skipped`);
      missingTsx++;
      continue;
    }
    let parsed;
    try {
      parsed = parseTsx(tsxPath);
    } catch (e) {
      console.warn(`⚠ ${ts.source}: ${e.message} — skipped`);
      continue;
    }
    const imagePath = resolve(dirname(tsxPath), parsed.imageSource);
    const slug = nextSlug(relative(srcDir, tsxPath).replace(/\.(tsx|tmx)$/, ''));
    const destRel = `${webTilesetsRoot}/${slug}.png`;
    const destAbs = resolve(outTilesets, `${slug}.png`);
    if (existsSync(imagePath)) {
      copyFileSync(imagePath, destAbs);
      okCount++;
    } else {
      console.warn(`⚠ missing image for "${parsed.name}": ${parsed.imageSource}`);
      missingImg++;
    }
    newTilesets.push({
      firstgid: ts.firstgid,
      name: parsed.name,
      image: destRel,
      imagewidth: parsed.imageWidth,
      imageheight: parsed.imageHeight,
      tilewidth: parsed.tileWidth,
      tileheight: parsed.tileHeight,
      tilecount: parsed.tileCount,
      columns: parsed.columns,
      margin: 0,
      spacing: 0,
      ...(parsed.objectAlignment ? { objectalignment: parsed.objectAlignment } : {}),
    });
  }

  tmj.tilesets = newTilesets;
  writeFileSync(outMap, JSON.stringify(tmj));
  console.log(
    `→ wrote ${relative(REPO_ROOT, outMap)} (${tmj.width}×${tmj.height} tiles @ ${tmj.tilewidth}×${tmj.tileheight}, ${tmj.orientation})`,
  );
  console.log(
    `→ ${newTilesets.length} tilesets  ·  ${okCount} images copied  ·  ${missingTsx} missing tsx  ·  ${missingImg} missing images`,
  );
  console.log(`→ layers: ${tmj.layers.map((l) => `${l.name} (${l.type})`).join(', ')}`);
}

main();
