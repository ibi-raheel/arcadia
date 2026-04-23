// Academy-outside scene zones — one SPACE-prompt gate + one return edge.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { EntryTrigger } from '../shared/enter-prompt';
import type { PixelRect } from '../shared/types';

export const ACADEMY_OUTSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * Single huge trigger covering the academy premises (castle + outer
 * courtyard). User feedback 2026-04-22: "The triggers for entering
 * academy should not just reside with the gate, but extend topwards so
 * anyone within the academy premises can enter." Centre sits in the
 * castle's plaza; radius 1200 covers roughly y=0..2150 — everything
 * above the fence line. Avatar spawn at y=2200 starts just below the
 * radius so the prompt doesn't flash on arrival.
 */
export const ACADEMY_OUTSIDE_ENTRY_TRIGGERS: readonly EntryTrigger[] = [
  {
    buildingId: 'academy-main',
    centerX: 1254,
    centerY: 950,
    radius: 1200,
    label: 'Press ENTER to visit Academy',
    route: '/academy',
  },
];

/** Bottom edge returns the member to the central square. */
export const ACADEMY_OUTSIDE_RETURN_EDGE: EdgeTriggers = {
  bottom: { route: '/world', threshold: 300 },
};

export const academyOutsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: ACADEMY_OUTSIDE_COLLIDERS,
  entryTriggers: ACADEMY_OUTSIDE_ENTRY_TRIGGERS,
  returnEdge: ACADEMY_OUTSIDE_RETURN_EDGE,
} as const;
