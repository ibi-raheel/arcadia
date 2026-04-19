// Cross-scene TS types. Narrowly-scoped unions that multiple scenes (or
// a scene + a React page) need to agree on.
//
// Avatar facing direction lives in `@arcadia/shared` (cardinal n/e/s/w) —
// same type the Colyseus AvatarState + MSG.MOVE payload use, so client code
// writes the exact literals that hit the network.

export { AVATAR_DIRECTIONS, type AvatarDirection } from '@arcadia/shared';

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
