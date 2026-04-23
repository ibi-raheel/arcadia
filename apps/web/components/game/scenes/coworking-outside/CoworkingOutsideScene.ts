// Coworking-outside — single-player image-backed area west of the square.
// Five tent entrances, each with its own SPACE-prompt gate. Every tent
// opens the same coworking interior but with a distinct `?b=<buildingId>`
// so Colyseus's filterBy(['building']) groups clients per tent.
// Walking off the right (bridge) edge returns to /world.

import { BOOT_ASSETS } from '../boot/asset-manifest';
import { OutdoorSceneBase, type OutdoorSceneConfig } from '../shared/outdoor-scene-base';
import { coworkingOutsideCameraConfig } from './camera.config';
import { coworkingOutsideLayersConfig } from './layers.config';
import { coworkingOutsideSpritesConfig } from './sprites.config';

export const COWORKING_OUTSIDE_SCENE_KEY = 'CoworkingOutsideScene' as const;

export class CoworkingOutsideScene extends OutdoorSceneBase {
  protected readonly sceneConfig: OutdoorSceneConfig = {
    imageKey: BOOT_ASSETS.coworkingOutside.key,
    bounds: {
      width: coworkingOutsideCameraConfig.bounds.width,
      height: coworkingOutsideCameraConfig.bounds.height,
    },
    camera: {
      zoom: coworkingOutsideCameraConfig.zoom,
      followLerp: coworkingOutsideCameraConfig.followLerp,
      deadzone: coworkingOutsideCameraConfig.deadzone,
      fadeInMs: coworkingOutsideCameraConfig.fadeInMs,
    },
    avatar: coworkingOutsideSpritesConfig.avatar,
    depth: {
      ground: coworkingOutsideLayersConfig.depth.ground,
      dynamic: coworkingOutsideLayersConfig.depth.dynamic,
    },
    ySort: coworkingOutsideLayersConfig.ySort,
    colliders: coworkingOutsideLayersConfig.colliders,
    entryTriggers: coworkingOutsideLayersConfig.entryTriggers,
    returnEdge: coworkingOutsideLayersConfig.returnEdge,
  };

  constructor() {
    super({ key: COWORKING_OUTSIDE_SCENE_KEY });
  }
}
