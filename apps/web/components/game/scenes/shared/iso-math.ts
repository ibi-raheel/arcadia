// Tile ↔ pixel coordinate helpers for the isometric world grid.
//
// Phase 1 uses Tiled `orientation: "isometric"` with 32×32 source tiles drawn
// as diamonds. In iso, the grid lines align with screen diagonals — cardinal
// world directions N/E/S/W appear at 45° on screen.
//
// Phaser's isometric tilemap uses this projection, so our math must match:
//   screenX = (tileX - tileY) * (tileWidth  / 2)
//   screenY = (tileX + tileY) * (tileHeight / 2)
//
// `tileToPixel` returns the **top vertex** of the diamond (matches Phaser's
// iso tile anchor). `tileCenterToPixel` returns the diamond's centroid —
// i.e. where an entity whose origin is (0.5, 0.5) visually sits on the tile.

import type { TileCoord } from './types';

export type TileSize = { readonly width: number; readonly height: number };

/** Top vertex of an iso tile's diamond. */
export function tileToPixel(tile: TileCoord, tileSize: TileSize): { x: number; y: number } {
  return {
    x: (tile.x - tile.y) * (tileSize.width / 2),
    y: (tile.x + tile.y) * (tileSize.height / 2),
  };
}

/** Centre of an iso tile's diamond — vertical midpoint of the rhombus. */
export function tileCenterToPixel(tile: TileCoord, tileSize: TileSize): { x: number; y: number } {
  return {
    x: (tile.x - tile.y) * (tileSize.width / 2),
    y: (tile.x + tile.y) * (tileSize.height / 2) + tileSize.height / 2,
  };
}

/**
 * Which tile contains a given world-space pixel (after accounting for the
 * tile-centre offset used by `tileCenterToPixel`).
 *
 * Derivation: from the forward projection,
 *   sX = (tX - tY) * TW/2
 *   sY = (tX + tY) * TH/2 + TH/2
 * let y' = sY - TH/2, so
 *   tX = sX / TW + y' / TH
 *   tY = y' / TH - sX / TW
 */
export function pixelToTile(pixel: { x: number; y: number }, tileSize: TileSize): TileCoord {
  const adjY = pixel.y - tileSize.height / 2;
  const tileX = pixel.x / tileSize.width + adjY / tileSize.height;
  const tileY = adjY / tileSize.height - pixel.x / tileSize.width;
  return { x: Math.floor(tileX), y: Math.floor(tileY) };
}
