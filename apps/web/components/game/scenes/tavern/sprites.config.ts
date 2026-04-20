// Tavern sprites + spawn config. 2026-04-19 polish — spawn now uses a
// pixel coordinate inside the tavern-interior image (1376×768) rather
// than an iso tile coord, since the tavern is image-backed now.

export const tavernSpritesConfig = {
  avatar: {
    // Spawn bottom-centre of the image so the character doesn't land on
    // top of the bar counter; feels like entering the room from the floor.
    spawnPixel: { x: 688, y: 620 },
    // 64×64 display — 2× WorldScene's 32×32 for tavern (2026-04-20). This
    // is the native spritesheet frame size, so no upscaling artifacts.
    size: { width: 64, height: 64 },
    // Feet-only body offset matches the sprite's authored layout at 64×64.
    bodyOffset: { x: 16, y: 44, width: 32, height: 16 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
