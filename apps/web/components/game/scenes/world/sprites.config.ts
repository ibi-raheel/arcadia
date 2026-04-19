// WorldScene sprite + building configuration. Every value that a human might
// want to tweak for layout or feel belongs here. WorldScene.ts imports this
// and never hardcodes these numbers. ADR 0004.
//
// Avatar color palette lives in `scenes/shared/avatar-palette.ts` — it's
// shared with the /onboarding/avatar React page, so per ADR 0004 it moves
// out of this scene-local config.
//
// Building entrance/exit tile coordinates must align with walkable tiles in
// `public/maps/world.tmj`. The `__tests__/configs.test.ts` cross-validates.

import type { BuildingName, PixelRect, TileCoord } from '../shared/types';

export const worldSpritesConfig = {
  avatar: {
    spawnTile: { x: 15, y: 15 },
    // Phase 1 placeholder Rectangle dimensions. Target 32×48 to match
    // intended real-sprite bounds per docs/art/sprite-requirements.md, so
    // that the placeholder → sprite swap doesn't shift layout.
    size: { width: 32, height: 48 },
    // Arcade Physics body (feet-only). Body is smaller than the sprite so
    // the avatar doesn't collide "shoulder-first" with walls. Offsets are
    // relative to the sprite's top-left origin.
    bodyOffset: { x: 4, y: 32, width: 24, height: 16 },
    walkSpeed: 160, // px / second
    // Click-to-move: treat the avatar as "arrived" within this many px.
    clickArrivalThreshold: 2,
    // No idleTimeoutMs — idle/walk is a zero-delay toggle on `isMoving`
    // (plan Step 16, user decision 2026-04-18).
  },

  // Building footprint rects are axis-aligned bounding boxes of the iso
  // diamond footprint — not literal tile pixel regions. For each 5×5 iso
  // building at tile (sx..sx+4, sy..sy+4), the bounding box in iso space is
  //   xMin = ( sx    - (sy+4) ) * 16,  xMax = ( (sx+4) - sy ) * 16
  //   yMin = ( sx    +  sy    ) * 16,  yMax = ( (sx+4) + (sy+4) ) * 16
  // → width = height = 128 for a 5×5 block; centre offsets depend on (sx, sy).
  // When real building-facade sprites land these Rectangles are replaced.
  buildings: {
    tavern: {
      entranceTile: { x: 7, y: 10 },
      exitTile: { x: 7, y: 11 },
      // Footprint: tile (5..9, 5..9). Iso bbox: x [-64, 64], y [160, 288].
      footprintRect: { x: -64, y: 160, width: 128, height: 128 },
      fillColor: 0xd97706, // amber-600 — warm, tavern-ish
    },
    academy: {
      entranceTile: { x: 22, y: 10 },
      exitTile: { x: 22, y: 11 },
      // Footprint: tile (20..24, 5..9). Iso bbox: x [176, 304], y [400, 528].
      footprintRect: { x: 176, y: 400, width: 128, height: 128 },
      fillColor: 0x2563eb, // blue-600 — institutional/academic
    },
    market: {
      entranceTile: { x: 15, y: 19 },
      // Market's footprint sits *south* of its entrance, so the exit is
      // one tile *north* — not south like the other two. This is the
      // general rule: exit is on the walkable side of the entrance.
      exitTile: { x: 15, y: 18 },
      // Footprint: tile (13..17, 20..24). Iso bbox: x [-176, -48], y [528, 656].
      footprintRect: { x: -176, y: 528, width: 128, height: 128 },
      fillColor: 0x9333ea, // purple-600 — commercial/bazaar
    },
  } satisfies Record<
    BuildingName,
    {
      readonly entranceTile: TileCoord;
      readonly exitTile: TileCoord;
      readonly footprintRect: PixelRect;
      readonly fillColor: number;
    }
  >,
} as const;

export type WorldSpritesConfig = typeof worldSpritesConfig;
