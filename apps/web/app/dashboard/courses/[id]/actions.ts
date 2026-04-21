'use server';

import { revalidatePath } from 'next/cache';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import {
  parseYouTubeId,
  validateLessonContent,
  validateLessonTitle,
  validateLessonType,
  validateReorderIds,
  validateSectionTitle,
} from './validation';

type Result = { readonly ok: true } | { readonly ok: false; readonly error: string };

async function assertOwner(courseId: string): Promise<Result> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  // RLS will block these writes for non-owners, but short-circuit here
  // so the client gets a clean error rather than a generic RLS 403.
  const { data: course } = await supabase
    .from('courses')
    .select('creator_id')
    .eq('id', courseId)
    .maybeSingle<{ creator_id: string | null }>();
  if (!course || course.creator_id !== user.id) {
    return { ok: false, error: 'Not your course.' };
  }
  return { ok: true };
}

export async function createSection(courseId: string, rawTitle: string): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateSectionTitle(rawTitle);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();

  // Append at the end — look up the current max sort_order.
  const { data: last } = await supabase
    .from('sections')
    .select('sort_order')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from('sections')
    .insert({ course_id: courseId, title: validation.value, sort_order: nextOrder });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

export async function renameSection(
  courseId: string,
  sectionId: string,
  rawTitle: string,
): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateSectionTitle(rawTitle);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('sections')
    .update({ title: validation.value })
    .eq('id', sectionId)
    .eq('course_id', courseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

export async function deleteSection(courseId: string, sectionId: string): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const supabase = getSupabaseServerClient();

  // Cascade: delete child lessons first (FK has no ON DELETE CASCADE at
  // the schema level). RLS on lessons lets the creator delete via the
  // course-ownership clause.
  const { error: lessonErr } = await supabase.from('lessons').delete().eq('section_id', sectionId);
  if (lessonErr) return { ok: false, error: lessonErr.message };

  const { error } = await supabase
    .from('sections')
    .delete()
    .eq('id', sectionId)
    .eq('course_id', courseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

export async function reorderSections(
  courseId: string,
  orderedIds: readonly string[],
): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateReorderIds(orderedIds);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();

  // Parallel per-row updates scoped to this course. RLS guarantees we
  // can't touch sections owned by another creator even if a bad id leaks in.
  const updates = validation.value.map((id, index) =>
    supabase.from('sections').update({ sort_order: index }).eq('id', id).eq('course_id', courseId),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) return { ok: false, error: firstError.error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

// ---- Lesson actions -----------------------------------------------------

export async function createLesson(
  courseId: string,
  sectionId: string,
  rawTitle: string,
): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateLessonTitle(rawTitle);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();

  const { data: last } = await supabase
    .from('lessons')
    .select('sort_order')
    .eq('section_id', sectionId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const nextOrder = (last?.sort_order ?? -1) + 1;

  // Default to written lesson; creator switches to video via the editor
  // (Week 9 Step 8). `course_id` is denormalized for RLS scope.
  const { error } = await supabase.from('lessons').insert({
    course_id: courseId,
    section_id: sectionId,
    title: validation.value,
    type: 'written',
    sort_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

export async function renameLesson(
  courseId: string,
  lessonId: string,
  rawTitle: string,
): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateLessonTitle(rawTitle);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('lessons')
    .update({ title: validation.value })
    .eq('id', lessonId)
    .eq('course_id', courseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

export async function updateLessonContent(
  courseId: string,
  lessonId: string,
  rawContent: string,
): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateLessonContent(rawContent);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('lessons')
    .update({ content: validation.value })
    .eq('id', lessonId)
    .eq('course_id', courseId);
  if (error) return { ok: false, error: error.message };

  // No revalidatePath — the editor refreshes its own state; avoids a
  // full page re-render on every keystroke save.
  return { ok: true };
}

export async function updateLessonType(
  courseId: string,
  lessonId: string,
  rawType: string,
): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateLessonType(rawType);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('lessons')
    .update({ type: validation.value })
    .eq('id', lessonId)
    .eq('course_id', courseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

/**
 * Set a lesson's YouTube video id. Accepts a full YouTube URL (any of
 * the common shapes) or a bare 11-char id. Clears the id when raw is
 * blank.
 */
export async function updateLessonYouTubeId(
  courseId: string,
  lessonId: string,
  raw: string,
): Promise<(Result & { readonly videoId?: string | null }) | Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const trimmed = raw.trim();
  const supabase = getSupabaseServerClient();

  if (trimmed.length === 0) {
    const { error } = await supabase
      .from('lessons')
      .update({ youtube_video_id: null, duration_sec: null })
      .eq('id', lessonId)
      .eq('course_id', courseId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/courses/${courseId}`);
    return { ok: true, videoId: null };
  }

  const videoId = parseYouTubeId(trimmed);
  if (!videoId) {
    return { ok: false, error: 'Not a valid YouTube URL or ID.' };
  }

  // duration_sec is reset here — the viewer captures it via the IFrame
  // API on first successful load (Week 10 Step 13). Keeping it NULL
  // until then is correct.
  const { error } = await supabase
    .from('lessons')
    .update({ youtube_video_id: videoId, duration_sec: null })
    .eq('id', lessonId)
    .eq('course_id', courseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true, videoId };
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)
    .eq('course_id', courseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

export async function reorderLessons(
  courseId: string,
  sectionId: string,
  orderedIds: readonly string[],
): Promise<Result> {
  const ownerCheck = await assertOwner(courseId);
  if (!ownerCheck.ok) return ownerCheck;

  const validation = validateReorderIds(orderedIds);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = getSupabaseServerClient();
  const updates = validation.value.map((id, index) =>
    supabase
      .from('lessons')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('course_id', courseId)
      .eq('section_id', sectionId),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) return { ok: false, error: firstError.error.message };

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}
