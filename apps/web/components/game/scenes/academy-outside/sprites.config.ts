// Academy-outside spawn — safely above the 150px bottom-edge return band
// and below the 1200px academy premises trigger so the prompt doesn't
// flash on arrival.

export const academyOutsideSpritesConfig = {
  avatar: {
    spawnPixel: { x: 1254, y: 2200 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 33, y: 93, width: 68, height: 33 },
    walkSpeed: 260,
    clickArrivalThreshold: 4,
  },
} as const;
