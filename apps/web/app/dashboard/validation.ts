// Pure validators for the /dashboard server actions. Kept in a separate
// module so Vitest can import them without dragging in the `@/`-aliased
// Supabase server client (which the test runner can't resolve).

export type CreateCourseInput = {
  readonly title: string;
  readonly description: string;
};

export const COURSE_TITLE_MAX = 120;
export const COURSE_DESCRIPTION_MAX = 500;

export function validateCreateCourseInput(
  raw: CreateCourseInput,
): { ok: true; value: CreateCourseInput } | { ok: false; error: string } {
  const title = raw.title.trim();
  const description = raw.description.trim();

  if (title.length === 0) return { ok: false, error: 'Title is required.' };
  if (title.length > COURSE_TITLE_MAX) {
    return { ok: false, error: `Title must be ${COURSE_TITLE_MAX} characters or fewer.` };
  }
  if (description.length > COURSE_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Description must be ${COURSE_DESCRIPTION_MAX} characters or fewer.`,
    };
  }
  return { ok: true, value: { title, description } };
}
