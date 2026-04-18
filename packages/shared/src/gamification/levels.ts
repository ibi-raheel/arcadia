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
