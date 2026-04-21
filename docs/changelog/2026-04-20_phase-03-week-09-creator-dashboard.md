# 2026-04-20 — Phase 3 Week 9: Creator dashboard

Creator-side course authoring is live end-to-end. Members with `memberships.role in ('creator','admin')` can build, edit, and publish courses; regular members see a role-gate 403 page on `/dashboard`.

## What shipped

- **Role-aware home** (`/`) — two-card hub for authed users. Everyone sees **Enter the World**; creators additionally see **Open the Dashboard**. Sign-out via a dedicated route.
- **`/dashboard`** — creator's course list, scoped to `creator_id = auth.uid()`. "Create course" dialog: title + optional description, inserts the row with `creator_id` + `realm_id` from the caller's membership, redirects to the editor.
- **`/dashboard/courses/[id]`** — two-pane editor. Left rail: sections + lessons with drag handles (`@dnd-kit/sortable`), inline rename for sections, click-to-select for lessons (URL carries `?lesson=<id>`). Right pane: Markdown editor for written lessons (`@uiw/react-md-editor`, 2 s debounced autosave, save indicator), or YouTube URL editor for video lessons (per ADR 0006 the MVP video host is YouTube unlisted — CF Stream deferred). Type toggle works both ways with a confirm-prompt.
- **Publish / Unpublish** toggle in the editor header — unpublishing prompts a confirm so members aren't dropped silently.

## Schema

Three additive migrations applied to `arcadia-test` and `arcadia` (prod), in order:

1. `20260421000001_phase3_courses_lessons_progress.sql` — adds `courses.creator_id`, `lessons.youtube_video_id` (11-char check), `lessons.duration_sec`; rewrites RLS for creator-scoped writes on courses/sections/lessons; adds two enrolment insert policies (creator grants + self-enrol for published in-realm).
2. `20260421000002_phase3_storage_course_thumbnails.sql` — `course-thumbnails` bucket (public-read, 2 MB cap, jpeg/png/webp allowlist) + owner-scoped write policies.
3. `20260421000003_phase3_membership_roles.sql` — `memberships.role` + `user_has_creator_role()` helper + course INSERT policy wraps the helper.

The original ADR 0006 drafted Cloudinary as the free-tier video host; the same-day amended version picked YouTube unlisted to avoid any new account setup. `lessons.cf_stream_id` column stays reserved for the post-MVP swap.

## Code-level additions

- `apps/web/app/dashboard/**` — 10 TSX / TS files (`page.tsx`, `actions.ts`, `validation.ts`, `_components/{CreateCourseDialog,SectionTree,LessonList,WrittenLessonEditor,VideoLessonEditor,PublishToggle}.tsx`).
- `apps/web/app/api/auth/signout/route.ts` — POST handler behind the hub's sign-out form.
- `apps/web/tests/rls-cross-member-leakage.test.ts` — three new Phase-3 RLS cases (non-enrolled lesson read blocked, creator reads own unpublished course, creator reads own non-preview lessons). Skipped locally; run in CI when `TEST_SUPABASE_*` env is set.
- New deps in `@arcadia/web`: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@uiw/react-md-editor`.

## Tests + perf

- 131 unit tests passing (25 new pure-validator cases across `app/dashboard/**/__tests__/`). 21 skipped (RLS suite, env-gated).
- `/dashboard` route: 1.63 kB / 97.7 kB first-load, dynamic.
- `/dashboard/courses/[id]` route: 21.1 kB / 118 kB first-load. MDEditor is dynamic-imported post-selection so it stays out of the initial payload.

## Known follow-ups for Week 10

`/academy` + `/academy/[courseId]` viewer, YouTube IFrame Player progress tracking, `lesson_progress` upserts, course progress bar, enrolment seed script, end-to-end smoke.

## Commits of record

`23fa2cb` · `62a5f9d` · `07f326f` · `c0e3f15` · `860560f` · `9483ddd` · `3d0823d` · `b71d256` · `48bac89` — see `phases/phase-03_status.md` for the per-step map.
