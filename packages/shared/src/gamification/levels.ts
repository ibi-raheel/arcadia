// MVP XP → level thresholds. Locked by PRD §4.7 and TAD §8.1.
// Server source of truth is the PL/pgSQL `calculate_level()` function (TAD §8.1);
// this table exists so the client can render the same mapping without a round-trip.
// If one changes, change both — otherwise the client and DB will disagree on levels.
export const LEVEL_THRESHOLDS: readonly { level: number; minXp: number }[] = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 300 },
  { level: 4, minXp: 600 },
  { level: 5, minXp: 1000 },
] as const;

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export function calculateLevel(totalXp: number): number {
  if (totalXp < 0) return MIN_LEVEL;
  let result = MIN_LEVEL;
  for (const t of LEVEL_THRESHOLDS) {
    if (totalXp >= t.minXp) result = t.level;
  }
  return result;
}

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
}

export type LevelProgress = {
  /** Player's current level (1..MAX_LEVEL). */
  readonly level: number;
  /** XP threshold the player has reached (the floor of `level`). */
  readonly currentLevelXp: number;
  /** XP needed for next level. `null` when at MAX_LEVEL. */
  readonly nextLevelXp: number | null;
  /** Fill ratio to next level, in [0, 1]. Always 1 at MAX_LEVEL. */
  readonly percent: number;
};

/**
 * Compute the player's level + progress to the next level, in one pass.
 * Used by the player HUD to draw the XP bar without re-walking thresholds
 * twice. Pure function over `LEVEL_THRESHOLDS`.
 */
export function progressToNextLevel(totalXp: number): LevelProgress {
  const xp = Math.max(0, totalXp);
  const level = calculateLevel(xp);
  const currentLevelXp = LEVEL_THRESHOLDS.find((t) => t.level === level)?.minXp ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);
  if (!nextThreshold) {
    return { level, currentLevelXp, nextLevelXp: null, percent: 1 };
  }
  const span = nextThreshold.minXp - currentLevelXp;
  const into = xp - currentLevelXp;
  const percent = span <= 0 ? 1 : Math.min(1, Math.max(0, into / span));
  return { level, currentLevelXp, nextLevelXp: nextThreshold.minXp, percent };
}
