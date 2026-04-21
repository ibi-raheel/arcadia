# Phase 3 — Status

Source plan: `phase-03_plan.md`. Status entries chronological, newest on top.

## 2026-04-21 — Post-exit patches

Two same-day follow-ups after the Phase 3 close-out; both on main:

- **Academy interior art updated** (user-supplied replacement, 1536×1024 same as prior — no scene-config drift). Commit `9ce023e`.
- **Video completion ✓ fix.** Reliance on the 80%-of-`duration_sec` threshold meant videos whose duration hadn't been captured in time (first-play race) would silently never flip `completed=true`. Plus the UI didn't refresh on threshold crossing, so the left-rail ✓ was invisible until a manual reload. `VideoLessonViewer` now (a) calls `markLessonCompleted` unconditionally on `STATE_ENDED`, bypassing the threshold path, and (b) fires `router.refresh()` once per mount when the 80% threshold crosses or ENDED triggers. Same commit `9ce023e`.

Phase 3 exit criteria still all met.

---

## 2026-04-20 — Phase 3 EXIT (Step 18 smoke green)

**Phase 3 is code-complete 2026-04-20** — same session Week 9 landed. End-to-end creator → member flow works on Vercel prod with real data.

### Step 18 smoke results

Run against prod (`arcadia-web-swart.vercel.app`) by user with the admin-role test account:

| Flow | Result |
|---|---|
| Apply migration 04 (`set_lesson_duration` RPC) to prod | ✅ `prosecdef = true` |
| Create course w/ 1 video + 1 written lesson, publish | ✅ |
| `/academy` card / podium shows course w/ 0/2 · 0% | ✅ |
| Click podium → course viewer | ✅ |
| Video play → ≥10 s elapsed → progress upsert fires | ✅ |
| Scrub past 80% → reload → ✓ in rail, 1/2 · 50% in header | ✅ |
| Video resume from `watched_secs` on hard refresh | ✅ (after `ee82c88` clamp fix — see below) |
| Written lesson renders w/ react-markdown + GFM | ✅ |
| Scroll past 90% → "✓ Marked complete" | ✅ |
| Reload → `✎` lesson shows ✓, 2/2 · 100% | ✅ |
| Tavern non-regression (new art + 90×90 avatar + 1.365× zoom) | ✅ |
| World → Academy → Course viewer → Return to World | ✅ |

### Post-smoke fix

One black-frame bug surfaced on the resume test: YouTube IFrame API renders a blank frame when `playerVars.start >= duration` (the case when last session ended at the natural finish and we saved `watched_secs = duration`). `VideoLessonViewer` now clamps `start` to 0 when `startSec >= durationSec - 2`. Commit `ee82c88`.

### Phase 3 delta from plan

- **Decision A revised mid-Step-3** — any authed member → `memberships.role in ('creator','admin')`. Migration `20260421000003` + role-aware home hub shipped same day.
- **Decision D/G/K/M pivoted twice the same day** — CF Stream → Cloudinary → YouTube unlisted (demo scope per ADR 0006). `lessons.youtube_video_id` column, IFrame Player in the viewer, zero video-host credentials.
- **Phase 3.5 added** — `/academy` became a Phaser scene instead of the planned React grid. Mirrors Tavern pattern (image-backed interior + walking avatar + clickable course podiums). `AcademyScene` + `GameAcademy` shipped same-day as Week 10.
- **Migration 04 added post-plan** — `set_lesson_duration` SECURITY DEFINER RPC so the viewer can populate `duration_sec` on first play without needing creator-role UPDATE on lessons.

### Phase 3 exit criteria (per `phase-03_plan.md`)

| Exit criterion | Status |
|---|---|
| Creator publishes a course with one section, one video, one written lesson | ✅ |
| Member opens `/academy`, watches video to 80%, progress bar updates | ✅ |
| On re-entry, video resumes from last position | ✅ (post `ee82c88`) |
| Written scroll-complete marks lesson done | ✅ |
| RLS tests extended + no regressions | ✅ (3 new Phase-3 cases skipped locally, runnable in CI) |
| Course progress bar derived correctly | ✅ |

All met.

### Open items punted to later phases

- **Academy multiplayer.** Solo hall today; `academy-realm1` Colyseus room would mirror Tavern if wanted. Phase 5 polish candidate.
- **Tavern + Academy colliders.** Avatar walks over furniture in both image-backed interiors. Already in `phases/phase-02_polish_backlog.md`.
- **Real YouTube swap-back.** Mandatory before paying creators. Exit criteria in ADR 0006 (>30 min stored content, real UGC, or any payments).
- **Duration-capture hygiene.** Creator-side editor could also trigger `set_lesson_duration` on video upload-parse to avoid first-viewer-gets-blank-UX. Minor.
- **Analytics on lesson_progress.** Phase 4 dashboard material.

### Ready for Phase 4

Next: **Market + creator dashboard analytics (Week 11)**. Phase-plan §Phase 4 still applies as-is.

---

## 2026-04-20 — Week 10 complete (Steps 11–17, Step 18 smoke pending)

