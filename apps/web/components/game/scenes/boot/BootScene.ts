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
    // 2026-04-22 image-backed outdoor set — each PNG is ~9 MB, so only
    // load the one the active scene actually uses. Without this gate,
    // every /academy / /tavern / /market navigation sat on a ~45 MB
    // preload even though those scenes don't touch the outdoor images.
    const nextScene =
      (this.game.registry.get(NEXT_SCENE_KEY_REGISTRY_KEY) as string | undefined) ??
      NEXT_SCENE_KEY_AFTER_BOOT;
    const outdoorAsset: { readonly key: string; readonly path: string } | undefined = (
      {
        SquareScene: BOOT_ASSETS.squareOutside,
        AcademyOutsideScene: BOOT_ASSETS.academyOutside,
        TavernOutsideScene: BOOT_ASSETS.tavernOutside,
        CoworkingOutsideScene: BOOT_ASSETS.coworkingOutside,
        CoworkingInsideScene: BOOT_ASSETS.coworkingInside,
      } as Record<string, { readonly key: string; readonly path: string } | undefined>
    )[nextScene];
    if (outdoorAsset) this.load.image(outdoorAsset.key, outdoorAsset.path);

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
