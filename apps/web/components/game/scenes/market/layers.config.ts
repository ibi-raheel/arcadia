// Market depth bands. ground < stalls < dynamic (avatar) < overlay.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

/** User-authored collision rects — empty until stall / decor art stabilises. */
export const MARKET_COLLIDERS: readonly PixelRect[] = [];

/**
 * Top edge returns the member to the central square. Matches the rest
 * of the image-backed scenes — walk-onto, 150 px threshold, no prompt.
 * (2026-04-22: previously the only way out of /market was the browser
 * back button.)
 */
export const MARKET_RETURN_EDGE: EdgeTriggers = {
  top: { route: '/world', threshold: 300 },
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
