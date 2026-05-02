// `/market` — the four-stall market: Courses · Patterns · Tools ·
// Exclusives. Lands on a 4-card picker; clicking a card opens that
// stall's catalogue with a list rail, preview pane, and (simulated)
// checkout footer.
//
// **Courses** are real DB rows (published + same-realm via RLS) and
// flow through the existing `enrolInCourse` server action when the
// member claims one. **Patterns / Tools / Exclusives** are
// hand-authored fixtures (`@/lib/market/fixtures`) and the "purchase"
// is simulated — ownership is in-memory, resets on reload. No payment
// integration; no new migrations.
//
// The earlier Phaser-backed market (`MarketScene` + `StallView` modal)
// is preserved on disk under `app/market/_components/StallView.tsx`
// and `components/game/scenes/market/` for reference, but no longer
// rendered. See `docs/changelog/<TBD>_market-categories.md`.

import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import type { MarketItem } from '@/lib/market/types';

import { Market } from './_components/Market';

export const dynamic = 'force-dynamic';

export default async function MarketPage(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/market');

  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id, avatar_id')
    .eq('member_id', user.id)
    .maybeSingle();
  if (!membership?.avatar_id || !membership.realm_id) {
    redirect('/onboarding/avatar');
  }

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

  // All Courses are free for the demo (the original /market never sold
  // them). Pricing here is the simulated layer — Patterns/Tools/
  // Exclusives carry coin in fixtures; Courses always say "free".
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

  return <Market courses={courseItems} />;
}
