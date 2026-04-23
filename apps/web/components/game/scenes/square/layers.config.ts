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
// 2026-04-22 bump 150 → 250 after "cannot go from square to market at
// the bottom" — the avatar's feet-box + world-bounds clamp meant only a
// narrow ~10px band actually fired. 250 gives a clean walk-onto feel.
export const SQUARE_EDGE_TRIGGERS: EdgeTriggers = {
  top: { route: '/academy-outside', threshold: 250 },
  right: { route: '/tavern-outside', threshold: 250 },
  bottom: { route: '/market', threshold: 250 },
  left: { route: '/coworking', threshold: 250 },
};

/**
 * NPC tip-bubble config. The merchant figure is baked into the square PNG
 * (upper-left — bearded man on a rug). Coords point at his visible head;
 * proximityPx is the radius in world pixels at which the tip bubble
 * appears. Ported from the ADR-0007 Tiled square (2026-04-22 feedback —
 * "NPC not giving tip bubbles now").
 */
export const SQUARE_NPC = {
  position: { x: 320, y: 320 },
  /**
   * Approximate head-of-NPC y in the image — bubble anchors above this
   * so the tail points down at his head. User feedback 2026-04-22:
   * "bubble is way too high, reduce gap" → moved down from 230 to 285.
   */
  headY: 285,
  proximityPx: 380,
  tips: [
    'Welcome to Arcadia, traveller!',
    'Psst — the fountain drops a coin at midnight.',
    'WASD gets you places. Arrow keys too.',
    'Watch the shrubs. They move sometimes.',
    'Careful crossing the bridge after rain.',
    "If you see fireflies, you're close to something good.",
    'The tavern brews a mean ale. Trust me.',
    'Spacebar makes you jump. Try it.',
    'The market opens past the cobblestones.',
    'Lamps light up at dusk. Mostly.',
  ],
} as const;

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
  npc: SQUARE_NPC,
} as const;
