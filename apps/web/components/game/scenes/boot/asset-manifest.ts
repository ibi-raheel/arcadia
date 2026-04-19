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
import type { AvatarAction, FacingDirection } from '../shared/types';

export type AvatarSheet = {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly cols: number;
  readonly rows: number;
  /**
   * Facing direction sitting on each row, top to bottom. Length must equal
   * `rows`. Each direction's animation uses frames
   * `[row*cols .. row*cols + cols - 1]`.
   */
  readonly directionRowOrder: readonly FacingDirection[];
  readonly frameRate: number;
  /**
   * Phaser repeat count. -1 = loop forever (idle, walk). 0 = play once
   * (jump, one-shot actions).
   */
  readonly repeat: number;
};

export type AvatarSheetMap = Partial<Record<AvatarAction, AvatarSheet>>;

// Row order across all three supplied sheets (user-specified 2026-04-19):
//   row 0 = north (back view)
//   row 1 = west  (profile facing left)
//   row 2 = south (front view)
//   row 3 = east  (profile facing right)
// Assumed consistent across idle / walk / jump — adjust per-entry if the
// author used a different convention on a specific sheet.
const AVATAR_01_ROW_ORDER: readonly FacingDirection[] = ['n', 'w', 's', 'e'];

export const AVATAR_SHEETS: Readonly<Partial<Record<AvatarId, AvatarSheetMap>>> = {
  'avatar-01': {
    idle: {
      key: 'avatar-01-idle',
      path: '/avatars/avatar-01/idle.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 2,
      rows: 4,
      directionRowOrder: AVATAR_01_ROW_ORDER,
      frameRate: 4,
      repeat: -1,
    },
    walk: {
      key: 'avatar-01-walk',
      path: '/avatars/avatar-01/walk.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 9,
      rows: 4,
      directionRowOrder: AVATAR_01_ROW_ORDER,
      frameRate: 12,
      repeat: -1,
    },
    jump: {
      key: 'avatar-01-jump',
      path: '/avatars/avatar-01/jump.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 5,
      rows: 4,
      directionRowOrder: AVATAR_01_ROW_ORDER,
      frameRate: 12,
      repeat: 0, // one-shot — jump plays once, doesn't loop
    },
  },
};
