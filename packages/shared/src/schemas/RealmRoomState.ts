import { Schema, MapSchema, type } from '@colyseus/schema';
import { AvatarState } from './AvatarState';
import { JukeboxState } from './JukeboxState';
import { PomodoroState } from './PomodoroState';

// Top-level Colyseus state for a Realm room. Matches TAD §5.2.
// Keyed by Colyseus `client.sessionId` so each connection has one entry.
//
// Phase 12 (2026-04-25) added `jukebox` + `pomodoro` for the
// coworking tents. They're declared here on every realm room
// because the schema layout has to be uniform across room types
// (the Colyseus encoder doesn't deal in per-room conditional
// fields nicely). They sit at their default empty-state values in
// non-coworking rooms and are simply ignored by clients of those
// scenes.
export class RealmRoomState extends Schema {
  @type({ map: AvatarState }) avatars = new MapSchema<AvatarState>();
  @type(JukeboxState) jukebox = new JukeboxState();
  @type(PomodoroState) pomodoro = new PomodoroState();
}
