// The local member's avatar — Phase 1 Rectangle placeholder with a display
// name text above and a level badge below. Visual is a single Rectangle
// primitive (colour = AVATAR_COLORS[avatarId]) with an Arcade Physics body
// sized from sprites.config.bodyOffset.
//
// Owns its `direction` + `isMoving` state (set by Steps 13–16); exposes `y`
// / `height` so WorldScene's y-sort registry can depth-sort it against
// buildings each frame.
//
// When real atlases arrive this module becomes `Rectangle` → `Sprite(atlas)`
// and binds walk/idle frame sets to `isMoving`; everything else stays.

import type Phaser from 'phaser';

import { tileCenterToPixel } from '../shared/iso-math';
import { AVATAR_COLORS, type AvatarId } from '../shared/avatar-palette';
import type { Direction, TileCoord } from '../shared/types';
import { WORLD_TILE_SIZE } from './camera.config';
import { worldSpritesConfig } from './sprites.config';

export type LocalAvatarOptions = {
  readonly avatarId: AvatarId;
  readonly displayName: string;
  /** Override spawn tile — used by Step 19 return-to-world to spawn at a
   *  building's exit tile instead of the default centre. */
  readonly spawnTile?: TileCoord;
};

const DISPLAY_NAME_MAX = 16;

export class LocalAvatar {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;

  private readonly nameText: Phaser.GameObjects.Text;
  private readonly levelBadge: Phaser.GameObjects.Text;

  private _direction: Direction = 'down';
  private _isMoving = false;

  constructor(scene: Phaser.Scene, options: LocalAvatarOptions) {
    const cfg = worldSpritesConfig.avatar;
    const spawnTile = options.spawnTile ?? cfg.spawnTile;
    const spawnPx = tileCenterToPixel(spawnTile, WORLD_TILE_SIZE);
    const color = AVATAR_COLORS[options.avatarId];

    this.rect = scene.add.rectangle(spawnPx.x, spawnPx.y, cfg.size.width, cfg.size.height, color);
    this.rect.setStrokeStyle(2, 0x000000, 0.5);

    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(cfg.bodyOffset.width, cfg.bodyOffset.height);
    // Phaser's setOffset is relative to the sprite's top-left — for a
    // centred Rectangle the origin is (0.5, 0.5), so top-left is
    // (x - width/2, y - height/2). Offsets are taken from that.
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

  get x(): number {
    return this.rect.x;
  }

  get y(): number {
    return this.rect.y;
  }

  get height(): number {
    return this.rect.height;
  }

  get direction(): Direction {
    return this._direction;
  }

  set direction(value: Direction) {
    this._direction = value;
  }

  get isMoving(): boolean {
    return this._isMoving;
  }

  set isMoving(value: boolean) {
    this._isMoving = value;
  }

  /** Called each frame from WorldScene.update() — keeps name + badge glued to the rect. */
  syncAttachments(): void {
    const dy = this.rect.height / 2;
    this.nameText.setPosition(this.rect.x, this.rect.y - dy - 4);
    this.levelBadge.setPosition(this.rect.x, this.rect.y + dy + 4);
  }

  /** Depth assignment — WorldScene y-sort calls this each frame. Also depths the attachments. */
  setDepth(depth: number): void {
    this.rect.setDepth(depth);
    this.nameText.setDepth(depth + 0.1);
    this.levelBadge.setDepth(depth + 0.1);
  }
}
