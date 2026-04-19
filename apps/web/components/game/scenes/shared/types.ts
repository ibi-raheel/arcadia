// Cross-scene TS types. Narrowly-scoped unions that multiple scenes (or
// a scene + a React page) need to agree on.

export type Direction = 'up' | 'down' | 'left' | 'right';

// Avatar facing directions — cardinal N/E/S/W to match the supplied
// spritesheets (one row per cardinal direction). The iso camera is
// independent: even though the world is rendered at 2:1 iso tilt, the
// character sprite was drawn with 4 cardinal-facing poses, so the
// velocity bucketer picks the nearest cardinal.
//
// Mapping rule (see velocityToFacingDirection in scenes/world/input.ts):
//   dominant axis wins; horizontal ties go east/west.
export const FACING_DIRECTIONS = ['n', 'e', 's', 'w'] as const;
export type FacingDirection = (typeof FACING_DIRECTIONS)[number];

export const AVATAR_ACTIONS = ['idle', 'walk', 'jump'] as const;
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
