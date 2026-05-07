// Shared speech-bubble factory + constants. Used by:
//   - `TavernScene` for the chat-message bubbles above speakers' heads
//   - `NpcSwarm` for the demo NPCs' random ambient mutterings
//
// Visual: dark rounded-rect background, 1 px charcoal stroke, vellum
// text in Georgia serif. A small triangular tail on the bottom centre
// points down to the speaker. Container origin is (0, 0); the rect +
// tail are drawn so the tail tip sits exactly at (0, 0), making
// callers' positioning trivial — set `bubble.setPosition(speakerX,
// speakerY - SPEECH_BUBBLE_Y_OFFSET)` and the tail anchors above
// their head.

import type Phaser from 'phaser';

import { addCrispText } from './crisp-text';

/** How far above the avatar's center the bubble's tail-tip sits. */
export const SPEECH_BUBBLE_Y_OFFSET = 110;
/** How long a bubble stays on screen before it auto-destroys. */
export const SPEECH_BUBBLE_DURATION_MS = 5000;
/** Depth above HUDs / pills / capacity badges. Same value the tavern
 *  has used since Phase 2 — kept stable so the NPC swarm doesn't need
 *  its own scale. */
export const SPEECH_BUBBLE_DEPTH = 10_000;

const SPEECH_BUBBLE_MAX_WIDTH = 200;
const SPEECH_BUBBLE_PAD_X = 10;
const SPEECH_BUBBLE_PAD_Y = 6;

/**
 * Build a speech-bubble Container (background rounded-rect + tail +
 * text). Origin sits at the bottom-centre so callers can attach it
 * directly above an avatar's head by setting (x, y) to the avatar's
 * top-of-head coord.
 */
export function createSpeechBubble(
  scene: Phaser.Scene,
  text: string,
): Phaser.GameObjects.Container {
  const textObj = addCrispText(scene, 0, 0, text, {
    fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
    fontSize: '14px',
    color: '#fef3c7',
    wordWrap: { width: SPEECH_BUBBLE_MAX_WIDTH, useAdvancedWrap: true },
  }).setOrigin(0.5, 0.5);

  const w = textObj.width + SPEECH_BUBBLE_PAD_X * 2;
  const h = textObj.height + SPEECH_BUBBLE_PAD_Y * 2;

  const tailSize = 6;
  const bg = scene.add.graphics();
  bg.fillStyle(0x0a0a0a, 0.85);
  bg.lineStyle(1, 0x4a4a4a, 1);
  bg.fillRoundedRect(-w / 2, -h - tailSize, w, h, 6);
  bg.strokeRoundedRect(-w / 2, -h - tailSize, w, h, 6);
  bg.fillTriangle(-tailSize, -tailSize, tailSize, -tailSize, 0, 0);
  bg.lineBetween(-tailSize, -tailSize, 0, 0);
  bg.lineBetween(tailSize, -tailSize, 0, 0);

  textObj.setPosition(0, -tailSize - h / 2);

  return scene.add.container(0, 0, [bg, textObj]);
}
