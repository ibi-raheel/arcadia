// Square layer config. Holds empty colliders (user drops rects later per the
// Phase-5 Step-15 scaffold), y-sort depth bands, the four edge-portal
// routes that wire the square to its outdoor neighbours + the market, and
// the lodge proximity trigger in the top-right that opens the member's
// home landing (/).

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { EntryTrigger } from '../shared/enter-prompt';
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
//
// 2026-04-23 (Phase 7 item G2) — all four edges are now ENTER-gated via
// `promptLabel`. Walking into the band shows a prompt pill; only ENTER
// navigates. Previously walk-onto, which felt abrupt since three of the
// four exits lead to further outdoor zones rather than final interiors.
export const SQUARE_EDGE_TRIGGERS: EdgeTriggers = {
  top: {
    route: '/academy-outside',
    threshold: 300,
    promptLabel: 'Press ENTER to visit the Academy grounds',
  },
  right: {
    route: '/tavern-outside',
    threshold: 300,
    promptLabel: 'Press ENTER to visit the Taverns',
    // Bridge-only span (2026-04-23 screenshot feedback) — the prompt
    // should only fire when the member is on the east bridge, not
    // anywhere along the right edge. y-range is narrow around the
    // bridge centre (~y=1250). Nudge min/max if the bridge on the
    // source image sits higher or lower.
    span: { min: 1050, max: 1500 },
  },
  bottom: {
    // `?from=square` so the market overlay (opened at the central
    // crystal) can show only the ✕ close affordance — vs. direct
    // /market entry where the player needs ← return-to-world +
    // logout to navigate away. See MarketOverlay.tsx.
    route: '/market?from=square',
    threshold: 300,
    promptLabel: 'Press ENTER to visit the Market',
  },
  left: {
    route: '/coworking',
    threshold: 300,
    promptLabel: 'Press ENTER to visit the Coworking tents',
  },
};

/**
 * Wanderer NPC config. The merchant figure is baked into the square PNG
 * (upper-left — bearded man on a rug). Coords point at his body centre;
 * proximityPx is the radius in world pixels at which the "Press ENTER
 * to speak with the wanderer" prompt appears. ENTER fires
 * SQUARE_OPEN_SAGE_EVENT on the scene's event bus and the React
 * dialogue overlay opens. See ADR 0015.
 *
 * The earlier random-tip bubble (Phase 5) was retired 2026-04-25 in
 * favour of a Gemini-backed conversation surface — same NPC, much more
 * useful answers.
 */
export const SQUARE_NPC = {
  // NPC figure sits on the rug in the upper-left of the 2508² source.
  // Body centre ≈ (355, 620); head top ≈ 540.
  position: { x: 355, y: 620 },
  proximityPx: 380,
} as const;

/**
 * Lodge entry — a small cabin baked into the top-right of the square
 * PNG. Walking into the radius shows "Press ENTER to step into your
 * lodge"; ENTER routes to `/` (the member's home landing, with doorways
 * to world / market / dashboard).
 *
 * Coordinates are eyeballed against the 2508² source; nudge
 * centerX/centerY/radius if the door ends up off-centre once rendered.
 * Added 2026-04-24 per user request for a personal-home affordance
 * inside the square.
 */
export const SQUARE_LODGE_ENTRY: EntryTrigger = {
  buildingId: 'lodge',
  centerX: 2250,
  centerY: 500,
  radius: 200,
  label: 'Press ENTER to step into your lodge',
  route: '/',
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
  lodgeEntry: SQUARE_LODGE_ENTRY,
  npc: SQUARE_NPC,
} as const;
