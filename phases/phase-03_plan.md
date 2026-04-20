## Phase 3 Plan: Academy

**Source:** `/docs/mvp/phase-plan.md` §Phase 3 (Weeks 9–10), `/docs/mvp/prd.md` §Academy, `/docs/mvp/tad.md` §4.4 (video delivery), §5.1 (data model — courses/sections/lessons/lesson_progress/enrolments), §6.2 (RLS), §6.3 (Storage buckets). This plan is the executable doc; the MVP docs are the contract.

**Goal:** A creator signs in, opens `/dashboard`, creates a course with a title/description/thumbnail, adds one section containing one video lesson (uploaded directly to Cloudflare Stream via signed TUS URL) and one written lesson (Markdown), publishes it, and grants themselves an enrolment row. As a member, the same user opens `/academy`, sees the course, opens the course page, watches the video to 80% (progress bar reaches 100% for that lesson), reads the written lesson, navigates away, and on re-entry the video resumes from the last watched second. All at 60 FPS.

Out of scope for Phase 3: payments, Market grid, creator analytics dashboard, course discovery (Phase 4), XP awards on lesson completion (Phase 5).

---

### Pre-plan decisions — NEEDS USER CONFIRMATION before execution

These are the knobs I need you to lock before I start Week 9 Step 1. My recommendation is listed; say "approved as recommended" or override each.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| A | **Creator gate** | Any authed member can visit `/dashboard` and create courses in Phase 3. Role-based gating lands in Phase 4. | Unblocks Phase-3 demo; avoids a `memberships.role` schema addition that would slip into ADR territory this week. |
| B | **Course builder UX shape** | Two-pane single page: left rail = section/lesson tree with drag handles, right pane = selected lesson editor. No multi-step wizard. | Matches creator-dashboard mockups in PRD §Academy; single page keeps state management simple; drag-to-reorder is cheaper with `@dnd-kit` than a wizard. |
| C | **Drag-and-drop library** | `@dnd-kit/core` + `@dnd-kit/sortable`. Add to `/apps/web`. | Modern, accessible, no jQuery baggage, works cleanly with React 18 / Next 14. Permissively licensed. |
| D | **Video player** | **YouTube IFrame Player API** (`YT.Player` loaded from `https://www.youtube.com/iframe_api`). Video embedded as unlisted YouTube content. `currentTime` resume via `startSeconds` on cueVideoById; `getCurrentTime()` polled for progress tracking. | Demo-only per ADR 0006. Zero accounts, zero cost, zero quota. Must be swapped before paying creators — exit criteria in ADR 0006. |
| E | **Markdown editor** | `@uiw/react-md-editor` (MIT, live preview built-in, ~40 kB gz). Rendering uses `react-markdown` + `rehype-highlight` for syntax highlighting. | Meets phase-plan "Markdown editor with preview"; widely used; zero build gymnastics. |
| F | **Thumbnail storage** | Supabase Storage bucket `course-thumbnails`, public-read, member-scoped upload policy. Max 2 MB, JPEG/PNG/WebP. | TAD §6.3 names Storage as the bucket host. Public-read is fine — thumbnails aren't secret. |
| G | **Video "upload" flow** | **No upload from Arcadia.** The creator uploads to their own YouTube channel via YouTube's UI, sets visibility to **Unlisted**, and pastes the share URL into the lesson editor. Client-side regex extracts the 11-char video ID; server-side validator re-checks before INSERT / UPDATE. `duration_sec` is captured later via `player.getDuration()` on first successful load (see decision D) and upserted to the lesson row. | Zero Arcadia-side upload code for the demo. Tradeoff: creator flow has one extra tab (YouTube studio) compared to a real uploader. Acceptable for demo scope. |
| H | **Progress write cadence** | On `video` lessons: fire `upsert lesson_progress { watched_secs, completed }` once every 10 s while playing + once on pause/close. Mark `completed=true` when `watched_secs >= 0.8 * duration_sec`. Written lessons: mark complete when the user scrolls past 90% of the page height. | Matches phase-plan §Week 10; 10 s debounce keeps Supabase writes light; page-scroll for written lessons is a clean "I read it" heuristic. |
| I | **Enrolment UX for Phase 3** | No UI. Seed one row via the Supabase MCP (or a `scripts/grant-enrolment.ts` one-shot) so the creator's test account has access to their own course. "Enrol" button lands in Phase 4's Market. | Phase-plan explicitly says "manually granted via `enrolments` inserts for demo" in Week 10. |
| J | **Creator previewing their own course** | `is_preview = TRUE` on any lesson bypasses enrolment check (matches schema from Phase 0). Additionally, a creator always has access to their own courses through an RLS clause `auth.uid() = courses.creator_id`. | Bypass via `is_preview` is already in the schema; creator-owns-course is natural and avoids a fake enrolment for the creator. |
| K | **Phase-3 Supabase migration** | One migration `20260421000001_phase3_courses_lessons_progress.sql`: confirms tables created in Phase 0 match the final PRD shape, adds `lessons.youtube_video_id text (check length=11)` + `lessons.duration_sec integer` columns, adds `courses.creator_id` + creator-scoped write policies, tightens RLS. Phase-0's `cf_stream_id` column stays nullable / reserved for the eventual real-host swap (ADR 0006 exit criteria). Run on both `arcadia-test` and `arcadia` projects. | Phase 0 scaffolded the tables; Phase 3 is where their real-use RLS matters. |
| L | **Tests for RLS** | Extend `apps/web/tests/rls-cross-member-leakage.test.ts` with new cases: member A cannot read member B's `lesson_progress`, non-enrolled member cannot read non-preview lessons, creator can always read their own course. Three new integration tests. | Mirrors the Phase-2 pattern. Failure of any test gates merge. |
| M | **Video-host env vars** | **None.** YouTube unlisted embeds are credential-free. If we later add YouTube Data API calls (e.g. fetching duration server-side instead of via IFrame), we'd add `YOUTUBE_DATA_API_KEY` — not needed for the MVP since `player.getDuration()` works on the client. | Zero credential surface for Phase 3. |

