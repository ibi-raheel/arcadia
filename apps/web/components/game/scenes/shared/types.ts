// Cross-scene TS types. Narrowly-scoped unions that multiple scenes (or
// a scene + a React page) need to agree on.

export type Direction = 'up' | 'down' | 'left' | 'right';

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
