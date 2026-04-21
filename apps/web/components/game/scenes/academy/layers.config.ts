// Academy depth bands. Mirrors TavernScene — ground < podiums < dynamic
// (avatar y-sorts into the dynamic band).

import type { PixelRect } from '../shared/types';

/** User-authored collision rects — empty until podiums/art stabilise. */
export const ACADEMY_COLLIDERS: readonly PixelRect[] = [];

export const academyLayersConfig = {
  depth: {
    ground: 0,
    podiums: 100,
    dynamic: 1_000,
    overlay: 10_000,
  },
  ySort: {
    /** Avatar feet anchor at ~85% of sprite height — same as Tavern. */
    yAnchorRatio: 0.85,
  },
  colliders: ACADEMY_COLLIDERS,
} as const;
