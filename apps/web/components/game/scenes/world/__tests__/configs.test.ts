// Config-shape assertions for WorldScene. Per ADR 0004 these double as a
// spec — future edits that drop a config key or desync from world.tmj fail
// CI before merge.
//
// The tilemap-sync test parses world.tmj and cross-validates that
// sprites.config building entrance/exit tiles sit on walkable (non-collision)
// positions, so a typo in either file is caught.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { WORLD_TILE_DIMENSIONS, WORLD_TILE_SIZE, worldCameraConfig } from '../camera.config';
import { worldLayersConfig } from '../layers.config';
import { worldSpritesConfig } from '../sprites.config';
import { AVATAR_COLORS, AVATAR_IDS } from '../../shared/avatar-palette';

const __dirname = dirname(fileURLToPath(import.meta.url));
// apps/web/components/game/scenes/world/__tests__ → apps/web/public/maps
const WORLD_TMJ_PATH = resolve(__dirname, '../../../../../public/maps/world.tmj');

type TiledLayer = {
  name: string;
  data: number[];
  width: number;
  height: number;
};
type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  orientation: string;
  layers: TiledLayer[];
};

describe('camera.config', () => {
  it('zoom, lerp, fade durations are positive numbers', () => {
    expect(worldCameraConfig.zoom).toBeGreaterThan(0);
    expect(worldCameraConfig.followLerp).toBeGreaterThan(0);
    expect(worldCameraConfig.followLerp).toBeLessThanOrEqual(1);
    expect(worldCameraConfig.fadeInMs).toBeGreaterThan(0);
    expect(worldCameraConfig.fadeOutMs).toBeGreaterThan(0);
  });

  it('deadzone is a non-negative width/height pair', () => {
    expect(worldCameraConfig.deadzone.width).toBeGreaterThanOrEqual(0);
    expect(worldCameraConfig.deadzone.height).toBeGreaterThanOrEqual(0);
  });

  it('bounds cover the full iso-diamond tilemap area', () => {
    // Iso map extent for WxH with tw=th=TS:
    //   x ∈ [-(H-1)*TS/2 - TS/2,  (W-1)*TS/2 + TS/2]  (left/right diamond wings)
    //   y ∈ [0,                    (W+H-2)*TS/2 + TS]
    const { bounds } = worldCameraConfig;
    const { cols, rows } = WORLD_TILE_DIMENSIONS;
    const { width: tw, height: th } = WORLD_TILE_SIZE;
    const expectedMinX = -(rows - 1) * (tw / 2) - tw / 2;
    const expectedMaxY = (cols + rows - 2) * (th / 2) + th;
    expect(bounds.x).toBe(expectedMinX);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBe(expectedMaxY);
  });
});

