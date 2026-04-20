// Shared rendering helpers for Local + Remote avatars. Builds the Phaser
// game object (Sprite if the avatar's spritesheets are registered, else
// a colored Rectangle placeholder), the display-name text, and the level
// badge. Keeps the two avatar classes focused on their behavioural
// differences — physics vs interpolation.

import type Phaser from 'phaser';

import { AVATAR_COLORS, AVATAR_NAMES, type AvatarId } from '../shared/avatar-palette';
import { avatarHasSprite, primaryAvatarTextureKey } from './avatar-animations';
import { worldSpritesConfig } from './sprites.config';

export type AvatarBody = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;

export const DISPLAY_NAME_MAX = 16;

export type AvatarSize = { readonly width: number; readonly height: number };

export type AvatarVisuals = {
  readonly gameObject: AvatarBody;
  /** Non-null only when the avatar rendered as a Sprite (sheet registered). */
  readonly sprite: Phaser.GameObjects.Sprite | null;
  readonly nameText: Phaser.GameObjects.Text;
  readonly levelBadge: Phaser.GameObjects.Text;
  /** Display size used at creation — drives `syncVisualAttachments` offsets. */
  readonly size: AvatarSize;
};

export function createAvatarVisuals(
  scene: Phaser.Scene,
  avatarId: AvatarId,
  x: number,
  y: number,
  displayNameRaw: string,
  level: number = 1,
  sizeOverride?: AvatarSize,
): AvatarVisuals {
  const cfg = worldSpritesConfig.avatar;
  const size = sizeOverride ?? cfg.size;
  const textureKey = avatarHasSprite(scene, avatarId)
    ? primaryAvatarTextureKey(scene, avatarId)
    : null;

  let gameObject: AvatarBody;
  let sprite: Phaser.GameObjects.Sprite | null;

  if (textureKey) {
    const s = scene.add.sprite(x, y, textureKey, 0);
    s.setDisplaySize(size.width, size.height);
    gameObject = s;
    sprite = s;
  } else {
    const r = scene.add.rectangle(x, y, size.width, size.height, AVATAR_COLORS[avatarId]);
    r.setStrokeStyle(2, 0x000000, 0.5);
    gameObject = r;
    sprite = null;
  }

  // Empty display name falls back to the avatar's canonical name (the
  // friendly label shown in the onboarding picker) — keeps remote avatars
  // labelled even if the owning member never set a display name.
  const cleanName =
    displayNameRaw.trim().length > 0 ? displayNameRaw.trim() : AVATAR_NAMES[avatarId];
  const displayName = cleanName.slice(0, DISPLAY_NAME_MAX);

  const nameText = scene.add
    .text(x, y - size.height / 2 - 4, displayName, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1);

  const levelBadge = scene.add
    .text(x, y + size.height / 2 + 4, `Lv ${level}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#222',
      padding: { left: 4, right: 4, top: 1, bottom: 1 },
    })
    .setOrigin(0.5, 0);

  return { gameObject, sprite, nameText, levelBadge, size };
}

/**
 * Keep the name + level badge glued to the current body position. Called
 * every frame from the scene's update() loop.
 */
export function syncVisualAttachments(visuals: AvatarVisuals): void {
  const dy = visuals.size.height / 2;
  visuals.nameText.setPosition(visuals.gameObject.x, visuals.gameObject.y - dy - 4);
  visuals.levelBadge.setPosition(visuals.gameObject.x, visuals.gameObject.y + dy + 4);
}

/** Apply the same depth to body + attachments (y-sort). */
export function setVisualsDepth(visuals: AvatarVisuals, depth: number): void {
  visuals.gameObject.setDepth(depth);
  visuals.nameText.setDepth(depth + 0.1);
  visuals.levelBadge.setDepth(depth + 0.1);
}

/** Update the level badge text (called when AvatarState.level changes). */
export function setVisualsLevel(visuals: AvatarVisuals, level: number): void {
  visuals.levelBadge.setText(`Lv ${level}`);
}

/** Clean up all game objects — use on scene teardown or when a peer leaves. */
export function destroyVisuals(visuals: AvatarVisuals): void {
  visuals.gameObject.destroy();
  visuals.nameText.destroy();
  visuals.levelBadge.destroy();
}
