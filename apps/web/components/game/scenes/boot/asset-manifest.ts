// Phase 1 asset manifest — every file BootScene preloads, and the scene-key
// constants that BootScene hands off to. Split out of BootScene.ts so tests
// can verify paths + file existence without needing to import Phaser (which
// requires DOM globals unavailable under Vitest's default environment).
//
// Paths are relative to `apps/web/public/` and served by Next.js at the root
// URL (e.g. `/tilesets/placeholder.png` → `apps/web/public/tilesets/placeholder.png`).

export const BOOT_SCENE_KEY = 'BootScene' as const;
export const NEXT_SCENE_KEY_AFTER_BOOT = 'WorldScene' as const;

/**
 * Step 20 handshake — React writes a `(progress: number) => void` into
 * Phaser's registry under this key. BootScene subscribes to `LoaderPlugin`
 * progress + complete events and forwards to the callback. Progress is
 * 0..1; complete fires one last `1` so the React side can flip the
 * loading overlay off.
 */
export const PROGRESS_CALLBACK_REGISTRY_KEY = 'onPreloadProgress' as const;

export const BOOT_ASSETS = {
  tileset: {
    key: 'placeholder-tileset',
    path: '/tilesets/placeholder.png',
  },
  tilemap: {
    key: 'world',
    path: '/maps/world.tmj',
  },
} as const;

export type BootAssetKey = keyof typeof BOOT_ASSETS;

// Avatar animation sheets. Each sheet is a 64×64-frame spritesheet holding
// `framesPerDirection` columns and one row per iso direction (order declared
// in `directionRowOrder`). BootScene registers a Phaser spritesheet keyed as
// `<avatarId>-<action>`; avatar-animations then creates one animation per
// (action, direction) pair — e.g. `avatar-01-idle-se`.
//
// Drop a new sheet in apps/web/public/avatars/<avatar-id>/<action>.png and
// add an entry here; no scene-code changes needed.

import type { AvatarId } from '../shared/avatar-palette';
import type { AvatarAction, IsoDirection } from '../shared/types';

export type AvatarSheet = {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly cols: number;
  readonly rows: number;
  /**
   * Iso direction sitting on each row, top to bottom. Length must equal `rows`.
   * Each direction's animation uses frames `[row*cols .. row*cols + cols - 1]`.
   */
  readonly directionRowOrder: readonly IsoDirection[];
  readonly frameRate: number;
};

export type AvatarSheetMap = Partial<Record<AvatarAction, AvatarSheet>>;

export const AVATAR_SHEETS: Readonly<Partial<Record<AvatarId, AvatarSheetMap>>> = {
  'avatar-01': {
    idle: {
      key: 'avatar-01-idle',
      path: '/avatars/avatar-01/idle.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 2,
      rows: 4,
      // Row order in the user's supplied sheet:
      // row 0 = ne (back, right-angled)
      // row 1 = se (front, right-angled)
      // row 2 = nw (back, left-angled)
      // row 3 = sw (front, left-angled)
      directionRowOrder: ['ne', 'se', 'nw', 'sw'],
      frameRate: 4,
    },
    // Add `run: { ... }` when apps/web/public/avatars/avatar-01/run.png lands.
  },
};
