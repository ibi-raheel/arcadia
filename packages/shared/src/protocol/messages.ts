// Colyseus message types — single source of truth for client + server.
// Contracts locked by TAD §5.3 (v1.1 + cardinal direction amendment 2026-04-19).

import type { AvatarDirection } from '../schemas/AvatarState';

export const MSG = {
  MOVE: 'MOVE',
  ENTER_BUILDING: 'ENTER_BUILDING',
  LEAVE_BUILDING: 'LEAVE_BUILDING',
  UPDATE_LEVEL: 'UPDATE_LEVEL',
  // Phase 12 — coworking productivity surfaces.
  SET_JUKEBOX: 'SET_JUKEBOX',
  START_POMODORO: 'START_POMODORO',
  STOP_POMODORO: 'STOP_POMODORO',
} as const;

export type MessageType = (typeof MSG)[keyof typeof MSG];

// 2026-04-22: 'coworking' added alongside the new coworking-inside interior
// (one Colyseus room type per building name on the server). The exterior
// scenes outside (academy-outside / tavern-outside / coworking-outside) are
// not included — they're single-player and never ENTER/LEAVE the game-server
// side log stream.
export type BuildingId = 'tavern' | 'academy' | 'market' | 'coworking';

export interface MovePayload {
  x: number;
  y: number;
  direction: AvatarDirection;
  isMoving: boolean;
}

export interface EnterBuildingPayload {
  building: BuildingId;
}

export interface LeaveBuildingPayload {
  building: BuildingId;
}

export interface UpdateLevelPayload {
  level: number;
}

// Phase 12 — coworking productivity payloads.

/** Set the per-tent jukebox station. `playlist = ''` clears the
 *  station (returns to idle). Server stamps `startedAt` + the
 *  caller's member id; the client doesn't need to send those. */
export interface SetJukeboxPayload {
  playlist: string;
}

export interface StartPomodoroPayload {
  /** Minutes per work phase. Defaults to 25 server-side if missing
   *  or out of bounds. */
  workMinutes?: number;
  /** Minutes per short break. Defaults to 5. */
  breakMinutes?: number;
  /** Total work-phases planned. Defaults to 4. */
  totalCycles?: number;
}

// STOP_POMODORO carries no payload — sender's session id is enough.

// Compile-time mapping of message type → payload. Use this for exhaustive
// handler wiring on both sides.
export interface MessagePayloads {
  [MSG.MOVE]: MovePayload;
  [MSG.ENTER_BUILDING]: EnterBuildingPayload;
  [MSG.LEAVE_BUILDING]: LeaveBuildingPayload;
  [MSG.UPDATE_LEVEL]: UpdateLevelPayload;
  [MSG.SET_JUKEBOX]: SetJukeboxPayload;
  [MSG.START_POMODORO]: StartPomodoroPayload;
  [MSG.STOP_POMODORO]: Record<string, never>;
}
