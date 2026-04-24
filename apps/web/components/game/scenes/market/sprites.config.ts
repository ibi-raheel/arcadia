// Market sprites + spawn + catalog-crystal geometry. Avatar sizing
// matches every other image-backed interior (135×135).
//
// 2026-04-24 — replaced the `stall` grid-layout knobs with the `crystal`
// centrepiece. The scene stopped drawing a sprite per-stall; the React
// catalog scroll owns the list now.

export const marketSpritesConfig = {
  avatar: {
    // Under the archway at the very top of the interior — spawn sits
    // inside the 300 px top-edge trigger band so the "Press ENTER to
    // return to the Square" prompt is visible on arrival.
    spawnPixel: { x: 768, y: 140 },
    size: { width: 135, height: 135 },
    bodyOffset: { x: 22, y: 62, width: 45, height: 22 },
    walkSpeed: 200,
    clickArrivalThreshold: 2,
  },
  crystal: {
    /** World-pixel centre of the catalog crystal (mid-hall). */
    centerX: 768,
    centerY: 520,
    /** Pedestal footprint width (stone slab the crystal floats above). */
    pedestalWidth: 140,
    /** ENTER-prompt activation radius around `centerX/Y`. */
    interactRadius: 150,
  },
} as const;