---

### Locked decisions (Phase 3)

| Decision | Value | Source |
|---|---|---|
| Table layout | `courses / sections / lessons / lesson_progress / enrolments` per Phase 0 schema | TAD §5.1, `docs/mvp/tad.md` |
| Lesson types | `video` and `written` only in MVP | phase-plan §Week 9 |
| Video host | **YouTube unlisted** (demo-only per ADR 0006). CF Stream deferred; swap to a real host mandatory before paying creators. | amended 2026-04-20 (second amendment — Cloudinary → YouTube same day) |
| Progress completion threshold | **80%** of `duration_sec` for video; scroll-to-90% for written | phase-plan §Week 10 |
| Resume | `lesson_progress.watched_secs` is the only source of truth; video player seeks to it on load | phase-plan §Week 10 |
| Course publish state | `courses.published` boolean — draft courses hidden from `/academy` list for non-creators | phase-plan §Week 9 |
| Storage bucket | `course-thumbnails` via Supabase Storage | decision F above |
| Routes | `/dashboard` (creator), `/dashboard/courses/[id]` (editor), `/academy` (member grid), `/academy/[courseId]` (viewer) | phase-plan §§Week 9, 10 |
| Folder convention | Pure React — no Phaser. Academy is a standard Next.js page per TAD §4.2 ("`/academy` and `/market` never get a Phaser scene") | TAD §4.2 |

**Out-of-plan decision (2026-04-20):** TAD §7 names Cloudflare Stream as the video host. We're deviating to **YouTube unlisted** for the MVP demo window. Captured in `planning/decisions/0006_2026-04-20_video-host-youtube-unlisted-for-demo.md`. The ADR records: why (zero accounts, zero cost, fastest possible demo), what we're accepting (no real access control, YouTube TOS risk, branding leaks), exit criteria (any paying creator / real UGC / > 30 min stored content), and the swap-back path.

