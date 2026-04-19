// Config-shape + tilemap-sync assertions for TavernScene.
// Mirrors scenes/world/__tests__/configs.test.ts — any future edit that
// drops a required config key fails CI before it ships.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { TAVERN_ENTRANCE_TILE, TAVERN_SPAWN_TILE, tavernSpritesConfig } from '../sprites.config';
import { TAVERN_TILE_DIMENSIONS, TAVERN_TILE_SIZE, tavernCameraConfig } from '../camera.config';
import { tavernLayersConfig } from '../layers.config';

describe('tavernCameraConfig', () => {
  it('has all required fields with sane values', () => {
    expect(tavernCameraConfig.zoom).toBeGreaterThan(0);
    expect(tavernCameraConfig.followLerp).toBeGreaterThan(0);
    expect(tavernCameraConfig.followLerp).toBeLessThanOrEqual(1);
    expect(tavernCameraConfig.deadzone.width).toBeGreaterThan(0);
    expect(tavernCameraConfig.deadzone.height).toBeGreaterThan(0);
    expect(tavernCameraConfig.fadeInMs).toBeGreaterThan(0);
    expect(tavernCameraConfig.fadeOutMs).toBeGreaterThan(0);
    expect(tavernCameraConfig.bounds).toHaveProperty('x');
    expect(tavernCameraConfig.bounds).toHaveProperty('y');
    expect(tavernCameraConfig.bounds).toHaveProperty('width');
    expect(tavernCameraConfig.bounds).toHaveProperty('height');
  });

  it('tile dimensions + size are 15×15 on a 64×32 iso grid', () => {
    expect(TAVERN_TILE_DIMENSIONS).toEqual({ width: 15, height: 15 });
    expect(TAVERN_TILE_SIZE).toEqual({ width: 64, height: 32 });
  });
});

describe('tavernSpritesConfig', () => {
  it('exposes an avatar block with the keys TavernScene reads', () => {
    expect(tavernSpritesConfig.avatar.spawnTile).toEqual(TAVERN_SPAWN_TILE);
    expect(tavernSpritesConfig.avatar.size.width).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.size.height).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.walkSpeed).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.clickArrivalThreshold).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.bodyOffset).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('does not expose an idleTimeoutMs (zero-delay state machine invariant)', () => {
    expect(tavernSpritesConfig.avatar).not.toHaveProperty('idleTimeoutMs');
  });
});

describe('tavernLayersConfig', () => {
  it('defines the three tilemap layers + depth bands in order', () => {
    expect(tavernLayersConfig.tilemapLayers).toEqual({
      ground: 'ground',
      collision: 'collision',
      overlay: 'overlay',
    });
    const d = tavernLayersConfig.depth;
    expect(d.ground).toBeLessThan(d.collisionVisuals);
    expect(d.overlay).toBeLessThan(d.dynamic);
    expect(d.collisionVisuals).toBeLessThan(d.dynamic);
    expect(tavernLayersConfig.ySort.yAnchorRatio).toBeGreaterThan(0);
    expect(tavernLayersConfig.ySort.yAnchorRatio).toBeLessThanOrEqual(1);
  });
});

describe('tavern.tmj ↔ config sync', () => {
  const tmjPath = join(__dirname, '../../../../../public/maps/tavern.tmj');
  const tmj = JSON.parse(readFileSync(tmjPath, 'utf8'));

  it('tilemap dimensions match the config', () => {
    expect(tmj.width).toBe(TAVERN_TILE_DIMENSIONS.width);
    expect(tmj.height).toBe(TAVERN_TILE_DIMENSIONS.height);
    expect(tmj.tilewidth).toBe(TAVERN_TILE_SIZE.width);
    expect(tmj.tileheight).toBe(TAVERN_TILE_SIZE.height);
    expect(tmj.orientation).toBe('isometric');
  });

  it('spawn tile is walkable (collision layer tile == 0)', () => {
    const collision = tmj.layers.find((l: { name: string }) => l.name === 'collision');
    const w = tmj.width;
    const { x, y } = TAVERN_SPAWN_TILE;
    expect(collision.data[y * w + x]).toBe(0);
  });

  it('entrance tile is walkable (gap in the north wall)', () => {
    const collision = tmj.layers.find((l: { name: string }) => l.name === 'collision');
    const w = tmj.width;
    const { x, y } = TAVERN_ENTRANCE_TILE;
    expect(collision.data[y * w + x]).toBe(0);
  });

  it('every non-entrance tile on the north wall is a collision tile', () => {
    const collision = tmj.layers.find((l: { name: string }) => l.name === 'collision');
    const w = tmj.width;
    for (let x = 0; x < w; x++) {
      if (x === TAVERN_ENTRANCE_TILE.x) continue;
      expect(collision.data[x]).not.toBe(0);
    }
  });
});
