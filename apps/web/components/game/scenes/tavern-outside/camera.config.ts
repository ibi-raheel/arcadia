import type { PixelRect } from '../shared/types';

export const TAVERN_OUTSIDE_IMAGE_SIZE = { width: 2508, height: 2508 } as const;

const BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: TAVERN_OUTSIDE_IMAGE_SIZE.width,
  height: TAVERN_OUTSIDE_IMAGE_SIZE.height,
};

export const tavernOutsideCameraConfig = {
  zoom: 0.6,
  followLerp: 0.12,
  deadzone: { width: 200, height: 150 },
  bounds: BOUNDS,
  fadeInMs: 400,
  fadeOutMs: 300,
} as const;
