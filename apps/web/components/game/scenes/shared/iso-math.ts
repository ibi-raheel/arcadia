// Tile ↔ pixel coordinate helpers for the world grid.
//
// Naming history: this file is called `iso-math.ts` because the Phase 1 plan
// and ADR 0004 name it so. Phase 1's placeholder tilemap uses *orthogonal*
// orientation with 64×32 rectangular tiles (see world.tmj + ADR 0001 §rendering
// discussion), so the math here is straightforward grid arithmetic — not
// isometric diamond projection. When real iso-style art lands we may switch
// orientation; these helpers get revisited at that point.

import type { TileCoord } from './types';

export type TileSize = { readonly width: number; readonly height: number };

/** Top-left pixel of a tile. */
export function tileToPixel(tile: TileCoord, tileSize: TileSize): { x: number; y: number } {
  return {
    x: tile.x * tileSize.width,
    y: tile.y * tileSize.height,
  };
}

/** Centre pixel of a tile — where an entity anchored bottom-centre would sit. */
export function tileCenterToPixel(tile: TileCoord, tileSize: TileSize): { x: number; y: number } {
  return {
    x: tile.x * tileSize.width + tileSize.width / 2,
    y: tile.y * tileSize.height + tileSize.height / 2,
  };
}

/** Which tile contains a given pixel coordinate. */
export function pixelToTile(pixel: { x: number; y: number }, tileSize: TileSize): TileCoord {
  return {
    x: Math.floor(pixel.x / tileSize.width),
    y: Math.floor(pixel.y / tileSize.height),
  };
}
