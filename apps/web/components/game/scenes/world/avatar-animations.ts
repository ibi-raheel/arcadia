// One-time registration of Phaser animations for every (avatarId, action,
// iso-direction) declared in AVATAR_SHEETS. Called from WorldScene.create()
// after BootScene has finished preloading the sheets.
//
// Animation keys follow the convention: `<avatarId>-<action>-<direction>`
// e.g. `avatar-01-idle-se`. LocalAvatar.playAnim() composes keys in that shape.

import type Phaser from 'phaser';

import { AVATAR_SHEETS, type AvatarSheet } from '../boot/asset-manifest';
import type { AvatarId } from '../shared/avatar-palette';
import type { AvatarAction, AvatarDirection } from '../shared/types';

export function animationKey(
  avatarId: AvatarId,
  action: AvatarAction,
  direction: AvatarDirection,
): string {
  return `${avatarId}-${action}-${direction}`;
}

/**
 * Creates one Phaser animation per (avatar, action, direction) tuple.
 * Safe to call multiple times — skips any animation that already exists.
 */
export function registerAvatarAnimations(scene: Phaser.Scene): void {
  for (const [avatarId, actions] of Object.entries(AVATAR_SHEETS) as Array<
    [AvatarId, Partial<Record<AvatarAction, AvatarSheet>> | undefined]
  >) {
    if (!actions) continue;
    for (const [action, sheet] of Object.entries(actions) as Array<
      [AvatarAction, AvatarSheet | undefined]
    >) {
      if (!sheet) continue;
      if (sheet.directionRowOrder.length !== sheet.rows) {
        console.warn(
          `${avatarId}.${action}: directionRowOrder length (${sheet.directionRowOrder.length}) != rows (${sheet.rows})`,
        );
        continue;
      }
      for (let row = 0; row < sheet.rows; row++) {
        const direction = sheet.directionRowOrder[row];
        if (!direction) continue;
        const start = row * sheet.cols;
        const end = start + sheet.cols - 1;
        const key = animationKey(avatarId, action, direction);
        if (scene.anims.exists(key)) continue;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(sheet.key, { start, end }),
          frameRate: sheet.frameRate,
          repeat: sheet.repeat,
        });
      }
    }
  }
}

/**
 * True if the spritesheet for this avatarId is registered on the texture
 * manager (i.e. BootScene successfully loaded its PNG). LocalAvatar uses
 * this to choose Sprite mode vs Rectangle placeholder.
 */
export function avatarHasSprite(scene: Phaser.Scene, avatarId: AvatarId): boolean {
  const actions = AVATAR_SHEETS[avatarId];
  if (!actions) return false;
  for (const sheet of Object.values(actions)) {
    if (sheet && scene.textures.exists(sheet.key)) return true;
  }
  return false;
}

/**
 * Returns the texture key of the first action sheet loaded for this avatar —
 * used by LocalAvatar to pick which sheet to instantiate the Sprite with.
 * Phaser animations reference frames by texture key, so it doesn't matter
 * which action sheet the Sprite "starts on"; playAnim() swaps frame sets.
 */
export function primaryAvatarTextureKey(scene: Phaser.Scene, avatarId: AvatarId): string | null {
  const actions = AVATAR_SHEETS[avatarId];
  if (!actions) return null;
  for (const sheet of Object.values(actions)) {
    if (sheet && scene.textures.exists(sheet.key)) return sheet.key;
  }
  return null;
}
