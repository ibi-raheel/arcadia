// Academy sprites + spawn + lectern geometry.
// Avatar sizing matches every other image-backed interior (135×135) for
// visual consistency between buildings.
//
// 2026-04-24 — replaced the `podium` grid-layout knobs with a single
// `lectern` centrepiece. The scene no longer draws a card per course;
// the React mount owns the course list and opens a scroll when the
// member walks up to the lectern + presses ENTER.

export const academySpritesConfig = {
  avatar: {
    // Bottom-centre of the interior, same treatment as the Tavern.
    spawnPixel: { x: 768, y: 880 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 200,
    clickArrivalThreshold: 2,
  },
  lectern: {
    /** World-pixel centre of the lectern (mid-hall). */
    centerX: 768,
    centerY: 520,
    /** Pedestal footprint width — the book rests on a top slab slightly
     *  wider than this. */
    pedestalWidth: 120,
    /** ENTER-prompt activation radius around `centerX/Y`. */
    interactRadius: 140,
  },
} as const;
