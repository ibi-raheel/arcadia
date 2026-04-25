import { describe, expect, it } from 'vitest';

import { AvatarState } from '@arcadia/shared';

import {
  applyMove,
  applySetJukebox,
  applyStartPomodoro,
  applyStopPomodoro,
  applyUpdateLevel,
  createAvatarState,
  parseBuildingPayload,
  tickPomodoro,
  type AuthInfo,
} from '../realm-handlers';
import type { RoomBounds } from '../room-config';

const AUTH: AuthInfo = {
  memberId: 'member-uuid-1',
  realmId: 'realm-uuid-1',
  avatarId: 'avatar-01',
  displayName: 'Alice',
  level: 3,
};

const BOUNDS: RoomBounds = { minX: -100, maxX: 100, minY: -50, maxY: 500 };

describe('createAvatarState', () => {
  it('populates fields from AuthInfo + spawn position', () => {
    const avatar = createAvatarState(AUTH, { x: 0, y: 480 });
    expect(avatar.memberId).toBe('member-uuid-1');
    expect(avatar.displayName).toBe('Alice');
    expect(avatar.avatarId).toBe('avatar-01');
    expect(avatar.x).toBe(0);
    expect(avatar.y).toBe(480);
    expect(avatar.direction).toBe('s');
    expect(avatar.isMoving).toBe(false);
    expect(avatar.level).toBe(3);
  });

  it('clamps out-of-range level to valid [1..5]', () => {
    const low = createAvatarState({ ...AUTH, level: -2 }, { x: 0, y: 0 });
    expect(low.level).toBe(1);
    const high = createAvatarState({ ...AUTH, level: 99 }, { x: 0, y: 0 });
    expect(high.level).toBe(5);
  });

  it('rejects non-integer levels as level 1', () => {
    const frac = createAvatarState({ ...AUTH, level: 2.7 }, { x: 0, y: 0 });
    expect(frac.level).toBe(1);
  });
});

describe('applyMove', () => {
  const make = () => createAvatarState(AUTH, { x: 0, y: 0 });

  it('accepts a well-formed payload and mutates the avatar', () => {
    const avatar = make();
    const ok = applyMove(avatar, { x: 50, y: 200, direction: 'e', isMoving: true }, BOUNDS);
    expect(ok).toBe(true);
    expect(avatar.x).toBe(50);
    expect(avatar.y).toBe(200);
    expect(avatar.direction).toBe('e');
    expect(avatar.isMoving).toBe(true);
  });

  it('clamps coordinates outside bounds without rejecting the payload', () => {
    const avatar = make();
    const ok = applyMove(avatar, { x: 9999, y: -9999, direction: 'n', isMoving: true }, BOUNDS);
    expect(ok).toBe(true);
    expect(avatar.x).toBe(BOUNDS.maxX);
    expect(avatar.y).toBe(BOUNDS.minY);
  });

  it('rejects non-object payloads', () => {
    const avatar = make();
    expect(applyMove(avatar, null, BOUNDS)).toBe(false);
    expect(applyMove(avatar, 'hello', BOUNDS)).toBe(false);
    expect(applyMove(avatar, 42, BOUNDS)).toBe(false);
  });

  it('rejects payloads missing any required field', () => {
    const avatar = make();
    expect(applyMove(avatar, { y: 0, direction: 'n', isMoving: false }, BOUNDS)).toBe(false);
    expect(applyMove(avatar, { x: 0, direction: 'n', isMoving: false }, BOUNDS)).toBe(false);
    expect(applyMove(avatar, { x: 0, y: 0, isMoving: false }, BOUNDS)).toBe(false);
    expect(applyMove(avatar, { x: 0, y: 0, direction: 'n' }, BOUNDS)).toBe(false);
  });

  it('rejects payloads with non-cardinal direction', () => {
    const avatar = make();
    expect(applyMove(avatar, { x: 0, y: 0, direction: 'up', isMoving: false }, BOUNDS)).toBe(false);
    expect(applyMove(avatar, { x: 0, y: 0, direction: 'ne', isMoving: false }, BOUNDS)).toBe(false);
    expect(applyMove(avatar, { x: 0, y: 0, direction: '', isMoving: false }, BOUNDS)).toBe(false);
  });

  it('rejects payloads with non-finite coordinates', () => {
    const avatar = make();
    expect(applyMove(avatar, { x: NaN, y: 0, direction: 'n', isMoving: false }, BOUNDS)).toBe(
      false,
    );
    expect(applyMove(avatar, { x: 0, y: Infinity, direction: 'n', isMoving: false }, BOUNDS)).toBe(
      false,
    );
    expect(applyMove(avatar, { x: '0', y: 0, direction: 'n', isMoving: false }, BOUNDS)).toBe(
      false,
    );
  });

  it('rejects payloads with non-boolean isMoving', () => {
    const avatar = make();
    expect(applyMove(avatar, { x: 0, y: 0, direction: 'n', isMoving: 'true' }, BOUNDS)).toBe(false);
    expect(applyMove(avatar, { x: 0, y: 0, direction: 'n', isMoving: 1 }, BOUNDS)).toBe(false);
  });

  it('leaves avatar state untouched on reject', () => {
    const avatar = make();
    avatar.x = 123;
    avatar.y = 456;
    avatar.direction = 'w';
    avatar.isMoving = true;
    applyMove(avatar, 'nope', BOUNDS);
    expect(avatar.x).toBe(123);
    expect(avatar.y).toBe(456);
    expect(avatar.direction).toBe('w');
    expect(avatar.isMoving).toBe(true);
  });
});

