import { describe, expect, it } from 'vitest';

import { pixelToTile, tileCenterToPixel, tileToPixel } from '../iso-math';

const TILE = { width: 32, height: 32 } as const;

// Iso projection: screenX = (tX - tY) * TW/2, screenY = (tX + tY) * TH/2.
// For 32×32 tiles: half-width = 16, half-height = 16.

describe('tileToPixel (iso top-vertex)', () => {
  it('origin tile → (0, 0)', () => {
    expect(tileToPixel({ x: 0, y: 0 }, TILE)).toEqual({ x: 0, y: 0 });
  });

  it('moving east in tile space → right + down on screen', () => {
    expect(tileToPixel({ x: 1, y: 0 }, TILE)).toEqual({ x: 16, y: 16 });
  });

  it('moving south in tile space → left + down on screen', () => {
    expect(tileToPixel({ x: 0, y: 1 }, TILE)).toEqual({ x: -16, y: 16 });
  });

  it('diagonal (1, 1) → straight down', () => {
    expect(tileToPixel({ x: 1, y: 1 }, TILE)).toEqual({ x: 0, y: 32 });
  });
});

describe('tileCenterToPixel', () => {
  it('origin tile centre is half-height below the top vertex', () => {
    expect(tileCenterToPixel({ x: 0, y: 0 }, TILE)).toEqual({ x: 0, y: 16 });
  });

  it('follows iso projection', () => {
    // Tile (3, 5): top = ((3-5)*16, (3+5)*16) = (-32, 128). Centre shifts down by 16.
    expect(tileCenterToPixel({ x: 3, y: 5 }, TILE)).toEqual({ x: -32, y: 144 });
  });
});

describe('pixelToTile', () => {
  it('round-trips tile → pixel-centre → tile for a spread of coords', () => {
    for (const tile of [
      { x: 0, y: 0 },
      { x: 5, y: 3 },
      { x: 15, y: 15 },
      { x: 29, y: 0 },
      { x: 0, y: 29 },
      { x: 29, y: 29 },
    ]) {
      const p = tileCenterToPixel(tile, TILE);
      expect(pixelToTile(p, TILE)).toEqual(tile);
    }
  });

  it('the iso diamond at tile centre resolves to that tile', () => {
    // Centre of tile (15, 15) is at pixel (0, 15*32 + 16) = (0, 496).
    expect(pixelToTile({ x: 0, y: 496 }, TILE)).toEqual({ x: 15, y: 15 });
  });
});
