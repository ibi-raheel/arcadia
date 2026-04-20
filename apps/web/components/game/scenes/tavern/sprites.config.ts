// Tavern sprites + spawn config. 2026-04-19 polish — spawn now uses a
// pixel coordinate inside the tavern-interior image (1376×768) rather
// than an iso tile coord, since the tavern is image-backed now.

export const tavernSpritesConfig = {
  avatar: {
    // Spawn bottom-centre of the image so the character doesn't land on
    // top of the bar counter; feels like entering the room from the floor.
    spawnPixel: { x: 688, y: 620 },
    // 128×128 display — 4× WorldScene's 32×32 (2026-04-20). Source sheets
    // stay 64×64; Phaser's setDisplaySize upscales 2× (pixelArt:true on the
    // game keeps the nearest-neighbour look crisp).
    size: { width: 128, height: 128 },
    // Feet-only body offset scaled in lockstep with `size` (×2 vs 64×64).
    bodyOffset: { x: 32, y: 88, width: 64, height: 32 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
