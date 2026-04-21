// Academy interior camera + world-size constants. Mirrors TavernScene's
// image-backed flat-rect setup: bounds = source image dimensions, no iso
// projection, no colliders yet.

import type { PixelRect } from '../shared/types';

/** Pixel dimensions of `public/academy-interior.png`. */
export const ACADEMY_INTERIOR_SIZE = { width: 1536, height: 1024 } as const;

const ACADEMY_CAM_BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: ACADEMY_INTERIOR_SIZE.width,
  height: ACADEMY_INTERIOR_SIZE.height,
};

export const academyCameraConfig = {
  // Same zoom as the new Tavern — feels consistent building-to-building.
  zoom: 1.365,
  followLerp: 0.12,
  deadzone: { width: 120, height: 80 },
  bounds: ACADEMY_CAM_BOUNDS,
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;
