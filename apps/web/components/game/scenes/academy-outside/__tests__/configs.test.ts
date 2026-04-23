import { describe, expect, it } from 'vitest';

import { ACADEMY_OUTSIDE_IMAGE_SIZE, academyOutsideCameraConfig } from '../camera.config';
import {
  ACADEMY_OUTSIDE_COLLIDERS,
  ACADEMY_OUTSIDE_ENTRY_TRIGGERS,
  ACADEMY_OUTSIDE_RETURN_EDGE,
  academyOutsideLayersConfig,
} from '../layers.config';
import { academyOutsideSpritesConfig } from '../sprites.config';

describe('academy-outside configs', () => {
  it('camera bounds match image dimensions', () => {
    expect(academyOutsideCameraConfig.bounds.width).toBe(ACADEMY_OUTSIDE_IMAGE_SIZE.width);
    expect(academyOutsideCameraConfig.bounds.height).toBe(ACADEMY_OUTSIDE_IMAGE_SIZE.height);
  });

  it('spawn is inside image bounds and away from edges', () => {
    const { spawnPixel } = academyOutsideSpritesConfig.avatar;
    expect(spawnPixel.x).toBeGreaterThan(100);
    expect(spawnPixel.x).toBeLessThan(ACADEMY_OUTSIDE_IMAGE_SIZE.width - 100);
    expect(spawnPixel.y).toBeGreaterThan(100);
    expect(spawnPixel.y).toBeLessThan(ACADEMY_OUTSIDE_IMAGE_SIZE.height - 100);
  });

  it('ships one entry trigger pointing at /academy', () => {
    expect(ACADEMY_OUTSIDE_ENTRY_TRIGGERS).toHaveLength(1);
    expect(ACADEMY_OUTSIDE_ENTRY_TRIGGERS[0]?.route).toBe('/academy');
    expect(ACADEMY_OUTSIDE_ENTRY_TRIGGERS[0]?.buildingId).toBe('academy-main');
  });

  it('return edge is the bottom pointing at /world', () => {
    expect(ACADEMY_OUTSIDE_RETURN_EDGE.bottom?.route).toBe('/world');
    expect(ACADEMY_OUTSIDE_RETURN_EDGE.top).toBeUndefined();
    expect(ACADEMY_OUTSIDE_RETURN_EDGE.left).toBeUndefined();
    expect(ACADEMY_OUTSIDE_RETURN_EDGE.right).toBeUndefined();
  });

  it('colliders is an array (empty until authored)', () => {
    expect(Array.isArray(ACADEMY_OUTSIDE_COLLIDERS)).toBe(true);
    expect(Array.isArray(academyOutsideLayersConfig.colliders)).toBe(true);
  });
});
