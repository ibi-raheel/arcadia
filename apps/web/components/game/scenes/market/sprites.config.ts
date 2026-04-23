// Market sprites + spawn + stall geometry. Avatar sizing matches Tavern
// and Academy (90×90) for visual consistency. Stall layout: 4-wide grid,
// wraps to a new row past 4 courses.

export const marketSpritesConfig = {
  avatar: {
    // Bottom-centre of the interior — member walks into the hall from
    // the bottom edge, consistent with Tavern + Academy.
    spawnPixel: { x: 768, y: 880 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 33, y: 93, width: 68, height: 33 },
    walkSpeed: 160,
    clickArrivalThreshold: 2,
  },
  stall: {
    // Per-stall clickable footprint.
    size: { width: 180, height: 90 },
    /** Pixel gap between stalls in a row. */
    spacingX: 260,
    /** Pixel gap between rows when > maxPerRow stalls are visible. */
    spacingY: 260,
    /** Max stalls per row before wrapping to a new row. */
    maxPerRow: 4,
    /** Y-centre for the first row of stalls (roughly middle of the image). */
    firstRowCenterY: 460,
    /** Label offsets relative to the stall rect's y-centre. */
    labelOffsetY: -62,
    creatorOffsetY: -44,
    priceOffsetY: 56,
  },
} as const;
