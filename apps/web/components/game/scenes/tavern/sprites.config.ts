// Tavern sprites + spawn config. 2026-04-19 polish — spawn now uses a
// pixel coordinate inside the tavern-interior image (1376×768) rather
// than an iso tile coord, since the tavern is image-backed now.

export const tavernSpritesConfig = {
  avatar: {
    // Spawn bottom-centre of the image so the character doesn't land on
    // top of the bar counter; feels like entering the room from the floor.
    spawnPixel: { x: 688, y: 620 },
    // 32×32 display to match WorldScene's halved avatar (2026-04-19).
    size: { width: 32, height: 32 },
    // Feet-only body offset halved alongside `size`; same feel as WorldScene.
    bodyOffset: { x: 8, y: 22, width: 16, height: 8 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
} as const;
