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
    centerX: 1080,
    centerY: 600,
    radius: 150,
    label: 'Press SPACE to Enter Tavern',
    route: '/tavern?b=tavern-a',
  },
  {
    buildingId: 'tavern-b',
    centerX: 1080,
    centerY: 1280,
    radius: 150,
    label: 'Press SPACE to Enter Tavern',
    route: '/tavern?b=tavern-b',
  },
  {
    buildingId: 'tavern-c',
    centerX: 1080,
    centerY: 1980,
    radius: 150,
    label: 'Press SPACE to Enter Tavern',
    route: '/tavern?b=tavern-c',
  },
];

/** West (bridge) edge returns the member to the square. */
export const TAVERN_OUTSIDE_RETURN_EDGE: EdgeTriggers = {
  left: { route: '/world', threshold: 56 },
};

export const tavernOutsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: TAVERN_OUTSIDE_COLLIDERS,
  entryTriggers: TAVERN_OUTSIDE_ENTRY_TRIGGERS,
  returnEdge: TAVERN_OUTSIDE_RETURN_EDGE,
} as const;
