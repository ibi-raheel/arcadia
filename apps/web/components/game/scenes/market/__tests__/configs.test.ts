import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MARKET_INTERIOR_SIZE, marketCameraConfig } from '../camera.config';
import { marketLayersConfig } from '../layers.config';
import { marketSpritesConfig } from '../sprites.config';

describe('marketCameraConfig', () => {
  it('has sane values', () => {
    expect(marketCameraConfig.zoom).toBeGreaterThan(0);
    expect(marketCameraConfig.followLerp).toBeGreaterThan(0);
    expect(marketCameraConfig.followLerp).toBeLessThanOrEqual(1);
    expect(marketCameraConfig.fadeInMs).toBeGreaterThan(0);
  });

  it('bounds match the market interior image dimensions (1536×1024)', () => {
    expect(MARKET_INTERIOR_SIZE).toEqual({ width: 1536, height: 1024 });
    expect(marketCameraConfig.bounds).toEqual({
      x: 0,
      y: 0,
      width: MARKET_INTERIOR_SIZE.width,
      height: MARKET_INTERIOR_SIZE.height,
    });
  });
});

describe('marketSpritesConfig', () => {
  it('exposes avatar + crystal blocks MarketScene reads', () => {
    expect(marketSpritesConfig.avatar.spawnPixel).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
    });
    expect(marketSpritesConfig.avatar.size.width).toBeGreaterThan(0);
    expect(marketSpritesConfig.crystal.centerX).toBeGreaterThan(0);
    expect(marketSpritesConfig.crystal.centerY).toBeGreaterThan(0);
    expect(marketSpritesConfig.crystal.pedestalWidth).toBeGreaterThan(0);
    expect(marketSpritesConfig.crystal.interactRadius).toBeGreaterThan(0);
  });

  it('spawn pixel lies inside the market interior bounds', () => {
    const { x, y } = marketSpritesConfig.avatar.spawnPixel;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(MARKET_INTERIOR_SIZE.width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(MARKET_INTERIOR_SIZE.height);
  });

  it('crystal sits inside the market interior bounds', () => {
    const { centerX, centerY } = marketSpritesConfig.crystal;
    expect(centerX).toBeGreaterThanOrEqual(0);
    expect(centerX).toBeLessThanOrEqual(MARKET_INTERIOR_SIZE.width);
    expect(centerY).toBeGreaterThanOrEqual(0);
    expect(centerY).toBeLessThanOrEqual(MARKET_INTERIOR_SIZE.height);
  });
});

describe('marketLayersConfig', () => {
  it('keeps depth-band ordering intact', () => {
    const d = marketLayersConfig.depth;
    expect(d.ground).toBeLessThan(d.stalls);
    expect(d.stalls).toBeLessThan(d.dynamic);
    expect(d.dynamic).toBeLessThan(d.overlay);
  });
});

describe('market interior image', () => {
  const imagePath = join(__dirname, '../../../../../public/market-interior.png');
  it('exists on disk at the path the asset manifest declares', () => {
    const stat = statSync(imagePath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });
});
