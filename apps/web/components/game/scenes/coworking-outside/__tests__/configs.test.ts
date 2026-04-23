import { describe, expect, it } from 'vitest';

import {
  COWORKING_OUTSIDE_IMAGE_SIZE,
  coworkingOutsideCameraConfig,
} from '../camera.config';
import {
  COWORKING_OUTSIDE_COLLIDERS,
  COWORKING_OUTSIDE_ENTRY_TRIGGERS,
  COWORKING_OUTSIDE_RETURN_EDGE,
  coworkingOutsideLayersConfig,
} from '../layers.config';
import { coworkingOutsideSpritesConfig } from '../sprites.config';

describe('coworking-outside configs', () => {
  it('camera bounds match the non-square image dimensions', () => {
    expect(coworkingOutsideCameraConfig.bounds.width).toBe(COWORKING_OUTSIDE_IMAGE_SIZE.width);
    expect(coworkingOutsideCameraConfig.bounds.height).toBe(COWORKING_OUTSIDE_IMAGE_SIZE.height);
    expect(COWORKING_OUTSIDE_IMAGE_SIZE.width).not.toBe(COWORKING_OUTSIDE_IMAGE_SIZE.height);
  });

  it('spawn is inside image bounds and away from edges', () => {
    const { spawnPixel } = coworkingOutsideSpritesConfig.avatar;
    expect(spawnPixel.x).toBeGreaterThan(100);
    expect(spawnPixel.x).toBeLessThan(COWORKING_OUTSIDE_IMAGE_SIZE.width - 100);
    expect(spawnPixel.y).toBeGreaterThan(100);
    expect(spawnPixel.y).toBeLessThan(COWORKING_OUTSIDE_IMAGE_SIZE.height - 100);
  });

  it('ships exactly five entry triggers with distinct building IDs', () => {
    expect(COWORKING_OUTSIDE_ENTRY_TRIGGERS).toHaveLength(5);
    const ids = COWORKING_OUTSIDE_ENTRY_TRIGGERS.map((t) => t.buildingId);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toEqual(['tent-1', 'tent-2', 'tent-3', 'tent-4', 'tent-5']);
  });

  it('every tent entry targets /coworking/inside with its buildingId in the query', () => {
    for (const t of COWORKING_OUTSIDE_ENTRY_TRIGGERS) {
      expect(t.route).toBe(`/coworking/inside?b=${t.buildingId}`);
    }
  });

  it('return edge is the right pointing at /world', () => {
    expect(COWORKING_OUTSIDE_RETURN_EDGE.right?.route).toBe('/world');
    expect(COWORKING_OUTSIDE_RETURN_EDGE.left).toBeUndefined();
    expect(COWORKING_OUTSIDE_RETURN_EDGE.top).toBeUndefined();
    expect(COWORKING_OUTSIDE_RETURN_EDGE.bottom).toBeUndefined();
  });

  it('colliders is an array (empty until authored)', () => {
    expect(Array.isArray(COWORKING_OUTSIDE_COLLIDERS)).toBe(true);
    expect(Array.isArray(coworkingOutsideLayersConfig.colliders)).toBe(true);
  });
});