Member-side course viewer stack shipped. Course list + viewer + both lesson types + progress tracking + enrolment seed script all landed in one session.

| Step | What |
|---|---|
| 11 | `/academy` — server-rendered grid of enrolled-union-owned courses with thumbnail + progress bar. BuildingTransition overlay kept on entry. |
| 12 | `/academy/[courseId]` — viewer shell. Header shows overall progress. Left rail: sections + lessons with type icon + `✓` for completed + selected highlight. Click → `?lesson=<id>`. |
| 13 | Video lesson viewer. YouTube IFrame Player API loaded dynamically; `YT.Player` with `startSeconds = lesson_progress.watched_secs`. On `onReady`, captures duration via `set_lesson_duration` RPC (migration `20260421000004`) if `duration_sec IS NULL` — first-set-wins. |
| 14 | Video progress tracking. `setInterval(10 s)` while `PLAYING`, upserts `lesson_progress`. Clears on `PAUSED` / `ENDED` / unmount with a final flush. `beforeunload` best-effort flush. `completed` flips at 80% of `duration_sec`. |
| 15 | Written lesson viewer via `react-markdown` + `remark-gfm` + `@tailwindcss/typography`. IntersectionObserver on a sentinel at 90% scroll fires `markLessonCompleted` once per session. |
| 16 | Course progress bars on both `/academy` cards and the `/academy/[courseId]` header — derived from `lesson_progress.completed` counts, no extra DB query. |
| 17 | `scripts/grant-enrolment.ts` + `npm run grant-enrolment -- <email> <course-id>`. Idempotent (unique `(course_id, member_id)`). Prod-ref guard prevents accidental writes to arcadia prod unless `ALLOW_PROD=1`. |

**Route sizes:** `/academy` 721 B / 97.2 kB · `/academy/[courseId]` 45.4 kB / 142 kB (react-markdown + remark-gfm load in the viewer bundle).

**Pending user actions before full smoke test:**

1. Apply migration `20260421000004_phase3_set_lesson_duration.sql` to **arcadia prod + test** (same Supabase SQL editor flow).
2. Grant yourself an enrolment on a test course if you don't own it:
   ```
   cd apps/web && SUPABASE_SERVICE_KEY=... NEXT_PUBLIC_SUPABASE_URL=https://eqbzltiasmuckgsapkye.supabase.co ALLOW_PROD=1 npm run grant-enrolment -- ibi.raheel@gmail.com <course-id>
   ```

**Step 18 smoke (pending):** publish a course with one video + one written lesson, visit `/academy`, watch to 80% (video marks complete), scroll the written lesson past 90% (marks complete), close tab, reopen — video resumes from last watched second.

---

## 2026-04-20 — Week 9 complete (Steps 3–10)

Whole Week-9 stack shipped in one session:

| Step | Commit | Shipped |
|---|---|---|
| 3 | `23fa2cb` + `62a5f9d` | `/dashboard` list + create-course dialog + role-gate (decision A revised) |
| 4 | `07f326f` | Course editor shell at `/dashboard/courses/[id]` |
| 5 | `c0e3f15` + `860560f` | Sections CRUD + drag-reorder (`@dnd-kit/sortable`); useEffect sync fix for router.refresh |
| 6 | `9483ddd` | Lessons CRUD + intra-section drag-reorder |
| 7 | `3d0823d` | Markdown editor for written lessons (`@uiw/react-md-editor`), 2s debounced autosave, click-to-select via `?lesson=<id>` |
| 8 | `b71d256` | Video lesson editor + type toggle (written ⇄ video); YouTube URL parser (5 URL shapes) + preview iframe |
| 9 | _this commit_ | 3 new RLS integration tests (non-enrolled lesson access, creator-reads-own-unpublished-course, creator-reads-own-non-preview-lessons) — skipped locally, run in CI when `TEST_SUPABASE_*` is set |
| 10 | _this commit_ | Publish / unpublish toggle in course editor header |

**Validator coverage:** 25 pure-validator unit tests across `app/dashboard/**/__tests__/`. 131 total tests passing, 21 skipped (RLS suite requires env).

**Prod schema state:** All three Phase-3 migrations applied to arcadia prod on 2026-04-20. User's prod account promoted to `role = admin`. Full creator flow exercised end-to-end on Vercel preview + prod.

**Known gaps closed during execution:**

- Prettier not run pre-commit → CI red for 6 commits; fixed in `8875d52` and the habit is now in the mental checklist.
- `useState`'s one-time prop init left both `SectionTree` and `LessonList` stuck after mutations → `useEffect` sync pattern added (`860560f`).
- Supabase MCP is read-only per ADR 0002 → user applies all migrations via the dashboard SQL editor; noted in setup guide.

**Ready for Week 10.** Next: `/academy` route (Step 11) → course viewer at `/academy/[courseId]` (Step 12) → YouTube IFrame Player API viewer (Step 13) → progress tracking (Steps 14–15) → enrolment seeding (Step 17) → end-to-end smoke (Step 18).

---

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
