import { Schema, type } from '@colyseus/schema';

/**
 * Per-tent shared jukebox state. One per `RealmRoomState` — every
 * member in the same tent reads from this; one writer (whoever
 * last interacted with the jukebox) sets it. Volume is *not*
 * synced — that stays per-member.
 *
 * `playlist` is one of the canned IDs declared in the web client's
 * jukebox config (`lofi`, `cafe`, `rain`, `ambient-piano`). The
 * server doesn't validate the value beyond "non-empty string" —
 * stale clients with a removed playlist ID see a "station not
 * found" message and can pick a current one.
 *
 * `startedAt` is a Unix-ms timestamp captured when the playlist
 * last changed. Clients use it to align local audio playback to
 * the same offset across tabs.
 */
export class JukeboxState extends Schema {
  /** Empty string = no station selected (initial idle state). */
  @type('string') playlist = '';
  /** Unix-ms when `playlist` was last set. 0 when idle. */
  @type('number') startedAt = 0;
  /** Member id of the last writer — for "last changed by Rosalind"
   *  hand-script lines. Empty when idle. */
  @type('string') lastChangedBy = '';
}
