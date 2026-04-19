import { describe, expect, it } from 'vitest';

import { pixelToTile, tileCenterToPixel, tileToPixel } from '../iso-math';

const TILE = { width: 64, height: 32 } as const;

describe('tileToPixel', () => {
  it('origin → origin', () => {
    expect(tileToPixel({ x: 0, y: 0 }, TILE)).toEqual({ x: 0, y: 0 });
  });

  it('scales by tile size', () => {
    expect(tileToPixel({ x: 3, y: 5 }, TILE)).toEqual({ x: 192, y: 160 });
  });
});

describe('tileCenterToPixel', () => {
  it('origin tile centre is half-width / half-height', () => {
    expect(tileCenterToPixel({ x: 0, y: 0 }, TILE)).toEqual({ x: 32, y: 16 });
  });

  it('adds half-tile offset', () => {
    expect(tileCenterToPixel({ x: 2, y: 4 }, TILE)).toEqual({
      x: 2 * 64 + 32,
      y: 4 * 32 + 16,
    });
  });
});

describe('pixelToTile', () => {
  it('round-trips tile → pixel → tile', () => {
    for (const tile of [
      { x: 0, y: 0 },
      { x: 15, y: 15 },
      { x: 29, y: 29 },
    ]) {
      const p = tileCenterToPixel(tile, TILE);
      expect(pixelToTile(p, TILE)).toEqual(tile);
    }
  });

  it('floors fractional positions to the containing tile', () => {
    // Pixel (127, 31) is within tile (1, 0) since 64 ≤ 127 < 128 and 0 ≤ 31 < 32.
    expect(pixelToTile({ x: 127, y: 31 }, TILE)).toEqual({ x: 1, y: 0 });
  });

  it('tile boundary (exact multiple) belongs to the higher tile', () => {
    expect(pixelToTile({ x: 64, y: 32 }, TILE)).toEqual({ x: 1, y: 1 });
  });
});
