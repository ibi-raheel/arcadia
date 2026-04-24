// Tavern-outside — single-player image-backed area east of the square.
// Three tavern buildings, each with its own SPACE-prompt gate. Every gate
// opens the same /tavern interior but with a distinct `?b=<buildingId>`
// so Colyseus's filterBy(['building']) groups clients per building.
// Walking off the left (bridge) edge returns to /world.

import { BOOT_ASSETS } from '../boot/asset-manifest';
import { drawDebugGrid } from '../shared/debug-grid';
import { OutdoorSceneBase, type OutdoorSceneConfig } from '../shared/outdoor-scene-base';
import { tavernOutsideCameraConfig } from './camera.config';
import { tavernOutsideLayersConfig } from './layers.config';
import { tavernOutsideSpritesConfig } from './sprites.config';

export const TAVERN_OUTSIDE_SCENE_KEY = 'TavernOutsideScene' as const;

export class TavernOutsideScene extends OutdoorSceneBase {
  protected readonly sceneConfig: OutdoorSceneConfig = {
    imageKey: BOOT_ASSETS.tavernOutside.key,
    bounds: {
      width: tavernOutsideCameraConfig.bounds.width,
      height: tavernOutsideCameraConfig.bounds.height,
    },
    camera: {
      zoom: tavernOutsideCameraConfig.zoom,
      followLerp: tavernOutsideCameraConfig.followLerp,
      deadzone: tavernOutsideCameraConfig.deadzone,
      fadeInMs: tavernOutsideCameraConfig.fadeInMs,
    },
    avatar: tavernOutsideSpritesConfig.avatar,
    depth: {
      ground: tavernOutsideLayersConfig.depth.ground,
      dynamic: tavernOutsideLayersConfig.depth.dynamic,
    },
    ySort: tavernOutsideLayersConfig.ySort,
    colliders: tavernOutsideLayersConfig.colliders,
    entryTriggers: tavernOutsideLayersConfig.entryTriggers,
    returnEdge: tavernOutsideLayersConfig.returnEdge,
  };

  constructor() {
    super({ key: TAVERN_OUTSIDE_SCENE_KEY });
  }

  // 2026-04-23 (Phase 7 temp): dev grid overlay for nailing down exact
  // entry/exit portal coords. Remove or gate behind a URL param once
  // the tavern-outside layout is settled.
  override create(): void {
    super.create();
    drawDebugGrid(this, {
      width: tavernOutsideCameraConfig.bounds.width,
      height: tavernOutsideCameraConfig.bounds.height,
      spacing: 100,
      labelEvery: 200,
    });
  }
}
