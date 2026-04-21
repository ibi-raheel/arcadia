'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';

type Result = { readonly ok: true } | { readonly ok: false; readonly error: string };

const COMPLETION_THRESHOLD = 0.8; // 80% watched = complete (phase-plan §Week 10)

/**
 * Upsert the caller's lesson_progress row. RLS ensures member_id is always
 * the caller's auth.uid — we don't pass it from the client. `completed`
 * is derived from watchedSecs + durationSec; the client also tracks
 * this but recomputing server-side guarantees consistency.
 */
export async function upsertLessonProgress(
  lessonId: string,
  watchedSecs: number,
  durationSec: number | null,
): Promise<Result> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  if (!Number.isFinite(watchedSecs) || watchedSecs < 0) {
    return { ok: false, error: 'Invalid watchedSecs.' };
  }
  const watched = Math.round(watchedSecs);
  const completed =
    durationSec != null && durationSec > 0
      ? watched >= Math.floor(COMPLETION_THRESHOLD * durationSec)
      : false;

  const { error } = await supabase.from('lesson_progress').upsert(
    {
      lesson_id: lessonId,
      member_id: user.id,
      watched_secs: watched,
      completed,
    },
    { onConflict: 'lesson_id,member_id' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Called by the video viewer on YT `onReady` when `lessons.duration_sec`
 * is currently NULL — captures the duration reported by the IFrame API.
 * Backed by the SECURITY DEFINER RPC `set_lesson_duration` so any reader
 * can write (but only when the column is NULL — first set wins).
 */
export async function setLessonDurationIfNull(
  lessonId: string,
  durationSec: number,
): Promise<Result> {
  if (!Number.isFinite(durationSec) || durationSec < 0) {
    return { ok: false, error: 'Invalid duration.' };
  }
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc('set_lesson_duration', {
    p_lesson_id: lessonId,
    p_duration: Math.round(durationSec),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Final flush path — single call bundling duration (if new) + progress.
 * Used in `beforeunload` / unmount where we want to minimise the number
 * of in-flight requests.
 */
export async function flushLessonProgress(
  lessonId: string,
  watchedSecs: number,
  durationSec: number | null,
  captureDuration: boolean,
): Promise<Result> {
  if (captureDuration && durationSec != null) {
    await setLessonDurationIfNull(lessonId, durationSec);
  }
  return upsertLessonProgress(lessonId, watchedSecs, durationSec);
}
