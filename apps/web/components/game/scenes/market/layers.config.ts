// Market depth bands. ground < stalls < dynamic (avatar) < overlay.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

/** User-authored collision rects — empty until stall / decor art stabilises. */
export const MARKET_COLLIDERS: readonly PixelRect[] = [];

/**
 * Bottom edge returns the member to the central square. 2026-04-23
 * (Phase 7 item M1): the spawn moved from the bottom (y=880) to the
 * top (y=140) so the member enters facing the stalls. The return edge
 * had to move to the opposite edge — otherwise the member spawned
 * inside the 300 px trigger band and was instantly bounced back to
 * /world. Player walks south through the stalls to exit.
 */
export const MARKET_RETURN_EDGE: EdgeTriggers = {
  bottom: { route: '/world', threshold: 300 },
};

export const marketLayersConfig = {
  depth: {
    ground: 0,
    stalls: 100,
    dynamic: 1_000,
    overlay: 10_000,
  },
  ySort: {
    yAnchorRatio: 0.85,
  },
  colliders: MARKET_COLLIDERS,
  returnEdge: MARKET_RETURN_EDGE,
} as const;
