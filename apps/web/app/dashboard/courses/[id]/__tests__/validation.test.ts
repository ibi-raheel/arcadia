import { describe, expect, it } from 'vitest';

import {
  COURSE_DESCRIPTION_MAX,
  COURSE_TITLE_MAX,
  LESSON_CONTENT_MAX,
  LESSON_TITLE_MAX,
  SECTION_TITLE_MAX,
  parseYouTubeId,
  validateCourseDescription,
  validateCourseTitle,
  validateLessonContent,
  validateLessonTitle,
  validateLessonType,
  validateReorderIds,
  validateSectionTitle,
} from '../validation';

describe('validateCourseTitle', () => {
  it('trims whitespace and accepts', () => {
    const r = validateCourseTitle('  An Introduction to Inkwork  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('An Introduction to Inkwork');
  });

  it('rejects empty / whitespace-only', () => {
    expect(validateCourseTitle('').ok).toBe(false);
    expect(validateCourseTitle('   ').ok).toBe(false);
  });

  it('accepts exactly at the limit', () => {
    expect(validateCourseTitle('a'.repeat(COURSE_TITLE_MAX)).ok).toBe(true);
  });

  it('rejects over the limit', () => {
    expect(validateCourseTitle('a'.repeat(COURSE_TITLE_MAX + 1)).ok).toBe(false);
  });
});

describe('validateCourseDescription', () => {
  it('trims and accepts non-empty', () => {
    const r = validateCourseDescription('  five lessons by lamplight  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('five lessons by lamplight');
  });

  it('treats empty / whitespace-only as null (description is optional)', () => {
    const empty = validateCourseDescription('');
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.value).toBe(null);
    const ws = validateCourseDescription('   \n\t');
    expect(ws.ok).toBe(true);
    if (ws.ok) expect(ws.value).toBe(null);
  });

  it('accepts exactly at the limit', () => {
    expect(validateCourseDescription('a'.repeat(COURSE_DESCRIPTION_MAX)).ok).toBe(true);
  });

  it('rejects over the limit', () => {
    expect(validateCourseDescription('a'.repeat(COURSE_DESCRIPTION_MAX + 1)).ok).toBe(false);
  });
});

describe('validateSectionTitle', () => {
  it('trims whitespace and accepts', () => {
    const r = validateSectionTitle('  Intro  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('Intro');
  });

  it('rejects empty / whitespace-only', () => {
    expect(validateSectionTitle('').ok).toBe(false);
    expect(validateSectionTitle('   ').ok).toBe(false);
  });

  it('accepts exactly at the limit', () => {
    const r = validateSectionTitle('a'.repeat(SECTION_TITLE_MAX));
    expect(r.ok).toBe(true);
  });

  it('rejects over the limit', () => {
    const r = validateSectionTitle('a'.repeat(SECTION_TITLE_MAX + 1));
    expect(r.ok).toBe(false);
  });
});

describe('validateLessonTitle', () => {
  it('trims and accepts', () => {
    const r = validateLessonTitle('  Lesson 1  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('Lesson 1');
  });

  it('rejects empty', () => {
    expect(validateLessonTitle('').ok).toBe(false);
    expect(validateLessonTitle('   ').ok).toBe(false);
  });

  it('accepts exactly at the limit', () => {
    expect(validateLessonTitle('a'.repeat(LESSON_TITLE_MAX)).ok).toBe(true);
  });

  it('rejects over the limit', () => {
    expect(validateLessonTitle('a'.repeat(LESSON_TITLE_MAX + 1)).ok).toBe(false);
  });
});

describe('validateLessonContent', () => {
  it('accepts empty content (fresh lesson)', () => {
    const r = validateLessonContent('');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('');
  });

  it('preserves whitespace (Markdown cares)', () => {
    const r = validateLessonContent('  # title\n\n  paragraph  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('  # title\n\n  paragraph  ');
  });

  it('rejects content over the limit', () => {
    const r = validateLessonContent('a'.repeat(LESSON_CONTENT_MAX + 1));
    expect(r.ok).toBe(false);
  });

  it('accepts exactly at the limit', () => {
    const r = validateLessonContent('a'.repeat(LESSON_CONTENT_MAX));
    expect(r.ok).toBe(true);
  });
});

describe('parseYouTubeId', () => {
  const VALID = 'dQw4w9WgXcQ';

  it('accepts a bare 11-char id', () => {
    expect(parseYouTubeId(VALID)).toBe(VALID);
  });

  it('parses youtube.com/watch?v=', () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${VALID}`)).toBe(VALID);
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${VALID}&feature=share`)).toBe(VALID);
  });

  it('parses youtu.be short link', () => {
    expect(parseYouTubeId(`https://youtu.be/${VALID}`)).toBe(VALID);
    expect(parseYouTubeId(`https://youtu.be/${VALID}?t=42`)).toBe(VALID);
  });

  it('parses embed and nocookie variants', () => {
    expect(parseYouTubeId(`https://www.youtube.com/embed/${VALID}`)).toBe(VALID);
    expect(parseYouTubeId(`https://www.youtube-nocookie.com/embed/${VALID}`)).toBe(VALID);
  });

  it('parses shorts links', () => {
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${VALID}`)).toBe(VALID);
  });

  it('trims whitespace', () => {
    expect(parseYouTubeId(`   ${VALID}   `)).toBe(VALID);
  });

  it('rejects nonsense', () => {
    expect(parseYouTubeId('')).toBeNull();
    expect(parseYouTubeId('   ')).toBeNull();
    // Contains '!' which isn't in the allowed charset — rejected even at 11 chars.
    expect(parseYouTubeId('abc!def@ghi')).toBeNull();
    expect(parseYouTubeId('https://example.com/watch?v=short')).toBeNull();
  });

  it('rejects ids of wrong length', () => {
    expect(parseYouTubeId('a'.repeat(10))).toBeNull();
    expect(parseYouTubeId('a'.repeat(12))).toBeNull();
  });
});

describe('validateLessonType', () => {
  it('accepts written / video', () => {
    expect(validateLessonType('written').ok).toBe(true);
    expect(validateLessonType('video').ok).toBe(true);
  });

  it('rejects anything else', () => {
    expect(validateLessonType('audio').ok).toBe(false);
    expect(validateLessonType('').ok).toBe(false);
    expect(validateLessonType('VIDEO').ok).toBe(false);
  });
});

describe('validateReorderIds', () => {
  it('accepts a distinct non-empty list', () => {
    const r = validateReorderIds(['a', 'b', 'c']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(['a', 'b', 'c']);
  });

  it('rejects an empty array', () => {
    expect(validateReorderIds([]).ok).toBe(false);
  });

  it('rejects non-string entries', () => {
    expect(validateReorderIds(['a', 1 as unknown as string]).ok).toBe(false);
    expect(validateReorderIds([null as unknown as string]).ok).toBe(false);
  });

  it('rejects empty-string entries', () => {
    expect(validateReorderIds(['a', '']).ok).toBe(false);
  });

  it('rejects duplicates', () => {
    expect(validateReorderIds(['a', 'b', 'a']).ok).toBe(false);
  });
});
