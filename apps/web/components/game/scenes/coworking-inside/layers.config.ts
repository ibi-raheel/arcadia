// Coworking interior layer config. Empty colliders scaffold + one
// return trigger at the bottom door, plus the six baked-in
// interactables from the tent PNG (Phase 12 / ADR 0016). Coords
// are eyeballed against `coworkinginside-2508x2508.png` — open the
// PNG in a viewer if you need to nudge them.

import type { EdgeTriggers } from '../shared/edge-triggers';
import type { PixelRect } from '../shared/types';

export const COWORKING_INSIDE_COLLIDERS: readonly PixelRect[] = [];

/**
 * Bottom edge returns the member to the coworking outdoor camp. 2026-04-24:
 * ENTER-gated to match the market / square / tavern / academy exit pattern
 * — walking into the 300 px band shows "Press ENTER to exit the Tent",
 * only ENTER navigates.
 */
export const COWORKING_INSIDE_RETURN_EDGE: EdgeTriggers = {
  bottom: {
    route: '/coworking',
    threshold: 300,
    promptLabel: 'Press ENTER to exit the Tent',
  },
};

/**
 * Six interactables baked into the tent PNG. ADR 0016 explains why
 * these are literals, not Tiled object-layer rects.
 *
 * Active in Phase 12.A: `jukebox` + `chest`. The other four
 * (`table` / `bookshelf` / `easel` / `banner`) are placeholders
 * for 12.B — keeping them here so the coordinate audit happens
 * once.
 */
export type CoworkingInteractable = {
  readonly id: string;
  readonly centerX: number;
  readonly centerY: number;
  readonly radius: number;
  readonly label: string;
};

export const COWORKING_INTERACTABLES = {
  /** Glowing teal jukebox on the right wall (Phase 12.A). */
  jukebox: {
    id: 'jukebox',
    centerX: 1820,
    centerY: 1100,
    radius: 220,
    label: 'Press ENTER to set the station',
  },

  /** Wooden chest top-right (Phase 12.A — Pomodoro hourglass). */
  chest: {
    id: 'chest',
    centerX: 1700,
    centerY: 560,
    radius: 200,
    label: 'Press ENTER to start a focus block',
  },

  /** Central round table (Phase 12.B — room status hub). */
  table: {
    id: 'table',
    centerX: 1254,
    centerY: 1300,
    radius: 280,
    label: 'Press ENTER to sit at the table',
  },

  /** Bookshelf top-left (Phase 12.B — shared bookmarks). */
  bookshelf: {
    id: 'bookshelf',
    centerX: 520,
    centerY: 540,
    radius: 220,
    label: 'Press ENTER to open the library',
  },

  /** Painting / easel right edge (Phase 12.B — daily standup). */
  easel: {
    id: 'easel',
    centerX: 2050,
    centerY: 1400,
    radius: 200,
    label: 'Press ENTER to paint your intention',
  },

  /** Sigil banner top-centre — pure-display anchor for the Hearth
   *  pill; never fires (radius=0). */
  banner: {
    id: 'banner',
    centerX: 1254,
    centerY: 200,
    radius: 0,
    label: '',
  },
} as const satisfies Record<string, CoworkingInteractable>;

export const coworkingInsideLayersConfig = {
  depth: { ground: 0, dynamic: 1000, overlay: 500 },
  ySort: { yAnchorRatio: 0.5 },
  colliders: COWORKING_INSIDE_COLLIDERS,
  returnEdge: COWORKING_INSIDE_RETURN_EDGE,
  interactables: COWORKING_INTERACTABLES,
} as const;
