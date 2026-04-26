// Per-room static config: spawn positions + coarse bounds used by the MOVE
// validator. Bounds are deliberately generous — a loose DoS guard against
// clients claiming absurd coordinates, not a tile-perfect collision check
// (collision is enforced client-side).
//
// **Coordinate system: image-backed pixel space.** Origin (0, 0) is the
// top-left of each scene's background PNG; positive X right, positive Y
// down. Spawn coords + bounds must mirror what the client's
// `*/sprites.config.ts` and `*/camera.config.ts` use — desync there
// causes silent server-side clamping (see PR #45 fix; for the gory details
// of the bug, the symptom was peers seeing each other at clamped coords
// after the world swapped from the iso 30×30 map to image-backed scenes
// on 2026-04-22 but server bounds were forgotten).

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
  // Central square: image-backed at `public/worlds/square-2508x2508.png`.
  // Client default spawn = `squareSpritesConfig.avatar.spawnPixel` (1254, 1380).
  'world-realm1': {
    spawn: { x: 1254, y: 1380 },
    bounds: { minX: 0, maxX: 2508, minY: 0, maxY: 2508 },
  },
  // Tavern interior: image-backed at `public/tavern-interior.png` (1536×1024).
  // Client default spawn = `tavernSpritesConfig.avatar.spawnPixel` (768, 960).
  'tavern-realm1': {
    spawn: { x: 768, y: 960 },
    bounds: { minX: 0, maxX: 1536, minY: 0, maxY: 1024 },
  },
  // Coworking tent interior: image-backed (2508×2508). `tavern-realm1` and
  // this share the same RealmRoom class; per-building sharding is done via
  // filterBy in `index.ts`, not here.
  'coworking-realm1': {
    spawn: { x: 1254, y: 1254 },
    bounds: { minX: 0, maxX: 2508, minY: 0, maxY: 2508 },
  },
};

export const DEFAULT_ROOM_CONFIG: RoomConfig = ROOM_CONFIGS['world-realm1']!;

export function getRoomConfig(roomName: string): RoomConfig {
  return ROOM_CONFIGS[roomName] ?? DEFAULT_ROOM_CONFIG;
}
