import { describe, expect, it } from 'vitest';

import {
  COURSE_DESCRIPTION_MAX,
  COURSE_TITLE_MAX,
  validateCreateCourseInput,
} from '../validation';

describe('validateCreateCourseInput', () => {
  it('accepts a valid payload and trims whitespace', () => {
    const result = validateCreateCourseInput({
      title: '  Intro to Arcadia  ',
      description: '  Learn the basics.  ',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Intro to Arcadia');
      expect(result.value.description).toBe('Learn the basics.');
    }
  });

  it('accepts empty description', () => {
    const result = validateCreateCourseInput({ title: 'ok', description: '' });
    expect(result.ok).toBe(true);
  });

  it('rejects empty title', () => {
    const result = validateCreateCourseInput({ title: '   ', description: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/title/i);
  });

  it('rejects title over the limit', () => {
    const result = validateCreateCourseInput({
      title: 'a'.repeat(COURSE_TITLE_MAX + 1),
      description: '',
    });
    expect(result.ok).toBe(false);
  });

  it('accepts title exactly at the limit', () => {
    const result = validateCreateCourseInput({
      title: 'a'.repeat(COURSE_TITLE_MAX),
      description: '',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects description over the limit', () => {
    const result = validateCreateCourseInput({
      title: 'ok',
      description: 'a'.repeat(COURSE_DESCRIPTION_MAX + 1),
    });
    expect(result.ok).toBe(false);
  });
});
