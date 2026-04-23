// Tavern sprites + spawn config. 2026-04-20: interior art swapped for
// a 1536×1024 image; avatar scaled −30% (128 → 90) and spawn repositioned
// proportionally so the character still lands bottom-centre.

export const tavernSpritesConfig = {
  avatar: {
    // Top-middle spawn (2026-04-22). Exit is now a walk-off on the
    // bottom edge — member needs room to walk south, so spawn near the
    // top rather than the "bottom-centre" spot we used before the
    // "Return to World" button was removed.
    spawnPixel: { x: 768, y: 300 },
    // 90×90 display — 128 × 0.7 (user request, 2026-04-20). Source sheets
    // stay 64×64; setDisplaySize upscales ~1.4× (pixelArt keeps nearest-
    // neighbour crisp).
    size: { width: 135, height: 135 },
    // Feet-only body offset scaled in lockstep with `size` (×0.7 vs 128×128).
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
