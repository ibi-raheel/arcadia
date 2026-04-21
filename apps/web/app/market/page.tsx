import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { isAvatarId } from '@/components/game/scenes/shared/avatar-palette';
import type { MarketStall } from '@/components/game/scenes/market/MarketScene';
import type { SceneMember } from '@/components/game/scenes/world/WorldScene';
import type { StallData, StallLesson, StallSection } from './_components/StallView';

const GameMarket = nextDynamic(() => import('@/components/game/GameMarket'), { ssr: false });

export const dynamic = 'force-dynamic';

type Params = {
  readonly searchParams?: { readonly course?: string };
};

export default async function MarketPage({ searchParams }: Params): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/market');

  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id, avatar_id, display_name')
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
  };

  // RLS already scopes to published + same-realm (course_member_read).
  const [{ data: courses }, { data: myEnrolments }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, description, creator_id, realm_id, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase.from('enrolments').select('course_id').eq('member_id', user.id),
  ]);

  const rows = courses ?? [];
  const enrolledSet = new Set((myEnrolments ?? []).map((e) => e.course_id));
  const courseIds = rows.map((c) => c.id);

  const [{ data: sections }, { data: lessons }, { data: creators }] = await Promise.all([
    supabase
      .from('sections')
      .select('id, course_id, title, sort_order')
      .in('course_id', courseIds.length > 0 ? courseIds : ['']),
    supabase
      .from('lessons')
      .select(
        'id, course_id, section_id, title, type, sort_order, is_preview, youtube_video_id, content, duration_sec',
      )
      .in('course_id', courseIds.length > 0 ? courseIds : ['']),
    supabase
      .from('memberships')
      .select('member_id, display_name')
      .in(
        'member_id',
        rows.map((r) => r.creator_id).filter((v): v is string => !!v),
      ),
  ]);

  const creatorNameById = new Map<string, string>();
  for (const m of creators ?? []) {
    creatorNameById.set(m.member_id, m.display_name ?? 'Anonymous Creator');
  }

  const lessonsByCourse = new Map<string, NonNullable<typeof lessons>>();
  for (const l of lessons ?? []) {
    const arr = lessonsByCourse.get(l.course_id) ?? [];
    arr.push(l);
    lessonsByCourse.set(l.course_id, arr);
  }
  const sectionsByCourse = new Map<string, NonNullable<typeof sections>>();
  for (const s of sections ?? []) {
    const arr = sectionsByCourse.get(s.course_id) ?? [];
    arr.push(s);
    sectionsByCourse.set(s.course_id, arr);
  }

  // Global enrolment counts need to see *other* members' rows; the anon
  // client only sees self-rows per `enrolment_self_read`. For the MVP we
  // surface the self-enrolled flag but skip the global count (defaults to
  // 0). A dedicated aggregate RPC or analytics view is a Phase-5 follow-up.
  const enrolmentCountByCourse = new Map<string, number>();

  const stalls: MarketStall[] = rows.map((c) => ({
    id: c.id,
    title: c.title,
    creatorName: (c.creator_id && creatorNameById.get(c.creator_id)) || 'Anonymous Creator',
    lessonCount: lessonsByCourse.get(c.id)?.length ?? 0,
    enrolmentCount: enrolmentCountByCourse.get(c.id) ?? 0,
    enrolled: enrolledSet.has(c.id),
  }));

  const stallDetails: Record<string, StallData> = {};
  for (const c of rows) {
    const courseSections = (sectionsByCourse.get(c.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const courseLessons = lessonsByCourse.get(c.id) ?? [];

    const grouped: StallSection[] = courseSections.map((s) => ({
      id: s.id,
      title: s.title,
      lessons: courseLessons
        .filter((l) => l.section_id === s.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map<StallLesson>((l) => ({
          id: l.id,
          sectionId: l.section_id,
          title: l.title,
          type: l.type,
          isPreview: l.is_preview,
          youtubeVideoId: l.youtube_video_id,
          content: l.content,
          durationSec: l.duration_sec,
        })),
    }));

    stallDetails[c.id] = {
      id: c.id,
      title: c.title,
      description: c.description,
      creatorName: (c.creator_id && creatorNameById.get(c.creator_id)) || 'Anonymous Creator',
      enrolmentCount: enrolmentCountByCourse.get(c.id) ?? 0,
      enrolled: enrolledSet.has(c.id),
      sections: grouped,
    };
  }

  // Client GameMarket derives the selected stall from ?course= on its
  // own — we just need to guard against nonexistent ids the server
  // would otherwise try to pass through. No `initialCourseId` prop.
  void searchParams?.course;

  if (stalls.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-slate-100">
        <h1 className="text-3xl font-semibold">The Market is empty.</h1>
        <p className="max-w-md text-center text-slate-400">
          No published courses in your realm yet. Creators: head to the Dashboard and hit Publish.
        </p>
        <Link
          href="/world"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Back to World
        </Link>
      </main>
    );
  }

  return <GameMarket member={member} stalls={stalls} stallDetails={stallDetails} />;
}
