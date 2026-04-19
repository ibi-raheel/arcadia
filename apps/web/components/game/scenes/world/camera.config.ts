// WorldScene camera configuration. All runtime-tweakable camera values live
// here — WorldScene.ts imports this module and never hardcodes these numbers.
// ADR 0004 convention.
//
// Phase 1 uses isometric tilemap orientation with 32×32 source tiles drawn
// as diamonds. `WORLD_TILE_SIZE` is the tile grid size (matches world.tmj
// `tilewidth` / `tileheight`). Iso projection is driven by these dimensions
// in scenes/shared/iso-math.ts.
//
// Bounds math for a WxH iso map:
//   Top vertex of tile (0, 0)     → (0, 0)
//   Top vertex of tile (W-1, 0)   → ( (W-1) * TW/2, (W-1) * TH/2 )
//   Top vertex of tile (0, H-1)   → ( -(H-1) * TW/2, (H-1) * TH/2 )
//   Top vertex of tile (W-1, H-1) → (0, (W+H-2) * TH/2)
// Plus each tile's diamond extends one tile below its top vertex, so the
// overall pixel-space bounding box is:
//   x ∈ [-(H-1)*TW/2 - TW/2,  (W-1)*TW/2 + TW/2]
//   y ∈ [0,                    (W+H-2)*TH/2 + TH]

// 2:1 flat iso diamond (AoE-authentic camera angle).
export const WORLD_TILE_SIZE = { width: 64, height: 32 } as const;
export const WORLD_TILE_DIMENSIONS = { cols: 30, rows: 30 } as const;

const { cols, rows } = WORLD_TILE_DIMENSIONS;
const { width: tw, height: th } = WORLD_TILE_SIZE;

const halfTw = tw / 2;
const halfTh = th / 2;

const worldMinX = -(rows - 1) * halfTw - halfTw;
const worldMaxX = (cols - 1) * halfTw + halfTw;
const worldMinY = 0;
const worldMaxY = (cols + rows - 2) * halfTh + th;

export const worldCameraConfig = {
  // 64×32 tiles on a 30×30 map give ~1920×928 px world extent — plenty big
  // at 1:1 on a typical desktop viewport. Bump this knob if you want tighter
  // framing around the avatar.
  zoom: 1.0,
  followLerp: 0.1,
  deadzone: { width: 160, height: 120 },
  bounds: {
    x: worldMinX,
    y: worldMinY,
    width: worldMaxX - worldMinX,
    height: worldMaxY - worldMinY,
  },
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;

export type WorldCameraConfig = typeof worldCameraConfig;
