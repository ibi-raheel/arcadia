// Coworking tent interior spawn. The tent image has a clear exit door
// at bottom-centre; spawn the member near the centre work table so they
// see the space before walking back out.

export const coworkingInsideSpritesConfig = {
  avatar: {
    spawnPixel: { x: 1254, y: 1500 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 220,
    clickArrivalThreshold: 4,
  },
} as const;
