'use server';

import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { validateCreateCourseInput, type CreateCourseInput } from './validation';

export type CreateCourseResult =
  | { readonly ok: true; readonly courseId: string }
  | { readonly ok: false; readonly error: string };

export async function createCourse(raw: CreateCourseInput): Promise<CreateCourseResult> {
  const validation = validateCreateCourseInput(raw);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('realm_id')
    .eq('member_id', user.id)
    .maybeSingle();
  if (membershipError || !membership?.realm_id) {
    return { ok: false, error: 'No realm for member.' };
  }

  const { data: course, error: insertError } = await supabase
    .from('courses')
    .insert({
      realm_id: membership.realm_id,
      creator_id: user.id,
      title: validation.value.title,
      description: validation.value.description || null,
      published: false,
    })
    .select('id')
    .single();

  if (insertError || !course) {
    return { ok: false, error: insertError?.message ?? 'Failed to create course.' };
  }

  return { ok: true, courseId: course.id };
}

export async function createCourseAndRedirect(raw: CreateCourseInput): Promise<CreateCourseResult> {
  const result = await createCourse(raw);
  if (result.ok) redirect(`/dashboard/courses/${result.courseId}`);
  return result;
}
