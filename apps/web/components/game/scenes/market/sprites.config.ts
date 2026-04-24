// Market sprites + spawn + stall geometry. Avatar sizing matches Tavern
// and Academy (90×90) for visual consistency. Stall layout: 4-wide grid,
// wraps to a new row past 4 courses.

export const marketSpritesConfig = {
  avatar: {
    // Under the archway at the very top of the interior — where the
    // "Press ENTER to return to the Square" prompt shows on arrival,
    // matching the pattern the user called out in the 2026-04-23
    // screenshot. Spawn sits inside the 300 px top-edge trigger band so
    // the prompt is visible immediately; the trigger's `span` in
    // layers.config confines firing to the archway width, so walking
    // laterally doesn't send the member back out.
    spawnPixel: { x: 768, y: 140 },
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
