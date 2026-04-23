// Coworking interior layer config. Empty colliders scaffold + one return
// trigger at the bottom door back to /coworking.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

export const COWORKING_INSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * Bottom edge returns the member to the coworking outdoor camp. The tent
 * image has a clear exit framed by two lanterns at the bottom — the 56px
 * threshold lands cleanly once the avatar steps onto that doorway.
 */
export const COWORKING_INSIDE_RETURN_EDGE: EdgeTriggers = {
  bottom: { route: '/coworking', threshold: 150 },
};

export const coworkingInsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: COWORKING_INSIDE_COLLIDERS,
  returnEdge: COWORKING_INSIDE_RETURN_EDGE,
} as const;
