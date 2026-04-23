// Academy sprites + spawn + podium geometry.
// Avatar sizing matches the new Tavern (90×90) for visual consistency
// between the two buildings.

export const academySpritesConfig = {
  avatar: {
    // Bottom-centre of the interior, same treatment as the Tavern.
    spawnPixel: { x: 768, y: 880 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 33, y: 93, width: 68, height: 33 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
  podium: {
    // Per-podium clickable footprint size. Slightly larger than the avatar
    // so tapping a podium from a nearby tile still registers cleanly.
    size: { width: 140, height: 70 },
    /** Pixel gap between podiums in a row. */
    spacingX: 240,
    /** Pixel gap between rows when > maxPerRow podiums are visible. */
    spacingY: 260,
    /** Max podiums per row before wrapping to a new row. */
    maxPerRow: 4,
    /** Y-centre for the first row of podiums (roughly middle of the image). */
    firstRowCenterY: 520,
    /** Label offset above the podium rectangle's y-centre. */
    labelOffsetY: -70,
    /** Progress text offset below the podium rectangle's y-centre. */
    progressOffsetY: 60,
  },
} as const;
