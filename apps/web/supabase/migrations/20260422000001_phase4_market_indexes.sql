-- Arcadia MVP — Phase 4 Week 11
-- Index for the Market query:
--   select * from courses
--   where published = true and realm_id in (select user_realm_ids())
--   order by created_at desc
--
-- Covers the realm + published filter + the order-by in a single index
-- scan. courses_published_idx from Phase 0 already indexes (realm_id,
-- published); this one adds created_at DESC as a third key column so the
-- order-by doesn't trigger a sort step on a realm with many courses.
--
-- Read-only, zero blast radius. Safe to apply alongside the first /market
-- deploy.

create index if not exists courses_market_idx
  on public.courses (realm_id, published, created_at desc)
  where published = true;

-- Analytics query hygiene: ensure the "all lessons completed by member"
-- lookup is cheap. lesson_progress already has
-- lesson_progress_lesson_id_member_id_key (UNIQUE on (lesson_id, member_id));
-- that covers the join. Add a predicate index on completed = true so the
-- completion-rate count path doesn't scan false rows.
create index if not exists lesson_progress_completed_idx
  on public.lesson_progress (member_id, lesson_id)
  where completed = true;
