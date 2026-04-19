import { ServerError } from 'colyseus';
import { describe, expect, it } from 'vitest';

import { authenticateJoin, UNAUTHORIZED_CODE, type AuthSupabase } from '../realm-auth';

type MembershipRow = {
  realm_id: string;
  avatar_id: string | null;
  display_name: string | null;
  level: number | null;
};

// Minimal supabase stub matching AuthSupabase. Each factory returns a shape
// that replays the canned responses the test wants.
function makeSupabase(opts: {
  user?: { id: string } | null;
  userError?: { message: string };
  membership?: MembershipRow | null;
  membershipError?: { message: string };
}): AuthSupabase {
  return {
    auth: {
      getUser: async () => ({
        data: { user: opts.user ?? null },
        error: opts.userError ?? null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: opts.membership ?? null,
            error: opts.membershipError ?? null,
          }),
        }),
      }),
    }),
  };
}

async function expectUnauthorized(
  promise: Promise<unknown>,
  messageSubstring?: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    code: UNAUTHORIZED_CODE,
    ...(messageSubstring ? { message: expect.stringContaining(messageSubstring) } : {}),
  });
  await expect(promise).rejects.toBeInstanceOf(ServerError);
}

describe('authenticateJoin', () => {
  it('rejects when token is missing', async () => {
    const supabase = makeSupabase({});
    await expectUnauthorized(authenticateJoin(undefined, supabase), 'missing accessToken');
    await expectUnauthorized(authenticateJoin('', supabase), 'missing accessToken');
  });

  it('rejects when Supabase returns an auth error (invalid / expired JWT)', async () => {
    const supabase = makeSupabase({ userError: { message: 'JWT expired' } });
    await expectUnauthorized(authenticateJoin('stale-token', supabase), 'invalid token');
  });

  it('rejects when Supabase returns no user despite no error', async () => {
    const supabase = makeSupabase({ user: null });
    await expectUnauthorized(authenticateJoin('ghost-token', supabase), 'invalid token');
  });

  it('rejects when membership lookup errors out', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-1' },
      membershipError: { message: 'db down' },
    });
    await expectUnauthorized(authenticateJoin('valid-token', supabase), 'membership lookup');
  });

  it('rejects when the user has no membership row', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-2' },
      membership: null,
    });
    await expectUnauthorized(authenticateJoin('valid-token', supabase), 'membership not found');
  });

  it('rejects when avatar_id is null (picker not completed)', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-3' },
      membership: {
        realm_id: 'realm-1',
        avatar_id: null,
        display_name: 'Newcomer',
        level: 1,
      },
    });
    await expectUnauthorized(authenticateJoin('valid-token', supabase), 'avatar not set');
  });

  it('accepts valid token + membership; returns AuthInfo', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-4' },
      membership: {
        realm_id: 'realm-1',
        avatar_id: 'avatar-02',
        display_name: 'Bob',
        level: 3,
      },
    });
    const auth = await authenticateJoin('valid-token', supabase);
    expect(auth).toEqual({
      memberId: 'user-4',
      realmId: 'realm-1',
      avatarId: 'avatar-02',
      displayName: 'Bob',
      level: 3,
    });
  });

  it('defaults missing display_name to empty string and missing level to 1', async () => {
    const supabase = makeSupabase({
      user: { id: 'user-5' },
      membership: {
        realm_id: 'realm-1',
        avatar_id: 'avatar-01',
        display_name: null,
        level: null,
      },
    });
    const auth = await authenticateJoin('valid-token', supabase);
    expect(auth.displayName).toBe('');
    expect(auth.level).toBe(1);
  });
});
