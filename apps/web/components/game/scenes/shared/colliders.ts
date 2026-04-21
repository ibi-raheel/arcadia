// Shared helper for image-backed scenes (Tavern / Academy / Market) to
// declare static collision rectangles. Ships empty by default; users drop
// in rects via each scene's `layers.config.ts` as they finalise the art.
//
// Usage (inside a scene's create()):
//   const group = spawnColliders(this, layersConfig.colliders);
//   if (this.localAvatar) this.physics.add.collider(this.localAvatar.body, group);

import type Phaser from 'phaser';

import type { PixelRect } from './types';

/**
 * Build a static physics group from a list of pixel rects. Rects are
 * drawn at (x + width/2, y + height/2) because Phaser Arcade static
 * bodies are centre-anchored. Returns the StaticGroup so the caller
 * can add colliders against it.
 */
export function spawnColliders(
  scene: Phaser.Scene,
  rects: readonly PixelRect[],
): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();
  for (const rect of rects) {
    const body = scene.add.rectangle(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
      0x000000,
      0,
    );
    group.add(body);
    // Refresh because the Rectangle game-object dimensions need to
    // propagate to the static body after add.
    (body.body as Phaser.Physics.Arcade.StaticBody | null)?.setSize(rect.width, rect.height);
  }
  group.refresh();
  return group;
}
