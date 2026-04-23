// Tavern sprites + spawn config. 2026-04-20: interior art swapped for
// a 1536×1024 image; avatar scaled −30% (128 → 90) and spawn repositioned
// proportionally so the character still lands bottom-centre.

export const tavernSpritesConfig = {
  avatar: {
    // Upper spawn. Exit is a walk-off on the bottom edge (trigger
    // threshold 600 → fires at y>=424). Spawn at y=350 is safely
    // above the band, with ~74 px between spawn and trigger.
    spawnPixel: { x: 768, y: 350 },
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
