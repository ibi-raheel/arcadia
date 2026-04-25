// A peer member's avatar. Position comes from Colyseus AvatarState patches,
// not physics. Every frame we step toward the latest server target via
// `interpolationStep` — smooths the 20 Hz patch stream into 60 Hz render
// motion. On reconnect / large jumps we snap instead of lerping.
//
// Animation keys + Sprite-vs-Rectangle selection match LocalAvatar: if the
// avatar's spritesheets are registered, walk/idle animations play per
// direction; otherwise renders as a coloured Rectangle placeholder.

import type Phaser from 'phaser';

import type { AvatarDirection, AvatarState } from '@arcadia/shared';

import { isAvatarId, type AvatarId } from '../shared/avatar-palette';
import { animationKey } from './avatar-animations';
import {
  createAvatarVisuals,
  destroyVisuals,
  setVisualsDepth,
  setVisualsFocus,
  setVisualsLevel,
  syncVisualAttachments,
  type AvatarBody,
  type AvatarSize,
  type AvatarVisuals,
} from './avatar-renderer';
import { interpolationStep } from './interpolation';
import { worldSpritesConfig } from './sprites.config';

/** Snap threshold — reconnect / teleport jumps past this bypass lerp. */
export const REMOTE_SNAP_DISTANCE_PX = 128;

export type RemoteAvatarSnapshot = {
  readonly memberId: string;
  readonly avatarId: AvatarId;
  readonly displayName: string;
  readonly x: number;
  readonly y: number;
  readonly direction: AvatarDirection;
  readonly isMoving: boolean;
  readonly level: number;
};

export class RemoteAvatar {
  readonly memberId: string;
  readonly avatarId: AvatarId;
  private readonly visuals: AvatarVisuals;

  private targetX: number;
  private targetY: number;
  private direction: AvatarDirection;
  private isMoving: boolean;
  private level: number;

  constructor(scene: Phaser.Scene, snap: RemoteAvatarSnapshot, size?: AvatarSize) {
    this.memberId = snap.memberId;
    this.avatarId = snap.avatarId;
    this.visuals = createAvatarVisuals(
      scene,
      snap.avatarId,
      snap.x,
      snap.y,
      snap.displayName,
      snap.level,
      size,
    );
    this.targetX = snap.x;
    this.targetY = snap.y;
    this.direction = snap.direction;
    this.isMoving = snap.isMoving;
    this.level = snap.level;
  }

  /** Phaser game object — consumed by the y-sort registry. */
  get rect(): AvatarBody {
    return this.visuals.gameObject;
  }

  get x(): number {
    return this.visuals.gameObject.x;
  }

  get y(): number {
    return this.visuals.gameObject.y;
  }

  get height(): number {
    return this.visuals.gameObject.height;
  }

  /** Apply the latest AvatarState patch — updates target + direction + anim. */
  applyPatch(state: AvatarState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    if ((['n', 'e', 's', 'w'] as const as readonly string[]).includes(state.direction)) {
      this.direction = state.direction as AvatarDirection;
    }
    this.isMoving = state.isMoving;
    if (state.level !== this.level) {
      this.level = state.level;
      setVisualsLevel(this.visuals, this.level);
    }
    // Phase 12 — sync the "what I'm working on" line. Always
    // re-applies; setVisualsFocus is cheap + idempotent.
    setVisualsFocus(this.visuals, state.currentFocus ?? '');
  }

  /** Called every frame from WorldScene.update(). `dtSec` = delta/1000. */
  tick(dtSec: number): void {
    const current = { x: this.visuals.gameObject.x, y: this.visuals.gameObject.y };
    const target = { x: this.targetX, y: this.targetY };
    const result = interpolationStep(
      current,
      target,
      worldSpritesConfig.avatar.walkSpeed,
      dtSec,
      REMOTE_SNAP_DISTANCE_PX,
    );
    this.visuals.gameObject.setPosition(result.x, result.y);

    syncVisualAttachments(this.visuals);
    this.playAnim();
  }

  private playAnim(): void {
    const sprite = this.visuals.sprite;
    if (!sprite) return;

    const scene = sprite.scene;
    const action = this.isMoving ? 'walk' : 'idle';
    const requested = animationKey(this.avatarId, action, this.direction);

    if (scene.anims.exists(requested)) {
      sprite.anims.play(requested, true);
      return;
    }
    const fallback = animationKey(this.avatarId, 'idle', this.direction);
    if (scene.anims.exists(fallback)) {
      sprite.anims.play(fallback, true);
    }
  }

  setDepth(depth: number): void {
    setVisualsDepth(this.visuals, depth);
  }

  destroy(): void {
    destroyVisuals(this.visuals);
  }
}

/**
 * Builds a RemoteAvatarSnapshot from an AvatarState. Returns null if the
 * peer's `avatarId` isn't recognised (schema drift guard) — caller should
 * skip rendering that peer.
 */
export function snapshotFromState(state: AvatarState): RemoteAvatarSnapshot | null {
  if (!isAvatarId(state.avatarId)) return null;
  return {
    memberId: state.memberId,
    avatarId: state.avatarId,
    displayName: state.displayName,
    x: state.x,
    y: state.y,
    direction: state.direction as AvatarDirection,
    isMoving: state.isMoving,
    level: state.level,
  };
}