---

### Steps

#### Week 9 — Course builder (creator side)

1. **Phase 0 schema audit + Phase 3 migration.** Read current shape of `courses/sections/lessons/lesson_progress/enrolments` in `arcadia-test` via Supabase MCP. Write migration `20260421000001_phase3_courses_lessons_progress.sql` — indexes, RLS policy tightening per decision L. Apply to `arcadia-test` first, smoke-test. Apply to `arcadia` prod only after Step 9's RLS tests pass.
2. **Supabase Storage bucket `course-thumbnails`.** Create bucket; public-read policy; member-scoped insert policy (`auth.uid() IS NOT NULL`). 2 MB size limit enforced client-side; mime whitelist server-side.
3. **`/dashboard` route + course list.** Server-component fetch of `courses WHERE creator_id = auth.uid()`. "Create course" button opens a modal with title + description + thumbnail-upload. Insert row, redirect to editor.
4. **Course editor shell (`/dashboard/courses/[id]`).** Two-pane layout per decision B. Left rail = tree of sections + their lessons; right pane = empty placeholder until a lesson is selected.
5. **Add/remove/reorder sections.** `@dnd-kit/sortable` for the rail. Server actions for insert/delete/reorder (`order_index` column on `sections`). Optimistic updates in the client.
6. **Add/remove/reorder lessons within a section.** Same pattern. New lesson defaults to `written` type; editor swaps based on type.
7. **Written-lesson editor.** `@uiw/react-md-editor` in the right pane, bound to `lessons.content_md`. Autosave every 2 s on edit (debounced).
8. **Video-lesson editor.** No Arcadia-side upload. UI: single text input + "Parse" button. Creator pastes a YouTube URL (accepts `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`). Client extracts the 11-char video ID via regex. Server-side validator re-checks length + charset (`[A-Za-z0-9_-]{11}`) before INSERT / UPDATE to `lessons.youtube_video_id`. Editor shows a preview of the embed once parsed so the creator can confirm before saving.
9. **RLS test suite extension.** Three new integration tests in `rls-cross-member-leakage.test.ts` per decision L. Must pass before migration lands on prod.
10. **Publish/draft toggle.** `courses.published` boolean; toggle button in editor header.

Exit criteria Week 9: A creator creates a course with one section containing one video lesson and one written lesson in `arcadia-test`. Toggling Publish surfaces it in a placeholder `/academy` list (built properly in Week 10).

#### Week 10 — Course viewer (member side)

