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
// 2026-04-22 bumps 150 → 250 → 300. Root cause of the "cannot exit from
// the bottom" reports was a double-scaled physics body (sprite was
// scaled +50% for visibility AND the bodyOffset was pre-scaled in
// config). Phaser Arcade scales the body automatically with
// sprite.scale, so the net body ended up so large it clamped the
// avatar well above the trigger band. Fixed by reverting bodyOffset
// to its original frame-space values; 300 threshold gives an extra
// safety margin.
export const SQUARE_EDGE_TRIGGERS: EdgeTriggers = {
  top: { route: '/academy-outside', threshold: 300 },
  right: { route: '/tavern-outside', threshold: 300 },
  bottom: { route: '/market', threshold: 300 },
  left: { route: '/coworking', threshold: 300 },
};

/**
 * NPC tip-bubble config. The merchant figure is baked into the square PNG
 * (upper-left — bearded man on a rug). Coords point at his visible head;
 * proximityPx is the radius in world pixels at which the tip bubble
 * appears. Ported from the ADR-0007 Tiled square (2026-04-22 feedback —
 * "NPC not giving tip bubbles now").
 */
export const SQUARE_NPC = {
  // NPC figure sits on the rug in the upper-left of the 2508² source.
  // Body centre ≈ (355, 620); head top ≈ 540.
  position: { x: 355, y: 620 },
  /**
   * Bubble tail tip lands at `headY + 10`, so setting headY = 530 puts
   * the tail ~10 px above the NPC's head top. User 2026-04-22 screenshot:
   * earlier coords (320, 285) pointed at empty grass to the upper-left,
   * the bubble floated far from the NPC.
   */
  headY: 530,
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
