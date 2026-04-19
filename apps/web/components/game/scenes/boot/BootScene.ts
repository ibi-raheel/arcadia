// Preload scene. Moves bytes over the wire before WorldScene needs them,
// then hands off. Uses Phaser's built-in LoaderPlugin which auto-emits
// 'progress' events — the React loading screen (Phase 1 Step 20) subscribes
// on the outside, no wiring required here.
//
// No camera, no sprite logic, no configs. See scenes/boot/CLAUDE.md and
// ADR 0004 for the convention.

import Phaser from 'phaser';

import {
  BOOT_ASSETS,
  BOOT_SCENE_KEY,
  NEXT_SCENE_KEY_AFTER_BOOT,
  PROGRESS_CALLBACK_REGISTRY_KEY,
} from './asset-manifest';

type ProgressCallback = (progress: number) => void;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: BOOT_SCENE_KEY });
  }

  preload(): void {
    const onProgress = this.game.registry.get(PROGRESS_CALLBACK_REGISTRY_KEY) as
      | ProgressCallback
      | undefined;

    if (onProgress) {
      this.load.on('progress', onProgress);
      this.load.on('complete', () => onProgress(1));
    }

    this.load.image(BOOT_ASSETS.tileset.key, BOOT_ASSETS.tileset.path);
    this.load.tilemapTiledJSON(BOOT_ASSETS.tilemap.key, BOOT_ASSETS.tilemap.path);
  }

  create(): void {
    this.scene.start(NEXT_SCENE_KEY_AFTER_BOOT);
  }
}
