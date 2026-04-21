// Pure validators for the course-editor server actions. Extracted so
// Vitest can import without the `@/` alias.

export const SECTION_TITLE_MAX = 120;
export const LESSON_TITLE_MAX = 120;
export const LESSON_CONTENT_MAX = 50_000; // ~10k words of Markdown; plenty for a lesson.

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

export function validateLessonContent(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  // Content may legitimately be empty (new lesson). Only policy the upper
  // bound; surrounding whitespace is preserved since Markdown cares.
  if (raw.length > LESSON_CONTENT_MAX) {
    return {
      ok: false,
      error: `Lesson content must be ${LESSON_CONTENT_MAX} characters or fewer.`,
    };
  }
  return { ok: true, value: raw };
}

export const YOUTUBE_ID_LENGTH = 11;

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERNS: readonly RegExp[] = [
  /[?&]v=([A-Za-z0-9_-]{11})/, // youtube.com/watch?v=ID
  /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/, // embed URL
  /youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

/**
 * Pull an 11-char YouTube video id out of a URL or bare-id string.
 * Returns null on anything we can't confidently parse.
 */
export function parseYouTubeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed;
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m && m[1]) return m[1];
  }
  return null;
}

export function validateLessonType(
  raw: string,
): { ok: true; value: 'written' | 'video' } | { ok: false; error: string } {
  if (raw === 'written' || raw === 'video') return { ok: true, value: raw };
  return { ok: false, error: `Invalid lesson type: ${raw}` };
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
