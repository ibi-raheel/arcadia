// Pure validators for the course-editor server actions. Extracted so
// Vitest can import without the `@/` alias.

export const SECTION_TITLE_MAX = 120;
export const LESSON_TITLE_MAX = 120;

export function validateSectionTitle(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const title = raw.trim();
  if (title.length === 0) return { ok: false, error: 'Section title is required.' };
  if (title.length > SECTION_TITLE_MAX) {
    return { ok: false, error: `Section title must be ${SECTION_TITLE_MAX} characters or fewer.` };
  }
  return { ok: true, value: title };
}

export function validateLessonTitle(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const title = raw.trim();
  if (title.length === 0) return { ok: false, error: 'Lesson title is required.' };
  if (title.length > LESSON_TITLE_MAX) {
    return { ok: false, error: `Lesson title must be ${LESSON_TITLE_MAX} characters or fewer.` };
  }
  return { ok: true, value: title };
}

export function validateReorderIds(
  raw: readonly unknown[],
): { ok: true; value: readonly string[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'Reorder payload must be a non-empty array of IDs.' };
  }
  const ids: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string' || v.length === 0) {
      return { ok: false, error: 'Each id must be a non-empty string.' };
    }
    ids.push(v);
  }
  // Duplicate IDs would cause the CASE-based UPDATE to collapse rows silently.
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return { ok: false, error: 'Duplicate id in reorder payload.' };
    seen.add(id);
  }
  return { ok: true, value: ids };
}
