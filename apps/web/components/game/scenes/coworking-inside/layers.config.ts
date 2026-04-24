// Coworking interior layer config. Empty colliders scaffold + one return
// trigger at the bottom door back to /coworking.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

export const COWORKING_INSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * Bottom edge returns the member to the coworking outdoor camp. 2026-04-24:
 * ENTER-gated to match the market / square / tavern / academy exit pattern
 * — walking into the 300 px band shows "Press ENTER to exit the Tent",
 * only ENTER navigates.
 */
export const COWORKING_INSIDE_RETURN_EDGE: EdgeTriggers = {
  bottom: {
    route: '/coworking',
    threshold: 300,
    promptLabel: 'Press ENTER to exit the Tent',
  },
};

export const coworkingInsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: COWORKING_INSIDE_COLLIDERS,
  returnEdge: COWORKING_INSIDE_RETURN_EDGE,
} as const;
