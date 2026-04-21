// Academy depth bands. Mirrors TavernScene — ground < podiums < dynamic
// (avatar y-sorts into the dynamic band).

export const academyLayersConfig = {
  depth: {
    ground: 0,
    podiums: 100,
    dynamic: 1_000,
    overlay: 10_000,
  },
  ySort: {
    /** Avatar feet anchor at ~85% of sprite height — same as Tavern. */
    yAnchorRatio: 0.85,
  },
} as const;
