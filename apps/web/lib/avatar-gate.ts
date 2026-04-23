// Avatar-picker gate (Phase 1 Step 11, TAD §3.3).
//
// On every authed request under `/world` or `/tavern`, an authed member
// without an `avatar_id` on their memberships row is redirected to
// `/onboarding/avatar` before Phaser mounts. On authed requests *to*
// `/onboarding/avatar` where `avatar_id` is already set, they're bounced
// to `/world` so returning members don't sit on the picker.
//
// The fetch itself lives in middleware.ts; the decision logic is factored
// out here so it can be unit-tested without spinning up Next runtime.

export type AvatarGateDecision =
  | { readonly kind: 'pass' }
  | { readonly kind: 'redirect'; readonly to: '/onboarding/avatar' | '/world' };

export type AvatarGateInput = {
  readonly pathname: string;
  readonly hasUser: boolean;
  readonly avatarId: string | null;
};

// 2026-04-22: expanded from /world + /tavern to cover every scene that
// renders a member-owned avatar — the three new outdoor scenes all expect
// `memberships.avatar_id` to be set before Phaser mounts.
const AVATAR_SCENE_EXACT = new Set<string>([
  '/world',
  '/tavern',
  '/academy-outside',
  '/tavern-outside',
  '/coworking',
]);
const AVATAR_SCENE_PREFIXES = [
  '/world/',
  '/tavern/',
  '/academy-outside/',
  '/tavern-outside/',
  '/coworking/',
];

function isAvatarScenePath(pathname: string): boolean {
  if (AVATAR_SCENE_EXACT.has(pathname)) return true;
  return AVATAR_SCENE_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAvatarPickerPath(pathname: string): boolean {
  return pathname === '/onboarding/avatar' || pathname.startsWith('/onboarding/avatar/');
}

/** Pure avatar-gate decision. Called from middleware.ts after the avatar lookup. */
export function decideAvatarGate(input: AvatarGateInput): AvatarGateDecision {
  if (!input.hasUser) return { kind: 'pass' };

  const { pathname, avatarId } = input;

  if (isAvatarScenePath(pathname) && avatarId === null) {
    return { kind: 'redirect', to: '/onboarding/avatar' };
  }

  if (isAvatarPickerPath(pathname) && avatarId !== null) {
    return { kind: 'redirect', to: '/world' };
  }

  return { kind: 'pass' };
}

/** Does this path need an avatar_id lookup to resolve? Middleware uses this
 *  to skip the DB roundtrip on every other request. */
export function pathRequiresAvatarGate(pathname: string): boolean {
  return isAvatarScenePath(pathname) || isAvatarPickerPath(pathname);
}
