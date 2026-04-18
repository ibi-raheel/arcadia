import { Schema, type } from '@colyseus/schema';

// Colyseus state for one connected avatar. Matches TAD §5.2 verbatim.
// Mutations happen on the server; clients receive patches automatically.
// `level` is cached here from Supabase `memberships.level`; the client
// refreshes it via UPDATE_LEVEL (TAD §5.3 / §8.3) when Supabase Realtime
// reports a level change on the owning member's row.
export type AvatarDirection = 'up' | 'down' | 'left' | 'right';

export class AvatarState extends Schema {
  @type('string') memberId = '';
  @type('string') displayName = '';
  @type('string') avatarId = '';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('string') direction: AvatarDirection = 'down';
  @type('boolean') isMoving = false;
  @type('number') level = 1;
}