describe('applyUpdateLevel', () => {
  const make = () => {
    const a = new AvatarState();
    a.level = 1;
    return a;
  };

  it('accepts integer levels in [1, 5]', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const avatar = make();
      expect(applyUpdateLevel(avatar, { level })).toBe(true);
      expect(avatar.level).toBe(level);
    }
  });

  it('rejects levels below 1 or above 5', () => {
    const avatar = make();
    avatar.level = 3;
    expect(applyUpdateLevel(avatar, { level: 0 })).toBe(false);
    expect(applyUpdateLevel(avatar, { level: 6 })).toBe(false);
    expect(applyUpdateLevel(avatar, { level: -1 })).toBe(false);
    expect(avatar.level).toBe(3); // untouched on reject
  });

  it('rejects non-integer / non-numeric levels', () => {
    const avatar = make();
    expect(applyUpdateLevel(avatar, { level: 2.5 })).toBe(false);
    expect(applyUpdateLevel(avatar, { level: '3' })).toBe(false);
    expect(applyUpdateLevel(avatar, { level: null })).toBe(false);
    expect(applyUpdateLevel(avatar, {})).toBe(false);
    expect(applyUpdateLevel(avatar, null)).toBe(false);
  });
});

describe('parseBuildingPayload', () => {
  it('returns the building name on valid payload', () => {
    expect(parseBuildingPayload({ building: 'tavern' })).toBe('tavern');
    expect(parseBuildingPayload({ building: 'academy' })).toBe('academy');
    expect(parseBuildingPayload({ building: 'market' })).toBe('market');
  });

  it('returns null for unknown or malformed payloads', () => {
    expect(parseBuildingPayload({ building: 'dungeon' })).toBeNull();
    expect(parseBuildingPayload({ building: 123 })).toBeNull();
    expect(parseBuildingPayload({})).toBeNull();
    expect(parseBuildingPayload(null)).toBeNull();
    expect(parseBuildingPayload('tavern')).toBeNull();
  });
});

// Phase 12 — coworking productivity (jukebox + pomodoro)

describe('applySetJukebox', () => {
  const fresh = (): import('@arcadia/shared').JukeboxState => {
    const { JukeboxState } = require('@arcadia/shared');
    return new JukeboxState();
  };

  it('sets the playlist + stamps startedAt + lastChangedBy', () => {
    const j = fresh();
    expect(applySetJukebox(j, { playlist: 'lofi' }, 'm-1', 1700000000000)).toBe(true);
    expect(j.playlist).toBe('lofi');
    expect(j.startedAt).toBe(1700000000000);
    expect(j.lastChangedBy).toBe('m-1');
  });

  it('clears state when playlist is empty', () => {
    const j = fresh();
    applySetJukebox(j, { playlist: 'lofi' }, 'm-1', 1000);
    applySetJukebox(j, { playlist: '' }, 'm-2', 2000);
    expect(j.playlist).toBe('');
    expect(j.startedAt).toBe(0);
    expect(j.lastChangedBy).toBe('');
  });

  it('rejects malformed payloads', () => {
    const j = fresh();
    expect(applySetJukebox(j, null, 'm', 1)).toBe(false);
    expect(applySetJukebox(j, { playlist: 42 }, 'm', 1)).toBe(false);
    expect(applySetJukebox(j, {}, 'm', 1)).toBe(false);
  });
});

