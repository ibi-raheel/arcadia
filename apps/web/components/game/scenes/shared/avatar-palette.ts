// 8-avatar palette for Phase 1 Rectangle placeholders. Consumed by:
//   - WorldScene (tinting the local avatar Rectangle per `memberships.avatar_id`)
//   - /onboarding/avatar page (rendering the 4×2 thumbnail grid)
//
// When real avatar atlases arrive, this file stays (the 8 IDs remain stable),
// but `AVATAR_COLORS` becomes irrelevant — swap to atlas-key lookups instead.
// The `AvatarId` type continues to gate valid `memberships.avatar_id` values.

export const AVATAR_IDS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

// Tailwind-500 palette picked for uniform saturation + mutual distinguishability
// over the grass/path placeholder background.
export const AVATAR_COLORS: Readonly<Record<AvatarId, number>> = {
  'avatar-01': 0xef4444, // red-500
  'avatar-02': 0xf97316, // orange-500
  'avatar-03': 0xeab308, // yellow-500
  'avatar-04': 0x22c55e, // green-500
  'avatar-05': 0x14b8a6, // teal-500
  'avatar-06': 0x3b82f6, // blue-500
  'avatar-07': 0x8b5cf6, // violet-500
  'avatar-08': 0xec4899, // pink-500
};

// Human-readable character names surfaced in the avatar picker UI. Stable
// `avatar-0N` IDs stay as the DB key in `memberships.avatar_id`; these are
// purely the display labels. Avatar-01 = the knight sprite the user supplied;
// the rest are placeholder fantasy names until their art lands.
export const AVATAR_NAMES: Readonly<Record<AvatarId, string>> = {
  'avatar-01': 'Knight',
  'avatar-02': 'Rogue',
  'avatar-03': 'Mage',
  'avatar-04': 'Ranger',
  'avatar-05': 'Healer',
  'avatar-06': 'Bard',
  'avatar-07': 'Paladin',
  'avatar-08': 'Scout',
};

export function isAvatarId(value: string): value is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(value);
}
