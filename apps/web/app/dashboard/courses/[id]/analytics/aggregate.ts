// Pure aggregation helpers for the course analytics page. Extracted so
// the decision logic (what counts as "completed this course", what's
// "active in the last 7 days") can be unit-tested without a live
// Supabase client.

export type AggregateProgressRow = {
  readonly lesson_id: string;
  readonly member_id: string;
  readonly completed: boolean;
  readonly updated_at: string; // ISO timestamp
};

/**
 * Fraction in [0, 1] of enrolled members who have a `completed = true`
 * row for every lesson in the course. Returns 0 when there are no
 * enrolled members or no lessons.
 */
export function computeCompletionRate(args: {
  readonly enrolledMemberIds: readonly string[];
  readonly lessonIds: readonly string[];
  readonly progress: readonly AggregateProgressRow[];
}): number {
  const { enrolledMemberIds, lessonIds, progress } = args;
  if (enrolledMemberIds.length === 0 || lessonIds.length === 0) return 0;

  // Build: member -> Set<completed lessonId>.
  const completedByMember = new Map<string, Set<string>>();
  for (const p of progress) {
    if (!p.completed) continue;
    const set = completedByMember.get(p.member_id) ?? new Set<string>();
    set.add(p.lesson_id);
    completedByMember.set(p.member_id, set);
  }

  const lessonIdSet = new Set(lessonIds);
  let finishedCount = 0;
  for (const memberId of enrolledMemberIds) {
    const completed = completedByMember.get(memberId);
    if (!completed) continue;
    // Every lesson must have a matching completed row.
    let all = true;
    for (const lid of lessonIdSet) {
      if (!completed.has(lid)) {
        all = false;
        break;
      }
    }
    if (all) finishedCount += 1;
  }

  return finishedCount / enrolledMemberIds.length;
}

/**
 * Distinct member-id count of callers who have any `lesson_progress`
 * upsert in the given course within the last `windowMs` milliseconds
 * relative to `now`.
 */
export function countActiveInWindow(args: {
  readonly progress: readonly AggregateProgressRow[];
  readonly now: Date;
  readonly windowMs: number;
}): number {
  const { progress, now, windowMs } = args;
  const threshold = now.getTime() - windowMs;
  const active = new Set<string>();
  for (const p of progress) {
    if (new Date(p.updated_at).getTime() >= threshold) active.add(p.member_id);
  }
  return active.size;
}

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
