// Phase 1 asset manifest — every file BootScene preloads, and the scene-key
// constants that BootScene hands off to. Split out of BootScene.ts so tests
// can verify paths + file existence without needing to import Phaser (which
// requires DOM globals unavailable under Vitest's default environment).
//
// Paths are relative to `apps/web/public/` and served by Next.js at the root
// URL (e.g. `/tilesets/world.png` → `apps/web/public/tilesets/world.png`).

export const BOOT_SCENE_KEY = 'BootScene' as const;
export const NEXT_SCENE_KEY_AFTER_BOOT = 'WorldScene' as const;

/**
 * Registry override — if set by the React mount before Phaser boots,
 * BootScene starts this scene key instead of NEXT_SCENE_KEY_AFTER_BOOT.
 * Phase 2 Week 7: GameTavern writes 'TavernScene' so the same BootScene
 * can serve both /world and /tavern without duplication.
 */
export const NEXT_SCENE_KEY_REGISTRY_KEY = 'nextSceneKeyAfterBoot' as const;

/**
 * Step 20 handshake — React writes a `(progress: number) => void` into
 * Phaser's registry under this key. BootScene subscribes to `LoaderPlugin`
 * progress + complete events and forwards to the callback. Progress is
 * 0..1; complete fires one last `1` so the React side can flip the
 * loading overlay off.
 */
export const PROGRESS_CALLBACK_REGISTRY_KEY = 'onPreloadProgress' as const;

export const BOOT_ASSETS = {
  // Multi-tileset world map — the cyberpunk-themed redesign ingested
  // 2026-04-19 references four tilesets via successive firstgid offsets:
  //   1..121   → world      (base iso terrain: grass / path / rocks / water)
  //   122..242 → world-alt  (alt-themed variant; missing PNG stands in with
  //                          a copy of world.png — see phase-02_status log)
  //   243..363 → decor      (128x128 cyberpunk props: trees, lamps, signs)
  //   364      → academy    (single 168x166 building sprite)
  tileset: { key: 'world-tileset', path: '/tilesets/world.png' },
  tilesetAlt: { key: 'world-alt-tileset', path: '/tilesets/world-alt.png' },
  tilesetDecor: { key: 'decor-tileset', path: '/tilesets/decor.png' },
  tilesetAcademy: { key: 'academy-tileset', path: '/tilesets/academy.png' },
  tilemap: {
    key: 'world',
    path: '/maps/world.tmj',
  },
  // Phase 2 Week 7: interior tavern map. Loaded alongside the world map so
  // one BootScene serves both /world and /tavern scenes without duplication.
  tavernTilemap: {
    key: 'tavern',
    path: '/maps/tavern.tmj',
  },
  // Phase 2 Week 8 polish: user-supplied cyberpunk tavern interior
  // image-based background. Replaces tilemap rendering in TavernScene;
  // 1376×768, top-down perspective. Colliders will be added later.
  tavernInterior: {
    key: 'tavern-interior',
    path: '/tavern-interior.png',
  },
  // Phase 3.5: user-supplied academy interior. 1536×1024 image; AcademyScene
  // renders it as a flat background and positions course podiums on top.
  academyInterior: {
    key: 'academy-interior',
    path: '/academy-interior.png',
  },
  // Phase 4: user-supplied market interior. 1536×1024 image; MarketScene
  // renders it and positions course "stalls" on top.
  marketInterior: {
    key: 'market-interior',
    path: '/market-interior.png',
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
import type { AvatarAction, AvatarDirection } from '../shared/types';

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
  readonly directionRowOrder: readonly AvatarDirection[];
  readonly frameRate: number;
  /**
   * Phaser repeat count. -1 = loop forever (idle, walk). 0 = play once
   * (jump, one-shot actions).
   */
  readonly repeat: number;
};

export type AvatarSheetMap = Partial<Record<AvatarAction, AvatarSheet>>;

// Row order across all supplied sheets (user-specified 2026-04-19):
//   row 0 = north (back view)
//   row 1 = west  (profile facing left)
//   row 2 = south (front view)
//   row 3 = east  (profile facing right)
// Shared across avatar-01 (Knight, Aseprite export) + avatar-02 (LPC-standard
// female, cropped from 832×256 to match the knight's column counts). Adjust
// per-entry if a future sheet uses a different convention.
const CARDINAL_ROW_ORDER: readonly AvatarDirection[] = ['n', 'w', 's', 'e'];

export const AVATAR_SHEETS: Readonly<Partial<Record<AvatarId, AvatarSheetMap>>> = {
  'avatar-01': {
    idle: {
      key: 'avatar-01-idle',
      path: '/avatars/avatar-01/idle.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 2,
      rows: 4,
      directionRowOrder: CARDINAL_ROW_ORDER,
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
      directionRowOrder: CARDINAL_ROW_ORDER,
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
      directionRowOrder: CARDINAL_ROW_ORDER,
      frameRate: 12,
      repeat: 0, // one-shot — jump plays once, doesn't loop
    },
  },
  'avatar-02': {
    idle: {
      key: 'avatar-02-idle',
      path: '/avatars/avatar-02/idle.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 2,
      rows: 4,
      directionRowOrder: CARDINAL_ROW_ORDER,
      frameRate: 4,
      repeat: -1,
    },
    walk: {
      key: 'avatar-02-walk',
      path: '/avatars/avatar-02/walk.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 9,
      rows: 4,
      directionRowOrder: CARDINAL_ROW_ORDER,
      frameRate: 12,
      repeat: -1,
    },
    jump: {
      key: 'avatar-02-jump',
      path: '/avatars/avatar-02/jump.png',
      frameWidth: 64,
      frameHeight: 64,
      cols: 5,
      rows: 4,
      directionRowOrder: CARDINAL_ROW_ORDER,
      frameRate: 12,
      repeat: 0,
    },
  },
};