describe('sprites.config', () => {
  it('avatar has all required fields with sane types', () => {
    const a = worldSpritesConfig.avatar;
    expect(a.spawnTile.x).toBeGreaterThanOrEqual(0);
    expect(a.spawnTile.y).toBeGreaterThanOrEqual(0);
    expect(a.spawnTile.x).toBeLessThan(WORLD_TILE_DIMENSIONS.cols);
    expect(a.spawnTile.y).toBeLessThan(WORLD_TILE_DIMENSIONS.rows);
    expect(a.size.width).toBeGreaterThan(0);
    expect(a.size.height).toBeGreaterThan(0);
    expect(a.bodyOffset.width).toBeLessThanOrEqual(a.size.width);
    expect(a.bodyOffset.height).toBeLessThanOrEqual(a.size.height);
    expect(a.walkSpeed).toBeGreaterThan(0);
  });

  it('does NOT declare an idle timeout (zero-delay state toggle per plan)', () => {
    expect(worldSpritesConfig.avatar).not.toHaveProperty('idleTimeoutMs');
  });

  it('has entries for all 3 buildings with complete shape', () => {
    const expectedNames = ['tavern', 'academy', 'market'] as const;
    for (const name of expectedNames) {
      const b = worldSpritesConfig.buildings[name];
      expect(b.entranceTile.x).toBeGreaterThanOrEqual(0);
      expect(b.entranceTile.y).toBeGreaterThanOrEqual(0);
      expect(b.exitTile.x).toBeGreaterThanOrEqual(0);
      expect(b.exitTile.y).toBeGreaterThanOrEqual(0);
      expect(b.footprintRect.width).toBeGreaterThan(0);
      expect(b.footprintRect.height).toBeGreaterThan(0);
      expect(typeof b.fillColor).toBe('number');
    }
  });

  it('building fill colors are mutually distinct', () => {
    const colors = Object.values(worldSpritesConfig.buildings).map((b) => b.fillColor);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('layers.config', () => {
  it('tilemap layer names match world.tmj conventions', () => {
    expect(worldLayersConfig.tilemapLayers).toEqual({
      ground: 'ground',
      collision: 'collision',
      overlay: 'overlay',
    });
  });

  it('depth bands are strictly ordered (ground < collision < dynamic < overlay)', () => {
    const { depth } = worldLayersConfig;
    expect(depth.ground).toBeLessThan(depth.collisionVisuals);
    expect(depth.collisionVisuals).toBeLessThan(depth.dynamic);
    expect(depth.dynamic).toBeLessThan(depth.overlay);
  });

  it('y-sort anchor ratio is within [0, 1]', () => {
    expect(worldLayersConfig.ySort.yAnchorRatio).toBeGreaterThanOrEqual(0);
    expect(worldLayersConfig.ySort.yAnchorRatio).toBeLessThanOrEqual(1);
  });
});

describe('avatar-palette', () => {
  it('exactly 8 stable avatar ids', () => {
    expect(AVATAR_IDS.length).toBe(8);
    expect(AVATAR_IDS[0]).toBe('avatar-01');
    expect(AVATAR_IDS[7]).toBe('avatar-08');
  });

  it('every avatar id maps to a color', () => {
    for (const id of AVATAR_IDS) {
      expect(AVATAR_COLORS[id]).toBeTypeOf('number');
    }
  });

  it('avatar colors are mutually distinct', () => {
    const colors = Object.values(AVATAR_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('sprites.config ↔ world.tmj sync', () => {
  const map: TiledMap = JSON.parse(readFileSync(WORLD_TMJ_PATH, 'utf8'));
  const collision = map.layers.find((l) => l.name === 'collision');
  const ground = map.layers.find((l) => l.name === 'ground');

  if (!collision || !ground) {
    throw new Error('world.tmj missing required layers');
  }

  const tileAt = (layer: TiledLayer, coord: { x: number; y: number }) =>
    layer.data[coord.y * layer.width + coord.x];

  it('tilemap grid matches WORLD_TILE_DIMENSIONS + WORLD_TILE_SIZE', () => {
    expect(map.width).toBe(WORLD_TILE_DIMENSIONS.cols);
    expect(map.height).toBe(WORLD_TILE_DIMENSIONS.rows);
    expect(map.tilewidth).toBe(WORLD_TILE_SIZE.width);
    expect(map.tileheight).toBe(WORLD_TILE_SIZE.height);
    expect(map.orientation).toBe('isometric');
  });

  it('avatar spawn tile is walkable (no collision wall)', () => {
    expect(tileAt(collision, worldSpritesConfig.avatar.spawnTile)).toBe(0);
  });

  it('every building entrance tile is walkable', () => {
    for (const [name, b] of Object.entries(worldSpritesConfig.buildings)) {
      expect(tileAt(collision, b.entranceTile), `${name} entrance`).toBe(0);
    }
  });

  it('every building exit tile is walkable', () => {
    for (const [name, b] of Object.entries(worldSpritesConfig.buildings)) {
      expect(tileAt(collision, b.exitTile), `${name} exit`).toBe(0);
    }
  });
});
