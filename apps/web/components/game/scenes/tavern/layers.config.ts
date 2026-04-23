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
// 2026-04-23 (v4): the bottom-CENTRE archway is the actual exit door
// (user feedback: "have the portal to go back there" — meaning fire
// AT the archway, not on a generic edge-threshold that was tripping
// halfway across the room). Replaced the bottom-edge trigger with a
// proximity zone anchored on the archway itself.
export const TAVERN_EXIT_ARCHWAY = {
  route: '/tavern-outside',
  centerX: 768,
  centerY: 960,
  radius: 150,
} as const;

/** Legacy edge export kept empty so older imports compile. */
export const TAVERN_RETURN_EDGE: EdgeTriggers = {};

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
  exitArchway: TAVERN_EXIT_ARCHWAY,
} as const;
