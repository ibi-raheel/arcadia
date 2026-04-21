// Tavern sprites + spawn config. 2026-04-20: interior art swapped for
// a 1536×1024 image; avatar scaled −30% (128 → 90) and spawn repositioned
// proportionally so the character still lands bottom-centre.

export const tavernSpritesConfig = {
  avatar: {
    // Proportional to the new 1536×1024 interior: previous (688, 620) on
    // 1376×768 = 50% across, 80.7% down → same on the new canvas.
    spawnPixel: { x: 768, y: 826 },
    // 90×90 display — 128 × 0.7 (user request, 2026-04-20). Source sheets
    // stay 64×64; setDisplaySize upscales ~1.4× (pixelArt keeps nearest-
    // neighbour crisp).
    size: { width: 90, height: 90 },
    // Feet-only body offset scaled in lockstep with `size` (×0.7 vs 128×128).
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
