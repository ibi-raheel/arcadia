// One-shot SPACE → jump binding for interior scenes. Tavern and
// CoworkingInsideScene each maintain this pattern inline; Academy + Market
// were missing it (Phase 7 items AC8, M2). This helper replaces the five-
// line key-capture + JustDown dance with three lines per scene and keeps
// the isJumping guard in one place.
//
// Usage:
//   create():           this.jumpBinding = createJumpBinding(this);
//   update():           this.jumpBinding?.tryJump(this.localAvatar);
//
// NOT yet applied to Tavern or Coworking-inside — those scenes work today.
// A future tidy-up commit can migrate them. Per CLAUDE.md "a bug fix doesn't
// need surrounding cleanup."

import * as Phaser from 'phaser';

import type { LocalAvatar } from '../world/local-avatar';

export type JumpBinding = {
  readonly spaceKey: Phaser.Input.Keyboard.Key | null;
  /** Call once per frame from the scene's update loop. */
  tryJump(avatar: LocalAvatar | undefined): void;
  destroy(): void;
};

export function createJumpBinding(scene: Phaser.Scene): JumpBinding {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    return {
      spaceKey: null,
      tryJump: () => undefined,
      destroy: () => undefined,
    };
  }
  keyboard.addCapture('SPACE');
  const spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  return {
    spaceKey,
    tryJump(avatar) {
      if (!avatar || avatar.isJumping) return;
      if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        avatar.triggerJump(avatar.direction);
      }
    },
    destroy() {
      // Phaser disposes keys on scene shutdown; explicit cleanup is optional.
    },
  };
}
