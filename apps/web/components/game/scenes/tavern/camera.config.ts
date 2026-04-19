// Tavern interior camera + tilemap dimensions. ADR 0004: tweakable values
// live here, never in the scene class. Mirrors world/camera.config shape.

import type { PixelRect } from '../shared/types';

export const TAVERN_TILE_DIMENSIONS = { width: 15, height: 15 } as const;
export const TAVERN_TILE_SIZE = { width: 64, height: 32 } as const;

// Iso diamond extent for a 15×15 map with 64×32 tiles:
//   screenX = (tX - tY) * TW/2 → range -(14 * 32) .. (14 * 32) = ±448
//   screenY = (tX + tY) * TH/2 → range 0 .. (28 * 16) + 64 = 512
// Expand by half a tile on each side for camera headroom.
const CAM_BOUNDS: PixelRect = {
  x: -512,
  y: -32,
  width: 1024,
  height: 576,
};

export const tavernCameraConfig = {
  zoom: 1.5, // interior is small; zoom in a bit so it fills the canvas
  followLerp: 0.12,
  deadzone: { width: 120, height: 80 },
  bounds: CAM_BOUNDS,
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;
