// Tavern interior camera + world-size constants. 2026-04-20: interior art
// bumped to 1536×1024 (user-supplied); camera zoomed in 30% to compensate
// for the −30% avatar scale so characters still read at a similar on-screen
// size.

import type { PixelRect } from '../shared/types';

/** Pixel dimensions of `public/tavern-interior.png`. */
export const TAVERN_INTERIOR_SIZE = { width: 1536, height: 1024 } as const;

const TAVERN_CAM_BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: TAVERN_INTERIOR_SIZE.width,
  height: TAVERN_INTERIOR_SIZE.height,
};

export const tavernCameraConfig = {
  // 1.365× — 1.05 × 1.3 (user bumped +30% 2026-04-20 alongside the avatar
  // downscale to 90×90). Characters stay readable; more interior detail
  // at the cost of on-screen breadth.
  zoom: 1.0,
  followLerp: 0.12,
  deadzone: { width: 120, height: 80 },
  bounds: TAVERN_CAM_BOUNDS,
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;
