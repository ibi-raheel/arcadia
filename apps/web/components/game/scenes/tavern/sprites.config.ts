// Tavern sprites + spawn config. 2026-04-19 polish — spawn now uses a
// pixel coordinate inside the tavern-interior image (1376×768) rather
// than an iso tile coord, since the tavern is image-backed now.

export const tavernSpritesConfig = {
  avatar: {
    // Spawn bottom-centre of the image so the character doesn't land on
    // top of the bar counter; feels like entering the room from the floor.
    spawnPixel: { x: 688, y: 620 },
    // 96×96 display — 3× WorldScene's 32×32 for tavern (2026-04-20). Source
    // sheets stay 64×64; Phaser's setDisplaySize upscales 1.5× (light blur
    // on pixel art, but the tavern reads at a comfortable size).
    size: { width: 96, height: 96 },
    // Feet-only body offset scaled in lockstep with `size` (×1.5 vs 64×64).
    bodyOffset: { x: 24, y: 66, width: 48, height: 24 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
