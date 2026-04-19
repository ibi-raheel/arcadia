// Colyseus message types — single source of truth for client + server.
// Contracts locked by TAD §5.3 (v1.1 + cardinal direction amendment 2026-04-19).

import type { AvatarDirection } from '../schemas/AvatarState';

export const MSG = {
  MOVE: 'MOVE',
  ENTER_BUILDING: 'ENTER_BUILDING',
  LEAVE_BUILDING: 'LEAVE_BUILDING',
  UPDATE_LEVEL: 'UPDATE_LEVEL',
} as const;

export type MessageType = (typeof MSG)[keyof typeof MSG];

export type BuildingId = 'tavern' | 'academy' | 'market';

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

// Compile-time mapping of message type → payload. Use this for exhaustive
// handler wiring on both sides.
export interface MessagePayloads {
  [MSG.MOVE]: MovePayload;
  [MSG.ENTER_BUILDING]: EnterBuildingPayload;
  [MSG.LEAVE_BUILDING]: LeaveBuildingPayload;
  [MSG.UPDATE_LEVEL]: UpdateLevelPayload;
}
