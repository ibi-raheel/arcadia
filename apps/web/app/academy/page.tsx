import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { isAvatarId } from '@/components/game/scenes/shared/avatar-palette';
import type { AcademyCoursePodium } from '@/components/game/scenes/academy/AcademyScene';
import type { SceneMember } from '@/components/game/scenes/world/WorldScene';

// GameAcademy mounts Phaser — dynamic-import + ssr:false so the module
// never lands in a server-rendered bundle (Phaser's DOM/WebGL dependencies
// crash under Node).
const GameAcademy = nextDynamic(() => import('@/components/game/GameAcademy'), {
  ssr: false,
});

export const dynamic = 'force-dynamic';

type AcademyCourseRow = {
  id: string;
  title: string;
  published: boolean;
  creator_id: string | null;
};

export default async function AcademyPage(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/academy');

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

  const [{ data: enrolments }, { data: owned }, { data: progress }] = await Promise.all([
    supabase
      .from('enrolments')
      .select('courses(id, title, published, creator_id)')
      .eq('member_id', user.id),
    supabase
      .from('courses')
      .select('id, title, published, creator_id')
      .eq('creator_id', user.id)
      .eq('published', true),
    supabase.from('lesson_progress').select('lesson_id, completed').eq('member_id', user.id),
  ]);

  const byId = new Map<string, AcademyCourseRow>();
  for (const e of enrolments ?? []) {
    const c = (e as { courses: AcademyCourseRow | AcademyCourseRow[] | null }).courses;
    const row = Array.isArray(c) ? c[0] : c;
    if (row && row.published) byId.set(row.id, row);
  }
  for (const c of owned ?? []) byId.set(c.id, c as AcademyCourseRow);
  const courseRows = Array.from(byId.values());

  // Per-course lesson counts for the podium progress labels.
  const { data: lessonCounts } = await supabase
    .from('lessons')
    .select('id, course_id')
    .in('course_id', courseRows.length > 0 ? courseRows.map((c) => c.id) : ['']);

  const completedLessonIds = new Set(
    (progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id),
  );
  const totalByCourse = new Map<string, number>();
  const completedByCourse = new Map<string, number>();
  for (const l of lessonCounts ?? []) {
    totalByCourse.set(l.course_id, (totalByCourse.get(l.course_id) ?? 0) + 1);
    if (completedLessonIds.has(l.id)) {
      completedByCourse.set(l.course_id, (completedByCourse.get(l.course_id) ?? 0) + 1);
    }
  }

  const podiums: AcademyCoursePodium[] = courseRows.map((c) => ({
    id: c.id,
    title: c.title,
    totalLessons: totalByCourse.get(c.id) ?? 0,
    completedLessons: completedByCourse.get(c.id) ?? 0,
  }));

  if (podiums.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-slate-100">
        <h1 className="text-3xl font-semibold">The Academy is quiet.</h1>
        <p className="max-w-md text-center text-slate-400">
          No courses in your library yet. Ask a creator to grant you access, or publish one yourself
          from the dashboard.
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

  return <GameAcademy member={member} courses={podiums} />;
}
