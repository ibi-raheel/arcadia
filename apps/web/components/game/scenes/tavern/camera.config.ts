// Tavern interior camera + world-size constants. 2026-04-19 polish: the
// tavern is now a single image (1376×768, `public/tavern-interior.png`)
// rather than an iso tilemap, so bounds are a flat rectangle matching the
// image's pixel dimensions. Colliders will be added later; in the interim
// the world physics bounds keep the avatar inside the image.

import type { PixelRect } from '../shared/types';

/** Pixel dimensions of `public/tavern-interior.png`. */
export const TAVERN_INTERIOR_SIZE = { width: 1376, height: 768 } as const;

const TAVERN_CAM_BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: TAVERN_INTERIOR_SIZE.width,
  height: TAVERN_INTERIOR_SIZE.height,
};

export const tavernCameraConfig = {
  // 1.05× — zoomed out 30% from the original 1.5× (2026-04-20) to pair with
  // the +25% avatar bump; more of the interior stays on screen.
  zoom: 1.05,
  followLerp: 0.12,
  deadzone: { width: 120, height: 80 },
  bounds: TAVERN_CAM_BOUNDS,
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;
