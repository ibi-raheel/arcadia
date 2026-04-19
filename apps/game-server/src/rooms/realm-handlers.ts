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
  type MovePayload,
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
export function applyMove(
  avatar: AvatarState,
  payload: unknown,
  bounds: RoomBounds,
): boolean {
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
export function parseBuildingPayload(
  payload: unknown,
): EnterBuildingPayload['building'] | null {
  if (!isBuildingPayload(payload)) return null;
  return payload.building;
}

// --- internal guards -----------------------------------------------------

const BUILDINGS = ['tavern', 'academy', 'market'] as const;

function isMovePayload(value: unknown): value is MovePayload {
  if (!isRecord(value)) return false;
  const { x, y, direction, isMoving } = value;
  return (
    isFinite_(x) &&
    isFinite_(y) &&
    isAvatarDirection(direction) &&
    typeof isMoving === 'boolean'
  );
}

function isUpdateLevelPayload(value: unknown): value is UpdateLevelPayload {
  if (!isRecord(value)) return false;
  const { level } = value;
  return typeof level === 'number' && Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
}

function isBuildingPayload(
  value: unknown,
): value is EnterBuildingPayload | LeaveBuildingPayload {
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
