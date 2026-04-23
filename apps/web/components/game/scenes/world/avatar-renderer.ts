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
  /**
   * Combined "Name · Lv N" label above the avatar. 2026-04-23: merged
   * from separate name + level badge into a single bigger label per
   * user feedback ("increase font size, display level right next to
   * the name, better looking font").
   */
  readonly nameText: Phaser.GameObjects.Text;
  /** Display size used at creation — drives `syncVisualAttachments` offsets. */
  readonly size: AvatarSize;
  /** Mutable so `setVisualsLevel` can rebuild the combined label text. */
  displayName: string;
  level: number;
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
    .text(x, y - size.height / 2 - 6, `${displayName} · Lv ${level}`, {
      // Warm serif face reads as an RPG nameplate and scales well
      // without getting pixel-fuzzy at the new larger size.
      fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fef3c7',
      stroke: '#1c1917',
      strokeThickness: 4,
    })
    .setOrigin(0.5, 1);

  return { gameObject, sprite, nameText, size, displayName, level };
}

/**
 * Keep the name label glued to the current body position. Called every
 * frame from the scene's update() loop.
 */
export function syncVisualAttachments(visuals: AvatarVisuals): void {
  const dy = visuals.size.height / 2;
  visuals.nameText.setPosition(visuals.gameObject.x, visuals.gameObject.y - dy - 6);
}

/** Apply the same depth to body + attachments (y-sort). */
export function setVisualsDepth(visuals: AvatarVisuals, depth: number): void {
  visuals.gameObject.setDepth(depth);
  visuals.nameText.setDepth(depth + 0.1);
}

/** Update the level portion of the combined nameplate. */
export function setVisualsLevel(visuals: AvatarVisuals, level: number): void {
  visuals.level = level;
  visuals.nameText.setText(`${visuals.displayName} · Lv ${level}`);
}

/** Clean up all game objects — use on scene teardown or when a peer leaves. */
export function destroyVisuals(visuals: AvatarVisuals): void {
  visuals.gameObject.destroy();
  visuals.nameText.destroy();
}
