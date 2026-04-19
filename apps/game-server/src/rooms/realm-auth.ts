// Pure-function authentication logic for RealmRoom.onAuth. Extracted so it
// can be exercised directly in Vitest with a stubbed supabase client — no
// network + no Colyseus framework + no env plumbing in the test harness.
//
// Flow (TAD §5.4 + §6 membership lookup):
//   1. Client's join options carry an `accessToken` (Supabase session JWT).
//   2. `supabaseAdmin.auth.getUser(token)` validates the JWT and returns
//      the Supabase user id.
//   3. Fetch `memberships` for that user id — need `realm_id`, `avatar_id`,
//      `display_name`, `level` to seed the AvatarState.
//   4. Reject if any step fails (invalid JWT, missing row, null avatar_id).
//   5. Return AuthInfo — becomes `client.auth` in onJoin.

import { ServerError } from 'colyseus';

import type { AuthInfo } from './realm-handlers';

// Stripped-down shape of `supabaseAdmin` that auth only needs. Lets tests
// pass a plain object instead of mocking the full SupabaseClient.
export type AuthSupabase = {
  readonly auth: {
    getUser(token: string): Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
  from(table: 'memberships'): {
    select(columns: string): {
      eq(
        column: 'member_id',
        value: string,
      ): {
        maybeSingle(): Promise<{
          data: MembershipRow | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

type MembershipRow = {
  readonly realm_id: string;
  readonly avatar_id: string | null;
  readonly display_name: string | null;
  readonly level: number | null;
};

/**
 * HTTP-ish code used when throwing from onAuth. Colyseus surfaces this to
 * the client's `onError` handler so reconnect logic can distinguish auth
 * failure from transport errors.
 */
export const UNAUTHORIZED_CODE = 4401;

/**
 * Validates the access token + fetches membership metadata. Throws
 * `ServerError(4401)` on any auth failure so Colyseus rejects the join.
 *
 * `token` is the `accessToken` field from the client's join options; an
 * empty / missing token short-circuits without calling Supabase.
 */
export async function authenticateJoin(
  token: string | undefined,
  supabase: AuthSupabase,
): Promise<AuthInfo> {
  if (!token || typeof token !== 'string') {
    throw new ServerError(UNAUTHORIZED_CODE, 'missing accessToken');
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new ServerError(UNAUTHORIZED_CODE, `invalid token: ${error?.message ?? 'no user'}`);
  }

  const userId = data.user.id;

  const membershipResult = await supabase
    .from('memberships')
    .select('realm_id, avatar_id, display_name, level')
    .eq('member_id', userId)
    .maybeSingle();

  if (membershipResult.error) {
    throw new ServerError(
      UNAUTHORIZED_CODE,
      `membership lookup failed: ${membershipResult.error.message}`,
    );
  }

  const row = membershipResult.data;
  if (!row) {
    throw new ServerError(UNAUTHORIZED_CODE, 'membership not found');
  }
  if (!row.avatar_id) {
    // User has signed up but not yet completed /onboarding/avatar. World
    // entry is gated by middleware; this is a defence-in-depth reject.
    throw new ServerError(UNAUTHORIZED_CODE, 'avatar not set');
  }

  return {
    memberId: userId,
    realmId: row.realm_id,
    avatarId: row.avatar_id,
    displayName: row.display_name ?? '',
    level: row.level ?? 1,
  };
}
