// Public exports for @arcadia/shared.
// Import from '@arcadia/shared' — never from individual file paths.

export { AvatarState, AVATAR_DIRECTIONS, type AvatarDirection } from './schemas/AvatarState';
export { JukeboxState } from './schemas/JukeboxState';
export { PomodoroState, type PomodoroPhase } from './schemas/PomodoroState';
export { RealmRoomState } from './schemas/RealmRoomState';

export {
  MSG,
  type MessageType,
  type BuildingId,
  type MovePayload,
  type EnterBuildingPayload,
  type LeaveBuildingPayload,
  type UpdateLevelPayload,
  type SetJukeboxPayload,
  type StartPomodoroPayload,
  type SetFocusPayload,
  type MessagePayloads,
} from './protocol/messages';

export {
  LEVEL_THRESHOLDS,
  MIN_LEVEL,
  MAX_LEVEL,
  calculateLevel,
  isValidLevel,
  progressToNextLevel,
  type LevelProgress,
} from './gamification/levels';
