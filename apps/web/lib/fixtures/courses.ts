// Fixture for the `/dashboard/courses` (kiln) tab. Holds the data the
// V4.5 kit's Courses.jsx surfaced: KPI row, per-course cards (both
// published + in-the-kiln drafts), per-lesson performance on a selected
// course, recent reviews. Real Supabase reads cover titles + published
// flag + updated_at; everything else (revenue / finish rate / dropoff
// / reviews) is fixture-only until analytics lands.

export type CourseStatus = 'published' | 'draft' | 'review';

/** One course row. `status === 'published'` entries show completion
 *  finish rate; `draft` / `review` entries show authoring progress. */
export type CourseSummary = {
  readonly id: string;
  readonly title: string;
  readonly kicker?: string; // "the forge basics · scroll II" etc.
  readonly status: CourseStatus;
  readonly price: number; // $
  readonly lessons: number;
  readonly sales: number;
  readonly revenue: number;
  /** Only meaningful for `published`: percent of enrolled members who
   *  completed (0–100). */
  readonly finishRate?: number;
  /** Only meaningful for `draft` / `review`: percent authored (0–100). */
  readonly progress?: number;
  readonly updated: string; // "4d ago"
  readonly note?: string; // short hand-marginalia aside
};

export type CoursesKpis = {
  readonly totalCourses: number;
  readonly published: number;
  readonly revenue30d: number;
  readonly mrr: number;
  readonly avgFinish: number; // percent
};

/** Per-lesson watched / dropoff / avg-time row for the selected course.
 *  Kit shows a 7-row table with a stacked bar visualizing watched /
 *  rewatched / dropped. */
export type CourseLessonStat = {
  readonly title: string;
  readonly watchedPct: number; // percent who reached the end
  readonly dropoffPct: number; // percent who dropped mid-lesson
  readonly avgTimeSec: number;
};

export type CoursePerformance = {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly lessons: readonly CourseLessonStat[];
};

export type CourseReview = {
  readonly id: string;
  readonly reviewer: string;
  readonly seal: string; // avatar letter
  readonly courseTitle: string;
  readonly stars: number; // 1–5
  readonly body: string;
  readonly when: string; // "2 days ago"
};

export type CoursesData = {
  readonly kpis: CoursesKpis;
  readonly courses: readonly CourseSummary[];
  readonly lessonPerf: readonly CoursePerformance[];
  readonly reviews: readonly CourseReview[];
};

export const COURSES_FIXTURE: CoursesData = {
  kpis: {
    totalCourses: 6,
    published: 3,
    revenue30d: 4_280,
    mrr: 980,
    avgFinish: 62,
  },
  courses: [
    {
      id: 'c1',
      title: 'Forge Basics',
      kicker: 'scroll i · the beginner tome',
      status: 'published',
      price: 79,
      lessons: 12,
      sales: 58,
      revenue: 4582,
      finishRate: 74,
      updated: '4d ago',
    },
    {
      id: 'c2',
      title: 'A Keeper’s Craft',
      kicker: 'scroll ii · for the long game',
      status: 'published',
      price: 149,
      lessons: 18,
      sales: 24,
      revenue: 3576,
      finishRate: 52,
      updated: '9d ago',
    },
    {
      id: 'c3',
      title: 'The Lantern’s Trim',
      kicker: 'scroll iii · a short companion',
      status: 'published',
      price: 39,
      lessons: 6,
      sales: 112,
      revenue: 4368,
      finishRate: 81,
      updated: '2d ago',
    },
    {
      id: 'c4',
      title: 'Inkwells of the North',
      kicker: 'scroll iv · in the kiln',
      status: 'draft',
      price: 99,
      lessons: 9,
      sales: 0,
      revenue: 0,
      progress: 62,
      updated: '1d ago',
      note: 'three lessons still dry',
    },
    {
      id: 'c5',
      title: 'Sealing Wax, by Lantern',
      kicker: 'scroll v · in the kiln',
      status: 'draft',
      price: 0,
      lessons: 4,
      sales: 0,
      revenue: 0,
      progress: 35,
      updated: '4d ago',
      note: 'outline only',
    },
    {
      id: 'c6',
      title: 'The Binder’s Oath',
      kicker: 'scroll vi · awaiting review',
      status: 'review',
      price: 129,
      lessons: 14,
      sales: 0,
      revenue: 0,
      progress: 96,
      updated: 'yesterday',
      note: 'a reader fetched for notes',
    },
  ],
  lessonPerf: [
    {
      courseId: 'c1',
      courseTitle: 'Forge Basics',
      lessons: [
        { title: 'Before the hammer · a welcome', watchedPct: 96, dropoffPct: 3, avgTimeSec: 220 },
        { title: 'Anvil & tongs', watchedPct: 88, dropoffPct: 9, avgTimeSec: 310 },
        { title: 'Heat colour, by eye', watchedPct: 82, dropoffPct: 14, avgTimeSec: 480 },
        { title: 'Your first bend', watchedPct: 74, dropoffPct: 22, avgTimeSec: 620 },
        { title: 'Folding the steel', watchedPct: 62, dropoffPct: 32, avgTimeSec: 720 },
        { title: 'Quenching without cracking', watchedPct: 55, dropoffPct: 38, avgTimeSec: 590 },
        { title: 'A finished piece · close', watchedPct: 50, dropoffPct: 42, avgTimeSec: 310 },
      ],
    },
  ],
  reviews: [
    {
      id: 'r1',
      reviewer: 'Theo Marrow',
      seal: 'T',
      courseTitle: 'Forge Basics',
      stars: 5,
      body: 'Finished the whole scroll in two evenings. The hammer lesson alone was worth the coin — clearest thing I’ve watched on the subject.',
      when: '2 days ago',
    },
    {
      id: 'r2',
      reviewer: 'Mira Blackthorn',
      seal: 'M',
      courseTitle: 'The Lantern’s Trim',
      stars: 5,
      body: 'Short, honest, no filler. I liked the quiet pace.',
      when: '5 days ago',
    },
    {
      id: 'r3',
      reviewer: 'Wren Ashford',
      seal: 'W',
      courseTitle: 'A Keeper’s Craft',
      stars: 4,
      body: 'Lesson 4 dragged a bit — could lose the second example. Otherwise: steady, and I kept coming back.',
      when: '1 week ago',
    },
    {
      id: 'r4',
      reviewer: 'Hazel Cairn',
      seal: 'H',
      courseTitle: 'Forge Basics',
      stars: 5,
      body: 'The part about heat colour unlocked something for me — thank you.',
      when: '2 weeks ago',
    },
  ],
};
