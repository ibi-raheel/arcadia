// Academy-outside spawn lands the avatar ~200px north of the south edge so
// they're clearly inside the scene after the fade (and don't immediately
// re-trigger the return edge back to /world).

export const academyOutsideSpritesConfig = {
  avatar: {
    spawnPixel: { x: 1254, y: 2300 },
    size: { width: 90, height: 90 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 260,
    clickArrivalThreshold: 4,
  },
} as const;
