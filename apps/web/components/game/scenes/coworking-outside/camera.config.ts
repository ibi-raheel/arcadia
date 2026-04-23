import type { PixelRect } from '../shared/types';

// Coworking-outside is the only outdoor scene with a non-square image —
// 2806×2242 matching the source art aspect ratio.
export const COWORKING_OUTSIDE_IMAGE_SIZE = { width: 2806, height: 2242 } as const;

const BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: COWORKING_OUTSIDE_IMAGE_SIZE.width,
  height: COWORKING_OUTSIDE_IMAGE_SIZE.height,
};

export const coworkingOutsideCameraConfig = {
  zoom: 0.6,
  followLerp: 0.12,
  deadzone: { width: 200, height: 150 },
  bounds: BOUNDS,
  fadeInMs: 400,
  fadeOutMs: 300,
} as const;
