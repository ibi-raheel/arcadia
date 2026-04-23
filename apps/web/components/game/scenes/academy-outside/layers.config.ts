// Academy-outside scene zones — one SPACE-prompt gate + one return edge.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { EntryTrigger } from '../shared/enter-prompt';
import type { PixelRect } from '../shared/types';

export const ACADEMY_OUTSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * Entry trigger at the outer gate (flags + pillars at the bottom of the
 * path, just before the drawbridge leading up to the castle). Eyeballed
 * from the source image; fine-tune in browser if needed.
 */
export const ACADEMY_OUTSIDE_ENTRY_TRIGGERS: readonly EntryTrigger[] = [
  {
    buildingId: 'academy-main',
    centerX: 1254,
    centerY: 2130,
    radius: 160,
    label: 'Press SPACE to Enter Academy',
    route: '/academy',
  },
];

/** Bottom edge returns the member to the central square. */
export const ACADEMY_OUTSIDE_RETURN_EDGE: EdgeTriggers = {
  bottom: { route: '/world', threshold: 56 },
};

export const academyOutsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: ACADEMY_OUTSIDE_COLLIDERS,
  entryTriggers: ACADEMY_OUTSIDE_ENTRY_TRIGGERS,
  returnEdge: ACADEMY_OUTSIDE_RETURN_EDGE,
} as const;
