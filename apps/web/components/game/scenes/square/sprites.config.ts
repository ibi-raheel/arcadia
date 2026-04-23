// Square outdoor sprite config. Spawn lands the avatar just south of the
// centre portal so the member sees the full junction on first load. Avatar
// size + body offset match every image-backed scene (135×135 / 68×33
// feet box — bumped +50% 2026-04-22 per user feedback on readability).

// 2026-04-22 user request: keep the square avatar 50% bigger than every
// other scene so the member reads as the focal point when they arrive
// at the home hub. Other scenes stay at 135 × 135; square is 202 × 202
// with a proportionally scaled feet-box (50 / 140 / 102 / 50).
export const squareSpritesConfig = {
  avatar: {
    // Near the centre portal, slightly south so the portal itself is visible
    // on first camera-centre.
    spawnPixel: { x: 1254, y: 1380 },
    size: { width: 202, height: 202 },
    bodyOffset: { x: 50, y: 140, width: 102, height: 50 },
    walkSpeed: 260,
    clickArrivalThreshold: 4,
  },
} as const;
