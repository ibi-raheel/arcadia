import { describe, expect, it } from 'vitest';

import {
  LESSON_TITLE_MAX,
  SECTION_TITLE_MAX,
  validateLessonTitle,
  validateReorderIds,
  validateSectionTitle,
} from '../validation';

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
