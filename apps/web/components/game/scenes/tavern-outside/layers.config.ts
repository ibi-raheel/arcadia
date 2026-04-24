// Tavern-outside scene zones — three SPACE-prompt gates (one per tavern
// building) + one return edge back to the square.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { EntryTrigger } from '../shared/enter-prompt';
import type { PixelRect } from '../shared/types';

export const TAVERN_OUTSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * The three tavern buildings stack vertically along the east side of the
 * scene image (top / middle / bottom). Each door is a distinct Colyseus
 * "building" — see ADR note in `RealmRoom.ts`. Exterior differences are
 * cosmetic only; all three doors open the same interior image, but
 * members in different buildings don't meet each other.
 *
 * Coordinates eyeballed from the 1× preview; nudge in browser if needed.
 */
// 2026-04-23 grid-reads from the user:
// - Tavern A (top, blue roof):      (1100, 550)
// - Tavern B (middle, red roof):    (1150, 1350)   ← x best-guess; nudge if off
// - Tavern C (bottom, green roof):  (1200, 2200)
// Radius 80 keeps the trigger tight enough that the prompt only fires
// when the avatar is visually at a door's stairs.
export const TAVERN_OUTSIDE_ENTRY_TRIGGERS: readonly EntryTrigger[] = [
  {
    buildingId: 'tavern-a',
    centerX: 1100,
    centerY: 550,
    radius: 80,
    label: 'Press ENTER to visit The Three Ravens',
    route: '/tavern?b=tavern-a',
  },
  {
    buildingId: 'tavern-b',
    centerX: 1150,
    centerY: 1350,
    radius: 80,
    label: 'Press ENTER to visit The Iron Chalice',
    route: '/tavern?b=tavern-b',
  },
  {
    buildingId: 'tavern-c',
    centerX: 1200,
    centerY: 2200,
    radius: 80,
    label: 'Press ENTER to visit The Sleeping Hollow',
    route: '/tavern?b=tavern-c',
  },
];

/**
 * Spawn-pixel overrides when the page was loaded with `?from=<buildingId>`
 * — e.g. the member just walked out of The Three Ravens and lands next
 * to that tavern's door in the outdoor scene. GameOutdoor reads `?from=`,
 * picks the value here, and writes it into the
 * OUTDOOR_SPAWN_OVERRIDE_REGISTRY_KEY before Phaser boots.
 *
 * 2026-04-23 (Phase 7 user request): spawn AT each door centre (matching
 * the entry-trigger centre) for continuity — the member steps out of the
 * tavern and visually lands at that tavern's door. The prompt for that
 * door is visible immediately, so re-entering is one ENTER press away.
 * Prior behaviour spawned ~200 px west of the door.
 */
export const TAVERN_OUTSIDE_DOOR_SPAWNS: Record<
  string,
  { readonly x: number; readonly y: number } | undefined
> = {
  'tavern-a': { x: 1100, y: 550 },
  'tavern-b': { x: 1150, y: 1350 },
  'tavern-c': { x: 1200, y: 2200 },
};

/** West (bridge) edge returns the member to the square at the east gate. */
export const TAVERN_OUTSIDE_RETURN_EDGE: EdgeTriggers = {
  left: { route: '/world?from=tavern', threshold: 300 },
};

export const tavernOutsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: TAVERN_OUTSIDE_COLLIDERS,
  entryTriggers: TAVERN_OUTSIDE_ENTRY_TRIGGERS,
  returnEdge: TAVERN_OUTSIDE_RETURN_EDGE,
} as const;
