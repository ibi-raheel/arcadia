// Market interior camera + world-size constants. Mirrors AcademyScene's
// image-backed flat-rect setup: bounds = source image dimensions, no iso
// projection, no colliders yet.

import type { PixelRect } from '../shared/types';

/** Pixel dimensions of `public/market-interior.png`. */
export const MARKET_INTERIOR_SIZE = { width: 1536, height: 1024 } as const;

const MARKET_CAM_BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: MARKET_INTERIOR_SIZE.width,
  height: MARKET_INTERIOR_SIZE.height,
};

export const marketCameraConfig = {
  // Matches Tavern + Academy for visual consistency building-to-building.
  zoom: 1.365,
  followLerp: 0.12,
  deadzone: { width: 120, height: 80 },
  bounds: MARKET_CAM_BOUNDS,
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;
