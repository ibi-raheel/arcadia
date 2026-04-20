-- Arcadia MVP — Phase 3 Week 9
-- Extends courses / sections / lessons / lesson_progress for the Academy
-- build. Three concerns:
--
--   1. Ownership: add courses.creator_id so the /dashboard flow can scope
--      draft listings to their creator and write policies can authorise
--      creator-only INSERT / UPDATE / DELETE on course content.
--   2. YouTube columns: lessons.youtube_video_id + duration_sec. Demo-only
--      per ADR 0006 — swap to a real host before any paying creator uploads.
--      Phase 0's cf_stream_id column stays in place (nullable, unused) and
--      is reserved for the real-host swap.
--   3. RLS tightening: creator writes, creator reads own drafts, sections
--      read policy follows courses, lessons read adds creator bypass.
--      Existing SELECT policies for enrolled / preview / realm-scoped
--      access are preserved.
--
-- Idempotent where practical. Run on arcadia-test first; only after the
-- RLS integration tests (apps/web/tests/rls-cross-member-leakage.test.ts
-- extensions added in Step 9 of the plan) pass should this land on
-- arcadia (prod).

-- 1. Ownership column on courses -------------------------------------------

-- Nullable for now: arcadia-test has 106 pre-existing rows from load /
-- seed runs without a creator. They'll remain invisible to any
-- creator-scoped policy (creator_id IS NULL AND auth.uid() IS NOT NULL
-- never matches), effectively dormant. Clean up manually or in a Phase 4
-- follow-up when prod usage is the only real data.
alter table public.courses
  add column if not exists creator_id uuid references auth.users(id) on delete set null;

create index if not exists courses_creator_idx
  on public.courses(creator_id)
  where creator_id is not null;

-- 2. YouTube columns on lessons --------------------------------------------

-- youtube_video_id is the 11-character YouTube ID parsed from a URL the
-- creator pastes in the editor (e.g. "dQw4w9WgXcQ"). The length check is
-- a belt-and-braces guard — real YouTube IDs are always 11 chars today.
alter table public.lessons
  add column if not exists youtube_video_id text
    check (youtube_video_id is null or length(youtube_video_id) = 11);

alter table public.lessons
  add column if not exists duration_sec integer
    check (duration_sec is null or duration_sec >= 0);

-- 3. Creator-scoped write policies on courses ------------------------------

drop policy if exists course_creator_insert on public.courses;
create policy course_creator_insert
  on public.courses
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and realm_id in (select user_realm_ids())
  );

drop policy if exists course_creator_update on public.courses;
create policy course_creator_update
  on public.courses
  for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists course_creator_delete on public.courses;
create policy course_creator_delete
  on public.courses
  for delete
  to authenticated
  using (creator_id = auth.uid());

-- Replace the Phase-0 course_member_read with a policy that:
--   - shows published courses in the member's realm (existing behaviour)
--   - also shows draft courses the caller owns (new behaviour)
drop policy if exists course_member_read on public.courses;
create policy course_member_read
  on public.courses
  for select
  to authenticated
  using (
    (published = true and realm_id in (select user_realm_ids()))
    or creator_id = auth.uid()
  );

-- 4. Section policies — inherit from courses -------------------------------

-- Phase 0's section_member_read was effectively "any course.id" — wide
-- open. Tighten to the course's own read policy so sections follow
-- whatever rule the parent course uses.
drop policy if exists section_member_read on public.sections;
create policy section_member_read
  on public.sections
  for select
  to authenticated
  using (
    course_id in (
      select id from public.courses
      where (published = true and realm_id in (select user_realm_ids()))
         or creator_id = auth.uid()
    )
  );

drop policy if exists section_creator_insert on public.sections;
create policy section_creator_insert
  on public.sections
  for insert
  to authenticated
  with check (
    course_id in (select id from public.courses where creator_id = auth.uid())
  );

drop policy if exists section_creator_update on public.sections;
create policy section_creator_update
  on public.sections
  for update
  to authenticated
  using (
    course_id in (select id from public.courses where creator_id = auth.uid())
  )
  with check (
    course_id in (select id from public.courses where creator_id = auth.uid())
  );

drop policy if exists section_creator_delete on public.sections;
create policy section_creator_delete
  on public.sections
  for delete
  to authenticated
  using (
    course_id in (select id from public.courses where creator_id = auth.uid())
  );

-- 5. Lesson policies — add creator bypass + writes -------------------------

-- Keep the preview + enrolment path from Phase 0; add creator-owns-course
-- as a third satisfying clause so a creator can read their own drafts
-- without an enrolment row.
drop policy if exists lesson_access on public.lessons;
create policy lesson_access
  on public.lessons
  for select
  to authenticated
  using (
    is_preview = true
    or course_id in (
      select course_id from public.enrolments where member_id = auth.uid()
    )
    or course_id in (
      select id from public.courses where creator_id = auth.uid()
    )
  );

drop policy if exists lesson_creator_insert on public.lessons;
create policy lesson_creator_insert
  on public.lessons
  for insert
  to authenticated
  with check (
    course_id in (select id from public.courses where creator_id = auth.uid())
  );

drop policy if exists lesson_creator_update on public.lessons;
create policy lesson_creator_update
  on public.lessons
  for update
  to authenticated
  using (
    course_id in (select id from public.courses where creator_id = auth.uid())
  )
  with check (
    course_id in (select id from public.courses where creator_id = auth.uid())
  );

drop policy if exists lesson_creator_delete on public.lessons;
create policy lesson_creator_delete
  on public.lessons
  for delete
  to authenticated
  using (
    course_id in (select id from public.courses where creator_id = auth.uid())
  );

-- 6. Enrolment writes — creators can grant enrolments on their own courses -

-- Phase 0 has enrolment_self_read; writes went through service role. For
-- Phase 3's /dashboard flow to grant the creator access to their own
-- course (and to pave the way for Phase 4's Market enrol button), allow
-- authenticated INSERTs where the course belongs to the caller.
drop policy if exists enrolment_creator_insert on public.enrolments;
create policy enrolment_creator_insert
  on public.enrolments
  for insert
  to authenticated
  with check (
    course_id in (select id from public.courses where creator_id = auth.uid())
    and realm_id in (select user_realm_ids())
  );

-- Self-enrolment (member grants themselves access to one of their own
-- realm's published courses) — enables the Phase 4 Market enrol button.
-- Safe because published-only + realm-scoped.
drop policy if exists enrolment_self_insert on public.enrolments;
create policy enrolment_self_insert
  on public.enrolments
  for insert
  to authenticated
  with check (
    member_id = auth.uid()
    and realm_id in (select user_realm_ids())
    and course_id in (
      select id from public.courses
      where published = true and realm_id in (select user_realm_ids())
    )
  );

-- 7. Documentation comments ------------------------------------------------

comment on column public.courses.creator_id is
  'Owner of the course. NULL = orphan from pre-Phase-3 seed rows. RLS requires = auth.uid() for all writes.';
comment on column public.lessons.youtube_video_id is
  '11-character YouTube video ID for unlisted demo videos (ADR 0006). NULL on written-type lessons. Must be swapped for a real video host before any paying creator uploads — see ADR 0006 exit criteria.';
comment on column public.lessons.duration_sec is
  'Video duration in whole seconds. Captured via YouTube IFrame API getDuration() on first successful player load. NULL on written lessons or before first load.';
