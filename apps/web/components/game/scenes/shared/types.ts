// Cross-scene TS types. Narrowly-scoped unions that multiple scenes (or
// a scene + a React page) need to agree on.

export type Direction = 'up' | 'down' | 'left' | 'right';

// Iso-world facing directions. With 2:1 iso tilemap orientation, the four
// cardinal screen quadrants map to the four iso diamond corners:
//   vx≥0, vy<0  → ne  (screen up-right)
//   vx≥0, vy≥0  → se  (screen down-right)
//   vx<0, vy≥0  → sw  (screen down-left)
//   vx<0, vy<0  → nw  (screen up-left)
// See velocityToIsoDirection in scenes/world/input.ts for the bucketer.
export const ISO_DIRECTIONS = ['ne', 'se', 'nw', 'sw'] as const;
export type IsoDirection = (typeof ISO_DIRECTIONS)[number];

export const AVATAR_ACTIONS = ['idle', 'run'] as const;
export type AvatarAction = (typeof AVATAR_ACTIONS)[number];

export const BUILDING_NAMES = ['tavern', 'academy', 'market'] as const;
export type BuildingName = (typeof BUILDING_NAMES)[number];

export function isBuildingName(value: string): value is BuildingName {
  return (BUILDING_NAMES as readonly string[]).includes(value);
}

export type TileCoord = { readonly x: number; readonly y: number };

export type PixelRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};
