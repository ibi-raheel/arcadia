// ADR 0004 requires a config-shape assertion per scene so a future edit that
// drops a config key fails CI. Also verifies the edge-trigger wiring so the
// four cardinal exits remain correct.

import { describe, expect, it } from 'vitest';

import { SQUARE_IMAGE_SIZE, squareCameraConfig } from '../camera.config';
import { SQUARE_COLLIDERS, SQUARE_EDGE_TRIGGERS, squareLayersConfig } from '../layers.config';
import { squareSpritesConfig } from '../sprites.config';

describe('square camera config', () => {
  it('bounds match the source image dimensions', () => {
    expect(squareCameraConfig.bounds.width).toBe(SQUARE_IMAGE_SIZE.width);
    expect(squareCameraConfig.bounds.height).toBe(SQUARE_IMAGE_SIZE.height);
  });

  it('declares zoom, follow, deadzone, fade knobs', () => {
    expect(typeof squareCameraConfig.zoom).toBe('number');
    expect(typeof squareCameraConfig.followLerp).toBe('number');
    expect(squareCameraConfig.deadzone).toHaveProperty('width');
    expect(squareCameraConfig.deadzone).toHaveProperty('height');
    expect(typeof squareCameraConfig.fadeInMs).toBe('number');
  });
});

describe('square sprites config', () => {
  it('spawn sits inside image bounds', () => {
    expect(squareSpritesConfig.avatar.spawnPixel.x).toBeGreaterThan(0);
    expect(squareSpritesConfig.avatar.spawnPixel.x).toBeLessThan(SQUARE_IMAGE_SIZE.width);
    expect(squareSpritesConfig.avatar.spawnPixel.y).toBeGreaterThan(0);
    expect(squareSpritesConfig.avatar.spawnPixel.y).toBeLessThan(SQUARE_IMAGE_SIZE.height);
  });

  it('declares size + body offset + walk speed', () => {
    expect(squareSpritesConfig.avatar.size.width).toBeGreaterThan(0);
    expect(squareSpritesConfig.avatar.bodyOffset.width).toBeGreaterThan(0);
    expect(squareSpritesConfig.avatar.walkSpeed).toBeGreaterThan(0);
  });
});

describe('square layers config', () => {
  it('colliders is an array (empty until rects are authored)', () => {
    expect(Array.isArray(SQUARE_COLLIDERS)).toBe(true);
    expect(Array.isArray(squareLayersConfig.colliders)).toBe(true);
  });

  it('all four cardinal edges have routes', () => {
    expect(SQUARE_EDGE_TRIGGERS.top?.route).toBe('/academy-outside');
    expect(SQUARE_EDGE_TRIGGERS.right?.route).toBe('/tavern-outside');
    expect(SQUARE_EDGE_TRIGGERS.bottom?.route).toBe('/market');
    expect(SQUARE_EDGE_TRIGGERS.left?.route).toBe('/coworking');
  });

  it('depth bands are ordered ground < overlay < dynamic', () => {
    expect(squareLayersConfig.depth.ground).toBeLessThan(squareLayersConfig.depth.overlay);
    expect(squareLayersConfig.depth.overlay).toBeLessThan(squareLayersConfig.depth.dynamic);
  });
});
