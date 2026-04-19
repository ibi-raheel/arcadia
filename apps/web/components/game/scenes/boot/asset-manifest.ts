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
