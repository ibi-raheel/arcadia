// Tavern tilemap layer names + depth ordering. Mirrors the world layout.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

/**
 * Hand-authored collision rects over the image-backed tavern interior.
 * User drops in rectangles for the bar counter, tables, walls, etc. as
 * they're marked up. Scene calls `spawnColliders(this, tavernLayersConfig.colliders)`
 * and the helper bundles them into a StaticGroup for avatar collision.
 */
export const TAVERN_COLLIDERS: readonly PixelRect[] = [];

/**
 * Walk off the bottom edge to leave the tavern (2026-04-22 — replaces
 * the "← Return to World" button). Lands on /tavern-outside with a
 * `?from=<buildingId>` param so the outdoor scene can spawn the member
 * near the correct tavern's door.
 */
export const TAVERN_RETURN_EDGE: EdgeTriggers = {
  bottom: { route: '/tavern-outside', threshold: 120 },
};

export const tavernLayersConfig = {
  tilemapLayers: {
    ground: 'ground',
    collision: 'collision',
    overlay: 'overlay',
  },
  depth: {
    ground: 0,
    collisionVisuals: 10,
    dynamic: 1000, // avatars + future sorted props
    overlay: 500, // short decor rendered under avatars (same as WorldScene)
  },
  ySort: {
    yAnchorRatio: 0.5,
  },
  colliders: TAVERN_COLLIDERS,
  returnEdge: TAVERN_RETURN_EDGE,
} as const;
