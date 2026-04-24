// Square outdoor sprite config. Spawn lands the avatar just south of the
// centre portal so the member sees the full junction on first load. Avatar
// size + body offset match every image-backed scene (135×135 / 68×33
// feet box — bumped +50% 2026-04-22 per user feedback on readability).

// 2026-04-22 user request: keep the square avatar 50% bigger than every
// other scene so the member reads as the focal point when they arrive
// at the home hub. Other scenes stay at 135 × 135; square is 202 × 202.
// bodyOffset stays at (22, 62, 45, 22) in frame units — Phaser Arcade
// scales it automatically with sprite.scale, so the feet-box grows in
// lockstep with the sprite. (Don't pre-scale this offset: it double-
// scales and pushes the body well past the image bounds, which is what
// caused "cannot exit via bottom edge" earlier today.)
export const squareSpritesConfig = {
  avatar: {
    // Near the centre portal, slightly south so the portal itself is visible
    // on first camera-centre.
    spawnPixel: { x: 1254, y: 1380 },
    size: { width: 202, height: 202 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 325,
    clickArrivalThreshold: 4,
  },
} as const;

/**
 * Per-origin return spawns. When the member re-enters the Square after
 * exiting a neighbouring scene, `GameSquare` reads `?from=<origin>` and
 * passes the matching entry to `SquareScene` via the registry so the
 * avatar lands at the bridge/gate they walked through rather than the
 * default centre spawn. No `?from=` → fall back to the default.
 *
 * Image is 2508×2508; edge-trigger thresholds are 300 px. Coords sit
 * visually on each bridge/gate and inside the ENTER-gated trigger band —
 * the member arrives next to the door they came from and immediately
 * sees the "Press ENTER to visit X" prompt for it (the triggers are
 * ENTER-gated per Phase 7.0 step 4, so spawning inside doesn't auto-fire).
 */
export const SQUARE_RETURN_SPAWNS: Readonly<
  Record<string, { readonly x: number; readonly y: number } | undefined>
> = {
  market: { x: 1254, y: 2250 }, // south bridge
  academy: { x: 1254, y: 260 }, // north gate
  tavern: { x: 2250, y: 1254 }, // east gate
  coworking: { x: 260, y: 1254 }, // west bridge
};
