// Tavern sprites + spawn config. 2026-04-20: interior art swapped for
// a 1536×1024 image; avatar scaled −30% (128 → 90) and spawn repositioned
// proportionally so the character still lands bottom-centre.

export const tavernSpritesConfig = {
  avatar: {
    // Top-centre spawn. Exit is the bottom-centre archway (trigger
    // threshold 400 → fires at y>=624). Spawning at y=300 gives a
    // clear north-south walk down through the room toward the
    // archway.
    spawnPixel: { x: 768, y: 300 },
    // 90×90 display — 128 × 0.7 (user request, 2026-04-20). Source sheets
    // stay 64×64; setDisplaySize upscales ~1.4× (pixelArt keeps nearest-
    // neighbour crisp).
    size: { width: 135, height: 135 },
    // Feet-only body offset scaled in lockstep with `size` (×0.7 vs 128×128).
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 200,
    clickArrivalThreshold: 2,
  },
} as const;
