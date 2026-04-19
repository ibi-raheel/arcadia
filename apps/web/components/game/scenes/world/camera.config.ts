// WorldScene camera configuration. All runtime-tweakable camera values live
// here — WorldScene.ts imports this module and never hardcodes these numbers.
// ADR 0004 convention.
//
// World bounds derive from world.tmj: 30 tiles wide × 30 tiles tall × 64×32 px
// per tile = 1920 × 960 logical pixels. Keep this in sync with world.tmj — if
// the tilemap is resized, update `bounds` here and the test in __tests__ will
// cross-validate.

export const WORLD_TILE_SIZE = { width: 64, height: 32 } as const;
export const WORLD_TILE_DIMENSIONS = { cols: 30, rows: 30 } as const;

export const worldCameraConfig = {
  zoom: 1.0,
  followLerp: 0.1,
  deadzone: { width: 200, height: 150 },
  bounds: {
    x: 0,
    y: 0,
    width: WORLD_TILE_DIMENSIONS.cols * WORLD_TILE_SIZE.width,
    height: WORLD_TILE_DIMENSIONS.rows * WORLD_TILE_SIZE.height,
  },
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;

export type WorldCameraConfig = typeof worldCameraConfig;