11. **`/academy` route.** Server component lists courses where either (a) member is enrolled via `enrolments`, or (b) course is published and creator == auth.uid(). Grid of thumbnail cards.
12. **`/academy/[courseId]` route.** Hierarchical tree of sections + lessons. Completed lessons (`lesson_progress.completed = true`) marked with a checkmark. Click opens the lesson viewer inline (no route change, just URL hash or query).
13. **Video lesson viewer.** No server route needed — YouTube embeds are credential-free. Component loads the IFrame Player API script once per page; creates a `YT.Player` pointed at `lessons.youtube_video_id`; passes `startSeconds = lesson_progress.watched_secs` via `playerVars`. On `onReady`, upserts `lessons.duration_sec` if currently NULL (read via `player.getDuration()`). Disable `rel=0` + `modestbranding=1` + `iv_load_policy=3` to minimise YouTube branding + suggested-video bleed.
14. **Progress tracking — video.** YouTube IFrame API doesn't emit `timeupdate`, so use a `setInterval` at 10 s while the player state is `PLAYING`; call `player.getCurrentTime()` and upsert `lesson_progress { watched_secs, completed }`. Clear the interval on `PAUSED` / `ENDED` / unmount, doing one final upsert each transition. `completed` flips true when `watched_secs >= 0.8 * duration_sec`. Page-unload safety via `navigator.sendBeacon`.
15. **Written lesson viewer.** Render `lessons.content_md` via `react-markdown` + `rehype-highlight`. Intersection Observer on a sentinel at ~90% scroll → upsert `lesson_progress { completed: true }`.
16. **Course progress bar.** `completed_count / total_count` per course, derived from a SQL view or a client-side aggregation. Displayed at the top of the course page and on the `/academy` card.
17. **Enrolment seeding.** `scripts/grant-enrolment.ts` one-shot that writes an `enrolments` row for a given member/course. Used to give the creator access to their own course for demo (though decision J's RLS clause may make this unnecessary — leave the script in for Phase 4 use regardless).
18. **Smoke test.** Creator publishes a course with one video + one written lesson. Member (same user, two browsers OK) opens `/academy`, watches video to 80% + scrolls the written lesson; both mark complete. Close + reopen → video resumes from the last watched second.

Exit criteria Week 10: phase-plan §Phase 3 exit criterion passes end-to-end on `arcadia-test` first, then on prod.

---

### Test criteria (Phase 3 exit)

1. **Creator flow** — Create course + section + video lesson (real upload to CF Stream, transcoded, playable) + written lesson (real Markdown, rendered). Publish. All under 5 min for a small lesson (<200 MB video).
2. **Member flow** — Open `/academy`, open course, video plays from signed URL, seeks to `watched_secs` on reload, marks complete at 80%. Written lesson marks complete on scroll.
3. **Resume** — `watched_secs` persists across tab close. Playback resumes within 500 ms of player mount.
4. **RLS** — All three new tests pass: cross-member `lesson_progress` isolated, non-enrolled member can't read non-preview lessons, creator reads their own course.
5. **60 FPS** — No frame drops in `/academy/[courseId]`. (Trivial since no Phaser, but assert browser DevTools Performance panel is clean.)
6. **CI green** — typecheck + lint + tests across all three workspaces. No ESLint warnings introduced.

---

### Risks / unknowns

1. **No real access control.** Anyone with the 11-char YouTube ID can watch; our RLS only gates who can *see the ID* inside Arcadia. **Accepted for the demo scope.** ADR 0006's exit criteria hard-gate the swap before this becomes a real problem.
2. **YouTube TOS risk.** Using YouTube as a CDN for paid/gated content violates their terms. Very low probability on one demo video; real risk once the demo becomes "production". **Mitigation:** swap per ADR 0006 exit criteria before any real-creator content lands.
3. **IFrame API changes.** YouTube has historically deprecated embed APIs. **Mitigation:** none needed at MVP scale; record as a risk if the demo window extends past 3 months.
4. **`@uiw/react-md-editor` + Next.js SSR.** Rich-text editors often need dynamic-import-SSR-disabled to avoid hydration mismatches. **Mitigation:** use `dynamic(() => import('@uiw/react-md-editor'), { ssr: false })` — matches the pattern already in use for `GameWorld.tsx` / `GameTavern.tsx`.
5. **Progress upsert write amplification.** Ten writes per video lesson is fine for 20 concurrent members but adds up. **Mitigation:** none needed at Phase-3 scale; flag for Phase 5 if Supabase row-write billing becomes visible.
6. **Cross-creator course isolation.** With decision A (any member can create courses), one creator's draft course shouldn't leak to another's `/dashboard`. RLS clause `creator_id = auth.uid()` on `SELECT` handles this — make sure the migration in Step 1 enforces it.

---

### What I need from you before starting

**All pre-plan decisions A–M approved 2026-04-20.** D + G + K + M were amended twice the same day: first CF Stream → Cloudinary, then Cloudinary → YouTube unlisted (demo-only scope, ADR 0006).

User actions still pending before Step 2 of Week 9:

1. Apply the Phase-3 migration to `arcadia-test` (see `docs/guides/phase-03-setup.md` Part 1).
2. (Optional) Delete the 106 orphan rows in arcadia-test.

**No video-host credentials needed.** YouTube unlisted requires zero accounts, zero env vars. The user's own YouTube channel + a single uploaded-and-unlisted test video is all we'll need at Week 9 Step 8 (and that can land at demo time, not before).