describe('applyStartPomodoro', () => {
  const fresh = (): import('@arcadia/shared').PomodoroState => {
    const { PomodoroState } = require('@arcadia/shared');
    return new PomodoroState();
  };

  it('starts a session from idle with default 25/5/4', () => {
    const p = fresh();
    expect(applyStartPomodoro(p, {}, 'm-1', 1000)).toBe(true);
    expect(p.phase).toBe('work');
    expect(p.cycle).toBe(1);
    expect(p.totalCycles).toBe(4);
    expect(p.workMinutes).toBe(25);
    expect(p.endsAt).toBe(1000 + 25 * 60_000);
    expect(p.startedBy).toBe('m-1');
  });

  it('clamps out-of-range durations', () => {
    const p = fresh();
    applyStartPomodoro(p, { workMinutes: 999, breakMinutes: -1, totalCycles: 100 }, 'm', 0);
    expect(p.workMinutes).toBe(90);
    expect(p.breakMinutes).toBe(1);
    expect(p.totalCycles).toBe(8);
  });

  it('refuses to start while a session is running', () => {
    const p = fresh();
    applyStartPomodoro(p, {}, 'm-1', 0);
    expect(applyStartPomodoro(p, {}, 'm-2', 100)).toBe(false);
    expect(p.startedBy).toBe('m-1');
  });
});

describe('applyStopPomodoro', () => {
  const fresh = (): import('@arcadia/shared').PomodoroState => {
    const { PomodoroState } = require('@arcadia/shared');
    return new PomodoroState();
  };

  it('resets a running session to idle', () => {
    const p = fresh();
    applyStartPomodoro(p, {}, 'm', 0);
    expect(applyStopPomodoro(p)).toBe(true);
    expect(p.phase).toBe('idle');
    expect(p.endsAt).toBe(0);
    expect(p.startedBy).toBe('');
  });

  it('returns false on already-idle state', () => {
    const p = fresh();
    expect(applyStopPomodoro(p)).toBe(false);
  });
});

describe('tickPomodoro', () => {
  const fresh = (): import('@arcadia/shared').PomodoroState => {
    const { PomodoroState } = require('@arcadia/shared');
    return new PomodoroState();
  };

  it('does nothing while phase is idle', () => {
    const p = fresh();
    expect(tickPomodoro(p, 999_999)).toBe(false);
  });

  it('does nothing while now < endsAt', () => {
    const p = fresh();
    applyStartPomodoro(p, { workMinutes: 25 }, 'm', 0);
    expect(tickPomodoro(p, 24 * 60_000)).toBe(false);
  });

  it('advances work → break at endsAt', () => {
    const p = fresh();
    applyStartPomodoro(p, { workMinutes: 25, breakMinutes: 5 }, 'm', 0);
    expect(tickPomodoro(p, 25 * 60_000)).toBe(true);
    expect(p.phase).toBe('break');
    expect(p.endsAt).toBe(25 * 60_000 + 5 * 60_000);
  });

  it('advances break → next work cycle', () => {
    const p = fresh();
    applyStartPomodoro(p, { workMinutes: 25, breakMinutes: 5, totalCycles: 4 }, 'm', 0);
    tickPomodoro(p, 25 * 60_000); // → break
    expect(tickPomodoro(p, 30 * 60_000)).toBe(true);
    expect(p.phase).toBe('work');
    expect(p.cycle).toBe(2);
  });

  it('closes the session after the final work phase', () => {
    const p = fresh();
    applyStartPomodoro(p, { workMinutes: 25, breakMinutes: 5, totalCycles: 1 }, 'm', 0);
    expect(tickPomodoro(p, 25 * 60_000)).toBe(true);
    expect(p.phase).toBe('idle');
    expect(p.cycle).toBe(0);
    expect(p.startedBy).toBe('');
  });
});
