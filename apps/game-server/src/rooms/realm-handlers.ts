// Pure handler logic for RealmRoom. The Colyseus Room class (`RealmRoom.ts`)
// owns the onCreate / onAuth / onJoin / onLeave lifecycle; everything that
// can run without the Room framework lives here so Vitest can exercise it
// directly.
//
// Protocol reference — TAD §5.3:
//   MOVE           client → server, updates AvatarState.x/y/direction/isMoving
//   UPDATE_LEVEL   client → server, updates AvatarState.level (1..5)
//   ENTER_BUILDING client → server, logged only
//   LEAVE_BUILDING client → server, logged only

import {
  AVATAR_DIRECTIONS,
  AvatarState,
  type AvatarDirection,
  type JukeboxState,
  type MovePayload,
  type PomodoroState,
  type SetJukeboxPayload,
  type StartPomodoroPayload,
  type UpdateLevelPayload,
  type EnterBuildingPayload,
  type LeaveBuildingPayload,
} from '@arcadia/shared';

import type { RoomBounds } from './room-config';

/**
 * onAuth returns this shape (Phase 2 Step 3 wires the Supabase validation);
 * onJoin consumes it as `client.auth` to construct the AvatarState.
 */
export type AuthInfo = {
  readonly memberId: string;
  readonly realmId: string;
  readonly avatarId: string;
  readonly displayName: string;
  readonly level: number;
};

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

/**
 * Constructs a fresh AvatarState seeded from the authenticated member's
 * data and the room's spawn position. Called once per onJoin.
 *
 * Initial `direction` defaults to `'s'` (front-facing, matches the schema
 * default). `isMoving` is false on spawn.
 */
export function createAvatarState(
  auth: AuthInfo,
  spawn: { readonly x: number; readonly y: number },
): AvatarState {
  const avatar = new AvatarState();
  avatar.memberId = auth.memberId;
  avatar.displayName = auth.displayName;
  avatar.avatarId = auth.avatarId;
  avatar.x = spawn.x;
  avatar.y = spawn.y;
  avatar.direction = 's';
  avatar.isMoving = false;
  avatar.level = clampLevel(auth.level);
  return avatar;
}

/**
 * Validates + applies a MOVE payload to the given avatar. Returns `true` on
 * accept, `false` on reject. Rejection leaves `avatar` untouched so the
 * caller (the Colyseus message handler) can decide to log / kick.
 *
 * Validation:
 *   - payload shape: x/y are finite numbers; direction is a known cardinal;
 *     isMoving is boolean.
 *   - bounds: x/y clamped to `bounds` (coarse guard against teleport-far
 *     DoS; tile-perfect collision is a client-side concern).
 */
export function applyMove(avatar: AvatarState, payload: unknown, bounds: RoomBounds): boolean {
  if (!isMovePayload(payload)) return false;
  avatar.x = clampNumber(payload.x, bounds.minX, bounds.maxX);
  avatar.y = clampNumber(payload.y, bounds.minY, bounds.maxY);
  avatar.direction = payload.direction;
  avatar.isMoving = payload.isMoving;
  return true;
}

/**
 * Validates + applies an UPDATE_LEVEL payload. Returns `true` on accept,
 * `false` on reject (out-of-range level, non-integer, or non-numeric).
 */
export function applyUpdateLevel(avatar: AvatarState, payload: unknown): boolean {
  if (!isUpdateLevelPayload(payload)) return false;
  avatar.level = payload.level;
  return true;
}

/**
 * Building-transition payloads are log-only in Phase 2 (Phase 4 may use them
 * for DAU-in-building analytics). Returns the parsed `building` string on
 * valid payload, `null` otherwise so the caller can skip the log line
 * cleanly.
 */
export function parseBuildingPayload(payload: unknown): EnterBuildingPayload['building'] | null {
  if (!isBuildingPayload(payload)) return null;
  return payload.building;
}

// --- coworking · jukebox + pomodoro (Phase 12) ---------------------------

const PLAYLIST_MAX = 32;
const POMODORO_WORK_MIN = 1;
const POMODORO_WORK_MAX = 90;
const POMODORO_BREAK_MIN = 1;
const POMODORO_BREAK_MAX = 30;
const POMODORO_CYCLE_MIN = 1;
const POMODORO_CYCLE_MAX = 8;

/**
 * Apply a SET_JUKEBOX payload to the per-tent jukebox state. Returns
 * `true` on accept. The caller (RealmRoom message handler) is
 * responsible for stamping `lastChangedBy` from the calling client's
 * member id — that's not in the payload because clients can't fake
 * other peoples' ids.
 */
export function applySetJukebox(
  jukebox: JukeboxState,
  payload: unknown,
  memberId: string,
  now: number,
): boolean {
  if (!isSetJukeboxPayload(payload)) return false;
  const playlist = payload.playlist.trim().slice(0, PLAYLIST_MAX);
  jukebox.playlist = playlist;
  jukebox.startedAt = playlist.length === 0 ? 0 : now;
  jukebox.lastChangedBy = playlist.length === 0 ? '' : memberId;
  return true;
}

/**
 * Validates + applies a START_POMODORO payload. On accept the state
 * jumps from idle → first work phase. Rejects if a session is
 * already running (clients should send STOP first). Defaults backfill
 * any missing / out-of-range numbers.
 */
