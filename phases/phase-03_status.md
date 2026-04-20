# Phase 3 — Status

Source plan: `phase-03_plan.md`. Status entries chronological, newest on top.

## 2026-04-20 — Phase 3 kickoff

**Pre-plan decisions A–M approved**, with D + G + K + M amended to Cloudinary (free tier) — CF Stream deferred indefinitely. See ADR 0006.

**User actions still pending** before Step 2 of Week 9:

1. Create a free Cloudinary account (no card required): https://cloudinary.com/users/register_free
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` on Vercel (all three environments).
3. Confirm free-tier plan is active.

Step 1 was code-only and didn't need the credentials.

### Done — Step 1 (schema audit + ADR 0006 + migration draft)

**Schema audit against `arcadia-test`** via Supabase MCP (read-only). Findings vs the plan:

- **`courses` has no `creator_id` column.** Blocker for decisions A + J + Risk 6. Must add.
- **No INSERT / UPDATE / DELETE policies on `courses` / `sections` / `lessons`.** Clients can only read today; the `/dashboard` flow would 403 on RLS without new policies.
- **`sections.section_member_read` is permissive** (`course_id IN (SELECT id FROM courses)` — effectively "any course"). Tightened to follow the parent course's own policy.
- **`lessons.lesson_access`** had preview + enrolment clauses only. Added a third clause for creator-owns-course so drafts are visible to their owner without a fake enrolment row.
- **`sections` uses `sort_order`, not `order_index`.** Plan language adjusted mentally; migration matches the existing column name.
- **Existing indexes:** `lessons_section_idx (section_id, sort_order)` ✓, `lesson_progress_lesson_id_member_id_key` UNIQUE ✓, `enrolments_course_id_member_id_key` UNIQUE ✓, `courses_published_idx (realm_id, published)` ✓. Only new index needed: `courses_creator_idx WHERE creator_id IS NOT NULL`.
- **`arcadia-test` has 106 pre-existing rows** in courses/sections/lessons (seed + loadtest artifacts). They have no creator_id. Migration leaves them dormant: `creator_id NULL` will never match any creator-scoped policy, so they're effectively invisible. Safe to delete in a follow-up; not a Phase-3 blocker.

**ADR 0006 written** — `planning/decisions/0006_2026-04-20_video-host-cloudinary-for-mvp.md`. Records the Cloudinary-for-MVP decision, swap-back path (replace `cloudinary_public_id` with `cf_stream_id`, swap API routes and player, ~1 day), and amends TAD §4.4. TAD inline amendment is a Step-1 follow-up (not yet done — see "Not yet done" below).

**Migration drafted** — `apps/web/supabase/migrations/20260421000001_phase3_courses_lessons_progress.sql`. Covers:

- `courses.creator_id uuid references auth.users` (nullable, with partial index).
- `lessons.cloudinary_public_id text` + `lessons.duration_sec integer (check >= 0)`.
- Replaces `course_member_read` with "published-in-realm OR creator_id=me".
- Tightens `section_member_read` to follow the parent course's read policy.
- Adds creator-scoped INSERT / UPDATE / DELETE policies for `courses`, `sections`, `lessons`.
- Adds `enrolment_creator_insert` (creator grants enrolment on own course) + `enrolment_self_insert` (Phase-4 "enrol" button seed: published + same-realm).
- Keeps Phase-0 `lessons.cf_stream_id` column intact for the ADR 0006 swap-back path.

**Not yet done — still Step 1:**

- Apply the migration to `arcadia-test` (requires user's confirmation — it drops + recreates RLS policies on five tables, so worth a visual pass first).
- Inline-amend TAD §4.4 pointing to ADR 0006.
- Extend `apps/web/tests/rls-cross-member-leakage.test.ts` with the three new Phase-3 cases (decision L): cross-member `lesson_progress`, non-enrolled lesson access, creator-reads-own-course. Planned as Step 9 of Week 9 per the plan — listed here for awareness.

Once the user OKs the migration content, it lands on `arcadia-test` first. Production migration waits on Step 9 tests.
