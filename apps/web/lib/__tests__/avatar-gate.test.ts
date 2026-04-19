import { describe, expect, it } from 'vitest';

import { decideAvatarGate, pathRequiresAvatarGate } from '../avatar-gate';

describe('decideAvatarGate', () => {
  it('unauthed requests always pass', () => {
    expect(decideAvatarGate({ pathname: '/world', hasUser: false, avatarId: null })).toEqual({
      kind: 'pass',
    });
    expect(
      decideAvatarGate({
        pathname: '/onboarding/avatar',
        hasUser: false,
        avatarId: null,
      }),
    ).toEqual({ kind: 'pass' });
  });

  describe('authed user without avatar_id', () => {
    const baseInput = { hasUser: true, avatarId: null } as const;

    it('/world → redirect to picker', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/world' })).toEqual({
        kind: 'redirect',
        to: '/onboarding/avatar',
      });
    });

    it('/tavern → redirect to picker', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/tavern' })).toEqual({
        kind: 'redirect',
        to: '/onboarding/avatar',
      });
    });

    it('sub-paths of /world and /tavern also redirect', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/world/detail' })).toEqual({
        kind: 'redirect',
        to: '/onboarding/avatar',
      });
      expect(decideAvatarGate({ ...baseInput, pathname: '/tavern/chat' })).toEqual({
        kind: 'redirect',
        to: '/onboarding/avatar',
      });
    });

    it('/onboarding/avatar itself passes', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/onboarding/avatar' })).toEqual({
        kind: 'pass',
      });
    });

    it('unrelated authed routes pass', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/' })).toEqual({
        kind: 'pass',
      });
      expect(decideAvatarGate({ ...baseInput, pathname: '/academy' })).toEqual({ kind: 'pass' });
    });
  });

  describe('authed user with avatar_id already set', () => {
    const baseInput = { hasUser: true, avatarId: 'avatar-03' } as const;

    it('/onboarding/avatar → bounce to /world', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/onboarding/avatar' })).toEqual({
        kind: 'redirect',
        to: '/world',
      });
    });

    it('/world passes', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/world' })).toEqual({
        kind: 'pass',
      });
    });

    it('/tavern passes', () => {
      expect(decideAvatarGate({ ...baseInput, pathname: '/tavern' })).toEqual({
        kind: 'pass',
      });
    });
  });
});

describe('pathRequiresAvatarGate', () => {
  it('returns true for /world, /tavern, /onboarding/avatar and their sub-paths', () => {
    expect(pathRequiresAvatarGate('/world')).toBe(true);
    expect(pathRequiresAvatarGate('/world/foo')).toBe(true);
    expect(pathRequiresAvatarGate('/tavern')).toBe(true);
    expect(pathRequiresAvatarGate('/tavern/bar')).toBe(true);
    expect(pathRequiresAvatarGate('/onboarding/avatar')).toBe(true);
    expect(pathRequiresAvatarGate('/onboarding/avatar/baz')).toBe(true);
  });

  it('returns false for unrelated paths so middleware can skip the DB fetch', () => {
    for (const path of [
      '/',
      '/login',
      '/signup',
      '/academy',
      '/market',
      '/api/health',
      '/onboarding',
      '/worldsomething',
    ]) {
      expect(pathRequiresAvatarGate(path), path).toBe(false);
    }
  });
});
