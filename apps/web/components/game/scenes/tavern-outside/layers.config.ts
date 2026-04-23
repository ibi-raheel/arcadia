// Tavern-outside scene zones — three SPACE-prompt gates (one per tavern
// building) + one return edge back to the square.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { EntryTrigger } from '../shared/enter-prompt';
import type { PixelRect } from '../shared/types';

export const TAVERN_OUTSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * The three tavern buildings stack vertically along the east side of the
 * scene image (top / middle / bottom). Each door is a distinct Colyseus
 * "building" — see ADR note in `RealmRoom.ts`. Exterior differences are
 * cosmetic only; all three doors open the same interior image, but
 * members in different buildings don't meet each other.
 *
 * Coordinates eyeballed from the 1× preview; nudge in browser if needed.
 */
export const TAVERN_OUTSIDE_ENTRY_TRIGGERS: readonly EntryTrigger[] = [
  {
    buildingId: 'tavern-a',
    centerX: 1180,
    centerY: 560,
    radius: 220,
    label: 'Press ENTER to visit The Three Ravens',
    route: '/tavern?b=tavern-a',
  },
  {
    buildingId: 'tavern-b',
    centerX: 1200,
    centerY: 1260,
    radius: 220,
    label: 'Press ENTER to visit The Iron Chalice',
    route: '/tavern?b=tavern-b',
  },
  {
    buildingId: 'tavern-c',
    centerX: 1220,
    centerY: 1960,
    radius: 220,
    label: 'Press ENTER to visit The Sleeping Hollow',
    route: '/tavern?b=tavern-c',
  },
];

/**
 * Spawn-pixel overrides when the page was loaded with `?from=<buildingId>`
 * — e.g. the member just walked out of The Three Ravens and lands next
 * to that tavern's door in the outdoor scene. GameOutdoor reads `?from=`,
 * picks the value here, and writes it into the
 * OUTDOOR_SPAWN_OVERRIDE_REGISTRY_KEY before Phaser boots.
 *
 * Each entry sits ~200 px west of the door so the member doesn't
 * immediately re-trigger the enter prompt they just dismissed.
 */
export const TAVERN_OUTSIDE_DOOR_SPAWNS: Record<
  string,
  { readonly x: number; readonly y: number } | undefined
> = {
  'tavern-a': { x: 980, y: 560 },
  'tavern-b': { x: 1000, y: 1260 },
  'tavern-c': { x: 1020, y: 1960 },
};

/** West (bridge) edge returns the member to the square. */
export const TAVERN_OUTSIDE_RETURN_EDGE: EdgeTriggers = {
  left: { route: '/world', threshold: 150 },
};

export const tavernOutsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: TAVERN_OUTSIDE_COLLIDERS,
  entryTriggers: TAVERN_OUTSIDE_ENTRY_TRIGGERS,
  returnEdge: TAVERN_OUTSIDE_RETURN_EDGE,
} as const;
