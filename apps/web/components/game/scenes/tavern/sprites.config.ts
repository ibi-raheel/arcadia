// Tavern sprites + spawn config. 2026-04-20: interior art swapped for
// a 1536×1024 image; avatar scaled −30% (128 → 90) and spawn repositioned
// proportionally so the character still lands bottom-centre.

export const tavernSpritesConfig = {
  avatar: {
    // 2026-04-23 (Phase 7) — spawn AT the exit archway so the
    // "Press ENTER to leave" prompt is visible on arrival (matches
    // the market/square pattern). Member lands at the archway's
    // centre (768, 960); the exit is now ENTER-gated, so sitting
    // inside the radius shows the prompt without firing navigation.
    spawnPixel: { x: 768, y: 960 },
    // 90×90 display — 128 × 0.7 (user request, 2026-04-20). Source sheets
    // stay 64×64; setDisplaySize upscales ~1.4× (pixelArt keeps nearest-
    // neighbour crisp).
    size: { width: 135, height: 135 },
    // Feet-only body offset scaled in lockstep with `size` (×0.7 vs 128×128).
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 200,
    clickArrivalThreshold: 2,
  },
  /**
   * Async-feed tablet — the small screen mounted on the shelf to the
   * right of the bar in `public/tavern-interior.png`. Walking close
   * fires a proximity prompt; ENTER opens the `FeedScroll` modal.
   *
   * Coords eyeballed against the 1536×1024 source image — nudge here
   * if the tablet visual ever moves.
   */
  tablet: {
    centerX: 1100,
    centerY: 430,
    interactRadius: 150,
  },
} as const;
