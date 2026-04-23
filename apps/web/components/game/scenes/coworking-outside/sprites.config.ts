// Coworking-outside spawn lands the avatar ~200px west of the east bridge
// so they're inside the scene after the fade from /world.

export const coworkingOutsideSpritesConfig = {
  avatar: {
    spawnPixel: { x: 2450, y: 1121 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 260,
    clickArrivalThreshold: 4,
  },
} as const;
