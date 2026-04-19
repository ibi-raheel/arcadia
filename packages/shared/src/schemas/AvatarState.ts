import { Schema, type } from '@colyseus/schema';

// Colyseus state for one connected avatar. Matches TAD §5.2 (v1.1 + cardinal
// direction amendment 2026-04-19). Mutations happen on the server; clients
// receive patches automatically.
//
// `direction` is cardinal (n / e / s / w) to match the sprite authoring
// convention — every avatar sheet has one row per cardinal pose. Renamed
// from the original `up | down | left | right` before any runtime data
// existed (Phase 2 Step 1).
//
// `level` is cached here from Supabase `memberships.level`; the client
// refreshes it via UPDATE_LEVEL (TAD §5.3 / §8.3) when Supabase Realtime
// reports a level change on the owning member's row.

export const AVATAR_DIRECTIONS = ['n', 'e', 's', 'w'] as const;
export type AvatarDirection = (typeof AVATAR_DIRECTIONS)[number];

export class AvatarState extends Schema {
  @type('string') memberId = '';
  @type('string') displayName = '';
  @type('string') avatarId = '';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('string') direction: AvatarDirection = 's';
  @type('boolean') isMoving = false;
  @type('number') level = 1;
}
