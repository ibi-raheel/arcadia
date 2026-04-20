// The local member's avatar. Renders via the shared avatar-renderer; adds
// an Arcade Physics body (feet-only collision), directional state, and the
// spacebar jump lifecycle. Remote peers use `RemoteAvatar` — same visuals,
// no physics, position driven by Colyseus state patches instead of input.

import type Phaser from 'phaser';

import type { AvatarDirection } from '@arcadia/shared';

import { AVATAR_SHEETS } from '../boot/asset-manifest';
import { type AvatarId } from '../shared/avatar-palette';
import { tileCenterToPixel } from '../shared/iso-math';
import type { AvatarAction, TileCoord } from '../shared/types';
import { animationKey } from './avatar-animations';
import {
  createAvatarVisuals,
  destroyVisuals,
  setVisualsDepth,
  setVisualsLevel,
  syncVisualAttachments,
  type AvatarBody,
  type AvatarVisuals,
} from './avatar-renderer';
import { WORLD_TILE_SIZE } from './camera.config';
import { worldSpritesConfig } from './sprites.config';

export type LocalAvatarOptions = {
  readonly memberId: string;
  readonly avatarId: AvatarId;
  readonly displayName: string;
  readonly spawnTile?: TileCoord;
  /** Exact pixel spawn — wins over `spawnTile` when provided (tavern
   *  uses this because its background is an image, not an iso tilemap). */
  readonly spawnPixel?: { readonly x: number; readonly y: number };
};

export class LocalAvatar {
  readonly body: Phaser.Physics.Arcade.Body;
  readonly memberId: string;
  readonly avatarId: AvatarId;
  private readonly visuals: AvatarVisuals;

  private _direction: AvatarDirection = 's';
  private _isMoving = false;
  private _isJumping = false;

  constructor(scene: Phaser.Scene, options: LocalAvatarOptions) {
    this.memberId = options.memberId;
    this.avatarId = options.avatarId;
    const cfg = worldSpritesConfig.avatar;
    const spawnPx =
      options.spawnPixel ?? tileCenterToPixel(options.spawnTile ?? cfg.spawnTile, WORLD_TILE_SIZE);

    this.visuals = createAvatarVisuals(
      scene,
      options.avatarId,
      spawnPx.x,
      spawnPx.y,
      options.displayName,
    );

    scene.physics.add.existing(this.visuals.gameObject);
    this.body = this.visuals.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(cfg.bodyOffset.width, cfg.bodyOffset.height);
    this.body.setOffset(cfg.bodyOffset.x, cfg.bodyOffset.y);
  }

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

  get direction(): AvatarDirection {
    return this._direction;
  }

  set direction(value: AvatarDirection) {
    this._direction = value;
  }

  get isMoving(): boolean {
    return this._isMoving;
  }

  set isMoving(value: boolean) {
    this._isMoving = value;
  }

  /** True between triggerJump() and the jump animation's ANIMATION_COMPLETE. */
  get isJumping(): boolean {
    return this._isJumping;
  }

  /**
   * Plays the animation matching the current (action, direction) pair. If
   * the requested clip isn't registered (e.g. the spritesheet hasn't been
   * authored yet), falls back to the idle clip in the same direction.
   * No-op when running in Rectangle-placeholder mode.
   */
  playAnim(action: AvatarAction, direction: AvatarDirection): void {
    const sprite = this.visuals.sprite;
    if (!sprite) return;

    const scene = sprite.scene;
    const requested = animationKey(this.avatarId, action, direction);

    if (scene.anims.exists(requested)) {
      sprite.anims.play(requested, true);
      return;
    }

    const idleFallback = animationKey(this.avatarId, 'idle', direction);
    if (scene.anims.exists(idleFallback)) {
      sprite.anims.play(idleFallback, true);
    }
  }

  /**
   * Plays the one-shot jump animation for the given direction. Guards
   * against re-entry while already jumping. Registers a one-time
   * 'animationcomplete' listener that clears `_isJumping` so WorldScene's
   * update() resumes walk/idle on the next frame.
   *
   * No-op for Rectangle-placeholder avatars or when the jump sheet is
   * missing for this avatar.
   */
  triggerJump(direction: AvatarDirection): void {
    const sprite = this.visuals.sprite;
    if (!sprite || this._isJumping) return;
    const scene = sprite.scene;
    const key = animationKey(this.avatarId, 'jump', direction);
    if (!scene.anims.exists(key)) return;

    this._isJumping = true;
    sprite.once('animationcomplete', () => {
      this._isJumping = false;
    });
    sprite.anims.play(key);
  }

  /** Called each frame from WorldScene.update() — keeps name + badge glued. */
  syncAttachments(): void {
    syncVisualAttachments(this.visuals);
  }

  /** Depth assignment — WorldScene y-sort calls this each frame. */
  setDepth(depth: number): void {
    setVisualsDepth(this.visuals, depth);
  }

  setLevel(level: number): void {
    setVisualsLevel(this.visuals, level);
  }

  destroy(): void {
    destroyVisuals(this.visuals);
  }
}

// Re-export so WorldScene's y-sort type doesn't break.
export { AVATAR_SHEETS };
