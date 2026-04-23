// Outdoor town-square image-backed camera. The image is 2508×2508 (replaces
// the ADR-0007 Tiled orthogonal world at /world, 2026-04-22). Zoom 1.0 so the
// user-supplied pixel art renders at its authored scale and the avatar stays
// readable at 90×90.

import type { PixelRect } from '../shared/types';

/** Pixel dimensions of `public/worlds/square-2508x2508.png`. */
export const SQUARE_IMAGE_SIZE = { width: 2508, height: 2508 } as const;

const SQUARE_CAM_BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: SQUARE_IMAGE_SIZE.width,
  height: SQUARE_IMAGE_SIZE.height,
};

export const squareCameraConfig = {
  zoom: 0.6,
  followLerp: 0.12,
  deadzone: { width: 200, height: 150 },
  bounds: SQUARE_CAM_BOUNDS,
  fadeInMs: 400,
  fadeOutMs: 300,
} as const;
