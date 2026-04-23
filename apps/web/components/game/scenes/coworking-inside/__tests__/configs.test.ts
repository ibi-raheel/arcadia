import { describe, expect, it } from 'vitest';

import { COWORKING_INSIDE_IMAGE_SIZE, coworkingInsideCameraConfig } from '../camera.config';
import {
  COWORKING_INSIDE_COLLIDERS,
  COWORKING_INSIDE_RETURN_EDGE,
  coworkingInsideLayersConfig,
} from '../layers.config';
import { coworkingInsideSpritesConfig } from '../sprites.config';

describe('coworking-inside configs', () => {
  it('camera bounds match image dimensions', () => {
    expect(coworkingInsideCameraConfig.bounds.width).toBe(COWORKING_INSIDE_IMAGE_SIZE.width);
    expect(coworkingInsideCameraConfig.bounds.height).toBe(COWORKING_INSIDE_IMAGE_SIZE.height);
  });

  it('spawn is inside image bounds', () => {
    const { spawnPixel } = coworkingInsideSpritesConfig.avatar;
    expect(spawnPixel.x).toBeGreaterThan(0);
    expect(spawnPixel.x).toBeLessThan(COWORKING_INSIDE_IMAGE_SIZE.width);
    expect(spawnPixel.y).toBeGreaterThan(0);
    expect(spawnPixel.y).toBeLessThan(COWORKING_INSIDE_IMAGE_SIZE.height);
  });

  it('return edge is bottom pointing at /coworking', () => {
    expect(COWORKING_INSIDE_RETURN_EDGE.bottom?.route).toBe('/coworking');
  });

  it('colliders is an array (empty until authored)', () => {
    expect(Array.isArray(COWORKING_INSIDE_COLLIDERS)).toBe(true);
    expect(Array.isArray(coworkingInsideLayersConfig.colliders)).toBe(true);
  });
});
