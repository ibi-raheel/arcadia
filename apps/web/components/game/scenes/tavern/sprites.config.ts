// Tavern sprites + spawn config. 2026-04-19 polish — spawn now uses a
// pixel coordinate inside the tavern-interior image (1376×768) rather
// than an iso tile coord, since the tavern is image-backed now.

export const tavernSpritesConfig = {
  avatar: {
    // Spawn bottom-centre of the image so the character doesn't land on
    // top of the bar counter; feels like entering the room from the floor.
    spawnPixel: { x: 688, y: 620 },
    // 40×40 display — WorldScene's 32×32 bumped +25% for tavern (2026-04-20)
    // so characters read clearly against the interior art.
    size: { width: 40, height: 40 },
    // Feet-only body offset scaled in lockstep with `size` (×1.25).
    bodyOffset: { x: 10, y: 28, width: 20, height: 10 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
