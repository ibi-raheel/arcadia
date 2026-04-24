// Market sprites + spawn + stall geometry. Avatar sizing matches Tavern
// and Academy (90×90) for visual consistency. Stall layout: 4-wide grid,
// wraps to a new row past 4 courses.

export const marketSpritesConfig = {
  avatar: {
    // Upper area of the interior — member enters above the stalls and
    // walks south to browse (2026-04-23 Phase 7 item M1). Previously
    // y=880 (bottom). y=380 sits just above the first stall row (y=460)
    // and clear of the 300 px top-edge return-trigger band.
    spawnPixel: { x: 768, y: 380 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 200,
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
