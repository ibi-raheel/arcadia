import { describe, expect, it } from 'vitest';

import {
  TAVERN_OUTSIDE_IMAGE_SIZE,
  tavernOutsideCameraConfig,
} from '../camera.config';
import {
  TAVERN_OUTSIDE_COLLIDERS,
  TAVERN_OUTSIDE_ENTRY_TRIGGERS,
  TAVERN_OUTSIDE_RETURN_EDGE,
  tavernOutsideLayersConfig,
} from '../layers.config';
import { tavernOutsideSpritesConfig } from '../sprites.config';

describe('tavern-outside configs', () => {
  it('camera bounds match image dimensions', () => {
    expect(tavernOutsideCameraConfig.bounds.width).toBe(TAVERN_OUTSIDE_IMAGE_SIZE.width);
    expect(tavernOutsideCameraConfig.bounds.height).toBe(TAVERN_OUTSIDE_IMAGE_SIZE.height);
  });

  it('spawn is inside image bounds and away from edges', () => {
    const { spawnPixel } = tavernOutsideSpritesConfig.avatar;
    expect(spawnPixel.x).toBeGreaterThan(100);
    expect(spawnPixel.x).toBeLessThan(TAVERN_OUTSIDE_IMAGE_SIZE.width - 100);
    expect(spawnPixel.y).toBeGreaterThan(100);
    expect(spawnPixel.y).toBeLessThan(TAVERN_OUTSIDE_IMAGE_SIZE.height - 100);
  });

  it('ships exactly three entry triggers with distinct building IDs', () => {
    expect(TAVERN_OUTSIDE_ENTRY_TRIGGERS).toHaveLength(3);
    const ids = TAVERN_OUTSIDE_ENTRY_TRIGGERS.map((t) => t.buildingId);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual(['tavern-a', 'tavern-b', 'tavern-c']);
  });

  it('every tavern entry targets /tavern with its buildingId in the query', () => {
    for (const t of TAVERN_OUTSIDE_ENTRY_TRIGGERS) {
      expect(t.route).toBe(`/tavern?b=${t.buildingId}`);
    }
  });

  it('return edge is the left pointing at /world', () => {
    expect(TAVERN_OUTSIDE_RETURN_EDGE.left?.route).toBe('/world');
    expect(TAVERN_OUTSIDE_RETURN_EDGE.right).toBeUndefined();
    expect(TAVERN_OUTSIDE_RETURN_EDGE.top).toBeUndefined();
    expect(TAVERN_OUTSIDE_RETURN_EDGE.bottom).toBeUndefined();
  });

  it('colliders is an array (empty until authored)', () => {
    expect(Array.isArray(TAVERN_OUTSIDE_COLLIDERS)).toBe(true);
    expect(Array.isArray(tavernOutsideLayersConfig.colliders)).toBe(true);
  });
});
