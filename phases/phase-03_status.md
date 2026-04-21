# Phase 3 — Status

Source plan: `phase-03_plan.md`. Status entries chronological, newest on top.

## 2026-04-20 — Step 3 + role gate (decision A revised)

**Shipped Step 3 — `/dashboard` + course list + create-course dialog.** Server component gated on auth; role gate added after user flagged that the admin login should be distinct. Decision A amended mid-Step: course creation is now restricted to `memberships.role in ('creator','admin')` rather than any authed member.

Files:

- Migration `20260421000003_phase3_membership_roles.sql` — adds `memberships.role` column + `user_has_creator_role()` helper + tightens `course_creator_insert` to require the role.
- `app/dashboard/page.tsx` — server component with role check; renders a 403 UI for non-creators.
- `app/dashboard/actions.ts` — `createCourse` / `createCourseAndRedirect` server actions (RLS + a defense-in-depth role check).
- `app/dashboard/_components/CreateCourseDialog.tsx` — modal; Tab+Esc + useTransition; field caps at 120 / 500 chars.
- `app/dashboard/validation.ts` + `__tests__/validation.test.ts` — 6 unit tests, pure.

Typecheck / lint / 104 tests (98 prev + 6 new) / Next.js build — all green. `/dashboard` route is 1.63 kB / 97.7 kB first-load, server-rendered per request.

**User actions still pending before Step 4:**

1. Apply migration `20260421000003_phase3_membership_roles.sql` via the Supabase SQL editor (same flow as the last two).
2. Promote yourself to creator with one SQL line (see status instructions).

Once done, visit `/dashboard` on the preview and confirm:
- As a `member` role → 403 page rendered.
- As a `creator` role → empty-state or course list shown.
- Create-course dialog → validates + inserts + redirects to the (still-404) editor. Course appears on `/dashboard` reload.

---

## 2026-04-20 — Phase 3 kickoff (with same-day video-host pivots)

**Pre-plan decisions A–M approved.** D + G + K + M were amended twice the same day as the user weighed free-tier options:

1. Original plan: Cloudflare Stream (TAD §7 default).
2. First amendment: **Cloudinary** (free 25-credit tier, no card). Drafted ADR 0006 + Cloudinary setup guide.
3. Second amendment: **YouTube unlisted** (demo-only scope). Rewrote ADR 0006 + setup guide. Accepted tradeoffs: no real access control, YouTube TOS risk for paid/gated content, branding leaks. Exit criteria in ADR 0006 hard-gate a swap before any paying creator uploads.

**Net effect on Step 1 artifacts:**

- `planning/decisions/0006_2026-04-20_video-host-youtube-unlisted-for-demo.md` is the canonical ADR. (The Cloudinary-version file was deleted before landing — single commit in history.)
- Migration column renamed: `lessons.cloudinary_public_id` → `lessons.youtube_video_id text check (length = 11)`.
- No env vars needed for video host.
- TAD §7 inline amendment points at ADR 0006.

**User actions still pending** before Step 2 of Week 9:

1. Apply the Phase-3 migration to `arcadia-test` — see `docs/guides/phase-03-setup.md` Part 1.
2. (Optional) Delete the 106 orphan rows in arcadia-test.

Step 1 was code-only — no accounts, no secrets.

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
- `lessons.youtube_video_id text check (length = 11)` + `lessons.duration_sec integer check (>= 0)`.
- Replaces `course_member_read` with "published-in-realm OR creator_id=me".
- Tightens `section_member_read` to follow the parent course's read policy.
- Adds creator-scoped INSERT / UPDATE / DELETE policies for `courses`, `sections`, `lessons`.
- Adds `enrolment_creator_insert` (creator grants enrolment on own course) + `enrolment_self_insert` (Phase-4 "enrol" button seed: published + same-realm).
- Keeps Phase-0 `lessons.cf_stream_id` column intact, reserved for the eventual real-host swap (ADR 0006 exit criteria).

**Not yet done — still Step 1:**

- Apply the migration to `arcadia-test` (requires user's confirmation — it drops + recreates RLS policies on five tables, so worth a visual pass first).
- Inline-amend TAD §4.4 pointing to ADR 0006.
- Extend `apps/web/tests/rls-cross-member-leakage.test.ts` with the three new Phase-3 cases (decision L): cross-member `lesson_progress`, non-enrolled lesson access, creator-reads-own-course. Planned as Step 9 of Week 9 per the plan — listed here for awareness.

Once the user OKs the migration content, it lands on `arcadia-test` first. Production migration waits on Step 9 tests.
