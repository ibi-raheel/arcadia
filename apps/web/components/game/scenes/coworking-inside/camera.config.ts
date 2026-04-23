import type { PixelRect } from '../shared/types';

export const COWORKING_INSIDE_IMAGE_SIZE = { width: 2508, height: 2508 } as const;

const BOUNDS: PixelRect = {
  x: 0,
  y: 0,
  width: COWORKING_INSIDE_IMAGE_SIZE.width,
  height: COWORKING_INSIDE_IMAGE_SIZE.height,
};

export const coworkingInsideCameraConfig = {
  zoom: 1.0,
  followLerp: 0.12,
  deadzone: { width: 200, height: 150 },
  bounds: BOUNDS,
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;
