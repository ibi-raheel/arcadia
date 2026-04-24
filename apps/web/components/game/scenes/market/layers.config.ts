// Market depth bands. ground < stalls < dynamic (avatar) < overlay.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

/** User-authored collision rects — empty until stall / decor art stabilises. */
export const MARKET_COLLIDERS: readonly PixelRect[] = [];

/**
 * Top edge returns the member to the central square. 2026-04-23 (Phase
 * 7): the edge is ENTER-gated via `promptLabel`, mirroring the pattern
 * used for the Square's four outgoing exits. Walking into the top band
 * shows a prompt pill; only ENTER navigates. Spawn sits at y=380 (see
 * sprites.config.ts), which is outside the 300 px trigger band, so the
 * prompt doesn't appear on arrival.
 */
export const MARKET_RETURN_EDGE: EdgeTriggers = {
  top: {
    route: '/world',
    threshold: 300,
    promptLabel: 'Press ENTER to return to the Square',
  },
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
