import { describe, expect, it } from 'vitest';

import {
  computeCompletionRate,
  countActiveInWindow,
  SEVEN_DAYS_MS,
  type AggregateProgressRow,
} from '../aggregate';

describe('computeCompletionRate', () => {
  it('returns 0 with no enrolments', () => {
    expect(
      computeCompletionRate({
        enrolledMemberIds: [],
        lessonIds: ['l1'],
        progress: [],
      }),
    ).toBe(0);
  });

  it('returns 0 with no lessons', () => {
    expect(
      computeCompletionRate({
        enrolledMemberIds: ['m1'],
        lessonIds: [],
        progress: [],
      }),
    ).toBe(0);
  });

  it('returns 0 when no member has completed any lesson', () => {
    expect(
      computeCompletionRate({
        enrolledMemberIds: ['m1', 'm2'],
        lessonIds: ['l1', 'l2'],
        progress: [
          { lesson_id: 'l1', member_id: 'm1', completed: false, updated_at: '2026-01-01' },
        ],
      }),
    ).toBe(0);
  });

  it('returns 1 when every member completed every lesson', () => {
    const progress: AggregateProgressRow[] = [
      { lesson_id: 'l1', member_id: 'm1', completed: true, updated_at: '2026-01-01' },
      { lesson_id: 'l2', member_id: 'm1', completed: true, updated_at: '2026-01-01' },
      { lesson_id: 'l1', member_id: 'm2', completed: true, updated_at: '2026-01-01' },
      { lesson_id: 'l2', member_id: 'm2', completed: true, updated_at: '2026-01-01' },
    ];
    expect(
      computeCompletionRate({
        enrolledMemberIds: ['m1', 'm2'],
        lessonIds: ['l1', 'l2'],
        progress,
      }),
    ).toBe(1);
  });

  it('returns partial rate when only some members completed every lesson', () => {
    const progress: AggregateProgressRow[] = [
      { lesson_id: 'l1', member_id: 'm1', completed: true, updated_at: '2026-01-01' },
      { lesson_id: 'l2', member_id: 'm1', completed: true, updated_at: '2026-01-01' },
      { lesson_id: 'l1', member_id: 'm2', completed: true, updated_at: '2026-01-01' },
      // m2 hasn't finished l2
    ];
    expect(
      computeCompletionRate({
        enrolledMemberIds: ['m1', 'm2'],
        lessonIds: ['l1', 'l2'],
        progress,
      }),
    ).toBe(0.5);
  });

  it('ignores progress rows for members who are not enrolled', () => {
    const progress: AggregateProgressRow[] = [
      { lesson_id: 'l1', member_id: 'm-ghost', completed: true, updated_at: '2026-01-01' },
    ];
    expect(
      computeCompletionRate({
        enrolledMemberIds: ['m1'],
        lessonIds: ['l1'],
        progress,
      }),
    ).toBe(0);
  });
});

describe('countActiveInWindow', () => {
  const now = new Date('2026-04-21T00:00:00Z');

  it('counts distinct members with progress inside the window', () => {
    const progress: AggregateProgressRow[] = [
      { lesson_id: 'l1', member_id: 'm1', completed: true, updated_at: '2026-04-20T00:00:00Z' },
      { lesson_id: 'l2', member_id: 'm1', completed: false, updated_at: '2026-04-19T00:00:00Z' },
      { lesson_id: 'l1', member_id: 'm2', completed: false, updated_at: '2026-04-14T00:00:01Z' },
    ];
    expect(countActiveInWindow({ progress, now, windowMs: SEVEN_DAYS_MS })).toBe(2);
  });

  it('excludes members whose activity is older than the window', () => {
    const progress: AggregateProgressRow[] = [
      { lesson_id: 'l1', member_id: 'm1', completed: true, updated_at: '2026-04-10T00:00:00Z' },
    ];
    expect(countActiveInWindow({ progress, now, windowMs: SEVEN_DAYS_MS })).toBe(0);
  });

  it('returns 0 on empty input', () => {
    expect(countActiveInWindow({ progress: [], now, windowMs: SEVEN_DAYS_MS })).toBe(0);
  });
});