export function applyStartPomodoro(
  pomodoro: PomodoroState,
  payload: unknown,
  memberId: string,
  now: number,
): boolean {
  if (pomodoro.phase !== 'idle') return false;
  const parsed = parseStartPomodoro(payload);
  pomodoro.phase = 'work';
  pomodoro.cycle = 1;
  pomodoro.startedBy = memberId;
  pomodoro.workMinutes = parsed.workMinutes;
  pomodoro.breakMinutes = parsed.breakMinutes;
  pomodoro.totalCycles = parsed.totalCycles;
  pomodoro.endsAt = now + parsed.workMinutes * 60_000;
  return true;
}

/**
 * Hard-stops the running session and resets to idle. No payload.
 * Returns `true` if a session was running, `false` if already idle.
 */
export function applyStopPomodoro(pomodoro: PomodoroState): boolean {
  if (pomodoro.phase === 'idle') return false;
  pomodoro.phase = 'idle';
  pomodoro.endsAt = 0;
  pomodoro.cycle = 0;
  pomodoro.startedBy = '';
  pomodoro.totalCycles = 0;
  return true;
}

/**
 * Server tick — advances the phase if `endsAt <= now`. Returns `true`
 * if anything changed (caller should broadcast). Pure on `pomodoro`
 * + `now`.
 *
 * Sequence: work → break → work → break → … until `cycle ===
 * totalCycles && phase === 'break'`, at which point the next tick
 * resets to idle.
 */
export function tickPomodoro(pomodoro: PomodoroState, now: number): boolean {
  if (pomodoro.phase === 'idle') return false;
  if (now < pomodoro.endsAt) return false;
  if (pomodoro.phase === 'work') {
    if (pomodoro.cycle >= pomodoro.totalCycles) {
      // Final work phase done — close the session.
      pomodoro.phase = 'idle';
      pomodoro.endsAt = 0;
      pomodoro.cycle = 0;
      pomodoro.startedBy = '';
      pomodoro.totalCycles = 0;
      return true;
    }
    pomodoro.phase = 'break';
    pomodoro.endsAt = now + pomodoro.breakMinutes * 60_000;
    return true;
  }
  // currently 'break' — advance to next work cycle
  pomodoro.phase = 'work';
  pomodoro.cycle += 1;
  pomodoro.endsAt = now + pomodoro.workMinutes * 60_000;
  return true;
}

function parseStartPomodoro(payload: unknown): {
  readonly workMinutes: number;
  readonly breakMinutes: number;
  readonly totalCycles: number;
} {
  const obj = isRecord(payload) ? (payload as StartPomodoroPayload) : {};
  const workMinutes = clampInt(obj.workMinutes ?? 25, POMODORO_WORK_MIN, POMODORO_WORK_MAX);
  const breakMinutes = clampInt(obj.breakMinutes ?? 5, POMODORO_BREAK_MIN, POMODORO_BREAK_MAX);
  const totalCycles = clampInt(obj.totalCycles ?? 4, POMODORO_CYCLE_MIN, POMODORO_CYCLE_MAX);
  return { workMinutes, breakMinutes, totalCycles };
}

function clampInt(v: number | undefined, lo: number, hi: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : lo;
  return n < lo ? lo : n > hi ? hi : n;
}

function isSetJukeboxPayload(value: unknown): value is SetJukeboxPayload {
  if (!isRecord(value)) return false;
  return typeof (value as { playlist?: unknown }).playlist === 'string';
}

// --- Focus line (Phase 12 · per-avatar) ----------------------------------

const FOCUS_MAX_CHARS = 60;

/**
 * Apply a SET_FOCUS payload to the caller's AvatarState. Empty
 * string clears the focus. Trims + slices to FOCUS_MAX_CHARS so a
 * chatty client can't bloat the broadcast.
 */
export function applySetFocus(avatar: AvatarState, payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const text = (payload as { text?: unknown }).text;
  if (typeof text !== 'string') return false;
  avatar.currentFocus = text.trim().slice(0, FOCUS_MAX_CHARS);
  return true;
}

// --- internal guards -----------------------------------------------------

const BUILDINGS = ['tavern', 'academy', 'market'] as const;

function isMovePayload(value: unknown): value is MovePayload {
  if (!isRecord(value)) return false;
  const { x, y, direction, isMoving } = value;
  return (
    isFinite_(x) && isFinite_(y) && isAvatarDirection(direction) && typeof isMoving === 'boolean'
  );
}

function isUpdateLevelPayload(value: unknown): value is UpdateLevelPayload {
  if (!isRecord(value)) return false;
  const { level } = value;
  return (
    typeof level === 'number' && Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL
  );
}

function isBuildingPayload(value: unknown): value is EnterBuildingPayload | LeaveBuildingPayload {
  if (!isRecord(value)) return false;
  const { building } = value;
  return typeof building === 'string' && (BUILDINGS as readonly string[]).includes(building);
}

function isAvatarDirection(value: unknown): value is AvatarDirection {
  return typeof value === 'string' && (AVATAR_DIRECTIONS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFinite_(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampNumber(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clampLevel(level: number): number {
  if (!Number.isInteger(level)) return MIN_LEVEL;
  return clampNumber(level, MIN_LEVEL, MAX_LEVEL);
}
