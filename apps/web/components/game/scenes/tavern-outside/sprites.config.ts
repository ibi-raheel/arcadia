// Tavern-outside spawn lands the avatar ~200px east of the west bridge so
// they're clearly inside the scene after the fade from /world.

export const tavernOutsideSpritesConfig = {
  avatar: {
    spawnPixel: { x: 350, y: 1254 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 325,
    clickArrivalThreshold: 4,
  },
} as const;
