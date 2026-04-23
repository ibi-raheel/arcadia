// Academy-outside spawn — safely above the 150px bottom-edge return band
// and below the 1200px academy premises trigger so the prompt doesn't
// flash on arrival.

export const academyOutsideSpritesConfig = {
  avatar: {
    spawnPixel: { x: 1254, y: 2200 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 325,
    clickArrivalThreshold: 4,
  },
} as const;
