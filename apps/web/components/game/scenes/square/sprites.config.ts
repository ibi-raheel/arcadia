// Square outdoor sprite config. Spawn lands the avatar just south of the
// centre portal so the member sees the full junction on first load. Avatar
// size + body offset match Tavern (90×90 / 45×22 feet box) — consistent
// across all image-backed scenes so muscle memory carries.

export const squareSpritesConfig = {
  avatar: {
    // Near the centre portal, slightly south so the portal itself is visible
    // on first camera-centre.
    spawnPixel: { x: 1254, y: 1380 },
    size: { width: 90, height: 90 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 260,
    clickArrivalThreshold: 4,
  },
} as const;
