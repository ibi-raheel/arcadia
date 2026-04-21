// Market depth bands. ground < stalls < dynamic (avatar) < overlay.

import type { PixelRect } from '../shared/types';

/** User-authored collision rects — empty until stall / decor art stabilises. */
export const MARKET_COLLIDERS: readonly PixelRect[] = [];

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
} as const;
