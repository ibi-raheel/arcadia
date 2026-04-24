// Coworking-outside spawn lands the avatar ~200px west of the east bridge
// so they're inside the scene after the fade from /world.

export const coworkingOutsideSpritesConfig = {
  avatar: {
    // 2026-04-24 final: y=1221. The earlier −50 was the wrong direction;
    // user confirmed they want +50 from 1171 (south-er on screen).
    spawnPixel: { x: 2450, y: 1221 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 325,
    clickArrivalThreshold: 4,
  },
} as const;
