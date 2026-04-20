// Config-shape assertions for TavernScene. 2026-04-19 polish: tavern is
// image-backed (public/tavern-interior.png) rather than iso-tilemap, so
// these tests validate the flat-rect camera/spawn shape + the on-disk
// image's dimensions.

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { tavernCameraConfig, TAVERN_INTERIOR_SIZE } from '../camera.config';
import { tavernLayersConfig } from '../layers.config';
import { tavernSpritesConfig } from '../sprites.config';

describe('tavernCameraConfig', () => {
  it('has all required fields with sane values', () => {
    expect(tavernCameraConfig.zoom).toBeGreaterThan(0);
    expect(tavernCameraConfig.followLerp).toBeGreaterThan(0);
    expect(tavernCameraConfig.followLerp).toBeLessThanOrEqual(1);
    expect(tavernCameraConfig.deadzone.width).toBeGreaterThan(0);
    expect(tavernCameraConfig.deadzone.height).toBeGreaterThan(0);
    expect(tavernCameraConfig.fadeInMs).toBeGreaterThan(0);
    expect(tavernCameraConfig.fadeOutMs).toBeGreaterThan(0);
  });

  it('bounds match the tavern interior image dimensions (1376×768)', () => {
    expect(TAVERN_INTERIOR_SIZE).toEqual({ width: 1376, height: 768 });
    expect(tavernCameraConfig.bounds).toEqual({
      x: 0,
      y: 0,
      width: TAVERN_INTERIOR_SIZE.width,
      height: TAVERN_INTERIOR_SIZE.height,
    });
  });
});

describe('tavernSpritesConfig', () => {
  it('exposes an avatar block with the keys TavernScene reads', () => {
    expect(tavernSpritesConfig.avatar.spawnPixel).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
    });
    expect(tavernSpritesConfig.avatar.size.width).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.size.height).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.walkSpeed).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.clickArrivalThreshold).toBeGreaterThan(0);
    expect(tavernSpritesConfig.avatar.bodyOffset).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('does not expose an idleTimeoutMs (zero-delay state machine invariant)', () => {
    expect(tavernSpritesConfig.avatar).not.toHaveProperty('idleTimeoutMs');
  });

  it('spawn pixel lies inside the tavern interior bounds', () => {
    const { x, y } = tavernSpritesConfig.avatar.spawnPixel;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(TAVERN_INTERIOR_SIZE.width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(TAVERN_INTERIOR_SIZE.height);
  });
});

describe('tavernLayersConfig', () => {
  it('keeps the depth-band ordering intact (ground < dynamic)', () => {
    const d = tavernLayersConfig.depth;
    expect(d.ground).toBeLessThan(d.dynamic);
    expect(d.overlay).toBeLessThan(d.dynamic);
    expect(tavernLayersConfig.ySort.yAnchorRatio).toBeGreaterThan(0);
    expect(tavernLayersConfig.ySort.yAnchorRatio).toBeLessThanOrEqual(1);
  });
});

describe('tavern interior background image', () => {
  const imagePath = join(__dirname, '../../../../../public/tavern-interior.png');

  it('exists on disk at the path the asset manifest declares', () => {
    const stat = statSync(imagePath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });
});
