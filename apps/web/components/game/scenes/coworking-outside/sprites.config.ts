// Coworking-outside spawn lands the avatar ~200px west of the east bridge
// so they're inside the scene after the fade from /world.

export const coworkingOutsideSpritesConfig = {
  avatar: {
    // 2026-04-24 user request: +50 y (1121 → 1171) so the member lands
    // slightly south of the east bridge instead of centred on it.
    spawnPixel: { x: 2450, y: 1171 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 325,
    clickArrivalThreshold: 4,
  },
} as const;
