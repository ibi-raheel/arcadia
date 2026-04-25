// Bridge for "an overlay input field has focus → release Phaser's
// keyboard captures so the user can type WASD / SPACE / ENTER".
//
// Implementation note: Phaser's KeyboardManager attaches its keydown
// listener at *capture phase* on `window`, so a textarea calling
// `event.stopPropagation()` doesn't help — Phaser sees the event
// first and `preventDefault()`s it. The only reliable fix is to
// disable Phaser's keyboard plugin while the overlay is open, then
// re-enable on blur.
//
// React side dispatches a CustomEvent on `window`. Phaser scenes
// listen with `window.addEventListener`. Decoupled — neither side
// needs to know the other exists.

export const OVERLAY_INPUT_FOCUS_EVENT = 'arcadia:overlay-input-focus' as const;
export const OVERLAY_INPUT_BLUR_EVENT = 'arcadia:overlay-input-blur' as const;

/** Dispatch from any overlay input's `onFocus`. Safe to call from
 *  client-only paths — guards against `window` undefined for SSR. */
export function emitOverlayInputFocus(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OVERLAY_INPUT_FOCUS_EVENT));
}

/** Dispatch from any overlay input's `onBlur` (or on cleanup). */
export function emitOverlayInputBlur(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OVERLAY_INPUT_BLUR_EVENT));
}

import type Phaser from 'phaser';

/**
 * Wires a Phaser scene to disable its keyboard plugin while overlay
 * inputs have focus. Call from the scene's `create()`; returns a
 * teardown function the scene calls in `shutdown()` / `destroy()`.
 *
 * Implementation mirrors `TavernScene.disableKeyboardInput` —
 * setting `keyboard.enabled = false` alone isn't enough; the
 * KeyboardManager-level captures registered via `addCapture` keep
 * preventing default at the DOM listener. We must `clearCaptures()`
 * on focus and re-add the scene's standard captures on blur.
 */
export function bindOverlayInputBridge(
  scene: Phaser.Scene,
  config: { readonly capturesOnBlur: readonly string[] },
): () => void {
  const onFocus = (): void => {
    const kbd = scene.input.keyboard;
    if (!kbd) return;
    kbd.enabled = false;
    kbd.clearCaptures();
  };
  const onBlur = (): void => {
    const kbd = scene.input.keyboard;
    if (!kbd) return;
    kbd.enabled = true;
    if (config.capturesOnBlur.length > 0) {
      kbd.addCapture(config.capturesOnBlur.join(','));
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(OVERLAY_INPUT_FOCUS_EVENT, onFocus);
    window.addEventListener(OVERLAY_INPUT_BLUR_EVENT, onBlur);
  }

  return () => {
    if (typeof window === 'undefined') return;
    window.removeEventListener(OVERLAY_INPUT_FOCUS_EVENT, onFocus);
    window.removeEventListener(OVERLAY_INPUT_BLUR_EVENT, onBlur);
  };
}
