// Y-sort depth calculator. Per TAD §4.1, all dynamic world objects render
// in depth order each frame so that objects "lower on screen" (higher Y in
// Phaser's y-down coordinate system) appear in front of objects "higher on
// screen". This produces the 2.5D illusion without true isometric projection.
//
// The pure math lives here so it's testable without Phaser. WorldScene and
// TavernScene call `calculateYSortDepth` from their per-frame update().

export type YSortable = {
  /** World-space Y of the sprite's origin (Phaser's default is top-left). */
  readonly y: number;
  /** Displayed height of the sprite in pixels. */
  readonly height: number;
};

export type YSortConfig = {
  /** Base depth band shared by all y-sorted objects — per layers.config. */
  readonly depthBase: number;
  /**
   * 0 = sort by sprite top, 1 = sort by sprite bottom. 0.5 puts the sort
   * anchor at the sprite's vertical midpoint (`y + height/2`).
   */
  readonly yAnchorRatio: number;
};

/**
 * Returns the depth value to assign to `obj` so that lower-on-screen objects
 * render in front. Higher return value = rendered on top.
 */
export function calculateYSortDepth(obj: YSortable, config: YSortConfig): number {
  return config.depthBase + obj.y + obj.height * config.yAnchorRatio;
}
