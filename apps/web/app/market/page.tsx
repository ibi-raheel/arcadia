// `/market` — the Phaser MarketScene (image-backed interior + central
// crystal). Walking up to the crystal and pressing ENTER opens the
// four-stall market dashboard as an in-world overlay (Courses ·
// Templates · Tools · Exclusives) — see `MarketOverlay.tsx`. The
// dashboard is React-on-the-same-page so the Phaser canvas + audio
// don't tear down on every open.
//
// The earlier per-course `CatalogScroll` + `StallView` modal pair
// (one row per course, click → modal) is preserved on disk under
// `_components/{CatalogScroll,StallView}.tsx` for reference, but no
// longer rendered — the new overlay routes Courses through the same
// `enrolInCourse` server action, just with a different shell.

import nextDynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { isAvatarId } from '@/components/game/scenes/shared/avatar-palette';
import type { SceneMember } from '@/components/game/scenes/world/WorldScene';

import type { MarketItem } from '@/lib/market/types';

const GameMarket = nextDynamic(() => import('@/components/game/GameMarket'), { ssr: false });

export const dynamic = 'force-dynamic';

type Params = {
  /** Set by `SQUARE_EDGE_TRIGGERS.bottom.route` so the overlay can
   *  show only the ✕ close affordance instead of the full ←-world +
   *  logout cluster. Anything else (or no param) is treated as a
   *  direct entry. */
  readonly searchParams?: { readonly from?: string };
};

export default async function MarketPage({ searchParams }: Params): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/market');

  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id, avatar_id, display_name, xp')
    .eq('member_id', user.id)
    .maybeSingle();
  if (!membership?.avatar_id || !isAvatarId(membership.avatar_id) || !membership.realm_id) {
    redirect('/onboarding/avatar');
  }

  const member: SceneMember = {
    memberId: user.id,
    realmId: membership.realm_id,
    avatarId: membership.avatar_id,
    displayName: membership.display_name ?? 'Player',
    xp: typeof membership.xp === 'number' ? membership.xp : 0,
  };

  // RLS scopes to published + same-realm.
  const [{ data: courses }, { data: myEnrolments }, { data: creators }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, description, creator_id')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase.from('enrolments').select('course_id').eq('member_id', user.id),
    supabase.from('memberships').select('member_id, display_name'),
  ]);

  const enrolledSet = new Set((myEnrolments ?? []).map((e) => e.course_id));
  const creatorNameById = new Map<string, string>();
  for (const m of creators ?? []) {
    creatorNameById.set(m.member_id, m.display_name ?? 'Anonymous Creator');
  }

  // Shape DB courses into MarketItem so the overlay can render them
  // alongside the (simulated) Templates / Tools / Exclusives fixtures.
  const courseItems: ReadonlyArray<MarketItem> = (courses ?? []).map((c) => ({
    id: c.id,
    category: 'courses',
    title: c.title,
    creatorName: (c.creator_id && creatorNameById.get(c.creator_id)) || 'Anonymous Creator',
    kicker: 'a course · long-form lessons',
    tagline: c.description ? c.description.slice(0, 140) : 'A course in this realm.',
    description:
      c.description ??
      'No description has been written for this course yet — step inside once enrolled to see what the keeper has prepared.',
    price: { kind: 'free' },
    preview: {
      kind: 'text',
      body:
        c.description ??
        '~ no preview written; the lessons will speak for themselves once you step inside ~',
    },
    owned: enrolledSet.has(c.id),
  }));

  const enteredVia: 'square' | 'direct' = searchParams?.from === 'square' ? 'square' : 'direct';

  return <GameMarket member={member} courses={courseItems} enteredVia={enteredVia} />;
}
