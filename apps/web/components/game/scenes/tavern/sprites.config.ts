// Tavern sprites + spawn config. Mirrors world/sprites.config.avatar shape
// so the LocalAvatar class doesn't need tavern-specific knowledge.

import type { TileCoord } from '../shared/types';

// Entrance tile on the north wall of tavern.tmj (see
// scripts/generate-tavern-tmj.mjs). Avatars spawn one tile south of the
// entrance (inside the room).
export const TAVERN_ENTRANCE_TILE: TileCoord = { x: 7, y: 0 };
export const TAVERN_SPAWN_TILE: TileCoord = { x: 7, y: 1 };
// Exit tile on the world map when returning from the Tavern — matches
// worldSpritesConfig.buildings.tavern.exitTile (south side of footprint).

export const tavernSpritesConfig = {
  avatar: {
    spawnTile: TAVERN_SPAWN_TILE,
    size: { width: 64, height: 64 },
    // Same feet-only body offset as WorldScene so collision vs walls feels
    // identical across scenes.
    bodyOffset: { x: 20, y: 44, width: 24, height: 16 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
