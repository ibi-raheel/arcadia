// Academy-outside — single-player image-backed outdoor area north of the
// square. The member walks up to the main gate, presses SPACE, and is
// taken into the existing /academy interior (podium hall + course viewer).
// Walking off the bottom edge returns to /world.

import { BOOT_ASSETS } from '../boot/asset-manifest';
import {
  OutdoorSceneBase,
  type OutdoorSceneConfig,
} from '../shared/outdoor-scene-base';
import { academyOutsideCameraConfig } from './camera.config';
import { academyOutsideLayersConfig } from './layers.config';
import { academyOutsideSpritesConfig } from './sprites.config';

export const ACADEMY_OUTSIDE_SCENE_KEY = 'AcademyOutsideScene' as const;

export class AcademyOutsideScene extends OutdoorSceneBase {
  protected readonly sceneConfig: OutdoorSceneConfig = {
    imageKey: BOOT_ASSETS.academyOutside.key,
    bounds: {
      width: academyOutsideCameraConfig.bounds.width,
      height: academyOutsideCameraConfig.bounds.height,
    },
    camera: {
      zoom: academyOutsideCameraConfig.zoom,
      followLerp: academyOutsideCameraConfig.followLerp,
      deadzone: academyOutsideCameraConfig.deadzone,
      fadeInMs: academyOutsideCameraConfig.fadeInMs,
    },
    avatar: academyOutsideSpritesConfig.avatar,
    depth: {
      ground: academyOutsideLayersConfig.depth.ground,
      dynamic: academyOutsideLayersConfig.depth.dynamic,
    },
    ySort: academyOutsideLayersConfig.ySort,
    colliders: academyOutsideLayersConfig.colliders,
    entryTriggers: academyOutsideLayersConfig.entryTriggers,
    returnEdge: academyOutsideLayersConfig.returnEdge,
  };

  constructor() {
    super({ key: ACADEMY_OUTSIDE_SCENE_KEY });
  }
}
