// Public exports for @arcadia/shared.
// Import from '@arcadia/shared' — never from individual file paths.

export { AvatarState, type AvatarDirection } from './schemas/AvatarState';
export { RealmRoomState } from './schemas/RealmRoomState';

export {
  MSG,
  type MessageType,
  type BuildingId,
  type MovePayload,
  type EnterBuildingPayload,
  type LeaveBuildingPayload,
  type UpdateLevelPayload,
  type MessagePayloads,
} from './protocol/messages';

export {
  LEVEL_THRESHOLDS,
  MIN_LEVEL,
  MAX_LEVEL,
  calculateLevel,
  isValidLevel,
} from './gamification/levels';
