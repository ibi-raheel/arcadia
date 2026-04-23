// Preload scene. Moves bytes over the wire before WorldScene needs them,
// then hands off. Uses Phaser's built-in LoaderPlugin which auto-emits
// 'progress' events — the React loading screen (Phase 1 Step 20) subscribes
// on the outside, no wiring required here.
//
// No camera, no sprite logic, no configs. See scenes/boot/CLAUDE.md and
// ADR 0004 for the convention.

import * as Phaser from 'phaser';

import {
  AVATAR_SHEETS,
  BOOT_ASSETS,
  BOOT_SCENE_KEY,
  NEXT_SCENE_KEY_AFTER_BOOT,
  NEXT_SCENE_KEY_REGISTRY_KEY,
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
    this.load.image(BOOT_ASSETS.tilesetAlt.key, BOOT_ASSETS.tilesetAlt.path);
    this.load.image(BOOT_ASSETS.tilesetDecor.key, BOOT_ASSETS.tilesetDecor.path);
    this.load.image(BOOT_ASSETS.tilesetAcademy.key, BOOT_ASSETS.tilesetAcademy.path);
    this.load.image(BOOT_ASSETS.tavernInterior.key, BOOT_ASSETS.tavernInterior.path);
    this.load.image(BOOT_ASSETS.academyInterior.key, BOOT_ASSETS.academyInterior.path);
    this.load.image(BOOT_ASSETS.marketInterior.key, BOOT_ASSETS.marketInterior.path);
    // 2026-04-22 image-backed outdoor set (replaces ADR-0007 Tiled square
    // at /world; used by SquareScene + the three outdoor neighbour scenes +
    // the coworking tent interior).
    this.load.image(BOOT_ASSETS.squareOutside.key, BOOT_ASSETS.squareOutside.path);
    this.load.image(BOOT_ASSETS.academyOutside.key, BOOT_ASSETS.academyOutside.path);
    this.load.image(BOOT_ASSETS.tavernOutside.key, BOOT_ASSETS.tavernOutside.path);
    this.load.image(BOOT_ASSETS.coworkingOutside.key, BOOT_ASSETS.coworkingOutside.path);
    this.load.image(BOOT_ASSETS.coworkingInside.key, BOOT_ASSETS.coworkingInside.path);
    this.load.tilemapTiledJSON(BOOT_ASSETS.tilemap.key, BOOT_ASSETS.tilemap.path);
    this.load.tilemapTiledJSON(BOOT_ASSETS.tavernTilemap.key, BOOT_ASSETS.tavernTilemap.path);

    // Avatar spritesheets — one registered spritesheet per (avatarId, action)
    // declared in AVATAR_SHEETS. Avatars without entries fall back to
    // the Rectangle placeholder in LocalAvatar.
    for (const actions of Object.values(AVATAR_SHEETS)) {
      if (!actions) continue;
      for (const sheet of Object.values(actions)) {
        if (!sheet) continue;
        this.load.spritesheet(sheet.key, sheet.path, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
        });
      }
    }
  }

  create(): void {
    const override = this.game.registry.get(NEXT_SCENE_KEY_REGISTRY_KEY) as string | undefined;
    this.scene.start(override ?? NEXT_SCENE_KEY_AFTER_BOOT);
  }
}
