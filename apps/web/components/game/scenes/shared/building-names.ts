// Human-readable names for per-building Colyseus shards. The buildingId
// (tavern-a / tent-3 / …) is the network key; these names drive prompts,
// HUD labels, and transition overlays.
//
// 2026-04-22 user-decided names:
//   tavern-a (top door on tavern-outside)    → "The Three Ravens"
//   tavern-b (middle door)                    → "The Iron Chalice"
//   tavern-c (bottom door)                    → "The Sleeping Hollow"
//
// Coworking tents keep auto-generated names ("Tent 1", "Tent 2", …)
// until the user picks something nicer.

export const TAVERN_DISPLAY_NAMES = {
  'tavern-a': 'The Three Ravens',
  'tavern-b': 'The Iron Chalice',
  'tavern-c': 'The Sleeping Hollow',
} as const;

export type TavernBuildingId = keyof typeof TAVERN_DISPLAY_NAMES;

export function isTavernBuildingId(value: string): value is TavernBuildingId {
  return value in TAVERN_DISPLAY_NAMES;
}

export function tavernDisplayName(buildingId: string | null): string {
  if (!buildingId) return 'Tavern';
  if (isTavernBuildingId(buildingId)) return TAVERN_DISPLAY_NAMES[buildingId];
  return 'Tavern';
}

/** Tent buildingId → "Tent N". Falls back to the id string. */
export function tentDisplayName(buildingId: string | null): string {
  if (!buildingId) return 'Tent';
  const match = /^tent-([0-9]+)$/.exec(buildingId);
  if (match && match[1]) return `Tent ${match[1]}`;
  return buildingId;
}
