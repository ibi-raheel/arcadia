'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';

export type EnrolResult =
  | { readonly ok: true; readonly alreadyEnrolled: boolean }
  | { readonly ok: false; readonly error: string };

/**
 * Self-enrol the caller in a course. RLS policy `enrolment_self_insert`
 * (Phase 3 migration 20260421000001) enforces: member_id = auth.uid(),
 * course is published, course is in the caller's realm. We look up the
 * course's realm_id server-side so the INSERT doesn't trust the client.
 */
export async function enrolInCourse(courseId: string): Promise<EnrolResult> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, realm_id, published')
    .eq('id', courseId)
    .maybeSingle<{ id: string; realm_id: string; published: boolean }>();
  if (courseErr || !course) {
    return { ok: false, error: 'Course not found or not visible.' };
  }
  if (!course.published) {
    return { ok: false, error: 'Course is not published.' };
  }

  const { error: insertErr } = await supabase.from('enrolments').insert({
    course_id: course.id,
    realm_id: course.realm_id,
    member_id: user.id,
  });

  if (insertErr) {
    // Idempotency: the (course_id, member_id) unique constraint means
    // double-clicks raise a duplicate-key error. Treat as success.
    if (/duplicate key|unique/i.test(insertErr.message)) {
      return { ok: true, alreadyEnrolled: true };
    }
    return { ok: false, error: insertErr.message };
  }

  return { ok: true, alreadyEnrolled: false };
}
