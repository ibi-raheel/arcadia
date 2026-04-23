// Tavern-outside spawn lands the avatar ~200px east of the west bridge so
// they're clearly inside the scene after the fade from /world.

export const tavernOutsideSpritesConfig = {
  avatar: {
    spawnPixel: { x: 350, y: 1254 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 33, y: 93, width: 68, height: 33 },
    walkSpeed: 260,
    clickArrivalThreshold: 4,
  },
} as const;
