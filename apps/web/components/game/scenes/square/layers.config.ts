// Square layer config. Holds empty colliders (user drops rects later per the
// Phase-5 Step-15 scaffold), y-sort depth bands, and the four edge-portal
// routes that wire the square to its outdoor neighbours + the market.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

/**
 * Hand-authored collider rects over the square image. Ships empty — the
 * avatar walks freely until rects are added. Activates with zero code change
 * via `spawnColliders(this, squareLayersConfig.colliders)` in the scene.
 */
export const SQUARE_COLLIDERS: readonly PixelRect[] = [];

/**
 * Walk-onto edges wire the square's cardinal exits to neighbouring scenes.
 * No prompt — member walks off the edge and the camera fades to the next
 * route. Inner building entrances inside each neighbour scene are the
 * SPACE-prompt variety (see scenes/tavern-outside etc.).
 *
 * Market retains its existing interior at /market (south), so the bottom
 * edge links directly there rather than to a market-outside scene.
 */
export const SQUARE_EDGE_TRIGGERS: EdgeTriggers = {
  top: { route: '/academy-outside', threshold: 56 },
  right: { route: '/tavern-outside', threshold: 56 },
  bottom: { route: '/market', threshold: 56 },
  left: { route: '/coworking', threshold: 56 },
};

export const squareLayersConfig = {
  depth: {
    ground: 0,
    dynamic: 1000,
    overlay: 500,
  },
  ySort: {
    yAnchorRatio: 0.5,
  },
  colliders: SQUARE_COLLIDERS,
  edgeTriggers: SQUARE_EDGE_TRIGGERS,
} as const;
