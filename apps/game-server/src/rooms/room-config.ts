// Per-room static config: spawn positions + coarse bounds used by the MOVE
// validator. Bounds are deliberately generous — a loose DoS guard against
// clients claiming absurd coordinates, not a tile-perfect collision check
// (tilemap collision is enforced client-side by Phase 1 Arcade Physics).
//
// Spawn x / y match the client's iso projection of
// `worldSpritesConfig.avatar.spawnTile` at 64×32 (2:1): pixelX = (tx-ty)*32,
// pixelY = (tx+ty)*16. World spawn tile is (15, 15) → (0, 480). Tavern
// interior lands in Phase 2 Week 7 Step 10 — placeholder (0, 0) for now.

export type RoomBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
};

export type RoomConfig = {
  readonly spawn: { readonly x: number; readonly y: number };
  readonly bounds: RoomBounds;
};

export const ROOM_CONFIGS: Record<string, RoomConfig> = {
  'world-realm1': {
    spawn: { x: 0, y: 480 },
    // 30×30 iso map: screenX extent ±(29 * 32), screenY extent up to (29 * 16) + one tile
    bounds: { minX: -1200, maxX: 1200, minY: -100, maxY: 1000 },
  },
  'tavern-realm1': {
    spawn: { x: 0, y: 0 },
    // Interior room — tightened once tavern.tmj lands.
    bounds: { minX: -600, maxX: 600, minY: -100, maxY: 600 },
  },
};

export const DEFAULT_ROOM_CONFIG: RoomConfig = ROOM_CONFIGS['world-realm1']!;

export function getRoomConfig(roomName: string): RoomConfig {
  return ROOM_CONFIGS[roomName] ?? DEFAULT_ROOM_CONFIG;
}
