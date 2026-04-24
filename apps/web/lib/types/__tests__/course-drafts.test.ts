import { describe, expect, it } from 'vitest';

import {
  allImagesApproved,
  allLessonsApproved,
  canAdvance,
  totalSourceChars,
  type DraftImage,
  type DraftLessonBody,
  type DraftOutlineSection,
  type DraftSource,
} from '../course-drafts';

describe('canAdvance', () => {
  it('allows forward moves by any distance', () => {
    expect(canAdvance('satchel', 'outline')).toBe(true);
    expect(canAdvance('satchel', 'lessons')).toBe(true); // skip 'outline' intermediate
    expect(canAdvance('outline', 'images')).toBe(true);
    expect(canAdvance('lessons', 'ready')).toBe(true);
    expect(canAdvance('ready', 'sealed')).toBe(true);
  });

  it('allows going back to any earlier stage (for revise)', () => {
    expect(canAdvance('lessons', 'outline')).toBe(true);
    expect(canAdvance('ready', 'satchel')).toBe(true);
  });

  it('rejects staying in place — would trigger spurious DB writes', () => {
    expect(canAdvance('outline', 'outline')).toBe(false);
    expect(canAdvance('lessons', 'lessons')).toBe(false);
  });
});

describe('totalSourceChars', () => {
  it('sums char_count across sources', () => {
    const sources: readonly DraftSource[] = [
      { id: 'a', filename: 'a.pdf', char_count: 1000, text: 'x', storage_path: 'p/a.pdf' },
      { id: 'b', filename: 'b.txt', char_count: 500, text: 'y', storage_path: 'p/b.txt' },
    ];
    expect(totalSourceChars(sources)).toBe(1500);
  });

  it('returns 0 for empty', () => {
    expect(totalSourceChars([])).toBe(0);
  });
});

describe('allLessonsApproved', () => {
  const outline: readonly DraftOutlineSection[] = [
    {
      id: 's1',
      title: 'one',
      lessons: [
        { id: 'l1', title: 'a' },
        { id: 'l2', title: 'b' },
      ],
    },
    { id: 's2', title: 'two', lessons: [{ id: 'l3', title: 'c' }] },
  ];

  it('true when every outline lesson has an approved body', () => {
    const lessons: readonly DraftLessonBody[] = [
      { section_id: 's1', lesson_id: 'l1', body_markdown: '…', approved: true },
      { section_id: 's1', lesson_id: 'l2', body_markdown: '…', approved: true },
      { section_id: 's2', lesson_id: 'l3', body_markdown: '…', approved: true },
    ];
    expect(allLessonsApproved(outline, lessons)).toBe(true);
  });

  it('false when one lesson body is missing', () => {
    const lessons: readonly DraftLessonBody[] = [
      { section_id: 's1', lesson_id: 'l1', body_markdown: '…', approved: true },
      { section_id: 's1', lesson_id: 'l2', body_markdown: '…', approved: true },
    ];
    expect(allLessonsApproved(outline, lessons)).toBe(false);
  });

  it('false when one lesson body exists but is not approved', () => {
    const lessons: readonly DraftLessonBody[] = [
      { section_id: 's1', lesson_id: 'l1', body_markdown: '…', approved: true },
      { section_id: 's1', lesson_id: 'l2', body_markdown: '…', approved: false },
      { section_id: 's2', lesson_id: 'l3', body_markdown: '…', approved: true },
    ];
    expect(allLessonsApproved(outline, lessons)).toBe(false);
  });
});

describe('allImagesApproved', () => {
  const outline: readonly DraftOutlineSection[] = [
    {
      id: 's1',
      title: 'one',
      lessons: [
        { id: 'l1', title: 'a' },
        { id: 'l2', title: 'b' },
      ],
    },
  ];

  it('true with approved thumbnail + approved image per lesson', () => {
    const images: readonly DraftImage[] = [
      { id: 'i1', target: 'thumbnail', url: 'u', prompt: 'p', approved: true },
      { id: 'i2', target: { lesson_id: 'l1' }, url: 'u', prompt: 'p', approved: true },
      { id: 'i3', target: { lesson_id: 'l2' }, url: 'u', prompt: 'p', approved: true },
    ];
    expect(allImagesApproved(outline, images)).toBe(true);
  });

  it('false when thumbnail is missing', () => {
    const images: readonly DraftImage[] = [
      { id: 'i2', target: { lesson_id: 'l1' }, url: 'u', prompt: 'p', approved: true },
      { id: 'i3', target: { lesson_id: 'l2' }, url: 'u', prompt: 'p', approved: true },
    ];
    expect(allImagesApproved(outline, images)).toBe(false);
  });

  it('false when a lesson image is not approved', () => {
    const images: readonly DraftImage[] = [
      { id: 'i1', target: 'thumbnail', url: 'u', prompt: 'p', approved: true },
      { id: 'i2', target: { lesson_id: 'l1' }, url: 'u', prompt: 'p', approved: true },
      { id: 'i3', target: { lesson_id: 'l2' }, url: 'u', prompt: 'p', approved: false },
    ];
    expect(allImagesApproved(outline, images)).toBe(false);
  });
});
