// Square outdoor sprite config. Spawn lands the avatar just south of the
// centre portal so the member sees the full junction on first load. Avatar
// size + body offset match every image-backed scene (135×135 / 68×33
// feet box — bumped +50% 2026-04-22 per user feedback on readability).

export const squareSpritesConfig = {
  avatar: {
    // Near the centre portal, slightly south so the portal itself is visible
    // on first camera-centre.
    spawnPixel: { x: 1254, y: 1380 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 33, y: 93, width: 68, height: 33 },
    walkSpeed: 260,
    clickArrivalThreshold: 4,
  },
} as const;
