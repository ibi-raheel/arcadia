import { Schema, MapSchema, type } from '@colyseus/schema';
import { AvatarState } from './AvatarState';

// Top-level Colyseus state for a Realm room. Matches TAD §5.2.
// Keyed by Colyseus `client.sessionId` so each connection has one entry.
export class RealmRoomState extends Schema {
  @type({ map: AvatarState }) avatars = new MapSchema<AvatarState>();
}
