// Academy depth bands. Mirrors TavernScene — ground < podiums < dynamic
// (avatar y-sorts into the dynamic band).

import type { EntryTrigger } from '../shared/enter-prompt';
import type { PixelRect } from '../shared/types';

/** User-authored collision rects — empty until podiums/art stabilise. */
export const ACADEMY_COLLIDERS: readonly PixelRect[] = [];

/**
 * ENTER-gated exit at the bottom-centre of the 1536×1024 academy
 * interior. Mirrors the tavern archway pattern — proximity trigger +
 * ENTER to navigate. Matches the red box in the 2026-04-23 screenshot.
 *
 * Route returns to /academy-outside; academy-outside's return edge then
 * carries the member to /world?from=academy (north-gate spawn on the
 * Square) for full continuity.
 *
 * Radius 120 covers the visible door area at the bottom. Nudge
 * centerX/Y if the actual exit visual sits elsewhere.
 */
export const ACADEMY_EXIT_ARCHWAY: EntryTrigger = {
  buildingId: 'academy-archway',
  centerX: 768,
  centerY: 960,
  radius: 120,
  label: 'Press ENTER to leave the Academy',
  route: '/academy-outside',
};

export const academyLayersConfig = {
  depth: {
    ground: 0,
    podiums: 100,
    dynamic: 1_000,
    overlay: 10_000,
  },
  ySort: {
    /** Avatar feet anchor at ~85% of sprite height — same as Tavern. */
    yAnchorRatio: 0.85,
  },
  colliders: ACADEMY_COLLIDERS,
  exitArchway: ACADEMY_EXIT_ARCHWAY,
} as const;
