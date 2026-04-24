// Typed view of the `course_drafts` table (migration
// 20260425000001_phase10_course_drafts.sql) — used by server actions
// in app/_actions/scribe.ts and the client UI under
// app/dashboard/courses/conjure/.
//
// Arcadia doesn't generate a full Database type from Supabase; we
// hand-write the shapes the feature actually needs. Keep this file in
// sync with the migration.

/** The state machine. See phase-10 plan §10.0 for stage contracts. */
export type DraftStage = 'satchel' | 'outline' | 'lessons' | 'images' | 'ready' | 'sealed';

/** One uploaded source file, parsed to plaintext. */
export type DraftSource = {
  readonly id: string;
  readonly filename: string;
  readonly char_count: number;
  /** Plaintext from the file. Raw bytes stay in Storage. */
  readonly text: string;
  /** Storage path: `{creator_id}/{draft_id}/{filename}`. */
  readonly storage_path: string;
};

/** One section in the outline — carries its lessons inline so the
 *  outline JSON is self-contained. */
export type DraftOutlineSection = {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly DraftOutlineLesson[];
};

export type DraftOutlineLesson = {
  readonly id: string;
  readonly title: string;
};

/** Lesson body keyed to its slot in the outline. Approval flips to
 *  true when the creator clicks "approve" on the LessonCard. */
export type DraftLessonBody = {
  readonly section_id: string;
  readonly lesson_id: string;
  readonly body_markdown: string;
  readonly approved: boolean;
};

/** Image target is `'thumbnail'` for the course card, or a
 *  `lesson_id` for per-lesson imagery. */
export type DraftImageTarget = 'thumbnail' | { readonly lesson_id: string };

export type DraftImage = {
  readonly id: string;
  readonly target: DraftImageTarget;
  readonly url: string;
  readonly prompt: string;
  readonly approved: boolean;
};

/** Full row from `course_drafts`. Fields map 1:1 to the migration. */
export type CourseDraft = {
  readonly id: string;
  readonly creator_id: string;
  readonly realm_id: string;
  readonly title: string | null;
  readonly user_prompt: string;
  readonly stage: DraftStage;
  readonly outline: readonly DraftOutlineSection[];
  readonly sources: readonly DraftSource[];
  readonly lessons: readonly DraftLessonBody[];
  readonly images: readonly DraftImage[];
  readonly tokens_used: number;
  readonly sealed_course_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

/** Shape written on insert — everything that isn't auto-filled by
 *  the DB. Matches the RLS insert policy's `with check` clause. */
export type CourseDraftInsert = {
  readonly creator_id: string;
  readonly realm_id: string;
  readonly user_prompt?: string;
};

// --- Stage-transition guards ---

const STAGE_ORDER: readonly DraftStage[] = [
  'satchel',
  'outline',
  'lessons',
  'images',
  'ready',
  'sealed',
];

/** Allowed forward transitions. A creator can revise an earlier
 *  stage by going back to it (e.g. back from `lessons` to `outline`
 *  when they ask for a different section list). */
export function canAdvance(from: DraftStage, to: DraftStage): boolean {
  const fromIdx = STAGE_ORDER.indexOf(from);
  const toIdx = STAGE_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  // Allow moving forward one step, or going back to any earlier stage.
  return toIdx === fromIdx + 1 || toIdx < fromIdx;
}

/** Aggregate size of parsed source texts. Budget check (ADR 0012:
 *  600k chars) happens in the server action before a stream starts. */
export function totalSourceChars(sources: readonly DraftSource[]): number {
  return sources.reduce((acc, s) => acc + s.char_count, 0);
}

/** True if every lesson in the outline has an approved body. Used
 *  to gate the `lessons → images` transition. */
export function allLessonsApproved(
  outline: readonly DraftOutlineSection[],
  lessons: readonly DraftLessonBody[],
): boolean {
  const approved = new Set(
    lessons.filter((l) => l.approved).map((l) => `${l.section_id}:${l.lesson_id}`),
  );
  for (const section of outline) {
    for (const lesson of section.lessons) {
      if (!approved.has(`${section.id}:${lesson.id}`)) return false;
    }
  }
  return true;
}

/** True if thumbnail + every lesson image is approved. Gates the
 *  `images → ready` transition. */
export function allImagesApproved(
  outline: readonly DraftOutlineSection[],
  images: readonly DraftImage[],
): boolean {
  const thumbnailOk = images.some((i) => i.target === 'thumbnail' && i.approved);
  if (!thumbnailOk) return false;
  const approvedLessonIds = new Set(
    images
      .filter(
        (i): i is DraftImage & { target: { lesson_id: string } } =>
          typeof i.target === 'object' && i.approved,
      )
      .map((i) => i.target.lesson_id),
  );
  for (const section of outline) {
    for (const lesson of section.lessons) {
      if (!approvedLessonIds.has(lesson.id)) return false;
    }
  }
  return true;
}
