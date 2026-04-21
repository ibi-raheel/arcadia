import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACADEMY_INTERIOR_SIZE, academyCameraConfig } from '../camera.config';
import { academyLayersConfig } from '../layers.config';
import { academySpritesConfig } from '../sprites.config';

describe('academyCameraConfig', () => {
  it('has sane values', () => {
    expect(academyCameraConfig.zoom).toBeGreaterThan(0);
    expect(academyCameraConfig.followLerp).toBeGreaterThan(0);
    expect(academyCameraConfig.followLerp).toBeLessThanOrEqual(1);
    expect(academyCameraConfig.fadeInMs).toBeGreaterThan(0);
    expect(academyCameraConfig.fadeOutMs).toBeGreaterThan(0);
  });

  it('bounds match the academy interior image dimensions (1536×1024)', () => {
    expect(ACADEMY_INTERIOR_SIZE).toEqual({ width: 1536, height: 1024 });
    expect(academyCameraConfig.bounds).toEqual({
      x: 0,
      y: 0,
      width: ACADEMY_INTERIOR_SIZE.width,
      height: ACADEMY_INTERIOR_SIZE.height,
    });
  });
});

describe('academySpritesConfig', () => {
  it('exposes the avatar + podium blocks AcademyScene reads', () => {
    expect(academySpritesConfig.avatar.spawnPixel).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
    });
    expect(academySpritesConfig.avatar.size.width).toBeGreaterThan(0);
    expect(academySpritesConfig.avatar.walkSpeed).toBeGreaterThan(0);

    expect(academySpritesConfig.podium.maxPerRow).toBeGreaterThan(0);
    expect(academySpritesConfig.podium.spacingX).toBeGreaterThan(0);
    expect(academySpritesConfig.podium.spacingY).toBeGreaterThan(0);
  });

  it('spawn pixel lies inside the academy interior bounds', () => {
    const { x, y } = academySpritesConfig.avatar.spawnPixel;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(ACADEMY_INTERIOR_SIZE.width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(ACADEMY_INTERIOR_SIZE.height);
  });
});

describe('academyLayersConfig', () => {
  it('keeps depth-band ordering intact (ground < podiums < dynamic < overlay)', () => {
    const d = academyLayersConfig.depth;
    expect(d.ground).toBeLessThan(d.podiums);
    expect(d.podiums).toBeLessThan(d.dynamic);
    expect(d.dynamic).toBeLessThan(d.overlay);
  });
});

describe('academy interior image', () => {
  const imagePath = join(__dirname, '../../../../../public/academy-interior.png');
  it('exists on disk at the path the asset manifest declares', () => {
    const stat = statSync(imagePath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });
});
