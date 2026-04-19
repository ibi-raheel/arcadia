// The local member's avatar. Two render paths:
//
//   1. Spritesheet (preferred) — if an avatar sheet is registered in
//      AVATAR_SHEETS and BootScene loaded it, instantiates a Phaser Sprite
//      and plays the matching iso-direction animation each frame via
//      `playAnim(action, direction)`.
//   2. Rectangle placeholder (fallback) — for avatars with no sheet yet.
//      Visible as a coloured box; state (direction/isMoving) still tracked.
//
// Either path participates in y-sort via `y` + `height`, and carries a
// display-name text + Lv 1 badge that follow the body each frame.

import type Phaser from 'phaser';

import { AVATAR_SHEETS } from '../boot/asset-manifest';
import { AVATAR_COLORS, type AvatarId } from '../shared/avatar-palette';
import { tileCenterToPixel } from '../shared/iso-math';
import type { AvatarAction, AvatarDirection, TileCoord } from '../shared/types';
import { animationKey, avatarHasSprite, primaryAvatarTextureKey } from './avatar-animations';
import { WORLD_TILE_SIZE } from './camera.config';
import { worldSpritesConfig } from './sprites.config';

export type LocalAvatarOptions = {
  readonly avatarId: AvatarId;
  readonly displayName: string;
  readonly spawnTile?: TileCoord;
};

const DISPLAY_NAME_MAX = 16;

// Phaser's Rectangle and Sprite share the surface we need: x, y, height,
// setDepth, body (via add.existing). This internal alias keeps the physics
// + positioning code path-agnostic.
type AvatarBody = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;

export class LocalAvatar {
  readonly body: Phaser.Physics.Arcade.Body;
  readonly avatarId: AvatarId;
  private readonly gameObject: AvatarBody;
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly levelBadge: Phaser.GameObjects.Text;

  private _direction: AvatarDirection = 's';
  private _isMoving = false;
  private _isJumping = false;

  constructor(scene: Phaser.Scene, options: LocalAvatarOptions) {
    this.avatarId = options.avatarId;
    const cfg = worldSpritesConfig.avatar;
    const spawnTile = options.spawnTile ?? cfg.spawnTile;
    const spawnPx = tileCenterToPixel(spawnTile, WORLD_TILE_SIZE);

    const textureKey = avatarHasSprite(scene, options.avatarId)
      ? primaryAvatarTextureKey(scene, options.avatarId)
      : null;

    if (textureKey) {
      const s = scene.add.sprite(spawnPx.x, spawnPx.y, textureKey, 0);
      s.setDisplaySize(cfg.size.width, cfg.size.height);
      this.gameObject = s;
      this.sprite = s;
    } else {
      const r = scene.add.rectangle(
        spawnPx.x,
        spawnPx.y,
        cfg.size.width,
        cfg.size.height,
        AVATAR_COLORS[options.avatarId],
      );
      r.setStrokeStyle(2, 0x000000, 0.5);
      this.gameObject = r;
      this.sprite = null;
    }

    scene.physics.add.existing(this.gameObject);
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(cfg.bodyOffset.width, cfg.bodyOffset.height);
    this.body.setOffset(cfg.bodyOffset.x, cfg.bodyOffset.y);

    const displayName = options.displayName.slice(0, DISPLAY_NAME_MAX);
    this.nameText = scene.add
      .text(spawnPx.x, spawnPx.y - cfg.size.height / 2 - 4, displayName, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);

    this.levelBadge = scene.add
      .text(spawnPx.x, spawnPx.y + cfg.size.height / 2 + 4, 'Lv 1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#222',
        padding: { left: 4, right: 4, top: 1, bottom: 1 },
      })
      .setOrigin(0.5, 0);
  }

  get rect(): AvatarBody {
    return this.gameObject;
  }

  get x(): number {
    return this.gameObject.x;
  }

  get y(): number {
    return this.gameObject.y;
  }

  get height(): number {
    return this.gameObject.height;
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
    if (!this.sprite) return;

    const scene = this.sprite.scene;
    const requested = animationKey(this.avatarId, action, direction);

    if (scene.anims.exists(requested)) {
      this.sprite.anims.play(requested, true);
      return;
    }

    const idleFallback = animationKey(this.avatarId, 'idle', direction);
    if (scene.anims.exists(idleFallback)) {
      this.sprite.anims.play(idleFallback, true);
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
    if (!this.sprite || this._isJumping) return;
    const scene = this.sprite.scene;
    const key = animationKey(this.avatarId, 'jump', direction);
    if (!scene.anims.exists(key)) return;

    this._isJumping = true;
    this.sprite.once('animationcomplete', () => {
      this._isJumping = false;
    });
    this.sprite.anims.play(key);
  }

  /** Called each frame from WorldScene.update() — keeps name + badge glued to the body. */
  syncAttachments(): void {
    const cfgSize = worldSpritesConfig.avatar.size;
    const dy = cfgSize.height / 2;
    this.nameText.setPosition(this.gameObject.x, this.gameObject.y - dy - 4);
    this.levelBadge.setPosition(this.gameObject.x, this.gameObject.y + dy + 4);
  }

  /** Depth assignment — WorldScene y-sort calls this each frame. */
  setDepth(depth: number): void {
    this.gameObject.setDepth(depth);
    this.nameText.setDepth(depth + 0.1);
    this.levelBadge.setDepth(depth + 0.1);
  }
}

// Re-export so WorldScene's y-sort type doesn't break.
export { AVATAR_SHEETS };
