// Coworking-outside scene zones — five SPACE-prompt tents + one return
// edge back to the square.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { EntryTrigger } from '../shared/enter-prompt';
import type { PixelRect } from '../shared/types';

export const COWORKING_OUTSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * Five tents arranged around a central campfire on the coworking-outside
 * image. Each tent is a distinct Colyseus "building" (tent-1 through
 * tent-5). Doors open the same interior image (`coworkinginside`), but
 * members in different tents don't share a Colyseus room thanks to
 * `filterBy(['building'])` on the game server.
 *
 * Coordinates eyeballed from the 1× preview (1403×1121 → doubled to the
 * 2806×2242 runtime image). Nudge in browser if needed.
 */
// 2026-04-24 coords user-clicked off the dev grid: 4 tents locked with
// 200×200 square zones (halfWidth/halfHeight = 100). tent-2 removed per
// user ("remove any other tent entrance"). buildingIds left at 1/3/4/5
// so the tent URLs in existing links keep working.
export const COWORKING_OUTSIDE_ENTRY_TRIGGERS: readonly EntryTrigger[] = [
  {
    buildingId: 'tent-1',
    centerX: 900,
    centerY: 764,
    radius: 100,
    halfWidth: 100,
    halfHeight: 100,
    label: 'Press ENTER to visit Tent',
    route: '/coworking/inside?b=tent-1',
  },
  {
    buildingId: 'tent-3',
    centerX: 674,
    centerY: 1472,
    radius: 100,
    halfWidth: 100,
    halfHeight: 100,
    label: 'Press ENTER to visit Tent',
    route: '/coworking/inside?b=tent-3',
  },
  {
    buildingId: 'tent-4',
    centerX: 1690,
    centerY: 820,
    radius: 100,
    halfWidth: 100,
    halfHeight: 100,
    label: 'Press ENTER to visit Tent',
    route: '/coworking/inside?b=tent-4',
  },
  {
    buildingId: 'tent-5',
    centerX: 1718,
    centerY: 1604,
    radius: 100,
    halfWidth: 100,
    halfHeight: 100,
    label: 'Press ENTER to visit Tent',
    route: '/coworking/inside?b=tent-5',
  },
];

/** East (bridge) edge returns the member to the square at the west bridge. */
export const COWORKING_OUTSIDE_RETURN_EDGE: EdgeTriggers = {
  right: { route: '/world?from=coworking', threshold: 300 },
};

export const coworkingOutsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: COWORKING_OUTSIDE_COLLIDERS,
  entryTriggers: COWORKING_OUTSIDE_ENTRY_TRIGGERS,
  returnEdge: COWORKING_OUTSIDE_RETURN_EDGE,
} as const;
