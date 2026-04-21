// Server-only analytics fetcher. Uses the service-role admin client so the
// "has every member who's enrolled completed every lesson?" aggregation
// can see other members' lesson_progress rows — RLS hides them from the
// anon client, which is correct for member-to-member but wrong for a
// creator looking at their own course stats.
//
// The ownership check up front is the security boundary: we re-verify
// that the caller is the course's creator via the anon client (which
// RLS already limits to their own courses) before the admin client fires.

import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

import {
  computeCompletionRate,
  countActiveInWindow,
  SEVEN_DAYS_MS,
  type AggregateProgressRow,
} from './aggregate';

export type RecentActivityRow = {
  readonly memberId: string;
  readonly displayName: string;
  readonly lessonId: string;
  readonly lessonTitle: string;
  readonly completed: boolean;
  readonly updatedAt: string;
};

export type CourseAnalytics = {
  readonly enrolmentCount: number;
  readonly completionRate: number; // 0-1
  readonly activeInLastWeek: number;
  readonly recentActivity: readonly RecentActivityRow[];
};

export type FetchAnalyticsResult =
  | { readonly ok: true; readonly data: CourseAnalytics }
  | {
      readonly ok: false;
      readonly status: 'unauthorized' | 'not-found' | 'error';
      readonly error?: string;
    };

const RECENT_ACTIVITY_LIMIT = 10;

export async function fetchCourseAnalytics(courseId: string): Promise<FetchAnalyticsResult> {
  const anon = getSupabaseServerClient();
  const {
    data: { user },
  } = await anon.auth.getUser();
  if (!user) return { ok: false, status: 'unauthorized' };

  // Ownership check via the anon client — RLS on courses already limits
  // SELECT to creator = auth.uid() OR published, so this maybeSingle
  // returning null = not visible = treat as not-yours.
  const { data: course } = await anon
    .from('courses')
    .select('id, creator_id')
    .eq('id', courseId)
    .maybeSingle<{ id: string; creator_id: string | null }>();
  if (!course) return { ok: false, status: 'not-found' };
  if (course.creator_id !== user.id) return { ok: false, status: 'unauthorized' };

  // From here out: admin client, creator-verified.
  const admin = getSupabaseAdminClient();

  const [enrolmentsRes, lessonsRes] = await Promise.all([
    admin.from('enrolments').select('member_id').eq('course_id', courseId),
    admin.from('lessons').select('id, title').eq('course_id', courseId),
  ]);
  if (enrolmentsRes.error) {
    return { ok: false, status: 'error', error: enrolmentsRes.error.message };
  }
  if (lessonsRes.error) {
    return { ok: false, status: 'error', error: lessonsRes.error.message };
  }

  const enrolledMemberIds = (enrolmentsRes.data ?? []).map((r) => r.member_id);
  const lessons = lessonsRes.data ?? [];
  const lessonIds = lessons.map((l) => l.id);

  // Pull every lesson_progress row for any lesson in the course. On
  // small courses (<~50 lessons × <~1000 members) this is fast; flag
  // for a dedicated aggregate RPC if it ever shows up in slow logs.
  let progress: AggregateProgressRow[] = [];
  if (lessonIds.length > 0) {
    const progressRes = await admin
      .from('lesson_progress')
      .select('lesson_id, member_id, completed, updated_at')
      .in('lesson_id', lessonIds);
    if (progressRes.error) {
      return { ok: false, status: 'error', error: progressRes.error.message };
    }
    progress = progressRes.data ?? [];
  }

  const completionRate = computeCompletionRate({
    enrolledMemberIds,
    lessonIds,
    progress,
  });
  const activeInLastWeek = countActiveInWindow({
    progress,
    now: new Date(),
    windowMs: SEVEN_DAYS_MS,
  });

  // Recent activity: sort by updated_at desc, resolve lesson titles +
  // member display names. Admin client bypasses RLS so display_name
  // is always readable here.
  const sortedActivity = [...progress].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
  const recent = sortedActivity.slice(0, RECENT_ACTIVITY_LIMIT);
  const recentMemberIds = Array.from(new Set(recent.map((r) => r.member_id)));
  let displayNameByMember = new Map<string, string>();
  if (recentMemberIds.length > 0) {
    const { data: members } = await admin
      .from('memberships')
      .select('member_id, display_name')
      .in('member_id', recentMemberIds);
    displayNameByMember = new Map(
      (members ?? []).map((m) => [m.member_id, m.display_name ?? 'Anonymous']),
    );
  }
  const lessonTitleById = new Map(lessons.map((l) => [l.id, l.title]));

  const recentActivity: RecentActivityRow[] = recent.map((r) => ({
    memberId: r.member_id,
    displayName: displayNameByMember.get(r.member_id) ?? 'Anonymous',
    lessonId: r.lesson_id,
    lessonTitle: lessonTitleById.get(r.lesson_id) ?? 'Unknown lesson',
    completed: r.completed,
    updatedAt: r.updated_at,
  }));

  return {
    ok: true,
    data: {
      enrolmentCount: enrolledMemberIds.length,
      completionRate,
      activeInLastWeek,
      recentActivity,
    },
  };
}
