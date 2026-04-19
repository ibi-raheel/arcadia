// WorldScene layer / depth configuration. Controls which tilemap layers are
// rendered, their y-sort participation, and the depth constants that keep
// world objects in the right front-to-back order.
//
// ADR 0004 convention — WorldScene imports this module; no hardcoded depth
// values in the scene class.

// Tilemap layer names must match the `name` fields in world.tmj exactly.
// Asserted in __tests__/configs.test.ts.
export const WORLD_TILEMAP_LAYERS = {
  ground: 'ground',
  collision: 'collision',
  overlay: 'overlay',
} as const;

export const worldLayersConfig = {
  tilemapLayers: WORLD_TILEMAP_LAYERS,

  // Depth bands. Dynamic objects (avatar, building placeholders) sit in the
  // `dynamic` band and are y-sorted within it each frame. Static tilemap
  // layers sit at fixed depths.
  //
  // overlay < dynamic on purpose: overlay holds SHORT decorations (flowers,
  // small bushes) that should render under the avatar — if you walk "over"
  // a flower, the avatar's feet cover it, which reads as natural. Tall
  // decorations (trees, cliffs) that must y-sort against the avatar need
  // to be individual Sprites, not tilemap-layer tiles, because tilemap
  // layers render as a single batch at a fixed depth.
  depth: {
    ground: 0,
    collisionVisuals: 10,
    overlay: 500,
    dynamic: 1000, // base depth for y-sorted entities (avatar, buildings)
  },

  ySort: {
    // Per TAD §4.1, objects sort by `(y + height * yAnchorRatio)` each frame.
    // yAnchorRatio = 0.5 means the object's visual midpoint is its sort key
    // (matches height/2 in the TAD's shorthand).
    yAnchorRatio: 0.5,
  },
} as const;

export type WorldLayersConfig = typeof worldLayersConfig;
