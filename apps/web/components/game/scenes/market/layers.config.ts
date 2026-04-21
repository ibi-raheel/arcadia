// Market depth bands. ground < stalls < dynamic (avatar) < overlay.

export const marketLayersConfig = {
  depth: {
    ground: 0,
    stalls: 100,
    dynamic: 1_000,
    overlay: 10_000,
  },
  ySort: {
    yAnchorRatio: 0.85,
  },
} as const;
